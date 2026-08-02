(() => {
  "use strict";

  const statusLabels = {
    new: "Нове",
    awaiting_payment: "Очікує оплату",
    paid: "Оплачено",
    shipped: "Відправлено",
    completed: "Доставлено",
    cancelled: "Скасовано"
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

  const progressSteps = ["new", "paid", "shipped", "completed"];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[character]));
  }

  function formatMoney(value) {
    const amount = Number(value || 0).toLocaleString("uk-UA", {
      maximumFractionDigits: 2
    });
    return `${amount} грн`;
  }

  function getStatusIndex(status) {
    if (status === "awaiting_payment") return 0;
    return Math.max(0, progressSteps.indexOf(status));
  }

  function renderProgress(order, activeIndex) {
    return progressSteps.map((status, index) => {
      const isDone = index <= activeIndex && order.status !== "cancelled";
      return `<div class="track-step ${isDone ? "is-done" : ""}">${statusLabels[status]}</div>`;
    }).join("");
  }

  function renderItems(items) {
    return items.map((item) => {
      const selections = Array.isArray(item.selections) && item.selections.length
        ? `<small>Обрано: ${item.selections.map(escapeHtml).join(" · ")}</small>`
        : "";

      return `
        <div class="track-line">
          <span>${escapeHtml(item.name)} × ${escapeHtml(item.quantity)}${selections}</span>
          <strong>${formatMoney(item.line_total)}</strong>
        </div>
      `;
    }).join("");
  }

  function renderPayment(order) {
    if (!order.payment_method && !order.payment_status) return "";

    const method = paymentMethodLabels[order.payment_method] || "спосіб уточнюється";
    const status = paymentStatusLabels[order.payment_status] || "статус уточнюється";

    return `
      <div class="track-ttn">
        <small>Оплата</small>
        <p><strong>${escapeHtml(method)} · ${escapeHtml(status)}</strong></p>
      </div>
    `;
  }

  function renderTracking(order) {
    if (!order.tracking_number) return "";

    return `
      <div class="track-ttn">
        <small>ТТН Нової пошти</small>
        <p><strong>${escapeHtml(order.tracking_number)}</strong></p>
      </div>
    `;
  }

  function renderOrder(order) {
    const result = document.getElementById("orderTrackResult");
    const items = Array.isArray(order.items) ? order.items : [];
    const activeIndex = getStatusIndex(order.status);

    result.innerHTML = `
      <div class="track-head">
        <div>
          <p class="eyebrow">Номер замовлення</p>
          <h2>${escapeHtml(order.client_order_id)}</h2>
        </div>
        <span class="status-pill status-${escapeHtml(order.status)}">
          ${escapeHtml(statusLabels[order.status] || order.status)}
        </span>
      </div>
      <div class="track-timeline">${renderProgress(order, activeIndex)}</div>
      ${order.status === "cancelled"
        ? '<p class="order-track__message">Замовлення скасовано. Для уточнення зверніться до VA HOME.</p>'
        : ""}
      <div class="track-order-lines">${renderItems(items)}</div>
      <div class="track-total">
        <span>Сума</span>
        <span>${formatMoney(order.total_amount)}</span>
      </div>
      ${renderPayment(order)}
      ${renderTracking(order)}
    `;

    result.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("orderTrackForm");
    const message = document.getElementById("orderTrackMessage");
    const result = document.getElementById("orderTrackResult");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.textContent = "Перевіряємо…";
      result.hidden = true;

      const orderNumber = form.elements.orderNumber.value.trim().toUpperCase();
      const phoneLast4 = form.elements.phoneLast4.value.replace(/\D/g, "");

      if (phoneLast4.length !== 4) {
        message.textContent = "Введіть останні 4 цифри телефону.";
        return;
      }

      try {
        const rows = await window.VAHomeSupabase.getPublicOrderStatus(orderNumber, phoneLast4);
        if (!rows || !rows.length) {
          message.textContent = "Замовлення не знайдено. Перевірте номер і цифри телефону.";
          return;
        }

        message.textContent = "";
        renderOrder(rows[0]);
      } catch (error) {
        message.textContent = error && error.status === 429
          ? "Забагато спроб. Зачекайте 15 хвилин і повторіть."
          : "Не вдалося перевірити статус. Спробуйте трохи пізніше.";
      }
    });
  });
})();
