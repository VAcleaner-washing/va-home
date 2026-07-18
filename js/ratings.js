/* VA HOME — approved review ratings on product cards and product pages. */
(function () {
  "use strict";

  function summarize(rows) {
    const map = {};
    (rows || []).forEach((row) => {
      if (!map[row.product_slug]) map[row.product_slug] = { sum: 0, count: 0 };
      map[row.product_slug].sum += Number(row.rating) || 0;
      map[row.product_slug].count += 1;
    });
    Object.keys(map).forEach((key) => {
      map[key].average = map[key].count ? map[key].sum / map[key].count : 0;
    });
    return map;
  }

  function ratingText(data) {
    return data && data.count ? `${data.average.toFixed(1)} · ${data.count}` : "Без відгуків";
  }

  function reviewsLabel(count) {
    const value = Math.abs(Number(count) || 0);
    const mod100 = value % 100;
    const mod10 = value % 10;
    if (mod100 >= 11 && mod100 <= 14) return "відгуків";
    if (mod10 === 1) return "відгук";
    if (mod10 >= 2 && mod10 <= 4) return "відгуки";
    return "відгуків";
  }

  function applyToCards(map) {
    document.querySelectorAll("[data-product-id]").forEach((card) => {
      const id = card.getAttribute("data-product-id");
      const el = card.querySelector("[data-product-rating]");
      if (!el) return;
      const data = map[id];
      el.textContent = data && data.count
        ? `★ ${data.average.toFixed(1)} · ${data.count} ${reviewsLabel(data.count)}`
        : "Без відгуків";
      el.classList.toggle("has-rating", Boolean(data && data.count));
    });
  }

  function applyToProduct(map) {
    if (typeof PRODUCT_ID === "undefined") return;
    const data = map[PRODUCT_ID];
    const compact = document.getElementById("productRatingCompact");
    if (!compact) return;
    if (data && data.count) {
      compact.innerHTML = `<span aria-hidden="true">★★★★★</span> <strong>${data.average.toFixed(1)}</strong> <a href="#reviews">${data.count} ${reviewsLabel(data.count)}</a>`;
    } else {
      compact.innerHTML = `<span aria-hidden="true">★★★★★</span> <a href="#reviewForm">Залишити перший відгук</a>`;
      compact.classList.add("is-empty");
    }
  }

  async function load() {
    if (!window.VAHomeSupabase || !window.VAHomeSupabase.configured()) return;
    try {
      const rows = await window.VAHomeSupabase.getApprovedRatings();
      const map = summarize(rows);
      window.VAHomeRatings = map;
      applyToCards(map);
      applyToProduct(map);
      document.dispatchEvent(new CustomEvent("vahome:ratings-ready", { detail: map }));
    } catch (error) {
      console.warn("VA HOME ratings unavailable", error);
    }
  }

  document.addEventListener("DOMContentLoaded", load);
  document.addEventListener("vahome:products-rendered", () => applyToCards(window.VAHomeRatings || {}));
})();
