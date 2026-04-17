import { handleOptions, json } from '../_utils/http.js';
import { sendProTokenEmail } from '../_utils/email.js';

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export async function onRequestPost(context) {
  const optionsResponse = handleOptions(context.request);
  if (optionsResponse) return optionsResponse;

  try {
    const body = await context.request.json();
    const { email, code } = body;

    if (!email || !code) {
      return json({ error: 'Email and code are required' }, 400);
    }

    // Validate the special code against the FREE_PLAN secret
    if (code !== context.env.FREE_PLAN) {
      return json({ error: 'Invalid promo code' }, 400);
    }

    // Generate a unique token
    const token = generateToken();
    const tokenData = {
      email,
      stripeSessionId: null, // No session for free plan
      amount: 0, // Free
      purchasedAt: new Date().toISOString(),
    };

    // Store in KV (same as paid plan)
    if (!context.env.TOKENS) {
      return json({ error: 'Missing TOKENS KV binding' }, 500);
    }
    await context.env.TOKENS.put(`token:${token}`, JSON.stringify(tokenData));

    // Send email with token
    try {
      await sendProTokenEmail(context.env, email, token);
    } catch (emailError) {
      console.error('Email send failed:', emailError);
      // Don't fail the request if email fails, but log it
    }

    return json({ success: true, token });
  } catch (error) {
    console.error('Free plan error:', error);
    return json({ error: error.message || 'Failed to process promo code' }, 500);
  }
}