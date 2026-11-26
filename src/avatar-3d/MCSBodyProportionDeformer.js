(function(root){
  "use strict";

  function clamp01(value){
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5;
  }

  function clamp(value, min, max){
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 1;
  }

  function smoothstep(edge0, edge1, value){
    const t = clamp01((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  function stateFor(mesh){
    if(!mesh || !mesh.geometry || !mesh.geometry.attributes ||
       !mesh.geometry.attributes.position || !mesh.scale) return null;

    if(!mesh.userData || typeof mesh.userData !== "object") mesh.userData = {};
    let state = mesh.userData.__mcsProportionBase;
    if(!state){
      const attribute = mesh.geometry.attributes.position;
      if(!attribute.array || typeof attribute.array.slice !== "function") return null;
      state = {
        positions: attribute.array.slice(),
        scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z }
      };
      mesh.userData.__mcsProportionBase = state;
    }
    return state;
  }

  function refreshGeometry(mesh, attribute){
    attribute.needsUpdate = true;
    const geometry = mesh.geometry;
    if(typeof geometry.computeVertexNormals === "function") geometry.computeVertexNormals();
    if(typeof geometry.computeBoundingBox === "function") geometry.computeBoundingBox();
    if(typeof geometry.computeBoundingSphere === "function") geometry.computeBoundingSphere();
  }

  function rewritePositions(mesh, transform){
    const state = stateFor(mesh);
    if(!state) return false;
    const attribute = mesh.geometry.attributes.position;
    const target = attribute.array;
    const base = state.positions;
    if(target.length !== base.length || target.length % 3 !== 0) return false;

    target.set(base);
    for(let i = 0; i < base.length; i += 3){
      const point = transform(base[i], base[i + 1], base[i + 2]);
      target[i] = point[0];
      target[i + 1] = point[1];
      target[i + 2] = point[2];
    }
    refreshGeometry(mesh, attribute);
    return true;
  }

  function cache(mesh){
    return !!stateFor(mesh);
  }

  function applyHipWidth(mesh, amount, presetHip){
    const state = stateFor(mesh);
    if(!state) return false;
    const value = clamp01(amount);
    const preset = clamp(presetHip, 0.75, 1.25);
    mesh.scale.x = state.scale.x * preset * (0.86 + 0.28 * value);
    mesh.scale.y = state.scale.y;
    mesh.scale.z = state.scale.z * (0.90 + 0.12 * preset) * (0.94 + 0.12 * value);
    return true;
  }

  function applyGlutes(mesh, amount){
    const depth = 0.82 + 0.36 * clamp01(amount);
    return rewritePositions(mesh, function(x, y, z){
      const rearWeight = smoothstep(0.02, 0.14, -z);
      const verticalWeight = 1 - smoothstep(0.12, 0.23, Math.abs(y));
      const weight = rearWeight * verticalWeight;
      return [x, y, z * (1 + (depth - 1) * weight)];
    });
  }

  function applyWaist(mesh, amount){
    const radial = 0.86 + 0.28 * clamp01(amount);
    return rewritePositions(mesh, function(x, y, z){
      const weight = 1 - smoothstep(0.06, 0.20, Math.abs(y - 0.27));
      const factor = 1 + (radial - 1) * weight;
      return [x * factor, y, z * factor];
    });
  }

  function reset(mesh){
    const state = stateFor(mesh);
    if(!state) return false;
    const attribute = mesh.geometry.attributes.position;
    if(attribute.array.length !== state.positions.length) return false;
    attribute.array.set(state.positions);
    mesh.scale.x = state.scale.x;
    mesh.scale.y = state.scale.y;
    mesh.scale.z = state.scale.z;
    refreshGeometry(mesh, attribute);
    return true;
  }

  root.MCSBodyProportionDeformer = {
    cache,
    applyHipWidth,
    applyGlutes,
    applyWaist,
    reset
  };
})(window);
