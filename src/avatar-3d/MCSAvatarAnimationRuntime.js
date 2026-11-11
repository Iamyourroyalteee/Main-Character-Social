(function(root){
  "use strict";
  function create(THREE, modelRoot, options){
    options = options || {};
    if (!THREE || typeof THREE.AnimationMixer !== "function") throw new Error("AnimationMixer is required");
    if (!modelRoot || typeof modelRoot.traverse !== "function") throw new Error("A loaded Three.js model root is required");
    var mixer = new THREE.AnimationMixer(modelRoot);
    var clips = Array.isArray(options.clips) ? options.clips.slice() : [];
    var actions = Object.create(null);
    var morphTargets = Object.create(null);
    var disposed = false;
    var current = null;
    var skeletonCount = 0;
    modelRoot.traverse(function(node){
      if (node && node.isSkinnedMesh && node.skeleton) skeletonCount++;
      if (!node || !node.morphTargetDictionary || !node.morphTargetInfluences) return;
      Object.keys(node.morphTargetDictionary).forEach(function(name){
        var index = node.morphTargetDictionary[name];
        if (!morphTargets[name]) morphTargets[name] = [];
        morphTargets[name].push({ influences:node.morphTargetInfluences, index:index });
      });
    });
    clips.forEach(function(clip){
      if (!clip || typeof clip.name !== "string" || !clip.name.trim()) return;
      if (actions[clip.name]) return;
      actions[clip.name] = mixer.clipAction(clip);
    });
    function ensureLive(){ if (disposed) throw new Error("Animation controller has been disposed"); }
    function play(name, fadeSeconds){
      ensureLive();
      var next = actions[name];
      if (!next) return false;
      fadeSeconds = Number.isFinite(fadeSeconds) ? Math.max(0, fadeSeconds) : 0.2;
      if (current && current !== next){
        if (fadeSeconds && typeof current.crossFadeTo === "function") current.crossFadeTo(next, fadeSeconds, false);
        else current.stop();
      }
      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.setEffectiveTimeScale(1);
      next.play();
      current = next;
      return true;
    }
    function update(deltaSeconds){
      if (disposed || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return;
      mixer.update(Math.min(deltaSeconds, 0.1));
    }
    function pause(){ ensureLive(); mixer.timeScale = 0; }
    function resume(){ ensureLive(); mixer.timeScale = 1; }
    function setSpeed(value){ ensureLive(); if (!Number.isFinite(value)) return false; mixer.timeScale = Math.max(0, Math.min(3, value)); return true; }
    function seek(seconds){
      ensureLive();
      if (!Number.isFinite(seconds)) return false;
      mixer.setTime(Math.max(0, seconds));
      return true;
    }
    function stop(fadeSeconds){
      ensureLive();
      if (current && fadeSeconds > 0 && typeof current.fadeOut === "function") current.fadeOut(fadeSeconds);
      else mixer.stopAllAction();
      current = null;
    }
    function setMorphTarget(name, value){
      ensureLive();
      var targets = morphTargets[name];
      if (!targets || !Number.isFinite(value)) return false;
      value = Math.max(0, Math.min(1, value));
      targets.forEach(function(target){ target.influences[target.index] = value; });
      return true;
    }
    function listClips(){ return clips.map(function(clip){ return { name:clip.name, duration:clip.duration }; }); }
    function dispose(){
      if (disposed) return;
      mixer.stopAllAction();
      if (typeof mixer.uncacheRoot === "function") mixer.uncacheRoot(modelRoot);
      Object.keys(actions).forEach(function(name){ delete actions[name]; });
      Object.keys(morphTargets).forEach(function(name){ delete morphTargets[name]; });
      current = null;
      disposed = true;
    }
    return {
      play:play, update:update, pause:pause, resume:resume, setSpeed:setSpeed,
      seek:seek, stop:stop, setMorphTarget:setMorphTarget, listClips:listClips,
      dispose:dispose, hasSkeleton:skeletonCount > 0, skeletonCount:skeletonCount,
      clipCount:Object.keys(actions).length,
      get isDisposed(){ return disposed; }
    };
  }
  root.MCSAvatarAnimationRuntime = { create:create };
})(typeof window !== "undefined" ? window : globalThis);
