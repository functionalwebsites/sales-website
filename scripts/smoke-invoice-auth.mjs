import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { onRequest } from '../functions/_middleware.js';
const password = randomUUID(); // Synthetic credentials only; no production secrets.
const auth = (user, pass) => `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
async function request(path, authorization, host = 'functionalwebsites.com', method = 'GET', env = { INVOICE_PASSWORD: password }) {
  let served = false;
  const response = await onRequest({
    env,
    request: new Request(`https://${host}${path}`, { method, headers: authorization ? { Authorization: authorization } : {} }),
    next: async () => { served = true; return new Response('protected content', { headers: { 'Cache-Control': 'public, max-age=3600' } }); }
  });
  return { response, served };
}
for (const host of ['functionalwebsites.com', 'preview.pages.dev', 'build.functionalwebsites.com', 'docs.functionalwebsites.com']) {
  for (const path of ['/tools/invoice', '/tools/invoice/', '/tools/invoice/index.html', '/tools/invoice/app.js', '/tools/invoice/app.css', '/tools/invoice/assets/gear.svg', '/tools/invoice/README.txt', '/tools/%69nvoice/', '/tools//invoice/', '//tools/invoice/', '/tools/invoice/../invoice/app.js', '/invoice/tools/']) {
    const { response, served } = await request(path, null, host);
    assert.equal(response.status, 401, `${host}${path}`);
    assert.equal(served, false);
    assert.match(response.headers.get('WWW-Authenticate'), /^Basic /);
    assert.match(response.headers.get('Cache-Control'), /no-store/);
    assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
    assert.doesNotMatch(await response.text(), /protected content/);
  }
}
for (const bad of ['Basic !!!', 'Bearer anything', auth('admin','incorrect'), auth('other',password)]) {
  assert.equal((await request('/tools/invoice/', bad)).response.status, 401);
}
for (const method of ['GET', 'HEAD', 'POST']) {
  const { response, served } = await request('/tools/invoice/', auth('admin',password), undefined, method);
  assert.equal(response.status,200);
  assert.equal(served,true);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
  assert.equal(response.headers.get('Vary'),'Authorization');
}
for (const env of [{}, { INVOICE_PASSWORD: '' }, { INVOICE_PASSWORD: null }]) {
  const { response, served } = await request('/tools/invoice/', auth('admin',password), undefined, 'GET', env);
  assert.equal(response.status, 503);
  assert.equal(served, false);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
}
const rotated = { INVOICE_PASSWORD: randomUUID() };
assert.equal((await request('/tools/invoice/', auth('admin',password), undefined, 'GET', rotated)).response.status,401);
assert.equal((await request('/tools/invoice/', auth('admin',rotated.INVOICE_PASSWORD), undefined, 'GET', rotated)).response.status,200);
for (const path of ['/', '/tools/contact-form/', '/pay/']) assert.equal((await request(path)).served,true);
for (const host of ['functionalwebsites.com','docs.functionalwebsites.com','preview.pages.dev']) {
  const { response } = await request('/robots.txt',null,host);
  assert.match(await response.text(), /Disallow: \/tools\/invoice/);
}
assert.doesNotMatch(await readFile('sitemap.xml','utf8'), /tools\/invoice/);
assert.match(await readFile('tools/invoice/index.html','utf8'), /noindex,nofollow,noarchive/);
assert.doesNotMatch(await readFile('functions/_utils/invoice-auth.js','utf8'), new RegExp(password));
console.log('PASS invoice authentication, assets, aliases, hosts, invalid credentials, cache/indexing headers, robots, and public route isolation');
