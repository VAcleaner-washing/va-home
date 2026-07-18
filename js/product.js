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

  function initCompactDetails() {
    const info = document.querySelector(".product-hero__info");
    if (!info) return;
    const sections = Array.from(info.children).filter((el) => el.classList && el.classList.contains("product-detail-section"));
    if (sections.length < 3) return;

    const byTitle = new Map();
    sections.forEach((section) => {
      const title = section.querySelector(".product-detail-section__title");
      if (title) byTitle.set(title.textContent.trim(), section);
    });

    ["Ароматичний профіль", "Ноти"].forEach((title) => {
      const section = byTitle.get(title);
      if (section) section.classList.add("product-detail-section--compact");
    });

    const groups = [
      { label: "Характер та інтенсивність", titles: ["Візуальні шкали", "Інтенсивність"] },
      { label: "Для якого простору", titles: ["Для якої кімнати", "Яку атмосферу створює"] },
      { label: "Комплектація та використання", titles: ["Комплектація та використання"] },
      { label: "Безпечне використання", titles: ["Безпечне використання"] }
    ];

    const accordion = document.createElement("div");
    accordion.className = "product-accordion";
    groups.forEach((group) => {
      const sources = group.titles.map((title) => byTitle.get(title)).filter((section) => section && !section.hidden);
      if (!sources.length) return;
      const details = document.createElement("details");
      details.className = "product-accordion__item";
      const summary = document.createElement("summary");
      summary.textContent = group.label;
      const content = document.createElement("div");
      content.className = "product-accordion__content";

      sources.forEach((section) => {
        const title = section.querySelector(".product-detail-section__title");
        if (sources.length > 1 && title) {
          const subheading = document.createElement("h3");
          subheading.className = "product-accordion__subheading";
          subheading.textContent = title.textContent.trim();
          content.appendChild(subheading);
        }
        Array.from(section.children).forEach((child) => {
          if (child !== title) content.appendChild(child);
        });
        section.remove();
      });

      details.append(summary, content);
      accordion.appendChild(details);
    });

    const notes = byTitle.get("Ноти");
    if (notes && accordion.children.length) notes.insertAdjacentElement("afterend", accordion);
    info.classList.add("is-compact");

    accordion.querySelectorAll("details").forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        accordion.querySelectorAll("details[open]").forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initQtyStepper();
    initAddToCart();
    initCompactDetails();
  });
})();
