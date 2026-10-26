// Server-only verifier. Never include this module in client bundles.
// HTTP Basic authentication uses the browser's native login prompt over HTTPS.
export function isInvoicePath(pathname) {
  // Normalize encoded and repeated separators before testing the protected tree.
  let path;
  try { path = decodeURIComponent(pathname).replace(/\\/g, '/').replace(/\/+/g, '/'); }
  catch { return true; } // Fail closed for malformed paths.
  path = new URL('https://local.invalid' + path).pathname;
  return /^\/(?:tools\/invoice|invoice\/tools)(?:\/|$)/i.test(path);
}

export async function protectInvoice(context) {
  const headers = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Authorization'
  };
  const url = new URL(context.request.url);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    url.protocol = 'https:';
    return new Response(null, { status: 308, headers: { ...headers, Location: url.href } });
  }
  const password = context.env?.INVOICE_PASSWORD;
  if (typeof password !== 'string' || password.length === 0) {
    return new Response('Invoice tool unavailable.', {
      status: 503,
      headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
  let valid = false;
  const authorization = context.request.headers.get('Authorization') || '';
  const match = /^Basic ([A-Za-z0-9+/=]+)$/i.exec(authorization);
  if (match && match[1].length <= 2048) {
    try {
      const decoded = atob(match[1]);
      const colon = decoded.indexOf(':');
      if (colon >= 0 && decoded.slice(0, colon) === 'admin') {
        // Compare fixed-length digests without early exit. Neither digest is stored.
        const encode = value => new TextEncoder().encode(value);
        const [providedHash, configuredHash] = await Promise.all([
          crypto.subtle.digest('SHA-256', encode(decoded.slice(colon + 1))),
          crypto.subtle.digest('SHA-256', encode(password))
        ]);
        const derived = new Uint8Array(providedHash);
        const expected = new Uint8Array(configuredHash);
        let difference = 0;
        for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ derived[i];
        valid = difference === 0;
      }
    } catch { /* Malformed credentials are unauthorized. */ }
  }
  if (!valid) {
    return new Response('Authentication required.', {
      status: 401,
      headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'WWW-Authenticate': 'Basic realm="Invoice tool", charset="UTF-8"' }
    });
  }
  const upstream = await context.next();
  const response = new Response(upstream.body, upstream);
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}
