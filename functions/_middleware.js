const BUILDER_HOST = 'build.functionalwebsites.com';
const DOCS_HOST = 'docs.functionalwebsites.com';
const DOCS_ROUTES = new Set([
  'cloudflare',
  'clone-static',
  'custom-blocks',
  'custom-templates',
  'export-selfhost',
  'getting-started',
  'github'
]);
const PRO_MARKETPLACE_ASSET_PATHS = new Set([
  '/build/blocks/testimonial-wall-block.json',
  '/build/blocks/youtube-embed-block.json',
  '/build/templates/plumber-website-template.json'
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (PRO_MARKETPLACE_ASSET_PATHS.has(url.pathname)) {
    return new Response('Not found', { status: 404 });
  }

  if (url.pathname === '/robots.txt') {
    const body = robotsForHost(url.hostname);
    return new Response(body, {
      headers: {
        'content-type': 'text/plain; charset=UTF-8',
        'cache-control': 'public, max-age=3600'
      }
    });
  }

  if (url.pathname === '/site-builder' || url.pathname.startsWith('/site-builder/')) {
    url.pathname = url.pathname.replace(/^\/site-builder/, '/build');
    return Response.redirect(url.toString(), 308);
  }

  if (url.hostname === BUILDER_HOST && (url.pathname === '/' || url.pathname === '/index.html')) {
    const builderUrl = new URL('/build/', url);
    return context.env.ASSETS.fetch(new Request(builderUrl, context.request));
  }

  if (url.hostname === DOCS_HOST) {
    if (url.pathname === '/sitemap.xml') {
      const sitemapUrl = new URL('/docs/sitemap.xml', url);
      return context.env.ASSETS.fetch(new Request(sitemapUrl, context.request));
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      const docsUrl = new URL('/docs/', url);
      return context.env.ASSETS.fetch(new Request(docsUrl, context.request));
    }

    const firstSegment = url.pathname.split('/').filter(Boolean)[0];
    if (DOCS_ROUTES.has(firstSegment)) {
      const docsUrl = new URL(`/docs${url.pathname}`, url);
      return context.env.ASSETS.fetch(new Request(docsUrl, context.request));
    }
  }

  return context.next();
}

function robotsForHost(hostname) {
  if (hostname === BUILDER_HOST) {
    return [
      'User-agent: *',
      'Disallow: /'
    ].join('\n') + '\n';
  }

  if (hostname === DOCS_HOST) {
    return [
      'User-agent: *',
      'Allow: /',
      'Sitemap: https://docs.functionalwebsites.com/sitemap.xml'
    ].join('\n') + '\n';
  }

  return [
    'User-agent: *',
    'Allow: /',
    'Sitemap: https://functionalwebsites.com/sitemap.xml'
  ].join('\n') + '\n';
}
