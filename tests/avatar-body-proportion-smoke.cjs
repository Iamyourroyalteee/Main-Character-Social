"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../avatar-3d/MCSBodyProportionDeformer.js"),
  "utf8"
);
const window = {};
vm.runInNewContext(source, { window, Math, Number, Object });
const deformer = window.MCSBodyProportionDeformer;
assert.ok(deformer, "body proportion deformer must expose its public API");

function makeGroup(scale) {
  return { userData: {}, scale: { x: scale.x, y: scale.y, z: scale.z } };
}

const hipFit = makeGroup({ x: 1, y: 1, z: 1 });
assert.equal(deformer.applyHipFit(hipFit, 1, 1.1), true);
assertClose(hipFit.scale.x, 1.1 * 1.14, "hip fit group must widen hip-attached garments");
assertClose(hipFit.scale.y, 1, "hip fit group must preserve garment height");
assertClose(hipFit.scale.z, (0.90 + 0.12 * 1.1) * 1.06, "hip fit group must adjust garment depth");

const glutesFit = makeGroup({ x: 1, y: 1, z: 1 });
assert.equal(deformer.applyGluteFit(glutesFit, 1), true);
assertClose(glutesFit.scale.z, 1.1, "glute fit group must adjust hip-attached garment depth");
assert.equal(deformer.applyGluteFit(glutesFit, 0.5), true);
assertClose(glutesFit.scale.z, 1, "glute fit group must restore its neutral scale without drift");

const waistFit = makeGroup({ x: 1, y: 1, z: 1 });
assert.equal(deformer.applyWaistFit(waistFit, 0), true);
assertClose(waistFit.scale.x, 0.92, "waist fit group must narrow torso-attached garments");
assertClose(waistFit.scale.z, 0.92, "waist fit group must preserve matching front/back fit");
assert.equal(deformer.applyWaistFit(waistFit, 0.5), true);
assertClose(waistFit.scale.x, 1, "waist fit group must return to neutral without drift");
assert.equal(deformer.resetGroup(waistFit), true);

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-6, message + ": expected " + expected + ", received " + actual);
}

function assertArrayClose(actual, expected, message) {
  assert.equal(actual.length, expected.length, message + ": array length");
  for (let i = 0; i < expected.length; i++) {
    assertClose(actual[i], expected[i], message + " at vertex component " + i);
  }
}

function makeMesh(values, scale) {
  const counters = { normals: 0, bounds: 0, spheres: 0 };
  const geometry = {
    attributes: {
      position: {
        array: new Float32Array(values),
        needsUpdate: false
      }
    },
    computeVertexNormals() { counters.normals++; },
    computeBoundingBox() { counters.bounds++; },
    computeBoundingSphere() { counters.spheres++; }
  };
  return {
    geometry,
    counters,
    userData: {},
    scale: {
      x: scale.x,
      y: scale.y,
      z: scale.z
    }
  };
}

const pelvisBase = [
  0.10, 0.00, -0.20,  // posterior glute region
  0.10, 0.00,  0.20,  // anterior pelvis
  0.10, 0.25, -0.20   // upper rear edge, outside the glute region
];
const pelvis = makeMesh(pelvisBase, { x: 1.05, y: 0.78, z: 0.86 });
assert.equal(deformer.cache(pelvis), true);
assert.equal(deformer.applyHipWidth(pelvis, 1, 1.1), true);
assert.ok(pelvis.scale.x > 1.05, "hip-width control must widen the pelvis mesh");
assert.equal(pelvis.scale.y, 0.78, "hip-width control must preserve pelvis height");
assert.ok(pelvis.scale.z > 0.86, "hip-width control must adjust pelvis depth");

assert.equal(deformer.applyGlutes(pelvis, 1), true);
const glutePositions = pelvis.geometry.attributes.position.array;
assert.ok(glutePositions[2] < pelvisBase[2], "larger glutes must increase posterior projection");
assertClose(glutePositions[5], pelvisBase[5], "glute shaping must not move the anterior pelvis");
assertClose(glutePositions[8], pelvisBase[8], "glute shaping must fade out above the glute region");
assert.equal(pelvis.geometry.attributes.position.needsUpdate, true);
assert.ok(pelvis.counters.normals > 0 && pelvis.counters.bounds > 0 && pelvis.counters.spheres > 0,
  "geometry normals and bounds must be refreshed after deformation");

assert.equal(deformer.applyGlutes(pelvis, 0.5), true);
assertArrayClose(Array.from(pelvis.geometry.attributes.position.array), pelvisBase,
  "returning glute control to its midpoint must restore the original mesh without cumulative drift");

const torsoBase = [
  0.20, 0.27, 0.00,  // waist profile
  0.20, 0.01, 0.00,  // lower abdomen
  0.20, 0.56, 0.00   // chest profile
];
const torso = makeMesh(torsoBase, { x: 1, y: 1, z: 1 });
assert.equal(deformer.applyWaist(torso, 1), true);
const waistPositions = torso.geometry.attributes.position.array;
assert.ok(waistPositions[0] > torsoBase[0], "larger waist setting must widen the waist profile");
assertClose(waistPositions[3], torsoBase[3], "waist shaping must leave the lower abdomen transition stable");
assertClose(waistPositions[6], torsoBase[6], "waist shaping must leave the upper chest profile stable");

assert.equal(deformer.applyWaist(torso, 0), true);
assert.ok(torso.geometry.attributes.position.array[0] < torsoBase[0],
  "smaller waist setting must narrow the waist profile");
assert.equal(deformer.applyWaist(torso, 0.5), true);
assertArrayClose(Array.from(torso.geometry.attributes.position.array), torsoBase,
  "returning waist control to its midpoint must restore the original profile without cumulative drift");

assert.equal(deformer.reset(pelvis), true);
assert.deepEqual(
  { x: pelvis.scale.x, y: pelvis.scale.y, z: pelvis.scale.z },
  { x: 1.05, y: 0.78, z: 0.86 },
  "reset must restore the original pelvis scale"
);
assertArrayClose(Array.from(pelvis.geometry.attributes.position.array), pelvisBase,
  "reset must restore the original pelvis geometry");

console.log("Avatar hip, glute and waist proportion deformation smoke: PASS");
