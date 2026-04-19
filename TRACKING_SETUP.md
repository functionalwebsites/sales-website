# Device & Activation Tracking Integration Guide

## Overview

This tracking system provides comprehensive device fingerprinting and activation analytics for your Functional Websites platform. It includes:

- **Device Fingerprinting**: Generates unique, persistent device identifiers
- **Event Tracking**: Tracks user engagement, page views, conversions
- **Activation Tracking**: Monitors when devices activate features/licenses
- **Analytics API**: Server-side endpoints for querying tracking data
- **Dashboard**: Real-time analytics visualization

## Components

### 1. Device Fingerprinting (`functions/_utils/device-fingerprint.js`)

Generates unique device IDs from browser/device characteristics.

#### Usage

```javascript
// In browser context
import { getDeviceInfo, getOrCreateDeviceId } from './device-fingerprint.js';

// Get device information
const deviceInfo = await getDeviceInfo();
console.log(deviceInfo);
// {
//   device_id: "abc123...",
//   user_agent: "Mozilla/5.0...",
//   browser: { name: "Chrome", version: "120" },
//   os: { name: "macOS", version: "14.0" },
//   screen: { width: 1920, height: 1080, color_depth: 24 },
//   timestamp: "2024-04-19T12:30:00Z"
// }

// Get device ID (persistent)
const deviceId = await getOrCreateDeviceId();
```

#### Features

- Browser & OS detection
- Hardware information (CPU cores, memory)
- Canvas fingerprinting for additional entropy
- Persistent storage (localStorage with sessionStorage fallback)
- SHA-256 hashing for security

### 2. Analytics Tracker (`functions/_utils/analytics-tracker.js`)

Client-side event tracking with automatic batching and flushing.

#### Usage

```javascript
// Initialize tracker
const tracker = new AnalyticsTracker({
  apiEndpoint: '/api/track',
  batchSize: 10,
  flushInterval: 30000
});

// Set device ID
tracker.setDeviceId(deviceId);

// Track events
tracker.trackPageView('/pricing');
tracker.trackActivation('pro_plan_activated');
tracker.trackConversion('purchase', 99.99);
tracker.trackEngagement('button_click', { button: 'cta' });
tracker.trackMetric('scroll_depth', 75);

// Manual flush
tracker.flush();

// Cleanup on unload
tracker.destroy();
```

#### Event Types

- `page_view`: Page navigation
- `activation`: Feature/plan activation
- `conversion`: Purchase or goal completion
- `engagement`: User interaction (clicks, scrolls)
- `metric`: Performance or custom metrics
- `error`: Application errors

### 3. Tracking Integration (`tracking-init.js`)

Automatic tracking initialization that runs on page load.

#### Installation

Add to your HTML `<head>`:

```html
<!-- Include device fingerprinting library -->
<script src="/functions/_utils/device-fingerprint.js"></script>

<!-- Include analytics tracker library -->
<script src="/functions/_utils/analytics-tracker.js"></script>

<!-- Initialize tracking -->
<script src="/tracking-init.js"></script>
```

#### Auto-tracked Events

The initialization script automatically tracks:

- Page views with metadata
- Page load performance metrics
- Click events (elements with `data-track-click`)
- Form submissions (forms with `data-track-submit`)
- Scroll depth milestones (25%, 50%, 75%, 100%)
- Time on page (30-second intervals)
- Stripe checkout events

#### Manual Tracking

After initialization, use global functions:

```javascript
// Track plan selection
window.trackActivation('plan_selected', { plan: 'pro' });

// Track conversion
window.trackConversion('license_purchased', 99.99, { plan: 'pro' });

// Track custom event
window.trackCustomEvent('advanced_feature_used', { feature: 'export' });
```

#### Data Attributes for Tracking

```html
<!-- Track button clicks -->
<button data-track-click="pricing_cta">View Pricing</button>

<!-- Track plan selection -->
<div data-plan-select="pro" class="plan-card">
  <button>Select Pro Plan</button>
</div>

<!-- Track form submission -->
<form data-track-submit="newsletter_signup">
  <input type="email" name="email" required>
  <button type="submit">Sign Up</button>
</form>
```

### 4. Analytics API (`analytics-worker.js`)

Cloudflare Worker endpoints for tracking data and analytics.

#### Endpoints

##### POST `/api/track` - Record Events

```javascript
POST /api/track
Content-Type: application/json

{
  "batch_id": "batch-123",
  "device_id": "device-abc123",
  "session_id": "session-456",
  "events": [
    {
      "name": "page_view",
      "timestamp": "2024-04-19T12:30:00Z",
      "data": { "page": "/pricing" }
    }
  ]
}

Response:
{
  "success": true,
  "batch_id": "batch-123",
  "event_count": 1,
  "timestamp": "2024-04-19T12:30:00Z"
}
```

##### POST `/api/device-activation` - Track Activation

```javascript
POST /api/device-activation
Content-Type: application/json

{
  "device_id": "device-abc123",
  "token": "pro-token-xyz",
  "feature_name": "pro_plan",
  "metadata": {
    "plan": "pro",
    "price": 99.99
  }
}

Response:
{
  "success": true,
  "device_id": "device-abc123",
  "feature": "pro_plan",
  "timestamp": "2024-04-19T12:30:00Z"
}
```

##### GET `/api/activations?token=TOKEN` - Get Token Activations

