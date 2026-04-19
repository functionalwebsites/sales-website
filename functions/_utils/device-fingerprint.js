/**
 * Device Fingerprinting Utility
 * Generates consistent device identifiers from browser/device characteristics
 */

/**
 * Generate a device fingerprint hash
 * @returns {Promise<string>} Device fingerprint hash
 */
async function generateDeviceFingerprint() {
  const components = [];

  // Browser user agent
  components.push(navigator.userAgent);

  // Screen dimensions
  components.push(`${screen.width}x${screen.height}`);

  // Color depth
  components.push(screen.colorDepth);

  // Timezone
  components.push(new Date().getTimezoneOffset());

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency (CPU cores)
  if (navigator.hardwareConcurrency) {
    components.push(navigator.hardwareConcurrency);
  }

  // Device memory (GB)
  if (navigator.deviceMemory) {
    components.push(navigator.deviceMemory);
  }

  // Canvas fingerprinting for additional entropy
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Device Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Device Fingerprint', 4, 17);
    components.push(canvas.toDataURL());
  } catch (e) {
    // Canvas might be restricted in some contexts
  }

  // Create hash from all components
  const fingerprint = components.join('|');
  const hashArray = await hashString(fingerprint);
  return hashArray;
}

/**
 * Generate SHA-256 hash of a string
 * @param {string} str - String to hash
 * @returns {Promise<string>} Hex hash
 */
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Get or create persistent device ID
 * Stores in localStorage with fallback to sessionStorage
 * @returns {Promise<string>} Device ID
 */
async function getOrCreateDeviceId() {
  const storageKey = 'fw_device_id';

  // Check localStorage first
  let deviceId = localStorage.getItem(storageKey);
  if (deviceId) {
    return deviceId;
  }

  // Check sessionStorage
  deviceId = sessionStorage.getItem(storageKey);
  if (deviceId) {
    return deviceId;
  }

  // Generate new device ID
  const fingerprint = await generateDeviceFingerprint();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  deviceId = `${fingerprint.substring(0, 16)}-${timestamp}-${random}`;

  // Store in localStorage (persists across sessions)
  try {
    localStorage.setItem(storageKey, deviceId);
  } catch (e) {
    // Fallback to sessionStorage if localStorage not available
    try {
      sessionStorage.setItem(storageKey, deviceId);
    } catch (e) {
      console.warn('Unable to store device ID', e);
    }
  }

  return deviceId;
}

/**
 * Get comprehensive device information
 * @returns {Promise<Object>} Device info object
 */
async function getDeviceInfo() {
  const deviceId = await getOrCreateDeviceId();

  return {
    device_id: deviceId,
    user_agent: navigator.userAgent,
    browser: getBrowserInfo(),
    os: getOSInfo(),
    screen: {
      width: screen.width,
      height: screen.height,
      color_depth: screen.colorDepth,
      device_pixel_ratio: window.devicePixelRatio,
    },
    timezone: {
      offset: new Date().getTimezoneOffset(),
      locale: navigator.language,
    },
    hardware: {
      cores: navigator.hardwareConcurrency,
      memory: navigator.deviceMemory,
    },
    timestamp: new Date().toISOString(),
    timestamp_unix: Date.now(),
  };
}

/**
 * Parse browser information from user agent
 * @returns {Object} Browser info
 */
function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'unknown';
  let version = 'unknown';

  if (ua.indexOf('Firefox') > -1) {
    browser = 'Firefox';
    version = ua.split('Firefox/')[1];
  } else if (ua.indexOf('Chrome') > -1 && ua.indexOf('Chromium') === -1) {
    browser = 'Chrome';
    version = ua.split('Chrome/')[1]?.split(' ')[0];
  } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
    browser = 'Safari';
    version = ua.split('Version/')[1]?.split(' ')[0];
  } else if (ua.indexOf('Trident') > -1) {
    browser = 'IE';
    version = ua.split('MSIE ')[1];
  } else if (ua.indexOf('Edge') > -1) {
    browser = 'Edge';
    version = ua.split('Edge/')[1];
  }

  return { name: browser, version };
}

/**
 * Parse OS information from user agent
 * @returns {Object} OS info
 */
function getOSInfo() {
  const ua = navigator.userAgent;
  let os = 'unknown';
  let version = 'unknown';

  if (ua.indexOf('Windows') > -1) {
    os = 'Windows';
    if (ua.indexOf('Windows NT 10.0') > -1) version = '10';
    else if (ua.indexOf('Windows NT 6.3') > -1) version = '8.1';
    else if (ua.indexOf('Windows NT 6.2') > -1) version = '8';
  } else if (ua.indexOf('Mac') > -1) {
    os = 'macOS';
    version = ua.split('Mac OS X ')[1]?.split(' ')[0]?.replace(/_/g, '.');
  } else if (ua.indexOf('Linux') > -1) {
    os = 'Linux';
  } else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
    os = 'iOS';
  } else if (ua.indexOf('Android') > -1) {
    os = 'Android';
  }

  return { name: os, version };
}

// Export for CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateDeviceFingerprint,
    getOrCreateDeviceId,
    getDeviceInfo,
    getBrowserInfo,
    getOSInfo,
  };
}
