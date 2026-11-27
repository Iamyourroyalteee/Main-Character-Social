/* MCSStudioLighting.js — studio lighting rig for the MCS 3D Avatar Studio.
   Designed for three.js r128 (the prototype's pinned CDN version).
   Exposes a single guarded install: if a rig already exists on the scene it is
   reused, never duplicated. Provides warm key / cool fill / gold rim / cove
   bounce + ambient, plus a ShadowMaterial ground plane that coexists with the
   room floor (renders ONLY shadows, does not replace or z-fight the floor). */
(function(root){
  "use strict";
  function install(THREE, scene, opts){
    opts = opts || {};
    if (!THREE || !scene) throw new Error("MCSStudioLighting: THREE and scene required");
    if (scene.userData && scene.userData.__mcsStudioRig){
      return scene.userData.__mcsStudioRig; /* guard: never duplicate the rig */
    }
    var rig = { lights: [] };
    function add(light){ scene.add(light); rig.lights.push(light); return light; }

    /* tone mapping + shadows: configured ONCE by the caller's renderer */
    rig.toneMappingExposure = opts.exposure != null ? opts.exposure : 1.05;

    rig.key = add(new THREE.DirectionalLight(0xffe9c4, opts.keyIntensity != null ? opts.keyIntensity : 0.9));
    rig.key.position.set(3.2, 6.0, 4.2);
    rig.fill = add(new THREE.DirectionalLight(0x9fb8ff, opts.fillIntensity != null ? opts.fillIntensity : 0.30));
    rig.fill.position.set(-4.0, 3.0, 2.5);
    rig.rim = add(new THREE.DirectionalLight(0xd4af37, opts.rimIntensity != null ? opts.rimIntensity : 0.5));
    rig.rim.position.set(-3.5, 4.0, -4.0);
    rig.cove = add(new THREE.DirectionalLight(0xfff4d6, 0.18));
    rig.cove.position.set(0, 2.0, -6.0);
    rig.ambient = add(new THREE.AmbientLight(0x40394a, 0.5));

    /* shadow configuration on the key light (PCFSoft) */
    if (opts.shadows !== false && rendererSupportsShadows){
      rig.key.castShadow = true;
      rig.key.shadow.mapSize.set(opts.shadowMapSize || 1024, opts.shadowMapSize || 1024);
      rig.key.shadow.camera.near = 0.5;
      rig.key.shadow.camera.far = 30;
      rig.key.shadow.camera.left = -6; rig.key.shadow.camera.right = 6;
      rig.key.shadow.camera.top = 8;  rig.key.shadow.camera.bottom = -2;
      rig.key.shadow.camera.updateProjectionMatrix(); /* REQUIRED after frustum change (r128) */
      rig.key.shadow.bias = -0.0005;
      rig.shadowRadius = rig.key.shadow.radius;
    }

    /* ShadowMaterial ground: invisible except shadows; sits 1mm above the room
       floor to avoid z-fighting, and is added per-room by the caller at floor
       height (default 0.011). It does NOT receive room lighting or replace the
       floor texture — it only catches avatar shadows. */
    rig.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.ShadowMaterial({ opacity: opts.shadowOpacity != null ? opts.shadowOpacity : 0.32 })
    );
    rig.ground.rotation.x = -Math.PI / 2;
    rig.ground.receiveShadow = true;
    rig.groundY = opts.groundY != null ? opts.groundY : 0.011;

    rig.setGroundY = function(y){
      rig.groundY = y; rig.ground.position.y = y;
      if (rig.ground.parent) return;
      scene.add(rig.ground);
    };
    rig.setEnabled = function(on){
      rig.lights.forEach(function(l){ l.visible = on; });
      rig.ground.visible = on;
    };

    scene.userData.__mcsStudioRig = rig;
    return rig;
  }
  var rendererSupportsShadows = true; /* r128 PCFSoftShadowMap is universal */
  root.MCSStudioLighting = { install: install };
})(typeof window !== "undefined" ? window : this);