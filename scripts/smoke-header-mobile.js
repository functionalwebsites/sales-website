#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8794);
const CHROME_PORT = Number(process.env.CHROME_PORT || 9334);
const BASE_URL = `http://localhost:${PORT}`;
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome',
  'chromium',
].filter(Boolean);

const PAGES = [
  '/',
  '/pricing/',
  '/services/',
  '/hosting/',
  '/marketplace/',
  '/docs/getting-started/',
  '/docs/github/',
  '/build/',
];
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 630, height: 844 },
];

function findChrome() {
  for (const candidate of CHROME_PATHS) {
    if (candidate.includes('/') && fs.existsSync(candidate)) return candidate;
    if (!candidate.includes('/')) return candidate;
  }
  throw new Error('Chrome not found. Set CHROME_PATH to a Chrome/Chromium binary.');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Wrangler did not start in time')), 30000);
    const onData = data => {
      const text = data.toString();
      if (text.includes('Ready on')) {
        clearTimeout(timeout);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', code => reject(new Error(`Wrangler exited early with code ${code}`)));
  });
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${url} failed: ${res.status}`);
  return res.json();
}

function requestTextWithHost(pathname, host) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: pathname,
      method: 'GET',
      headers: { Host: host },
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method && listeners.has(msg.method)) {
      listeners.get(msg.method).forEach(fn => fn(msg.params));
    }
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const callId = ++id;
          ws.send(JSON.stringify({ id: callId, method, params }));
          return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
        },
        once(method) {
          return new Promise(resolve => {
            const list = listeners.get(method) || [];
            const fn = params => {
              listeners.set(method, list.filter(item => item !== fn));
              resolve(params);
            };
            listeners.set(method, [...list, fn]);
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener('error', reject);
  });
}

async function createPage() {
  let target;
  try {
    target = await requestJson(`http://localhost:${CHROME_PORT}/json/new?about:blank`, { method: 'PUT' });
  } catch (_) {
    target = await requestJson(`http://localhost:${CHROME_PORT}/json/new?about:blank`);
  }
  return connect(target.webSocketDebuggerUrl);
}

async function navigate(client, url, viewport) {
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 2,
    mobile: true,
  });
  const loaded = client.once('Page.loadEventFired');
  await client.send('Page.navigate', { url });
  await loaded;
  await wait(500);
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  }
  return result.result.value;
}

const headerMetricsExpression = `(() => {
  const placeholder = document.querySelector('#header-placeholder');
  const root = placeholder?.shadowRoot || document;
  const visible = el => {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
  };
  const rect = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, center: r.left + r.width / 2 };
  };
  const wrapper = root.querySelector('.header-wrapper') || document.querySelector('.header-wrapper');
  const logoLink = root.querySelector('.logo-link') || document.querySelector('.logo-link');
  const logoText = root.querySelector('.logo-text') || root.querySelector('.logo p') || document.querySelector('.logo-text') || document.querySelector('.logo p');
  const menu = root.querySelector('.menu-toggle');
  const mobileBuild = root.querySelector('.mobile-builder-link');
  const nav = root.querySelector('.header-nav');
  const builderUnlock = document.querySelector('#btn-unlock-pro');
  const proBanner = document.querySelector('#pro-banner');
  return {
    path: location.pathname,
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    wrapper: rect(wrapper),
    logo: rect(logoLink),
    logoTextVisible: visible(logoText),
    menuVisible: visible(menu),
    mobileBuildVisible: visible(mobileBuild),
    navVisible: visible(nav),
    builderUnlockVisible: visible(builderUnlock),
    proBannerVisible: visible(proBanner),
    hasSiteHeader: Boolean(menu && mobileBuild),
    hasBuilderDashboard: Boolean(document.querySelector('#view-dashboard .header-wrapper')),
  };
})()`;

async function assertPage(client, page, viewport) {
  const url = `${BASE_URL}${page}`;
  await navigate(client, url, viewport);
  const metrics = await evaluate(client, headerMetricsExpression);
  const label = `${page} @ ${viewport.width}px`;
  const failures = [];

  if (metrics.scrollWidth > viewport.width + 2) {
    failures.push(`horizontal overflow: scrollWidth ${metrics.scrollWidth}`);
  }

  if (metrics.hasSiteHeader) {
    if (!metrics.menuVisible) failures.push('menu toggle is not visible');
    if (!metrics.mobileBuildVisible) failures.push('mobile Build button is not visible');
    if (metrics.logoTextVisible) failures.push('logo text is visible on mobile');
    if (!metrics.logo || Math.abs(metrics.logo.center - viewport.width / 2) > 6) {
      failures.push(`logo is not centered: ${metrics.logo ? metrics.logo.center : 'missing'}`);
    }

    await evaluate(client, `(() => {
      const root = document.querySelector('#header-placeholder')?.shadowRoot || document;
      root.querySelector('.menu-toggle')?.click();
      return true;
    })()`);
    await wait(300);
    const openMetrics = await evaluate(client, `(() => {
      const root = document.querySelector('#header-placeholder')?.shadowRoot || document;
      const nav = root.querySelector('.header-nav');
      const button = root.querySelector('.menu-toggle');
      const style = nav ? getComputedStyle(nav) : null;
      return {
        expanded: button?.getAttribute('aria-expanded') === 'true',
        pointerEvents: style?.pointerEvents,
        transform: style?.transform,
        bodyFixed: getComputedStyle(document.body).position === 'fixed',
      };
    })()`);
    if (!openMetrics.expanded) failures.push('menu did not set aria-expanded');
    if (openMetrics.pointerEvents !== 'auto') failures.push('open menu is not interactive');
    if (!openMetrics.bodyFixed) failures.push('open menu did not lock page scroll');
  }

  if (metrics.hasBuilderDashboard) {
    if (metrics.logoTextVisible) failures.push('builder dashboard logo text is visible on mobile');
    if (metrics.builderUnlockVisible) failures.push('builder header Unlock Pro button is visible on mobile');
    if (!metrics.proBannerVisible) failures.push('Pro banner is not visible for free dashboard state');
  }

  if (failures.length) {
    throw new Error(`${label}: ${failures.join('; ')}`);
  }
  console.log(`PASS ${label}`);
}

async function main() {
  const chromePath = findChrome();
  const wrangler = spawn('wrangler', ['pages', 'dev', '.', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${CHROME_PORT}`,
    `--user-data-dir=/tmp/fw-header-smoke-${Date.now()}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  try {
    await waitForServer(wrangler);
    for (let i = 0; i < 40; i += 1) {
      try {
        await requestJson(`http://localhost:${CHROME_PORT}/json/version`);
        break;
      } catch (_) {
        await wait(250);
      }
    }

    const buildRoot = await requestTextWithHost('/', 'build.functionalwebsites.com');
    if (buildRoot.status !== 200 || !buildRoot.body.includes('/build/js/core.js')) {
      throw new Error('build.functionalwebsites.com root did not serve build/index.html');
    }

    const legacy = await fetch(BASE_URL + '/site-builder/', { redirect: 'manual' });
    if (legacy.status !== 308 || !String(legacy.headers.get('location')).includes('/build/')) {
      throw new Error('/site-builder/ did not redirect to /build/');
    }

    const client = await createPage();
    try {
      for (const viewport of VIEWPORTS) {
        for (const page of PAGES) {
          await assertPage(client, page, viewport);
        }
      }
    } finally {
      client.close();
    }
  } finally {
    chrome.kill('SIGTERM');
    wrangler.kill('SIGTERM');
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
