(() => {
  "use strict";

  const STORAGE_KEY = "vahome_compare_v1";
  const roomLabels = (window.VA_PRODUCT_LABELS || {}).room || {};
  const scaleLabels = {
    freshness: "Свіжість",
    warmth: "Теплота",
    woodiness: "Деревність",
    intensity: "Інтенсивність",
    cleanliness: "Чистота",
    sweetness: "Солодкість"
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character]));
  }

  function readSelection() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
        .filter(Boolean)
        .slice(0, 3);
    } catch {
      return [];
    }
  }

  function getProductById(id) {
    return (window.PRODUCTS || []).find((product) => product.id === id);
  }

  function getProductCollection(product) {
    return typeof window.getCollection === "function"
      ? window.getCollection(product.collection)
      : null;
  }

  function getImageCandidates(product) {
    const gallery = Array.isArray(product?.images?.gallery)
      ? product.images.gallery
      : [];
    const macro = gallery.find((item) => item?.type === "macro" && item.src)?.src;
    return macro ? [macro] : [];
  }

  function renderScale(product, key) {
    const rawValue = product.scales?.[key];
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return '<span class="oc-scale-empty">—</span>';
    }

    const value = Math.max(0, Math.min(10, Number(rawValue)));
    const bars = Array.from({ length: 10 }, (_, index) => (
      `<i class="${index < value ? "on" : ""}"></i>`
    )).join("");

    return `
      <div class="oc-scale-wrap">
        <div class="oc-scale">${bars}</div>
        <span class="oc-scale-value">${value}/10</span>
      </div>
    `;
  }

  function getRoomNames(product) {
    return (product.room || [])
      .slice(0, 3)
      .map((room) => roomLabels[room] || room)
      .join(" · ") || "Універсальний простір";
  }

  function getNotes(product) {
    return [
      ...(product.notes?.top || []),
      ...(product.notes?.heart || []),
      ...(product.notes?.base || [])
    ].slice(0, 6).join(" · ") || "—";
  }

  function getStrongestScales(product) {
    return Object.entries(product.scales || {})
      .filter(([key]) => scaleLabels[key])
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([key, value]) => `${scaleLabels[key].toLowerCase()} ${value}/10`);
  }

  function getChoiceCopy(product) {
    const scales = product.scales || {};
    if ((scales.freshness || 0) >= 8 && (scales.cleanliness || 0) >= 7) {
      return "хочете чистоту, легкість і відчуття свіжого простору";
    }
    if ((scales.warmth || 0) >= 7) {
      return "цінуєте теплу, обволікаючу атмосферу для вечора";
    }
    if ((scales.woodiness || 0) >= 7) {
      return "шукаєте глибину, дерево й виразний характер";
    }
    if ((scales.intensity || 0) >= 8) {
      return "потрібен аромат, який відчувається одразу";
    }
    return product.suitFor?.replace(/^Підійде, якщо\s*/i, "")
      || "хочете збалансовану композицію на щодень";
  }

  function renderProductHeader(product, index) {
    const collection = getProductCollection(product) || {};
    const candidates = getImageCandidates(product);

    return `
      <article class="oc-product">
        <button class="oc-remove" data-remove="${escapeHtml(product.id)}" aria-label="Прибрати ${escapeHtml(product.name)}">×</button>
        <figure class="oc-sample">
          <img
            src="${escapeHtml(candidates[0] || "")}"
            data-candidates='${escapeHtml(JSON.stringify(candidates))}'
            data-index="0"
            alt="Макродеталь ${escapeHtml(product.name)}"
            loading="${index === 0 ? "eager" : "lazy"}"
            decoding="async"
          >
        </figure>
        <div class="oc-product__copy">
          <p class="oc-product__collection">${escapeHtml(collection.name || product.collection)}</p>
          <span class="oc-product__index">SCENT ${String(index + 1).padStart(2, "0")}</span>
          <h2>${escapeHtml(product.name)}</h2>
          <div class="oc-product__meta">
            <span>${escapeHtml(collection.volume || "100 мл")}</span>
            <strong>${escapeHtml(collection.price || "—")} грн</strong>
          </div>
        </div>
      </article>
    `;
  }

  function renderRow(label, products, renderCell, extraClass = "") {
    const cells = products.map((product) => `
      <div class="oc-cell ${extraClass}" data-product="${escapeHtml(product.name)}">
        ${renderCell(product)}
      </div>
    `).join("");

    return `
      <div class="oc-row">
        <div class="oc-row__label">${label}</div>
        ${cells}
      </div>
    `;
  }

  function renderEmptyState(host) {
    host.innerHTML = `
      <section class="oc-empty">
        <h2>Оберіть щонайменше два аромати.</h2>
        <p>Додайте композиції в каталозі — і поверніться до порівняння.</p>
        <a href="catalog.html">Перейти до каталогу</a>
      </section>
    `;
  }

  function bindImageFallbacks(host) {
    host.querySelectorAll(".oc-sample img").forEach((image) => {
      image.addEventListener("error", () => {
        let candidates = [];
        try {
          candidates = JSON.parse(image.dataset.candidates || "[]");
        } catch {
          candidates = [];
        }

        const nextIndex = (Number(image.dataset.index) || 0) + 1;
        if (nextIndex < candidates.length) {
          image.dataset.index = String(nextIndex);
          image.src = candidates[nextIndex];
        } else {
          image.style.opacity = ".18";
        }
      });
    });
  }

  function bindRemoveActions(host) {
    host.querySelectorAll("[data-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextSelection = readSelection().filter((id) => id !== button.dataset.remove);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSelection));
        renderComparison();
      });
    });
  }

  function renderComparison() {
    const host = document.getElementById("olfactoryCompare");
    if (!host) return;

    const products = readSelection().map(getProductById).filter(Boolean);
    if (products.length < 2) {
      renderEmptyState(host);
      return;
    }

    host.style.setProperty("--oc-count", products.length);
    host.innerHTML = `
      <section class="oc-products">
        ${products.map(renderProductHeader).join("")}
      </section>
      <section class="oc-matrix">
        ${["freshness", "warmth", "woodiness", "intensity", "cleanliness", "sweetness"]
          .map((key) => renderRow(scaleLabels[key], products, (product) => renderScale(product, key)))
          .join("")}
        ${renderRow(
          "Атмосфера",
          products,
          (product) => escapeHtml(product.insights?.aura || product.shortDescription),
          "oc-cell--serif"
        )}
        ${renderRow("Найкраще звучить", products, (product) => escapeHtml(getRoomNames(product)))}
        ${renderRow("Ноти", products, (product) => escapeHtml(getNotes(product)))}
      </section>
      <section class="oc-verdict">
        <div class="oc-verdict__intro">
          <p class="oc-section-label">Якщо обирати лише один</p>
          <h2>Ваш орієнтир.</h2>
        </div>
        <div class="oc-verdict__grid" style="--oc-count:${products.length}">
          ${products.map((product) => `
            <article class="oc-verdict__item">
              <h3>${escapeHtml(product.name)}</h3>
              <p>Обирайте, якщо ${escapeHtml(getChoiceCopy(product))}.</p>
              <ul>${getStrongestScales(product).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
              <a class="oc-product-link" href="products/${escapeHtml(product.id)}.html">Відкрити аромат →</a>
            </article>
          `).join("")}
        </div>
      </section>
    `;

    bindImageFallbacks(host);
    bindRemoveActions(host);
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderComparison();

    const clearButton = document.getElementById("ocClearAll");
    if (clearButton) {
      clearButton.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        renderComparison();
      });
    }
  });
})();
