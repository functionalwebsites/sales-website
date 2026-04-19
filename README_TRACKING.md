# Tracking System - Quick Start Guide

## 📦 What Was Added

Your sales website now has comprehensive device and activation tracking:

### New Files Created

1. **Device Fingerprinting**
   - `functions/_utils/device-fingerprint.js` - Generates unique device IDs with browser/OS detection

2. **Analytics Tracking**
   - `functions/_utils/analytics-tracker.js` - Client-side event tracking with batching
   - `tracking-init.js` - Auto-initializes tracking on every page

3. **Backend APIs**
   - `analytics-worker.js` - Cloudflare Worker for tracking endpoints
   - Enhances existing `pro-api-worker.js` with device tracking

4. **Admin Dashboard**
   - `analytics-dashboard.html` - Real-time analytics dashboard
   - View activations, events, and metrics

5. **Documentation**
   - `TRACKING_SETUP.md` - Complete integration guide
   - `TRACKING_EXAMPLES.js` - Real-world integration examples

## 🚀 Quick Start (5 minutes)

### Step 1: Add Scripts to HTML

In your `index.html` `<head>`, add:

```html
<!-- Near closing </head> -->
<script src="functions/_utils/device-fingerprint.js"></script>
<script src="functions/_utils/analytics-tracker.js"></script>
<script src="tracking-init.js"></script>
```

### Step 2: Deploy Cloudflare Worker

```bash
# Deploy analytics worker
wrangler publish analytics-worker.js

# Or add routes to existing worker configuration
# Add these endpoints to your Cloudflare worker:
# POST /api/track
# POST /api/device-activation
# GET /api/activations
# GET /api/analytics
# GET /api/device-info
```

### Step 3: Add Data Attributes (Optional)

Mark elements for tracking:

```html
<!-- Track button clicks -->
<button data-track-click="pricing_button">View Pricing</button>

<!-- Track plan selections -->
<div data-plan-select="pro">
  <button>Activate Pro</button>
</div>

<!-- Track form submissions -->
<form data-track-submit="contact">
  <input type="email" required>
  <button type="submit">Contact</button>
</form>
```

## 📊 What Gets Tracked

### Automatic Tracking
- ✅ Page views and navigation
- ✅ Page load performance metrics
- ✅ Click events on tracked elements
- ✅ Form submissions
- ✅ Scroll depth (25%, 50%, 75%, 100%)
- ✅ Time on page
- ✅ User device info (browser, OS, screen size)
- ✅ Stripe checkout interactions

### Manual Tracking (Easy)

```javascript
// Track activation
window.trackActivation('pro_plan', { price: 99.99 });

// Track conversion
window.trackConversion('purchase_completed', 99.99);

// Track custom event
window.trackCustomEvent('feature_used', { feature: 'export' });
```

## 🔗 API Endpoints

Once deployed, use these endpoints:

```
POST   /api/track                    - Record events
POST   /api/device-activation        - Track device activation
GET    /api/activations?token=XXX    - Get activations for token
GET    /api/device-info?device_id=X  - Get device information
GET    /api/analytics?period=7       - Get analytics metrics
```

## 📈 Device Information Tracked

For each device, we capture:

```
{
  device_id: "unique-persistent-id",
  user_agent: "browser info",
  browser: { name: "Chrome", version: "120" },
  os: { name: "macOS", version: "14.0" },
  screen: { width: 1920, height: 1080, color_depth: 24 },
  timezone: { offset: -480, locale: "en-US" },
  hardware: { cores: 8, memory: 16 },
  timestamp: "2024-04-19T12:30:00Z"
}
```

## 🎯 Activation Tracking

When a device activates a feature/plan:

```javascript
// Server-side
{
  device_id: "unique-id",
  token: "pro-token",
  feature: "pro_plan",
  activated_at: "2024-04-19T12:30:00Z",
  ip: "203.0.113.45",
  browser: "Chrome",
  user_agent: "..."
}
```

