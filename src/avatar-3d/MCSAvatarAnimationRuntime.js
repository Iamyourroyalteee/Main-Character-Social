(function(root){
  "use strict";
  function create(THREE, modelRoot, options){
    options = options || {};
    if (!THREE || typeof THREE.AnimationMixer !== "function") throw new Error("AnimationMixer is required");
    if (!modelRoot || typeof modelRoot.traverse !== "function") throw new Error("A loaded Three.js model root is required");
    var mixer = new THREE.AnimationMixer(modelRoot);
    var clips = Array.isArray(options.clips) ? options.clips.slice() : [];
    var actions = Object.create(null), morphTargets = Object.create(null), validationErrors = [];
    var disposed = false, current = null, skeletonCount = 0;
    function finiteArray(values){
      if (!values || typeof values.length !== "number" || values.length === 0) return false;
      for (var i=0;i<values.length;i++) if (!Number.isFinite(values[i])) return false;
      return true;
    }
    function validateClip(clip){
      var errors = [];
      if (!clip || typeof clip.name !== "string" || !clip.name.trim()) return ["clip name is required"];
      if (!Number.isFinite(clip.duration) || clip.duration < 0) errors.push("clip duration must be finite and non-negative: " + clip.name);
      if (clip.tracks != null){
        if (!Array.isArray(clip.tracks)) errors.push("clip tracks must be an array: " + clip.name);
        else clip.tracks.forEach(function(track,index){
          if (!track || typeof track.name !== "string" || !track.name.trim()){ errors.push("track " + index + " has no binding name: " + clip.name); return; }
          if (!finiteArray(track.times)) errors.push("track has invalid keyframe times: " + clip.name + "/" + track.name);
          else for (var i=1;i<track.times.length;i++) if (track.times[i] < track.times[i-1]){ errors.push("track keyframe times are not monotonic: " + clip.name + "/" + track.name); break; }
          if (!finiteArray(track.values)) errors.push("track has invalid keyframe values: " + clip.name + "/" + track.name);
          else if (track.times && track.times.length && track.values.length % track.times.length !== 0) errors.push("track value count is incompatible with keyframe times: " + clip.name + "/" + track.name);
        });
      }
      return errors;
    }
    modelRoot.traverse(function(node){
      if (node && node.isSkinnedMesh && node.skeleton) skeletonCount++;
      if (!node || !node.morphTargetDictionary || !node.morphTargetInfluences) return;
      Object.keys(node.morphTargetDictionary).forEach(function(name){
        var index = node.morphTargetDictionary[name];
        if (!Number.isInteger(index) || index < 0 || index >= node.morphTargetInfluences.length){ validationErrors.push("invalid morph target index: " + name); return; }
        if (!morphTargets[name]) morphTargets[name] = [];
        morphTargets[name].push({ influences:node.morphTargetInfluences, index:index });
      });
    });
    clips.forEach(function(clip){
      var errors = validateClip(clip);
      if (errors.length){ validationErrors = validationErrors.concat(errors); return; }
      if (actions[clip.name]){ validationErrors.push("duplicate animation clip name: " + clip.name); return; }
      actions[clip.name] = mixer.clipAction(clip);
    });
    function ensureLive(){ if (disposed) throw new Error("Animation controller has been disposed"); }
    function play(name, fadeSeconds){
      ensureLive(); var next = actions[name]; if (!next) return false;
      fadeSeconds = Number.isFinite(fadeSeconds) ? Math.max(0, fadeSeconds) : 0.2;
      /* Reset first: Three.js reset() clears scheduled fade interpolants. */
      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.setEffectiveTimeScale(1);
      if (current && current !== next){
        if (fadeSeconds && typeof current.crossFadeTo === "function") current.crossFadeTo(next, fadeSeconds, false);
        else current.stop();
      }
      next.play();
      current = next;
      return true;
    }
    function update(deltaSeconds){ if (disposed || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return; mixer.update(Math.min(deltaSeconds, 0.1)); }
    function pause(){ ensureLive(); mixer.timeScale = 0; }
    function resume(){ ensureLive(); mixer.timeScale = 1; }
    function setSpeed(value){ ensureLive(); if (!Number.isFinite(value)) return false; mixer.timeScale = Math.max(0, Math.min(3, value)); return true; }
    function seek(seconds){ ensureLive(); if (!Number.isFinite(seconds)) return false; mixer.setTime(Math.max(0, seconds)); return true; }
    function stop(fadeSeconds){ ensureLive(); if (current && fadeSeconds > 0 && typeof current.fadeOut === "function") current.fadeOut(fadeSeconds); else mixer.stopAllAction(); current = null; }
    function setMorphTarget(name, value){
      ensureLive(); var targets = morphTargets[name]; if (!targets || !Number.isFinite(value)) return false;
      value = Math.max(0, Math.min(1, value)); targets.forEach(function(target){ target.influences[target.index] = value; }); return true;
    }
    function listClips(){ return Object.keys(actions).map(function(name){ var clip = clips.find(function(item){ return item && item.name === name; }); return { name:name, duration:clip.duration }; }); }
    function dispose(){
      if (disposed) return;
      mixer.stopAllAction(); if (typeof mixer.uncacheRoot === "function") mixer.uncacheRoot(modelRoot);
      Object.keys(actions).forEach(function(name){ delete actions[name]; });
      Object.keys(morphTargets).forEach(function(name){ delete morphTargets[name]; });
      current = null; disposed = true;
    }
    return { play:play, update:update, pause:pause, resume:resume, setSpeed:setSpeed, seek:seek, stop:stop,
      setMorphTarget:setMorphTarget, listClips:listClips, validationErrors:function(){ return validationErrors.slice(); },
      dispose:dispose, hasSkeleton:skeletonCount > 0, skeletonCount:skeletonCount, clipCount:Object.keys(actions).length,
      get isDisposed(){ return disposed; } };
  }
  root.MCSAvatarAnimationRuntime = { create:create };
})(typeof window !== "undefined" ? window : globalThis);
