// Produce two independently deployable Cloudflare Pages directories.
// Run: node scripts/package-sites.mjs
import { cp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const out = join(root, 'dist');
const sales = join(out, 'sales');
const funweb = join(out, 'funweb');
await rm(sales, { recursive: true, force: true });
await rm(funweb, { recursive: true, force: true });
await Promise.all([mkdir(sales, { recursive: true }), mkdir(funweb, { recursive: true })]);
async function copy(paths, dest) {
  for (const path of paths) await cp(join(root, path), join(dest, path), { recursive: true });
}
// Keep the old builder and docs available during the browser-storage migration.
await copy(['index.html', 'build', 'blog', 'components', 'copy', 'docs', 'functions', 'get-a-quote', 'hosting', 'huntington-beach-web-design', 'img', 'marketplace', 'pay', 'pricing', 'qr', 'services', 'styles', 'tools', 'stripe-checkout.js', 'sitemap.xml', 'sw.js'], sales);
await mkdir(join(sales, 'build/pricing'), { recursive: true });
await cp(join(root, 'build/pricing/index.html'), join(sales, 'build/pricing/index.html'));
await copy(['build', 'docs', 'marketplace', 'tools', 'qr', 'styles', 'img', 'components', 'stripe-checkout.js', 'sw.js'], funweb);
// Private invoice functionality belongs only to the sales deployment.
await rm(join(funweb, 'tools/invoice'), { recursive: true, force: true });
await mkdir(join(funweb, 'pricing'), { recursive: true });
await cp(join(root, 'build/pricing/index.html'), join(funweb, 'pricing/index.html'));
await cp(join(root, 'funweb/functions'), join(funweb, 'functions'), { recursive: true });
await cp(join(funweb, 'build/index.html'), join(funweb, 'index.html'));
const mapLinks = text => text
  .replaceAll('https://build.functionalwebsites.com', 'https://funweb.dev')
  .replaceAll('https://docs.functionalwebsites.com', 'https://funweb.dev/docs')
  .replaceAll('https://functionalwebsites.com/docs', 'https://funweb.dev/docs')
  .replaceAll('https://functionalwebsites.com/marketplace', 'https://funweb.dev/marketplace')
  .replaceAll('https://functionalwebsites.com/styles/', '/styles/')
  .replaceAll('https://functionalwebsites.com/qr/', 'https://funweb.dev/qr/')
  .replaceAll("window.location.hostname === 'build.functionalwebsites.com'", "['funweb.dev', 'www.funweb.dev'].includes(window.location.hostname) || window.location.hostname.endsWith('.pages.dev')")
  .replaceAll('Functional Websites Site Builder', 'Funweb Site Builder');
async function transform(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await transform(path);
    else if (['.html', '.js', '.css', '.xml'].includes(extname(path))) {
      await writeFile(path, mapLinks(await readFile(path, 'utf8')));
    }
  }
}
await transform(funweb);
// Product pages carry Funweb branding, while service links keep their destination.
for (const folder of ['docs', 'tools', 'marketplace', 'pricing', 'qr']) {
  async function brand(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await brand(path);
      else if (entry.name.endsWith('.html')) {
        let html = await readFile(path, 'utf8');
        html = html.replaceAll('Functional Websites', 'Funweb').replaceAll('functional(Websites)', 'funweb.dev');
        if (folder === 'tools') {
          html = html.replace(/<header class="topbar">[\s\S]*?<\/header>/, '<div id="header-placeholder" style="height:72px"></div>');
          html = html.replace(/<footer>[\s\S]*?<\/footer>/, '<div id="footer-placeholder"></div>');
          html = html.replace('</body>', '<script src="/components/components.js" defer></script></body>');
        }
        await writeFile(path, html);
      }
    }
  }
  await brand(join(funweb, folder));
}

