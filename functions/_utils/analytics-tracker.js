/**
 * Analytics Tracking Utility
 * Tracks user events, activations, and engagement metrics
 */

class AnalyticsTracker {
  constructor(config = {}) {
    this.apiEndpoint = config.apiEndpoint || '/api/track';
    this.batchSize = config.batchSize || 10;
    this.flushInterval = config.flushInterval || 30000; // 30 seconds
    this.sessionId = this.generateSessionId();
    this.deviceId = null;
    this.events = [];
    this.isOnline = navigator.onLine;

    this.initializeTracking();
  }

  /**
   * Initialize tracking system
   */
  initializeTracking() {
    // Handle online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      if (this.events.length > 0) {
        this.flush();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Flush events periodically
    this.flushTimer = setInterval(() => {
      if (this.events.length > 0) {
        this.flush();
      }
    }, this.flushInterval);

    // Flush events before page unload
    window.addEventListener('beforeunload', () => {
      if (this.events.length > 0) {
        this.flush(true); // Use sendBeacon for reliability
      }
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden');
      } else {
        this.trackEvent('page_shown');
      }
    });
  }

  /**
   * Set the device ID for tracking
   * @param {string} deviceId - Device identifier
   */
  setDeviceId(deviceId) {
    this.deviceId = deviceId;
  }

  /**
   * Track a custom event
   * @param {string} eventName - Name of the event
   * @param {Object} eventData - Additional event data
   */
  trackEvent(eventName, eventData = {}) {
    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      timestamp_unix: Date.now(),
      session_id: this.sessionId,
      device_id: this.deviceId,
      url: window.location.href,
      referrer: document.referrer,
      data: eventData,
    };

    this.events.push(event);

    // Flush if batch size reached
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Track page view
   * @param {string} pageName - Name/path of the page
   * @param {Object} metadata - Additional metadata
   */
  trackPageView(pageName, metadata = {}) {
    this.trackEvent('page_view', {
      page: pageName,
      ...metadata,
    });
  }

  /**
   * Track feature activation
   * @param {string} featureName - Name of the feature
   * @param {Object} metadata - Feature metadata
   */
  trackActivation(featureName, metadata = {}) {
    this.trackEvent('activation', {
      feature: featureName,
      activated_at: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Track user engagement
   * @param {string} action - Action taken (click, scroll, etc.)
   * @param {Object} metadata - Additional metadata
   */
  trackEngagement(action, metadata = {}) {
    this.trackEvent('engagement', {
      action,
      ...metadata,
    });
  }

  /**
   * Track error
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  trackError(error, context = 'unknown') {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  /**
   * Track performance metrics
   * @param {string} metricName - Name of the metric
   * @param {number} value - Metric value
   * @param {Object} metadata - Additional metadata
   */
  trackMetric(metricName, value, metadata = {}) {
    this.trackEvent('metric', {
      name: metricName,
      value,
      ...metadata,
    });
  }

  /**
   * Track conversion/goal
   * @param {string} goalName - Name of the conversion goal
   * @param {number} value - Monetary value (optional)
   * @param {Object} metadata - Additional metadata
   */
  trackConversion(goalName, value = 0, metadata = {}) {
    this.trackEvent('conversion', {
      goal: goalName,
      value,
      ...metadata,
    });
  }

  /**
   * Flush pending events to server
   * @param {boolean} useBeacon - Use sendBeacon for better reliability
   */
  async flush(useBeacon = false) {
    if (this.events.length === 0 || !this.isOnline) {
      return;
    }

    const payload = {
      batch_id: this.generateSessionId(),
      timestamp: new Date().toISOString(),
      event_count: this.events.length,
      events: this.events,
    };

    try {
      if (useBeacon && navigator.sendBeacon) {
        // Use sendBeacon for more reliable delivery on unload
        navigator.sendBeacon(this.apiEndpoint, JSON.stringify(payload));
      } else {
        // Use fetch for normal operation
        await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }

      // Clear sent events
      this.events = [];
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Events will be retried on next flush
    }
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Stop tracking and cleanup
   */
  destroy() {
    clearInterval(this.flushTimer);
    this.flush();
  }
}

// Export for browser and CommonJS
if (typeof window !== 'undefined') {
  window.AnalyticsTracker = AnalyticsTracker;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsTracker;
}
