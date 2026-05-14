document.addEventListener('DOMContentLoaded', function() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    alert('Success! Check your email for your Pro token.');
  }
  if (params.get('canceled') === 'true') {
    alert('Checkout was canceled.');
  }
});

/**
 * Start Stripe Checkout.
 */

async function startStripeCheckout(event) {
  const btn = event?.currentTarget || event?.target;
  const originalText = btn?.textContent || 'Buy Pro — $9.99';

  try {
    if (btn) {
      btn.textContent = 'Loading...';
      btn.disabled = true;
    }

    const response = await fetch('/webhook/stripe/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        successUrl: window.location.origin + '/pricing/?success=true',
        cancelUrl: window.location.origin + '/pricing/?canceled=true',
      })
    });
    
    if (!response.ok) {
      let message = 'Failed to create checkout session';
      try {
        const data = await response.json();
        message = data.error || message;
      } catch {
        message = `${message} (${response.status})`;
      }
      throw new Error(message);
    }

    const { checkoutUrl } = await response.json();

    if (!checkoutUrl) {
      throw new Error('Checkout URL missing from session response');
    }

    window.location.assign(checkoutUrl);
  } catch (error) {
    console.error('Checkout error:', error);
    alert(`Error starting checkout: ${error.message}`);
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }
}
