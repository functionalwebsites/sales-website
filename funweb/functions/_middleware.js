// Billing remains with Functional Websites during the domain migration.
// Only these existing public endpoints may be forwarded; this is not an open proxy.
const BACKEND_PATHS = new Set([
  '/api/validate-token', '/api/free-plan', '/api/marketplace/download',
  '/webhook/stripe/create-session'
]);
const PRIVATE_ASSETS = new Set([
  '/build/blocks/testimonial-wall-block.json',
  '/build/blocks/youtube-embed-block.json',
  '/build/templates/plumber-website-template.json'
]);
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (BACKEND_PATHS.has(url.pathname)) {
    const upstream = new URL(url.pathname, 'https://functionalwebsites.com');
    upstream.search = url.search;
    const response = await fetch(new Request(upstream, context.request), { redirect: 'manual' });
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers });
  }
  if (PRIVATE_ASSETS.has(url.pathname)) return new Response('Not found', { status: 404 });
  if (url.pathname === '/site-builder' || url.pathname.startsWith('/site-builder/')) {
    return Response.redirect(new URL('/' + url.search, url), 302);
  }
  return context.next();
}
