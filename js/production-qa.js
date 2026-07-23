/* VA HOME v12.0 RC2 — non-invasive production hardening. */
(() => {
  'use strict';

  const init = () => {
    // Prevent accidental submissions from presentational controls created at runtime.
    document.querySelectorAll('button:not([type])').forEach((button) => {
      button.type = 'button';
    });

    // Security baseline for links opened in a new tab.
    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      link.setAttribute('rel', [...rel].join(' '));
    });

    // Accessible names for icon-only close/remove controls.
    const labels = [
      ['.va-compare-modal__close', 'Закрити порівняння'],
      ['.va-compare-card__remove', 'Прибрати аромат із порівняння'],
      ['.discovery-picker__close', 'Закрити вибір ароматів'],
      ['.admin-dialog__close', 'Закрити вікно']
    ];
    labels.forEach(([selector, label]) => {
      document.querySelectorAll(selector).forEach((control) => {
        if (!control.getAttribute('aria-label')) control.setAttribute('aria-label', label);
      });
    });

    // Announce the current page to assistive technologies where nav is static.
    const currentPath = location.pathname.replace(/\/$/, '/index.html');
    document.querySelectorAll('a[href]').forEach((link) => {
      try {
        const linkPath = new URL(link.href, location.href).pathname.replace(/\/$/, '/index.html');
        if (linkPath === currentPath && !link.hasAttribute('aria-current')) {
          link.setAttribute('aria-current', 'page');
        }
      } catch (_) { /* Ignore malformed third-party URLs. */ }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
