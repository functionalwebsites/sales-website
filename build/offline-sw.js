const FW_BUILDER_CACHE = 'fw-builder-offline-2026-05-15-1';
const FW_IS_ROOT_WORKER = new URL(self.location.href).pathname === '/sw.js';

const FW_BUILDER_ASSETS = [
  ...(FW_IS_ROOT_WORKER ? ['/'] : []),
  '/build/',
  '/build/index.html',
  '/build/vendor/jszip.min.js',
  '/build/js/core.js',
  '/build/js/renderers.js',
  '/build/js/dashboard-import.js',
  '/build/js/editor-canvas.js',
  '/build/js/props-panel.js',
  '/build/js/image-library.js',
  '/build/js/library.js',
  '/build/js/export.js',
  '/build/js/settings.js',
  '/build/js/deploy/ui.js',
  '/build/js/deploy/github.js',
  '/build/js/deploy/cloudflare.js',
  '/build/js/app.js',
  '/build/blocks/testimonial-wall-block.json',
  '/build/blocks/youtube-embed-block.json',
  '/build/templates/plumber-website-template.json',
  '/styles/shared.css',
  '/styles/fonts/JetBrainsMono-Regular.woff2',
  '/styles/fonts/JetBrainsMono-Bold.woff2',
  '/styles/fonts/JetBrainsMono-ExtraBold.woff2',
  '/img/favicon/apple-touch-icon.png',
  '/img/favicon/favicon-32x32.png',
  '/img/favicon/favicon-16x16.png',
  '/img/favicon/site.webmanifest',
  '/img/favicon/safari-pinned-tab.svg',
  '/img/favicon/browserconfig.xml',
];

const shouldHandle = request => {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/build/' ||
    url.pathname.startsWith('/build/') ||
    url.pathname.startsWith('/styles/') ||
    url.pathname.startsWith('/img/favicon/')
  );
};

const cacheResponse = async (request, response) => {
  if (!response || (!response.ok && response.type !== 'opaque')) return response;
  const cache = await caches.open(FW_BUILDER_CACHE);
  await cache.put(request, response.clone());
  return response;
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(FW_BUILDER_CACHE)
      .then(cache => cache.addAll(FW_BUILDER_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== FW_BUILDER_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (!shouldHandle(event.request)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      return await cacheResponse(event.request, response);
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;

      if (event.request.mode === 'navigate') {
        return await caches.match(FW_IS_ROOT_WORKER ? '/' : '/build/') ||
          await caches.match('/build/index.html');
      }

      return new Response('Offline asset not cached.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});
