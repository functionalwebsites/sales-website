import { handleOptions, json } from '../_utils/http.js';
import { sendProTokenEmail } from '../_utils/email.js';

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function findExistingTokenByEmail(kv, email) {
  let cursor;

  do {
    const page = await kv.list({ prefix: 'token:', cursor });

    for (const key of page.keys) {
      const raw = await kv.get(key.name);
      if (!raw) continue;

      try {
        const tokenData = JSON.parse(raw);
        if (normalizeEmail(tokenData.email) === email) {
          return key.name.replace(/^token:/, '');
        }
      } catch (error) {
        console.error(`Failed parsing token record ${key.name}:`, error);
      }
    }

    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return null;
}

export async function onRequestPost(context) {
  const optionsResponse = handleOptions(context.request);
  if (optionsResponse) return optionsResponse;

  try {
    const body = await context.request.json();
    const normalizedEmail = normalizeEmail(body?.email);
    const code = body?.code;

    console.log('Free plan request received:', { email: normalizedEmail, code, hasSecret: !!context.env.FREE_PLAN });

    if (!normalizedEmail || !code) {
      console.log('Missing email or code:', { email: normalizedEmail, code });
      return json({ error: 'Email and code are required' }, 400);
    }

    // Validate the special code against the FREE_PLAN secret
    if (!context.env.FREE_PLAN) {
      console.log('FREE_PLAN secret not set!');
      return json({ error: 'Server configuration error: FREE_PLAN secret not set' }, 500);
    }

    if (code.trim() !== (context.env.FREE_PLAN || '').trim()) {
      console.log('Code mismatch:', { received: code, expected: context.env.FREE_PLAN });
      return json({ error: 'Invalid promo code' }, 400);
    }

    // Generate a unique token
    const token = generateToken();
    const tokenData = {
      email: normalizedEmail,
      stripeSessionId: null, // No session for free plan
      amount: 0, // Free
      purchasedAt: new Date().toISOString(),
    };

    // Store in KV (same as paid plan)
    if (!context.env.TOKENS) {
      return json({ error: 'Missing TOKENS KV binding' }, 500);
    }

    const existingToken = await findExistingTokenByEmail(context.env.TOKENS, normalizedEmail);
    if (existingToken) {
      return json({ error: 'A Pro token has already been issued for this email address.' }, 409);
    }

    await context.env.TOKENS.put(`token:${token}`, JSON.stringify(tokenData));

    // Send email with token
    let emailSent = false;
    let emailErrorMessage = null;

    try {
      await sendProTokenEmail(context.env, normalizedEmail, token);
      emailSent = true;
    } catch (emailError) {
      emailErrorMessage = emailError?.message || 'Email send failed';
      console.error('Email send failed:', emailError);
    }

    return json({ success: true, token, emailSent, emailError: emailErrorMessage });
  } catch (error) {
    console.error('Free plan error:', error);
    return json({ error: error.message || 'Failed to process promo code' }, 500);
  }
}
