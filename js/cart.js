/* ==========================================================================
   VA HOME — cart.js
   localStorage-backed cart. Exposes window.Cart, used by:
     - the generic [data-add-to-cart] delegation in main.js
     - product.js (product page "Додати в кошик")
     - cart.html (line items, quantities, checkout)
   ========================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = (window.SITE_CONFIG && window.SITE_CONFIG.cartStorageKey) || "vahome_cart_v1";
  const FREE_SHIPPING_THRESHOLD = 1500;
  const PROMO_STORAGE_KEY = "vahome_checkout_promo_v1";

  function normalizePromoCode(value) {
    return String(value || "").trim().toLocaleLowerCase("uk-UA");
  }

  function readAppliedPromo() {
    try { const raw=sessionStorage.getItem(PROMO_STORAGE_KEY); const parsed=raw?JSON.parse(raw):null; return parsed&&parsed.code?parsed:null; } catch (_) { return null; }
  }
  function readAppliedPromoCode(){ return normalizePromoCode(readAppliedPromo()?.code || ""); }
  function writeAppliedPromo(value) {
    try { if(value&&value.code) sessionStorage.setItem(PROMO_STORAGE_KEY,JSON.stringify(value)); else sessionStorage.removeItem(PROMO_STORAGE_KEY); } catch (_) {}
  }
  function writeAppliedPromoCode(value){ if(!value) writeAppliedPromo(null); }

  function resetCheckoutRequestId() {
    try { sessionStorage.removeItem("vahome_checkout_request_id"); } catch (_) {}
  }

  function pricingFor(items) {
    const safeItems = Array.isArray(items) ? items : [];
    const subtotal = safeItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const promo = readAppliedPromo();
    const promoCode = normalizePromoCode(promo?.code || "");
    const discount = promoCode ? Math.min(Number(promo.discount_amount || 0), subtotal) : 0;
    return { subtotal, promoCode, discount, total: Math.max(0, subtotal - discount), freeShipping: Boolean(promo?.free_shipping) };
  }

  // Non-catalog items sellable from the cart (Discovery Set variants).
  // Keep this list in sync with the buttons on discovery-set.html.
  const SPECIAL_ITEMS = {
    "discovery-6": { name: "Discovery Set — 6 ароматів", price: 150, volume: "6 тестерів", image: "images/discovery/discovery-set.webp" },
    "discovery-18": { name: "Discovery Set — 18 ароматів", price: 450, volume: "18 тестерів", image: "images/discovery/discovery-set.webp" }
  };

  function readRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.map((item) => item && item.productId === "discovery-17" ? { ...item, productId: "discovery-18" } : item)
        : [];
    } catch (e) {
      return [];
    }
  }

  function writeRaw(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      resetCheckoutRequestId();
      return true;
    } catch (e) {
      return false;
    }
  }

  function clamp(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return 1;
    return Math.max(1, Math.min(10, n));
  }

  function getItemInfo(id) {
    if (typeof getProduct === "function") {
      const product = getProduct(id);
      if (product) {
        return {
          id: product.id,
          name: product.name,
          price: getProductPrice(product),
          volume: getProductVolume(product),
          url: `products/${product.id}.html`,
          image: product.images && product.images.main ? product.images.main : null
        };
      }
    }
    if (SPECIAL_ITEMS[id]) {
      return { id, url: null, ...SPECIAL_ITEMS[id] };
    }
    return null;
  }

  function add(id, qty, options) {
    const items = readRaw();
    const existing = items.find((i) => i.productId === id);
    if (existing) {
      existing.quantity = id === "discovery-6" && options && Array.isArray(options.selections) ? 1 : clamp(existing.quantity + (qty || 1));
      if (options && Array.isArray(options.selections)) existing.selections = options.selections.slice();
    } else {
      items.push({ productId: id, quantity: clamp(qty || 1), selections: options && Array.isArray(options.selections) ? options.selections.slice() : undefined });
    }
    writeRaw(items);
    window.VAAnalytics?.addToCart?.(id, clamp(qty || 1));
  }

  function remove(id) {
    const current = readRaw().find((i) => i.productId === id);
    const items = readRaw().filter((i) => i.productId !== id);
    writeRaw(items);
    if (current) window.VAAnalytics?.removeFromCart?.(id, current.quantity || 1);
  }

  function updateQty(id, qty) {
    const q = parseInt(qty, 10);
    if (!q || q <= 0) {
      remove(id);
      return;
    }
    const items = readRaw();
    const existing = items.find((i) => i.productId === id);
    if (existing) {
      existing.quantity = clamp(q);
      writeRaw(items);
    }
  }

  function clear() {
    writeRaw([]);
  }

  function getItems() {
    return readRaw()
      .map((entry) => {
        const info = getItemInfo(entry.productId);
        if (!info) return null;
        return {
          id: info.id,
          name: info.name,
          price: info.price,
          volume: info.volume,
          url: info.url,
          image: info.image || null,
          quantity: entry.quantity,
          selections: Array.isArray(entry.selections) ? entry.selections.slice() : [],
          lineTotal: (info.price || 0) * entry.quantity
        };
      })
      .filter(Boolean);
  }

  function getTotal() {
    return getItems().reduce((sum, item) => sum + item.lineTotal, 0);
  }

  function getCount() {
    return readRaw().reduce((sum, entry) => sum + (entry.quantity || 0), 0);
  }

  function refreshCountBadge() {
    const count = getCount();
    document.querySelectorAll("#cartCount").forEach((el) => {
      el.textContent = String(count);
      el.setAttribute("data-count", String(count));
    });
  }

  window.Cart = {
    add,
    remove,
    updateQty,
    clear,
    getItems,
    getTotal,
    getCount,
    refreshCountBadge
  };

  // ==========================================================================
  // Cart page rendering (cart.html only — guarded by element presence)
  // ==========================================================================

  function formatUAH(n) {
    return `${n}\u00A0грн`;
  }

  function itemWord(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "товар";
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "товари";
    return "товарів";
  }

  function syncShippingCopy(pricing) {
    const method = document.getElementById("deliveryMethod")?.value || "nova_poshta_branch";
    const courier = method === "nova_poshta_courier";
    const branchFree = !courier && pricing.subtotal >= FREE_SHIPPING_THRESHOLD;
    const deliveryLabel = document.getElementById("cartDeliveryLabel");
    const summaryNote = document.getElementById("cartShippingNote");
    const methodHint = document.getElementById("deliveryMethodHint");
    const reassurance = document.getElementById("checkoutDeliveryCopy");

    if (deliveryLabel) deliveryLabel.textContent = branchFree ? "Безкоштовно" : "За тарифами НП";
    if (summaryNote) {
      summaryNote.textContent = courier
        ? "Кур’єрська доставка оплачується за тарифами Нової пошти незалежно від суми замовлення."
        : branchFree
          ? "Безкоштовна доставка у відділення або поштомат активована."
          : "Для замовлень від 1500 грн доставка у відділення або поштомат — за наш рахунок.";
    }
    if (methodHint) {
      methodHint.textContent = courier
        ? "Кур’єрська доставка оплачується за тарифами Нової пошти незалежно від суми замовлення."
        : branchFree
          ? "Безкоштовна доставка у відділення або поштомат активована."
          : "Доставка у відділення або поштомат — за тарифами Нової пошти. Від 1500 грн — за наш рахунок.";
    }
    if (reassurance) {
      reassurance.innerHTML = courier
        ? "<strong>Доставка:</strong> кур’єром — за тарифами Нової пошти."
        : branchFree
          ? "<strong>Доставка:</strong> у відділення або поштомат — безкоштовно."
          : "<strong>Доставка:</strong> у відділення або поштомат — безкоштовно від 1500 грн.";
    }
  }

  function updatePremiumCheckoutUI(items) {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const countLabel = document.getElementById("cartItemCountLabel");
    if (countLabel) countLabel.textContent = `${count} ${itemWord(count)}`;

    const pricing = pricingFor(items);
    const subtotalEl = document.getElementById("cartSubtotal");
    const totalEl = document.getElementById("cartTotal");
    if (subtotalEl) subtotalEl.textContent = formatUAH(pricing.subtotal);
    if (totalEl) totalEl.textContent = formatUAH(pricing.total);
    [document.getElementById("checkoutButtonTotal"), document.getElementById("checkoutMobileTotal")].forEach((el) => {
      if (el) el.textContent = formatUAH(pricing.total);
    });

    const promoRow = document.getElementById("cartPromoRow");
    const promoLabel = document.getElementById("cartPromoCodeLabel");
    const promoDiscount = document.getElementById("cartPromoDiscount");
    if (promoRow) promoRow.hidden = !pricing.discount;
    if (promoLabel) promoLabel.textContent = pricing.promoCode ? pricing.promoCode.toUpperCase() : "";
    if (promoDiscount) promoDiscount.textContent = pricing.discount ? `−${formatUAH(pricing.discount)}` : "−0 грн";

    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - pricing.subtotal);
    const progress = Math.min(100, (pricing.subtotal / FREE_SHIPPING_THRESHOLD) * 100);
    const progressWrap = document.getElementById("shippingProgress");
    const progressBar = document.getElementById("shippingProgressBar");
    const progressText = document.getElementById("shippingProgressText");
    const progressValue = document.getElementById("shippingProgressValue");
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressWrap) progressWrap.classList.toggle("is-complete", remaining === 0);
    if (progressText) progressText.textContent = remaining === 0 ? "Безкоштовна доставка у відділення активована" : "До безкоштовної доставки у відділення";
    if (progressValue) progressValue.textContent = remaining === 0 ? "Готово" : formatUAH(remaining);
    syncShippingCopy(pricing);

    const mobileBar = document.getElementById("checkoutMobileBar");
    if (mobileBar) {
      const hasItems = Boolean(items.length);
      mobileBar.dataset.hasItems = hasItems ? "true" : "false";
      const checkoutActive = document.body.classList.contains("va-checkout-form-active");
      const shouldShow = hasItems && window.innerWidth <= 800 && !checkoutActive;
      mobileBar.hidden = !shouldShow;
    }
  }

  function renderCartPage() {
    const itemsList = document.getElementById("cartItemsList");
    if (!itemsList) return; // not on cart.html

    const items = getItems();
    const emptyState = document.getElementById("cartEmptyState");
    const filledState = document.getElementById("cartFilledState");

    if (!items.length) {
      if (emptyState) emptyState.hidden = false;
      if (filledState) filledState.hidden = true;
      const progress = document.querySelector(".checkout-progress");
      if (progress) progress.hidden = true;
      const mobileBar = document.getElementById("checkoutMobileBar");
      if (mobileBar) {
        mobileBar.dataset.hasItems = 'false';
        mobileBar.hidden = true;
      }
      document.body.classList.remove('va-mobile-checkout-bar-visible', 'va-checkout-form-active');
      return;
    }

    if (emptyState) emptyState.hidden = true;
    if (filledState) filledState.hidden = false;
    const progress = document.querySelector(".checkout-progress");
    if (progress) progress.hidden = false;

    const upsell = document.getElementById("cartDiscoveryUpsell");
    if (upsell) {
      const hasDiscovery = items.some((item) => item.id.startsWith("discovery-"));
      upsell.hidden = hasDiscovery;
    }

    itemsList.innerHTML = items
      .map((item) => {
        const detailUrl = item.url || (String(item.id).startsWith("discovery-") ? "discovery-set.html" : "");
        const image = item.image
          ? `<img class="fill-img" src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.parentElement.classList.add('placeholder-media');this.remove();">`
          : `<span>${item.name}</span>`;
        const media = detailUrl ? `<a href="${detailUrl}" aria-label="Переглянути ${item.name}">${image}</a>` : image;
        const name = detailUrl ? `<a href="${detailUrl}">${item.name}</a>` : item.name;
        const editDiscovery = String(item.id).startsWith("discovery-")
          ? `<a class="cart-item__edit" href="discovery-set.html">Змінити набір</a>`
          : "";
        return `
        <div class="cart-item" data-cart-item="${item.id}">
          <div class="cart-item__media${item.image ? "" : " placeholder-media"}">${media}</div>
          <div>
            <p class="cart-item__name">${name}</p>
            <p class="cart-item__meta">${item.volume || ""}</p>
            ${item.selections.length ? `<p class="cart-item__selection"><strong>Обрані аромати:</strong> ${item.selections.map(id=>{const p=typeof getProduct==="function"?getProduct(id):null;return p?p.name:id}).join(" · ")}</p>` : ""}
            ${editDiscovery}
            <div class="cart-item__controls">
              <div class="qty-stepper">
                <button type="button" class="cart-qty-minus" aria-label="Зменшити кількість">−</button>
                <input type="text" class="cart-qty-input" value="${item.quantity}" inputmode="numeric" aria-label="Кількість">
                <button type="button" class="cart-qty-plus" aria-label="Збільшити кількість">+</button>
              </div>
              <button type="button" class="cart-item__remove">Видалити</button>
            </div>
          </div>
          <div class="cart-item__price-col">${formatUAH(item.lineTotal)}</div>
        </div>`;
      })
      .join("");

    updatePremiumCheckoutUI(items);

    refreshCountBadge();
  }

  let undoTimer = 0;

  function showUndoRemoval(entry, label) {
    if (!entry) return;
    let toast = document.getElementById("cartUndoToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "cartUndoToast";
      toast.className = "cart-undo-toast";
      toast.setAttribute("role", "status");
      toast.innerHTML = `<span></span><button type="button">Повернути</button>`;
      document.body.appendChild(toast);
    }
    clearTimeout(undoTimer);
    toast.querySelector("span").textContent = `${label || "Товар"} видалено`;
    toast.hidden = false;
    toast.classList.add("is-visible");
    const restore = () => {
      const current = readRaw();
      if (!current.some((item) => item.productId === entry.productId)) current.push(entry);
      writeRaw(current);
      window.VAAnalytics?.addToCart?.(entry.productId, entry.quantity || 1);
      toast.classList.remove("is-visible");
      toast.hidden = true;
      renderCartPage();
    };
    const button = toast.querySelector("button");
    button.onclick = restore;
    undoTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => { toast.hidden = true; }, 180);
    }, 6500);
  }

  function initCartItemControls() {
    const itemsList = document.getElementById("cartItemsList");
    if (!itemsList) return;

    itemsList.addEventListener("click", (event) => {
      const row = event.target.closest("[data-cart-item]");
      if (!row) return;
      const id = row.getAttribute("data-cart-item");

      if (event.target.closest(".cart-qty-minus")) {
        const input = row.querySelector(".cart-qty-input");
        updateQty(id, clamp(parseInt(input.value, 10) - 1));
        renderCartPage();
      } else if (event.target.closest(".cart-qty-plus")) {
        const input = row.querySelector(".cart-qty-input");
        updateQty(id, clamp(parseInt(input.value, 10) + 1));
        renderCartPage();
      } else if (event.target.closest(".cart-item__remove")) {
        const entry = readRaw().find((item) => item.productId === id);
        const info = getItemInfo(id);
        remove(id);
        renderCartPage();
        showUndoRemoval(entry, info?.name);
      }
    });

    itemsList.addEventListener("change", (event) => {
      if (!event.target.classList.contains("cart-qty-input")) return;
      const row = event.target.closest("[data-cart-item]");
      updateQty(row.getAttribute("data-cart-item"), clamp(parseInt(event.target.value, 10)));
      renderCartPage();
    });

    document.getElementById("quickAddDiscovery18")?.addEventListener("click", () => {
      add("discovery-18", 1);
      renderCartPage();
      window.VAHome?.showToast("Повний Discovery Set додано до кошика");
    });
  }

  // ---- Checkout form ----
  function initNovaPoshtaCheckout(form) {
    const city = form.elements.customerCity;
    const warehouse = form.elements.deliveryDetails;
    const cityRef = form.elements.novaPoshtaCityRef;
    const settlementRef = form.elements.novaPoshtaSettlementRef;
    const warehouseRef = form.elements.novaPoshtaWarehouseRef;
    const cityList = document.getElementById("npCitySuggestions");
    const warehouseList = document.getElementById("npWarehouseSuggestions");
    const cityHint = document.getElementById("npCityHint");
    const warehouseHint = document.getElementById("npWarehouseHint");
    if (!city || !warehouse || !cityRef || !warehouseRef || !cityList || !warehouseList) return;

    const CITY_CACHE_KEY = "vahome_np_city_cache_v3";
    const WAREHOUSE_CACHE_KEY = "vahome_np_warehouse_cache_v3";
    const CITY_TTL = 24 * 60 * 60 * 1000;
    const WAREHOUSE_TTL = 6 * 60 * 60 * 1000;
    const POPULAR_CITIES = ["Київ", "Харків", "Дніпро", "Одеса", "Львів", "Полтава"];
    const apiReady = Boolean(window.VAHomeSupabase?.configured?.() && typeof window.VAHomeSupabase.novaPoshtaLookup === "function");
    let cityTimer = 0;
    let warehouseTimer = 0;
    let cityController = null;
    let warehouseController = null;
    let warehouseItems = [];
    let pickerMode = "";
    let requestSerial = 0;

    form.dataset.npCityManual = "false";
    form.dataset.npWarehouseManual = "false";

    const normalize = (value) => String(value || "").toLocaleLowerCase("uk-UA").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
    const escapeText = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const readCache = (key) => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; } };
    const getCached = (key, id, ttl) => {
      const entry = readCache(key)[id];
      return entry && Date.now() - Number(entry.savedAt || 0) < ttl && Array.isArray(entry.items) ? entry.items : null;
    };
    const putCached = (key, id, items, maxEntries = 20) => {
      try {
        const cache = readCache(key);
        cache[id] = { savedAt: Date.now(), items };
        Object.keys(cache).sort((a, b) => Number(cache[b]?.savedAt || 0) - Number(cache[a]?.savedAt || 0)).slice(maxEntries).forEach((oldKey) => delete cache[oldKey]);
        localStorage.setItem(key, JSON.stringify(cache));
      } catch (_) {}
    };
    const isMobile = () => window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;

    const picker = document.createElement("section");
    picker.className = "np-mobile-picker np-mobile-picker--rc29";
    picker.hidden = true;
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-modal", "true");
    picker.innerHTML = `
      <header class="np-mobile-picker__bar">
        <button type="button" class="np-mobile-picker__back" aria-label="Повернутися">←</button>
        <strong class="np-mobile-picker__title">Місто</strong>
        <span aria-hidden="true"></span>
      </header>
      <div class="np-mobile-picker__search-wrap">
        <span aria-hidden="true" class="np-mobile-picker__search-icon"></span>
        <input class="np-mobile-picker__search" type="search" autocomplete="off" autocapitalize="sentences" enterkeyhint="search" />
      </div>
      <p class="np-mobile-picker__context" hidden></p>
      <div class="np-mobile-picker__results" role="listbox"></div>`;
    document.body.appendChild(picker);
    const pickerTitle = picker.querySelector(".np-mobile-picker__title");
    const pickerSearch = picker.querySelector(".np-mobile-picker__search");
    const pickerContext = picker.querySelector(".np-mobile-picker__context");
    const pickerResults = picker.querySelector(".np-mobile-picker__results");

    const syncReadonly = () => {
      const mobile = isMobile();
      [city, warehouse].forEach((input) => {
        input.setAttribute("aria-haspopup", mobile ? "dialog" : "listbox");
        if (mobile) {
          input.readOnly = true;
          input.setAttribute("inputmode", "none");
          if (input === city) input.placeholder = "Оберіть місто або населений пункт";
          else input.placeholder = city.value ? "Оберіть відділення або поштомат" : "Спочатку оберіть місто";
        } else {
          input.readOnly = false;
          input.removeAttribute("inputmode");
          if (input === city) input.placeholder = "Введіть щонайменше 3 літери";
          else input.placeholder = city.value ? "Номер або частина адреси" : "Спочатку оберіть місто";
        }
      });
      if (!mobile && !picker.hidden) closePicker();
    };

    const renderState = (container, text, actions = []) => {
      container.innerHTML = `<div class="np-picker-state"><p>${escapeText(text)}</p>${actions.length ? `<div class="np-picker-state__actions">${actions.map((action, index) => `<button type="button" data-state-action="${index}">${escapeText(action.label)}</button>`).join("")}</div>` : ""}</div>`;
      actions.forEach((action, index) => container.querySelector(`[data-state-action="${index}"]`)?.addEventListener("click", action.run));
    };

    const renderPopular = () => {
      pickerResults.innerHTML = `<div class="np-picker-popular"><p>Популярні міста</p>${POPULAR_CITIES.map((name) => `<button type="button" data-popular-city="${escapeText(name)}">${escapeText(name)}</button>`).join("")}</div>`;
      pickerResults.querySelectorAll("[data-popular-city]").forEach((button) => button.addEventListener("click", () => {
        pickerSearch.value = button.dataset.popularCity || "";
        searchCities(pickerSearch.value, true);
      }));
    };

    const renderMobileItems = (items, mode) => {
      if (!items.length) return renderState(pickerResults, mode === "city" ? "Населених пунктів не знайдено." : "Відділень не знайдено.", [
        { label: "Використати введене вручну", run: mode === "city" ? useManualCity : useManualWarehouse }
      ]);
      pickerResults.innerHTML = `<div class="np-picker-list">${items.map((item, index) => `<button type="button" class="np-picker-result" data-result-index="${index}"><span>${escapeText(item.label)}</span>${mode === "city" ? `<small>${escapeText(item.area || item.city || "")}</small>` : `<small>${escapeText(item.shortAddress || "")}</small>`}</button>`).join("")}</div>`;
      pickerResults.querySelectorAll("[data-result-index]").forEach((button) => button.addEventListener("click", () => {
        const item = items[Number(button.dataset.resultIndex)];
        if (mode === "city") selectCity(item);
        else selectWarehouse(item);
      }));
    };

    const renderDesktopItems = (input, list, items, title, onSelect) => {
      list.innerHTML = `<div class="np-suggestions__head"><strong>${escapeText(title)}</strong><button type="button" class="np-suggestions__close" aria-label="Закрити">×</button></div><div class="np-suggestions__body">${items.map((item, index) => `<button type="button" class="np-suggestion" data-result-index="${index}"><span>${escapeText(item.label)}</span>${item.shortAddress || item.area ? `<small>${escapeText(item.shortAddress || item.area || "")}</small>` : ""}</button>`).join("")}</div>`;
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      list.querySelector(".np-suggestions__close")?.addEventListener("click", () => closeDesktop(input, list));
      list.querySelectorAll("[data-result-index]").forEach((button) => button.addEventListener("click", () => onSelect(items[Number(button.dataset.resultIndex)])));
    };

    const showDesktopState = (input, list, text, actions = []) => {
      list.innerHTML = `<div class="np-suggestions__head"><strong>Пошук</strong><button type="button" class="np-suggestions__close" aria-label="Закрити">×</button></div><div class="np-suggestions__state"><p>${escapeText(text)}</p>${actions.length ? `<div class="np-suggestions__actions">${actions.map((action, index) => `<button type="button" data-state-action="${index}">${escapeText(action.label)}</button>`).join("")}</div>` : ""}</div>`;
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      list.querySelector(".np-suggestions__close")?.addEventListener("click", () => closeDesktop(input, list));
      actions.forEach((action, index) => list.querySelector(`[data-state-action="${index}"]`)?.addEventListener("click", action.run));
    };

    function closeDesktop(input, list) {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
    }
    const closeDesktopLists = () => { closeDesktop(city, cityList); closeDesktop(warehouse, warehouseList); };

    let pickerBodyLock = null;
    let pickerViewportRaf = 0;

    const syncPickerViewport = () => {
      if (picker.hidden) return;
      cancelAnimationFrame(pickerViewportRaf);
      pickerViewportRaf = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const top = Math.max(0, Number(viewport?.offsetTop || 0));
        const left = Math.max(0, Number(viewport?.offsetLeft || 0));
        const width = Math.max(280, Number(viewport?.width || window.innerWidth));
        const height = Math.max(320, Number(viewport?.height || window.innerHeight));
        picker.style.setProperty("--np-picker-top", `${top}px`);
        picker.style.setProperty("--np-picker-left", `${left}px`);
        picker.style.setProperty("--np-picker-width", `${width}px`);
        picker.style.setProperty("--np-picker-height", `${height}px`);
      });
    };

    const lockPickerBody = () => {
      if (pickerBodyLock) return;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      pickerBodyLock = {
        y,
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width
      };
      document.body.style.position = "fixed";
      document.body.style.top = `-${y}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    };

    const unlockPickerBody = () => {
      if (!pickerBodyLock) return;
      const state = pickerBodyLock;
      pickerBodyLock = null;
      document.body.style.position = state.position;
      document.body.style.top = state.top;
      document.body.style.left = state.left;
      document.body.style.right = state.right;
      document.body.style.width = state.width;
      window.scrollTo(0, state.y);
    };

    function openPicker(mode) {
      if (!isMobile()) return;
      if (!picker.hidden && pickerMode === mode) return;
      pickerMode = mode;
      lockPickerBody();
      picker.hidden = false;
      document.body.classList.add("np-mobile-picker-open");
      pickerResults.scrollTop = 0;
      syncPickerViewport();
      pickerTitle.textContent = mode === "city" ? "Місто" : "Відділення або поштомат";
      pickerSearch.placeholder = mode === "city" ? "Назва міста або поштовий індекс" : "Номер або частина адреси";
      pickerSearch.value = "";
      pickerContext.hidden = true;
      pickerContext.textContent = "";
      if (mode === "city") {
        if (city.value && cityRef.value) {
          pickerContext.textContent = `Обрано: ${city.value}`;
          pickerContext.hidden = false;
        }
        renderPopular();
      } else if (!city.value) {
        renderState(pickerResults, "Спочатку оберіть місто.");
      } else {
        pickerContext.textContent = city.value;
        pickerContext.hidden = false;
        if (warehouseItems.length) renderMobileItems(warehouseItems.slice(0, 80), "warehouse");
        else loadWarehouses("");
      }
      requestAnimationFrame(() => {
        syncPickerViewport();
        picker.scrollTop = 0;
        pickerResults.scrollTop = 0;
        pickerSearch.focus({ preventScroll: true });
        setTimeout(syncPickerViewport, 60);
        setTimeout(syncPickerViewport, 180);
      });
    }

    function closePicker() {
      pickerSearch.blur();
      picker.hidden = true;
      pickerMode = "";
      document.body.classList.remove("np-mobile-picker-open");
      unlockPickerBody();
      picker.removeAttribute("style");
    }

    function useManualCity() {
      const value = String(pickerSearch.value || city.value || "").trim();
      if (value.length < 2) return renderState(pickerResults, "Введіть назву населеного пункту.");
      city.value = value;
      cityRef.value = "";
      if (settlementRef) settlementRef.value = "";
      form.dataset.npCityManual = "true";
      warehouse.value = "";
      warehouseRef.value = "";
      warehouse.disabled = false;
      form.dataset.npWarehouseManual = "true";
      if (cityHint) cityHint.textContent = "Населений пункт введено вручну.";
      if (warehouseHint) warehouseHint.textContent = "Введіть відділення або поштомат вручну.";
      closePicker();
      city.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function useManualWarehouse() {
      const value = String(pickerSearch.value || warehouse.value || "").trim();
      if (value.length < 3) return renderState(pickerResults, "Введіть номер або адресу відділення.");
      warehouse.value = value;
      warehouseRef.value = "";
      form.dataset.npWarehouseManual = "true";
      if (warehouseHint) warehouseHint.textContent = "Відділення введено вручну.";
      closePicker();
      warehouse.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function selectCity(item) {
      if (!item) return;
      city.value = item.label || item.city || "";
      cityRef.value = item.ref || "";
      if (settlementRef) settlementRef.value = item.settlementRef || "";
      form.dataset.npCityManual = "false";
      warehouse.value = "";
      warehouseRef.value = "";
      warehouseItems = [];
      warehouse.disabled = false;
      form.dataset.npWarehouseManual = "false";
      warehouse.placeholder = "Номер або частина адреси";
      if (cityHint) cityHint.textContent = "Населений пункт обрано.";
      if (warehouseHint) warehouseHint.textContent = "Завантажуємо актуальні відділення…";
      closePicker();
      closeDesktop(city, cityList);
      city.dispatchEvent(new Event("change", { bubbles: true }));
      loadWarehouses("");
    }

    function selectWarehouse(item, automatic = false) {
      if (!item) return;
      warehouse.value = item.label || item.shortAddress || "";
      warehouseRef.value = item.ref || "";
      form.dataset.npWarehouseManual = "false";
      if (warehouseHint) warehouseHint.textContent = automatic
        ? (normalize(item.label).includes("поштомат") ? "Єдиний доступний поштомат обрано автоматично." : "Єдине доступне відділення обрано автоматично.")
        : "Відділення обрано.";
      closePicker();
      closeDesktop(warehouse, warehouseList);
      warehouse.dispatchEvent(new Event("change", { bubbles: true }));
    }

    async function searchCities(query, forceMobile = false) {
      const value = String(query || "").trim();
      if (value.length < 3) {
        if (isMobile() || forceMobile) {
          if (!value) renderPopular();
          else renderState(pickerResults, `Ще ${3 - value.length} ${value.length === 2 ? "літера" : "літери"} для пошуку.`);
        } else closeDesktop(city, cityList);
        return;
      }
      if (!apiReady) {
        const action = [{ label: "Використати введене вручну", run: useManualCity }];
        if (isMobile()) renderState(pickerResults, "Пошук Нової пошти тимчасово недоступний.", action);
        else showDesktopState(city, cityList, "Пошук Нової пошти тимчасово недоступний.", action);
        return;
      }
      const cacheId = normalize(value);
      const cached = getCached(CITY_CACHE_KEY, cacheId, CITY_TTL);
      if (cached) {
        if (isMobile()) renderMobileItems(cached, "city");
        else renderDesktopItems(city, cityList, cached, "Знайдені населені пункти", selectCity);
        return;
      }
      cityController?.abort();
      cityController = new AbortController();
      const serial = ++requestSerial;
      if (isMobile()) renderState(pickerResults, "Шукаємо населені пункти…");
      else showDesktopState(city, cityList, "Шукаємо населені пункти…");
      try {
        const items = await window.VAHomeSupabase.novaPoshtaLookup({ action: "cities", query: value }, { signal: cityController.signal });
        if (serial !== requestSerial) return;
        putCached(CITY_CACHE_KEY, cacheId, items, 30);
        if (isMobile()) renderMobileItems(items, "city");
        else renderDesktopItems(city, cityList, items, "Знайдені населені пункти", selectCity);
      } catch (error) {
        if (error?.name === "AbortError") return;
        const actions = [
          { label: "Повторити", run: () => searchCities(value, true) },
          { label: "Використати введене вручну", run: useManualCity }
        ];
        if (isMobile()) renderState(pickerResults, "Не вдалося завантажити міста.", actions);
        else showDesktopState(city, cityList, "Не вдалося завантажити міста.", actions);
      }
    }

    const warehouseScore = (item, query) => {
      const needle = normalize(query);
      if (!needle) return 0;
      const number = normalize(item.number || "").replace(/^№/, "");
      const label = normalize(item.label || "");
      const address = normalize(item.shortAddress || "");
      const numeric = /^\d+$/.test(needle);
      if (numeric) {
        if (number === needle) return 0;
        if (number.startsWith(needle)) return 1;
        if (number.includes(needle)) return 2;
        if (label.includes(needle)) return 3;
        if (address.includes(needle)) return 4;
        return 99;
      }
      if (label.startsWith(needle) || address.startsWith(needle)) return 0;
      if (label.includes(needle)) return 1;
      if (address.includes(needle)) return 2;
      return 99;
    };

    function localWarehouseMatches(query) {
      return warehouseItems.map((item, index) => ({ item, index, score: warehouseScore(item, query) }))
        .filter((entry) => !query || entry.score < 99)
        .sort((a, b) => a.score - b.score || a.index - b.index)
        .slice(0, 80)
        .map((entry) => entry.item);
    }

    async function loadWarehouses(query = "") {
      if (form.elements.deliveryMethod?.value === "nova_poshta_courier") return;
      if (!cityRef.value) {
        if (form.dataset.npCityManual === "true") {
          if (isMobile()) renderState(pickerResults, "Введіть відділення вручну.", [{ label: "Використати введене", run: useManualWarehouse }]);
          return;
        }
        if (isMobile()) renderState(pickerResults, "Спочатку оберіть місто.");
        else showDesktopState(warehouse, warehouseList, "Спочатку оберіть місто.");
        return;
      }
      const cacheId = `${cityRef.value}:${normalize(query)}`;
      const cached = getCached(WAREHOUSE_CACHE_KEY, cacheId, WAREHOUSE_TTL);
      if (cached) {
        if (!query) warehouseItems = cached;
        showWarehouseResults(query, cached);
        return;
      }
      warehouseController?.abort();
      warehouseController = new AbortController();
      if (isMobile()) renderState(pickerResults, "Завантажуємо відділення…");
      else showDesktopState(warehouse, warehouseList, "Завантажуємо відділення…");
      try {
        const items = await window.VAHomeSupabase.novaPoshtaLookup({ action: "warehouses", city_ref: cityRef.value, query }, { signal: warehouseController.signal });
        putCached(WAREHOUSE_CACHE_KEY, cacheId, items, 20);
        if (!query) warehouseItems = items;
        else {
          const merged = new Map(warehouseItems.map((item) => [item.ref, item]));
          items.forEach((item) => merged.set(item.ref, item));
          warehouseItems = [...merged.values()];
        }
        if (!query && items.length === 1) {
          selectWarehouse(items[0], true);
          return;
        }
        showWarehouseResults(query, query ? localWarehouseMatches(query) : items);
        if (warehouseHint && items.length !== 1) warehouseHint.textContent = "Оберіть відділення або поштомат зі списку.";
      } catch (error) {
        if (error?.name === "AbortError") return;
        const actions = [
          { label: "Повторити", run: () => loadWarehouses(query) },
          { label: "Ввести вручну", run: useManualWarehouse }
        ];
        if (isMobile()) renderState(pickerResults, "Не вдалося завантажити відділення.", actions);
        else showDesktopState(warehouse, warehouseList, "Не вдалося завантажити відділення.", actions);
      }
    }

    function showWarehouseResults(query, items) {
      const matches = query ? items.filter((item) => warehouseScore(item, query) < 99).sort((a, b) => warehouseScore(a, query) - warehouseScore(b, query)).slice(0, 80) : items.slice(0, 80);
      if (isMobile()) renderMobileItems(matches, "warehouse");
      else if (matches.length) renderDesktopItems(warehouse, warehouseList, matches, query ? "Знайдені відділення" : "Оберіть відділення", selectWarehouse);
      else showDesktopState(warehouse, warehouseList, "Відділень не знайдено.", [{ label: "Ввести вручну", run: useManualWarehouse }]);
    }

    pickerSearch.addEventListener("input", () => {
      const query = pickerSearch.value.trim();
      if (pickerMode === "city") {
        clearTimeout(cityTimer);
        cityTimer = window.setTimeout(() => searchCities(query, true), 240);
      } else if (pickerMode === "warehouse") {
        clearTimeout(warehouseTimer);
        if (form.dataset.npCityManual === "true") {
          renderState(pickerResults, query.length >= 3 ? "Можна використати введене відділення." : "Введіть номер або адресу відділення.", query.length >= 3 ? [{ label: "Використати введене", run: useManualWarehouse }] : []);
          return;
        }
        const local = localWarehouseMatches(query);
        renderMobileItems(local, "warehouse");
        if (query.length >= 2 && local.length < 4) warehouseTimer = window.setTimeout(() => loadWarehouses(query), 260);
      }
    });

    picker.querySelector(".np-mobile-picker__back")?.addEventListener("click", closePicker);
    picker.addEventListener("keydown", (event) => { if (event.key === "Escape") closePicker(); });
    window.visualViewport?.addEventListener("resize", syncPickerViewport, { passive: true });
    window.visualViewport?.addEventListener("scroll", syncPickerViewport, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(syncPickerViewport, 120), { passive: true });

    city.addEventListener("input", () => {
      if (isMobile()) return;
      clearTimeout(cityTimer);
      cityRef.value = "";
      if (settlementRef) settlementRef.value = "";
      warehouse.value = "";
      warehouseRef.value = "";
      warehouseItems = [];
      warehouse.disabled = true;
      form.dataset.npCityManual = "false";
      form.dataset.npWarehouseManual = "false";
      const query = city.value.trim();
      if (cityHint) cityHint.textContent = query.length < 3 ? "Пошук почнеться після 3 літер." : "Оберіть населений пункт зі списку.";
      cityTimer = window.setTimeout(() => searchCities(query), 240);
    });
    city.addEventListener("focus", () => { if (!isMobile() && city.value.trim().length >= 3 && !cityRef.value) searchCities(city.value.trim()); });
    city.addEventListener("click", (event) => { if (isMobile()) { event.preventDefault(); openPicker("city"); } });
    city.addEventListener("pointerup", (event) => { if (isMobile()) { event.preventDefault(); openPicker("city"); } }, { passive: false });

    warehouse.addEventListener("input", () => {
      if (isMobile()) return;
      warehouseRef.value = "";
      form.dataset.npWarehouseManual = "false";
      const query = warehouse.value.trim();
      const local = localWarehouseMatches(query);
      if (local.length) renderDesktopItems(warehouse, warehouseList, local, query ? "Знайдені відділення" : "Оберіть відділення", selectWarehouse);
      else showDesktopState(warehouse, warehouseList, "Шукаємо точний збіг…");
      clearTimeout(warehouseTimer);
      if (query.length >= 2 && local.length < 4) warehouseTimer = window.setTimeout(() => loadWarehouses(query), 260);
    });
    warehouse.addEventListener("focus", () => {
      if (isMobile() || warehouse.disabled || form.elements.deliveryMethod?.value === "nova_poshta_courier") return;
      if (warehouseItems.length) showWarehouseResults(warehouse.value.trim(), localWarehouseMatches(warehouse.value.trim()));
      else loadWarehouses("");
    });
    warehouse.addEventListener("click", (event) => {
      if (!isMobile() || warehouse.disabled || form.elements.deliveryMethod?.value === "nova_poshta_courier") return;
      event.preventDefault();
      openPicker("warehouse");
    });
    warehouse.addEventListener("pointerup", (event) => {
      if (!isMobile() || warehouse.disabled || form.elements.deliveryMethod?.value === "nova_poshta_courier") return;
      event.preventDefault();
      openPicker("warehouse");
    }, { passive: false });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".np-combobox") || event.target.closest(".np-suggestions") || event.target.closest(".np-mobile-picker")) return;
      closeDesktopLists();
    });
    window.addEventListener("resize", syncReadonly);
    syncReadonly();

    if (!apiReady) {
      if (cityHint) cityHint.textContent = "Введіть населений пункт вручну.";
      if (warehouseHint) warehouseHint.textContent = "Введіть відділення або поштомат вручну.";
      warehouse.disabled = false;
      form.dataset.npCityManual = "true";
      form.dataset.npWarehouseManual = "true";
    } else if (cityRef.value) {
      warehouse.disabled = false;
      loadWarehouses("");
    } else if (city.value.trim()) {
      warehouse.disabled = true;
      if (cityHint) cityHint.textContent = "Натисніть поле, щоб підтвердити населений пункт.";
    } else {
      warehouse.disabled = true;
    }
  }

  function initDeliveryMethod(form) {
    const select = form.elements.deliveryMethod;
    const cards = Array.from(form.querySelectorAll(".delivery-option"));
    const branchPanel = document.getElementById("npBranchFields");
    const courierPanel = document.getElementById("npCourierFields");
    const warehouse = form.elements.deliveryDetails;
    const street = form.elements.courierStreet;
    const house = form.elements.courierHouse;
    const apartment = form.elements.courierApartment;
    const warehouseRef = form.elements.novaPoshtaWarehouseRef;
    if (!select || !cards.length || !branchPanel || !courierPanel) return;

    const sync = (value, emit = true) => {
      const courier = value === "nova_poshta_courier";
      select.value = courier ? "nova_poshta_courier" : "nova_poshta_branch";
      branchPanel.hidden = courier;
      courierPanel.hidden = !courier;
      if (warehouse) warehouse.required = !courier;
      if (street) street.required = courier;
      if (house) house.required = courier;
      if (courier && warehouseRef) warehouseRef.value = "";
      cards.forEach((card) => {
        const radio = card.querySelector('input[type="radio"]');
        const selected = radio?.value === select.value;
        if (radio) radio.checked = selected;
        card.classList.toggle("is-selected", selected);
      });
      syncShippingCopy(pricingFor(getItems()));
      if (emit) select.dispatchEvent(new Event("change", { bubbles: true }));
    };

    cards.forEach((card) => card.addEventListener("click", () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) sync(radio.value);
    }));
    sync(select.value || "nova_poshta_branch", false);
  }

  function validateCheckoutForm(form) {
    let valid = true;
    const deliveryMethod = form.elements.deliveryMethod?.value || "nova_poshta_branch";
    const courier = deliveryMethod === "nova_poshta_courier";
    const requiredFields = ["customerName", "customerPhone", "customerEmail", "customerCity", "deliveryMethod"];
    requiredFields.push(...(courier ? ["courierStreet", "courierHouse"] : ["deliveryDetails"]));

    requiredFields.forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      const wrap = field.closest(".form-field");
      let invalid = !field.value || !field.value.trim();
      if (name === "customerName" && !invalid) {
        const parts = field.value.trim().split(/\s+/).filter((part) => part.length >= 2);
        invalid = parts.length < 2;
      }
      if (name === "customerCity" && !invalid) invalid = field.value.trim().length < 2;
      if (name === "deliveryDetails" && !invalid) invalid = field.value.trim().length < 3;
      if (name === "courierStreet" && !invalid) invalid = field.value.trim().length < 2;
      if (name === "customerEmail" && !invalid) invalid = !/^\S+@\S+\.\S+$/.test(field.value.trim());
      if (name === "customerPhone" && !invalid) {
        const phone = field.value.replace(/[^\d+]/g, "");
        invalid = !/^(?:\+?38)?0\d{9}$/.test(phone);
      }
      if (wrap) wrap.classList.toggle("has-error", invalid);
      field.setAttribute("aria-invalid", invalid ? "true" : "false");
      if (invalid) valid = false;
    });

    const cityRef = form.elements.novaPoshtaCityRef;
    const warehouseRef = form.elements.novaPoshtaWarehouseRef;
    if (!cityRef?.value && form.dataset.npCityManual !== "true") {
      valid = false;
      form.elements.customerCity?.setAttribute("aria-invalid", "true");
      form.elements.customerCity?.closest(".form-field")?.classList.add("has-error");
    }
    if (!courier && !warehouseRef?.value && form.dataset.npWarehouseManual !== "true") {
      valid = false;
      form.elements.deliveryDetails?.setAttribute("aria-invalid", "true");
      form.elements.deliveryDetails?.closest(".form-field")?.classList.add("has-error");
    }

    const consent = form.elements.checkoutConsent;
    const consentError = document.getElementById("err-checkoutConsent");
    if (consent && !consent.checked) {
      valid = false;
      consent.setAttribute("aria-invalid", "true");
      if (consentError) consentError.style.display = "block";
    } else if (consent) {
      consent.setAttribute("aria-invalid", "false");
      if (consentError) consentError.style.display = "none";
    }
    if (!valid) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) {
        firstInvalid.focus({ preventScroll: true });
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    return valid;
  }

  function buildOrderPayload(form) {
    const items = getItems();
    let checkoutRequestId = "";
    try { checkoutRequestId = sessionStorage.getItem("vahome_checkout_request_id") || ""; } catch (_) {}
    if (!checkoutRequestId) {
      checkoutRequestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      try { sessionStorage.setItem("vahome_checkout_request_id", checkoutRequestId); } catch (_) {}
    }
    const deliveryMethod = form.elements.deliveryMethod.value;
    const courier = deliveryMethod === "nova_poshta_courier";
    const street = form.elements.courierStreet?.value.trim() || "";
    const house = form.elements.courierHouse?.value.trim() || "";
    const apartment = form.elements.courierApartment?.value.trim() || "";
    const deliveryDetails = courier
      ? `${street}, буд. ${house}${apartment ? `, кв. ${apartment}` : ""}`
      : form.elements.deliveryDetails.value.trim();

    return {
      checkout_request_id: checkoutRequestId,
      customer_name: form.elements.customerName.value.trim(),
      customer_phone: form.elements.customerPhone.value.trim(),
      customer_email: form.elements.customerEmail.value.trim().toLowerCase(),
      customer_city: form.elements.customerCity.value.trim(),
      nova_poshta_city_ref: form.elements.novaPoshtaCityRef ? form.elements.novaPoshtaCityRef.value.trim() || null : null,
      nova_poshta_settlement_ref: form.elements.novaPoshtaSettlementRef ? form.elements.novaPoshtaSettlementRef.value.trim() || null : null,
      nova_poshta_warehouse_ref: courier ? null : (form.elements.novaPoshtaWarehouseRef ? form.elements.novaPoshtaWarehouseRef.value.trim() || null : null),
      delivery_method: deliveryMethod,
      delivery_details: deliveryDetails,
      courier_street: courier ? street : null,
      courier_house: courier ? house : null,
      courier_apartment: courier ? apartment || null : null,
      payment_method: form.elements.paymentMethod.value,
      do_not_call: Boolean(form.elements.doNotCall?.checked),
      marketing_consent: Boolean(form.elements.marketingConsent?.checked),
      promo_code: readAppliedPromoCode() || null,
      customer_comment: form.elements.customerComment ? form.elements.customerComment.value.trim() || null : null,
      items: items.map((item) => ({ id: item.id, quantity: item.quantity, selections: item.selections }))
    };
  }

  function setCheckoutState(button, status, message, isError) {
    if (button) {
      button.disabled = status === "loading";
      button.classList.toggle("is-loading", status === "loading");
      const label = button.querySelector("span");
      if (label) label.textContent = status === "loading" ? "Оформлюємо…" : "Оформити замовлення";
      else button.textContent = status === "loading" ? "Оформлюємо…" : "Оформити замовлення";
    }
    const statusEl = document.getElementById("checkoutStatus");
    if (statusEl) {
      statusEl.textContent = message || "";
      statusEl.classList.toggle("is-error", Boolean(isError));
    }
  }

  function orderErrorMessage(error) {
    const code = String(error && error.message || "");
    const messages = {
      INVALID_CONTACTS: "Перевірте ім’я, номер телефону та email.",
      INVALID_DELIVERY: "Перевірте місто та дані доставки Нової пошти.",
      DELIVERY_VALIDATION_UNAVAILABLE: "Нова пошта тимчасово не підтвердила дані доставки. Кошик збережено — повторіть спробу трохи пізніше.",
      INVALID_PAYMENT: "Оберіть доступний спосіб оплати.",
      INVALID_PROMO: "Промокод недійсний для цього замовлення. Перевірте код або приберіть його.",
      INVALID_ITEMS: "У кошику є некоректний товар. Оновіть кошик і повторіть спробу.",
      INVALID_ITEM: "Один із товарів більше недоступний. Оновіть кошик і повторіть спробу.",
      INVALID_DISCOVERY_SELECTION: "Для Discovery Set потрібно обрати рівно 6 різних ароматів.",
      ORDER_CREATION_FAILED: "Система замовлень не змогла записати дані. Ми не списували кошик — повторіть після перевірки сервісу.",
      CHECKOUT_SERVICE_ERROR: "Сервіс замовлень тимчасово недоступний. Кошик збережено — повторіть спробу трохи пізніше.",
      CHECKOUT_AUTH_ERROR: "Сервіс замовлень потребує повторного налаштування доступу. Кошик збережено.",
      CHECKOUT_FUNCTION_MISSING: "Сервіс оформлення ще не опублікований. Кошик збережено.",
      CHECKOUT_TIMEOUT: "Сервіс відповідає надто довго. Кошик збережено — повторіть спробу.",
      NETWORK_ERROR: "Не вдалося з’єднатися із сервісом замовлень. Перевірте інтернет і повторіть спробу.",
      RATE_LIMITED: "Забагато спроб оформлення за короткий час. Зачекайте 10 хвилин і повторіть."
    };
    const message = messages[code] || "Замовлення не збережено. Кошик залишився без змін — повторіть спробу.";
    const requestId = error && error.requestId ? ` Код звернення: ${error.requestId}.` : "";
    return `${message}${requestId}`;
  }

  let checkoutSubmitting = false;

  async function placeOrder(form, button) {
    if (checkoutSubmitting) return;
    const currentItems = getItems();
    if (!currentItems.length) {
      if (window.VAHome) window.VAHome.showToast("Кошик порожній");
      return;
    }
    const invalidDiscovery = currentItems.find(item => item.id === "discovery-6" && item.selections.length !== 6);
    if (invalidDiscovery) {
      setCheckoutState(button, "idle", "Для Discovery Set потрібно обрати рівно 6 ароматів.", true);
      window.VAHome?.showToast("Поверніться до Discovery Set і оберіть 6 ароматів");
      return;
    }
    if (!validateCheckoutForm(form)) {
      if (window.VAHome) window.VAHome.showToast("Заповніть обов'язкові поля");
      return;
    }
    if (!window.VAHomeSupabase || !window.VAHomeSupabase.configured()) {
      setCheckoutState(button, "idle", "Не вдалося підключитися до системи замовлень. Спробуйте трохи пізніше.", true);
      return;
    }

    const payload = buildOrderPayload(form);
    checkoutSubmitting = true;
    const mobileAction = document.getElementById("checkoutMobileAction");
    if (mobileAction) mobileAction.disabled = true;
    setCheckoutState(button, "loading", "Зберігаємо ваше замовлення…", false);

    try {
      const result = await window.VAHomeSupabase.submitOrder(payload);
      const order = result.order;

      const confirmation = {
        orderNumber: order.client_order_id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        paymentMethod: order.payment_method,
        items: order.items,
        total: order.total_amount,
        discount: Number(result.discount_amount || order.discount_amount || 0),
        promoCode: result.promo_code || order.promo_code || null,
        emailStatus: result.email_status,
        paymentDetails: result.payment_details || null,
        createdAt: new Date().toISOString()
      };
      sessionStorage.setItem("vahome_last_order", JSON.stringify(confirmation));
      sessionStorage.removeItem("vahome_checkout_request_id");
      sessionStorage.removeItem("vahome_checkout_draft_v65");
      sessionStorage.removeItem("vahome_checkout_draft_v66");

      clear();
      window.location.href = "thank-you.html";
    } catch (error) {
      
      setCheckoutState(button, "idle", orderErrorMessage(error), true);
    } finally {
      checkoutSubmitting = false;
      if (mobileAction) mobileAction.disabled = false;
    }
  }

  function prefillCheckoutFromSaved(form) {
    let saved;
    try { saved = JSON.parse(localStorage.getItem("vahome_saved_delivery") || "null"); } catch (_) { saved = null; }
    if (!saved) return;
    if (saved.name && form.elements.customerName && !form.elements.customerName.value) form.elements.customerName.value = saved.name;
    if (saved.phone && form.elements.customerPhone && !form.elements.customerPhone.value) form.elements.customerPhone.value = saved.phone;
    if (saved.city && form.elements.customerCity && !form.elements.customerCity.value) {
      form.elements.customerCity.value = saved.city;
      if (saved.warehouse && form.elements.deliveryDetails && !form.elements.deliveryDetails.value) form.elements.deliveryDetails.value = saved.warehouse;
    }
  }


  function prefillCheckoutFromAccount(form) {
    const emailField = form.elements.customerEmail;
    const hint = document.getElementById("checkoutAccountEmailHint");
    const authApi = window.VAHomeSupabase;
    if (!emailField || !authApi) return;

    let userEdited = false;
    emailField.addEventListener("input", (event) => {
      if (event.isTrusted) {
        userEdited = true;
        emailField.dataset.accountEmailPrefilled = "false";
        if (hint) hint.hidden = true;
      }
    });

    const applyUser = (user) => {
      const email = String(user?.email || "").trim().toLowerCase();
      if (userEdited || !/^\S+@\S+\.\S+$/.test(email)) return;
      if (emailField.value.trim().toLowerCase() === email && emailField.dataset.accountEmailPrefilled === "true") return;
      emailField.value = email;
      emailField.dataset.accountEmailPrefilled = "true";
      emailField.closest(".form-field")?.classList.remove("has-error");
      if (hint) {
        hint.hidden = false;
        hint.textContent = "Підтягнуто з вашого кабінету. Email можна змінити для цього замовлення.";
      }
      emailField.dispatchEvent(new Event("input", { bubbles: true }));
    };

    applyUser(authApi.getStoredAuthUser?.());
    authApi.getAuthenticatedUser?.().then(applyUser).catch(() => {});
  }

  function initPaymentCards(form) {
    const select = form.elements.paymentMethod;
    const cards = Array.from(form.querySelectorAll('.payment-option'));
    if (!select || !cards.length) return;
    const sync = (value) => {
      select.value = value;
      const hint = document.getElementById('paymentMethodHint');
      if (hint) hint.textContent = value === 'cash_on_delivery'
        ? 'Нова пошта додатково стягує комісію за переказ коштів за чинними тарифами.'
        : 'Реквізити для оплати надійдуть після підтвердження замовлення менеджером.';
      cards.forEach((card) => {
        const radio = card.querySelector('input[type="radio"]');
        const selected = radio && radio.value === value;
        if (radio) radio.checked = selected;
        card.classList.toggle('is-selected', selected);
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };
    cards.forEach((card) => card.addEventListener('click', () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) sync(radio.value);
    }));
    sync(select.value || 'bank_transfer');
  }

  function initCheckoutDraft(form) {
    const key = "vahome_checkout_draft_v66";
    const names = [
      "customerName", "customerPhone", "customerEmail", "customerCity",
      "novaPoshtaCityRef", "novaPoshtaSettlementRef", "deliveryMethod",
      "deliveryDetails", "novaPoshtaWarehouseRef", "courierStreet",
      "courierHouse", "courierApartment", "paymentMethod", "doNotCall", "customerComment"
    ];
    let draft = {};
    try { draft = JSON.parse(sessionStorage.getItem(key) || "{}"); } catch (_) { draft = {}; }
    names.forEach((name) => {
      const field = form.elements[name];
      if (!field || draft[name] === undefined) return;
      if (field.type === "checkbox") field.checked = Boolean(draft[name]);
      else if (name === "paymentMethod" || name === "deliveryMethod" || !field.value) field.value = draft[name];
    });
    const save = () => {
      const next = {};
      names.forEach((name) => {
        const field = form.elements[name];
        if (field) next[name] = field.type === "checkbox" ? field.checked : field.value;
      });
      try { sessionStorage.setItem(key, JSON.stringify(next)); } catch (_) {}
    };
    form.addEventListener("input", save);
    form.addEventListener("change", save);
  }

  function initPromoCode(form) {
    const input=document.getElementById("promoCode"),button=document.getElementById("applyPromoCode"),status=document.getElementById("promoStatus"),details=document.getElementById("promoDetails");
    if(!input||!button||!status)return;
    const showCurrent=()=>{const promo=readAppliedPromo();if(promo?.code){input.value=String(promo.code).toUpperCase();status.textContent=promo.free_shipping?"Промокод застосовано: безкоштовна доставка":`Промокод застосовано: −${formatUAH(promo.discount_amount||0)}`;status.className="promo-status is-success";if(details)details.open=true;}};
    const apply=async()=>{const code=normalizePromoCode(input.value);if(!code){writeAppliedPromo(null);resetCheckoutRequestId();status.textContent="Промокод прибрано.";status.className="promo-status";renderCartPage();return;}button.disabled=true;status.textContent="Перевіряємо промокод…";status.className="promo-status";try{const items=getItems().map(i=>({id:i.id,quantity:i.quantity,line_total:i.lineTotal}));const subtotal=items.reduce((sum,i)=>sum+Number(i.line_total||0),0);const response=await fetch(`${window.SITE_CONFIG.supabase.url}/functions/v1/validate-promo`,{method:"POST",headers:{"Content-Type":"application/json","apikey":window.SITE_CONFIG.supabase.publishableKey,"Authorization":`Bearer ${window.SITE_CONFIG.supabase.publishableKey}`},body:JSON.stringify({code,items,subtotal,customer_email:form?.elements?.customerEmail?.value?.trim()?.toLowerCase()||""})});const data=await response.json().catch(()=>({}));if(!response.ok||!data.valid){writeAppliedPromo(null);status.textContent=data.message||"Промокод не знайдено або він уже не діє.";status.className="promo-status is-error";renderCartPage();return;}writeAppliedPromo(data.promo);resetCheckoutRequestId();status.textContent=data.promo.free_shipping?"Промокод застосовано: безкоштовна доставка":`Промокод застосовано: −${formatUAH(data.promo.discount_amount||0)}`;status.className="promo-status is-success";renderCartPage();}catch(_){status.textContent="Не вдалося перевірити промокод. Спробуйте ще раз.";status.className="promo-status is-error";}finally{button.disabled=false;}};
    const emailField=form?.elements?.customerEmail;
    if(emailField)emailField.addEventListener("input",()=>{const promo=readAppliedPromo();if(!promo?.email_bound)return;const current=String(emailField.value||"").trim().toLowerCase();if(current&&current===String(promo.validated_email||"").toLowerCase())return;writeAppliedPromo(null);resetCheckoutRequestId();status.textContent="Персональний промокод прибрано після зміни email.";status.className="promo-status";renderCartPage();});
    button.addEventListener("click",apply);input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();apply();}});showCurrent();
  }

  function initMobileCheckoutAction() {
    const action = document.getElementById('checkoutMobileAction');
    const form = document.getElementById('checkoutForm');
    const mobileBar = document.getElementById('checkoutMobileBar');
    if (!action || !form || !mobileBar) return;

    let raf = 0;

    const setCheckoutActive = (active) => {
      const isMobile = window.innerWidth <= 800;
      const hasItems = mobileBar.dataset.hasItems === 'true';
      const checkoutActive = Boolean(isMobile && active);
      const shouldShowBar = Boolean(isMobile && hasItems && !checkoutActive);

      document.body.classList.toggle('va-checkout-form-active', checkoutActive);

      // RC13: the bar is a normal sticky element in flow. No fixed compositing
      // layer, no body padding reserve, so hiding it can never leave a stale
      // black rectangle behind on iOS.
      mobileBar.hidden = !shouldShowBar;
    };

    // RC13: while a field is focused or the keyboard is open, the page must not
    // change its layout at all. Re-flowing during the viewport transition is what
    // left the unpainted strip at the bottom of the screen.
    const isEditing = () => {
      const node = document.activeElement;
      return Boolean(node && form.contains(node) && node.matches('input, select, textarea'));
    };
    const isKeyboardOpen = () => {
      const vv = window.visualViewport;
      return Boolean(vv && window.innerHeight - vv.height > 120);
    };

    const syncCheckoutZone = () => {
      raf = 0;
      if (isEditing() || isKeyboardOpen()) return;
      if (window.innerWidth > 800) {
        setCheckoutActive(false);
        return;
      }

      // If the checkout form is not actually rendered (empty cart, or the
      // filled state is still hidden) its rect collapses to top:0, which used
      // to be read as "checkout started" and permanently suppressed the
      // mobile bar. A hidden form means checkout has not started.
      if (form.offsetParent === null) {
        setCheckoutActive(false);
        return;
      }

      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const formTop = form.getBoundingClientRect().top;
      const checkoutStarted = formTop <= viewportHeight - 48;
      setCheckoutActive(checkoutStarted);
    };

    const scheduleSync = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncCheckoutZone);
    };

    action.addEventListener('click', () => {
      setCheckoutActive(true);
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => form.elements.customerName?.focus({ preventScroll: true }), 550);
    });

    // Hide once on focus, then stay frozen until the keyboard is fully gone.
    form.addEventListener('focusin', () => setCheckoutActive(true));
    form.addEventListener('focusout', () => {
      window.setTimeout(() => { if (!isEditing() && !isKeyboardOpen()) scheduleSync(); }, 300);
    });

    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync);
    window.visualViewport?.addEventListener('resize', scheduleSync);
    window.addEventListener('pageshow', scheduleSync);
    scheduleSync();
  }

  function initCheckoutForm() {
    const form = document.getElementById("checkoutForm");
    if (!form) return;
    const button = document.getElementById("placeOrderBtn");
    prefillCheckoutFromSaved(form);
    initCheckoutDraft(form);
    prefillCheckoutFromAccount(form);
    initDeliveryMethod(form);
    initNovaPoshtaCheckout(form);
    initPaymentCards(form);
    initPromoCode(form);
    initMobileCheckoutAction();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      placeOrder(form, button);
    });

    form.addEventListener("input", (event) => {
      resetCheckoutRequestId();
      const field = event.target.closest(".form-field input, .form-field select, .form-field textarea");
      if (field && field.closest(".form-field")) field.closest(".form-field").classList.remove("has-error");
    });
    form.addEventListener("change", resetCheckoutRequestId);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // RC13: clear every legacy RC9-RC12 flag and inline reserve.
    document.documentElement.classList.remove('va-ios-viewport-repair');
    document.documentElement.style.removeProperty('transform');
    document.body.classList.remove('va-mobile-checkout-bar-visible', 'va-rc12-checkout-active', 'va-keyboard-open', 'va-checkout-form-active');
    document.body.style.removeProperty('padding-bottom');
    refreshCountBadge();
    renderCartPage();
    initCartItemControls();
    initCheckoutForm();
  });
})();
