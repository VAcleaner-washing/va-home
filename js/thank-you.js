(function () {
  "use strict";

  const STORAGE_KEY = "vahome_last_order";
  const DEFAULT_PAYMENT_RECIPIENT = "\u0424\u041E\u041F \u041D\u0435\u0432\u0456\u0434\u043E\u043C\u0430 \u0410\u043D\u043D\u0430 \u0421\u0435\u0440\u0433\u0456\u0457\u0432\u043D\u0430";

  function formatUAH(value) {
    return `${Number(value || 0).toLocaleString("uk-UA")}\u00A0грн`;
  }

  function getOrder() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
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

  function normalizePaymentRecipient(value) {
    const recipient = String(value || "").trim().normalize("NFC");
    return recipient && !recipient.includes("\uFFFD")
      ? recipient
      : DEFAULT_PAYMENT_RECIPIENT;
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
    const discountLine = Number(order.discount || 0) > 0
      ? `<div class="ty-order-line ty-order-line--discount"><span>Промокод ${String(order.promoCode || "").toUpperCase()}</span><span>−${formatUAH(order.discount)}</span></div>`
      : "";
    document.getElementById("orderItems").innerHTML = items.length
      ? items.map(function (item) {
          const selections = Array.isArray(item.selections) && item.selections.length
            ? `<small>Обрано: ${item.selections.join(" · ")}</small>`
            : "";
          return `<div class="ty-order-line"><span>${item.name || "Товар"} × ${item.quantity || 1}${selections}</span><span>${formatUAH(item.line_total)}</span></div>`;
        }).join("") + discountLine
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
    const payment = order && (order.paymentDetails || order.payment_details);

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
      const recipient = normalizePaymentRecipient(payment && payment.recipient);
      const iban = payment && payment.iban;
      const details = document.getElementById("paymentDetails");
      if (!recipient || !iban) {
        if (details) details.hidden = true;
        return;
      }
      setText("paymentTitle", "Реквізити");
      setText("paymentIntro", "Скопіюйте дані одним натисканням. Призначення платежу вже сформовано.");
      if (details) details.hidden = false;
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
