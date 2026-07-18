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
    "discovery-17": { name: "Discovery Set — 17 ароматів", price: 450, volume: "17 пробників", image: "images/discovery/discovery-set.webp" }
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

  function add(id, qty) {
    const items = readRaw();
    const existing = items.find((i) => i.productId === id);
    if (existing) {
      existing.quantity = clamp(existing.quantity + (qty || 1));
    } else {
      items.push({ productId: id, quantity: clamp(qty || 1) });
    }
    writeRaw(items);
  }

  function remove(id) {
    const items = readRaw().filter((i) => i.productId !== id);
    writeRaw(items);
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
  function validateCheckoutForm(form) {
    let valid = true;
    const requiredFields = ["customerName", "customerPhone", "customerEmail", "customerCity", "deliveryMethod", "deliveryDetails", "paymentMethod"];
    requiredFields.forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      const wrap = field.closest(".form-field");
      let invalid = !field.value || !field.value.trim();
      if (name === "customerEmail" && !invalid) invalid = !/^\S+@\S+\.\S+$/.test(field.value.trim());
      if (wrap) wrap.classList.toggle("has-error", invalid);
      field.setAttribute("aria-invalid", invalid ? "true" : "false");
      if (invalid) valid = false;
    });
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

  function createOrderNumber() {
    const now = new Date();
    const date = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    return `VA-${date}-${suffix}`;
  }

  function buildOrderPayload(form) {
    const items = getItems();
    return {
      client_order_id: createOrderNumber(),
      customer_name: form.elements.customerName.value.trim(),
      customer_phone: form.elements.customerPhone.value.trim(),
      customer_email: form.elements.customerEmail.value.trim().toLowerCase(),
      customer_city: form.elements.customerCity.value.trim(),
      delivery_method: form.elements.deliveryMethod.value,
      delivery_details: form.elements.deliveryDetails.value.trim(),
      payment_method: form.elements.paymentMethod.value,
      customer_comment: form.elements.customerComment ? form.elements.customerComment.value.trim() || null : null,
      items: items.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, unit_price: item.price, line_total: item.lineTotal })),
      total_amount: getTotal(),
      status: "new",
      source: "website"
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

  async function placeOrder(form, button) {
    if (!getItems().length) {
      if (window.VAHome) window.VAHome.showToast("Кошик порожній");
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
      await window.VAHomeSupabase.submitOrder(payload);

      const confirmation = {
        orderNumber: payload.client_order_id,
        customerName: payload.customer_name,
        customerEmail: payload.customer_email,
        paymentMethod: payload.payment_method,
        items: payload.items,
        total: payload.total_amount,
        createdAt: new Date().toISOString()
      };
      sessionStorage.setItem("vahome_last_order", JSON.stringify(confirmation));

      // Email is intentionally non-blocking: the order remains accepted even if
      // the optional Resend/Supabase Edge Function is not deployed yet.
      if (window.VAHomeSupabase.notifyOrder) {
        window.VAHomeSupabase.notifyOrder(payload).catch((error) => console.warn("Order email is not active yet", error));
      }

      clear();
      window.location.href = "thank-you.html";
    } catch (error) {
      console.error("Order creation failed", error);
      setCheckoutState(button, "idle", "Замовлення не збережено. Перевірте з'єднання та повторіть спробу.", true);
    }
  }

  function initCheckoutForm() {
    const form = document.getElementById("checkoutForm");
    if (!form) return;
    const button = document.getElementById("placeOrderBtn");

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
