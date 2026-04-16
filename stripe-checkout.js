/**
 * Stripe Checkout Integration for Functional Websites Pro
 *
 * This script reads Stripe keys from meta tags in the page <head>:
 *   <meta name="stripe-publishable-key" content="pk_live_...">
 *   <meta name="stripe-price-id" content="price_...">
 *
 * The checkout session is created by a same-origin Cloudflare Pages Function.
 */

let stripe;
let STRIPE_PUBLISHABLE_KEY;
let PRO_PRICE_ID;

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  const config = getStripeConfig();
  STRIPE_PUBLISHABLE_KEY = config.publishableKey;
  PRO_PRICE_ID = config.priceId;
  
  // Only initialize Stripe if we have a key
  if (STRIPE_PUBLISHABLE_KEY) {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  } else {
    console.error('Cannot initialize Stripe: no publishable key found');
  }
  
  // Check for checkout success/cancel
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    alert('Success! Check your email for your Pro token.');
  }
  if (params.get('canceled') === 'true') {
    alert('Checkout was canceled.');
  }
});

/**
 * Start Stripe Checkout
 * Call this when "Buy Pro" button is clicked
 */
async function startStripeCheckout() {
  try {
    if (!stripe) {
      alert('Stripe is not initialized. Please refresh the page.');
      return;
    }
    
    // Show loading state
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    // Create checkout session on your backend
    const response = await fetch('/webhook/stripe/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId: PRO_PRICE_ID,
        successUrl: window.location.origin + '/pricing/?success=true',
        cancelUrl: window.location.origin + '/pricing/?canceled=true',
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
    if (event?.target) {
      event.target.textContent = 'Buy Pro — $9.99';
      event.target.disabled = false;
    }
  }
}
