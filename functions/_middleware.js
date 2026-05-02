const BUILDER_HOST = 'build.functionalwebsites.com';
const DOCS_HOST = 'docs.functionalwebsites.com';
const DOCS_ROUTES = new Set([
  'cloudflare',
  'custom-blocks',
  'custom-templates',
  'export-selfhost',
  'getting-started',
  'github'
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === BUILDER_HOST && (url.pathname === '/' || url.pathname === '/index.html')) {
    const builderUrl = new URL('/site-builder/', url);
    return context.env.ASSETS.fetch(new Request(builderUrl, context.request));
  }

  if (url.hostname === DOCS_HOST) {
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
