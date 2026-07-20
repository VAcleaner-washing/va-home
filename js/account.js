(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const money = (value) => `${Number(value || 0).toLocaleString("uk-UA")} грн`;
  const labels = {
    new: "Нове", pending: "Очікує підтвердження", paid: "Оплачено",
    shipped: "Відправлено", completed: "Виконано", cancelled: "Скасовано"
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
    if (currentUser.email_confirmed_at) {
      try { await sb.rpc("claim_customer_orders"); } catch (_) { /* Current orders still load. */ }
    }
    await Promise.allSettled([loadOrders(), loadWishlist()]);
  }
  function showDashboard(currentUser) {
    if (dashboardPromise && user?.id === currentUser.id) return dashboardPromise;
    dashboardPromise = renderDashboard(currentUser).finally(() => { dashboardPromise = null; });
    return dashboardPromise;
  }

  function orderItems(items) {
    return (Array.isArray(items) ? items : []).map((item) => {
      const chosen = Array.isArray(item.selections) ? item.selections : [];
      const nameHtml = item.id
        ? `<a href="products/${esc(item.id)}.html" class="account-order__item-link">${esc(item.name)}</a>`
        : esc(item.name);
      const reviewLink = item.id
        ? `<a href="products/${esc(item.id)}.html#reviews" class="account-order__review-link">Залишити відгук</a>`
        : "";
      return `<div class="account-order__item"><span>${nameHtml} × ${esc(item.quantity)}${chosen.length ? `<small>Обрано: ${chosen.map(esc).join(" · ")}</small>` : ""}${reviewLink}</span><strong>${money(item.line_total)}</strong></div>`;
    }).join("");
  }

  async function loadOrders() {
    const list = $("#accountOrdersList");
    list.innerHTML = '<p class="account-loading-inline">Завантажуємо замовлення…</p>';
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
    list.innerHTML = rows.map((order) => `<article class="account-order">
      <div class="account-order__top"><div><h2>${esc(order.client_order_id)}</h2><small>${new Date(order.created_at).toLocaleDateString("uk-UA")}</small></div>
      <div class="account-order__summary"><span class="order-status order-status--${esc(order.status)}">${esc(labels[order.status] || order.status)}</span><strong>${money(order.total_amount)}</strong></div></div>
      <p class="account-order__payment"><strong>Оплата:</strong> ${order.payment_method === "cash_on_delivery" ? "при отриманні" : "на рахунок"}</p>
      <div class="account-order__items">${orderItems(order.items)}</div>
      ${order.tracking_number ? `<p class="account-order__tracking">ТТН: <strong>${esc(order.tracking_number)}</strong></p>` : ""}
      <div class="account-order__actions"><button class="btn btn-secondary btn-small" data-repeat='${esc(JSON.stringify(order.items || []))}'>Повторити замовлення</button></div>
    </article>`).join("");
    document.querySelectorAll("[data-repeat]").forEach((button) => button.addEventListener("click", () => {
      try {
        JSON.parse(button.dataset.repeat).forEach((item) => window.Cart?.add(item.id, Number(item.quantity) || 1, { selections: Array.isArray(item.selection_ids) ? item.selection_ids : [] }));
        window.VAHome?.showToast("Товари додано в кошик");
      } catch (_) { window.VAHome?.showToast("Не вдалося повторити замовлення"); }
    }));
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
      return `<article class="wishlist-card"><a href="products/${esc(item.id)}.html"><img src="${esc(item.images.main)}" alt="${esc(item.name)} — аромадифузор VA HOME" width="480" height="600" loading="lazy" decoding="async"></a><div class="wishlist-card__body"><h2>${esc(item.name)}</h2><p>${money(price(item))}</p><div class="wishlist-card__actions"><button class="btn btn-primary btn-small" data-wish-cart="${esc(item.id)}">У кошик</button><button class="wishlist-remove" data-wish-remove="${esc(item.id)}" aria-label="Видалити ${esc(item.name)} зі списку бажань">Видалити</button></div></div></article>`;
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

  function bind() {
    $("#wishlistProduct").innerHTML = PRODUCTS.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("");
    $("#wishlistAddForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector("button");
      setBusy(button, true, "Додаємо…");
      $("#wishlistMessage").textContent = "";
      const { error } = await sb.from("wishlists").upsert({ user_id: user.id, product_slug: $("#wishlistProduct").value }, { onConflict: "user_id,product_slug" });
      setBusy(button, false, "");
      $("#wishlistMessage").textContent = error ? "Не вдалося додати аромат." : "Аромат збережено у списку бажань.";
      if (!error) {
        document.dispatchEvent(new CustomEvent("vahome:wishlist-changed", { detail: { productSlug: $("#wishlistProduct").value, saved: true } }));
        await loadWishlist();
      }
    });

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

    document.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => {
      mode = button.dataset.authMode;
      document.querySelectorAll("[data-auth-mode]").forEach((item) => item.classList.toggle("is-active", item === button));
      $("#accountSubmit").dataset.label = mode === "login" ? "Увійти" : "Створити кабінет";
      $("#accountSubmit").textContent = $("#accountSubmit").dataset.label;
      $("#accountForm").elements.password.autocomplete = mode === "login" ? "current-password" : "new-password";
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
    document.querySelectorAll("[data-account-tab]").forEach((button) => button.addEventListener("click", () => {
      document.querySelectorAll("[data-account-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      $("#accountOrders").hidden = button.dataset.accountTab !== "orders";
      $("#accountWishlist").hidden = button.dataset.accountTab !== "wishlist";
    }));
  }

  document.addEventListener("DOMContentLoaded", async () => {
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
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        finishLoading();
        $("#accountAuth").hidden = false;
        $("#accountForm").hidden = true;
        $("#accountRecoveryForm").hidden = false;
        $("#accountDashboard").hidden = true;
      } else if (event === "SIGNED_OUT") { user = null; showAuth(); }
      else if (event === "SIGNED_IN" && session?.user && user?.id !== session.user.id) setTimeout(() => showDashboard(session.user), 0);
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