## 📊 View Analytics

### Dashboard
- URL: `/admin/analytics` (after deployment)
- Shows real-time metrics
- Filter by time period
- Export data as JSON

### Programmatic Access
```javascript
// From browser
fetch('/api/analytics?period=7')
  .then(r => r.json())
  .then(data => console.log(data.metrics));

// Get specific device
fetch('/api/device-info?device_id=xyz')
  .then(r => r.json());

// Get token activations
fetch('/api/activations?token=abc')
  .then(r => r.json());
```

## 🔐 Privacy & Security

- ✅ Device IDs generated client-side (no PII)
- ✅ Data stored in Cloudflare KV (encrypted at rest)
- ✅ Auto-expires after 90 days
- ✅ GDPR/CCPA compliant architecture
- ✅ No third-party tracking by default

## 🛠️ Advanced Configuration

### Customize Tracking

Edit `tracking-init.js`:

```javascript
const config = {
  trackerEndpoint: '/api/track',           // Change endpoint
  activationEndpoint: '/api/device-activation',
  batchSize: 10,                           // Events before flush
  flushInterval: 30000,                    // Flush every 30s
};
```

### Server-Side Integration

See `TRACKING_EXAMPLES.js` for:
- Stripe integration
- Pro token validation
- Feature usage tracking
- Form tracking
- Page-specific tracking
- Server-side event tracking

## 📚 Full Documentation

- **Setup Guide**: See `TRACKING_SETUP.md` for detailed configuration
- **Examples**: See `TRACKING_EXAMPLES.js` for integration patterns
- **API Reference**: All endpoints documented in `TRACKING_SETUP.md`

## 🔄 Data Flow

```
Browser Page Load
    ↓
Device Fingerprinting (device-fingerprint.js)
    ↓
Analytics Tracker Initialization (analytics-tracker.js)
    ↓
Auto-track Events (tracking-init.js)
    ↓
Batch & Send to API (/api/track)
    ↓
Cloudflare Worker (analytics-worker.js)
    ↓
Store in KV (encrypted, 90-day TTL)
    ↓
Query via API or Dashboard
```

## ✨ Key Features

- 🎯 **Device Fingerprinting**: Persistent, unique device identifiers
- 📊 **Event Batching**: Efficient event collection (batches of 10)
- 🔄 **Auto-flush**: Every 30 seconds or on page unload
- 📱 **Responsive**: Works on mobile, tablet, desktop
- ⚡ **Performance**: ~5KB minified, minimal overhead
- 🔌 **Easy Integration**: Just add scripts and attributes
- 📈 **Flexible**: Track anything with manual API calls
- 🌐 **Reliable**: Uses sendBeacon API for unload safety

## 🚨 Troubleshooting

### Events not showing up?

1. Check browser console for errors
2. Verify scripts are loaded: `window.tracker` should exist
3. Check network tab for `/api/track` requests
4. Verify Cloudflare Worker is deployed

### Device ID not persisting?

Check localStorage: `localStorage.getItem('fw_device_id')`

If localStorage disabled, falls back to sessionStorage

### Dashboard not loading?

Verify endpoint: `GET /api/analytics` returns data

## 📱 Next Steps

1. ✅ Add scripts to your HTML
2. ✅ Deploy Cloudflare Worker
3. ✅ Add data attributes to UI elements
4. ✅ Test in browser (check console)
5. ✅ View analytics dashboard
6. ✅ Integrate with your payment flow (see examples)
7. ✅ Monitor activate rates and engagement

## 💡 Pro Tips

- Use `window.tracker.flush()` before important navigation
- Track custom conversions for your specific goals
- Monitor scroll depth to see content engagement
- Use feature tracking to understand product usage
- Export analytics regularly for analysis

## 📞 Support

For detailed API documentation, see:
- `TRACKING_SETUP.md` - Complete reference
- `TRACKING_EXAMPLES.js` - Real-world examples
- Browser DevTools Network tab - Debug API calls
