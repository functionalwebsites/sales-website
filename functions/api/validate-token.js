import { handleOptions, json } from '../_utils/http.js';

export async function onRequest(context) {
  const optionsResponse = handleOptions(context.request);
  if (optionsResponse) return optionsResponse;

  if (context.request.method !== 'POST') {
    return json({ valid: false, error: 'Method not allowed' }, 405);
  }

  try {
    const body = await context.request.json();
    const token = body.token?.trim();

    if (!token || token.length < 20) {
      return json({ valid: false, error: 'Invalid token format' }, 400);
    }

    const kvKey = `token:${token}`;
    const tokenData = await context.env.TOKENS?.get(kvKey);

    if (!tokenData) {
      return json({ valid: false, error: 'Token not found' }, 404);
    }

    return json({
      valid: true,
      token,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return json({ valid: false, error: 'Server error' }, 500);
  }
}
