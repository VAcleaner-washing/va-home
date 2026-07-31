const VERSION = '1.0.0-15.2.1';
const CACHE_PREFIX = 'vahome-admin-';
const SHELL_CACHE = `${CACHE_PREFIX}shell-${VERSION}`;

const SHELL_ASSETS = [
  '/admin/',
  '/admin/index.html',
  '/admin/offline.html',
  '/admin/manifest.webmanifest',
  '/admin/pwa/icon-192.png',
  '/admin/pwa/icon-512.png',
  '/admin/pwa/icon-maskable-512.png',
  '/admin/pwa/apple-touch-icon.png',
  '/css/core-admin.css?v=15.2.1',
  '/css/site-admin.css?v=15.2.1',
  '/js/config.js?v=15.2.1',
  '/js/products.js?v=15.2.1',
  '/js/admin.js?v=15.2.1',
  '/js/motion.js?v=15.2.1',
  '/admin/pwa.js?v=15.2.1'
];

const isSafeStatic = (request, url) =>
  url.origin === self.location.origin &&
  ['style', 'script', 'font', 'image'].includes(request.destination);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      for (const asset of SHELL_ASSETS) {
        try { await cache.add(asset); } catch (_) { /* keep install resilient */ }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache Supabase/auth/API requests or cross-origin resources.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok && url.pathname.startsWith('/admin/')) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/admin/index.html', copy));
        }
        return response;
      }).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('/admin/index.html')) || cache.match('/admin/offline.html');
      })
    );
    return;
  }

  if (!isSafeStatic(request, url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      }).catch(() => null);
      return cached || network || Response.error();
    })
  );
});
