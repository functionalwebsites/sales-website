import { handleOptions, json } from '../../_utils/http.js';
import { createCustomPaymentSession } from '../../_utils/stripe.js';

const MIN_PAYMENT_CENTS = 100;
const MAX_PAYMENT_CENTS = 5000000;

function parseAmountToCents(value) {
  const normalized = String(value || '').replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [dollars, cents = ''] = normalized.split('.');
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? amount : null;
}

function cleanText(value, maxLength = 160) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanEmail(value) {
  const email = cleanText(value, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function isSameOrigin(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

export async function onRequestPost(context) {
  const optionsResponse = handleOptions(context.request);
  if (optionsResponse) return optionsResponse;

  try {
    if (!context.env.STRIPE_SECRET_KEY) {
      return json({ error: 'Missing STRIPE_SECRET_KEY' }, 500);
    }

    const body = await context.request.json();
    const requestOrigin = new URL(context.request.url).origin;
    const amount = parseAmountToCents(body.amount);
    const successUrl = cleanText(body.successUrl, 500);
    const cancelUrl = cleanText(body.cancelUrl, 500);

    if (!amount || amount < MIN_PAYMENT_CENTS || amount > MAX_PAYMENT_CENTS) {
      return json({ error: 'Enter an amount from $1 to $50,000.' }, 400);
    }

    if (!isSameOrigin(successUrl, requestOrigin) || !isSameOrigin(cancelUrl, requestOrigin)) {
      return json({ error: 'Invalid checkout return URL.' }, 400);
    }

    const session = await createCustomPaymentSession(context.env.STRIPE_SECRET_KEY, {
      amount,
      currency: 'usd',
      description: cleanText(body.description, 160) || 'Website services payment',
      payerName: cleanText(body.payerName, 80),
      customerEmail: cleanEmail(body.customerEmail),
      note: cleanText(body.note, 250),
      successUrl,
      cancelUrl,
    });

    return json({ sessionId: session.id, checkoutUrl: session.url });
  } catch (error) {
    console.error('Payment session error:', error);
    return json({ error: error.message || 'Failed to create payment session' }, 500);
  }
}
