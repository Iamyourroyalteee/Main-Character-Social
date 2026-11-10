/* MCSAvatarLoader.js — Engine integration layer for the MCS 3D Avatar Studio.
   Design-reference implementation (NOT verbatim production code): reconciled
   with the ACTUAL app schema on 2026-11-10:
     - catalog slots are already "top"/"bottom"/"outfit"/"hair"/"hat"/"glasses"/
       "accessory"/"prop"/"shoes" (the sample's "pants"/"shirt" names do NOT exist)
     - body-part coverage uses ZONE_NAMES + per-item `hides` arrays (+ hidesFor)
     - equips flow through AvatarWardrobe.applyClothingItem (adult gate inside)
   This loader ADDS: GLTF/GLB base+catalog asset loading with schema validation,
   reference-counted body culling, dynamic skin tone across all skin meshes,
   entitlement-aware adult gating, disposal/cancellation, resize/render lifecycle,
   and graceful missing-asset handling. All procedural behavior is preserved. */
(function(root){
  "use strict";
  function createEngine(THREE, opts){
    opts = opts || {};
    var renderer = opts.renderer;
    var scene = opts.scene;
    var camera = opts.camera;
    var THREE_GLTF_LOADER = opts.GLTFLoader || null; /* injected; r128 needs the examples module */
    if (!THREE || !renderer || !scene || !camera) throw new Error("MCSAvatarLoader: THREE/renderer/scene/camera required");

    var SLOTS = opts.slots || ["hair","top","bottom","outfit","shoes","hat","glasses","accessory","prop"];
    var ZONES = opts.zones || ["head","torso","armsUpper","armsLower","legsUpper","legsLower","feet","hands"];

    /* ---------- state ---------- */
    var alive = true;
    var disposables = [];   /* geometries/materials/textures we own */
    var pending = [];       /* in-flight loads, cancellable */
    var zoneRefs = {};      /* zone -> count of garments covering it (reference counts) */
    ZONES.forEach(function(z){ zoneRefs[z] = 0; });

    /* ---------- schema validation ---------- */
    var SLOT_SET = {}; SLOTS.forEach(function(s){ SLOT_SET[s] = 1; });
    function validateItemSchema(item){
      var errs = [];
      if (!item || typeof item !== "object") return ["item is not an object"];
      if (!item.id) errs.push("missing id");
      if (!item.slot || !SLOT_SET[item.slot]) errs.push("unknown slot: " + item.slot + " (valid: " + SLOTS.join(",") + ")");
      if (item.hides && !Array.isArray(item.hides)) errs.push("hides must be an array");
      if (item.hides) item.hides.forEach(function(z){ if (ZONES.indexOf(z) < 0) errs.push("hides unknown zone: " + z); });
      if (item.is_adult && typeof item.is_adult !== "boolean") errs.push("is_adult must be boolean");
      return errs;
    }

    /* ---------- GLTF loading (optional; procedural remains default) ---------- */
    var loader = null;
    if (THREE_GLTF_LOADER) loader = new THREE_GLTF_LOADER();
    function loadGLTF(url, onDone, onFail){
      if (!loader){ if (onFail) onFail("GLTFLoader not available — procedural pipeline stays active"); return null; }
      var handle = { cancelled:false };
      pending.push(handle);
      loader.load(url, function(gltf){
        handle.cancelled = true;
        if (!alive) { disposeObject(gltf.scene); return; }
        onDone && onDone(gltf.scene, gltf);
      }, undefined, function(err){
        handle.cancelled = true;
        onFail && onFail(err && err.message || String(err));
      });
      return handle;
    }
    function cancelPending(){
      pending.forEach(function(p){ p.cancelled = true; });
      pending = [];
      if (loader && loader.manager && loader.manager.abort) { try { loader.manager.abort(); } catch(e){} }
    }

    /* ---------- ownership + disposal ---------- */
    function own(obj){ disposables.push(obj); return obj; }
    function disposeObject(root){
      root.traverse(function(o){
        if (o.isMesh){
          if (o.geometry) o.geometry.dispose();
          var mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(function(m){
            if (!m) return;
            ["map","normalMap","roughnessMap","metalnessMap","emissiveMap","alphaMap"].forEach(function(k){
              if (m[k] && m[k].dispose) m[k].dispose();
            });
            m.dispose();
          });
        }
      });
    }
    function teardown(){
      alive = false;
      cancelPending();
      disposables.forEach(function(d){ if (d && d.dispose) d.dispose(); });
      disposables = [];
    }

    /* ---------- reference-counted body culling ---------- */
    /* The app's current updateBodyVisibility hides zones via a Set built from
       dict entries each render. Ref-counts make multi-garment coverage safe when
       pieces are added/removed out of order: a zone stays hidden while ANY
       covering garment remains. */
    function recomputeZoneRefs(dict){
      ZONES.forEach(function(z){ zoneRefs[z] = 0; });
      Object.keys(dict || {}).forEach(function(slot){
        var e = dict[slot]; if (!e) return;
        var meta = (opts.getItem || function(id){ return null; })(e.itemId);
        if (!meta) return;
        var hides = meta.hidesFor ? meta.hidesFor(e.variant) : (meta.hides || []);
        hides.forEach(function(z){ if (zoneRefs[z] != null) zoneRefs[z]++; });
      });
      return zoneRefs;
    }
    function applyCulling(avatar, zoneRefsMap){
      if (!avatar || !avatar.zones) return;
      ZONES.forEach(function(z){
        var hide = (zoneRefsMap && zoneRefsMap[z] > 0);
        (avatar.zones[z] || []).forEach(function(m){ m.visible = !hide; });
      });
    }

    /* ---------- dynamic skin tone across ALL skin meshes ---------- */
    function setSkinTone(avatar, hex){
      if (!avatar) return false;
      var changed = 0;
      /* 1) the shared skin material (covers most meshes) */
      if (avatar.skinMat && avatar.skinMat.color){
        avatar.skinMat.color.set(hex); changed++;
      }
      /* 2) any per-mesh materials flagged as skin (loader-assigned) */
      avatar.root && avatar.root.traverse(function(o){
        if (o.isMesh && o.userData && o.userData.isSkin && o.material && o.material.color){
          o.material.color.set(hex); changed++;
        }
      });
      return changed > 0;
    }

    /* ---------- adult gate: client flag is UX ONLY ---------- */
    /* Entitlement must be server-authoritative. The loader exposes a hook the
       app wires to an entitlement check (fetch to the backend / Supabase RLS-
       protected view). Without an entitlement, adult items are treated as
       locked — never visible to teen accounts, and for adult accounts only
       after the server says so. */
    var entitlementFn = opts.getEntitlement || function(){ return Promise.resolve({ adult:false, reason:"no entitlement provider wired" }); };
    var entitlementCache = { value:null, ts:0, ttlMs:60000 };
    function isEntitledAdult(){
      var now = Date.now();
      if (entitlementCache.value !== null && now - entitlementCache.ts < entitlementCache.ttlMs){
        return Promise.resolve(entitlementCache.value);
      }
      return entitlementFn().then(function(r){
        entitlementCache = { value: !!r && !!r.adult, ts: now, ttlMs: entitlementCache.ttlMs };
        return entitlementCache.value;
      }).catch(function(){ return false; });
    }
    function gateItem(item){
      if (!item || !item.is_adult) return Promise.resolve(true);
      return isEntitledAdult();
    }

    /* ---------- resize + lifecycle ---------- */
    function resize(){
      var el = renderer.domElement, w = el.clientWidth, hgt = el.clientHeight;
      if (!w || !hgt) return;
      renderer.setSize(w, hgt, false);
      camera.aspect = w / hgt;
      camera.updateProjectionMatrix();
    }
    var rafId = null;
    function startLoop(fn){
      if (rafId != null) cancelAnimationFrame(rafId);
      var last = performance.now();
      function tick(now){
        if (!alive) return;
        var dt = Math.min((now - last) / 1000, 0.1); last = now;
        fn && fn(dt);
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
      return function stop(){ if (rafId != null) cancelAnimationFrame(rafId); rafId = null; };
    }
    function stopLoop(){ if (rafId != null){ cancelAnimationFrame(rafId); rafId = null; } }

    return {
      SLOTS: SLOTS, ZONES: ZONES, zoneRefs: zoneRefs,
      validateItemSchema: validateItemSchema,
      loadGLTF: loadGLTF, cancelPending: cancelPending,
      recomputeZoneRefs: recomputeZoneRefs, applyCulling: applyCulling,
      setSkinTone: setSkinTone,
      gateItem: gateItem, setEntitlementProvider: function(fn){ entitlementFn = fn; entitlementCache = { value:null, ts:0, ttlMs:60000 }; },
      resize: resize, startLoop: startLoop, stopLoop: stopLoop,
      disposeObject: disposeObject, teardown: teardown,
      isAlive: function(){ return alive; }
    };
  }
  root.MCSAvatarLoader = { create: createEngine };
})(typeof window !== "undefined" ? window : this);