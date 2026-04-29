const BUILDER_HOST = 'build.functionalwebsites.com';

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === BUILDER_HOST && (url.pathname === '/' || url.pathname === '/index.html')) {
    const builderUrl = new URL('/site-builder/', url);
    return context.env.ASSETS.fetch(new Request(builderUrl, context.request));
  }

  return context.next();
}
