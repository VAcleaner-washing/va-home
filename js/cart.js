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
    const requiredFields = ["customerName", "customerPhone", "customerCity", "deliveryMethod"];
    requiredFields.forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      const wrap = field.closest(".form-field");
      const isEmpty = !field.value || !field.value.trim();
      if (wrap) wrap.classList.toggle("has-error", isEmpty);
      field.setAttribute("aria-invalid", isEmpty ? "true" : "false");
      if (isEmpty) valid = false;
    });
    return valid;
  }

  function buildOrderText(form) {
    const items = getItems();
    const total = getTotal();
    const lines = [];
    lines.push("Нове замовлення VA HOME");
    lines.push("");
    lines.push("Товари:");
    items.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name} — ${item.quantity} шт. × ${formatUAH(item.price || 0)} = ${formatUAH(item.lineTotal)}`);
    });
    lines.push("");
    lines.push(`Загальна сума: ${formatUAH(total)}`);
    lines.push("");
    lines.push("Клієнт:");
    lines.push(`Ім'я: ${form.elements.customerName.value.trim()}`);
    lines.push(`Телефон: ${form.elements.customerPhone.value.trim()}`);
    lines.push(`Місто: ${form.elements.customerCity.value.trim()}`);
    lines.push(`Спосіб доставки: ${form.elements.deliveryMethod.value}`);
    const comment = form.elements.customerComment ? form.elements.customerComment.value.trim() : "";
    if (comment) lines.push(`Коментар: ${comment}`);
    return lines.join("\n");
  }

  function initCheckoutForm() {
    const form = document.getElementById("checkoutForm");
    if (!form) return;

    const telegramBtn = document.getElementById("sendTelegramBtn");
    const copyBtn = document.getElementById("copyOrderBtn");

    if (telegramBtn) {
      telegramBtn.addEventListener("click", () => {
        if (!getItems().length) {
          if (window.VAHome) window.VAHome.showToast("Кошик порожній");
          return;
        }
        if (!validateCheckoutForm(form)) {
          if (window.VAHome) window.VAHome.showToast("Заповніть обов'язкові поля");
          return;
        }
        const text = buildOrderText(form);
        const cfg = window.SITE_CONFIG || {};
        if (cfg.telegram && cfg.telegram.username) {
          const url = `https://t.me/${cfg.telegram.username.replace("@", "")}?text=${encodeURIComponent(text)}`;
          window.open(url, "_blank", "noopener");
        } else if (window.VAHome) {
          window.VAHome.showToast("Telegram ще не підключено — скопіюйте текст замовлення");
        }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        if (!getItems().length) {
          if (window.VAHome) window.VAHome.showToast("Кошик порожній");
          return;
        }
        if (!validateCheckoutForm(form)) {
          if (window.VAHome) window.VAHome.showToast("Заповніть обов'язкові поля");
          return;
        }
        const text = buildOrderText(form);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
          }
          if (window.VAHome) window.VAHome.showToast("Текст замовлення скопійовано");
        } catch (e) {
          if (window.VAHome) window.VAHome.showToast("Не вдалося скопіювати текст");
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    refreshCountBadge();
    renderCartPage();
    initCartItemControls();
    initCheckoutForm();
  });
})();
