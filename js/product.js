/* ==========================================================================
   VA HOME — product.js
   Product page CONTENT (name, price, notes, scales, tags, similar aromas)
   is pre-rendered as static HTML directly in each products/*.html file —
   this keeps it crawlable without executing JS. This script only wires up
   the interactive bits: the quantity stepper and "Додати в кошик".
   ========================================================================== */

(function () {
  "use strict";

  function initQtyStepper() {
    const input = document.getElementById("qtyInput");
    const minus = document.getElementById("qtyMinus");
    const plus = document.getElementById("qtyPlus");
    if (!input) return;
    const clamp = (n) => Math.max(1, Math.min(10, n));
    if (minus) {
      minus.addEventListener("click", () => {
        input.value = clamp(parseInt(input.value, 10) - 1 || 1);
      });
    }
    if (plus) {
      plus.addEventListener("click", () => {
        input.value = clamp(parseInt(input.value, 10) + 1 || 1);
      });
    }
    input.addEventListener("change", () => {
      input.value = clamp(parseInt(input.value, 10) || 1);
    });
  }

  function initAddToCart() {
    const btn = document.getElementById("addToCartBtn");
    if (!btn || typeof PRODUCT_ID === "undefined") return;
    btn.addEventListener("click", () => {
      const qtyInput = document.getElementById("qtyInput");
      const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
      const product = typeof getProduct === "function" ? getProduct(PRODUCT_ID) : null;
      const name = product ? product.name : "Товар";

      if (window.Cart && typeof window.Cart.add === "function") {
        window.Cart.add(PRODUCT_ID, qty);
        if (window.VAHome && window.VAHome.showToast) {
          window.VAHome.showToast(`${name} додано в кошик`);
        }
        if (window.Cart.refreshCountBadge) window.Cart.refreshCountBadge();
      } else if (window.VAHome && window.VAHome.showToast) {
        window.VAHome.showToast("Кошик буде доступний найближчим часом");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initQtyStepper();
    initAddToCart();
  });
})();
