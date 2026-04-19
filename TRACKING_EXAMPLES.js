/**
 * Tracking Integration Examples
 * Copy and adapt these examples for your specific use cases
 */

// ==============================================================
// EXAMPLE 1: Stripe Payment & Activation Tracking
// ==============================================================

// Client-side: Track when user initiates checkout
async function handleCheckoutClick(priceId, planName) {
  // Track the action
  window.trackCustomEvent('checkout_initiated', {
    plan: planName,
    price_id: priceId,
    timestamp: new Date().toISOString(),
  });

  // Create Stripe session
  const response = await fetch('/webhook/stripe/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: priceId,
      successUrl: window.location.origin + '/success?plan=' + planName,
      cancelUrl: window.location.href,
    }),
  });

  const session = await response.json();

  if (session.id) {
    // Track activation when payment succeeds
    window.trackActivation('plan_purchased', {
      plan: planName,
      price_id: priceId,
      session_id: session.id,
    });
  }
}

// ==============================================================
// EXAMPLE 2: Pro Token Validation with Device Tracking
// ==============================================================

async function validateProToken(token) {
  const deviceInfo = window.deviceInfo;

  try {
    const response = await fetch(
      window.location.origin + '/api/validate-token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          device_id: deviceInfo.device_id,
          browser: deviceInfo.browser?.name,
          os: deviceInfo.os?.name,
        }),
      }
    );

    const result = await response.json();

    if (result.valid) {
      // Token is valid - track activation
      window.tracker.trackActivation('token_validated', {
        device_id: deviceInfo.device_id,
        activation_count: result.activation_count,
        is_first: result.is_first_activation,
      });

      // Update UI to show Pro features
      enableProFeatures();

      return true;
    } else {
      // Track failed validation
      window.tracker.trackEvent('token_validation_failed', {
        error: result.error,
        activation_count: result.activation_count,
        max_activations: result.max_activations,
      });

      console.warn('Pro token validation failed:', result);
      return false;
    }
  } catch (error) {
    window.tracker.trackError(error, 'token_validation');
    console.error('Token validation error:', error);
    return false;
  }
}

// ==============================================================
// EXAMPLE 3: Feature Usage Tracking
// ==============================================================

class ProFeatureTracker {
  constructor(deviceId, token) {
    this.deviceId = deviceId;
    this.token = token;
  }

  async trackFeatureUsage(featureName, metadata = {}) {
    const data = {
      device_id: this.deviceId,
      token: this.token,
      feature_name: featureName,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    window.tracker.trackCustomEvent('feature_used', {
      feature: featureName,
      ...metadata,
    });

    try {
      await fetch('/api/device-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Failed to track feature usage:', error);
    }
  }

  // Specific feature tracking methods
  trackSiteBuilderSession() {
    this.trackFeatureUsage('site_builder_session', {
      feature_type: 'builder',
      session_id: window.deviceInfo.device_id,
    });
  }

  trackTemplateDownload(templateName) {
    this.trackFeatureUsage('template_download', {
      template: templateName,
      action: 'download',
    });
  }

  trackExport(exportType) {
    this.trackFeatureUsage('export', {
      export_type: exportType,
      timestamp: new Date().toISOString(),
    });
  }

  trackCustomDomain(domain) {
    this.trackFeatureUsage('custom_domain_setup', {
      domain_preview: domain.substring(0, 20),
    });
  }
}

// ==============================================================
// EXAMPLE 4: Form Tracking with Conversion
// ==============================================================

function setupFormTracking() {
  // Contact/Pre-sales form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(contactForm);
      const data = {
        email: formData.get('email'),
        name: formData.get('name'),
        message: formData.get('message'),
      };

      // Track form submission
      window.tracker.trackConversion('contact_form_submitted', 0, {
        form_type: 'contact',
        email: data.email,
      });

      // Submit form
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          // Track successful submission
          window.tracker.trackEvent('contact_form_success', {
            form_type: 'contact',
          });

          // Show success message
          contactForm.reset();
          alert('Thanks for reaching out! We will be in touch.');
        }
      } catch (error) {
        window.tracker.trackError(error, 'contact_form');
      }
    });
  }

  // Newsletter signup
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = newsletterForm.querySelector('input[type="email"]').value;

      window.tracker.trackConversion('newsletter_signup', 0, { email });

      try {
        const response = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          window.tracker.trackEvent('newsletter_signup_success');
          newsletterForm.reset();
        }
      } catch (error) {
        window.tracker.trackError(error, 'newsletter');
      }
    });
  }
}

