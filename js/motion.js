/* VA HOME v11.8.8 — stable, restrained motion layer. */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const wideScreen = window.matchMedia("(min-width: 901px)");
  const observed = new WeakSet();
  let revealObserver = null;

  function setStaggerIndexes(root = document) {
    root.querySelectorAll("[data-motion-stagger]").forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        child.style.setProperty("--motion-index", String(Math.min(index, 8)));
      });
    });
  }

  function enhanceExistingGroups(root = document) {
    const staggerSelectors = [
      ".brand-facts__grid",
      ".collections-grid",
      ".product-grid",
      ".journal-grid",
      ".reviews-grid",
      ".footer-grid"
    ];

    staggerSelectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach((el) => {
        el.setAttribute("data-motion-stagger", "");
        // A stagger container must not also animate as one large reveal block.
        // Double transforms were the main source of visible snapping.
        el.classList.remove("reveal");
      });
    });

    setStaggerIndexes(root);
  }

  function revealAboveFold(root = document) {
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    root.querySelectorAll(".reveal, [data-motion-reveal], [data-motion-stagger]").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < viewport * 0.94 && rect.bottom > 0) el.classList.add("is-visible");
    });
  }

  function getRevealObserver() {
    if (revealObserver || reduceMotion.matches || !("IntersectionObserver" in window)) return revealObserver;
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -4% 0px", threshold: 0.04 });
    return revealObserver;
  }

  function initRevealObserver(root = document) {
    const items = root.querySelectorAll(".reveal, [data-motion-reveal], [data-motion-stagger]");
    if (!items.length) return;

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = getRevealObserver();
    items.forEach((el) => {
      if (el.classList.contains("is-visible") || observed.has(el)) return;
      observed.add(el);
      observer.observe(el);
    });
  }

  function initCartPulse() {
    const badge = document.getElementById("cartCount");
    if (!badge || !("MutationObserver" in window) || reduceMotion.matches) return;
    let previous = badge.textContent;
    const observer = new MutationObserver(() => {
      if (badge.textContent === previous) return;
      previous = badge.textContent;
      badge.classList.remove("is-pulsing");
      requestAnimationFrame(() => badge.classList.add("is-pulsing"));
    });
    observer.observe(badge, { childList: true, characterData: true, subtree: true });
    badge.addEventListener("animationend", () => badge.classList.remove("is-pulsing"));
  }

  function pauseAnimationsWhenHidden() {
    const animated = document.querySelectorAll(
      ".hero--editorial .hero-slide__media img, .scent-experience__hero-media img, .collections-v2-hero__media img"
    );
    if (!animated.length) return;
    document.addEventListener("visibilitychange", () => {
      animated.forEach((node) => {
        node.style.animationPlayState = document.hidden ? "paused" : "running";
      });
    });
  }

  function watchDynamicContent() {
    const main = document.getElementById("main-content");
    if (!main || !("MutationObserver" in window)) return;
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        enhanceExistingGroups(main);
        revealAboveFold(main);
        initRevealObserver(main);
        queued = false;
      });
    });
    observer.observe(main, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Prepare classes before enabling motion CSS. This prevents the first-paint
    // flash where visible content briefly disappears and jumps back in.
    enhanceExistingGroups();
    revealAboveFold();
    document.documentElement.classList.add("motion-ready");
    initRevealObserver();
    initCartPulse();
    pauseAnimationsWhenHidden();
    watchDynamicContent();
  });
})();