```javascript
GET /api/activations?token=pro-token-xyz

Response:
{
  "success": true,
  "token": "pro-token-xyz",
  "activation_count": 2,
  "activations": [
    {
      "device_id": "device-abc123",
      "ip": "203.0.113.45",
      "browser": "Chrome",
      "activated_at": "2024-04-19T12:00:00Z",
      "last_used": "2024-04-19T12:30:00Z"
    }
  ]
}
```

##### GET `/api/device-info?device_id=DEVICE_ID` - Get Device Info

```javascript
GET /api/device-info?device_id=device-abc123

Response:
{
  "success": true,
  "device_id": "device-abc123",
  "info": { ... device info ... },
  "total_activations": 3
}
```

##### GET `/api/analytics?period=7` - Get Analytics Metrics

```javascript
GET /api/analytics?period=7

Response:
{
  "success": true,
  "metrics": {
    "period_days": 7,
    "total_events": 15234,
    "total_activations": 42,
    "unique_devices": 28,
    "timestamp": "2024-04-19T12:30:00Z"
  }
}
```

### 5. Analytics Dashboard (`analytics-dashboard.html`)

Web-based dashboard for viewing real-time tracking data.

#### Access

Navigate to `/admin/analytics` or the configured dashboard URL.

#### Features

- Real-time metrics (events, activations, devices)
- Period-based filtering (24h, 7d, 30d, 90d)
- Activation history table
- Event timeline
- Data export (JSON)
- Device search

## Deployment Instructions

### Step 1: Set Up Cloudflare KV Namespace

```bash
# Create KV namespace
wrangler kv:namespace create "ANALYTICS_KV"
wrangler kv:namespace create "TOKENS"

# Update wrangler.toml
kv_namespaces = [
  { binding = "ANALYTICS_KV", id = "your-kv-id" },
  { binding = "TOKENS", id = "your-tokens-id" }
]
```

### Step 2: Deploy Worker

Deploy `analytics-worker.js` and `pro-api-worker.js` to Cloudflare:

```bash
wrangler publish analytics-worker.js
wrangler publish pro-api-worker.js
```

### Step 3: Add Scripts to HTML

In your main `index.html`, add before closing `</head>`:

```html
<!-- Device fingerprinting -->
<script src="/functions/_utils/device-fingerprint.js"></script>

<!-- Analytics tracker -->
<script src="/functions/_utils/analytics-tracker.js"></script>

<!-- Initialize tracking on page load -->
<script src="/tracking-init.js"></script>
```

### Step 4: Configure API Endpoints (Optional)

If your API endpoints are on different domains, update `tracking-init.js`:

```javascript
const config = {
  trackerEndpoint: 'https://api.example.com/api/track',
  activationEndpoint: 'https://api.example.com/api/device-activation',
};
```

### Step 5: Add Data Attributes

Add tracking attributes to important elements:

```html
<!-- Links -->
<a href="/pricing" data-track-click="pricing_link">View Pricing</a>

<!-- Forms -->
<form data-track-submit="contact_form">
  <!-- fields -->
</form>

<!-- Plan cards -->
<div data-plan-select="pro">
  <button>Activate Pro Plan</button>
</div>
```

## Data Storage & Privacy

### KV Storage Structure

Events are stored with 90-day TTL:

```
event:{device_id}:{timestamp}:{random} → event data
activation:{device_id}:{timestamp} → activation data
device:{device_id}:info → device metadata
device:{device_id}:activation:count → activation counter
events:daily:{YYYY-MM-DD} → daily event count
```

### Privacy Considerations

- Device IDs are generated locally and don't include PII
- IP addresses are from Cloudflare headers (can be anonymized)
- Data auto-expires after 90 days
- No third-party tracking integrations by default
- Complies with GDPR/CCPA when properly configured

## API Examples

### JavaScript

```javascript
// Initialize and track
async function trackUserActivation() {
  const { tracker, deviceInfo } = window;
  
  tracker.trackActivation('pro_plan', {
    price: 99.99,
    plan_name: 'Professional'
  });
  
  await fetch('/api/device-activation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id: deviceInfo.device_id,
      token: userToken,
      feature_name: 'pro_plan',
      metadata: { price: 99.99 }
    })
  });
}
```

### cURL

```bash
# Track event
curl -X POST https://api.example.com/api/track \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "batch-123",
    "device_id": "device-abc",
    "events": [{
      "name": "page_view",
      "timestamp": "2024-04-19T12:30:00Z",
      "data": { "page": "/pricing" }
    }]
  }'

# Get activations
curl https://api.example.com/api/activations?token=pro-token-xyz
```

## Monitoring & Troubleshooting

### Check Tracking Status

```javascript
// In browser console
console.log(window.deviceInfo);  // Device information
console.log(window.tracker);    // Tracker instance
```

### Verify Events Are Recorded

Check browser DevTools → Network tab for `/api/track` requests.

### KV Storage Status

```bash
wrangler kv:key list --binding ANALYTICS_KV
```

## Performance Optimization

- Events batch up to 10 before sending (configurable)
- Automatic flush every 30 seconds (configurable)
- Events persist offline and sync when online
- Uses sendBeacon API on page unload for reliability
- Minimal overhead (~5KB minified)

## Future Enhancements

- [ ] Real-time dashboard with WebSockets
- [ ] Custom event schemas
- [ ] Cohort analysis
- [ ] Funnel tracking
- [ ] A/B testing integration
- [ ] Data export to analytics platforms
- [ ] Custom retention policies
- [ ] Role-based access control for dashboard
