/* VA HOME v14.0.0 — Private Preview */
(function () {
  "use strict";
  const state = document.getElementById("privatePreviewState");
  const grid = document.getElementById("privatePreviewGrid");
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function show(title, copy, action) {
    state.hidden = false;
    state.innerHTML = `<span class="private-preview-state__mark">VA</span><h2>${esc(title)}</h2><p>${esc(copy)}</p>${action || ""}`;
  }
  function countdown(date) {
    const ms = Math.max(0, new Date(date).getTime() - Date.now());
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return { hours, minutes };
  }
  function product(id) { return (window.PRODUCTS || []).find(p => p.id === id); }
  function render(rows) {
    if (!rows.length) {
      show("Закритий простір готовий", "Активного приватного релізу зараз немає. Наступна Noir-композиція з’явиться тут автоматично за 48 годин до публічного запуску.", '<a class="btn btn-secondary" href="account.html">Повернутися в кабінет</a>');
      return;
    }
    state.hidden = true;
    grid.innerHTML = rows.map(row => {
      const p = row.product_id ? product(row.product_id) : null;
      const timer = countdown(row.public_starts_at);
      const image = row.image_url || p?.images?.main || "";
      return `<article class="private-release">
        <div class="private-release__media">${image ? `<img src="${esc(image)}" alt="${esc(row.title)}" loading="eager" decoding="async">` : '<div class="private-release__placeholder">PRIVATE</div>'}</div>
        <div class="private-release__body">
          <p class="private-release__eyebrow">${esc(row.eyebrow || "PRIVATE RELEASE")}</p>
          <h2>${esc(row.title)}</h2>
          <p class="private-release__copy">${esc(row.description)}</p>
          <div class="private-release__countdown"><div><strong>${timer.hours}</strong><span>годин</span></div><div><strong>${timer.minutes}</strong><span>хвилин до публічного релізу</span></div></div>
          <div class="private-release__actions">${p ? `<a class="btn btn-primary" href="products/${encodeURIComponent(p.id)}.html">Відкрити композицію</a><button class="btn btn-secondary" type="button" data-private-cart="${esc(p.id)}">Додати в кошик</button>` : '<span class="btn btn-secondary" aria-disabled="true">Незабаром</span>'}</div>
        </div>
      </article>`;
    }).join("");
    grid.querySelectorAll("[data-private-cart]").forEach(button => button.addEventListener("click", () => {
      window.Cart?.add(button.dataset.privateCart, 1);
      window.VAHome?.showToast?.("Private release додано в кошик");
    }));
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const cfg = window.SITE_CONFIG?.supabase;
    if (!cfg?.url || !cfg?.publishableKey || !window.supabase) return show("Сервіс тимчасово недоступний", "Спробуйте відкрити Private Preview трохи пізніше.");
    const sb = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    const { data:{ session } } = await sb.auth.getSession();
    if (!session?.user) {
      show("Потрібен вхід у персональний простір", "Private Preview доступний зареєстрованим клієнтам VA HOME.", '<a class="btn btn-primary" href="account.html?returnTo=/private-preview.html">Увійти в кабінет</a>');
      return;
    }
    const { data, error } = await sb.from("private_releases").select("id,slug,eyebrow,title,description,product_id,image_url,preview_starts_at,public_starts_at").eq("active", true).lte("preview_starts_at", new Date().toISOString()).gt("public_starts_at", new Date().toISOString()).order("public_starts_at", { ascending:true });
    if (error) return show("Не вдалося перевірити доступ", "Оновіть сторінку або спробуйте трохи пізніше.");
    render(data || []);
  });
})();
