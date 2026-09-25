// Run with: node scripts/smoke-marketplace.mjs
// Exercises real pack data and renderer / download code without live tokens or emails.
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';
import { onRequest as download } from '../functions/api/marketplace/download.js';
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const storage = new Map();
const localStorage = { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,String(v)), removeItem: k => storage.delete(k) };
const context = vm.createContext({ console, URL, URLSearchParams, localStorage, location: { origin: 'https://audit.test' } });
context.window = context;
for (const file of ['core', 'renderers', 'props-panel']) vm.runInContext(await read(`build/js/${file}.js`), context, { filename: file });
const blocks = await Promise.all(['testimonial-wall', 'youtube-embed'].map(async name => JSON.parse(await read(`build/blocks/${name}-block.json`))));
const templatePack = JSON.parse(await read('build/templates/plumber-website-template.json'));
const template = templatePack.pageTemplates[0];
for (const pack of [...blocks, templatePack]) {
  assert.equal(pack.format, 'functional-websites-library');
  const library = context.normalizeLibraryData(pack);
  assert.equal(library.blocks.length + library.pageTemplates.length, 1);
  context.mergeLibraryData(pack);
  context.mergeLibraryData(pack);
}
assert.equal(context.getLibraryData().blocks.length, 2);
assert.equal(context.getLibraryData().pageTemplates.length, 1);
const originalTemplate = JSON.stringify(template);
const project = context.applyLibraryProjectTemplate(context.createBlankProjectData('Northside Plumbing'), template);
assert.equal(project.brand.accent, template.projectData.brand.accent);
assert.equal(project.brand.pageBg, template.projectData.brand.pageBg);
assert.equal(project.navbars.main.brand, 'Northside Plumbing');
assert.equal(project.pages.length, 4);
for (let i = 0; i < project.pages.length; i++) {
  const html = context.compilePageHTML(project, i);
  const body = html.split('<body')[1].split('<script>')[0];
  assert.doesNotMatch(body, /RapidFlow|high-intent|60 min|1,200\+|service@rapidflowplumbing/);
  assert.doesNotMatch(html, /\[Unknown block:/);
}
assert.equal(JSON.stringify(template), originalTemplate, 'Creating a project must not mutate its library template');
const customized = context.applyLibraryProjectTemplate(context.createBlankProjectData('Custom'), template, { accent: '#aabbcc' });
assert.equal(customized.brand.accent, '#aabbcc');
assert.equal(customized.pages[0].blocks.find(b => b.type === 'hero').props.bgColor, '#aabbcc');
assert.equal(customized.brand.textMuted, template.projectData.brand.textMuted);
console.log('PASS packs normalize, deduplicate, compile, rebrand, and preserve / override palette');

const opts = { siteSectionPadding: '40px 20px', siteContentGap: '12px', siteButtonRadius: '6px', siteHeadingFont: 'sans-serif' };
const form = project.pages.find(p => p.slug === 'contact').blocks.find(b => b.type === 'form');
function simulateForm(props) {
  const html = context.renderMailtoFormBlock(form, '', props, opts);
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  let submit;
  const node = { style: {}, elements: { name: {value:'Alex'}, email: {value:'alex@example.test'}, message: {value:'Test request'} }, addEventListener: (_,fn) => { submit = fn; } };
  const thanks = { style: {display:'none'} };
  const window = { location: {href:''} };
  vm.runInNewContext(script, { document: { getElementById: id => id.endsWith('-thanks') ? thanks : node }, window });
  submit({preventDefault(){}});
  return { html, destination:window.location.href, thanks, node };
}
for (const recipient of ['', '#', 'bad-address', 'https://example.test', 'a@example.test?bcc=other@example.test']) {
  const result = simulateForm({...form.props, action:recipient, mailtoEmail:''});
  assert.match(result.html, /disabled aria-disabled="true"/);
  assert.equal(result.destination, '');
  assert.equal(result.thanks.style.display, 'none');
}
const valid = simulateForm({...form.props, mailtoEmail:' service@example.test '});
assert.match(valid.destination, /^mailto:service@example\.test\?subject=/);
assert.match(decodeURIComponent(valid.destination), /Full Name: Alex\nEmail Address: alex@example.test/);
assert.equal(valid.thanks.style.display, 'block');
assert.doesNotMatch(valid.html, /disabled aria-disabled/);
console.log('PASS unconfigured forms cannot navigate or show success; configured forms create valid email drafts');

const id = 'abcdefghijk';
for (const input of [id, `https://youtu.be/${id}`, `https://www.youtube.com/watch?v=${id}&t=10`, `https://youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`, `https://www.youtube-nocookie.com/embed/${id}`, `www.youtube.com/watch?v=${id}`]) {
  assert.equal(context.toYouTubeEmbedUrl(input), `https://www.youtube-nocookie.com/embed/${id}`);
}
for (const input of ['', 'not a video', 'https://example.com/watch?v=abcdefghijk', 'https://youtu.be.evil.test/abcdefghijk', 'https://youtube.com/watch?v=short']) assert.equal(context.toYouTubeEmbedUrl(input), '');
assert.equal(context.toYouTubeEmbedUrl(id, false, true, false), `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0`);
const video = blocks[1].blocks[0].block;
assert.equal(video.props.videoUrl, '');
assert.doesNotMatch(context.renderBlock(video, false, project), /<iframe/);
assert.match(context.renderBlock({...video, props:{...video.props, videoUrl:id}}, false, project), /<iframe/);
const review = structuredClone(blocks[0].blocks[0].block);
review.props.showStars = false;
review.props.highlightFirst = true;
review.props.columns = '2';
review.props.testimonials[0].quote = 'Edited review';
const reviewHtml = context.renderBlock(review, false, project);
assert.match(reviewHtml, /Edited review/);
assert.match(reviewHtml, /repeat\(2,minmax/);
assert.doesNotMatch(reviewHtml, /★/);
console.log('PASS video validation / empty state and testimonial editing options');

const token = 'audit-only-not-a-real-pro-token';
const env = {
  TOKENS: {get: async key => key === `token:${token}` ? 'mock-record' : null},
  ASSETS: {fetch: async req => new Response(await read(new URL(req.url).pathname.slice(1)))}
};
async function request(body) {
  return download({request:new Request('https://audit.test/api/marketplace/download',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),env});
}
for (const itemId of ['testimonial-wall', 'youtube-embed', 'plumber-template']) {
  assert.equal((await request({itemId,token:'invalid-token-that-is-long'})).status,401);
  const res = await request({itemId,token});
  assert.equal(res.status,200);
  assert.match(res.headers.get('content-disposition'),/attachment/);
  assert.equal((await res.json()).format,'functional-websites-library');
}
console.log('PASS authorized pack downloads and invalid-token rejection (mock credentials)');

const marketplace = await read('marketplace/index.html');
const script = marketplace.match(/<script>\s*(const PRO_TOKEN_KEY[\s\S]*?)<\/script>/)[1];
const elements = new Map();
let downloads = 0;
const node = () => ({style:{},textContent:'',className:'',innerHTML:'',addEventListener(){},appendChild(){},removeChild(){},click(){downloads++;}});
const document = {getElementById:id => {if(!elements.has(id)) elements.set(id,node());return elements.get(id);},querySelectorAll:()=>[],createElement:node,body:node()};
storage.clear();
const market = vm.createContext({document, localStorage, console, URL, setTimeout:fn=>fn(), prompt:()=>null, fetch:async(_,options)=>request(JSON.parse(options.body))});
vm.runInContext(script,market);
assert.equal(vm.runInContext('marketplaceData.items.length',market),3);
for(const preview of vm.runInContext('marketplaceData.items.map(i=>i.preview)',market)) await access(new URL(preview.slice(1),root));
await market.handleItemClick('testimonial-wall');
assert.equal(elements.get('marketplace-status').textContent,'Download canceled.');
assert.equal(downloads,0);
storage.set('fw_pro_token',token);
vm.runInContext('proValidated = true',market);
await market.handleItemClick('testimonial-wall');
assert.equal(downloads,1);
assert.match(elements.get('marketplace-status').textContent,/download started/);
storage.set('fw_pro_token','invalid-token-that-is-long');
await market.handleItemClick('testimonial-wall');
assert.equal(downloads,1);
assert.match(elements.get('marketplace-status').textContent,/Download failed/);
assert.equal(vm.runInContext('proValidated',market),false);
console.log('PASS catalog / preview assets, cancellation, successful download, and expired-token feedback');
