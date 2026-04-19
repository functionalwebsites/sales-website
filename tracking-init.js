/**
 * Functional Websites Tracking Integration
 * Initializes device fingerprinting and analytics tracking on page load
 * Include this script in your HTML page
 */

(async function initializeTracking() {
  // Configuration
  const config = {
    trackerEndpoint: window.location.origin + '/api/track', // Adjust as needed
    activationEndpoint: window.location.origin + '/api/device-activation',
    apiEndpoint: '/api',
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
  };

  // Import tracking utilities
  async function loadTracking() {
    try {
      // Get device info
      const deviceInfo = await window.getDeviceInfo?.() || {
        device_id: `device-${Date.now()}`,
      };

      // Initialize analytics tracker
      const tracker = new window.AnalyticsTracker({
        apiEndpoint: config.trackerEndpoint,
        batchSize: config.batchSize,
        flushInterval: config.flushInterval,
      });

      tracker.setDeviceId(deviceInfo.device_id);

      // Store tracking instance globally for easy access
      window.tracker = tracker;
      window.deviceInfo = deviceInfo;

      // Track initial page view
      tracker.trackPageView(window.location.pathname, {
        title: document.title,
        referrer: document.referrer,
        device_info: {
          browser: deviceInfo.browser?.name,
          os: deviceInfo.os?.name,
          screen: `${deviceInfo.screen?.width}x${deviceInfo.screen?.height}`,
        },
      });

      // Track page load performance
      if (window.performance && window.performance.timing) {
        window.addEventListener('load', () => {
          const timing = window.performance.timing;
          const navigationStart = timing.navigationStart;

          tracker.trackMetric('page_load_time', timing.loadEventEnd - navigationStart, {
            dom_interactive: timing.domInteractive - navigationStart,
            dom_complete: timing.domComplete - navigationStart,
            resource_timing: timing.responseEnd - navigationStart,
          });
        });
      }

      // Track clicks on important elements
      document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-track-click]');
        if (target) {
          const eventName = target.dataset.trackClick || 'button_click';
          tracker.trackEngagement(eventName, {
            element: target.tagName,
            text: target.textContent?.substring(0, 100),
            class: target.className,
          });
        }
      });

      // Track pricing/plan selections
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-plan-select]')) {
          const planElement = e.target.closest('[data-plan-select]');
          const planName = planElement.dataset.planSelect;
          tracker.trackEvent('plan_selected', {
            plan: planName,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Track form submissions
      document.addEventListener('submit', (e) => {
        const form = e.target;
        if (form.dataset.trackSubmit) {
          tracker.trackEvent('form_submitted', {
            form_id: form.id || form.name,
            form_name: form.dataset.trackSubmit,
          });
        }
      });

      // Track scroll depth
      let maxScrollPercentage = 0;
      window.addEventListener('scroll', () => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY;
        const scrollPercentage = Math.round(
          ((scrollTop + windowHeight) / documentHeight) * 100
        );

        if (scrollPercentage > maxScrollPercentage) {
          maxScrollPercentage = scrollPercentage;

          // Track milestone scroll events
          if (
            [25, 50, 75, 100].includes(maxScrollPercentage) ||
            scrollPercentage >= 90
          ) {
            tracker.trackMetric('scroll_depth', maxScrollPercentage, {
              milestone: true,
            });
          }
        }
      });

      // Track time on page
      let timeOnPage = 0;
      setInterval(() => {
        timeOnPage += 30; // 30 second intervals
        if (!document.hidden && timeOnPage % 300 === 0) {
          // Every 5 minutes
          tracker.trackMetric('time_on_page', timeOnPage, {
            unit: 'seconds',
          });
        }
      }, 30000);

      // Track Stripe checkout events (if applicable)
      if (window.Stripe) {
        const originalStripe = window.Stripe;
        window.Stripe = function (...args) {
          const stripe = originalStripe(...args);
          const originalRedirectToCheckout = stripe.redirectToCheckout;

          stripe.redirectToCheckout = async function (options) {
            tracker.trackEvent('checkout_initiated', {
              session_id: options.sessionId,
            });
            return originalRedirectToCheckout.call(this, options);
          };

          return stripe;
        };
      }

      // Expose tracking methods for manual use
      window.trackActivation = (featureName, metadata = {}) => {
        tracker.trackActivation(featureName, metadata);
        return fetch(config.activationEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: deviceInfo.device_id,
            feature_name: featureName,
            metadata,
          }),
        }).catch(err => console.error('Failed to track activation:', err));
      };

      window.trackConversion = (goalName, value = 0, metadata = {}) => {
        tracker.trackConversion(goalName, value, metadata);
      };

      window.trackCustomEvent = (eventName, eventData = {}) => {
        tracker.trackEvent(eventName, eventData);
      };

      console.log('✓ Tracking initialized', {
        device_id: deviceInfo.device_id,
        browser: deviceInfo.browser?.name,
        os: deviceInfo.os?.name,
      });

      return {
        tracker,
        deviceInfo,
      };
    } catch (error) {
      console.error('Failed to initialize tracking:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTracking);
  } else {
    loadTracking();
  }
})();
