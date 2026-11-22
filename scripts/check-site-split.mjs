import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { onRequest } from '../funweb/functions/_middleware.js';
import { onRequest as salesRoute } from '../functions/_middleware.js';
const context = url => ({request: new Request(url), env: {ASSETS: {fetch: req => new Response(new URL(req.url).pathname)}}, next: () => new Response('next')});
assert.equal(await (await salesRoute(context('https://build.functionalwebsites.com/'))).text(), '/build/');
assert.equal(await (await salesRoute(context('https://build.functionalwebsites.com/pricing/'))).text(), '/build/pricing/');
assert.equal(await (await salesRoute(context('https://functionalwebsites.com/pricing/'))).text(), 'next');
assert.equal((await onRequest(context('https://funweb.dev/build/templates/plumber-website-template.json'))).status, 404);
assert.equal(await (await onRequest(context('https://funweb.dev/api/arbitrary'))).text(), 'next');
const originalFetch = globalThis.fetch;
let upstream;
globalThis.fetch = async req => { upstream = req; return new Response('{"valid":false}', {status: 404}); };
try {
  const ctx = context('https://funweb.dev/api/validate-token');
  ctx.request = new Request(ctx.request, {method: 'POST', body: '{"token":"example"}', headers: {'Content-Type':'application/json'}});
  const result = await onRequest(ctx);
  assert.equal(upstream.url, 'https://functionalwebsites.com/api/validate-token');
  assert.equal(upstream.method, 'POST');
  assert.equal(await upstream.text(), '{"token":"example"}');
  assert.equal(result.status, 404);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
} finally { globalThis.fetch = originalFetch; }
for (const site of ['sales', 'funweb']) {
  const html = await readFile(`dist/${site}/index.html`, 'utf8');
  for (const [, path] of html.matchAll(/(?:src|href)="(\/(?:build|styles|img)\/[^"?#]+)"/g)) {
    if (path.endsWith('/')) continue;
    await access(`dist/${site}${path}`);
  }
}
const salesHome = await readFile('dist/sales/index.html', 'utf8');
assert.doesNotMatch(salesHome, /<h2[^>]*>DIY Site Builder/);
const salesPricing = await readFile('dist/sales/pricing/index.html', 'utf8');
assert.doesNotMatch(salesPricing, /onclick="startStripeCheckout/);
const builder = await readFile('dist/funweb/index.html', 'utf8');
assert.match(builder, /https:\/\/build.functionalwebsites.com\/">Open the old builder/);
assert.match(builder, /'funweb.dev', 'www.funweb.dev'/);
assert.match(await readFile('dist/funweb/pricing/index.html', 'utf8'), /9.99/);
await assert.rejects(access('dist/funweb/tools/invoice/index.html'));
console.log('Site split checks passed: host routes, backend forwarding, assets, pricing, and recovery link.');
