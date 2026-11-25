"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(root,"src/index.html"),"utf8");
const fashion=fs.readFileSync(path.join(root,"fashion-studio/index.html"),"utf8");
const deployedFashion=fs.readFileSync(path.join(root,"src/fashion-studio/index.html"),"utf8");
assert.match(app,/function renderFashionStudio\(/);
assert.match(app,/fashionstudio:renderFashionStudio/);
assert.match(app,/card\("fashion-studio"/);
assert.match(app,/MCS_FASHION_PUBLISH/);
assert.match(app,/event\.origin!==window\.location\.origin/);
assert.match(app,/event\.source!==f\.contentWindow/);
assert.match(app,/fashionLookHTML\(post,feedStyle\)/);
assert.match(app,/saved_post_ids/);
assert.match(app,/settings\.fashion_looks/);
assert.match(app,/remix_author_pid/);
assert.match(fashion,/id="publish"/);
assert.match(fashion,/MCS_FASHION_SAVE/);
assert.match(fashion,/MCS_FASHION_LOAD_REMIX/);
assert.match(fashion,/MCS_FASHION_READY/);
assert.match(fashion,/MCS_FASHION_DELETE/);
assert.equal(fashion,deployedFashion,"source and deployed Fashion Studio routes must remain byte-for-byte synchronized");
function checkInlineScripts(html,label){
  let index=0;
  for(const match of html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)){
    const source=match[1].trim();
    if(source)assert.doesNotThrow(()=>new vm.Script(source,{filename:label+" inline script "+index}),label+" inline script "+index+" must parse");
    index++;
  }
}
checkInlineScripts(app,"main app");
checkInlineScripts(fashion,"Fashion Studio");
console.log("Social + Fashion Studio bridge smoke: PASS");
