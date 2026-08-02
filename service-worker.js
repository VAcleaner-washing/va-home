const VERSION = "16.0.1";
const CACHE_REVISION = "v16";
const CACHE_PREFIX = "vahome-";
const STATIC_CACHE = `${CACHE_PREFIX}static-${VERSION}-${CACHE_REVISION}`;

const CORE_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/icon-maskable-512.png",
  "/pwa/apple-touch-icon.png"
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
  "/release.json",
  "/js/config.js",
  "/js/supabase-api.js",
  "/js/products.js",
  "/js/catalog.js",
  "/js/product.js",
  "/js/discovery-set.js",
  "/js/compare.js",
  "/js/cart.js",
  "/js/account.js",
  "/js/admin.js",
  "/js/thank-you.js",
  "/js/order-status.js",
  "/js/ratings.js",
  "/js/reviews.js",
  "/js/home-reviews.js",
  "/data/review-seo-snapshot.json",
  "/data/product-content.json",
  "/js/wishlist.js",
  "/js/scent-profile.js",
  "/js/scent-guide.js",
  "/js/room-ritual.js",
  "/js/private-preview.js"
]);

function isPrivateRoute(pathname) {
  return PRIVATE_ROUTES.some((pattern) => pattern.test(pathname));
}

function shouldBypassRequest(request, url) {
  if (url.origin !== self.location.origin) return true;
  if (request.method !== "GET") return true;
  if (request.headers.has("range")) return true;
  if (request.cache === "no-store") return true;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return true;
  return false;
}

function isCacheableStatic(request, url) {
  if (LIVE_FILES.has(url.pathname)) return false;

  return (
    ["style", "script", "font", "image"].includes(request.destination)
    || /^\/(?:css|fonts|images|favicon|pwa)\//.test(url.pathname)
  );
}

function isCacheableResponse(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  const cacheControl = response.headers.get("cache-control") || "";
  return !/\bno-store\b/i.test(cacheControl);
}

async function cacheCoreAssets() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(CORE_ASSETS.map((asset) => cache.add(asset)));
}

async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return null;
  }
}

function staleWhileRevalidate(event) {
  const { request } = event;
  const networkResponse = fetchAndCache(request);
  event.waitUntil(networkResponse.then(() => undefined));

  return (async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    return cached || await networkResponse || Response.error();
  })();
}

async function networkFirstNavigation(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    return await caches.match("/offline.html") || Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheCoreAssets());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE)
        .map((key) => caches.delete(key))
    );

    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }

    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (shouldBypassRequest(request, url)) return;

  if (request.mode === "navigate") {
    if (isPrivateRoute(url.pathname)) return;
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  if (isPrivateRoute(url.pathname) || !isCacheableStatic(request, url)) return;
  event.respondWith(staleWhileRevalidate(event));
});
