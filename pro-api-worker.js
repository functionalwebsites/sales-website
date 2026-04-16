/**
 * Functional Websites Pro Token Validation API
 * Deploy as a Cloudflare Worker to validate Pro tokens
 *
 * KV Namespace: functional-websites-pro-tokens
 * Environment Variable: TOKENS (bound to the KV namespace)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-pro-token',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response('OK', { headers: corsHeaders });
    }

    // POST /api/validate-token - Validate a pro token
    if (url.pathname === '/api/validate-token' && request.method === 'POST') {
      try {
        const body = await request.json();
        const token = body.token?.trim();

        if (!token || token.length < 20) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Invalid token format' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Check if token exists in KV
        const kvKey = `token:${token}`;
        const tokenData = await env.TOKENS.get(kvKey);

        if (tokenData) {
          // Token is valid
          return new Response(
            JSON.stringify({
              valid: true,
              token: token,
              timestamp: new Date().toISOString(),
            }),
            { status: 200, headers: corsHeaders }
          );
        } else {
          // Token not found
          return new Response(
            JSON.stringify({ valid: false, error: 'Token not found' }),
            { status: 404, headers: corsHeaders }
          );
        }
      } catch (error) {
        console.error('Validation error:', error);
        return new Response(
          JSON.stringify({ valid: false, error: 'Server error' }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // GET /api/health - Health check
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        { status: 200, headers: corsHeaders }
      );
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: corsHeaders }
    );
  },
};
