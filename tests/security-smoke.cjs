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


assert.ok(html.includes('Payment unavailable — preview only'), 'preview checkout must not present an active pay button');
assert.ok(html.includes('Payments are not connected yet. No charge was made and no purchase was completed.'), 'pay confirmation must fail closed until verified payments exist');
assert.ok(!html.includes('completeSale('), 'client-side sale fulfillment must not exist');
assert.ok(html.includes('UI.pay={kind:"tip",postId:p.id,cents:cents,method:"card"}'), 'tips must enter the checkout sheet');
assert.ok(html.includes('else if(pay.kind==="tip")'), 'tip checkout must render a line item');
const approval = html.slice(html.indexOf('function applyPurchaseApproval'), html.indexOf('function readFileAsDataURL'));
assert.ok(!approval.includes('child.tier=') && !approval.includes('DB.avatarPurchases.push') && !approval.includes('DB.spotlights.push'), 'guardian approval must not grant paid entitlements');
assert.ok(html.includes('status==="approved"&&r.label===label'), 'approved requests must still return to checkout');
assert.ok(html.includes('l.payment_status="external_unverified"'), 'off-platform mark-sold must not create in-app seller credit');
assert.ok(!html.includes('status:"Connected during launch setup"') && !html.includes('App money goes straight to your PayPal'), 'owner payout must not be falsely marked connected');
assert.ok(html.includes('Platform payouts are in preview mode'), 'owner payout card must disclose preview state');
assert.ok(html.includes('Record preview payout'), 'seller payout action must be labeled as a simulation');
assert.ok(html.includes('Payout onboarding is not available in preview. No account details were saved.'), 'preview must not collect payout credentials');

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
