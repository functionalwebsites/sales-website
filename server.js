const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();

// Stripe webhook secret (from Dashboard)
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Cloudflare configuration
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_KV_NAMESPACE = process.env.CLOUDFLARE_KV_NAMESPACE;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Email configuration (SendGrid or SMTP)
const USE_SENDGRID = process.env.SENDGRID_API_KEY;

// Email transporter setup
let emailTransporter;

if (USE_SENDGRID) {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  emailTransporter = {
    sendMail: async (mailOptions) => {
      await sgMail.send(mailOptions);
    }
  };
} else {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  });
}

// ============================================================
// STRIPE WEBHOOK HANDLER
// ============================================================

app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = require('stripe').webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
    return res.sendStatus(400);
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    try {
      const session = event.data.object;

      // Verify it's our Pro tier purchase ($9.99)
      const amount = session.amount_total / 100; // Convert from cents
      if (amount !== 9.99) {
        console.log(`Amount mismatch: ${amount} (expected 9.99), skipping`);
        return res.json({ received: true });
      }

      const customerEmail = session.customer_details?.email || session.customer?.email;
      if (!customerEmail) {
        console.error('No customer email found');
        return res.status(400).json({ error: 'No customer email' });
      }

      // Generate unique token
      const token = crypto.randomBytes(16).toString('hex').toUpperCase();
      console.log(`Generated token for ${customerEmail}: ${token}`);

      // Store in Cloudflare KV
      await storeTokenInKV(token, {
        email: customerEmail,
        stripeSessionId: session.id,
        amount: amount,
        purchasedAt: new Date().toISOString()
      });

      // Send email to customer
      await sendProTokenEmail(customerEmail, token);

      console.log(`✅ Pro token issued to ${customerEmail}`);
      return res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Return 200 for other event types
  return res.json({ received: true });
});

// ============================================================
// STORE TOKEN IN CLOUDFLARE KV
// ============================================================

async function storeTokenInKV(token, data) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE}/values/token:${token}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudflare KV error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ============================================================
// SEND PRO TOKEN EMAIL
// ============================================================

async function sendProTokenEmail(email, token) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Functional Websites Pro Token 🚀',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

        <h2 style="color: #4ade80; margin-bottom: 16px;">🎉 Welcome to Functional Websites Pro!</h2>

        <p style="color: #333; margin-bottom: 20px;">
          Thank you for your purchase! Your Pro tier is now active. To unlock Pro features in the builder, follow these steps:
        </p>

        <div style="background: #f5f5f5; border-left: 4px solid #4ade80; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #333;">Your Pro Token</h3>
          <p style="font-family: monospace; font-size: 14px; background: #fff; padding: 12px; border-radius: 4px; word-break: break-all; color: #000; margin-bottom: 0;">
            <strong>${token}</strong>
          </p>
        </div>

        <h3 style="color: #333; margin-top: 24px;">How to Unlock Pro:</h3>
        <ol style="color: #666; line-height: 1.8;">
          <li>Open the <strong>Functional Websites Builder</strong></li>
          <li>Click the <strong>"🔓 Unlock Pro"</strong> button in the top right</li>
          <li>Paste your token (shown above)</li>
          <li>Click <strong>"Unlock Pro"</strong></li>
          <li>Enjoy unlimited custom blocks, themes, and more! ✨</li>
        </ol>

        <div style="background: #fffaed; border: 1px solid #fcd34d; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <strong style="color: #92400e;">💡 Tip:</strong> Keep your token safe. Anyone with this token can unlock Pro features.
        </div>

        <h3 style="color: #333;">What's Included in Pro?</h3>
        <ul style="color: #666; line-height: 1.8;">
          <li>✅ Custom block packs & imports</li>
          <li>✅ Premium templates library</li>
          <li>✅ Advanced CSS editor</li>
          <li>✅ Custom domain deployment</li>
          <li>✅ Email support</li>
          <li>✅ All future Pro features</li>
        </ul>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">

        <p style="color: #999; font-size: 12px; margin-bottom: 8px;">
          Have questions? Reply to this email or visit our docs at <strong>functionalwebsites.com</strong>
        </p>

        <p style="color: #999; font-size: 12px; margin: 0;">
          <strong>Functional Websites</strong> — Build fast, simple, fully-owned websites
        </p>

      </div>
    `,
    text: `
Welcome to Functional Websites Pro!

Your Pro token: ${token}

To unlock Pro features:
1. Open the Functional Websites Builder
2. Click "🔓 Unlock Pro" in the top right
3. Paste your token
4. Click "Unlock Pro"

What's included:
- Custom block packs
- Premium templates
- Advanced CSS editor
- Custom domain deployment
- Email support

Keep your token safe!

Questions? Reply to this email.

Functional Websites
    `
  };

  try {
    if (USE_SENDGRID) {
      await emailTransporter.sendMail(mailOptions);
    } else {
      await emailTransporter.sendMail(mailOptions);
    }
    console.log(`✅ Email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send email: ${error.message}`);
    // Don't throw - token is already stored, email can be resent manually
  }
}

// ============================================================
// SERVER SETUP
// ============================================================

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Stripe webhook handler listening on port ${PORT}`);
  console.log(`📍 Webhook URL: https://yourserver.com/webhook/stripe`);
});

module.exports = app;
