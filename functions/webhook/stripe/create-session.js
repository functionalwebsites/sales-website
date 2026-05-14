import { handleOptions, json } from '../../_utils/http.js';
import { createCheckoutSession } from '../../_utils/stripe.js';

const DEFAULT_PRO_PRICE_ID = 'price_1TMd9XQtO2WgU350cTZRFc4y';

export async function onRequestPost(context) {
  const optionsResponse = handleOptions(context.request);
  if (optionsResponse) return optionsResponse;

  try {
    const body = await context.request.json();
    const { successUrl, cancelUrl } = body;

    if (!context.env.STRIPE_SECRET_KEY) {
      return json({ error: 'Missing STRIPE_SECRET_KEY' }, 500);
    }

    if (!successUrl || !cancelUrl) {
      return json({ error: 'Missing required checkout parameters' }, 400);
    }

    const session = await createCheckoutSession(context.env.STRIPE_SECRET_KEY, {
      priceId: context.env.STRIPE_PRO_PRICE_ID || DEFAULT_PRO_PRICE_ID,
      successUrl,
      cancelUrl,
    });

    return json({ sessionId: session.id, checkoutUrl: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return json({ error: error.message || 'Failed to create checkout session' }, 500);
  }
}
