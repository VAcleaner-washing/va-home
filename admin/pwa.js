(() => {
  'use strict';
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  const VERSION = '13.8.16';
  let refreshing = false;

  const showUpdate = (registration) => {
    if (document.querySelector('.admin-pwa-update')) return;
    const bar = document.createElement('div');
    bar.className = 'admin-pwa-update';
    bar.setAttribute('role', 'status');
    bar.innerHTML = `<span>Доступне оновлення VA HOME Admin.</span><button type="button">Оновити зараз</button>`;
    bar.querySelector('button').addEventListener('click', () => {
      const worker = registration.waiting;
      if (worker) worker.postMessage({ type: 'SKIP_WAITING' });
    });
    document.body.appendChild(bar);
  };

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`/admin/service-worker.js?v=${VERSION}`, {
        scope: '/admin/',
        updateViaCache: 'none'
      });

      if (registration.waiting) showUpdate(registration);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(registration);
        });
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    } catch (_) { /* admin stays usable in browser */ }
  }, { once: true });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
})();
