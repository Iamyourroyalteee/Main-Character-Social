(function(root, factory){
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MCSAvatarCatalogAnimationBridge = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  "use strict";

  function create(THREE, engine, scene, options){
    options = options || {};
    if (!engine || typeof engine.loadCatalogAsset !== "function" || typeof engine.releaseAsset !== "function"){
      throw new Error("A catalog asset engine with loadCatalogAsset and releaseAsset is required");
    }
    if (!scene || typeof scene.add !== "function") throw new Error("A Three.js scene or parent is required");

    var records = [];
    var disposed = false;

    function removeRecord(record){
      records = records.filter(function(item){ return item !== record; });
    }

    function safeReleaseAsset(modelRoot){
      if (!modelRoot) return;
      try { engine.releaseAsset(modelRoot); } catch(error){
        if (typeof console !== "undefined" && console.error) console.error("[MCS] Catalog asset release failed:", error);
      }
    }

    function releaseRecord(record){
      if (!record || record.released) return;
      record.released = true;
      if (record.request && !record.root && typeof record.request.cancel === "function"){
        try { record.request.cancel(); } catch(error){}
      }
      if (record.controller && typeof record.controller.dispose === "function"){
        try { record.controller.dispose(); } catch(error){}
      }
      if (record.root){
        if (record.parent && typeof record.parent.remove === "function"){
          try { record.parent.remove(record.root); } catch(error){}
        }
        safeReleaseAsset(record.root);
      }
      record.root = null;
      record.controller = null;
      record.state = "released";
      removeRecord(record);
    }

    function load(asset, loadOptions){
      if (disposed) throw new Error("Catalog animation bridge has been disposed");
      loadOptions = loadOptions || {};
      var parent = loadOptions.parent || scene;
      if (!parent || typeof parent.add !== "function") throw new Error("Catalog preview parent must support add()");

      var record = {
        state:"loading", released:false, request:null, root:null, controller:null,
        parent:parent, error:null, descriptor:null, report:null
      };
      records.push(record);

      var handle = {
        cancel:function(){ releaseRecord(record); },
        release:function(){ releaseRecord(record); },
        play:function(name, fadeSeconds){ return record.controller ? record.controller.play(name, fadeSeconds) : false; },
        pause:function(){ if (record.controller) record.controller.pause(); },
        resume:function(){ if (record.controller) record.controller.resume(); },
        seek:function(seconds){ return record.controller ? record.controller.seek(seconds) : false; },
        stop:function(fadeSeconds){ if (record.controller) record.controller.stop(fadeSeconds); },
        setMorphTarget:function(name, value){ return record.controller ? record.controller.setMorphTarget(name, value) : false; },
        listClips:function(){ return record.controller ? record.controller.listClips() : []; },
        validationErrors:function(){ return record.controller ? record.controller.validationErrors() : []; }
      };
      Object.defineProperties(handle, {
        status:{enumerable:true,get:function(){ return record.state; }},
        root:{enumerable:true,get:function(){ return record.root; }},
        controller:{enumerable:true,get:function(){ return record.controller; }},
        error:{enumerable:true,get:function(){ return record.error; }},
        descriptor:{enumerable:true,get:function(){ return record.descriptor; }},
        report:{enumerable:true,get:function(){ return record.report; }}
      });

      function fail(error){
        if (record.released || record.state !== "loading") return;
        record.state = "error";
        record.error = error && error.message ? error.message : String(error || "Catalog asset load failed");
        removeRecord(record);
        if (typeof loadOptions.onError === "function"){
          try { loadOptions.onError(record.error, handle); } catch(callbackError){
            if (typeof console !== "undefined" && console.error) console.error("[MCS] Catalog onError callback failed:", callbackError);
          }
        }
      }

      function ready(modelRoot, gltf, descriptor, report){
        if (record.released || disposed){ safeReleaseAsset(modelRoot); return; }
        if (!modelRoot || typeof modelRoot.traverse !== "function"){
          safeReleaseAsset(modelRoot);
          fail("Catalog loader returned an invalid Three.js model root");
          return;
        }
        try {
          var clips = gltf && Array.isArray(gltf.animations) ? gltf.animations : [];
          var createController = loadOptions.createAnimationController || options.createAnimationController;
          if (typeof createController === "function") record.controller = createController(modelRoot, clips, THREE);
          else if (typeof root.MCSAvatarAnimationRuntime !== "undefined" && root.MCSAvatarAnimationRuntime && typeof root.MCSAvatarAnimationRuntime.create === "function"){
            record.controller = root.MCSAvatarAnimationRuntime.create(THREE, modelRoot, { clips:clips });
          } else throw new Error("MCSAvatarAnimationRuntime is unavailable");
          if (!record.controller || typeof record.controller.update !== "function") throw new Error("Animation controller did not expose update()");
          record.root = modelRoot;
          record.descriptor = descriptor || null;
          record.report = report || null;
          parent.add(modelRoot);
          record.state = "ready";
          if (typeof loadOptions.onReady === "function"){
            try { loadOptions.onReady(handle, { root:modelRoot, gltf:gltf, descriptor:descriptor, report:report, controller:record.controller }); }
            catch(callbackError){
              if (typeof console !== "undefined" && console.error) console.error("[MCS] Catalog onReady callback failed:", callbackError);
            }
          }
        } catch(error){
          if (record.controller && typeof record.controller.dispose === "function"){
            try { record.controller.dispose(); } catch(disposeError){}
          }
          record.controller = null;
          safeReleaseAsset(modelRoot);
          record.root = null;
          fail(error);
        }
      }

      try {
        record.request = engine.loadCatalogAsset(asset, ready, fail);
        if (!record.request && record.state === "loading") fail("Catalog loader did not return a request handle");
      } catch(error){ fail(error); }
      return handle;
    }

    function update(deltaSeconds){
      if (disposed || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return;
      records.slice().forEach(function(record){
        if (!record.released && record.state === "ready" && record.controller && typeof record.controller.update === "function"){
          record.controller.update(Math.min(deltaSeconds, 0.1));
        }
      });
    }

    function dispose(){
      if (disposed) return;
      disposed = true;
      records.slice().forEach(releaseRecord);
    }

    return {
      load:load,
      update:update,
      dispose:dispose,
      get activeCount(){ return records.length; },
      get isDisposed(){ return disposed; }
    };
  }

  return { create:create };
});
