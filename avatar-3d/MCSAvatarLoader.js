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

    function validateAssetDescriptor(asset){
      var errs = [];
      if (!asset || typeof asset !== "object") return ["asset descriptor is not an object"];
      if (typeof asset.id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(asset.id)) errs.push("asset id must be a stable lowercase identifier");
      if (!asset.slot || !SLOT_SET[asset.slot]) errs.push("unknown asset slot");
      if (!validateAssetUrl(asset.url)) errs.push("invalid asset URL");
      if (asset.format !== "glb" && asset.format !== "gltf") errs.push("format must be glb or gltf");
      var provenance = asset.provenance;
      if (!provenance || typeof provenance !== "object") errs.push("missing asset provenance");
      else ["owner","license","source","permittedUse"].forEach(function(key){
        if (typeof provenance[key] !== "string" || !provenance[key].trim()) errs.push("missing provenance " + key);
      });
      if (asset.is_adult != null && typeof asset.is_adult !== "boolean") errs.push("is_adult must be boolean");
      if (asset.hides != null && !Array.isArray(asset.hides)) errs.push("hides must be an array");
      if (Array.isArray(asset.hides)) asset.hides.forEach(function(zone){
        if (ZONES.indexOf(zone) < 0) errs.push("unknown hidden body zone: " + zone);
      });
      if (asset.scale != null && (!Number.isFinite(asset.scale) || asset.scale <= 0)) errs.push("scale must be a positive finite number");
      if (asset.unit != null && ["m","cm","mm"].indexOf(asset.unit) < 0) errs.push("unit must be m, cm, or mm");
      if (asset.version != null && !/^\d+\.\d+\.\d+$/.test(asset.version)) errs.push("version must use semantic x.y.z format");
      if (asset.pivot != null && (!Array.isArray(asset.pivot) || asset.pivot.length !== 3 || !asset.pivot.every(Number.isFinite))) errs.push("pivot must contain three finite coordinates");
      if (asset.previewUrl != null && !validateAssetUrl(asset.previewUrl)) errs.push("invalid preview URL");
      return errs;
    }

    function validateAssetManifest(manifest){
      var errs = [], seen = Object.create(null);
      if (!manifest || typeof manifest !== "object") return ["manifest must be an object"];
      if (manifest.schemaVersion !== "1.0.0") errs.push("unsupported manifest schemaVersion");
      if (!Array.isArray(manifest.assets)) return errs.concat(["manifest assets must be an array"]);
      manifest.assets.forEach(function(asset, index){
        validateAssetDescriptor(asset).forEach(function(error){ errs.push("assets[" + index + "]: " + error); });
        if (asset && asset.id){
          if (seen[asset.id]) errs.push("duplicate asset id: " + asset.id);
          seen[asset.id] = true;
        }
      });
      return errs;
    }

    /* ---------- GLTF loading (optional; procedural remains default) ---------- */
    var loader = null;
    if (THREE_GLTF_LOADER) loader = new THREE_GLTF_LOADER();
    function validateAssetUrl(url){
      if (typeof url !== "string" || !url.trim()) return false;
      var value = url.trim();
      /* Permit project-relative paths and HTTPS assets. Reject executable,
         data/blob URLs and protocol-relative URLs to avoid unsafe asset origins. */
      if (/^(javascript|data|blob|file):/i.test(value) || value.indexOf("//") === 0) return false;
      if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return /^https:\/\//i.test(value);
      return !/[\x00-\x1f]/.test(value);
    }
    function loadGLTF(url, onDone, onFail){
      if (!validateAssetUrl(url)){ if (onFail) onFail("Invalid asset URL — use a project-relative path or HTTPS URL"); return null; }
      if (!loader){ if (onFail) onFail("GLTFLoader not available — procedural pipeline stays active"); return null; }
      var handle = { cancelled:false };
      pending.push(handle);
      function settle(){ pending = pending.filter(function(p){ return p !== handle; }); }
      try {
        loader.load(url, function(gltf){
          settle();
          if (handle.cancelled || !alive) { if (gltf && gltf.scene) disposeObject(gltf.scene); return; }
          onDone && onDone(gltf.scene, gltf);
        }, undefined, function(err){
          settle();
          if (handle.cancelled || !alive) return;
          onFail && onFail(err && err.message || String(err));
        });
      } catch(err) {
        settle();
        if (!handle.cancelled && alive && onFail) onFail(err && err.message || String(err));
      }
      return handle;
    }
    function cancelPending(){
      pending.forEach(function(p){ p.cancelled = true; });
      pending = [];
      if (loader && loader.manager && loader.manager.abort) { try { loader.manager.abort(); } catch(e){} }
    }

    function validateModel(root, limits){
      limits = limits || {};
      var errors = [], warnings = [], meshCount = 0, vertexCount = 0, triangleCount = 0;
      if (!root || typeof root.traverse !== "function"){
        return { valid:false, errors:["model root must be a Three.js Object3D"], warnings:warnings, meshCount:0, vertexCount:0, triangleCount:0 };
      }
      function finiteVector(v){
        return !v || (Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));
      }
      root.traverse(function(o){
        if (o.position && !finiteVector(o.position)) errors.push("non-finite object position");
        if (o.rotation && !finiteVector(o.rotation)) errors.push("non-finite object rotation");
        if (o.scale && (!finiteVector(o.scale) || o.scale.x === 0 || o.scale.y === 0 || o.scale.z === 0)) errors.push("invalid object scale");
        if (!o.isMesh) return;
        meshCount++;
        var geometry = o.geometry;
        if (!geometry){ errors.push("mesh is missing geometry"); return; }
        var attrs = geometry.attributes || {};
        var position = attrs.position;
        if (!position || !Number.isFinite(position.count) || position.count < 3){
          errors.push("mesh is missing a valid position attribute");
        } else {
          vertexCount += position.count;
          var indexCount = geometry.index && geometry.index.count;
          triangleCount += Math.floor((indexCount || position.count) / 3);
        }
        if (!attrs.normal) warnings.push("mesh is missing vertex normals");
        if (!attrs.uv) warnings.push("mesh is missing UV coordinates");
        if (!o.material) warnings.push("mesh is missing a material");
        if (geometry.computeBoundingBox && !geometry.boundingBox) geometry.computeBoundingBox();
        if (geometry.boundingBox && geometry.boundingBox.min && geometry.boundingBox.max){
          var b = geometry.boundingBox;
          if (![b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].every(Number.isFinite)){
            errors.push("geometry bounds contain non-finite values");
          }
        }
      });
      if (!meshCount) errors.push("model contains no meshes");
      if (limits.maxMeshes && meshCount > limits.maxMeshes) errors.push("mesh budget exceeded");
      if (limits.maxVertices && vertexCount > limits.maxVertices) errors.push("vertex budget exceeded");
      if (limits.maxTriangles && triangleCount > limits.maxTriangles) errors.push("triangle budget exceeded");
      return { valid:errors.length === 0, errors:errors, warnings:warnings, meshCount:meshCount, vertexCount:vertexCount, triangleCount:triangleCount };
    }

    function loadCatalogAsset(asset, onDone, onFail){
      var errors = validateAssetDescriptor(asset);
      if (errors.length){ if (onFail) onFail("Invalid asset descriptor: " + errors.join("; ")); return null; }
      var descriptor = {
        id: asset.id, slot: asset.slot, is_adult: !!asset.is_adult,
        hides: asset.hides || [], scale: asset.scale || 1, unit: asset.unit || "m"
      };
      var request = { cancelled:false };
      gateItem(descriptor).then(function(allowed){
        if (request.cancelled || !alive) return;
        if (!allowed){ if (onFail) onFail("Asset access denied"); return; }
        request.loadHandle = loadGLTF(asset.url, function(root, gltf){
          if (request.cancelled || !alive){ if (root) disposeObject(root); return; }
          if (!root){ if (onFail) onFail("Invalid 3D model: empty GLTF scene"); return; }
          if (root.scale && root.scale.setScalar){
            var unitScale = asset.unit === "cm" ? 0.01 : (asset.unit === "mm" ? 0.001 : 1);
            root.scale.setScalar((asset.scale || 1) * unitScale);
          }
          var report = validateModel(root, opts.modelLimits);
          if (!report.valid){
            disposeObject(root);
            if (onFail) onFail("Invalid 3D model: " + report.errors.join("; "));
            return;
          }
          onDone && onDone(root, gltf, descriptor, report);
        }, onFail);
      }).catch(function(err){
        if (!request.cancelled && alive && onFail) onFail(err && err.message || String(err));
      });
      request.cancel = function(){
        request.cancelled = true;
        if (request.loadHandle) request.loadHandle.cancelled = true;
      };
      return request;
    }

    /* ---------- ownership + disposal ---------- */
    function own(obj){ disposables.push(obj); return obj; }
    function disposeObject(root){
      if (!root || typeof root.traverse !== "function") return;
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
      validateItemSchema: validateItemSchema, validateAssetDescriptor: validateAssetDescriptor, validateAssetManifest: validateAssetManifest, validateModel: validateModel,
      loadGLTF: loadGLTF, loadCatalogAsset: loadCatalogAsset, cancelPending: cancelPending,
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