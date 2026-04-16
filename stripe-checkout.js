/**
 * Stripe Checkout Integration for Functional Websites Pro
 *
 * This script reads Stripe keys from meta tags injected by the server.
 * The server must inject these in the <head>:
 *   <meta name="stripe-publishable-key" content="pk_live_...">
 *   <meta name="stripe-price-id" content="price_...">
 *
 * Stripe keys are NOT hardcoded here — they come from environment at build time.
 */

// Get Stripe configuration from meta tags (injected by server)
const getStripeConfig = () => {
  const pubKeyMeta = document.querySelector('meta[name="stripe-publishable-key"]');
  const priceIdMeta = document.querySelector('meta[name="stripe-price-id"]');

  if (!pubKeyMeta?.getAttribute('content')) {
    console.error('Stripe publishable key not found in meta tags. Check server configuration.');
  }
  if (!priceIdMeta?.getAttribute('content')) {
    console.error('Stripe price ID not found in meta tags. Check server configuration.');
  }

  return {
    publishableKey: pubKeyMeta?.getAttribute('content') || '',
    priceId: priceIdMeta?.getAttribute('content') || ''
  };
};

const stripeConfig = getStripeConfig();
const STRIPE_PUBLISHABLE_KEY = stripeConfig.publishableKey;
const PRO_PRICE_ID = stripeConfig.priceId;

// Initialize Stripe
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

/**
 * Start Stripe Checkout
 * Call this when "Buy Pro" button is clicked
 */
async function startStripeCheckout() {
  try {
    // Show loading state
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Loading...';
    btn.disabled = true;

    // Create checkout session on your backend
    const response = await fetch('https://sales-website-jwhj545xu-cooper-carrascos-projects.vercel.app/webhook/stripe/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId: PRO_PRICE_ID,
        successUrl: window.location.origin + '/pricing?success=true',
        cancelUrl: window.location.origin + '/pricing?canceled=true',
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { sessionId } = await response.json();

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
      console.error('Stripe error:', error);
      alert('Error: ' + error.message);
    }

    // Restore button if checkout was canceled
    btn.textContent = originalText;
    btn.disabled = false;

  } catch (error) {
    console.error('Checkout error:', error);
    alert('Error starting checkout. Please try again.');
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// Check for checkout success/cancel on page load
document.addEventListener('DOMContentLoaded', function() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('success') === 'true') {
    alert('Success! Check your email for your Pro token.');
    // Optionally redirect to builder
    // window.location.href = '/builder';
  }

  if (params.get('canceled') === 'true') {
    alert('Checkout was canceled.');
  }
});
