/**
 * Analytics Tracking API Worker
 * Handles tracking of device activations, events, and engagement metrics
 * Deploy as a Cloudflare Worker
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-pro-token, x-device-id',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response('OK', { headers: corsHeaders });
    }

    // POST /api/track - Record analytics events
    if (url.pathname === '/api/track' && request.method === 'POST') {
      return handleTrackEvents(request, env, corsHeaders);
    }

    // GET /api/activations - Get activation data for a token
    if (url.pathname === '/api/activations' && request.method === 'GET') {
      return handleGetActivations(request, env, corsHeaders);
    }

    // POST /api/device-activation - Track device activation
    if (url.pathname === '/api/device-activation' && request.method === 'POST') {
      return handleDeviceActivation(request, env, corsHeaders);
    }

    // GET /api/analytics - Get analytics metrics
    if (url.pathname === '/api/analytics' && request.method === 'GET') {
      return handleGetAnalytics(request, env, corsHeaders);
    }

    // GET /api/device-info - Get device information for a device_id
    if (url.pathname === '/api/device-info' && request.method === 'GET') {
      return handleGetDeviceInfo(request, env, corsHeaders);
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: corsHeaders }
    );
  },
};

/**
 * Handle tracking events
 */
async function handleTrackEvents(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { batch_id, events, device_id, session_id } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No events provided' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const timestamp = new Date().toISOString();

    // Store events in KV with batch tracking
    for (const event of events) {
      const eventKey = `event:${device_id}:${Date.now()}:${Math.random()}`;
      const enrichedEvent = {
        ...event,
        batch_id,
        session_id,
        device_id,
        client_ip: clientIp,
        user_agent: userAgent,
        server_timestamp: timestamp,
      };

      await env.ANALYTICS_KV.put(eventKey, JSON.stringify(enrichedEvent), {
        expirationTtl: 7776000, // 90 days
      });

      // Track daily event counts for analytics
      const dateKey = `events:daily:${new Date().toISOString().split('T')[0]}`;
      const dailyCount = await env.ANALYTICS_KV.get(dateKey);
      const count = dailyCount ? parseInt(dailyCount) + 1 : 1;
      await env.ANALYTICS_KV.put(dateKey, count.toString());
    }

    return new Response(
      JSON.stringify({
        success: true,
        batch_id,
        event_count: events.length,
        timestamp,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Track events error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to track events' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Handle device activation tracking
 */
async function handleDeviceActivation(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { device_id, token, feature_name, metadata } = body;

    if (!device_id || !token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing device_id or token' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const timestamp = new Date().toISOString();

    // Record device activation
    const activationKey = `activation:${device_id}:${Date.now()}`;
    const activation = {
      device_id,
      token,
      feature: feature_name || 'default',
      metadata: metadata || {},
      ip: clientIp,
      activated_at: timestamp,
      user_agent: request.headers.get('user-agent'),
    };

    await env.ANALYTICS_KV.put(activationKey, JSON.stringify(activation), {
      expirationTtl: 7776000, // 90 days
    });

    // Track activation count per feature
    const featureCountKey = `activations:${feature_name || 'default'}:count`;
    const featureCount = await env.ANALYTICS_KV.get(featureCountKey);
    const newCount = featureCount ? parseInt(featureCount) + 1 : 1;
    await env.ANALYTICS_KV.put(featureCountKey, newCount.toString());

    // Track activation count per device
    const deviceCountKey = `device:${device_id}:activation:count`;
    const deviceCount = await env.ANALYTICS_KV.get(deviceCountKey);
    const newDeviceCount = deviceCount ? parseInt(deviceCount) + 1 : 1;
    await env.ANALYTICS_KV.put(deviceCountKey, newDeviceCount.toString());

    return new Response(
      JSON.stringify({
        success: true,
        device_id,
        feature: feature_name || 'default',
        timestamp,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Device activation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to track activation' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Get activations for a token
 */
async function handleGetActivations(request, env, corsHeaders) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    const deviceId = new URL(request.url).searchParams.get('device_id');

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing token parameter' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify token exists
    const kvKey = `token:${token}`;
    const tokenData = await env.TOKENS?.get(kvKey);

    if (!tokenData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get activations for this token
    const activationKey = `token:${token}:activations`;
    const activations = await env.TOKENS?.get(activationKey);
    const parsed = activations ? JSON.parse(activations) : [];

    // Filter by device_id if provided
    const filtered = deviceId
      ? parsed.filter(a => a.device_id === deviceId)
      : parsed;

    return new Response(
      JSON.stringify({
        success: true,
        token,
        activation_count: filtered.length,
        activations: filtered.map(a => ({
          device_id: a.device_id,
          ip: a.ip,
          browser: a.browser,
          activated_at: a.activated_at,
          last_used: a.last_used,
        })),
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Get activations error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to get activations' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Get device information
 */
async function handleGetDeviceInfo(request, env, corsHeaders) {
  try {
    const deviceId = new URL(request.url).searchParams.get('device_id');

    if (!deviceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing device_id parameter' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get device information from KV
    const deviceKey = `device:${deviceId}:info`;
    const deviceInfo = await env.ANALYTICS_KV?.get(deviceKey);
    const info = deviceInfo ? JSON.parse(deviceInfo) : null;

    // Get activation count
    const countKey = `device:${deviceId}:activation:count`;
    const count = await env.ANALYTICS_KV?.get(countKey);

    return new Response(
      JSON.stringify({
        success: true,
        device_id: deviceId,
        info: info || {},
        total_activations: count ? parseInt(count) : 0,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Get device info error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to get device info' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Get analytics metrics
 */
async function handleGetAnalytics(request, env, corsHeaders) {
  try {
    const period = new URL(request.url).searchParams.get('period') || '7'; // days
    const days = parseInt(period);

    const metrics = {
      period_days: days,
      total_events: 0,
      total_activations: 0,
      unique_devices: 0,
      timestamp: new Date().toISOString(),
    };

    // Sum events for the period
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dailyCount = await env.ANALYTICS_KV?.get(`events:daily:${dateStr}`);
      if (dailyCount) {
        metrics.total_events += parseInt(dailyCount);
      }
    }

    // Get unique device count (approximate using KV list operations if supported)
    // This is a simplified approach - in production, use a dedicated counter service

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Get analytics error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to get analytics' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
