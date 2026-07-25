(() => {
  'use strict';

  // VA HOME v13.7.0 RC17 — iOS standalone PWA viewport paint fix.
  //
  // Cold-launching the installed PWA paints the hero before iOS has settled
  // its viewport metrics, so 100dvh/100svh resolves short and the window's
  // near-black background (#0b0a08) shows as a black strip below the fold.
  // A pull-to-refresh forces a composite and the strip disappears — proof it
  // is a paint-timing issue, not a layout-size one.
  //
  // Fix: expose the real, stable window height as --app-vh (used by the hero),
  // and force one lightweight repaint once the metrics settle. No transform on
  // <html> — that earlier hack was the thing that could leave a black strip.

  const root = document.documentElement;

  const isStandalone = () =>
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  // window.innerHeight is the stable layout viewport in standalone mode and,
  // unlike visualViewport.height, does not shrink when the keyboard opens —
  // so the full-height hero never collapses while a field is focused.
  const setAppVh = () => {
    const h = Math.round(window.innerHeight);
    if (h > 0) root.style.setProperty('--app-vh', h + 'px');
  };

  // Re-measure, then flush layout to make iOS composite the full window height.
  const nudge = () => {
    setAppVh();
    void root.offsetHeight;
  };

  setAppVh();

  window.addEventListener('load', nudge);
  window.addEventListener('resize', setAppVh);
  window.addEventListener('orientationchange', () => window.setTimeout(nudge, 200));
  window.addEventListener('pageshow', nudge);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setAppVh);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') nudge();
  });

  // Cold-launch settle: viewport metrics are not final on the first frame,
  // so re-run a few times shortly after launch in the installed app.
  if (isStandalone()) {
    [120, 350, 700].forEach((t) => window.setTimeout(nudge, t));
  }
})();
