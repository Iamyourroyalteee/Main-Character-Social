'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('src/index.html', 'utf8');

assert.ok(html.includes('function renderJoinLegacy(){return'), 'legacy auth must fail closed');
assert.ok(html.includes('Secure sign-in unavailable'), 'fallback must explain secure auth is unavailable');
assert.ok(!html.includes('Launch preview inbox:'), 'preview login/signup codes must not be rendered');
assert.ok(!html.includes('UI.siChallenge={code:String(Math.floor'), 'legacy sign-in must not generate browser codes');
assert.ok(!html.includes('UI.challenge={code:String(Math.floor'), 'legacy signup must not generate browser codes');
assert.ok(!html.includes('UI.av36Code=String(Math.floor'), 'account verification must not generate browser codes');
assert.ok(html.includes('Browser-generated verification codes are disabled.'), 'secondary verification must fail closed');
assert.ok(html.includes('MCS4.signUpFlow(Object.assign'), 'real Supabase Auth signup flow must remain');
assert.ok(html.includes('window.supabase.createClient(url, key)'), 'Supabase client integration must remain');

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
let parsed = 0;
for (let i = 0; i < scripts.length; i++) {
  const attrs = scripts[i][1] || '';
  const body = scripts[i][2] || '';
  if (/\bsrc\s*=/.test(attrs) || !body.trim()) continue;
  new vm.Script(body, { filename: 'inline-script-' + i + '.js' });
  parsed++;
}
assert.ok(parsed >= 5, 'expected the app inline scripts to be syntax-checked');
console.log('PASS: security regression assertions; PASS: ' + parsed + ' inline scripts parsed.');