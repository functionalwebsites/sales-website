// Run: node scripts/smoke-huntington-beach.mjs
// No live services, submissions, or credentials required.
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { onRequest } from '../functions/_middleware.js';
const root = new URL('../', import.meta.url);
const route = '/huntington-beach-web-design/';
const canonical = `https://functionalwebsites.com${route}`;
const read = name => readFile(new URL(name, root), 'utf8');
const html = await read(`${route.slice(1)}index.html`);
assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
assert.match(html, /<title>Huntington Beach Web Design \| Functional Websites<\/title>/);
assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
assert.doesNotMatch(html, /noindex|nofollow/i);
const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(schema['@graph'].find(n => n['@type'] === 'WebPage').url, canonical);
const service = schema['@graph'].find(n => n['@type'] === 'Service');
assert.equal(service.areaServed.name, 'Huntington Beach');
assert.ok(schema['@graph'].some(n => n['@id'] === service.provider['@id']));
for (const match of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)) {
  const path = new URL(match[1], canonical).pathname;
  await access(new URL(`.${path}`, root));
}
for (const file of ['index.html', 'services/index.html']) {
  assert.ok((await read(file)).includes(`href="${route}"`), `${file} should link to the local page`);
}
assert.ok((await read('sitemap.xml')).includes(`<loc>${canonical}</loc>`));
const response = await onRequest({request: new Request('https://functionalwebsites.com/robots.txt')});
assert.match(await response.text(), /Allow: \/\nSitemap: https:\/\/functionalwebsites.com\/sitemap.xml/);
let reachedPage = false;
await onRequest({request: new Request(canonical), next: () => {reachedPage = true; return new Response('page');}});
assert.ok(reachedPage, 'Marketing host must serve the local page without redirecting it');
const png = await readFile(new URL('img/surf-city-pier.png', root));
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
console.log('PASS local-page metadata, schema links, assets, discovery links, sitemap, crawl rules, route, and sharing-image dimensions');
