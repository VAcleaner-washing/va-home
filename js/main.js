/* ==========================================================================
   VA HOME — main.js
   Injects shared header/footer, handles nav state, mobile menu,
   scroll behaviour, reveal-on-scroll, and small shared UI helpers.

   Every page includes:
     <div id="site-header" data-root="" data-active="home"></div>
     <div id="site-footer" data-root=""></div>
   `data-root` is "" on top-level pages and "../" inside /products/.
   `data-active` matches one of: home, catalog, collections, discovery,
   guide, about, delivery, contacts.
   ========================================================================== */

(function () {
  "use strict";

  const NAV_ITEMS = [
    { key: "home", label: "Головна", href: "index.html" },
    { key: "catalog", label: "Каталог", href: "catalog.html" },
    { key: "collections", label: "Колекції", href: "collections.html" },
    { key: "discovery", label: "Discovery Set", href: "discovery-set.html" },
    { key: "guide", label: "Підбір аромату", href: "scent-guide.html" },
    { key: "about", label: "Про VA HOME", href: "about.html" },
    { key: "delivery", label: "Доставка і оплата", href: "delivery.html" },
    { key: "contacts", label: "Контакти", href: "contacts.html" }
  ];

  function iconSearch() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  }
  function iconBag() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`;
  }
  function iconInstagram() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg>`;
  }

  function renderHeader(root, active) {
    const navLinks = NAV_ITEMS.map(
      (item) =>
        `<a href="${root}${item.href}"${item.key === active ? ' aria-current="page"' : ""}>${item.label}</a>`
    ).join("");

    const mobileLinks = NAV_ITEMS.map(
      (item) =>
        `<a href="${root}${item.href}"${item.key === active ? ' aria-current="page"' : ""}>${item.label}</a>`
    ).join("");

    return `
      <a class="skip-link" href="#main-content">Перейти до контенту</a>
      <header class="site-header" id="siteHeaderEl">
        <div class="container site-header__inner">
          <a href="${root}index.html" class="site-logo">VA<span>HOME</span></a>
          <nav class="main-nav" aria-label="Основна навігація">${navLinks}</nav>
          <div class="header-actions">
            <a class="header-phone" href="tel:+380953919569" aria-label="Зателефонувати VA HOME">+38 (095) 391-9569</a>
            <a class="icon-btn" href="${root}account.html" aria-label="Особистий кабінет"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/></svg></a>
            <a class="icon-btn cart-btn" href="${root}cart.html" aria-label="Кошик">
              ${iconBag()}
              <span class="cart-count" id="cartCount" data-count="0">0</span>
            </a>
            <a class="icon-btn" href="https://instagram.com/va_home.aroma" target="_blank" rel="noopener" aria-label="Instagram VA HOME">${iconInstagram()}</a>
            <button class="burger-btn" type="button" aria-label="Відкрити меню" aria-expanded="false" aria-controls="mobileMenu" id="burgerToggle">
              <span class="burger-btn__lines"><span></span><span></span><span></span></span>
            </button>
          </div>
        </div>
      </header>

      <div class="mobile-menu" id="mobileMenu">
        <div class="mobile-menu__top">
          <a href="${root}index.html" class="site-logo">VA<span>HOME</span></a>
          <button class="icon-btn" type="button" aria-label="Закрити меню" id="mobileMenuClose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
          </button>
        </div>
        <nav class="mobile-menu__nav" aria-label="Мобільна навігація">${mobileLinks}</nav>
        <div class="mobile-menu__footer">
          <a href="${root}account.html">Мій кабінет</a>
          <a href="tel:+380953919569">+38 (095) 391-9569</a>
          <a href="mailto:vahome.aroma@gmail.com">Email</a>
          <a href="https://instagram.com/va_home.aroma" target="_blank" rel="noopener">Instagram</a>
        </div>
      </div>
    `;
  }

  function renderFooter(root) {
    const year = new Date().getFullYear();
    const path = (window.location.pathname || '').toLowerCase();
    let footerVisualPath = 'images/pages/footer-home.webp';
    if (path.includes('/products/')) footerVisualPath = 'images/pages/footer-product.webp';
    else if (path.includes('collections')) footerVisualPath = 'images/pages/footer-collections.webp';
    else if (path.includes('catalog')) footerVisualPath = 'images/pages/footer-catalog.webp';
    else if (path.includes('discovery')) footerVisualPath = 'images/pages/footer-discovery.webp';
    else if (path.includes('scent-guide')) footerVisualPath = 'images/pages/footer-scent-guide.webp';
    else if (path.includes('about')) footerVisualPath = 'images/pages/footer-about.webp';
    else if (path.includes('delivery')) footerVisualPath = 'images/pages/footer-delivery.webp';
    else if (path.includes('contacts')) footerVisualPath = 'images/pages/footer-contacts.webp';
    const footerVisual = `${root}${footerVisualPath}`;
    return `
      <footer class="site-footer site-footer--editorial">
        <div class="container footer-statement" style="background-image:linear-gradient(90deg,rgba(7,7,6,.74) 0%,rgba(7,7,6,.54) 36%,rgba(7,7,6,.22) 68%,rgba(7,7,6,.10) 100%),url('${footerVisual}')">
          <p class="eyebrow">Invisible Luxury Atmosphere</p>
          <p class="footer-statement__title">Аромат, який не заповнює простір.<br>Він його завершує.</p>
          <a class="text-link" href="${root}scent-guide.html">Знайти свій аромат →</a>
        </div>
        <div class="container footer-grid">
          <div class="footer-brand">
            <a href="${root}index.html" class="site-logo">VA<span>HOME</span></a>
            <p class="footer-tagline">Полтава, Україна</p>
            <p class="footer-brand__note">Преміальні аромадифузори та атмосферні композиції для сучасного дому.</p>
          </div>
          <div class="footer-col">
            <h3 class="footer-col__title">Колекція</h3>
            <ul>
              <li><a href="${root}catalog.html">Усі аромати</a></li>
              <li><a href="${root}collections.html">Колекції</a></li>
              <li><a href="${root}discovery-set.html">Discovery Set</a></li>
              <li><a href="${root}scent-guide.html">Підбір аромату</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3 class="footer-col__title">Світ VA HOME</h3>
            <ul>
              <li><a href="${root}about.html">Філософія бренду</a></li>
              <li><a href="${root}guides/index.html">Journal</a></li>
              <li><a href="${root}delivery.html">Доставка й пакування</a></li>
              <li><a href="${root}contacts.html">Контакти</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3 class="footer-col__title">Допомога</h3>
            <ul>
              <li><a href="${root}order-status.html">Статус замовлення</a></li>
              <li><a href="${root}account.html">Мій кабінет</a></li>
              <li><a href="${root}offer.html">Публічна оферта</a></li>
              <li><a href="${root}privacy.html">Конфіденційність</a></li>
            </ul>
          </div>
          <div class="footer-col footer-col--contact">
            <h3 class="footer-col__title">Зв’язок</h3>
            <ul>
              <li><a href="https://instagram.com/va_home.aroma" target="_blank" rel="noopener">Instagram ↗</a></li>
              <li><a href="tel:+380953919569">+38 (095) 391-9569</a></li>
              <li><a href="mailto:vahome.aroma@gmail.com">vahome.aroma@gmail.com</a></li>
            </ul>
            <p>Щодня, 9:00–19:00</p>
          </div>
        </div>
        <div class="container footer-bottom">
          <span>&copy; <span id="footerYear">${year}</span> VA HOME</span>
          <span>Створено в Полтаві. Відправляємо по Україні.</span>
        </div>
      </footer>
    `;
  }

  function mountHeaderFooter() {
    const headerEl = document.getElementById("site-header");
    const footerEl = document.getElementById("site-footer");
    if (headerEl) {
      const root = headerEl.getAttribute("data-root") || "";
      window.VA_HOME_ROOT = root;
      const active = headerEl.getAttribute("data-active") || "";
      headerEl.outerHTML = renderHeader(root, active);
    }
    if (footerEl) {
      const root = footerEl.getAttribute("data-root") || "";
      footerEl.outerHTML = renderFooter(root);
    }
  }

  function initHeaderScroll() {
    const header = document.getElementById("siteHeaderEl");
    if (!header) return;
    const onScroll = () => {
      if (window.scrollY > 12) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initMobileMenu() {
    const burger = document.getElementById("burgerToggle");
    const menu = document.getElementById("mobileMenu");
    const closeBtn = document.getElementById("mobileMenuClose");
    if (!burger || !menu) return;

    function setBackgroundInert(isInert) {
      const main = document.getElementById("main-content");
      const footer = document.querySelector(".site-footer");
      [main, footer].forEach((el) => {
        if (!el) return;
        if (isInert) el.setAttribute("inert", "");
        else el.removeAttribute("inert");
      });
    }

    function openMenu() {
      menu.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");
      setBackgroundInert(true);
      const firstLink = menu.querySelector("a");
      if (firstLink) firstLink.focus();
    }

    function closeMenu() {
      menu.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
      setBackgroundInert(false);
      burger.focus();
    }

    burger.addEventListener("click", () => {
      const isOpen = menu.classList.contains("is-open");
      isOpen ? closeMenu() : openMenu();
    });
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    menu.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  }

  function initRevealOnScroll() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((el) => observer.observe(el));
  }

  function initHeroSlider() {
    const hero = document.querySelector("[data-hero-slider]");
    if (!hero) return;

    const slides = Array.from(hero.querySelectorAll(".hero-slide"));
    const dotsContainers = Array.from(hero.querySelectorAll("[data-hero-dots]"));
    if (!slides.length) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const imagePromises = new Map();

    function prepareImage(slide, index) {
      const img = slide.querySelector(".hero-slide__media img");
      if (!img) {
        slide.classList.add("is-media-ready", "is-media-missing");
        return Promise.resolve(false);
      }

      // The three home hero images are above-the-fold carousel assets. Native
      // lazy loading can leave hidden slides unpainted on iOS Safari, so all
      // of them are requested immediately while only slide 1 gets high priority.
      img.loading = "eager";
      img.fetchPriority = index === 0 ? "high" : "low";

      const promise = new Promise((resolve) => {
        const finish = (ok) => {
          slide.classList.add("is-media-ready");
          if (!ok) slide.classList.add("is-media-missing");
          resolve(ok);
        };

        if (img.complete) {
          finish(img.naturalWidth > 0);
          return;
        }

        img.addEventListener("load", () => finish(true), { once: true });
        img.addEventListener("error", () => finish(false), { once: true });

        // Explicit preload protects local previews and older WebKit builds.
        const preload = new Image();
        preload.decoding = "async";
        preload.src = img.currentSrc || img.src;
      });

      imagePromises.set(slide, promise);
      return promise;
    }

    slides.forEach(prepareImage);

    let current = slides.findIndex((slide) => slide.classList.contains("is-active"));
    if (current < 0) current = 0;
    let timer = null;
    let changing = false;
    const AUTO_DELAY = 7000;

    function renderDots() {
      const html = slides.map((_, index) => (
        `<button type="button" aria-current="${index === current}" aria-label="Показати слайд ${index + 1}">${String(index + 1).padStart(2, "0")}</button>`
      )).join("");

      dotsContainers.forEach((container) => {
        container.innerHTML = html;
        container.querySelectorAll("button").forEach((button, index) => {
          button.addEventListener("click", () => goTo(index, true));
        });
      });
    }

    async function waitForMedia(slide) {
      const load = imagePromises.get(slide) || Promise.resolve(true);
      // Never hold navigation indefinitely on a slow or broken connection.
      return Promise.race([
        load,
        new Promise((resolve) => window.setTimeout(() => resolve(false), 2500))
      ]);
    }

    async function goTo(index, userInitiated = false) {
      if (changing) return;
      const next = (index + slides.length) % slides.length;
      if (next === current) return;

      changing = true;
      await waitForMedia(slides[next]);

      const outgoing = slides[current];
      const incoming = slides[next];
      const TRANSITION_MS = prefersReducedMotion.matches ? 200 : 1050;

      // Keep both slides painted during the transition. The incoming image
      // comes forward from a soft blur while the outgoing image gently
      // recedes, creating a cinematic focus-pull instead of a plain fade.
      incoming.classList.add("is-active", "is-entering");
      incoming.setAttribute("aria-hidden", "false");
      incoming.querySelector(".hero-slide__content")?.classList.remove("is-visible");

      // Force the entering state to paint before starting the transition.
      void incoming.offsetWidth;

      outgoing.classList.add("is-leaving");
      outgoing.querySelector(".hero-slide__content")?.classList.remove("is-visible");
      incoming.classList.remove("is-entering");

      current = next;
      renderDots();

      window.requestAnimationFrame(() => {
        incoming.querySelector(".hero-slide__content")?.classList.add("is-visible");
        incoming.classList.remove("is-cinematic-running");
        void incoming.offsetWidth;
        incoming.classList.add("is-cinematic-running");
      });

      window.setTimeout(() => {
        outgoing.classList.remove("is-active", "is-leaving", "is-cinematic-running");
        outgoing.setAttribute("aria-hidden", "true");
        changing = false;
      }, TRANSITION_MS);

      if (userInitiated) restartAuto();
    }

    function stopAuto() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    function restartAuto() {
      stopAuto();
      if (document.hidden) return;
      // Reduced-motion users still receive automatic content rotation; CSS
      // removes the animated movement while preserving the carousel function.
      timer = window.setInterval(() => goTo(current + 1), AUTO_DELAY);
    }

    slides.forEach((slide, index) => {
      const isCurrent = index === current;
      slide.setAttribute("aria-hidden", isCurrent ? "false" : "true");
      slide.querySelector(".hero-slide__content")?.classList.toggle("is-visible", isCurrent);
      slide.classList.toggle("is-cinematic-running", isCurrent);
    });

    // Pause while the tab is hidden and while the user is interacting.
    document.addEventListener("visibilitychange", restartAuto);
    hero.addEventListener("focusin", stopAuto);
    hero.addEventListener("focusout", restartAuto);

    // Lightweight horizontal swipe for phones; vertical page scrolling stays intact.
    let touchStartX = 0;
    let touchStartY = 0;
    hero.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });
    hero.addEventListener("touchend", (event) => {
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        goTo(current + (dx < 0 ? 1 : -1), true);
      }
    }, { passive: true });

    prefersReducedMotion.addEventListener?.("change", restartAuto);
    renderDots();
    restartAuto();
  }

  function initProductGrids() {
    if (!window.VAHomeProducts || typeof getProduct !== "function") return;
    document.querySelectorAll("[data-product-grid]").forEach((grid) => {
      const ids = (grid.getAttribute("data-product-ids") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const root = grid.getAttribute("data-root") || "";
      const context = grid.getAttribute("data-context") || "home";
      const products = ids.map(getProduct).filter(Boolean);
      window.VAHomeProducts.renderProductGrid(
        `#${grid.id}`,
        products,
        root,
        { context }
      );
    });
  }

  function initAllAccordions() {
    document.querySelectorAll(".accordion").forEach((acc) => {
      if (acc.id) {
        window.VAHome.initAccordion(`#${acc.id}`);
      }
    });
  }

  // ---- Shared accordion (used by FAQ blocks) ----
  window.VAHome = window.VAHome || {};
  window.VAHome.initAccordion = function (containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.querySelectorAll(".accordion-item").forEach((item) => {
      const trigger = item.querySelector(".accordion-trigger");
      const panel = item.querySelector(".accordion-panel");
      if (!trigger || !panel) return;
      trigger.addEventListener("click", () => {
        const isOpen = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!isOpen));
        panel.style.maxHeight = isOpen ? "0px" : panel.scrollHeight + "px";
      });
    });
  };

  // ---- Shared toast ----
  window.VAHome.showToast = function (message) {
    let toast = document.getElementById("vaToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.id = "vaToast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2600);
  };

  function initAddToCartDelegation() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add-to-cart]");
      if (!btn) return;
      const id = btn.getAttribute("data-add-to-cart");
      const qty = parseInt(btn.getAttribute("data-add-to-cart-qty") || "1", 10);
      const label = btn.getAttribute("data-add-to-cart-label");

      if (window.Cart && typeof window.Cart.add === "function") {
        window.Cart.add(id, qty);
        if (window.Cart.refreshCountBadge) window.Cart.refreshCountBadge();
        if (window.VAHome && window.VAHome.showToast) {
          const product = typeof getProduct === "function" ? getProduct(id) : null;
          const name = (product && product.name) || label || "Товар";
          window.VAHome.showToast(`${name} додано в кошик`);
        }
      } else if (window.VAHome && window.VAHome.showToast) {
        window.VAHome.showToast("Кошик буде доступний найближчим часом");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    mountHeaderFooter();
    if (window.SITE_CONFIG && !document.querySelector('script[data-vahome-analytics]')) {
      const analyticsScript = document.createElement("script");
      analyticsScript.src = `${window.VA_HOME_ROOT || ""}js/analytics.js`;
      analyticsScript.dataset.vahomeAnalytics = "true";
      document.body.appendChild(analyticsScript);
    }
    initHeaderScroll();
    initMobileMenu();
    initProductGrids();
    initAllAccordions();
    initHeroSlider();
    initAddToCartDelegation();
    initRevealOnScroll();
    if (window.Cart && typeof window.Cart.refreshCountBadge === "function") {
      window.Cart.refreshCountBadge();
    }
    if (window.SITE_CONFIG && typeof PRODUCTS !== "undefined" && !document.querySelector('script[data-vahome-wishlist]')) {
      const script = document.createElement("script");
      script.src = `${document.querySelector("#site-header")?.dataset.root || ""}js/wishlist.js`;
      script.dataset.vahomeWishlist = "true";
      document.body.appendChild(script);
    }
  });

// Автоматичний редирект з .html на чисті URL (клієнтська сторона)
(function() {
    const path = window.location.pathname;

    if (path.endsWith('.html')) {
        let cleanUrl = path;

        // Прибираємо .html
        if (path.endsWith('index.html')) {
            cleanUrl = path.replace('index.html', '');
        } else {
            cleanUrl = path.slice(0, -5); // прибираємо .html
        }

        const newUrl = cleanUrl + window.location.search + window.location.hash;

        // Заміна URL без перезавантаження сторінки
        window.history.replaceState({}, document.title, newUrl);
    }
})();
})();
