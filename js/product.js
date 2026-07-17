/* ==========================================================================
   VA HOME — product.js
   Renders a single product page from PRODUCTS data.
   Each products/*.html page sets `const PRODUCT_ID = "...";` before
   loading this script, so the template itself never hardcodes content.
   ========================================================================== */

(function () {
  "use strict";

  const CHARACTER_LABELS = {
    clean: "Чисті",
    fresh: "Свіжі",
    fruity: "Фруктові",
    warm: "Теплі",
    spa: "Спа",
    hotel: "Готельні",
    woody: "Деревні",
    molecular: "Молекулярні"
  };

  const ROOM_LABELS = {
    "living-room": "Вітальня",
    bedroom: "Спальня",
    bathroom: "Ванна",
    hallway: "Передпокій",
    office: "Кабінет"
  };

  const MOOD_LABELS = {
    calm: "Чистота й спокій",
    "warm-evening": "Теплий вечір",
    hotel: "Готельна атмосфера",
    "warm-sweet": "М'яка фруктова композиція"
  };

  const SCALE_LABELS = {
    freshness: "Свіжість",
    sweetness: "Солодкість",
    woodiness: "Деревність",
    cleanliness: "Чистота"
  };

  function badgeMarkup(badge) {
    const map = { new: ["Новинка", "new"], bestseller: ["Bestseller", "bestseller"], limited: ["Limited", "limited"] };
    if (!map[badge]) return "";
    const [label, cls] = map[badge];
    return `<span class="badge badge--${cls}">${label}</span>`;
  }

  function renderTagPills(containerId, values, labelMap) {
    const el = document.getElementById(containerId);
    if (!el) return false;
    if (!values || !values.length) {
      el.closest(".product-detail-section").hidden = true;
      return false;
    }
    el.innerHTML = values
      .map((v) => `<span class="tag-pill">${labelMap[v] || v}</span>`)
      .join("");
    return true;
  }

  function renderScales(containerId, scales) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const entries = Object.entries(scales || {}).filter(
      ([key, value]) => key !== "intensity" && value !== null && value !== undefined
    );
    if (!entries.length) {
      el.closest(".product-detail-section").hidden = true;
      return;
    }
    el.innerHTML = entries
      .map(
        ([key, value]) => `
        <div class="scent-scale__row">
          <span>${SCALE_LABELS[key] || key}</span>
          <div class="scent-scale__track">
            <div class="scent-scale__fill" style="width:${Math.min(100, value * 10)}%"></div>
          </div>
        </div>`
      )
      .join("");
  }

  function renderIntensity(sectionId, textId, scales) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const value = scales ? scales.intensity : null;
    if (value === null || value === undefined) {
      section.hidden = true;
      return;
    }
    const textEl = document.getElementById(textId);
    if (textEl) textEl.textContent = `${value} / 10`;
  }

  function renderNotes(sectionId, product) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    if (!product.notes) {
      section.hidden = true;
      return;
    }
    const { top, heart, base } = product.notes;
    section.querySelector('[data-notes="top"]').textContent = (top || []).join(", ");
    section.querySelector('[data-notes="heart"]').textContent = (heart || []).join(", ");
    section.querySelector('[data-notes="base"]').textContent = (base || []).join(", ");
  }

  function initQtyStepper(product) {
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

  function initAddToCart(product) {
    const btn = document.getElementById("addToCartBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const qtyInput = document.getElementById("qtyInput");
      const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
      if (window.Cart && typeof window.Cart.add === "function") {
        window.Cart.add(product.id, qty);
        if (window.VAHome && window.VAHome.showToast) {
          window.VAHome.showToast(`${product.name} додано в кошик`);
        }
        if (window.Cart.refreshCountBadge) window.Cart.refreshCountBadge();
      } else if (window.VAHome && window.VAHome.showToast) {
        window.VAHome.showToast("Кошик буде доступний найближчим часом");
      }
    });
  }

  function renderSimilar(product) {
    const grid = document.getElementById("similarGrid");
    if (!grid) return;
    const similar = getSimilarProducts(product);
    if (!similar.length) {
      grid.closest(".product-detail-section").hidden = true;
      return;
    }
    grid.innerHTML = similar
      .map((p) => window.VAHomeProducts.renderProductCard(p, "", { context: "product" }))
      .join("");
  }

  function renderProductPage() {
    if (typeof PRODUCT_ID === "undefined") return;
    const product = getProduct(PRODUCT_ID);
    if (!product) return;
    const collection = getCollection(product.collection);
    const price = getProductPrice(product);
    const volume = getProductVolume(product);

    document.title = `${product.name} — ${collection ? collection.name : ""} — VA HOME`;

    const breadcrumbCollection = document.getElementById("breadcrumbCollection");
    if (breadcrumbCollection && collection) {
      breadcrumbCollection.textContent = collection.name;
      breadcrumbCollection.href = `../collections.html#${collection.id}`;
    }
    const breadcrumbName = document.getElementById("breadcrumbName");
    if (breadcrumbName) breadcrumbName.textContent = product.name;

    const mediaEl = document.getElementById("productMedia");
    if (mediaEl && product.images && product.images.main) {
      const imagePath = `../${product.images.main}`;
      mediaEl.classList.remove("placeholder-media");
      // Remove only the placeholder text node, keep the badges container intact
      Array.from(mediaEl.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.remove();
      });
      const img = document.createElement("img");
      img.src = imagePath;
      img.alt = `${product.name} — аромадифузор VA HOME`;
      img.loading = "eager";
      img.width = 600;
      img.height = 750;
      img.onerror = function () {
        mediaEl.classList.add("placeholder-media");
        img.remove();
      };
      mediaEl.appendChild(img);
    }

    const badgesEl = document.getElementById("productBadges");
    if (badgesEl) {
      badgesEl.innerHTML = (product.badges || []).map(badgeMarkup).join("");
    }

    const collectionLabelEl = document.getElementById("productCollectionLabel");
    if (collectionLabelEl && collection) collectionLabelEl.textContent = collection.name;

    const nameEl = document.getElementById("productName");
    if (nameEl) nameEl.textContent = product.name;

    const descEl = document.getElementById("productDesc");
    if (descEl) descEl.textContent = product.shortDescription;

    const volumeEl = document.getElementById("productVolume");
    if (volumeEl) volumeEl.textContent = volume || "";

    const priceEl = document.getElementById("productPrice");
    if (priceEl) priceEl.textContent = price ? `${price}\u00A0грн` : "Ціну уточнюємо";

    renderTagPills("profileTags", product.character, CHARACTER_LABELS);
    renderNotes("notesSection", product);
    renderScales("scalesTrack", product.scales);
    renderIntensity("intensitySection", "intensityValue", product.scales);
    renderTagPills("roomTags", product.room, ROOM_LABELS);
    renderTagPills("moodTags", product.mood, MOOD_LABELS);

    initQtyStepper(product);
    initAddToCart(product);
    renderSimilar(product);
  }

  document.addEventListener("DOMContentLoaded", renderProductPage);
})();
