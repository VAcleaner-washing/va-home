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
    "discovery-6": { name: "Discovery Set — 6 ароматів", price: 150, volume: "6 пробників", image: "images/discovery/discovery-set.webp" },
    "discovery-17": { name: "Discovery Set — 18 ароматів", price: 450, volume: "18 пробників", image: "images/discovery/discovery-set.webp" }
  };

  function readRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
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

  function renderCartPage() {
    const itemsList = document.getElementById("cartItemsList");
    if (!itemsList) return; // not on cart.html

    const items = getItems();
    const emptyState = document.getElementById("cartEmptyState");
    const filledState = document.getElementById("cartFilledState");

    if (!items.length) {
      if (emptyState) emptyState.hidden = false;
      if (filledState) filledState.hidden = true;
      return;
    }

    if (emptyState) emptyState.hidden = true;
    if (filledState) filledState.hidden = false;

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
    if (!city || !warehouse || !cityRef || !warehouseRef || !cityList || !warehouseList) return;

    let cityTimer = 0;
    let warehouseTimer = 0;
    let cityRequest = 0;
    let warehouseRequest = 0;
    form.dataset.npMode = "api";
    warehouse.disabled = true;

    const escapeText = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

    const closeList = (input, list) => {
      list.hidden = true;
      list.innerHTML = "";
      input.setAttribute("aria-expanded", "false");
    };
    const showState = (input, list, text) => {
      list.innerHTML = `<div class="np-suggestions__state">${text}</div>`;
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    };
    const manualMode = (message = "Автопошук тимчасово недоступний — введіть місто вручну.") => {
      form.dataset.npMode = "manual";
      cityRef.value = "";
      if (settlementRef) settlementRef.value = "";
      warehouseRef.value = "";
      warehouse.disabled = false;
      warehouse.placeholder = "Наприклад: відділення №12 або поштомат №1234";
      if (cityHint) cityHint.textContent = message;
      if (warehouseHint) warehouseHint.textContent = "Введіть номер або адресу відділення вручну.";
      closeList(city, cityList);
      closeList(warehouse, warehouseList);
    };
    const renderItems = (input, list, items, select) => {
      if (!items.length) return showState(input, list, "Нічого не знайдено. Уточніть запит.");
      list.innerHTML = items.map((item, index) => `<button class="np-suggestion" type="button" role="option" data-index="${index}">${escapeText(item.label)}<small>${escapeText(item.shortAddress || item.area || "")}</small></button>`).join("");
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      list.querySelectorAll("[data-index]").forEach((button) => {
        button.addEventListener("click", () => select(items[Number(button.dataset.index)]));
      });
    };

    city.addEventListener("input", () => {
      cityRef.value = "";
      if (settlementRef) settlementRef.value = "";
      warehouseRef.value = "";
      warehouse.value = "";
      warehouse.disabled = form.dataset.npMode === "api";
      clearTimeout(cityTimer);
      const query = city.value.trim();
      if (form.dataset.npMode !== "api" || query.length < 2) return closeList(city, cityList);
      cityTimer = setTimeout(async () => {
        const request = ++cityRequest;
        city.closest(".np-combobox")?.classList.add("is-loading");
        showState(city, cityList, "Шукаємо населений пункт…");
        try {
          const items = await window.VAHomeSupabase.novaPoshtaLookup({ action: "cities", query });
          if (request !== cityRequest) return;
          if (!items.length) {
            manualMode("Населений пункт не знайдено в базі — перевірте назву та введіть його вручну.");
            return;
          }
          renderItems(city, cityList, items, (item) => {
            city.value = item.label;
            cityRef.value = item.ref;
            if (settlementRef) settlementRef.value = item.settlementRef || "";
            warehouse.disabled = false;
            warehouse.placeholder = "Введіть номер або адресу відділення";
            if (cityHint) cityHint.textContent = "Населений пункт вибрано з бази Нової пошти.";
            closeList(city, cityList);
            warehouse.focus();
          });
        } catch (error) {
          console.warn("Nova Poshta city lookup unavailable", error);
          manualMode();
        } finally {
          city.closest(".np-combobox")?.classList.remove("is-loading");
        }
      }, 350);
    });

    warehouse.addEventListener("input", () => {
      warehouseRef.value = "";
      clearTimeout(warehouseTimer);
      const query = warehouse.value.trim();
      if (form.dataset.npMode !== "api" || !cityRef.value || query.length < 1) return closeList(warehouse, warehouseList);
      warehouseTimer = setTimeout(async () => {
        const request = ++warehouseRequest;
        warehouse.closest(".np-combobox")?.classList.add("is-loading");
        showState(warehouse, warehouseList, "Шукаємо відділення…");
        try {
          const items = await window.VAHomeSupabase.novaPoshtaLookup({ action: "warehouses", city_ref: cityRef.value, query });
          if (request !== warehouseRequest) return;
          if (!items.length) {
            manualMode("Населений пункт збережено. Дані доставки можна завершити вручну.");
            if (warehouseHint) warehouseHint.textContent = "Відділення не знайдено в базі — введіть номер або адресу вручну.";
            return;
          }
          renderItems(warehouse, warehouseList, items, (item) => {
            warehouse.value = item.label;
            warehouseRef.value = item.ref;
            if (warehouseHint) warehouseHint.textContent = "Відділення вибрано з бази Нової пошти.";
            closeList(warehouse, warehouseList);
          });
        } catch (error) {
          console.warn("Nova Poshta warehouse lookup unavailable", error);
          manualMode();
        } finally {
          warehouse.closest(".np-combobox")?.classList.remove("is-loading");
        }
      }, 300);
    });

    [city, warehouse].forEach((input) => input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeList(input, input === city ? cityList : warehouseList);
    }));
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".np-combobox")) {
        closeList(city, cityList);
        closeList(warehouse, warehouseList);
      }
    });

    if (!window.VAHomeSupabase?.configured?.() || typeof window.VAHomeSupabase.novaPoshtaLookup !== "function") manualMode();
  }

  function validateCheckoutForm(form) {
    let valid = true;
    const requiredFields = ["customerName", "customerPhone", "customerEmail", "customerCity", "deliveryMethod", "deliveryDetails", "paymentMethod"];
    requiredFields.forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      const wrap = field.closest(".form-field");
      let invalid = !field.value || !field.value.trim();
      if (name === "customerCity" && !invalid) invalid = field.value.trim().length < 2;
      if (name === "deliveryDetails" && !invalid) invalid = field.value.trim().length < 3;
      if (name === "customerEmail" && !invalid) invalid = !/^\S+@\S+\.\S+$/.test(field.value.trim());
      if (name === "customerPhone" && !invalid) {
        const phone = field.value.replace(/[^\d+]/g, "");
        invalid = !/^(?:\+?38)?0\d{9}$/.test(phone);
      }
      if (wrap) wrap.classList.toggle("has-error", invalid);
      field.setAttribute("aria-invalid", invalid ? "true" : "false");
      if (invalid) valid = false;
    });
    if (form.dataset.npMode === "api") {
      [["customerCity", "novaPoshtaCityRef"], ["deliveryDetails", "novaPoshtaWarehouseRef"]].forEach(([fieldName, refName]) => {
        const field = form.elements[fieldName];
        const ref = form.elements[refName];
        if (!field || !ref || ref.value) return;
        valid = false;
        field.setAttribute("aria-invalid", "true");
        field.closest(".form-field")?.classList.add("has-error");
      });
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
    return valid;
  }

  function buildOrderPayload(form) {
    const items = getItems();
    return {
      customer_name: form.elements.customerName.value.trim(),
      customer_phone: form.elements.customerPhone.value.trim(),
      customer_email: form.elements.customerEmail.value.trim().toLowerCase(),
      customer_city: form.elements.customerCity.value.trim(),
      nova_poshta_city_ref: form.elements.novaPoshtaCityRef ? form.elements.novaPoshtaCityRef.value.trim() || null : null,
      nova_poshta_settlement_ref: form.elements.novaPoshtaSettlementRef ? form.elements.novaPoshtaSettlementRef.value.trim() || null : null,
      nova_poshta_warehouse_ref: form.elements.novaPoshtaWarehouseRef ? form.elements.novaPoshtaWarehouseRef.value.trim() || null : null,
      delivery_method: form.elements.deliveryMethod.value,
      delivery_details: form.elements.deliveryDetails.value.trim(),
      payment_method: form.elements.paymentMethod.value,
      customer_comment: form.elements.customerComment ? form.elements.customerComment.value.trim() || null : null,
      items: items.map((item) => ({ id: item.id, quantity: item.quantity, selections: item.selections }))
    };
  }

  function setCheckoutState(button, status, message, isError) {
    if (button) {
      button.disabled = status === "loading";
      button.textContent = status === "loading" ? "Оформлюємо…" : "Оформити замовлення";
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
      INVALID_DELIVERY: "Перевірте місто, відділення або поштомат Нової пошти.",
      DELIVERY_VALIDATION_UNAVAILABLE: "Нова пошта тимчасово не підтвердила адресу. Повторіть оформлення або введіть адресу вручну після оновлення сторінки.",
      INVALID_PAYMENT: "Оберіть доступний спосіб оплати.",
      INVALID_ITEMS: "У кошику є некоректний товар. Оновіть кошик і повторіть спробу.",
      INVALID_ITEM: "Один із товарів більше недоступний. Оновіть кошик і повторіть спробу.",
      INVALID_DISCOVERY_SELECTION: "Для Discovery Set потрібно обрати рівно 6 різних ароматів.",
      ORDER_CREATION_FAILED: "Система тимчасово не змогла зберегти замовлення. Повторіть спробу трохи пізніше."
    };
    return messages[code] || "Замовлення не збережено. Перевірте з’єднання та повторіть спробу.";
  }

  async function placeOrder(form, button) {
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
        createdAt: new Date().toISOString()
      };
      sessionStorage.setItem("vahome_last_order", JSON.stringify(confirmation));

      clear();
      window.location.href = "thank-you.html";
    } catch (error) {
      console.error("Order creation failed", error);
      setCheckoutState(button, "idle", orderErrorMessage(error), true);
    }
  }

  function initCheckoutForm() {
    const form = document.getElementById("checkoutForm");
    if (!form) return;
    const button = document.getElementById("placeOrderBtn");
    initNovaPoshtaCheckout(form);

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
    refreshCountBadge();
    renderCartPage();
    initCartItemControls();
    initCheckoutForm();
  });
})();
