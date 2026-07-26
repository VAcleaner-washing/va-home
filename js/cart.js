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

  function updatePremiumCheckoutUI(items, total) {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const countLabel = document.getElementById("cartItemCountLabel");
    if (countLabel) countLabel.textContent = `${count} ${itemWord(count)}`;

    [document.getElementById("checkoutButtonTotal"), document.getElementById("checkoutMobileTotal")].forEach((el) => {
      if (el) el.textContent = formatUAH(total);
    });

    const threshold = 1500;
    const remaining = Math.max(0, threshold - total);
    const progress = Math.min(100, (total / threshold) * 100);
    const progressWrap = document.getElementById("shippingProgress");
    const progressBar = document.getElementById("shippingProgressBar");
    const progressText = document.getElementById("shippingProgressText");
    const progressValue = document.getElementById("shippingProgressValue");
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressWrap) progressWrap.classList.toggle("is-complete", remaining === 0);
    if (progressText) progressText.textContent = remaining === 0 ? "Безкоштовна доставка активована" : "До безкоштовної доставки залишилося";
    if (progressValue) progressValue.textContent = remaining === 0 ? "Готово" : formatUAH(remaining);
    const deliveryLabel = document.getElementById("cartDeliveryLabel");
    if (deliveryLabel) deliveryLabel.textContent = remaining === 0 ? "Безкоштовно" : "За тарифами НП";

    const mobileBar = document.getElementById("checkoutMobileBar");
    if (mobileBar) {
      const hasItems = Boolean(items.length);
      mobileBar.dataset.hasItems = hasItems ? 'true' : 'false';
      const checkoutActive = document.body.classList.contains('va-checkout-form-active');
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
        const media = item.image
          ? `<img class="fill-img" src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.parentElement.classList.add('placeholder-media');this.remove();">`
          : `<span>${item.name}</span>`;
        return `
        <div class="cart-item" data-cart-item="${item.id}">
          <div class="cart-item__media${item.image ? "" : " placeholder-media"}">${media}</div>
          <div>
            <p class="cart-item__name">${item.name}</p>
            <p class="cart-item__meta">${item.volume || ""}</p>
            ${item.selections.length ? `<p class="cart-item__selection"><strong>Обрані аромати:</strong> ${item.selections.map(id=>{const p=typeof getProduct==="function"?getProduct(id):null;return p?p.name:id}).join(" · ")}</p>` : ""}
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

    const totalEl = document.getElementById("cartTotal");
    const subtotalEl = document.getElementById("cartSubtotal");
    const total = getTotal();
    if (subtotalEl) subtotalEl.textContent = formatUAH(total);
    if (totalEl) totalEl.textContent = formatUAH(total);
    updatePremiumCheckoutUI(items, total);

    refreshCountBadge();
  }

  function initCartItemControls() {
    const itemsList = document.getElementById("cartItemsList");
    if (!itemsList) return;

    itemsList.addEventListener("click", (e) => {
      const row = e.target.closest("[data-cart-item]");
      if (!row) return;
      const id = row.getAttribute("data-cart-item");

      if (e.target.closest(".cart-qty-minus")) {
        const input = row.querySelector(".cart-qty-input");
        const newQty = clamp(parseInt(input.value, 10) - 1);
        updateQty(id, newQty);
        renderCartPage();
      } else if (e.target.closest(".cart-qty-plus")) {
        const input = row.querySelector(".cart-qty-input");
        const newQty = clamp(parseInt(input.value, 10) + 1);
        updateQty(id, newQty);
        renderCartPage();
      } else if (e.target.closest(".cart-item__remove")) {
        remove(id);
        renderCartPage();
      }
    });

    itemsList.addEventListener("change", (e) => {
      if (!e.target.classList.contains("cart-qty-input")) return;
      const row = e.target.closest("[data-cart-item]");
      const id = row.getAttribute("data-cart-item");
      updateQty(id, clamp(parseInt(e.target.value, 10)));
      renderCartPage();
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
    const backdrop = document.getElementById("npSheetBackdrop");
    if (!city || !warehouse || !cityRef || !warehouseRef || !cityList || !warehouseList) return;

    // Keep mobile suggestion sheets outside form/fieldset stacking contexts.
    // Installed iOS/Chrome PWAs can otherwise paint the backdrop above the
    // fixed sheet, leaving the user on a darkened screen with no visible list.
    const listAnchors = new Map();
    [cityList, warehouseList].forEach((list) => {
      const anchor = document.createComment(`np-sheet-anchor-${list.id}`);
      list.parentNode?.insertBefore(anchor, list);
      listAnchors.set(list, anchor);
    });
    if (backdrop && backdrop.parentNode !== document.body) document.body.appendChild(backdrop);

    const CITY_CACHE_KEY = "vahome_np_city_cache_v2";
    const WAREHOUSE_CACHE_KEY = "vahome_np_warehouse_cache_v2";
    const CITY_TTL = 24 * 60 * 60 * 1000;
    const WAREHOUSE_TTL = 6 * 60 * 60 * 1000;
    let cityTimer = 0;
    let warehouseTimer = 0;
    let cityController = null;
    let warehouseController = null;
    let activeList = null;
    let activeInput = null;
    let warehouseItems = [];
    let warehouseLoading = false;

    // RC27: full-screen mobile picker. Search and results live in one dedicated view,
    // instead of competing with Safari's keyboard inside the checkout layout.
    const mobilePicker = document.createElement("section");
    mobilePicker.className = "np-mobile-picker";
    mobilePicker.hidden = true;
    mobilePicker.innerHTML = `
      <div class="np-mobile-picker__bar">
        <button type="button" class="np-mobile-picker__back" aria-label="Повернутися">‹</button>
        <strong class="np-mobile-picker__title">Місто</strong>
        <button type="button" class="np-mobile-picker__done" aria-label="Закрити">×</button>
      </div>
      <div class="np-mobile-picker__search-wrap">
        <span aria-hidden="true" class="np-mobile-picker__search-icon"></span>
        <input class="np-mobile-picker__search" type="search" autocomplete="off" enterkeyhint="search" />
      </div>
      <div class="np-mobile-picker__results"></div>`;
    document.body.appendChild(mobilePicker);
    const mobilePickerTitle = mobilePicker.querySelector(".np-mobile-picker__title");
    const mobilePickerSearch = mobilePicker.querySelector(".np-mobile-picker__search");
    const mobilePickerResults = mobilePicker.querySelector(".np-mobile-picker__results");
    let mobilePickerInput = null;
    let mobilePickerList = null;

    const syncMobileReadonly = () => {
      const mobile = window.matchMedia("(max-width: 760px)").matches;
      [city, warehouse].forEach((input) => {
        if (!input) return;
        if (mobile) input.setAttribute("readonly", "readonly");
        else input.removeAttribute("readonly");
      });
    };
    syncMobileReadonly();

    const closeMobilePicker = () => {
      if (mobilePicker.hidden) return;
      mobilePicker.hidden = true;
      document.body.classList.remove("np-mobile-picker-open");
      if (mobilePickerList) {
        mobilePickerList.hidden = true;
        const anchor = listAnchors.get(mobilePickerList);
        if (anchor?.parentNode) anchor.parentNode.insertBefore(mobilePickerList, anchor.nextSibling);
      }
      if (mobilePickerInput) mobilePickerInput.setAttribute("aria-expanded", "false");
      mobilePickerInput = null;
      mobilePickerList = null;
      mobilePickerResults.innerHTML = "";
    };

    const openMobilePicker = (input, list) => {
      mobilePickerInput = input;
      mobilePickerList = list;
      mobilePickerTitle.textContent = input === city ? "Місто" : "Відділення або поштомат";
      mobilePickerSearch.placeholder = input === city ? "Назва міста або поштовий індекс" : "Номер або частина адреси";
      mobilePickerSearch.value = input.value || "";
      mobilePickerResults.innerHTML = "";
      mobilePickerResults.appendChild(list);
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      mobilePicker.hidden = false;
      document.body.classList.add("np-mobile-picker-open");
      requestAnimationFrame(() => {
        mobilePickerSearch.focus({ preventScroll: true });
        mobilePickerSearch.setSelectionRange(mobilePickerSearch.value.length, mobilePickerSearch.value.length);
      });
    };

    mobilePickerSearch.addEventListener("input", () => {
      if (!mobilePickerInput) return;
      mobilePickerInput.value = mobilePickerSearch.value;
      mobilePickerInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    mobilePicker.querySelector(".np-mobile-picker__back")?.addEventListener("click", closeMobilePicker);
    mobilePicker.querySelector(".np-mobile-picker__done")?.addEventListener("click", closeMobilePicker);

    form.dataset.npCityManual = "false";
    form.dataset.npWarehouseManual = "false";

    const escapeText = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const normalize = (value) => String(value || "").toLocaleLowerCase("uk-UA").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
    const readCache = (key) => {
      try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; }
    };
    const writeCache = (key, value) => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
    };
    const getCached = (key, id, ttl) => {
      const cache = readCache(key);
      const entry = cache[id];
      return entry && Date.now() - Number(entry.savedAt || 0) < ttl && Array.isArray(entry.items) ? entry.items : null;
    };
    const putCached = (key, id, items, maxEntries) => {
      const cache = readCache(key);
      cache[id] = { savedAt: Date.now(), items };
      Object.keys(cache).sort((a, b) => Number(cache[b]?.savedAt || 0) - Number(cache[a]?.savedAt || 0)).slice(maxEntries).forEach((oldKey) => delete cache[oldKey]);
      writeCache(key, cache);
    };
    const isMobileSheet = () => window.matchMedia("(max-width: 760px)").matches;
    let sheetViewportRaf = 0;
    const clearSheetGeometry = (list) => {
      list.style.removeProperty("--np-sheet-top");
      list.style.removeProperty("--np-sheet-left");
      list.style.removeProperty("--np-sheet-width");
      list.style.removeProperty("--np-sheet-max-height");
      delete list.dataset.npPlacement;
    };
    const syncSheetViewport = () => {
      window.cancelAnimationFrame(sheetViewportRaf);
      sheetViewportRaf = window.requestAnimationFrame(() => {
        const list = activeList;
        const input = activeInput;
        if (!isMobileSheet() || !list || list.hidden || !input) {
          clearSheetGeometry(cityList);
          clearSheetGeometry(warehouseList);
          document.body.classList.remove("np-keyboard-open");
          return;
        }

        const vv = window.visualViewport;
        const visualTop = Math.max(0, Number(vv?.offsetTop || 0));
        const visualHeight = Math.max(240, Number(vv?.height || window.innerHeight || 0));
        const visualBottom = visualTop + visualHeight;
        const keyboardInset = Math.max(0, Number(window.innerHeight || visualHeight) - visualHeight);
        const keyboardOpen = keyboardInset > 110;
        const rect = input.getBoundingClientRect();
        const gap = 8;
        const edge = 10;
        const minUsefulHeight = 150;
        const desiredHeight = input === warehouse ? 360 : 330;
        const spaceBelow = Math.max(0, visualBottom - rect.bottom - gap - edge);
        const spaceAbove = Math.max(0, rect.top - visualTop - gap - edge);
        const placeBelow = spaceBelow >= minUsefulHeight || spaceBelow >= spaceAbove;
        const available = placeBelow ? spaceBelow : spaceAbove;
        const maxHeight = Math.max(132, Math.min(desiredHeight, available));
        let top = placeBelow ? rect.bottom + gap : rect.top - gap - maxHeight;
        top = Math.max(visualTop + edge, Math.min(top, visualBottom - maxHeight - edge));

        const viewportWidth = Math.max(320, Number(vv?.width || window.innerWidth || 0));
        const visualLeft = Math.max(0, Number(vv?.offsetLeft || 0));
        const horizontalEdge = 12;
        const width = Math.min(Math.max(rect.width, 280), viewportWidth - horizontalEdge * 2);
        const minLeft = visualLeft + horizontalEdge;
        const maxLeft = visualLeft + viewportWidth - width - horizontalEdge;
        const left = Math.max(minLeft, Math.min(rect.left, maxLeft));

        list.style.setProperty("--np-sheet-top", `${Math.round(top)}px`);
        list.style.setProperty("--np-sheet-left", `${Math.round(left)}px`);
        list.style.setProperty("--np-sheet-width", `${Math.round(width)}px`);
        list.style.setProperty("--np-sheet-max-height", `${Math.round(maxHeight)}px`);
        list.dataset.npPlacement = placeBelow ? "below" : "above";
        document.body.classList.toggle("np-keyboard-open", keyboardOpen);
      });
    };
    const portalList = (list) => {
      if (list.parentNode !== document.body) document.body.appendChild(list);
    };
    const restoreList = (list) => {
      const anchor = listAnchors.get(list);
      if (anchor?.parentNode && list.parentNode !== anchor.parentNode) {
        anchor.parentNode.insertBefore(list, anchor.nextSibling);
      }
    };
    const syncBackdrop = () => {
      const mobile = isMobileSheet();
      if (!mobile) {
        restoreList(cityList);
        restoreList(warehouseList);
      }
      if (backdrop) backdrop.hidden = true;
      document.body.classList.remove("np-sheet-open", "np-keyboard-open");
      clearSheetGeometry(cityList);
      clearSheetGeometry(warehouseList);
    };
    const openList = (input, list) => {
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      activeList = list;
      activeInput = input;
      if (isMobileSheet()) openMobilePicker(input, list);
      else restoreList(list);
      syncBackdrop();
    };
    const closeList = (input, list) => {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      if (mobilePickerList === list) closeMobilePicker();
      if (activeList === list) {
        activeList = null;
        activeInput = null;
      }
      restoreList(list);
      syncBackdrop();
    };
    const closeAll = () => {
      closeList(city, cityList);
      closeList(warehouse, warehouseList);
    };
    const setLoading = (input, loading) => input.closest(".np-combobox")?.classList.toggle("is-loading", loading);
    const showState = (input, list, text, actions = []) => {
      list.innerHTML = `<div class="np-suggestions__head"><strong>${input === city ? "Оберіть населений пункт" : "Оберіть відділення"}</strong><button aria-label="Закрити" class="np-suggestions__close" type="button">×</button></div><div class="np-suggestions__state">${escapeText(text)}${actions.length ? `<div class="np-suggestions__actions">${actions.map((item, index) => `<button type="button" data-np-action="${index}">${escapeText(item.label)}</button>`).join("")}</div>` : ""}</div>`;
      list.querySelector(".np-suggestions__close")?.addEventListener("click", () => closeList(input, list));
      actions.forEach((item, index) => list.querySelector(`[data-np-action="${index}"]`)?.addEventListener("click", item.run));
      openList(input, list);
    };
    const renderItems = (input, list, items, select, title) => {
      if (!items.length) {
        showState(input, list, "Нічого не знайдено. Уточніть назву або адресу.");
        return;
      }
      list.innerHTML = `<div class="np-suggestions__head"><strong>${escapeText(title)}</strong><button aria-label="Закрити" class="np-suggestions__close" type="button">×</button></div><div class="np-suggestions__body">${items.map((item, index) => `<button class="np-suggestion" type="button" role="option" data-index="${index}"><span>${escapeText(item.label)}</span><small>${escapeText(item.shortAddress || item.area || "")}</small></button>`).join("")}</div>`;
      list.querySelector(".np-suggestions__close")?.addEventListener("click", () => closeList(input, list));
      list.querySelectorAll("[data-index]").forEach((button) => button.addEventListener("click", () => select(items[Number(button.dataset.index)])));
      const body = list.querySelector(".np-suggestions__body");
      if (body) body.scrollTop = 0;
      list.scrollTop = 0;
      openList(input, list);
      window.requestAnimationFrame(() => {
        if (body) body.scrollTop = 0;
        list.scrollTop = 0;
        syncSheetViewport();
      });
    };
    const activateManualCity = () => {
      cityRef.value = "";
      if (settlementRef) settlementRef.value = "";
      warehouseRef.value = "";
      form.dataset.npCityManual = "true";
      form.dataset.npWarehouseManual = "true";
      warehouse.disabled = false;
      warehouse.placeholder = "Наприклад: відділення №12 або поштомат №1234";
      if (cityHint) cityHint.textContent = "Місто буде передано менеджеру так, як ви його ввели.";
      if (warehouseHint) warehouseHint.textContent = "Введіть номер або адресу відділення вручну.";
      closeAll();
    };
    const activateManualWarehouse = () => {
      warehouseRef.value = "";
      form.dataset.npWarehouseManual = "true";
      if (warehouseHint) warehouseHint.textContent = "Відділення буде передано менеджеру так, як ви його ввели.";
      closeList(warehouse, warehouseList);
      warehouse.focus({ preventScroll: true });
    };
    const cityError = (query) => showState(city, cityList, "Не вдалося завантажити населені пункти.", [
      { label: "Повторити", run: () => searchCities(query, true) },
      { label: "Ввести вручну", run: activateManualCity }
    ]);
    const warehouseError = (query) => showState(warehouse, warehouseList, "Не вдалося оновити список відділень.", [
      { label: "Повторити", run: () => searchWarehousesRemote(query, true) },
      { label: "Ввести вручну", run: activateManualWarehouse }
    ]);

    async function searchCities(query, force = false) {
      const cacheId = normalize(query);
      const cached = !force ? getCached(CITY_CACHE_KEY, cacheId, CITY_TTL) : null;
      if (cached) {
        renderItems(city, cityList, cached, selectCity, "Знайдені населені пункти");
        return;
      }
      cityController?.abort();
      cityController = new AbortController();
      setLoading(city, true);
      if (cityList.hidden) showState(city, cityList, "Шукаємо населений пункт…");
      try {
        const items = await window.VAHomeSupabase.novaPoshtaLookup({ action: "cities", query }, { signal: cityController.signal });
        putCached(CITY_CACHE_KEY, cacheId, items, 24);
        if (normalize(city.value) !== cacheId) return;
        renderItems(city, cityList, items, selectCity, "Знайдені населені пункти");
      } catch (error) {
        if (error?.name !== "AbortError") cityError(query);
      } finally {
        setLoading(city, false);
      }
    }

    function applyPreloadedWarehouses(items, requestedCityRef) {
      if (cityRef.value !== requestedCityRef || form.elements.deliveryMethod?.value === "nova_poshta_courier") return false;
      warehouseItems = Array.isArray(items) ? items : [];

      if (warehouseItems.length === 1) {
        const onlyWarehouse = warehouseItems[0];
        const isPostomat = normalize(`${onlyWarehouse.type || ""} ${onlyWarehouse.label || ""}`).includes("поштомат");
        selectWarehouse(onlyWarehouse, { automatic: true, isPostomat });
        return true;
      }

      if (warehouseHint) {
        warehouseHint.textContent = warehouseItems.length
          ? "Список готовий — введіть номер або частину адреси."
          : "Відділення не знайдено — спробуйте пошук або введіть дані вручну.";
      }
      return false;
    }

    async function preloadWarehouses(force = false) {
      if (!cityRef.value || form.elements.deliveryMethod?.value === "nova_poshta_courier") return;
      const requestedCityRef = cityRef.value;
      const cacheId = requestedCityRef;
      const cached = !force ? getCached(WAREHOUSE_CACHE_KEY, cacheId, WAREHOUSE_TTL) : null;
      if (cached) {
        warehouseLoading = false;
        setLoading(warehouse, false);
        applyPreloadedWarehouses(cached, requestedCityRef);
        return;
      }
      warehouseController?.abort();
      const controller = new AbortController();
      warehouseController = controller;
      warehouseLoading = true;
      setLoading(warehouse, true);
      if (warehouseHint) warehouseHint.textContent = "Завантажуємо актуальний список відділень…";
      try {
        const items = await window.VAHomeSupabase.novaPoshtaLookup({ action: "warehouses", city_ref: requestedCityRef, query: "" }, { signal: controller.signal });
        if (cityRef.value !== requestedCityRef || form.elements.deliveryMethod?.value === "nova_poshta_courier") return;
        putCached(WAREHOUSE_CACHE_KEY, cacheId, items, 8);
        applyPreloadedWarehouses(items, requestedCityRef);
      } catch (error) {
        if (error?.name !== "AbortError" && cityRef.value === requestedCityRef && warehouseHint) {
          warehouseHint.textContent = "Введіть номер або адресу — пошук спробує завантажити дані ще раз.";
        }
      } finally {
        if (warehouseController === controller) {
          warehouseLoading = false;
          setLoading(warehouse, false);
        }
      }
    }

    async function searchWarehousesRemote(query, force = false) {
      if (!cityRef.value) return;
      warehouseController?.abort();
      warehouseController = new AbortController();
      setLoading(warehouse, true);
      try {
        const items = await window.VAHomeSupabase.novaPoshtaLookup({ action: "warehouses", city_ref: cityRef.value, query }, { signal: warehouseController.signal });
        const merged = [...warehouseItems, ...items].filter((item, index, all) => item.ref && all.findIndex((entry) => entry.ref === item.ref) === index);
        warehouseItems = merged.slice(0, 300);
        putCached(WAREHOUSE_CACHE_KEY, cityRef.value, warehouseItems, 8);
        if (normalize(warehouse.value) !== normalize(query)) return;
        renderWarehouseMatches(query);
      } catch (error) {
        if (error?.name !== "AbortError") warehouseError(query);
      } finally {
        setLoading(warehouse, false);
      }
    }

    function selectCity(item) {
      city.value = item.label;
      cityRef.value = item.ref;
      if (settlementRef) settlementRef.value = item.settlementRef || "";
      warehouse.value = "";
      warehouseRef.value = "";
      warehouse.disabled = false;
      warehouse.placeholder = "Номер або частина адреси";
      form.dataset.npCityManual = "false";
      form.dataset.npWarehouseManual = "false";
      if (cityHint) cityHint.textContent = "Населений пункт вибрано.";
      closeList(city, cityList);
      if (isMobileSheet()) { closeMobilePicker(); city.blur(); }
      preloadWarehouses();
      city.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function selectWarehouse(item, { automatic = false, isPostomat = false } = {}) {
      warehouse.value = item.label;
      warehouseRef.value = item.ref;
      form.dataset.npWarehouseManual = "false";
      if (warehouseHint) {
        warehouseHint.textContent = automatic
          ? (isPostomat ? "Єдиний доступний поштомат обрано автоматично." : "Єдине доступне відділення обрано автоматично.")
          : "Відділення вибрано.";
      }
      closeList(warehouse, warehouseList);
      if (isMobileSheet()) { closeMobilePicker(); warehouse.blur(); }
      warehouse.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function renderWarehouseMatches(query) {
      const needle = normalize(query);
      const numericNeedle = /^\d+$/.test(needle);
      const scoreMatch = (item) => {
        if (!needle) return 0;
        const number = normalize(item.number || "").replace(/^№/, "");
        const label = normalize(item.label || "");
        const address = normalize(item.shortAddress || "");
        if (numericNeedle) {
          if (number === needle) return 0;
          if (number.startsWith(needle)) return 1;
          if (label.startsWith(`відділення №${needle}`) || label.startsWith(`поштомат \"нова пошта\" №${needle}`)) return 2;
          if (number.includes(needle)) return 3;
          if (label.includes(needle)) return 4;
          if (address.includes(needle)) return 5;
          return 99;
        }
        if (label.startsWith(needle)) return 0;
        if (address.startsWith(needle)) return 1;
        if (label.includes(needle)) return 2;
        if (address.includes(needle)) return 3;
        return 99;
      };
      const matches = warehouseItems
        .map((item, index) => ({ item, index, score: scoreMatch(item) }))
        .filter((entry) => !needle || entry.score < 99)
        .sort((a, b) => a.score - b.score || a.index - b.index)
        .slice(0, 40)
        .map((entry) => entry.item);
      if (matches.length) {
        renderItems(warehouse, warehouseList, matches, selectWarehouse, needle ? "Знайдені відділення" : "Оберіть відділення");
      } else if (warehouseLoading) {
        showState(warehouse, warehouseList, "Оновлюємо список відділень…");
      } else if (needle.length >= 2) {
        showState(warehouse, warehouseList, "Шукаємо точний збіг…", [{ label: "Ввести вручну", run: activateManualWarehouse }]);
      }
    }

    city.addEventListener("input", () => {
      clearTimeout(cityTimer);
      cityController?.abort();
      if (form.dataset.npCityManual === "true") {
        cityRef.value = "";
        if (settlementRef) settlementRef.value = "";
        warehouse.disabled = false;
        closeList(city, cityList);
        return;
      }
      cityRef.value = "";
      if (settlementRef) settlementRef.value = "";
      warehouseRef.value = "";
      warehouse.value = "";
      warehouseItems = [];
      warehouse.disabled = true;
      form.dataset.npCityManual = "false";
      form.dataset.npWarehouseManual = "false";
      const query = city.value.trim();
      if (query.length < 3) {
        const message = query.length ? `Ще ${3 - query.length} ${query.length === 2 ? "літера" : "літери"} для пошуку.` : "Введіть щонайменше 3 літери для пошуку.";
        if (cityHint) cityHint.textContent = query.length ? `Ще ${3 - query.length} ${query.length === 2 ? "літера" : "літери"} для пошуку.` : "Пошук почнеться після 3 літер.";
        if (isMobileSheet() && !mobilePicker.hidden) showState(city, cityList, message);
        else closeList(city, cityList);
        return;
      }
      if (cityHint) cityHint.textContent = "Оберіть населений пункт зі списку.";
      cityTimer = window.setTimeout(() => searchCities(query), 220);
    });

    city.addEventListener("focus", () => {
      if (form.dataset.npCityManual === "true") return;
      if (isMobileSheet()) {
        openMobilePicker(city, cityList);
        const query = city.value.trim();
        if (!query) showState(city, cityList, "Введіть щонайменше 3 літери для пошуку.");
        else if (!cityRef.value && query.length >= 3) searchCities(query);
        return;
      }
      const query = city.value.trim();
      if (!cityRef.value && query.length >= 3) searchCities(query);
    });
    city.addEventListener("click", () => {
      if (isMobileSheet() && form.dataset.npCityManual !== "true") city.focus({ preventScroll: true });
    });

    warehouse.addEventListener("input", () => {
      clearTimeout(warehouseTimer);
      warehouseController?.abort();
      warehouseRef.value = "";
      if (form.dataset.npWarehouseManual === "true") {
        closeList(warehouse, warehouseList);
        return;
      }
      form.dataset.npWarehouseManual = "false";
      const query = warehouse.value.trim();
      if (form.elements.deliveryMethod?.value === "nova_poshta_courier") return closeList(warehouse, warehouseList);
      if (!cityRef.value) {
        if (form.dataset.npCityManual === "true") return;
        showState(warehouse, warehouseList, "Спочатку оберіть місто зі списку.");
        return;
      }
      renderWarehouseMatches(query);
      const localCount = warehouseItems.filter((item) => normalize(`${item.number || ""} ${item.label || ""} ${item.shortAddress || ""}`).includes(normalize(query))).length;
      if (query.length >= 2 && localCount < 4) warehouseTimer = window.setTimeout(() => searchWarehousesRemote(query), 260);
    });

    warehouse.addEventListener("focus", () => {
      if (form.dataset.npWarehouseManual === "true") return;
      if (form.elements.deliveryMethod?.value === "nova_poshta_courier") return;
      if (isMobileSheet()) openMobilePicker(warehouse, warehouseList);
      if (!cityRef.value) {
        if (form.dataset.npCityManual !== "true") showState(warehouse, warehouseList, "Спочатку оберіть місто зі списку.");
        return;
      }
      if (!warehouseItems.length && !warehouseLoading) preloadWarehouses();
      renderWarehouseMatches(warehouse.value.trim());
    });
    warehouse.addEventListener("click", () => {
      if (isMobileSheet() && !warehouse.disabled && form.dataset.npWarehouseManual !== "true") warehouse.focus({ preventScroll: true });
    });

    [city, warehouse].forEach((input) => input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAll();
    }));
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".np-combobox") && !event.target.closest(".np-suggestions")) closeAll();
    });
    backdrop?.addEventListener("click", closeAll);
    window.addEventListener("resize", () => { syncMobileReadonly(); syncBackdrop(); });
    window.addEventListener("scroll", syncSheetViewport, { passive: true });
    window.visualViewport?.addEventListener("resize", syncSheetViewport);
    window.visualViewport?.addEventListener("scroll", syncSheetViewport);

    const apiReady = window.VAHomeSupabase?.configured?.() && typeof window.VAHomeSupabase.novaPoshtaLookup === "function";
    if (!apiReady) {
      activateManualCity();
      if (cityHint) cityHint.textContent = "Введіть місто вручну.";
    } else if (cityRef.value) {
      warehouse.disabled = false;
      warehouse.placeholder = "Номер або частина адреси";
      preloadWarehouses();
    } else if (city.value.trim()) {
      // A remembered city name without Nova Poshta refs is not manual input.
      // Keep search active so tapping the field can verify the city instead of
      // silently disabling suggestions on Safari/PWA.
      form.dataset.npCityManual = "false";
      form.dataset.npWarehouseManual = "false";
      warehouse.value = "";
      warehouseRef.value = "";
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
      const hint = document.getElementById("deliveryMethodHint");
      if (hint) hint.textContent = courier
        ? "Кур’єрська доставка оплачується отримувачем за тарифами Нової пошти."
        : "Вартість доставки сплачує отримувач за тарифами Нової пошти.";
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
      if (name === "customerName" && !invalid) invalid = field.value.trim().length < 3;
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
      "courierHouse", "courierApartment", "paymentMethod", "customerComment"
    ];
    let draft = {};
    try { draft = JSON.parse(sessionStorage.getItem(key) || "{}"); } catch (_) { draft = {}; }
    names.forEach((name) => {
      const field = form.elements[name];
      if (field && draft[name] && (name === "paymentMethod" || name === "deliveryMethod" || !field.value)) field.value = draft[name];
    });
    const save = () => {
      const next = {};
      names.forEach((name) => { const field = form.elements[name]; if (field) next[name] = field.value; });
      try { sessionStorage.setItem(key, JSON.stringify(next)); } catch (_) {}
    };
    form.addEventListener("input", save);
    form.addEventListener("change", save);
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
    initDeliveryMethod(form);
    initNovaPoshtaCheckout(form);
    initPaymentCards(form);
    initMobileCheckoutAction();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      placeOrder(form, button);
    });

    form.addEventListener("input", (event) => {
      const field = event.target.closest(".form-field input, .form-field select, .form-field textarea");
      if (field && field.closest(".form-field")) field.closest(".form-field").classList.remove("has-error");
    });
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
