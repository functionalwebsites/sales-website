const encoder = new TextEncoder();

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createCheckoutSession(secretKey, { priceId, successUrl, cancelUrl }) {
  const body = new URLSearchParams({
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to create Stripe Checkout session');
  }

  return data;
}

export async function createCustomPaymentSession(secretKey, {
  amount,
  currency = 'usd',
  description,
  customerEmail,
  payerName,
  note,
  successUrl,
  cancelUrl,
}) {
  const paymentDescription = description || 'Functional Websites payment';
  const body = new URLSearchParams({
    mode: 'payment',
    submit_type: 'pay',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': currency,
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][price_data][product_data][name]': 'Functional Websites Payment',
    'line_items[0][price_data][product_data][description]': paymentDescription,
    'payment_intent_data[description]': paymentDescription,
    'payment_intent_data[metadata][source]': 'pay_page',
  });

  if (payerName) {
    body.set('payment_intent_data[metadata][payer_name]', payerName);
  }
  if (note) {
    body.set('payment_intent_data[metadata][note]', note);
  }
  if (customerEmail) {
    body.set('customer_email', customerEmail);
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to create Stripe Checkout session');
  }

  return data;
}

export async function verifyStripeSignature(payload, signatureHeader, webhookSecret) {
  if (!signatureHeader || !webhookSecret) return false;

  const parts = Object.fromEntries(
    signatureHeader
      .split(',')
      .map((part) => part.split('='))
      .filter(([key, value]) => key && value)
  );

  const timestamp = parts.t;
  const expectedSignature = parts.v1;

  if (!timestamp || !expectedSignature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(signedPayload));
  const computed = bytesToHex(new Uint8Array(signature));

  return safeEqual(computed, expectedSignature);
}