for (const path of ['build/blocks', 'build/templates']) await rm(join(funweb, path), { recursive: true, force: true });
for (const file of ['index.html', 'build/index.html']) {
  const path = join(funweb, file);
  let html = await readFile(path, 'utf8');
  html = html.replace('href="https://funweb.dev/">Open the old builder', 'href="https://build.functionalwebsites.com/">Open the old builder');
  const dashboardHeader = html.match(/<header class="header">[\s\S]*?<\/header>/);
  if (!dashboardHeader) throw new Error('Builder dashboard header not found');
  const controls = dashboardHeader[0].match(/<button[^>]*id="btn-(?:settings|unlock-pro)"[\s\S]*?<\/button>/g);
  if (controls?.length !== 2) throw new Error('Builder account controls not found');
  html = html.replace(dashboardHeader[0], '<div id="header-placeholder" style="height:72px;min-height:72px;flex-shrink:0"></div><div aria-label="Builder account" style="display:flex;justify-content:flex-end;gap:8px;padding:8px 24px;flex-shrink:0">' + controls.join('') + '</div>');
  html = html.replace(/<nav aria-label="Workshop resources"[\s\S]*?<\/nav>/, '');
  html = html.replace('</body>', '<script src="/components/components.js" defer></script></body>');
  await writeFile(path, html);
}

let components = await readFile(join(funweb, 'components/components.js'), 'utf8');
const header = await readFile(join(root, 'funweb/components/header.html'), 'utf8');
const footer = await readFile(join(root, 'funweb/components/footer.html'), 'utf8');
const start = components.indexOf('  const fallbackMarkup = {');
const end = components.indexOf('\n  function renderComponent', start);
if (start < 0 || end < 0) throw new Error('Component structure changed');
components = components.slice(0, start) + `  const fallbackMarkup = ${JSON.stringify({header, footer})};\n` + components.slice(end);
await writeFile(join(funweb, 'components/components.js'), components);
await writeFile(join(funweb, 'components/header.html'), header);
await writeFile(join(funweb, 'components/footer.html'), footer);
await writeFile(join(funweb, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /build/\nSitemap: https://funweb.dev/sitemap.xml\n');
await writeFile(join(funweb, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ['', 'docs/', 'tools/', 'marketplace/', 'pricing/'].map(path => `<url><loc>https://funweb.dev/${path}</loc></url>`).join('') + '</urlset>');
await writeFile(join(funweb, '_routes.json'), JSON.stringify({version: 1, include: ['/api/*', '/webhook/*', '/build/blocks/*', '/build/templates/*', '/site-builder', '/site-builder/*'], exclude: []}));
await writeFile(join(funweb, '_redirects'), '/get-a-quote/* https://functionalwebsites.com/get-a-quote/:splat 302\n/services/* https://functionalwebsites.com/services/:splat 302\n/hosting/* https://functionalwebsites.com/hosting/:splat 302\n/pay/* https://functionalwebsites.com/pay/:splat 302\n');
// Missing files must return 404, not the builder HTML via Pages SPA fallback.
await writeFile(join(funweb, 'wrangler.toml'), 'name = "funweb-builder"\ncompatibility_date = "2024-01-01"\npages_build_output_dir = "."\n');
await writeFile(join(sales, 'wrangler.toml'), (await readFile(join(root, 'wrangler.toml'), 'utf8')).replace('pages_build_output_dir = "dist/sales"', 'pages_build_output_dir = "."'));
await writeFile(join(funweb, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><title>Page not found · Funweb</title><h1>Page not found</h1><p><a href="/">Return to the builder</a></p></html>');
if (process.argv.includes('--cloudflare-funweb')) {
  // Pages requires the output to stay inside its configured build root.
  const cloudflareOutput = join(root, 'funweb/dist');
  await rm(cloudflareOutput, { recursive: true, force: true });
  await cp(funweb, cloudflareOutput, { recursive: true });
}
console.log('Packaged dist/sales and dist/funweb. Neither has been deployed.');
