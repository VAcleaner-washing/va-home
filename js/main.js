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
    { key: "guide", label: "Гід ароматів", href: "scent-guide.html" },
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
          <a href="${root}" class="site-logo">VA<span>HOME</span></a>
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
          <a href="${root}" class="site-logo">VA<span>HOME</span></a>
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
    return `
      <footer class="site-footer">
        <div class="container footer-grid">
          <div class="footer-brand">
            <div class="site-logo">VA<span>HOME</span></div>
            <p class="footer-tagline">Invisible Luxury Atmosphere</p>
          </div>
          <div class="footer-col">
            <h3 class="footer-col__title">Каталог</h3>
            <ul>
              <li><a href="${root}catalog.html">Усі аромати</a></li>
              <li><a href="${root}collections.html">Колекції</a></li>
              <li><a href="${root}discovery-set.html">Discovery Set</a></li>
              <li><a href="${root}scent-guide.html">Гід ароматів</a></li>
              <li><a href="${root}guides/index.html">Гіди й статті</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3 class="footer-col__title">Покупцям</h3>
            <ul>
              <li><a href="${root}delivery.html">Доставка й оплата</a></li>
              <li><a href="${root}offer.html">Публічна оферта</a></li>
              <li><a href="${root}privacy.html">Політика конфіденційності</a></li>
              <li><a href="${root}order-status.html">Статус замовлення</a></li>
              <li><a href="${root}account.html">Мій кабінет</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3 class="footer-col__title">Контакти</h3>
            <ul>
              <li><a href="${root}about.html">Про VA HOME</a></li>
              <li><a href="${root}contacts.html">Усі контакти</a></li>
              <li><a href="tel:+380953919569">+38 (095) 391-9569</a></li>
              <li><a href="mailto:vahome.aroma@gmail.com">vahome.aroma@gmail.com</a></li>
              <li><a href="https://instagram.com/va_home.aroma" target="_blank" rel="noopener">Instagram</a></li>
            </ul>
          </div>
        </div>
        <div class="container footer-bottom">
          <span>&copy; <span id="footerYear">${year}</span> VA HOME</span>
          <span>Усі права захищені. Копіювання матеріалів можливе лише за згодою власника сайту.</span>
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

    let current = slides.findIndex((s) => s.classList.contains("is-active"));
    if (current === -1) current = 0;
    let timer = null;
    const AUTO_DELAY = 7000;

    function renderDots() {
      if (!dotsContainers.length) return;
      const html = slides
        .map(
          (_, i) =>
            `<button type="button" aria-current="${i === current}" aria-label="Слайд ${i + 1}">${String(i + 1).padStart(2, "0")}</button>`
        )
        .join("");
      dotsContainers.forEach((container) => {
        container.innerHTML = html;
        container.querySelectorAll("button").forEach((btn, i) => {
          btn.addEventListener("click", () => goTo(i, true));
        });
      });
    }

    function goTo(index, userInitiated) {
      slides[current].classList.remove("is-active");
      current = (index + slides.length) % slides.length;
      slides[current].classList.add("is-active");
      renderDots();
      if (userInitiated) restartAuto();
    }

    function restartAuto() {
      clearInterval(timer);
      timer = setInterval(() => goTo(current + 1, false), AUTO_DELAY);
    }

    renderDots();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      restartAuto();
    }
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
