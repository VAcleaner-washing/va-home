(() => {
  "use strict";

  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

  const VERSION = "16.4.9";
  const UPDATE_INTERVAL = 30 * 60 * 1000;
  let lastUpdateCheck = 0;
  let refreshing = false;

  function showUpdate(registration) {
    if (document.querySelector(".admin-pwa-update")) return;

    const bar = document.createElement("div");
    bar.className = "admin-pwa-update";
    bar.setAttribute("role", "status");
    bar.innerHTML = "<span>Доступне оновлення VA HOME Admin.</span><button type=\"button\">Оновити зараз</button>";
    bar.querySelector("button").addEventListener("click", () => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
    document.body.appendChild(bar);
  }

  function checkForUpdate(registration, force = false) {
    const now = Date.now();
    if (!force && now - lastUpdateCheck < UPDATE_INTERVAL) return;

    lastUpdateCheck = now;
    registration.update().catch(() => {});
  }

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        `/admin/service-worker.js?v=${VERSION}`,
        { scope: "/admin/", updateViaCache: "none" }
      );

      if (registration.waiting) showUpdate(registration);

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdate(registration);
          }
        });
      });

      checkForUpdate(registration, true);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate(registration);
      });
      window.addEventListener("online", () => checkForUpdate(registration, true));
      window.addEventListener("pageshow", () => checkForUpdate(registration));
    } catch {
      // Admin remains usable in the browser if PWA registration is unavailable.
    }
  }, { once: true });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
})();
