"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const runtimeSource = fs.readFileSync(path.join(__dirname, "../avatar-3d/MCSAvatarAnimationRuntime.js"), "utf8");
const animationWindow = {};
vm.runInNewContext(runtimeSource, { window: animationWindow });
let clipActions = 0;
class MockMixer {
  constructor(root){ this.root = root; }
  clipAction(){ clipActions++; return { reset(){return this;}, setEffectiveWeight(){return this;}, setEffectiveTimeScale(){return this;}, play(){return this;}, stop(){return this;}, crossFadeTo(){return this;} }; }
  update(){}
  stopAllAction(){}
  uncacheRoot(){}
}
const influences = [0, 0];
const root = { traverse(fn){
  fn({isSkinnedMesh:true,skeleton:{}});
  fn({morphTargetDictionary:{smile:0,invalid:4},morphTargetInfluences:influences});
}};
const validTrack = {name:".bones[Head].quaternion",times:[0,1],values:[0,0,0,1,0,0,0,1]};
const animation = animationWindow.MCSAvatarAnimationRuntime.create({AnimationMixer:MockMixer}, root, {clips:[
  {name:"Idle",duration:1,tracks:[validTrack]},
  {name:"BrokenDuration",duration:NaN,tracks:[validTrack]},
  {name:"BrokenTimes",duration:1,tracks:[{name:"bad.times",times:[0,1,0.5],values:[0,1,2]}]},
  {name:"Idle",duration:1,tracks:[validTrack]}
]});
assert.equal(animation.hasSkeleton,true);
assert.equal(animation.clipCount,1,"only structurally valid, uniquely named clips should be registered");
assert.equal(clipActions,1,"invalid and duplicate clips must not create mixer actions");
assert.equal(animation.play("Idle"),true);
assert.equal(animation.play("BrokenDuration"),false);
assert.equal(animation.setMorphTarget("smile",0.7),true);
assert.equal(influences[0],0.7);
assert.equal(animation.setMorphTarget("invalid",1),false,"out-of-range morph indices must be ignored");
assert.ok(animation.validationErrors().some(x=>x.includes("duration")));
assert.ok(animation.validationErrors().some(x=>x.includes("monotonic")));
assert.ok(animation.validationErrors().some(x=>x.includes("duplicate")));
assert.ok(animation.validationErrors().some(x=>x.includes("morph target index")));
animation.dispose();

const loaderSource = fs.readFileSync(path.join(__dirname, "../avatar-3d/MCSAvatarLoader.js"), "utf8");
const loaderWindow = {};
vm.runInNewContext(loaderSource, {window:loaderWindow});
const engine = loaderWindow.MCSAvatarLoader.create({}, {
  renderer:{domElement:{clientWidth:1,clientHeight:1},setSize(){}},
  scene:{},camera:{updateProjectionMatrix(){}}
});
const counts = {geometry:0,material:0,base:0,normal:0,roughness:0,metalness:0,ao:0,emissive:0,alpha:0};
function resource(key){return {dispose(){counts[key]++;}};}
const sharedGeometry=resource("geometry"), sharedMaterial={dispose(){counts.material++;}};
sharedMaterial.map=resource("base");
sharedMaterial.normalMap=resource("normal");
sharedMaterial.roughnessMap=resource("roughness");
sharedMaterial.metalnessMap=resource("metalness");
sharedMaterial.aoMap=resource("ao");
sharedMaterial.emissiveMap=resource("emissive");
sharedMaterial.alphaMap=resource("alpha");
const meshA={isMesh:true,geometry:sharedGeometry,material:sharedMaterial};
const meshB={isMesh:true,geometry:sharedGeometry,material:[sharedMaterial]};
engine.disposeObject({traverse(fn){fn(meshA);fn(meshB);}});
for(const key of Object.keys(counts)) assert.equal(counts[key],1,key+" must be disposed exactly once");
engine.teardown();
const factorySource = fs.readFileSync(path.join(__dirname, "../avatar-3d/MCSGlamMaterialFactory.js"), "utf8");
const factoryWindow = {};
const fakeCanvasContext = {
  createLinearGradient(){return {addColorStop(){}};},
  createRadialGradient(){return {addColorStop(){}};},
  fillRect(){},beginPath(){},arc(){},fill(){}
};
const fakeDocument = {createElement(){return {width:0,height:0,getContext(){return fakeCanvasContext;}};}};
vm.runInNewContext(factorySource, {window:factoryWindow,document:fakeDocument});
function MockColor(hex){ this.hex=String(hex).replace("#",""); this.getHexString=()=>this.hex; }
let createdPhysical = 0;
class MockPhysicalMaterial {
  constructor(params){ this.color=params.color; this.userData={}; this.uuid="pbr-"+(++createdPhysical); this.dispose=function(){}; }
}
class MockCanvasTexture { constructor(canvas){this.canvas=canvas;} dispose(){} }
const factory = factoryWindow.MCSGlamMaterialFactory.create({
  MeshPhysicalMaterial:MockPhysicalMaterial, MeshToonMaterial:MockPhysicalMaterial,
  Color:MockColor, CanvasTexture:MockCanvasTexture, EquirectangularReflectionMapping:1, DoubleSide:2
});
const legacyToon = {isMeshToonMaterial:true,name:"",userData:{},color:new MockColor("#c08050"),transparent:false};
const legacyMesh = {isMesh:true,name:"",userData:{},material:legacyToon};
const converted = factory.retintEquipped([{traverse(fn){fn(legacyMesh);}}]);
assert.equal(converted,1,"PBR toggle must convert untagged legacy toon materials on avatar meshes");
assert.notEqual(legacyMesh.material,legacyToon);
assert.equal(legacyMesh.material.userData.__role,"fabric","unclassified avatar surfaces should receive a safe PBR fabric role");
factory.dispose();
console.log("PASS: animation clips, track timing, morph indices, AO texture disposal, and shared GLTF resource cleanup.");
