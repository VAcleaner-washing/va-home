(function () {
  "use strict";

  const endpoint = `${SITE_CONFIG.supabase.url}/rest/v1/wishlists`;
  let saved = new Set();

  function session() {
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || "";
        if (!/^sb-.*-auth-token$/.test(key)) continue;
        const value = JSON.parse(localStorage.getItem(key));
        const accessToken = value?.access_token || value?.currentSession?.access_token;
        const userId = value?.user?.id || value?.currentSession?.user?.id;
        if (accessToken && userId) return { accessToken, userId };
      }
    } catch (_) { /* Private storage or malformed auth data. */ }
    return null;
  }
  function headers(token, extra) {
    return Object.assign({
      apikey: SITE_CONFIG.supabase.publishableKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }, extra || {});
  }
  function toast(text) { window.VAHome?.showToast(text); }
  function heart(active) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="${active ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>`;
  }
  function updateButtons() {
    document.querySelectorAll("[data-wishlist]").forEach((button) => {
      const active = saved.has(button.dataset.wishlist);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("title", active ? "Видалити зі списку бажань" : "Додати у список бажань");
      button.innerHTML = `${heart(active)}<span>${button.classList.contains("product-wishlist") ? (active ? "У списку бажань" : "У список бажань") : ""}</span>`;
    });
  }
  function decorate() {
    document.querySelectorAll(".product-card[data-product-id]").forEach((card) => {
      if (card.querySelector("[data-wishlist]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "product-card__wishlist";
      button.dataset.wishlist = card.dataset.productId;
      button.setAttribute("aria-label", "Додати аромат у список бажань");
      card.querySelector(".product-card__media")?.append(button);
    });
    const productId = location.pathname.match(/\/products\/([^/]+)\.html$/)?.[1];
    const slot = document.getElementById("productWishlistSlot");
    if (productId && slot) {
      const existing = Array.from(document.querySelectorAll(`.product-wishlist[data-wishlist="${productId}"]`));
      const button = existing.shift() || document.createElement("button");
      existing.forEach((duplicate) => duplicate.remove());
      button.type = "button";
      button.className = "product-wishlist";
      button.dataset.wishlist = productId;
      button.setAttribute("aria-label", "Додати аромат у список бажань");
      if (!slot.contains(button)) slot.replaceChildren(button);
    }
    updateButtons();
  }
  async function load() {
    const auth = session();
    if (!auth) return decorate();
    try {
      const response = await fetch(`${endpoint}?select=product_slug`, { headers: headers(auth.accessToken) });
      if (response.ok) saved = new Set((await response.json()).map((row) => row.product_slug));
    } catch (_) { /* Wishlist is optional; shopping remains available. */ }
    decorate();
  }
  async function toggle(productSlug, button) {
    const auth = session();
    if (!auth) {
      toast("Увійдіть у кабінет, щоб зберігати аромати");
      setTimeout(() => { location.href = `${document.querySelector("#site-header")?.dataset.root || ""}account.html`; }, 650);
      return;
    }
    button.disabled = true;
    const isSaved = saved.has(productSlug);
    try {
      const response = await fetch(isSaved ? `${endpoint}?product_slug=eq.${encodeURIComponent(productSlug)}` : endpoint, {
        method: isSaved ? "DELETE" : "POST",
        headers: headers(auth.accessToken, isSaved ? {} : { Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: isSaved ? undefined : JSON.stringify({ user_id: auth.userId, product_slug: productSlug })
      });
      if (!response.ok) throw new Error("wishlist-request");
      if (isSaved) saved.delete(productSlug); else saved.add(productSlug);
      updateButtons();
      toast(isSaved ? "Видалено зі списку бажань" : "Збережено у списку бажань");
    } catch (_) { toast("Не вдалося оновити список бажань"); }
    finally { button.disabled = false; }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-wishlist]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    toggle(button.dataset.wishlist, button);
  });
  document.addEventListener("vahome:products-rendered", decorate);
  document.addEventListener("vahome:wishlist-changed", (event) => {
    const detail = event.detail || {};
    if (!detail.productSlug) return;
    if (detail.saved) saved.add(detail.productSlug); else saved.delete(detail.productSlug);
    updateButtons();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
