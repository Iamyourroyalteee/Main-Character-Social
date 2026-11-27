const assert = require("node:assert/strict");
const Bridge = require("../avatar-3d/MCSAvatarCatalogAnimationBridge.js");

const added = [];
const removed = [];
const released = [];
const controllers = [];
const pending = [];
const scene = {
  add(root){ added.push(root); root.parent = this; },
  remove(root){ removed.push(root); if(root.parent === this) root.parent = null; }
};
const engine = {
  loadCatalogAsset(asset, onDone, onFail){
    const request = { cancelled:false, cancel(){ this.cancelled = true; } };
    pending.push({asset,onDone,onFail,request});
    if(asset.id === "sync") onDone(asset.root, asset.gltf, {id:asset.id}, {valid:true,skinnedMeshCount:1});
    if(asset.id === "failure") onFail("fixture load failure");
    return request;
  },
  releaseAsset(root){ released.push(root); }
};
const bridge = Bridge.create({}, engine, scene, {
  createAnimationController(root, clips){
    const controller = {
      root, clips, updates:[], played:[], disposed:false,
      update(dt){ this.updates.push(dt); },
      play(name,fade){ this.played.push([name,fade]); return clips.some(clip=>clip.name===name); },
      pause(){ this.paused=true; }, resume(){ this.paused=false; },
      seek(t){ this.seeked=t; return true; }, stop(){ this.stopped=true; },
      setMorphTarget(name,value){ this.morph=[name,value]; return true; },
      listClips(){ return clips.map(clip=>({name:clip.name,duration:clip.duration})); },
      validationErrors(){ return []; },
      dispose(){ this.disposed=true; }
    };
    controllers.push(controller);
    return controller;
  }
});

const rootA = {traverse(fn){ fn({isSkinnedMesh:true}); }};
const gltfA = {animations:[{name:"Idle",duration:1}]};
const readyCalls = [];
const handle = bridge.load({id:"sync",root:rootA,gltf:gltfA},{onReady:(h,info)=>readyCalls.push(info)});
assert.equal(handle.status,"ready","catalog preview should reach ready after validated load");
assert.equal(handle.root,rootA,"loaded model root should be exposed");
assert.equal(added.length,1,"ready model should be attached to the scene");
assert.equal(readyCalls.length,1,"onReady should fire once");
assert.equal(handle.play("Idle",0.2),true,"named GLTF clip should be playable");
assert.equal(handle.setMorphTarget("smile",0.7),true,"facial morph control should delegate to the controller");
bridge.update(0.05);
assert.deepEqual(controllers[0].updates,[0.05],"render-loop update should advance active catalog animation");
assert.deepEqual(handle.listClips(),[{name:"Idle",duration:1}],"clip metadata should be exposed");
handle.release();
assert.equal(handle.status,"released","release should update handle state");
assert.equal(controllers[0].disposed,true,"release should dispose the animation controller");
assert.equal(removed[0],rootA,"release should detach the model from its parent");
assert.equal(released[0],rootA,"release should return model ownership to the loader");

const cancelHandle = bridge.load({id:"pending"},{onReady:()=>{throw new Error("must not attach after cancellation");}});
const pendingRecord = pending[pending.length-1];
cancelHandle.cancel();
assert.equal(pendingRecord.request.cancelled,true,"cancel should abort an in-flight catalog request");
const lateRoot = {traverse(){}};
pendingRecord.onDone(lateRoot,{animations:[]},{id:"pending"},{valid:true});
assert.ok(released.includes(lateRoot),"late completion after cancellation should release its model root");

const failed = bridge.load({id:"failure"});
assert.equal(failed.status,"error","loader failures should be surfaced on the handle");
assert.match(failed.error,/fixture load failure/);

const rootB = {traverse(){}};
const bulk = bridge.load({id:"later"});
const later = pending[pending.length-1];
later.onDone(rootB,{animations:[]},{id:"later"},{valid:true});
assert.equal(bridge.activeCount,1,"bridge should track only active preview records");
bridge.dispose();
assert.equal(bridge.isDisposed,true,"bridge dispose should be idempotent");
assert.equal(bulk.status,"released","bridge disposal should release outstanding previews");
assert.equal(bridge.activeCount,0,"bridge disposal should release every active record");
assert.throws(()=>bridge.load({id:"after-dispose"}),/disposed/);
console.log("Avatar catalog animation bridge smoke: PASS");
