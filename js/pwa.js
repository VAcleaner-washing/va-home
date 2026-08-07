(() => {
  "use strict";

  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

  const VERSION = "16.2.4";
  const UPDATE_INTERVAL = 60 * 60 * 1000;
  const RELOAD_KEY = `vahome_sw_reloaded_${VERSION}`;
  const hadControllerAtStart = Boolean(navigator.serviceWorker.controller);
  const privateRoutes = [
    /^\/admin(?:\/|$)/,
    /^\/account(?:\.html)?\/?$/,
    /^\/cart(?:\.html)?\/?$/,
    /^\/checkout(?:\.html)?\/?$/,
    /^\/thank-you(?:\.html)?\/?$/,
    /^\/order-status(?:\.html)?\/?$/,
    /^\/private-preview(?:\.html)?\/?$/
  ];

  let lastUpdateCheck = 0;
  let refreshing = false;

  function isPrivatePage() {
    return privateRoutes.some((pattern) => pattern.test(window.location.pathname));
  }

  function checkForUpdate(registration, force = false) {
    const now = Date.now();
    if (!force && now - lastUpdateCheck < UPDATE_INTERVAL) return;

    lastUpdateCheck = now;
    registration.update().catch(() => {});
  }

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js", {
        scope: "/",
        updateViaCache: "none"
      });

      checkForUpdate(registration, true);

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate(registration);
      });
      window.addEventListener("online", () => checkForUpdate(registration, true));
      window.addEventListener("pageshow", () => checkForUpdate(registration));
    } catch {
      // The storefront remains fully usable without PWA support.
    }
  }, { once: true });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadControllerAtStart || refreshing || isPrivatePage()) return;
    if (sessionStorage.getItem(RELOAD_KEY) === "1") return;

    refreshing = true;
    sessionStorage.setItem(RELOAD_KEY, "1");
    window.location.reload();
  });
})();
