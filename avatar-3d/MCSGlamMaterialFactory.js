/* MCSGlamMaterialFactory.js — semantic material roles for the MCS avatar.
   three.js r128 compatible. PBR-TRUE path: uses MeshPhysicalMaterial with
   clearcoat for skin/lips/metals, and REQUIRES a scene environment map
   (procedural equirect canvas texture) for metals to read as metal —
   without it, high-metalness materials render dark. An HONESTY NOTE:
   anisotropic BRDF is NOT implemented in r128 and no anisotropy is claimed.
   A subsurface-look approximation for skin is provided via a guarded
   onBeforeCompile tweak (wrapped emissive rim) — this is an APPROXIMATION,
   not true subsurface scattering, and is labeled as such everywhere.
   PBR is the default material mode; toon remains an explicit fallback. */
(function(root){
  "use strict";
  function factory(THREE, opts){
    opts = opts || {};
    var cache = {};
    var owned = [];
    var ownedTextures = [];
    var disposed = false;
    var PBR = true; /* realistic material mode is the default */

    /* ---------- procedural studio environment (equirect canvas) ---------- */
    var envTex = null;
    function studioEnvironment(){
      if (envTex) return envTex;
      var c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      var x = c.getContext("2d");
      /* sky gradient */
      var g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "#3a4a6b"); g.addColorStop(0.5, "#8ea3c9"); g.addColorStop(0.62, "#e8e2d5");
      g.addColorStop(0.66, "#6b7a94"); g.addColorStop(1, "#2a2f3a");
      x.fillStyle = g; x.fillRect(0, 0, 512, 256);
      /* key softbox (warm) */
      var key = x.createRadialGradient(150, 70, 4, 150, 70, 70);
      key.addColorStop(0, "rgba(255,240,214,1)"); key.addColorStop(1, "rgba(255,240,214,0)");
      x.fillStyle = key; x.beginPath(); x.arc(150, 70, 70, 0, Math.PI*2); x.fill();
      /* fill softbox (cool) */
      var fill = x.createRadialGradient(390, 60, 4, 390, 60, 55);
      fill.addColorStop(0, "rgba(190,210,255,0.9)"); fill.addColorStop(1, "rgba(190,210,255,0)");
      x.fillStyle = fill; x.beginPath(); x.arc(390, 60, 55, 0, Math.PI*2); x.fill();
      /* gold rim strip */
      x.fillStyle = "rgba(212,175,55,0.55)";
      x.fillRect(60, 150, 130, 8);
      x.fillRect(330, 150, 130, 8);
      /* floor bounce */
      var fl = x.createLinearGradient(0, 175, 0, 256);
      fl.addColorStop(0, "rgba(120,110,105,0.5)"); fl.addColorStop(1, "rgba(40,38,42,0.9)");
      x.fillStyle = fl; x.fillRect(0, 175, 512, 81);
      envTex = new THREE.CanvasTexture(c);
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      if (THREE.sRGBEncoding !== undefined) envTex.encoding = THREE.sRGBEncoding;
      return envTex;
    }

    /* ---------- guarded skin SSS approximation ---------- */
    /* Wraps emissive term with a rim-weighted warm tint. NOT true SSS — an
       approximation of the wrapped-light look. Guarded: applied once per
       material, reversible, and only when PBR is on. */
    function applySSSApprox(mat, sssColor){
      if (mat.userData.__sssApplied) return;
      mat.userData.__sssApplied = true;
      var baseEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
      mat.onBeforeCompile = function(shader){
        shader.uniforms.uSSS = { value: new THREE.Color(sssColor || 0xb4554d) };
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          "#include <common>\n" +
          "uniform vec3 uSSS; /* MCS SSS approximation (NOT true SSS) */"
        ).replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\n" +
          "/* MCS SSS approximation: warm wrap on grazing angles (NOT true SSS) */\n" +
          "float sssWrap = clamp(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0);\n" +
          "totalEmissiveRadiance += uSSS.rgb * pow(sssWrap, 2.2) * 0.35;"
        );
      };
      mat.userData.__sssBaseEmissive = baseEmissive;
      mat.needsUpdate = true;
    }
    function removeSSSApprox(mat){
      if (!mat || !mat.userData.__sssApplied) return;
      mat.onBeforeCompile = null;
      mat.emissive = mat.userData.__sssBaseEmissive.clone();
      delete mat.userData.__sssApplied;
      mat.needsUpdate = true;
    }

    /* ---------- PBR texture maps: base color is sRGB; data maps are linear ---------- */
    var MAP_FIELDS = {
      baseColor:"map", normal:"normalMap", roughness:"roughnessMap",
      metalness:"metalnessMap", ao:"aoMap", emissive:"emissiveMap"
    };
    function safeTextureUrl(url){
      if (typeof url !== "string" || !url.trim()) return false;
      var value = url.trim();
      if (/^(javascript|data|blob|file):/i.test(value) || value.indexOf("//") === 0) return false;
      if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return /^https:\/\//i.test(value);
      return !/[\x00-\x1f]/.test(value);
    }
    function applyTextureMaps(material, maps){
      if (!material || !maps) return material;
      Object.keys(MAP_FIELDS).forEach(function(key){
        var texture = maps[key];
        if (!texture) return;
        if ((key === "baseColor" || key === "emissive") && THREE.sRGBEncoding !== undefined) texture.encoding = THREE.sRGBEncoding;
        else if (THREE.LinearEncoding !== undefined) texture.encoding = THREE.LinearEncoding;
        material[MAP_FIELDS[key]] = texture;
      });
      material.needsUpdate = true;
      return material;
    }
    function loadTextureMaps(refs, onDone, onFail){
      var keys = Object.keys(refs || {});
      var request = { cancelled:false, failed:false, textures:{} };
      if (!keys.length){ onDone && onDone({}); return request; }
      if (!THREE.TextureLoader){ onFail && onFail("TextureLoader is not available"); return request; }
      var allowed = keys.filter(function(key){ return Object.prototype.hasOwnProperty.call(MAP_FIELDS,key); });
      if (allowed.length !== keys.length || keys.some(function(key){ return !safeTextureUrl(refs[key]); })){
        request.failed = true;
        onFail && onFail("Invalid PBR texture map reference");
        return request;
      }
      var remaining = keys.length;
      function releaseTextures(){
        Object.keys(request.textures).forEach(function(key){
          var texture = request.textures[key];
          if (texture && texture.dispose) texture.dispose();
          ownedTextures = ownedTextures.filter(function(t){ return t !== texture; });
        });
        request.textures = {};
      }
      request.cancel = function(){ request.cancelled = true; releaseTextures(); };
      function fail(err){
        if (request.failed || request.cancelled) return;
        request.failed = true;
        releaseTextures();
        onFail && onFail(err && err.message || String(err));
      }
      var textureLoader = new THREE.TextureLoader();
      keys.forEach(function(key){
        try {
          textureLoader.load(refs[key], function(texture){
            if (request.cancelled || request.failed){ if (texture && texture.dispose) texture.dispose(); return; }
            if ((key === "baseColor" || key === "emissive") && THREE.sRGBEncoding !== undefined) texture.encoding = THREE.sRGBEncoding;
            else if (THREE.LinearEncoding !== undefined) texture.encoding = THREE.LinearEncoding;
            texture.needsUpdate = true;
            request.textures[key] = texture;
            ownedTextures.push(texture);
            if (--remaining === 0) onDone && onDone(request.textures);
          }, undefined, fail);
        } catch(err){ fail(err); }
      });
      return request;
    }

    /* ---------- material builders (role -> builder) ---------- */
    function makeMat(role, hex, env){
      var pbr = PBR && THREE.MeshPhysicalMaterial !== undefined;
      var cls = pbr ? THREE.MeshPhysicalMaterial : THREE.MeshToonMaterial;
      var params = { color: new THREE.Color(hex) };
      if (pbr){
        params.envMap = env || null;         /* r128: per-material envMap */
        params.envMapIntensity = 1.0;
      }
      var m;
      switch(role){
        case "skin":
          if (pbr){
            params.roughness = 0.62; params.metalness = 0.0;
            params.clearcoat = 0.12; params.clearcoatRoughness = 0.7;
          } else {
            params.gradientMap = opts.gradientMap || null;
          }
          m = new cls(params);
          if (pbr && opts.sss !== false) applySSSApprox(m, 0xb4554d); /* approximation, labeled */
          break;
        case "lips":
          if (pbr){
            params.roughness = 0.14; params.metalness = 0.0;
            params.clearcoat = 1.0; params.clearcoatRoughness = 0.12;
          } else { params.gradientMap = opts.gradientMap || null; }
          m = new cls(params);
          break;
        case "hair":
          if (pbr){ params.roughness = 0.5; params.metalness = 0.0; }
          else { params.gradientMap = opts.gradientMap || null; }
          params.transparent = true; params.alphaTest = 0.35; params.side = THREE.DoubleSide;
          m = new cls(params);
          break;
        case "denim":
          if (pbr){ params.roughness = 0.86; params.metalness = 0.0; }
          else { params.gradientMap = opts.gradientMap || null; }
          m = new cls(params);
          break;
        case "fabric":
          if (pbr){ params.roughness = 0.82; params.metalness = 0.0; params.clearcoat = 0.02; params.clearcoatRoughness = 0.9; }
          else { params.gradientMap = opts.gradientMap || null; }
          m = new cls(params);
          break;
        case "gold":
          if (pbr){ params.roughness = 0.24; params.metalness = 1.0; params.clearcoat = 0.4; params.clearcoatRoughness = 0.2; }
          else { params.gradientMap = opts.gradientMap || null; params.color = new THREE.Color(0xd4af37); }
          m = new cls(params);
          break;
        case "chrome":
          if (pbr){ params.roughness = 0.12; params.metalness = 1.0; }
          else { params.gradientMap = opts.gradientMap || null; params.color = new THREE.Color(0xcfd6e2); }
          m = new cls(params);
          break;
      }
      if (pbr && env) m.envMap = env;
      if (m) owned.push(m);
      return m;
    }

    var API = {
      studioEnvironment: studioEnvironment,
      loadTextureMaps: loadTextureMaps, applyTextureMaps: applyTextureMaps,
      /* env must be assigned by the app: scene.environment (r128 supports it for
         MeshStandard/Physical via envMap inheritance in newer versions; r128 needs
         per-material envMap, which we do in makeMat). */
      isPBR: function(){ return PBR; },
      setPBR: function(on, scene, gradientMap){
        /* NOTE: this only flips the flag + rebuilds the cache. It does NOT
           dispose anything — meshes may still reference old materials. The
           caller must reassign meshes via retintEquipped() and then call
           retireOldMaterials() to free them AFTER references are swapped. */
        PBR = !!on;
        /* drop cache entries WITHOUT disposing: old materials stay alive for
           meshes still holding them; retireOldMaterials() frees them later. */
        cache = {};
        return PBR;
      },
      /* reassign fresh (mode-correct) materials onto every mesh currently
         using a factory material. Preserves per-mesh tint (color is carried
         over from the old material). Returns count of meshes reassigned. */
      retintEquipped: function(roots){
        var env = PBR ? studioEnvironment() : null;
        var count = 0;
        function retintOne(old){
          if (!old) return old;
          var role = old.userData && old.userData.__role;
          if (!role) return old;
          var hex = old.color && old.color.getHexString ? "#" + old.color.getHexString() : "#ffffff";
          var nm = makeMat(role, hex, env);
          if (!nm) return old;
          nm.userData.__role = role;
          /* preserve alpha/shadow flags the wardrobe set */
          if (old.transparent !== undefined){
            nm.transparent = old.transparent;
            nm.alphaTest = old.alphaTest || 0;
            nm.side = old.side;
          }
          ["map","normalMap","roughnessMap","metalnessMap","aoMap","emissiveMap","alphaMap"].forEach(function(key){
            if (old[key]) nm[key] = old[key];
          });
          count++;
          return nm;
        }
        (roots || []).forEach(function(root){
          if (!root) return;
          root.traverse(function(o){
            if (!o.isMesh || !o.material) return;
            if (Array.isArray(o.material)) o.material = o.material.map(retintOne);
            else o.material = retintOne(o.material);
          });
        });
        return count;
      },
      /* dispose any factory materials no longer referenced by the given roots.
         Call ONLY after retintEquipped has swapped references. */
      retireOldMaterials: function(roots){
        var live = Object.create(null);
        (roots || []).forEach(function(root){
          if (!root) return;
          root.traverse(function(o){
            if (!o.isMesh || !o.material) return;
            var mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach(function(mat){ if (mat && mat.uuid) live[mat.uuid] = 1; });
          });
        });
        var freed = 0, keep = [];
        owned.forEach(function(m){
          if (m && live[m.uuid]) keep.push(m);
          else if (m && m.dispose){ m.dispose(); freed++; }
        });
        owned = keep;
        Object.keys(cache).forEach(function(k){ if (!cache[k] || !live[cache[k].uuid]) delete cache[k]; });
        return freed;
      },
      skin: function(hex){
        var key = "skin" + hex;
        if (cache[key]) return cache[key];
        var m = makeMat("skin", hex || "#c98d63", PBR ? studioEnvironment() : null);
        m.userData.__role = "skin";
        cache[key] = m; return m;
      },
      lipGloss: function(hex){
        var key = "lip" + hex;
        if (cache[key]) return cache[key];
        var m = makeMat("lips", hex || "#b4554d", PBR ? studioEnvironment() : null);
        m.userData.__role = "lips";
        cache[key] = m; return m;
      },
      hairCard: function(hex){
        var key = "hair" + hex;
        if (cache[key]) return cache[key];
        var m = makeMat("hair", hex || "#2a1c12", PBR ? studioEnvironment() : null);
        m.userData.__role = "hair";
        cache[key] = m; return m;
      },
      denim: function(hex){
        var key = "denim" + hex;
        if (cache[key]) return cache[key];
        var m = makeMat("denim", hex || "#33507a", PBR ? studioEnvironment() : null);
        m.userData.__role = "denim";
        cache[key] = m; return m;
      },
      gold: function(){
        var key = "gold";
        if (cache[key]) return cache[key];
        var m = makeMat("gold", "#d4af37", PBR ? studioEnvironment() : null);
        m.userData.__role = "gold";
        cache[key] = m; return m;
      },
      fabric: function(hex){
        var key = "fabric" + (hex || "#ffffff");
        if (cache[key]) return cache[key];
        var m = makeMat("fabric", hex || "#ffffff", PBR ? studioEnvironment() : null);
        m.userData.__role = "fabric";
        cache[key] = m; return m;
      },
      chrome: function(){
        var key = "chrome";
        if (cache[key]) return cache[key];
        var m = makeMat("chrome", "#cfd6e2", PBR ? studioEnvironment() : null);
        m.userData.__role = "chrome";
        cache[key] = m; return m;
      },
      forRole: function(role, hex){
        switch(role){
          case "skin": return this.skin(hex);
          case "lips": return this.lipGloss(hex);
          case "hair": return this.hairCard(hex);
          case "denim": return this.denim(hex);
          case "gold": return this.gold();
          case "chrome": return this.chrome();
          case "fabric": return this.fabric(hex);
          default: return this.fabric(hex);
        }
      },
      dispose: function(){
        if (disposed) return; disposed = true;
        owned.forEach(function(m){ if (m && m.dispose) m.dispose(); });
        owned = [];
        ownedTextures.forEach(function(texture){ if (texture && texture.dispose) texture.dispose(); });
        ownedTextures = [];
        cache = {};
        if (envTex && envTex.dispose) envTex.dispose();
        envTex = null;
      },
      _cache: function(){ return Object.keys(cache); }
    };
    return API;
  }
  root.MCSGlamMaterialFactory = { create: factory };
})(typeof window !== "undefined" ? window : this);