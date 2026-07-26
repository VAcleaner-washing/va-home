(() => {
  'use strict';

  if (!('serviceWorker' in navigator)) return;
  if (!window.isSecureContext) return;

  let lastUpdateCheck = 0;
  const updateInterval = 60 * 60 * 1000;

  const checkForUpdate = (registration) => {
    const now = Date.now();
    if (now - lastUpdateCheck < updateInterval) return;

    lastUpdateCheck = now;
    registration.update().catch(() => {});
  };

  window.addEventListener(
    'load',
    () => {
      navigator.serviceWorker
        .register('/service-worker.js', {
          scope: '/',
          updateViaCache: 'none'
        })
        .then((registration) => {
          checkForUpdate(registration);

          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              checkForUpdate(registration);
            }
          });
        })
        .catch(() => {});
    },
    { once: true }
  );
})();
