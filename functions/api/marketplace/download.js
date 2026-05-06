import { handleOptions, json } from '../../_utils/http.js';

const MARKETPLACE_FILES = {
  'testimonial-wall': {
    path: '/build/blocks/testimonial-wall-block.json',
    filename: 'testimonial-wall-block.json',
  },
  'youtube-embed': {
    path: '/build/blocks/youtube-embed-block.json',
    filename: 'youtube-embed-block.json',
  },
  'plumber-template': {
    path: '/build/templates/plumber-website-template.json',
    filename: 'plumber-website-template.json',
  },
};

export async function onRequest(context) {
  const optionsResponse = handleOptions(context.request);
  if (optionsResponse) return optionsResponse;

  if (context.request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await context.request.json();
    const itemId = body.itemId?.trim();
    const token = body.token?.trim();
    const item = MARKETPLACE_FILES[itemId];

    if (!item) {
      return json({ error: 'Marketplace item not found' }, 404);
    }

    if (!token || token.length < 20) {
      return json({ error: 'Valid Pro token required' }, 401);
    }

    const tokenData = await context.env.TOKENS?.get(`token:${token}`);
    if (!tokenData) {
      return json({ error: 'Valid Pro token required' }, 401);
    }

    if (!context.env.ASSETS) {
      return json({ error: 'Missing ASSETS binding' }, 500);
    }

    const assetUrl = new URL(item.path, context.request.url);
    const assetResponse = await context.env.ASSETS.fetch(new Request(assetUrl, { method: 'GET' }));

    if (!assetResponse.ok) {
      return json({ error: 'Marketplace file is not available' }, 404);
    }

    return new Response(assetResponse.body, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'content-disposition': `attachment; filename="${item.filename}"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Marketplace download error:', error);
    return json({ error: error.message || 'Download failed' }, 500);
  }
}