// ==============================================================
// EXAMPLE 5: Page-Specific Tracking
// ==============================================================

// Pricing page tracking
async function initPricingPageTracking() {
  window.tracker.trackPageView('/pricing', {
    page_type: 'pricing',
    title: 'Pricing Plans',
  });

  // Track plan card views
  document.querySelectorAll('.plan-card').forEach((card) => {
    card.addEventListener('mouseenter', () => {
      const planName = card.dataset.plan || 'unknown';
      window.tracker.trackEngagement('plan_card_viewed', {
        plan: planName,
      });
    });
  });

  // Track CTA clicks
  document.querySelectorAll('[data-plan-select]').forEach((button) => {
    button.addEventListener('click', () => {
      const planName = button.dataset.planSelect || 'unknown';
      window.tracker.trackEvent('plan_cta_clicked', {
        plan: planName,
        action: 'clicked_select',
      });
    });
  });
}

// Site builder tracking
async function initBuilderTracking() {
  let builderStartTime = Date.now();

  window.tracker.trackPageView('/site-builder', {
    page_type: 'application',
    application: 'site_builder',
  });

  // Track builder interactions
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-builder-action]')) {
      const action = e.target.closest('[data-builder-action]').dataset.builderAction;
      window.tracker.trackEngagement('builder_action', {
        action: action,
        builder: 'site_builder',
      });
    }
  });

  // Track save events
  window.addEventListener('beforeunload', () => {
    const timeInBuilder = Date.now() - builderStartTime;
    window.tracker.trackMetric('builder_session_duration', timeInBuilder, {
      unit: 'milliseconds',
      builder: 'site_builder',
    });
  });
}

// ==============================================================
// EXAMPLE 6: Server-side Tracking (Node.js/Express)
// ==============================================================

// In your Express server or Cloudflare Worker
async function trackServerEvent(req, res, eventName, eventData) {
  const event = {
    name: eventName,
    timestamp: new Date().toISOString(),
    client_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    user_agent: req.headers['user-agent'],
    device_id: req.body.device_id,
    data: eventData,
  };

  // Store in KV or database
  try {
    // For Cloudflare Workers with KV
    const eventKey = `event:${event.device_id}:${Date.now()}`;
    await ANALYTICS_KV.put(eventKey, JSON.stringify(event), {
      expirationTtl: 7776000, // 90 days
    });

    console.log('✓ Event tracked:', eventName);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

// ==============================================================
// EXAMPLE 7: Initialize Tracking on Page Load
// ==============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for tracking to be initialized
  if (!window.tracker || !window.deviceInfo) {
    console.warn('Tracking not yet initialized');
    return;
  }

  // Initialize page-specific tracking
  const pathname = window.location.pathname;

  if (pathname === '/') {
    // Home page tracking
    window.tracker.trackPageView('/', { page_type: 'home' });
  } else if (pathname === '/pricing') {
    initPricingPageTracking();
  } else if (pathname.includes('/site-builder')) {
    initBuilderTracking();
  } else if (pathname === '/services') {
    window.tracker.trackPageView('/services', { page_type: 'services' });
  } else if (pathname === '/marketplace') {
    window.tracker.trackPageView('/marketplace', {
      page_type: 'marketplace',
    });
  }

  // Setup general form tracking
  setupFormTracking();

  // If user has a pro token, initialize pro feature tracking
  const proToken = localStorage.getItem('pro_token');
  if (proToken) {
    const featureTracker = new ProFeatureTracker(
      window.deviceInfo.device_id,
      proToken
    );

    // Store for use throughout the page
    window.proFeatureTracker = featureTracker;

    // Validate token
    const isValid = await validateProToken(proToken);
  }
});

// ==============================================================
// EXPORTS
// ==============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleCheckoutClick,
    validateProToken,
    ProFeatureTracker,
    setupFormTracking,
    initPricingPageTracking,
    initBuilderTracking,
    trackServerEvent,
  };
}
