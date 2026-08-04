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
  const paymentMethodLabels = {
    bank_transfer: "на рахунок",
    cash_on_delivery: "при отриманні",
    card_online: "карткою онлайн"
  };
  const paymentStatusLabels = {
    unpaid: "очікує оплати",
    pending: "очікує підтвердження банку",
    verification: "перевіряється",
    failed: "не завершено",
    expired: "посилання прострочене",
    paid: "оплачено",
    refunded: "повернено"
  };
  const REQUEST_TIMEOUT_MS = 12000;
  let sb = null;
  let mode = "login";
  let user = null;
  let dashboardPromise = null;
  const accountState = { orders: [], profile: null, ritual: null, credits: [], welcomeCredit: null, welcomeEligibility: null, privateRelease: null, ready: false };

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
    accountState.ready = false;
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
    accountState.ready = true;
    renderNextStep();
    const requestedTab = new URLSearchParams(location.search).get("tab");
    const initialTab = ["orders", "wishlist", "atmosphere", "settings"].includes(requestedTab)
      ? requestedTab
      : "atmosphere";
    activateAccountTab(initialTab);
    if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ block: "center" }), 80);
  }
  function showDashboard(currentUser) {
    if (dashboardPromise && user?.id === currentUser.id) return dashboardPromise;
    dashboardPromise = renderDashboard(currentUser).finally(() => { dashboardPromise = null; });
    return dashboardPromise;
  }  function orderProgressHtml(status) {
    if (status === "cancelled") {
      return `<div class="account-order__progress account-order__progress--cancelled"><span>Замовлення скасовано</span></div>`;
    }
    const steps = [
      { key: "new", label: "Прийнято" },
      { key: "paid", label: "Оплачено" },
      { key: "shipped", label: "Відправлено" },
      { key: "completed", label: "Доставлено" },
    ];
    const order = ["new", "awaiting_payment", "pending", "paid", "shipped", "completed"];
    const currentIndex = order.indexOf(status);
    const stepIndex = (key) => (key === "new" ? 0 : order.indexOf(key));
    return `<div class="account-order__progress">${steps.map((step) => {
      const done = currentIndex >= stepIndex(step.key);
      return `<div class="account-order__progress-step${done ? " is-done" : ""}"><span class="account-order__progress-dot"></span><span>${step.label}</span></div>`;
    }).join("")}</div>`;
  }  function fullSizeItems(order) {
    return (Array.isArray(order?.items) ? order.items : []).filter((item) => item?.id && !String(item.id).startsWith("discovery-"));
  }

  function addOrderItemsToCart(items) {
    let added = 0;
    const orderedItems = [...(Array.isArray(items) ? items : [])].sort((a, b) => Number(String(a?.id || "").startsWith("reeds-")) - Number(String(b?.id || "").startsWith("reeds-")));
    orderedItems.forEach((item) => {
      if (!item?.id) return;
      const selections = Array.isArray(item.selection_ids)
        ? item.selection_ids
        : (Array.isArray(item.selections) ? item.selections : []);
      window.Cart?.add(item.id, Math.max(1, Number(item.quantity) || 1), { selections });
      added += 1;
    });
    if (!added) throw new Error("EMPTY_ORDER");
  }

  function updateActiveOrdersCount(orders) {
    const badge = $("#accountOrdersActiveCount");
    if (!badge) return;
    const active = (orders || []).filter((order) => !["completed", "cancelled"].includes(order.status));
    badge.textContent = String(active.length);
    badge.hidden = active.length === 0;
    badge.setAttribute("aria-label", `${active.length} активних замовлень`);
    badge.closest("button")?.classList.toggle("has-items", active.length > 0);
  }

  function renderAccountOverview(orders) {
    const valid = (orders || []).filter((order) => order.status !== "cancelled");
    const count = $("#accountOrdersCount");
    const since = $("#accountMemberSince");
    if (count) count.textContent = String(valid.length);
    updateActiveOrdersCount(orders);
    if (since) {
      const oldest = [...valid].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
      since.textContent = oldest ? new Date(oldest.created_at).toLocaleDateString("uk-UA", { month: "long", year: "numeric" }) : "сьогодні";
    }
  }

  function renderNextStep() {
    const host = $("#accountNextStep");
    if (!accountState.ready) return;
    const title = $("#accountNextStepTitle");
    const text = $("#accountNextStepText");
    const eyebrow = $("#accountNextStepEyebrow");
    const action = $("#accountNextStepAction");
    const creditLink = $("#accountNextStepCreditLink");
    if (!host || !title || !text || !eyebrow || !action) return;

    const activeOrder = (accountState.orders || []).find((order) => !["completed", "cancelled"].includes(order.status));
    const activeDiscovery = (accountState.credits || []).find((credit) => {
      const promo = Array.isArray(credit.promo_codes) ? credit.promo_codes[0] : credit.promo_codes;
      return creditStatus(credit, promo).cls === "active";
    });
    const welcomePromo = Array.isArray(accountState.welcomeCredit?.promo_codes) ? accountState.welcomeCredit.promo_codes[0] : accountState.welcomeCredit?.promo_codes;
    const activeWelcome = accountState.welcomeCredit && creditStatus(accountState.welcomeCredit, welcomePromo).cls === "active" ? accountState.welcomeCredit : null;
    const activeCredit = activeDiscovery || activeWelcome;
    const currentOrder = (accountState.orders || []).find((order) => order.status === "completed" && fullSizeItems(order).length);
    const currentItem = currentOrder ? fullSizeItems(currentOrder)[0] : null;

    let next = null;
    if (activeOrder) {
      next = {
        eyebrow: "ВАШ НАСТУПНИЙ КРОК · ЗАМОВЛЕННЯ",
        title: ({
          new: "Ваше замовлення вже опрацьовується",
          awaiting_payment: "Замовлення очікує оплату",
          pending: "Ми підтверджуємо ваше замовлення",
          paid: "Оплату підтверджено — готуємо замовлення",
          shipped: "Ваше замовлення вже в дорозі"
        })[activeOrder.status] || "Перевірте статус замовлення",
        text: `Замовлення ${activeOrder.client_order_id || "VA HOME"} має активний статус. Усі деталі й відстеження вже у вашому кабінеті.`,
        label: "Переглянути замовлення",
        href: "account.html?tab=orders"
      };
    } else if (activeCredit) {
      const expires = new Date(activeCredit.expires_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
      const isWelcome = activeCredit.credit_type === "welcome";
      const isFullDiscovery = !isWelcome && Number(activeCredit.amount || 0) >= 450;
      next = {
        eyebrow: `ВАШ НАСТУПНИЙ КРОК · ${isWelcome ? "WELCOME CREDIT" : "DISCOVERY CREDIT"}`,
        title: isWelcome
          ? `${money(activeCredit.amount)} на ваш перший повнорозмірний аромат`
          : isFullDiscovery
            ? `На вашому акаунті — до ${money(activeCredit.amount)} на повнорозмірні аромати`
            : `На вашому акаунті — ${money(activeCredit.amount)} на повнорозмірний аромат`,
        text: isWelcome
          ? `Персональний код діє до ${expires}, лише на першу повнорозмірну покупку та не сумується з іншими пропозиціями.`
          : isFullDiscovery
            ? `250 грн діють на один аромат або всі 450 грн — на замовлення від двох флаконів. Код активний до ${expires}.`
            : `Персональний код діє до ${expires}, прив’язаний до вашого email і використовується один раз.`,
        label: isFullDiscovery ? "Обрати аромати з кредитом" : "Обрати аромат із кредитом",
        href: "catalog.html",
        showCreditLink: true
      };
    } else if (!accountState.profile) {
      next = {
        eyebrow: "ВАШ НАСТУПНИЙ КРОК · SCENT PROFILE",
        title: "Знайдіть свої найточніші композиції",
        text: "П’ять коротких запитань сформують ваш ароматичний профіль і покажуть персональний відсоток збігу з усіма 18 ароматами.",
        label: "Пройти підбір аромату",
        href: "scent-guide.html"
      };
    } else if (currentItem && !accountState.ritual) {
      next = {
        eyebrow: "ВАШ НАСТУПНИЙ КРОК · ROOM RITUAL",
        title: `Налаштуйте ${currentItem.name || currentItem.id} під вашу кімнату`,
        text: "Вкажіть площу та бажану присутність — система підкаже кількість паличок, розташування і догляд.",
        label: "Налаштувати палички",
        href: `room-ritual.html?product=${encodeURIComponent(currentItem.id)}`
      };
    } else {
      const recommendationId = accountState.profile?.recommendation_ids?.[0];
      const recommendation = product(recommendationId);
      next = recommendation ? {
        eyebrow: "ВАШ НАСТУПНИЙ КРОК · ПЕРСОНАЛЬНА РЕКОМЕНДАЦІЯ",
        title: `Познайомтеся з ${recommendation.name}`,
        text: "Це одна з найточніших композицій вашого профілю. Відкрийте її характер, ноти та рекомендації для простору.",
        label: "Переглянути рекомендацію",
        href: `products/${encodeURIComponent(recommendation.id)}.html`
      } : {
        eyebrow: "ВАШ НАСТУПНИЙ КРОК",
        title: "Продовжуйте створювати свою атмосферу",
        text: "Перегляньте колекцію та збережіть композиції, до яких хочеться повернутися.",
        label: "Переглянути аромати",
        href: "catalog.html"
      };
    }

    eyebrow.textContent = next.eyebrow;
    title.textContent = next.title;
    text.textContent = next.text;
    action.textContent = next.label;
    action.href = next.href;
    if (creditLink) creditLink.hidden = !next.showCreditLink;
    host.hidden = false;
  }

  function renderCurrentScent(orders) {
    const block = $("#currentScent");
    if (!block) return;
    const recentOrder = (orders || []).find((order) => order.status === "completed" && fullSizeItems(order).length);
    if (!recentOrder) { block.hidden = true; return; }
    const item = fullSizeItems(recentOrder)[0];
    const orderedAt = new Date(recentOrder.completed_at || recentOrder.created_at);
    const scentDateLabel = recentOrder.completed_at ? "Отримано" : "Замовлено";
    const ageWeeks = Math.max(0, (Date.now() - orderedAt.getTime()) / 604800000);
    const progress = Math.min(100, Math.round((ageWeeks / 12) * 100));
    $("#currentScentName").textContent = item.name || item.id;
    $("#currentScentImage").src = `images/product-story/${item.id}/hero.webp`;
    $("#currentScentImage").alt = `${item.name || item.id} — ваш аромат зараз`;
    $("#currentScentDate").textContent = `${scentDateLabel} ${orderedAt.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}`;
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
      const careLink = hasProductPage
        ? `<a href="products/${esc(item.id)}.html#reedSetupSection" class="account-order__care-link" data-care-product="${esc(item.id)}">Догляд за ароматом</a>`
        : "";
      const itemActions = hasProductPage ? `<span class="account-order__item-actions">${careLink}${reviewLink}</span>` : "";
      return `<div class="account-order__item">${thumbHtml}<span>${nameHtml} × ${esc(item.quantity)}${chosen.length ? `<small>Обрано: ${chosen.map(esc).join(" · ")}</small>` : ""}${itemActions}</span><strong>${money(item.line_total)}</strong></div>`;
    }).join("");
  }

  async function loadOrders() {
    const list = $("#accountOrdersList");
    list.innerHTML = '<div class="account-orders-skeleton" aria-label="Завантажуємо замовлення"><span></span><span></span></div>';
    let data, error;
    try {
      if (!user?.id) throw new Error("ACCOUNT_USER_REQUIRED");
      ({ data, error } = await withTimeout(sb.from("orders")
        .select("client_order_id,created_at,completed_at,status,total_amount,tracking_number,items,payment_method,payment_status")
        .eq("customer_user_id", user.id)
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
    accountState.orders = rows;
    $("#accountOrdersEmpty").hidden = rows.length > 0;
    renderAccountOverview(rows);
    renderCurrentScent(rows);
    renderNextStep();
    list.innerHTML = rows.map((order) => {
      const orderDate = new Date(order.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
      const safeId = esc(order.client_order_id);
      const status = esc(order.status);
      const repeatData = esc(JSON.stringify(order.items || []));
      const tracking = order.tracking_number
        ? `<a class="account-order__track-button" href="https://novaposhta.ua/tracking/?cargo_number=${encodeURIComponent(order.tracking_number)}" target="_blank" rel="noopener">Відстежити</a>`
        : "";
      const cardPaymentAction = order.payment_method === "card_online" && !["paid", "refunded"].includes(order.payment_status)
        ? `<button class="account-order__pay-card" type="button" data-card-payment="${safeId}">Оплатити карткою</button>`
        : "";
      const bankPaymentAction = order.payment_method === "bank_transfer" && !["paid", "refunded"].includes(order.payment_status) && order.status !== "cancelled"
        ? `<button class="account-order__bank-details" type="button" data-bank-payment="${safeId}">${order.status === "new" ? "Де реквізити?" : "Реквізити для оплати"}</button>`
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
            ${cardPaymentAction}
            ${bankPaymentAction}
            <button class="account-order__repeat" type="button" data-repeat='${repeatData}'>Повторити замовлення</button>
            ${tracking}
          </div>
        </div>
        <div class="account-order__details" hidden>
          ${orderProgressHtml(order.status)}
          <p class="account-order__payment"><strong>Оплата:</strong> ${esc(paymentMethodLabels[order.payment_method] || "уточнюється")} · ${esc(paymentStatusLabels[order.payment_status] || "статус уточнюється")}</p>
          ${order.payment_method === "bank_transfer" && !["paid", "refunded"].includes(order.payment_status) && order.status !== "cancelled" ? `<div class="account-payment-details" data-bank-details="${safeId}"><p>${order.status === "new" ? "Замовлення перевіряємо. Після підтвердження реквізити з’являться тут і прийдуть на email." : "Натисніть «Реквізити для оплати», щоб відкрити дані рахунку."}</p></div>` : ""}
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
    document.querySelectorAll("[data-bank-payment]").forEach((button) => button.addEventListener("click", async () => {
      const card = button.closest(".account-order");
      const details = card?.querySelector(".account-order__details");
      const toggle = card?.querySelector(".account-order__toggle");
      const panel = card?.querySelector(`[data-bank-details="${CSS.escape(button.dataset.bankPayment || "")}"]`);
      if (details?.hidden) {
        details.hidden = false;
        if (toggle) { toggle.setAttribute("aria-expanded", "true"); toggle.textContent = "Згорнути"; }
      }
      if (!panel || panel.dataset.loaded === "true" || panel.dataset.loading === "true") {
        panel?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (!window.VAHomeSupabase?.getAccountPaymentDetails) {
        panel.innerHTML = "<p>Реквізити тимчасово недоступні. Спробуйте оновити сторінку.</p>";
        return;
      }
      panel.dataset.loading = "true";
      panel.innerHTML = "<p>Завантажуємо реквізити…</p>";
      try {
        const data = await window.VAHomeSupabase.getAccountPaymentDetails(button.dataset.bankPayment);
        if (data.state === "pending_confirmation") {
          panel.innerHTML = "<p>Замовлення ще перевіряємо. Після підтвердження реквізити з’являться тут і прийдуть на email.</p>";
        } else if (data.state === "available" && data.payment_details) {
          const recipient = esc(data.payment_details.recipient);
          const iban = esc(data.payment_details.iban);
          const purpose = esc(data.payment_details.purpose);
          const amount = money(data.payment_details.amount);
          panel.innerHTML = `<div class="account-payment-details__head"><div><span>Оплата на рахунок</span><h4>Реквізити для оплати</h4></div><strong>${amount}</strong></div>
            <dl class="account-payment-details__list">
              <div><dt>Отримувач</dt><dd>${recipient}</dd></div>
              <div><dt>IBAN</dt><dd class="account-payment-details__iban">${iban}</dd></div>
              <div><dt>Призначення платежу</dt><dd>${purpose}</dd></div>
            </dl>
            <div class="account-payment-details__actions">
              <button type="button" data-copy-payment="all">Скопіювати все</button>
              <button type="button" data-copy-payment="iban">Скопіювати IBAN</button>
            </div><p class="account-payment-details__status" aria-live="polite"></p>`;
          panel.querySelectorAll("[data-copy-payment]").forEach((copyButton) => copyButton.addEventListener("click", async () => {
            const value = copyButton.dataset.copyPayment === "iban"
              ? data.payment_details.iban
              : `Отримувач: ${data.payment_details.recipient}\nIBAN: ${data.payment_details.iban}\nСума: ${amount}\nПризначення платежу: ${data.payment_details.purpose}`;
            try {
              await navigator.clipboard.writeText(value);
              panel.querySelector(".account-payment-details__status").textContent = copyButton.dataset.copyPayment === "iban" ? "IBAN скопійовано" : "Реквізити скопійовано";
            } catch (_) {
              panel.querySelector(".account-payment-details__status").textContent = "Не вдалося скопіювати. Виділіть текст вручну.";
            }
          }));
        } else {
          panel.innerHTML = "<p>Для цього замовлення реквізити вже не потрібні.</p>";
        }
        panel.dataset.loaded = "true";
      } catch (_) {
        panel.innerHTML = "<p>Не вдалося завантажити реквізити. Оновіть сторінку й спробуйте ще раз.</p>";
      } finally {
        delete panel.dataset.loading;
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }));

    document.querySelectorAll("[data-card-payment]").forEach((button) => button.addEventListener("click", async () => {
      if (!window.VAHomeSupabase?.cardPayment) return window.VAHome?.showToast("Оплата тимчасово недоступна");
      const original = button.textContent;
      button.disabled = true;
      button.textContent = "Створюємо оплату…";
      try {
        const result = await window.VAHomeSupabase.cardPayment({
          action: "retry",
          order_number: button.dataset.cardPayment,
          token: ""
        });
        if (!result.payment_url) throw new Error("NO_PAYMENT_URL");
        window.location.assign(result.payment_url);
      } catch (_) {
        button.disabled = false;
        button.textContent = original;
        window.VAHome?.showToast("Не вдалося відкрити оплату. Спробуйте ще раз.");
      }
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
    document.querySelectorAll(".account-order__care-link").forEach((link) => link.addEventListener("click", () => {
      window.VAAnalytics?.event?.("select_content", { content_type: "account_care_guide", item_id: link.dataset.careProduct || "" });
    }));
  }



  function roomRitualTitle(reeds, diameter) {
    const count = Number(reeds || 0);
    const word = count === 1 ? "паличка" : count > 1 && count < 5 ? "палички" : "паличок";
    return `${count} ${word} · ${Number(diameter || 4)} мм`;
  }

  function loadSavedRoomRitual() {
    const host = $("#accountRoomRitual");
    if (!host) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("va_home_room_ritual_v14") || "null"); } catch (_) {}
    const result = saved?.result || saved;
    const productId = result?.product?.id || saved?.inputs?.product;
    const item = product(productId);
    if (!saved || !result || !item || !Number(result.reeds)) {
      accountState.ritual = null;
      host.classList.remove("is-saved");
      host.innerHTML = `<p class="eyebrow">ROOM RITUAL · НАЛАШТУВАННЯ ПАЛИЧОК</p><h3>Налаштування дифузії під кімнату</h3><p>Оберіть кімнату, площу та бажану присутність — система підкаже кількість паличок і догляд.</p><a class="btn btn-primary btn-small" href="room-ritual.html">Налаштувати палички</a>`;
      renderNextStep();
      return;
    }
    const savedAt = saved.savedAt ? new Date(saved.savedAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" }) : "на цьому пристрої";
    const room = String(result.room || "вашій кімнаті");
    const presence = String(result.presence || "збалансована");
    accountState.ritual = saved;
    host.classList.add("is-saved");
    const placement = String(result.placement || "Поставте флакон на відкритій стійкій поверхні на висоті 70–120 см.");
    const care = String(result.care || item?.reedCare?.publicText || "за потреби");
    const productNote = String(item?.reedSetupByArea?.note || item?.diffusion?.tip || "Починайте зі стриманої інтенсивності та змінюйте налаштування поступово.");
    const extraNote = result.extra ? " Для простору понад 25 м² краще додати другий дифузор, а не перевантажувати один флакон." : "";
    host.innerHTML = `<p class="eyebrow">ROOM RITUAL · ЗБЕРЕЖЕНО</p><h3>${esc(item.name)}</h3><p class="account-room-ritual__meta">${esc(result.area)} м² · ${esc(room)} · ${esc(presence)} присутність</p><div class="account-room-ritual__result"><span>Рекомендований старт</span><strong>${esc(roomRitualTitle(result.reeds, result.diameter))}</strong><small>Збережено ${esc(savedAt)}</small></div><dl class="account-room-ritual__guide"><div><dt>Розміщення</dt><dd>${esc(placement)}</dd></div><div><dt>Догляд</dt><dd>Перевертайте палички ${esc(care)} або коли звучання стало тихішим.</dd></div><div><dt>Корекція</dt><dd>Додавайте або прибирайте лише одну паличку за раз.</dd></div><div><dt>Повторна оцінка</dt><dd>Оцініть результат через 24–48 годин після зміни.</dd></div></dl><p class="account-room-ritual__note">${esc(productNote + extraNote)}</p><div class="account-room-ritual__actions"><a class="btn btn-primary btn-small" href="room-ritual.html?restore=1">Відкрити мій ритуал</a><button class="account-room-ritual__remove" type="button" data-remove-room-ritual>Видалити</button></div>`;
    renderNextStep();
    host.querySelector("[data-remove-room-ritual]")?.addEventListener("click", () => {
      try { localStorage.removeItem("va_home_room_ritual_v14"); } catch (_) {}
      loadSavedRoomRitual();
      window.VAHome?.showToast?.("Збережений ритуал видалено");
    });
  }

  function activateAccountTab(tab) {
    const button = document.querySelector(`[data-account-tab="${tab}"]`);
    if (!button) return;
    document.querySelectorAll("[data-account-tab]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
    });
    $("#accountOrders").hidden = tab !== "orders";
    $("#accountWishlist").hidden = tab !== "wishlist";
    $("#accountAtmosphere").hidden = tab !== "atmosphere";
    $("#accountSettings").hidden = tab !== "settings";
    try {
      const url = new URL(location.href);
      if (tab === "atmosphere") url.searchParams.delete("tab");
      else url.searchParams.set("tab", tab);
      history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    } catch (_) {}
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
      accountState.profile = null;
      const profileAction = $("#accountProfileAction");
      if (profileAction) profileAction.textContent = "Створити ароматичний профіль";
      host.innerHTML = `<p class="eyebrow">SCENT PROFILE · ПЕРСОНАЛЬНІ ЗБІГИ</p><h3>Ваш профіль ще не сформовано</h3><p>П’ять коротких відповідей покажуть точність збігу з кожним із 18 ароматів.</p><a class="btn btn-primary btn-small" href="scent-guide.html">Пройти підбір аромату</a>`;
      renderNextStep();
      return;
    }
    accountState.profile = profile;
    const profileAction = $("#accountProfileAction");
    if (profileAction) profileAction.textContent = "Оновити ароматичний профіль";
    const tags = (profile.profile_tags || []).map((tag) => `<span>${esc(tag)}</span>`).join("");
    host.innerHTML = `<p class="eyebrow">SCENT PROFILE · ПЕРСОНАЛЬНІ ЗБІГИ</p><h3>${esc(profile.profile_title || "Ваш ароматичний профіль")}</h3><p>${esc(profile.profile_text || "Персональний профіль збережено у вашому кабінеті.")}</p><div class="account-scent-profile__tags">${tags}</div><div class="account-profile-matches">${profileProductCards(profile)}</div><div class="account-welcome-eligibility" id="accountWelcomeEligibility" hidden></div><a class="account-text-link" href="scent-guide.html">Оновити мої рекомендації →</a>`;
    renderWelcomeEligibilityNote();
    renderNextStep();
  }

  function renderWelcomeEligibilityNote() {
    const note = $("#accountWelcomeEligibility");
    if (!note) return;
    const reason = accountState.welcomeEligibility?.reason || "";
    if (reason === "FULL_SIZE_PURCHASE_EXISTS") {
      note.textContent = "Welcome Credit 100 грн доступний лише до першої повнорозмірної покупки. Ваш ароматичний профіль і персональні рекомендації збережені.";
      note.hidden = false;
      return;
    }
    note.hidden = true;
    note.textContent = "";
  }

  function creditStatus(credit, promo) {
    if (credit.status === "used" || Number(promo?.usage_count || 0) > 0) return { label: "Використано", cls: "used" };
    if (new Date(credit.expires_at).getTime() < Date.now() || credit.status === "expired") return { label: "Термін завершено", cls: "expired" };
    return { label: "Активний", cls: "active" };
  }

  function renderCreditSection() {
    const host = $("#accountCredits");
    const section = $("#accountCreditSection");
    if (!host || !section) return;
    const discovery = (accountState.credits || []).map((credit) => ({ ...credit, credit_type: "discovery" }));
    const welcome = accountState.welcomeCredit ? [{ ...accountState.welcomeCredit, credit_type: "welcome" }] : [];
    const available = [...discovery, ...welcome].filter((credit) => {
      const promo = Array.isArray(credit.promo_codes) ? credit.promo_codes[0] : credit.promo_codes;
      return creditStatus(credit, promo).cls === "active";
    }).sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    if (!available.length) { section.hidden = true; host.innerHTML = ""; renderNextStep(); return; }
    section.hidden = false;
    host.innerHTML = available.map((credit) => {
      const promo = Array.isArray(credit.promo_codes) ? credit.promo_codes[0] : credit.promo_codes;
      const status = creditStatus(credit, promo);
      const expires = new Date(credit.expires_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
      const welcomeCredit = credit.credit_type === "welcome";
      const fullDiscovery = !welcomeCredit && Number(credit.amount || 0) >= 450;
      const label = welcomeCredit
        ? "WELCOME CREDIT · ПЕРША ПОКУПКА"
        : fullDiscovery
          ? "DISCOVERY CREDIT · ПОВНИЙ НАБІР"
          : "DISCOVERY CREDIT · НАБІР ІЗ 6";
      const title = welcomeCredit
        ? `${money(credit.amount)} на першу повнорозмірну покупку`
        : fullDiscovery
          ? `До ${money(credit.amount)} на повнорозмірні аромати`
          : `${money(credit.amount)} на один повнорозмірний аромат`;
      const copy = welcomeCredit
        ? `Код діє до ${esc(expires)}, лише на першу повнорозмірну покупку і не сумується з іншими кодами.`
        : fullDiscovery
          ? `250 грн застосуються до одного аромату або всі 450 грн — до замовлення від двох флаконів. Код діє до ${esc(expires)} і використовується один раз.`
          : `Код діє до ${esc(expires)}, прив’язаний до вашого email і застосовується один раз.`;
      return `<article class="account-credit account-credit--${status.cls}"><div><span class="account-credit__status">${status.label} · ${label}</span><strong>${title}</strong><p>${copy}</p><a class="account-credit__cta" href="catalog.html">${fullDiscovery ? "Обрати аромати з кредитом" : "Обрати аромат із кредитом"} →</a></div><div class="account-credit__code"><span>Персональний промокод</span><strong>${esc(promo?.code || "—")}</strong><button type="button" data-copy-credit="${esc(promo?.code || "")}">Скопіювати код</button></div></article>`;
    }).join("");
    host.querySelectorAll("[data-copy-credit]").forEach((button) => button.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(button.dataset.copyCredit); window.VAHome?.showToast("Персональний код скопійовано"); } catch (_) {}
    }));
    renderNextStep();
    if (location.hash === "#accountCreditSection") {
      requestAnimationFrame(() => requestAnimationFrame(() => section.scrollIntoView({ behavior: "smooth", block: "start" })));
    }
  }

  async function loadDiscoveryCredits() {
    let data, error;
    try {
      ({ data, error } = await withTimeout(sb.from("discovery_credits").select("id,amount,status,expires_at,used_at,promo_codes(code,usage_count,ends_at,active)").order("issued_at", { ascending: false }), "CREDIT_TIMEOUT"));
    } catch (_) { accountState.credits = []; renderCreditSection(); return; }
    accountState.credits = error ? [] : (data || []);
    renderCreditSection();
  }

  async function loadWelcomeCredit() {
    accountState.welcomeCredit = null;
    accountState.welcomeEligibility = null;
    try {
      await window.VAScentProfile?.sync?.();
      const data = await window.VAHomeSupabase?.issueWelcomeCredit?.();
      accountState.welcomeEligibility = {
        eligible: data?.eligible ?? null,
        reason: data?.reason || ""
      };
      if (data?.eligible && data.credit?.promo?.code) {
        accountState.welcomeCredit = {
          ...data.credit,
          credit_type: "welcome",
          promo_codes: data.credit.promo
        };
        if (data.created) window.VAHome?.showToast?.("Welcome Credit 100 грн активовано на 7 днів");
      }
    } catch (error) {
      accountState.welcomeEligibility = { eligible: null, reason: error?.message || "WELCOME_CREDIT_UNAVAILABLE" };
    }
    renderWelcomeEligibilityNote();
    renderCreditSection();
  }

  async function loadPrivatePreviewStatus() {
    const host = $("#accountPrivatePreview");
    if (!host) return;
    host.hidden = true;
    try {
      const { data } = await withTimeout(sb.from("private_releases").select("title,public_starts_at").eq("active", true).lte("preview_starts_at", new Date().toISOString()).gt("public_starts_at", new Date().toISOString()).order("public_starts_at", { ascending: true }).limit(1), "PREVIEW_TIMEOUT");
      accountState.privateRelease = data?.[0] || null;
      if (accountState.privateRelease) {
        host.classList.add("is-live");
        host.querySelector("h2").textContent = accountState.privateRelease.title;
        host.querySelector("p:last-child").textContent = "Реліз уже доступний у вашому персональному просторі до публічного старту.";
        host.querySelector("a").textContent = "Переглянути ранній доступ";
        host.hidden = false;
      }
    } catch (_) { accountState.privateRelease = null; }
  }

  async function loadAtmosphereHub() {
    loadSavedRoomRitual();
    await Promise.allSettled([loadScentProfileCard(), loadDiscoveryCredits(), loadWelcomeCredit(), loadPrivatePreviewStatus()]);
    renderNextStep();
  }

  function updateWishlistCount(count) {
    const badge = $("#accountWishlistCount");
    if (!badge) return;
    const safeCount = Math.max(0, Number(count) || 0);
    badge.textContent = String(safeCount);
    badge.setAttribute("aria-label", `${safeCount} обраних ароматів`);
    badge.closest("button")?.classList.toggle("has-items", safeCount > 0);
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
    updateWishlistCount(rows.length);
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
        window.VAHome?.showToast("Аромат видалено з обраного");
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
      try { await withTimeout(sb.auth.signOut({scope:"local"}), "LOGOUT_TIMEOUT"); } catch (_) {}
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
      activateAccountTab(button.dataset.accountTab);
    }));
    $("#accountNextStepCreditLink")?.addEventListener("click", (event) => {
      event.preventDefault();
      const section = $("#accountCreditSection");
      if (!section || section.hidden) return;
      history.replaceState(null, "", "#accountCreditSection");
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
