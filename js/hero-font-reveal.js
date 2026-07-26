(() => {
  const root = document.documentElement;
  let revealed = false;

  const reveal = () => {
    if (revealed) return;
    revealed = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('va-hero-fonts-loading');
        root.classList.add('va-hero-fonts-ready');
      });
    });
  };

  // Never leave the hero copy hidden on a slow or failed font request.
  const safetyTimer = window.setTimeout(reveal, 1600);

  if (!document.fonts || !document.fonts.load) {
    window.clearTimeout(safetyTimer);
    reveal();
    return;
  }

  Promise.allSettled([
    document.fonts.load('500 72px "Cormorant Garamond"', 'VA HOME Атмосфера простору'),
    document.fonts.load('400 16px Manrope', 'VA HOME аромат для вашого простору')
  ]).then(() => {
    window.clearTimeout(safetyTimer);
    reveal();
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) reveal();
  }, { once: true });
})();
