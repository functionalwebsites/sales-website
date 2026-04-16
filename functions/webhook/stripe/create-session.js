import { handleOptions, json } from '../../_utils/http.js';
import { createCheckoutSession } from '../../_utils/stripe.js';

export async function onRequestPost(context) {
  const optionsResponse = handleOptions(context.request);
  if (optionsResponse) return optionsResponse;

  try {
    const body = await context.request.json();
    const { priceId, successUrl, cancelUrl } = body;

    if (!context.env.STRIPE_SECRET_KEY) {
      return json({ error: 'Missing STRIPE_SECRET_KEY' }, 500);
    }

    if (!priceId || !successUrl || !cancelUrl) {
      return json({ error: 'Missing required checkout parameters' }, 400);
    }

    const session = await createCheckoutSession(context.env.STRIPE_SECRET_KEY, {
      priceId,
      successUrl,
      cancelUrl,
    });

    return json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    return json({ error: error.message || 'Failed to create checkout session' }, 500);
  }
}
