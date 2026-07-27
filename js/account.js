(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const money = (value) => `${Number(value || 0).toLocaleString("uk-UA")} грн`;
  const labels = {
    new: "Опрацьовується", awaiting_payment: "Очікує оплату", pending: "Підтверджується", paid: "Оплачено",
    shipped: "Передано перевізнику", completed: "Доставлено", cancelled: "Скасовано"
  };
  const REQUEST_TIMEOUT_MS = 12000;
  let sb = null;
  let mode = "login";
  let user = null;
  let dashboardPromise = null;

  function withTimeout(promise, code) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(code || "REQUEST_TIMEOUT")), REQUEST_TIMEOUT_MS);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function product(id) { return typeof getProduct === "function" ? getProduct(id) : null; }
  function price(item) { return typeof getProductPrice === "function" ? getProductPrice(item) : 0; }
  function message(text) { $("#accountMessage").textContent = text || ""; }
  function setBusy(button, busy, busyText) {
    if (!button) return;
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? busyText : button.dataset.label;
  }
  function loadSavedDeliveryIntoForm() {
    const form = document.getElementById("accountDeliveryForm");
    if (!form) return;
    let saved;
    try { saved = JSON.parse(localStorage.getItem("vahome_saved_delivery") || "null"); } catch (_) { saved = null; }
    if (!saved) return;
    if (saved.name) form.savedName.value = saved.name;
    if (saved.phone) form.savedPhone.value = saved.phone;
    if (saved.city) form.savedCity.value = saved.city;
    if (saved.warehouse) form.savedWarehouse.value = saved.warehouse;
  }
  function finishLoading() { $("#accountLoading").hidden = true; }
  function showAuth() {
    finishLoading();
    $("#accountAuth").hidden = false;
    $("#accountDashboard").hidden = true;
  }
  async function renderDashboard(currentUser) {
    user = currentUser;
    finishLoading();
    $("#accountAuth").hidden = true;
    $("#accountDashboard").hidden = false;
    $("#accountEmail").textContent = currentUser.email || "";
    const greeting = $("#accountGreetingName");
    if (greeting) {
      const profileName = String(currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "").trim().split(/\s+/)[0];
      greeting.textContent = profileName ? `, ${profileName}` : "";
    }
    if (currentUser.email_confirmed_at) {
      try { await sb.rpc("claim_customer_orders"); } catch (_) { /* Current orders still load. */ }
    }
    await Promise.allSettled([loadOrders(), loadWishlist(), loadAtmosphereHub()]);
  }
  function showDashboard(currentUser) {
    if (dashboardPromise && user?.id === currentUser.id) return dashboardPromise;
    dashboardPromise = renderDashboard(currentUser).finally(() => { dashboardPromise = null; });
    return dashboardPromise;
  }

  function productImage(id) {
    const product = (window.PRODUCTS || []).find((item) => item.id === id);
    return product?.images?.main || `images/product-story/${id}/hero.webp`;
  }

  function orderProgressHtml(status) {
    if (status === "cancelled") {
      return `<div class="account-order__progress account-order__progress--cancelled"><span>Замовлення скасовано</span></div>`;
    }
    const steps = [
      { key: "new", label: "Прийнято" },
      { key: "paid", label: "Оплачено" },
      { key: "shipped", label: "Відправлено" },
      { key: "completed", label: "Виконано" },
    ];
    const order = ["new", "awaiting_payment", "pending", "paid", "shipped", "completed"];
    const currentIndex = order.indexOf(status);
    const stepIndex = (key) => (key === "new" ? 0 : order.indexOf(key));
    return `<div class="account-order__progress">${steps.map((step) => {
      const done = currentIndex >= stepIndex(step.key);
      return `<div class="account-order__progress-step${done ? " is-done" : ""}"><span class="account-order__progress-dot"></span><span>${step.label}</span></div>`;
    }).join("")}</div>`;
  }

  function orderPreviewHtml(items) {
    const safeItems = (Array.isArray(items) ? items : []).slice(0, 4);
    if (!safeItems.length) return "";
    const thumbs = safeItems.map((item) => {
      const hasProductPage = item.id && !String(item.id).startsWith("discovery-");
      const src = hasProductPage ? `images/product-story/${esc(item.id)}/hero.webp` : "images/discovery/discovery-set.webp";
      return `<span class="account-order__preview-thumb"><img src="${src}" alt="" loading="lazy" onerror="this.parentElement.remove()"></span>`;
    }).join("");
    const extra = Math.max(0, (Array.isArray(items) ? items.length : 0) - safeItems.length);
    return `<div class="account-order__preview" aria-label="Товари в замовленні">${thumbs}${extra ? `<span class="account-order__preview-more">+${extra}</span>` : ""}</div>`;
  }

  function fullSizeItems(order) {
    return (Array.isArray(order?.items) ? order.items : []).filter((item) => item?.id && !String(item.id).startsWith("discovery-"));
  }

  function addOrderItemsToCart(items) {
    let added = 0;
    (Array.isArray(items) ? items : []).forEach((item) => {
      if (!item?.id) return;
      const selections = Array.isArray(item.selection_ids)
        ? item.selection_ids
        : (Array.isArray(item.selections) ? item.selections : []);
      window.Cart?.add(item.id, Math.max(1, Number(item.quantity) || 1), { selections });
      added += 1;
    });
    if (!added) throw new Error("EMPTY_ORDER");
  }

  function renderAccountOverview(orders) {
    const valid = (orders || []).filter((order) => order.status !== "cancelled");
    const count = $("#accountOrdersCount");
    const since = $("#accountMemberSince");
    if (count) count.textContent = String(valid.length);
    if (since) {
      const oldest = [...valid].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
      since.textContent = oldest ? new Date(oldest.created_at).toLocaleDateString("uk-UA", { month: "long", year: "numeric" }) : "сьогодні";
    }
  }

  function renderCurrentScent(orders) {
    const block = $("#currentScent");
    if (!block) return;
    const recentOrder = (orders || []).find((order) => order.status !== "cancelled" && fullSizeItems(order).length);
    if (!recentOrder) { block.hidden = true; return; }
    const item = fullSizeItems(recentOrder)[0];
    const orderedAt = new Date(recentOrder.created_at);
    const ageWeeks = Math.max(0, (Date.now() - orderedAt.getTime()) / 604800000);
    const progress = Math.min(100, Math.round((ageWeeks / 12) * 100));
    $("#currentScentName").textContent = item.name || item.id;
    $("#currentScentImage").src = `images/product-story/${item.id}/hero.webp`;
    $("#currentScentImage").alt = `${item.name || item.id} — ваш аромат зараз`;
    $("#currentScentDate").textContent = `Замовлено ${orderedAt.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}`;
    $("#currentScentProgress").style.width = `${progress}%`;
    $("#currentScentLink").href = `products/${item.id}.html`;
    const note = $("#currentScentNote");
    if (ageWeeks >= 12) note.textContent = "Ймовірно, цикл аромату вже завершився. Можливо, настав час оновити атмосферу.";
    else if (ageWeeks >= 8) note.textContent = "Аромат наближається до завершення рекомендованого циклу. Ви можете повторити його або обрати нову композицію.";
    else note.textContent = "Тривалість залежить від температури, вентиляції та кількості паличок.";
    const repeat = $("#currentScentRepeat");
    repeat.dataset.repeat = JSON.stringify([item]);
    block.hidden = false;
  }

  function orderItems(items) {
    return (Array.isArray(items) ? items : []).map((item) => {
      const chosen = Array.isArray(item.selections) ? item.selections : [];
      const hasProductPage = item.id && !item.id.startsWith("discovery-");
      const imgSrc = hasProductPage
        ? `images/product-story/${esc(item.id)}/hero.webp`
        : "images/discovery/discovery-set.webp";
      const thumbHtml = `<img class="account-order__item-thumb" src="${imgSrc}" alt="" loading="lazy" onerror="this.remove()">`;
      const nameHtml = hasProductPage
        ? `<a href="products/${esc(item.id)}.html" class="account-order__item-link">${esc(item.name)}</a>`
        : esc(item.name);
      const alreadyReviewed = hasProductPage && !!localStorage.getItem(`vahome_review_${item.id}`);
      const reviewLink = hasProductPage
        ? (alreadyReviewed
            ? `<span class="account-order__review-done">✓ Відгук залишено</span>`
            : `<a href="products/${esc(item.id)}.html#reviews" class="account-order__review-link">Залишити відгук</a>`)
        : "";
      return `<div class="account-order__item">${thumbHtml}<span>${nameHtml} × ${esc(item.quantity)}${chosen.length ? `<small>Обрано: ${chosen.map(esc).join(" · ")}</small>` : ""}${reviewLink}</span><strong>${money(item.line_total)}</strong></div>`;
    }).join("");
  }

  async function loadOrders() {
    const list = $("#accountOrdersList");
    list.innerHTML = '<div class="account-orders-skeleton" aria-label="Завантажуємо замовлення"><span></span><span></span></div>';
    let data, error;
    try {
      ({ data, error } = await withTimeout(sb.from("orders")
        .select("client_order_id,created_at,status,total_amount,tracking_number,items,payment_method")
        .order("created_at", { ascending: false }), "ORDERS_TIMEOUT"));
    } catch (_) {
      list.innerHTML = '<p class="account-message">Сервер довго не відповідає. Оновіть сторінку або спробуйте трохи пізніше.</p>';
      return;
    }
    if (error) {
      list.innerHTML = '<p class="account-message">Не вдалося завантажити замовлення. Оновіть сторінку.</p>';
      return;
    }
    const rows = data || [];
    $("#accountOrdersEmpty").hidden = rows.length > 0;
    renderAccountOverview(rows);
    renderCurrentScent(rows);
    list.innerHTML = rows.map((order) => {
      const orderDate = new Date(order.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
      const safeId = esc(order.client_order_id);
      const status = esc(order.status);
      const repeatData = esc(JSON.stringify(order.items || []));
      const tracking = order.tracking_number
        ? `<a class="account-order__track-button" href="https://novaposhta.ua/tracking/?cargo_number=${encodeURIComponent(order.tracking_number)}" target="_blank" rel="noopener">Відстежити</a>`
        : "";
      return `<article class="account-order">
        <div class="account-order__header">
          <div>
            <p class="account-order__label">${orderDate}</p>
            <h3>Замовлення</h3>
            <small>${safeId}</small>
          </div>
          <div class="account-order__summary">
            <span class="order-status order-status--${status}">${esc(labels[order.status] || order.status)}</span>
            <strong>${money(order.total_amount)}</strong>
          </div>
        </div>
        <div class="account-order__products">${orderItems(order.items)}</div>
        <div class="account-order__footer">
          <button class="account-order__toggle" type="button" aria-expanded="false">Деталі</button>
          <div class="account-order__actions">
            <button class="account-order__repeat" type="button" data-repeat='${repeatData}'>Повторити замовлення</button>
            ${tracking}
          </div>
        </div>
        <div class="account-order__details" hidden>
          ${orderProgressHtml(order.status)}
          <p class="account-order__payment"><strong>Оплата:</strong> ${order.payment_method === "cash_on_delivery" ? "при отриманні" : "на рахунок"}</p>
          ${order.tracking_number ? `<p class="account-order__tracking">ТТН: <strong>${esc(order.tracking_number)}</strong></p>` : ""}
        </div>
      </article>`;
    }).join("");
    document.querySelectorAll(".account-order__toggle").forEach((button) => button.addEventListener("click", () => {
      const card = button.closest(".account-order");
      const details = card?.querySelector(".account-order__details");
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      button.textContent = open ? "Деталі" : "Згорнути";
      if (details) details.hidden = open;
    }));
    document.querySelectorAll("[data-repeat]").forEach((button) => button.addEventListener("click", () => {
      try {
        addOrderItemsToCart(JSON.parse(button.dataset.repeat || "[]"));
        window.VAHome?.showToast("Товари додано в кошик");
        button.classList.add("is-added");
        const old = button.textContent;
        button.textContent = "Додано ✓";
        setTimeout(() => { button.textContent = old; button.classList.remove("is-added"); }, 1800);
      } catch (_) { window.VAHome?.showToast("Не вдалося повторити замовлення"); }
    }));
    document.querySelectorAll(".account-order__review-link").forEach((link) => link.addEventListener("click", () => {
      window.VAAnalytics?.event?.("select_content", { content_type: "leave_review_click", item_id: link.getAttribute("href")?.split("/")[1]?.replace(".html#reviews", "") || "" });
    }));
  }


  function profileProductCards(profile) {
    const ids = Array.isArray(profile?.recommendation_ids) ? profile.recommendation_ids.slice(0, 3) : [];
    return ids.map((id) => {
      const item = product(id);
      if (!item) return "";
      const percent = Number(profile?.match_scores?.[id] || 0);
      return `<a class="account-profile-match" href="products/${esc(id)}.html"><img src="${esc(item.images?.main || `images/product-story/${id}/hero.webp`)}" alt="${esc(item.name)}" loading="lazy"><span><strong>${esc(item.name)}</strong><small>${percent}% вашого профілю</small></span></a>`;
    }).join("");
  }

  async function loadScentProfileCard() {
    const host = $("#accountScentProfile");
    if (!host) return;
    let profile = null;
    try {
      const result = await withTimeout(sb.from("user_scent_profiles").select("answers,profile_title,profile_text,profile_tags,recommendation_ids,match_scores,updated_at").maybeSingle(), "PROFILE_TIMEOUT");
      if (!result.error) profile = result.data;
    } catch (_) {}
    profile = profile || window.VAScentProfile?.read?.();
    if (!profile) {
      host.innerHTML = `<p class="eyebrow">SCENT PROFILE</p><h3>Ваш профіль ще не сформовано</h3><p>П’ять коротких відповідей збережуть характер вашого простору та покажуть точність збігу з кожним ароматом.</p><a class="btn btn-primary btn-small" href="scent-guide.html">Створити Scent Profile</a>`;
      return;
    }
    const tags = (profile.profile_tags || []).map((tag) => `<span>${esc(tag)}</span>`).join("");
    host.innerHTML = `<p class="eyebrow">SCENT PROFILE</p><h3>${esc(profile.profile_title || "Ваш ароматичний профіль")}</h3><p>${esc(profile.profile_text || "Персональний профіль збережено у вашому кабінеті.")}</p><div class="account-scent-profile__tags">${tags}</div><div class="account-profile-matches">${profileProductCards(profile)}</div><a class="account-text-link" href="scent-guide.html">Перерахувати профіль →</a>`;
  }

  function creditStatus(credit, promo) {
    if (credit.status === "used" || Number(promo?.usage_count || 0) > 0) return { label: "Використано", cls: "used" };
    if (new Date(credit.expires_at).getTime() < Date.now() || credit.status === "expired") return { label: "Термін завершено", cls: "expired" };
    return { label: "Активний", cls: "active" };
  }

  async function loadDiscoveryCredits() {
    const host = $("#accountDiscoveryCredits");
    if (!host) return;
    let data, error;
    try {
      ({ data, error } = await withTimeout(sb.from("discovery_credits").select("id,amount,status,expires_at,used_at,promo_codes(code,usage_count,ends_at,active)").order("issued_at", { ascending: false }), "CREDIT_TIMEOUT"));
    } catch (_) {
      host.innerHTML = '<p class="account-message">Не вдалося перевірити Discovery Credit.</p>';
      return;
    }
    if (error || !data?.length) {
      host.innerHTML = `<article class="account-credit account-credit--empty"><div><strong>Discovery Credit з’явиться тут</strong><p>Після завершеної покупки Discovery Set ви автоматично отримаєте 150 грн на повнорозмірний аромат.</p></div><a class="btn btn-secondary btn-small" href="discovery-set.html">Відкрити Discovery Set</a></article>`;
      return;
    }
    host.innerHTML = data.map((credit) => {
      const promo = Array.isArray(credit.promo_codes) ? credit.promo_codes[0] : credit.promo_codes;
      const status = creditStatus(credit, promo);
      const expires = new Date(credit.expires_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
      return `<article class="account-credit account-credit--${status.cls}"><div><span class="account-credit__status">${status.label}</span><strong>${money(credit.amount)} Discovery Credit</strong><p>${status.cls === "active" ? `Код діє до ${esc(expires)} на будь-який повнорозмірний аромат.` : "Цей персональний кредит уже недоступний."}</p></div><div class="account-credit__code"><span>Персональний код</span><strong>${esc(promo?.code || "—")}</strong>${status.cls === "active" ? `<button type="button" data-copy-credit="${esc(promo?.code || "")}">Скопіювати</button>` : ""}</div></article>`;
    }).join("");
    host.querySelectorAll("[data-copy-credit]").forEach((button) => button.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(button.dataset.copyCredit); window.VAHome?.showToast("Промокод скопійовано"); } catch (_) {}
    }));
  }

  async function loadPrivatePreviewStatus() {
    const host = $("#accountPrivatePreview");
    if (!host) return;
    try {
      const { data } = await withTimeout(sb.from("private_releases").select("title,public_starts_at").eq("active", true).lte("preview_starts_at", new Date().toISOString()).gt("public_starts_at", new Date().toISOString()).order("public_starts_at", { ascending: true }).limit(1), "PREVIEW_TIMEOUT");
      if (data?.[0]) {
        host.classList.add("is-live");
        host.querySelector("h2").textContent = data[0].title;
        host.querySelector("p:last-child").textContent = "Private release уже доступний у вашому персональному просторі.";
        host.querySelector("a").textContent = "Відкрити реліз";
      }
    } catch (_) {}
  }

  async function loadAtmosphereHub() {
    await Promise.allSettled([loadScentProfileCard(), loadDiscoveryCredits(), loadPrivatePreviewStatus()]);
  }

  async function loadWishlist() {
    const list = $("#accountWishlistList");
    list.innerHTML = '<p class="account-loading-inline">Завантажуємо список бажань…</p>';
    let data, error;
    try {
      ({ data, error } = await withTimeout(sb.from("wishlists").select("product_slug,created_at").order("created_at", { ascending: false }), "WISHLIST_TIMEOUT"));
    } catch (_) {
      list.innerHTML = '<p class="account-message">Список бажань не відповідає. Спробуйте оновити сторінку.</p>';
      return;
    }
    if (error) {
      list.innerHTML = '<p class="account-message">Не вдалося завантажити список бажань.</p>';
      return;
    }
    const rows = (data || []).filter((row) => product(row.product_slug));
    $("#accountWishlistEmpty").hidden = rows.length > 0;
    list.innerHTML = rows.map((row) => {
      const item = product(row.product_slug);
      return `<article class="wishlist-card"><a class="wishlist-card__media" href="products/${esc(item.id)}.html"><img src="${esc(item.images.main)}" alt="${esc(item.name)} — аромадифузор VA HOME" width="320" height="400" loading="lazy" decoding="async"></a><div class="wishlist-card__body"><h2>${esc(item.name)}</h2><p>${money(price(item))}</p><div class="wishlist-card__actions"><button class="btn btn-primary btn-small" data-wish-cart="${esc(item.id)}">У кошик</button><button class="wishlist-remove" data-wish-remove="${esc(item.id)}" aria-label="Видалити ${esc(item.name)} зі списку бажань">Видалити</button></div></div></article>`;
    }).join("");
    document.querySelectorAll("[data-wish-cart]").forEach((button) => button.addEventListener("click", () => {
      window.Cart?.add(button.dataset.wishCart, 1);
      window.VAHome?.showToast("Додано в кошик");
    }));
    document.querySelectorAll("[data-wish-remove]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      const { error: removeError } = await sb.from("wishlists").delete().eq("product_slug", button.dataset.wishRemove);
      if (removeError) $("#wishlistMessage").textContent = "Не вдалося видалити аромат.";
      else {
        document.dispatchEvent(new CustomEvent("vahome:wishlist-changed", { detail: { productSlug: button.dataset.wishRemove, saved: false } }));
        await loadWishlist();
      }
    }));
  }

  function getOAuthRedirectUrl() {
    const url = new URL(`${SITE_CONFIG.siteUrl}/account.html`);
    const requested = new URLSearchParams(location.search).get("returnTo");
    if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
      try { sessionStorage.setItem("vahome_auth_return_to", requested); } catch (_) {}
    }
    return url.toString();
  }

  function consumeOAuthError() {
    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    const description = params.get("error_description") || hash.get("error_description");
    const code = params.get("error") || hash.get("error");
    if (!description && !code) return false;
    message("Не вдалося увійти через Google. Спробуйте ще раз або скористайтеся email.");
    try { history.replaceState({}, document.title, location.pathname); } catch (_) {}
    return true;
  }

  function isIOSStandalone() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
    return ios && standalone;
  }

  function configureGoogleAuthForPWA() {
    if (!isIOSStandalone()) return;
    const button = $("#accountGoogle");
    const hint = $("#googleAuthHint");
    if (!button) return;
    button.dataset.pwaUnsupported = "true";
    if (hint) hint.textContent = "На iPhone в установленому застосунку Google блокує безпечний вхід. Використайте email і пароль або відкрийте сайт у Safari.";
  }

  async function signInWithGoogle() {
    const button = $("#accountGoogle");
    if (!button || button.disabled) return;
    if (button.dataset.pwaUnsupported === "true") {
      return message("Google-вхід недоступний усередині PWA на iPhone. Увійдіть через email або відкрийте vahome.com.ua у Safari.");
    }
    setBusy(button, true, "Переходимо до Google…");
    message("");
    let result;
    try {
      result = await withTimeout(sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getOAuthRedirectUrl(),
          queryParams: { prompt: "select_account" }
        }
      }), "GOOGLE_AUTH_TIMEOUT");
    } catch (_) {
      setBusy(button, false, "");
      return message("Не вдалося відкрити вхід Google. Перевірте інтернет і спробуйте ще раз.");
    }
    if (result?.error) {
      setBusy(button, false, "");
      message("Вхід через Google поки недоступний. Спробуйте email або перевірте налаштування OAuth.");
    }
  }

  function bind() {
    $("#accountGoogle")?.addEventListener("click", signInWithGoogle);
    $("#accountForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = $("#accountSubmit");
      setBusy(button, true, mode === "login" ? "Входимо…" : "Створюємо…");
      const email = event.currentTarget.email.value.trim().toLowerCase();
      const password = event.currentTarget.password.value;
      let result;
      try {
        result = await withTimeout(mode === "login"
          ? sb.auth.signInWithPassword({ email, password })
          : sb.auth.signUp({ email, password, options: { emailRedirectTo: `${SITE_CONFIG.siteUrl}/account.html` } }), "AUTH_TIMEOUT");
      } catch (_) {
        setBusy(button, false, "");
        return message("Сервер входу довго не відповідає. Перевірте інтернет і спробуйте ще раз.");
      }
      setBusy(button, false, "");
      if (result.error) return message(mode === "login" ? "Email або пароль не підходить." : "Не вдалося створити кабінет. Можливо, email уже зареєстрований.");
      if (mode === "signup" && !result.data.session) return message("Перевірте email і підтвердьте реєстрацію.");
      if (result.data.user) await showDashboard(result.data.user);
    });

    $("#accountResetPassword").addEventListener("click", async () => {
      const email = $("#accountForm").elements.email.value.trim().toLowerCase();
      if (!email) return message("Спочатку введіть email.");
      message("Надсилаємо посилання…");
      let error;
      try { ({ error } = await withTimeout(sb.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_CONFIG.siteUrl}/account.html` }), "RESET_TIMEOUT")); }
      catch (_) { return message("Сервер не відповідає. Спробуйте трохи пізніше."); }
      message(error ? "Не вдалося надіслати лист. Спробуйте пізніше." : "Посилання для відновлення пароля надіслано на email.");
    });

    $("#accountRecoveryForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const output = $("#accountRecoveryMessage");
      output.textContent = "Зберігаємо…";
      let error;
      try { ({ error } = await withTimeout(sb.auth.updateUser({ password: event.currentTarget.newPassword.value }), "RECOVERY_TIMEOUT")); }
      catch (_) { output.textContent = "Сервер не відповідає. Спробуйте ще раз."; return; }
      output.textContent = error ? "Не вдалося змінити пароль." : "Пароль змінено.";
      if (!error) setTimeout(() => location.replace("account.html"), 700);
    });

    $("#accountPasswordForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const output = $("#accountPasswordMessage");
      const form = event.currentTarget;
      const pass = form.newPassword.value;
      const confirm = form.newPasswordConfirm.value;
      if (pass.length < 8) { output.textContent = "Пароль має бути щонайменше 8 символів."; return; }
      if (pass !== confirm) { output.textContent = "Паролі не збігаються."; return; }
      output.textContent = "Зберігаємо…";
      let error;
      try { ({ error } = await withTimeout(sb.auth.updateUser({ password: pass }), "PASSWORD_TIMEOUT")); }
      catch (_) { output.textContent = "Сервер не відповідає. Спробуйте ще раз."; return; }
      output.textContent = error ? "Не вдалося змінити пароль." : "Пароль змінено.";
      if (!error) form.reset();
    });

    $("#accountDeliveryForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const details = {
        name: form.savedName.value.trim(),
        phone: form.savedPhone.value.trim(),
        city: form.savedCity.value.trim(),
        warehouse: form.savedWarehouse.value.trim(),
      };
      try { localStorage.setItem("vahome_saved_delivery", JSON.stringify(details)); } catch (_) {}
      const output = $("#accountDeliveryMessage");
      output.textContent = "Збережено. Дані підставляться при наступному оформленні замовлення.";
    });
    loadSavedDeliveryIntoForm();

    document.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => {
      mode = button.dataset.authMode;
      const submit = $("#accountSubmit");
      const toggle = $("#accountModeToggle");
      const prompt = $("#accountModePrompt");
      submit.dataset.label = mode === "login" ? "Увійти" : "Створити акаунт";
      submit.textContent = submit.dataset.label;
      $("#accountForm").elements.password.autocomplete = mode === "login" ? "current-password" : "new-password";
      if (toggle && prompt) {
        toggle.dataset.authMode = mode === "login" ? "signup" : "login";
        toggle.textContent = mode === "login" ? "Створити акаунт" : "Увійти";
        prompt.textContent = mode === "login" ? "Немає акаунта?" : "Вже маєте акаунт?";
      }
      $("#accountResetPassword").hidden = mode !== "login";
      message("");
    }));
    $("#accountLogout").addEventListener("click", async () => {
      setBusy($("#accountLogout"), true, "Виходимо…");
      try { await withTimeout(sb.auth.signOut(), "LOGOUT_TIMEOUT"); } catch (_) {}
      user = null;
      setBusy($("#accountLogout"), false, "");
      showAuth();
    });
    document.querySelectorAll(".password-toggle").forEach((button) => button.addEventListener("click", () => {
      const input = button.parentElement?.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Сховати" : "Показати";
      button.setAttribute("aria-label", show ? "Сховати пароль" : "Показати пароль");
    }));
    document.querySelectorAll("[data-account-tab]").forEach((button) => button.addEventListener("click", () => {
      document.querySelectorAll("[data-account-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      $("#accountOrders").hidden = button.dataset.accountTab !== "orders";
      $("#accountWishlist").hidden = button.dataset.accountTab !== "wishlist";
      $("#accountAtmosphere").hidden = button.dataset.accountTab !== "atmosphere";
      $("#accountSettings").hidden = button.dataset.accountTab !== "settings";
    }));
  }

  document.addEventListener("DOMContentLoaded", async () => {
    configureGoogleAuthForPWA();
    if (!window.supabase?.createClient) {
      finishLoading();
      $("#accountAuth").hidden = false;
      message("Не вдалося завантажити захищений вхід. Оновіть сторінку або перевірте блокувальник скриптів.");
      $("#accountSubmit").disabled = true;
      return;
    }
    sb = window.supabase.createClient(
      SITE_CONFIG.supabase.url,
      SITE_CONFIG.supabase.publishableKey,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    bind();
    consumeOAuthError();
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        finishLoading();
        $("#accountAuth").hidden = false;
        $("#accountForm").hidden = true;
        $("#accountRecoveryForm").hidden = false;
        $("#accountDashboard").hidden = true;
      } else if (event === "SIGNED_OUT") { user = null; showAuth(); }
      else if (event === "SIGNED_IN" && session?.user && user?.id !== session.user.id) setTimeout(async () => {
        await showDashboard(session.user);
        let returnTo = "";
        try {
          returnTo = sessionStorage.getItem("vahome_auth_return_to") || "";
          sessionStorage.removeItem("vahome_auth_return_to");
        } catch (_) {}
        if (returnTo && returnTo !== "/account.html") location.replace(returnTo);
      }, 0);
    });
    let data, error;
    try { ({ data, error } = await withTimeout(sb.auth.getSession(), "SESSION_TIMEOUT")); }
    catch (_) {
      showAuth();
      message("Не вдалося перевірити сесію. Ви можете спробувати увійти ще раз.");
      return;
    }
    if (error) return showAuth();
    if ((location.hash || "").includes("type=recovery")) return;
    data.session?.user ? await showDashboard(data.session.user) : showAuth();
  });
})();
