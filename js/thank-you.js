(function () {
  "use strict";

  const STORAGE_KEY = "vahome_last_order";

  function formatUAH(value) {
    return `${Number(value || 0).toLocaleString("uk-UA")}\u00A0грн`;
  }

  function getOrder() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    return Promise.resolve();
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function renderEmptyState() {
    setText("orderNumber", "Замовлення збережено");
    document.getElementById("orderItems").innerHTML = '<p class="ty-empty">Деталі замовлення більше не зберігаються у цьому браузері. Актуальну інформацію можна знайти в листі-підтвердженні або кабінеті.</p>';
    setText("orderTotal", "—");
    document.getElementById("paymentPanel").hidden = true;
    document.getElementById("codPanel").hidden = true;
    document.querySelector(".ty-primary-grid").classList.add("is-single");
    setText("orderSuccessLead", "Замовлення вже передано магазину. Перевірте лист-підтвердження або відкрийте особистий кабінет.");
  }

  function renderOrder(order) {
    setText("orderNumber", order.orderNumber || order.client_order_id || "—");
    const items = Array.isArray(order.items) ? order.items : [];
    document.getElementById("orderItems").innerHTML = items.length
      ? items.map(function (item) {
          const selections = Array.isArray(item.selections) && item.selections.length
            ? `<small>Обрано: ${item.selections.join(" · ")}</small>`
            : "";
          return `<div class="ty-order-line"><span>${item.name || "Товар"} × ${item.quantity || 1}${selections}</span><span>${formatUAH(item.line_total)}</span></div>`;
        }).join("")
      : '<p class="ty-empty">Склад замовлення буде доступний у листі-підтвердженні.</p>';
    setText("orderTotal", formatUAH(order.total));

    if (order.emailStatus === "failed") {
      setText("orderSuccessLead", "Замовлення успішно збережено. Лист може надійти із затримкою — збережіть номер замовлення.");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const order = getOrder();
    const grid = document.querySelector(".ty-primary-grid");
    const paymentPanel = document.getElementById("paymentPanel");
    const codPanel = document.getElementById("codPanel");
    const cfg = window.SITE_CONFIG || {};
    const payment = cfg.payment || {};

    if (order) renderOrder(order);
    else renderEmptyState();

    const copyOrderButton = document.getElementById("copyOrderNumberBtn");
    if (copyOrderButton) {
      copyOrderButton.addEventListener("click", function () {
        const value = document.getElementById("orderNumber").textContent.trim();
        copyText(value)
          .then(function () { setText("copyOrderStatus", "Номер скопійовано"); })
          .catch(function () { setText("copyOrderStatus", "Не вдалося скопіювати"); });
      });
    }

    const isCod = Boolean(order && order.paymentMethod === "cash_on_delivery");
    if (order) {
      paymentPanel.hidden = isCod;
      codPanel.hidden = !isCod;
    }

    if (isCod) {
      setText("orderSuccessLead", "Ми отримали замовлення з оплатою при отриманні. Збережіть його номер.");
      setText("paymentNote", "Відправимо замовлення Новою поштою протягом 1–2 робочих днів. Оплата — під час отримання.");
    }

    if (order && !isCod) {
      const number = order.orderNumber || order.client_order_id || "номер замовлення";
      const purpose = `Оплата замовлення ${number}`;
      const recipient = payment.recipient || "ФОП Невідома Анна Сергіївна";
      const iban = payment.iban || "";
      setText("paymentRecipient", recipient);
      setText("paymentIban", iban);
      setText("paymentPurpose", purpose);

      const copyPaymentButton = document.getElementById("copyPaymentBtn");
      if (copyPaymentButton) {
        copyPaymentButton.addEventListener("click", function () {
          const text = `Отримувач: ${recipient}\nIBAN: ${iban}\nПризначення платежу: ${purpose}`;
          copyText(text)
            .then(function () { setText("copyStatus", "Реквізити скопійовано"); })
            .catch(function () { setText("copyStatus", "Не вдалося скопіювати"); });
        });
      }
    }

    if (!order && grid) grid.classList.add("is-single");
  });
})();
