/* ==========================================================================
   VA HOME — products.js
   Shared rendering helpers for product cards. Reused on the homepage,
   catalog, scent-guide results, and "similar aromas" blocks.
   Relies on PRODUCTS / COLLECTIONS from data/products-data.js.
   ========================================================================== */

(function () {
  "use strict";

  function formatPrice(product) {
    const price = getProductPrice(product);
    return price
      ? `${price}\u00A0грн`
      : null;
  }

  function badgeLabel(badge) {
    switch (badge) {
      case "new":
        return "Новинка";
      case "bestseller":
        return "Bestseller";
      case "limited":
        return "Limited";
      default:
        return null;
    }
  }

  /**
   * @param {object} product - entry from PRODUCTS
   * @param {string} root - "" on top-level pages, "" also works from index
   *                         since product cards on the homepage link INTO
   *                         /products/, while pages inside /products/ that
   *                         show "similar" cards must link to siblings.
   * @param {object} opts - { context: "home" | "catalog" | "product" }
   */
  function renderProductCard(product, root, opts) {
    opts = opts || {};
    const context = opts.context || "home";
    const price = formatPrice(product);
    const volume = getProductVolume(product);
    const collection = getCollection(product.collection);

    // Link target depends on where the card is rendered from.
    const href =
      context === "product"
        ? `${product.id}.html`
        : `products/${product.id}.html`;

    // Images always live at /images/ from the site root. On product pages
    // (context "product"), the page itself is one folder deep in /products/,
    // so image paths need an extra "../" regardless of the href root.
    const imgRoot = context === "product" ? "../" : root;
    const hasImage = product.images && product.images.main;
    const mediaMarkup = hasImage
      ? `<img src="${imgRoot}${product.images.main}" alt="${product.name} — аромадифузор VA HOME" loading="lazy" width="480" height="600" onerror="this.closest('.product-card__media').classList.add('placeholder-media');this.remove();">`
      : `<div class="placeholder-media">${product.name}</div>`;

    const badges = (product.badges || [])
      .map(badgeLabel)
      .filter(Boolean)
      .map((label) => `<span class="badge badge--${label === "Новинка" ? "new" : label === "Bestseller" ? "bestseller" : "limited"}">${label}</span>`)
      .join("");

    return `
      <article class="product-card">
        <a href="${root}${href}" class="product-card__media media-zoom" aria-label="${product.name}">
          ${badges ? `<div class="product-card__badges">${badges}</div>` : ""}
          ${mediaMarkup}
        </a>
        <div class="product-card__body">
          <span class="product-card__collection">${collection ? collection.name : ""}</span>
          <a href="${root}${href}"><h3 class="product-card__name">${product.name}</h3></a>
          <p class="product-card__desc">${product.shortDescription}</p>
          <div class="product-card__meta">
            <span>${volume || ""}</span>
            ${
              price
                ? `<span class="product-card__price">${price}</span>`
                : `<span class="product-card__price product-card__price--tbd">Ціну уточнюємо</span>`
            }
          </div>
        </div>
        <div class="product-card__actions">
          <a href="${root}${href}" class="btn btn-secondary btn-block">Детальніше</a>
          ${
            price
              ? `<button type="button" class="btn btn-primary" data-add-to-cart="${product.id}" aria-label="Додати ${product.name} у кошик">+</button>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function renderProductGrid(containerSelector, products, root, opts) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.innerHTML = products
      .map((p) => renderProductCard(p, root, opts))
      .join("");
  }

  window.VAHomeProducts = {
    renderProductCard,
    renderProductGrid,
    formatPrice
  };
})();
