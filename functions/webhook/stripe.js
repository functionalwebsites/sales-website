import { handleOptions, json } from '../_utils/http.js';
import { sendProTokenEmail } from '../_utils/email.js';
import { verifyStripeSignature } from '../_utils/stripe.js';

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export async function onRequestPost(context) {
  const optionsResponse = handleOptions(context.request);
  if (optionsResponse) return optionsResponse;

  try {
    const signature = context.request.headers.get('Stripe-Signature');
    const payload = await context.request.text();

    const isValid = await verifyStripeSignature(
      payload,
      signature,
      context.env.STRIPE_WEBHOOK_SECRET
    );

    if (!isValid) {
      return json({ error: 'Invalid signature' }, 400);
    }

    const event = JSON.parse(payload);
    if (event.type !== 'checkout.session.completed') {
      return json({ received: true });
    }

    const session = event.data?.object;
    const amount = session?.amount_total;
    const customerEmail = session?.customer_details?.email || session?.customer_email;

    if (amount !== 999) {
      console.log(`Skipping session ${session?.id}: amount_total=${amount}`);
      return json({ received: true, skipped: 'amount_mismatch' });
    }

    if (!customerEmail) {
      return json({ error: 'No customer email on session' }, 400);
    }

    const token = generateToken();
    const tokenData = {
      email: customerEmail,
      stripeSessionId: session.id,
      amount,
      purchasedAt: new Date().toISOString(),
    };

    if (!context.env.TOKENS) {
      return json({ error: 'Missing TOKENS KV binding' }, 500);
    }

    await context.env.TOKENS.put(`token:${token}`, JSON.stringify(tokenData));

    try {
      await sendProTokenEmail(context.env, customerEmail, token);
    } catch (emailError) {
      console.error('Email send failed:', emailError);
    }

    return json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return json({ error: error.message || 'Webhook handler failed' }, 500);
  }
}
