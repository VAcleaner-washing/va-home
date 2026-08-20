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
  ];  function iconBag() {
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
            <button class="icon-btn header-search-btn" type="button" aria-label="Пошук по VA HOME" aria-haspopup="dialog" aria-controls="siteSearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/></svg></button>
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
        <button class="mobile-menu__search-trigger" type="button" aria-haspopup="dialog" aria-controls="siteSearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/></svg><span>Пошук по VA HOME</span></button>
        <nav class="mobile-menu__nav" aria-label="Мобільна навігація">${mobileLinks}</nav>
        <div class="mobile-menu__footer">
          <a href="${root}account.html">Мій кабінет</a>
          <a href="tel:+380953919569">+38 (095) 391-9569</a>
          <a href="mailto:vahome.aroma@gmail.com">Email</a>
          <a href="${root}guides/yak-korystuvatis-dyfuzorom.html">Догляд за ароматом</a>
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
    else if (path.includes('/categories/')) footerVisualPath = 'images/pages/footer-catalog.webp';
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
              <li><a href="${root}room-ritual.html">Room Ritual</a></li>
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
            <h3 class="footer-col__title">Для простору</h3>
            <ul>
              <li><a href="${root}categories/aromadyfuzory-dlya-spalni.html">Для спальні</a></li>
              <li><a href="${root}categories/aromadyfuzory-dlya-vitalni.html">Для вітальні</a></li>
              <li><a href="${root}categories/aromadyfuzory-dlya-vannoi.html">Для ванної</a></li>
              <li><a href="${root}categories/podarunkovi-aromadyfuzory.html">На подарунок</a></li>
              <li><a href="${root}categories/hotelni-aromaty-dlya-domu.html">Готельні аромати</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3 class="footer-col__title">Допомога</h3>
            <ul>
              <li><a href="${root}order-status.html">Статус замовлення</a></li>
              <li><a href="${root}account.html">Мій кабінет</a></li>
              <li><a href="${root}guides/yak-korystuvatis-dyfuzorom.html">Догляд за ароматом</a></li>
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
        <div class="container footer-payment-trust" aria-label="Підтримувані платіжні системи">
          <div class="footer-payment-trust__provider"><span>Безпечна карткова оплата</span><img src="${root}images/payment/plata-by-mono.svg" width="116" height="24" alt="plata by mono" loading="lazy"></div>
          <div class="footer-payment-trust__brands">
            <img src="${root}images/payment/visa.svg" width="47" height="15" alt="Visa" loading="lazy">
            <img src="${root}images/payment/mastercard.svg" width="29" height="18" alt="Mastercard" loading="lazy">
            <img src="${root}images/payment/apple-pay.svg" width="43" height="18" alt="Apple Pay" loading="lazy">
            <img src="${root}images/payment/google-pay.svg" width="46" height="18" alt="Google Pay" loading="lazy">
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
      menu.scrollTop = 0;
      requestAnimationFrame(() => {
        menu.scrollTop = 0;
        closeBtn?.focus({ preventScroll: true });
      });
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

  function initSiteSearch() {
    const root = window.VA_HOME_ROOT || "";
    const headerSearch = document.querySelector(".header-search-btn");
    const mobileSearch = document.querySelector(".mobile-menu__search-trigger");
    if (!headerSearch && !mobileSearch) return;

    const normalizeSearch = (value) => String(value || "")
      .toLocaleLowerCase("uk-UA")
      .replace(/[’`]/g, "'")
      .replace(/[^a-zа-яіїєґ0-9'&+]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));

    const surface = document.createElement("section");
    surface.id = "siteSearch";
    surface.className = "site-search";
    surface.hidden = true;
    surface.setAttribute("role", "dialog");
    surface.setAttribute("aria-modal", "true");
    surface.setAttribute("aria-labelledby", "siteSearchTitle");
    surface.innerHTML = `
      <div class="site-search__backdrop" data-site-search-close></div>
      <div class="site-search__panel">
        <header class="site-search__header">
          <div><span class="eyebrow">VA HOME SEARCH</span><h2 id="siteSearchTitle">Знайдіть свій аромат</h2></div>
          <button type="button" class="site-search__close" data-site-search-close aria-label="Закрити пошук">×</button>
        </header>
        <div class="site-search__input-wrap">
          <span class="site-search__input-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/></svg></span>
          <input id="siteSearchInput" class="site-search__input" type="search" autocomplete="off" enterkeyhint="search" placeholder="Аромат, нота, кімната або тема…" aria-describedby="siteSearchHint">
          <button type="button" class="site-search__clear" aria-label="Очистити пошук" hidden>Очистити</button>
        </div>
        <p class="site-search__hint" id="siteSearchHint">Наприклад: Old Money, ожина, спальня, готельний аромат.</p>
        <div class="site-search__quick" aria-label="Швидкий пошук">
          <button type="button" data-search-query="Old Money">Old Money</button>
          <button type="button" data-search-query="готельний">Готельний</button>
          <button type="button" data-search-query="ожина">Ожина</button>
          <button type="button" data-search-query="спальня">Для спальні</button>
        </div>
        <div class="site-search__status" id="siteSearchStatus" aria-live="polite"></div>
        <div class="site-search__results" id="siteSearchResults"></div>
      </div>`;
    document.body.appendChild(surface);

    const input = surface.querySelector("#siteSearchInput");
    const results = surface.querySelector("#siteSearchResults");
    const status = surface.querySelector("#siteSearchStatus");
    const clearButton = surface.querySelector(".site-search__clear");
    const quick = surface.querySelector(".site-search__quick");
    let indexPromise = null;
    let searchIndex = [];
    let previousFocus = null;

    const loadIndex = () => {
      if (indexPromise) return indexPromise;
      indexPromise = fetch(`${root}data/search-index.json?v=16.4.6`, { credentials: "same-origin" })
        .then((response) => {
          if (!response.ok) throw new Error(`SEARCH_INDEX_${response.status}`);
          return response.json();
        })
        .then((payload) => {
          searchIndex = Array.isArray(payload?.items) ? payload.items : [];
          return searchIndex;
        })
        .catch(() => {
          searchIndex = [];
          return searchIndex;
        });
      return indexPromise;
    };

    const collectionLabel = (item) => item.eyebrow || (item.type === "product" ? "Аромат VA HOME" : "VA HOME");
    const scoreItem = (item, query) => {
      const q = normalizeSearch(query);
      if (!q) return 0;
      const terms = q.split(" ").filter(Boolean);
      const title = normalizeSearch(item.title);
      const description = normalizeSearch(item.description);
      const keywordText = normalizeSearch(Array.isArray(item.keywords) ? item.keywords.join(" ") : item.keywords);
      const haystack = `${title} ${description} ${keywordText}`;
      if (!terms.every((term) => haystack.includes(term))) return 0;
      let score = item.type === "product" ? 18 : 10;
      if (title === q) score += 120;
      else if (title.startsWith(q)) score += 90;
      else if (title.includes(q)) score += 65;
      terms.forEach((term) => {
        if (title.includes(term)) score += 18;
        if (description.includes(term)) score += 7;
        if (keywordText.includes(term)) score += 4;
      });
      return score;
    };

    const resultMarkup = (item) => {
      const href = `${root}${String(item.url || "").replace(/^\//, "")}`;
      const image = item.type === "product" && item.image
        ? `<span class="site-search-result__media"><img src="${root}${escapeHtml(item.image)}" alt="" loading="lazy"></span>`
        : `<span class="site-search-result__index" aria-hidden="true">${item.type === "guide" ? "J" : item.type === "category" ? "C" : "VA"}</span>`;
      return `<a class="site-search-result" href="${escapeHtml(href)}" data-search-result-type="${escapeHtml(item.type)}" data-search-result-title="${escapeHtml(item.title)}">
        ${image}
        <span class="site-search-result__copy"><small>${escapeHtml(collectionLabel(item))}</small><strong>${escapeHtml(item.title)}</strong><em>${escapeHtml(item.description || "Відкрити сторінку VA HOME")}</em></span>
        <span class="site-search-result__arrow" aria-hidden="true">→</span>
      </a>`;
    };

    const render = async () => {
      const query = input.value.trim();
      clearButton.hidden = !query;
      quick.hidden = Boolean(query);
      if (!query) {
        status.textContent = "";
        results.innerHTML = `<div class="site-search__empty"><span>Пошук без зайвого шуму</span><p>Введіть назву аромату, ноту, кімнату або питання про VA HOME.</p></div>`;
        return;
      }
      status.textContent = "Шукаємо…";
      const items = await loadIndex();
      const ranked = items
        .map((item) => ({ item, score: scoreItem(item, query) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || String(a.item.title).localeCompare(String(b.item.title), "uk"))
        .slice(0, 12)
        .map((entry) => entry.item);
      if (!ranked.length) {
        status.textContent = "Нічого не знайдено";
        results.innerHTML = `<div class="site-search__empty"><span>Спробуйте інакше</span><p>Напишіть назву аромату, одну ноту або кімнату — наприклад «сандал», «ванна» чи «Pure Zen».</p><a href="${root}catalog.html">Перейти до каталогу →</a></div>`;
        return;
      }
      const productCount = ranked.filter((item) => item.type === "product").length;
      status.textContent = `${ranked.length} ${ranked.length === 1 ? "результат" : "результатів"}${productCount ? ` · ${productCount} ароматів` : ""}`;
      results.innerHTML = ranked.map(resultMarkup).join("");
    };

    let renderTimer = 0;
    input.addEventListener("input", () => {
      clearTimeout(renderTimer);
      renderTimer = window.setTimeout(render, 80);
    });
    clearButton.addEventListener("click", () => {
      input.value = "";
      render();
      input.focus();
    });
    quick.querySelectorAll("[data-search-query]").forEach((button) => button.addEventListener("click", () => {
      input.value = button.dataset.searchQuery || "";
      render();
      input.focus();
    }));
    results.addEventListener("click", (event) => {
      const link = event.target.closest("[data-search-result-title]");
      if (!link) return;
      window.VAAnalytics?.event?.("search_result_click", {
        search_term: input.value.trim(),
        content_type: link.dataset.searchResultType || "page",
        item_name: link.dataset.searchResultTitle || ""
      });
    });

    const releaseBackground = () => {
      [document.getElementById("main-content"), document.querySelector(".site-footer")].forEach((element) => element?.removeAttribute("inert"));
    };
    const closeSearch = () => {
      if (surface.hidden) return;
      surface.classList.remove("is-open");
      document.body.classList.remove("site-search-open");
      releaseBackground();
      window.setTimeout(() => { surface.hidden = true; }, 180);
      previousFocus?.focus?.();
    };
    const closeMobileMenuIfNeeded = () => {
      const menu = document.getElementById("mobileMenu");
      const burger = document.getElementById("burgerToggle");
      if (menu?.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        burger?.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
        releaseBackground();
      }
    };
    const openSearch = (opener) => {
      previousFocus = opener || document.activeElement;
      closeMobileMenuIfNeeded();
      surface.hidden = false;
      requestAnimationFrame(() => surface.classList.add("is-open"));
      document.body.classList.add("site-search-open");
      [document.getElementById("main-content"), document.querySelector(".site-footer")].forEach((element) => element?.setAttribute("inert", ""));
      loadIndex();
      render();
      window.setTimeout(() => input.focus(), 40);
      window.VAAnalytics?.event?.("search_open", { location: opener?.classList?.contains("mobile-menu__search-trigger") ? "mobile_menu" : "header" });
    };

    [headerSearch, mobileSearch].filter(Boolean).forEach((button) => button.addEventListener("click", () => openSearch(button)));
    surface.querySelectorAll("[data-site-search-close]").forEach((button) => button.addEventListener("click", closeSearch));
    surface.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSearch();
      if (event.key !== "Tab") return;
      const focusable = [...surface.querySelectorAll('button:not([hidden]),input,a[href]')].filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
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



  function initHomeCollectionsCarousel() {
    const track = document.querySelector('.home-page .collections-grid');
    const dots = Array.from(document.querySelectorAll('.collection-carousel__dots span'));
    if (!track || !dots.length) return;

    const cards = Array.from(track.querySelectorAll('.collection-card'));
    if (!cards.length) return;

    const setActive = (index) => {
      dots.forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === index));
    };

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const trackLeft = track.getBoundingClientRect().left;
        let closestIndex = 0;
        let closestDistance = Infinity;
        cards.forEach((card, index) => {
          const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });
        setActive(closestIndex);
      });
    };

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

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
    initSiteSearch();
    initProductGrids();
    initAllAccordions();
    initHeroSlider();
    initHomeCollectionsCarousel();
    initAddToCartDelegation();
    initRevealOnScroll();
    if (window.Cart && typeof window.Cart.refreshCountBadge === "function") {
      window.Cart.refreshCountBadge();
    }
    if (window.SITE_CONFIG && typeof PRODUCTS !== "undefined" && !document.querySelector('script[data-vahome-wishlist]')) {
      const script = document.createElement("script");
      script.src = `${window.VA_HOME_ROOT || ""}js/wishlist.js?v=16.4.6`;
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
