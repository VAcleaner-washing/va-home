const VERSION = '15.5.0-RC1.7';
const CACHE_REVISION = 'rc-17';
const CACHE_PREFIX = 'vahome-';
const STATIC_CACHE = `${CACHE_PREFIX}static-${VERSION}-${CACHE_REVISION}`;

const CORE_ASSETS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/icon-maskable-512.png',
  '/pwa/apple-touch-icon.png'
];

const PRIVATE_ROUTES = [
  /^\/admin(?:\/|$)/,
  /^\/account(?:\.html)?\/?$/,
  /^\/cart(?:\.html)?\/?$/,
  /^\/checkout(?:\.html)?\/?$/,
  /^\/thank-you(?:\.html)?\/?$/,
  /^\/order-status(?:\.html)?\/?$/,
  /^\/private-preview(?:\.html)?\/?$/
];

const LIVE_FILES = new Set([
  '/release.json',
  '/js/config.js',
  '/js/supabase-api.js',
  '/js/products.js',
  '/js/catalog.js',
  '/js/product.js',
  '/js/discovery-set.js',
  '/js/compare.js',
  '/js/cart.js',
  '/js/account.js',
  '/js/admin.js',
  '/js/thank-you.js',
  '/js/order-status.js',
  '/js/ratings.js',
  '/js/reviews.js',
  '/js/home-reviews.js',
  '/data/review-seo-snapshot.json',
  '/data/product-content.json',
  '/js/wishlist.js',
  '/js/scent-profile.js',
  '/js/scent-guide.js',
  '/js/room-ritual.js',
  '/js/private-preview.js'
]);

const isPrivateRoute = (pathname) =>
  PRIVATE_ROUTES.some((pattern) => pattern.test(pathname));

const isCacheableStatic = (request, url) => {
  if (LIVE_FILES.has(url.pathname)) return false;

  return (
    ['style', 'script', 'font', 'image'].includes(request.destination) ||
    /^\/(?:css|fonts|images|favicon|pwa)\//.test(url.pathname)
  );
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const response = await network;
  return response || Response.error();
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    if (isPrivateRoute(url.pathname)) return;

    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  if (isPrivateRoute(url.pathname) || !isCacheableStatic(request, url)) return;

  event.respondWith(staleWhileRevalidate(request));
});
