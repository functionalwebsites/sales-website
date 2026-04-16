export function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature, x-pro-token',
    ...extra,
  };
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      'Content-Type': 'application/json',
      ...extraHeaders,
    }),
  });
}

export function handleOptions(request) {
  if (request.method === 'OPTIONS') {
    return new Response('OK', { headers: corsHeaders() });
  }
  return null;
}
