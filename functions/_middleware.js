const BUILDER_HOST = 'build.functionalwebsites.com';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const isBuilderEntry = url.pathname === '/site-builder'
    || url.pathname === '/site-builder/'
    || url.pathname === '/site-builder/index.html';

  if (url.hostname === BUILDER_HOST && (url.pathname === '/' || url.pathname === '/index.html')) {
    const builderUrl = new URL('/site-builder/index.html', url);
    return context.env.ASSETS.fetch(new Request(builderUrl, context.request));
  }

  if (isBuilderEntry) {
    const builderUrl = new URL('/site-builder/index.html', url);
    return context.env.ASSETS.fetch(new Request(builderUrl, context.request));
  }

  return context.next();
}
