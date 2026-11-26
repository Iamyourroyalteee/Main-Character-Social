"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const modulePath = path.join(root, "avatar-3d/MCSRoomWorlds.js");
const embeddedPath = path.join(root, "src/avatar-3d/MCSRoomWorlds.js");
const source = fs.readFileSync(modulePath, "utf8");
const embeddedSource = fs.readFileSync(embeddedPath, "utf8");

assert.equal(
  embeddedSource,
  source,
  "standalone and embedded Teen World modules must remain byte-for-byte synchronized"
);

class Vector3 {
  constructor() { this.x = 1; this.y = 1; this.z = 1; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(value) { this.x = value; this.y = value; this.z = value; return this; }
}

class Object3D {
  constructor() {
    this.children = [];
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = new Vector3();
    this.userData = {};
    this.visible = true;
    this.name = "";
  }
  add(child) {
    this.children.push(child);
    child.parent = this;
    return this;
  }
}

class Group extends Object3D {}
class Geometry { constructor(...args) { this.args = args; } }
class Material { constructor(options) { this.options = options || {}; } }
class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.castShadow = false;
    this.receiveShadow = false;
  }
}
class Light extends Object3D {
  constructor(...args) {
    super();
    this.args = args;
    this.target = new Object3D();
  }
}
class CanvasTexture {
  constructor(image) { this.image = image; this.encoding = null; }
}

const THREE = {
  Group,
  Mesh,
  BoxGeometry: Geometry,
  CylinderGeometry: Geometry,
  SphereGeometry: Geometry,
  TorusGeometry: Geometry,
  CircleGeometry: Geometry,
  PlaneGeometry: Geometry,
  MeshLambertMaterial: Material,
  MeshBasicMaterial: Material,
  HemisphereLight: Light,
  PointLight: Light,
  SpotLight: Light,
  CanvasTexture,
  sRGBEncoding: "sRGBEncoding"
};

const canvasContext = {
  fillRect() {},
  strokeRect() {},
  fillText() {}
};
const document = {
  createElement(tag) {
    assert.equal(tag, "canvas", "room signs should use canvas textures");
    return {
      width: 0,
      height: 0,
      getContext(kind) {
        assert.equal(kind, "2d");
        return canvasContext;
      }
    };
  }
};

const window = {};
vm.runInNewContext(source, { window, document, THREE });

assert.ok(window.MCSRoomWorlds, "room module must expose MCSRoomWorlds");
const scene = new Group();
const worlds = window.MCSRoomWorlds.create(THREE, scene);
const expectedRooms = [
  "teenHangout",
  "teenStudio",
  "teenRunway",
  "teenGames",
  "teenMusic"
];

assert.deepEqual(
  Object.keys(worlds.groups).sort(),
  expectedRooms.slice().sort(),
  "all five protected Teen World environments must be constructed"
);
assert.equal(scene.children.length, expectedRooms.length, "each room must attach one independent group");

for (const id of expectedRooms) {
  const group = worlds.groups[id];
  assert.ok(group instanceof Group, id + " must be a Three.js group");
  assert.equal(group.name, id);
  assert.equal(group.userData.roomId, id);
  assert.equal(group.visible, false, id + " must start hidden until selected");
  assert.ok(group.children.some(child => child instanceof Mesh), id + " must contain room geometry");
  assert.ok(group.children.some(child => child instanceof Light), id + " must contain room lighting");
}

const music = worlds.groups.teenMusic;
const danceRings = music.children.filter(child => child.name.indexOf("music-dance-ring-") === 0);
assert.equal(danceRings.length, 3, "Music & Dance must contain three animated floor rings");

const ring = danceRings[0];
const initial = { x: ring.scale.x, y: ring.scale.y, z: ring.scale.z, rotation: ring.rotation.z };
worlds.update(1 / 60, 2, true);
assert.deepEqual(
  { x: ring.scale.x, y: ring.scale.y, z: ring.scale.z, rotation: ring.rotation.z },
  initial,
  "reduced-motion mode must freeze ambient dance-floor animation"
);

worlds.update(1 / 60, 2, false);
assert.notEqual(ring.rotation.z, initial.rotation, "ambient animation should run when reduced motion is not requested");
assert.notEqual(ring.scale.x, initial.x, "dance-floor rings should animate their scale");

console.log("Teen World scene construction and reduced-motion smoke: PASS");
