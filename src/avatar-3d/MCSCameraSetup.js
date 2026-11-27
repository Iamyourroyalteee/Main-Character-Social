/* MCSCameraSetup.js — 34-degree portrait camera that FITS the avatar.
   Frames the avatar's actual bounding box (not a hardcoded target), keeps the
   full body visible in portrait and adapts for landscape/editor modes. */
(function(root){
  "use strict";
  function setup(THREE, camera, opts){
    opts = opts || {};
    var FOV = opts.fov != null ? opts.fov : 34;
    camera.fov = FOV;
    camera.near = opts.near != null ? opts.near : 0.1;
    camera.far = opts.far != null ? opts.far : 100;
    camera.updateProjectionMatrix();

    var state = { mode: opts.mode || "portrait", fitRadius: 5.4 };

    /* fit: compute avatar bounds from its Object3D and place camera so the
       whole body is visible with headroom */
    function fit(avatarRoot, aspect){
      var box = new THREE.Box3().setFromObject(avatarRoot);
      var size = box.getSize(new THREE.Vector3());
      var center = box.getCenter(new THREE.Vector3());
      var vFov = THREE.MathUtils.degToRad(FOV);
      /* portrait: use the tighter of the two FOVs to fit BOTH dimensions */
      var hFov = 2 * Math.atan(Math.tan(vFov / 2) * (aspect || 1));
      var vDist = (size.y / 2) / Math.tan(vFov / 2);
      var hDist = (size.x / 2) / Math.tan(hFov / 2);
      var dist = Math.max(vDist, hDist) * (opts.padding || 1.18);
      state.fitRadius = dist;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      return { dist: dist, center: center, size: size };
    }
    /* responsive: portrait = full-body fashion framing; landscape/editor = wider */
    function applyMode(mode, aspect){
      state.mode = mode || state.mode;
      var a = aspect || (camera.aspect || 1);
      if (state.mode === "portrait"){
        camera.fov = a < 1 ? FOV : FOV * 1.12; /* slight widen on landscape so body fits */
      } else {
        camera.fov = FOV * 1.3;
      }
      camera.updateProjectionMatrix();
    }
    return { camera: camera, fit: fit, applyMode: applyMode, state: state, FOV: FOV };
  }
  root.MCSCameraSetup = { create: setup };
})(typeof window !== "undefined" ? window : this);