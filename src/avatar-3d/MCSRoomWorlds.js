/* MCSRoomWorlds.js — original procedural environments for the protected Teen World.
   Three.js r128 compatible. These scene groups are presentation-only: avatar
   identity, wardrobe, movement and saved character state remain in the shared
   Avatar instance owned by the parent page. */
(function(root){
  "use strict";
  function create(THREE, scene){
    if(!THREE || !scene) throw new Error("MCSRoomWorlds requires THREE and scene");
    const groups = {};
    const mats = {};
    function mat(name, color, opts){
      if(!mats[name]) mats[name] = new THREE.MeshLambertMaterial(Object.assign({color}, opts || {}));
      return mats[name];
    }
    function addBox(g, name, color, x,y,z, sx,sy,sz, opts){
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), mat(name,color,opts));
      m.position.set(x,y,z); m.name = name; m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    }
    function addCylinder(g,name,color,x,y,z,rt,rb,h,segments){
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments || 16),mat(name,color));
      m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
    }
    function addSphere(g,name,color,x,y,z,sx,sy,sz){
      const m = new THREE.Mesh(new THREE.SphereGeometry(1,16,12),mat(name,color));
      m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.name=name;m.castShadow=true;g.add(m);return m;
    }
    function addRing(g,name,color,x,y,z,r,t){
      const m = new THREE.Mesh(new THREE.TorusGeometry(r,t,8,48),mat(name,color));
      m.position.set(x,y,z);m.rotation.x=Math.PI/2;m.name=name;g.add(m);return m;
    }
    function label(g, text, color, x,y,z, w,h){
      const c=document.createElement("canvas");c.width=512;c.height=128;
      const ctx=c.getContext("2d");
      ctx.fillStyle="#10151f";ctx.fillRect(0,0,512,128);
      ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(8,8,496,112);
      ctx.fillStyle=color;ctx.font="700 42px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,256,66,460);
      const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:false}));
      mesh.position.set(x,y,z);mesh.name="room-sign-"+text.toLowerCase().replace(/[^a-z0-9]+/g,"-");g.add(mesh);return mesh;
    }
    function base(id, palette, title){
      const g=new THREE.Group();g.name=id;g.userData.roomId=id;g.visible=false;scene.add(g);groups[id]=g;
      const floor=new THREE.Mesh(new THREE.CircleGeometry(8.5,56),mat(id+"-floor",palette.floor));
      floor.rotation.x=-Math.PI/2;floor.name=id+"-floor";floor.receiveShadow=true;g.add(floor);
      const wall=mat(id+"-wall",palette.wall);
      [[0,-6.3,0],[ -5.8,-3.5,0.9],[5.8,-3.5,-0.9]].forEach((a,i)=>{
        const m=new THREE.Mesh(new THREE.BoxGeometry(11.6,5.2,0.22),wall);
        m.position.set(a[0],2.6,a[1]);m.rotation.y=a[2];m.name=id+"-wall-"+i;g.add(m);
        addBox(g,id+"-trim-"+i,palette.trim,a[0],4.35,a[1],11.6,.08,.26);
      });
      label(g,title,palette.accent,0,3.35,-6.12,4.4,.72);
      const amb=new THREE.HemisphereLight(palette.accent,0x252536,.32);amb.position.set(0,7,0);g.add(amb);
      const key=new THREE.PointLight(palette.accent,0.42,20);key.position.set(0,4,2);g.add(key);
      return g;
    }
    const hang=base("teenHangout",{floor:0x25372f,wall:0x24352e,trim:0x9ac7a7,accent:"#b8e5c4"},"HANGOUT");
    addBox(hang,"hangout-rug",0x6b8f79,0,.025,1.2,7,.04,4.2);
    addBox(hang,"hangout-sofa-base",0x718e83,-2,.48,-1.1,3.2,.72,1.15);
    addBox(hang,"hangout-sofa-back",0x8eaa9c,-2,1.05,-1.62,3.2,.9,.28);
    [-3.1,-2,-.9].forEach((x,i)=>addBox(hang,"hangout-cushion-"+i,[0xb8d9c5,0xe7c5d5,0xd6c8ef][i],x,1.15,-1.4,.72,.18,.6));
    [[2.1,1.1],[3.2,1.7],[-3.8,2.6]].forEach((p,i)=>{
      addSphere(hang,"hangout-beanbag-"+i,i===1?0xc8b5e8:0x91b7a3,p[0],.42,p[1],.7,.42,.65);
    });
    addCylinder(hang,"hangout-table-top",0xd6c7a5,0,.72,1.3,.9,.9,.12,32);
    addCylinder(hang,"hangout-table-leg",0x66584b,0,.36,1.3,.12,.12,.65,12);
    addBox(hang,"hangout-display",0x172b2a,0,2.15,-5.95,3.4,1.8,.16);
    addBox(hang,"hangout-display-screen",0x8fc8b0,0,2.15,-5.83,3.1,1.5,.035);
    [[-4.4,-2.7],[4.2,-2.2]].forEach((p,i)=>{
      addCylinder(hang,"hangout-planter-"+i,0x8d6b53,p[0],.28,p[1],.48,.48,.5,16);
      addCylinder(hang,"hangout-plant-stem-"+i,0x477c56,p[0],1.0,p[1],.08,.08,1.2,8);
      for(let j=0;j<5;j++)addSphere(hang,"hangout-leaf-"+i+"-"+j,0x5e9b6b,p[0]+Math.sin(j*1.25)*.32,1.25+(j%2)*.2,p[1]+Math.cos(j*1.25)*.28,.28,.12,.16);
    });
    const studio=base("teenStudio",{floor:0x30364a,wall:0x252c40,trim:0xe4b9d4,accent:"#f1c5dc"},"CREATIVE STUDIO");
    addBox(studio,"studio-center-rug",0x6d627e,0,.025,.2,6.6,.04,4.6);
    [-2.5,0,2.5].forEach((x,i)=>{
      addBox(studio,"studio-desk-"+i,0x9a795f,x,.82,-1.4,1.9,.16,1.05);
      addBox(studio,"studio-desk-leg-"+i,0x59483d,x-.72,.4,-1.4,.12,.8,.12);
      addBox(studio,"studio-desk-leg2-"+i,0x59483d,x+.72,.4,-1.4,.12,.8,.12);
      addBox(studio,"studio-tablet-"+i,0x202838,x,.94,-1.35,.8,.05,.55);
      addBox(studio,"studio-stool-"+i,0xd2b2c7,x,.38,-2.45,.72,.18,.62);
    });
    addBox(studio,"studio-moodboard-frame",0x9d7d9d,0,2.25,-5.92,4.6,2.1,.18);
    [-1.35,0,1.35].forEach((x,i)=>addBox(studio,"studio-moodboard-card-"+i,[0xf3d4dc,0xc8d9f0,0xd1e7d2][i],x,2.3,-5.79,1.05,1.35,.05));
    addBox(studio,"studio-garment-rack",0xb7a5bd,4.5,1.5,0,.12,2.8,.12);
    addBox(studio,"studio-rack-bar",0xb7a5bd,4.5,2.85,0,2.1,.12,.12);
    [-.7,0,.7].forEach((x,i)=>addBox(studio,"studio-swatch-"+i,[0xe9b6cc,0x9fc8d8,0xd9c7a2][i],4.5+x,1.9,0,.48,.92,.08));
    const runway=base("teenRunway",{floor:0x20172a,wall:0x281d35,trim:0xf0c5e2,accent:"#f5d5ee"},"MCS RUNWAY");
    addBox(runway,"runway-platform",0x3b2a49,0,.18,0,3.8,.36,11.5);
    addBox(runway,"runway-surface",0x9b759e,0,.38,0,3.3,.05,11);
    [-1.55,1.55].forEach((x,i)=>{
      addBox(runway,"runway-edge-"+i,0xf0c5e2,x,.43,0,.07,.08,11.1);
      for(let z=-4;z<=4;z+=2)addBox(runway,"runway-seat-"+i,0x59465f,x*2,.48,z,1.1,.45,1.1);
    });
    addBox(runway,"runway-backdrop",0x37263e,0,2.2,-5.9,6.2,3.2,.22);
    label(runway,"STYLE SHOW", "#f5d5ee",0,2.35,-5.74,3.8,.8);
    for(let i=0;i<6;i++){
      const light=new THREE.SpotLight(i%2?0xc5b4ff:0xffc4e8,.55,16,Math.PI/5,.45,1);
      light.position.set(i%2?3.4:-3.4,4.6,-4.5+i*1.7);light.target.position.set(0,.4,-3+i*1.2);
      runway.add(light);runway.add(light.target);
    }
    const games=base("teenGames",{floor:0x172638,wall:0x1c2c42,trim:0x8bd7ee,accent:"#a8e9f7"},"GAME LOUNGE");
    addBox(games,"games-rug",0x344a64,0,.025,.8,7,.04,4.5);
    for(let i=0;i<3;i++){
      const x=-3.2+i*3.2;
      addBox(games,"games-cabinet-"+i,0x28374e,x,1.55,-4.2,1.25,2.9,.8);
      addBox(games,"games-screen-"+i,[0x73d7e8,0xf3c5e6,0xa7e5bd][i],x,2.0,-3.77,.92,.86,.04);
      addBox(games,"games-control-"+i,0xe1c2a6,x,1.15,-3.75,.9,.22,.08);
      addSphere(games,"games-joystick-"+i,0xef8eae,x-.22,1.35,-3.65,.08,.12,.08);
    }
    addBox(games,"games-table",0x92785d,0,.85,1.6,3.2,.18,2.2);
    addBox(games,"games-tabletop",0x4c6980,0,.96,1.6,3.05,.06,2.05);
    [[-2.2,.5],[2.2,.5],[-2.2,2.5],[2.2,2.5]].forEach((p,i)=>addSphere(games,"games-pouf-"+i,[0xc3a5e5,0x8fc9d4,0xe8b9c8,0xd8d19b][i],p[0],.4,p[1],.65,.4,.65));
    const music=base("teenMusic",{floor:0x20152e,wall:0x211831,trim:0xd2b6ff,accent:"#d7c3ff"},"MUSIC & DANCE");
    addBox(music,"music-stage",0x49325d,0,.22,-4.25,6.8,.44,2.7);
    addBox(music,"music-dj-booth",0x171222,0,1.05,-4.35,3.5,1.45,.7);
    addBox(music,"music-console",0x7f6aa2,0,1.82,-4.25,2.6,.12,.5);
    [-3.5,3.5].forEach((x,i)=>{
      addBox(music,"music-speaker-"+i,0x171222,x,1.55,-4.55,1.0,2.5,.8);
      addRing(music,"music-speaker-ring-"+i,0xbda6f3,x,1.7,-4.1,.32,.055);
    });
    addBox(music,"music-dance-floor",0x302144,0,.035,.8,7.2,.07,6.2);
    for(let i=0;i<3;i++)addRing(music,"music-dance-ring-"+i,[0x9d7cff,0xf38ec9,0x83d6e8][i],0,.09+i*.012,.8,1.1+i*.85,.035);
    for(let i=0;i<4;i++){
      const beam=new THREE.SpotLight([0xa98bff,0xff8fce,0x82d9f0,0xf5d18b][i],.42,18,Math.PI/7,.5,1);
      beam.position.set(-4.5+i*3,5,2.6);beam.target.position.set(0,.2,.8);music.add(beam);music.add(beam.target);
    }
    function update(dt,t,reducedMotion){
      if(reducedMotion)return;
      const rings=music.children.filter(o=>o.name.indexOf("music-dance-ring-")===0);
      rings.forEach((r,i)=>{r.rotation.z=Math.sin(t*.35+i)*.08;r.scale.setScalar(1+Math.sin(t*1.4+i)*.025);});
    }
    return {groups,update};
  }
  root.MCSRoomWorlds={create};
})(typeof window!=="undefined"?window:this);
