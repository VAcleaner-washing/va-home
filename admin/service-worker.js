const VERSION = "1.0.0-16.2.7";
const CACHE_PREFIX = "vahome-admin-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${VERSION}`;

const SHELL_ASSETS = [
  "/admin/",
  "/admin/index.html",
  "/admin/offline.html",
  "/admin/manifest.webmanifest",
  "/admin/pwa/icon-192.png",
  "/admin/pwa/icon-512.png",
  "/admin/pwa/icon-maskable-512.png",
  "/admin/pwa/apple-touch-icon.png",
  "/css/core.css?v=16.2.7",
  "/css/site-admin.css?v=16.2.7",
  "/js/config.js?v=16.2.7",
  "/js/products.js?v=16.2.7",
  "/js/admin.js?v=16.2.7",
  "/js/motion.js?v=16.2.7",
  "/admin/pwa.js?v=16.2.7"
];

function shouldBypassRequest(request, url) {
  if (url.origin !== self.location.origin) return true;
  if (request.method !== "GET") return true;
  if (request.headers.has("range")) return true;
  if (request.cache === "no-store") return true;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return true;
  return false;
}

function isSafeStatic(request) {
  return ["style", "script", "font", "image"].includes(request.destination);
}

function isCacheableResponse(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  const cacheControl = response.headers.get("cache-control") || "";
  return !/\bno-store\b/i.test(cacheControl);
}

async function cacheShellAssets() {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.allSettled(SHELL_ASSETS.map((asset) => cache.add(asset)));
}

async function fetchAndCache(request, cacheKey = request) {
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(cacheKey, response.clone());
    }
    return response;
  } catch {
    return null;
  }
}

async function adminNavigation(event) {
  const preloaded = await event.preloadResponse;
  const response = preloaded || await fetchAndCache(event.request, "/admin/index.html");
  if (response) return response;

  const cache = await caches.open(SHELL_CACHE);
  return await cache.match("/admin/index.html")
    || await cache.match("/admin/offline.html")
    || Response.error();
}

function staleWhileRevalidate(event) {
  const networkResponse = fetchAndCache(event.request);
  event.waitUntil(networkResponse.then(() => undefined));

  return (async () => {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(event.request);
    return cached || await networkResponse || Response.error();
  })();
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShellAssets());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE)
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
    event.respondWith(adminNavigation(event));
    return;
  }

  if (!isSafeStatic(request)) return;
  event.respondWith(staleWhileRevalidate(event));
});
