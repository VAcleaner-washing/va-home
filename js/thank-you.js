(function () {
  "use strict";
  function formatUAH(value) { return `${Number(value || 0).toLocaleString("uk-UA")}\u00A0грн`; }
  function getOrder() {
    try { return JSON.parse(sessionStorage.getItem("vahome_last_order") || "null"); }
    catch (_) { return null; }
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    const area = document.createElement("textarea");
    area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
    document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
    return Promise.resolve();
  }
  document.addEventListener("DOMContentLoaded", function () {
    const order = getOrder();
    if (!order) {
      document.getElementById("orderNumber").textContent = "Замовлення вже збережено";
      document.getElementById("orderItems").innerHTML = '<p class="text-muted">Деталі цього замовлення більше не зберігаються у браузері.</p>';
      document.getElementById("orderTotal").textContent = "—";
    } else {
      document.getElementById("orderNumber").textContent = order.orderNumber;
      document.getElementById("orderItems").innerHTML = order.items.map(function (item) {
        return `<div class="order-line"><span>${item.name} × ${item.quantity}</span><span>${formatUAH(item.line_total)}</span></div>`;
      }).join("");
      document.getElementById("orderTotal").textContent = formatUAH(order.total);
    }
    const isCod = Boolean(order && order.paymentMethod === "cash_on_delivery");
    document.getElementById("paymentPanel").hidden = isCod;
    document.getElementById("codPanel").hidden = !isCod;
    if (isCod) {
      document.getElementById("orderSuccessLead").textContent = "Ми отримали ваше замовлення з оплатою при отриманні. Збережіть його номер.";
      document.getElementById("paymentNote").textContent = "Замовлення буде відправлено Новою поштою протягом 1–2 робочих днів. Оплата — під час отримання.";
    }
    const cfg = window.SITE_CONFIG || {};
    const payment = cfg.payment || {};
    const number = order ? order.orderNumber : "номер замовлення";
    const purpose = `Оплата замовлення ${number}`;
    document.getElementById("paymentRecipient").textContent = payment.recipient || "ФОП Невідома Анна Сергіївна";
    document.getElementById("paymentIban").textContent = payment.iban || "";
    document.getElementById("paymentPurpose").textContent = purpose;
    document.getElementById("copyPaymentBtn").addEventListener("click", function () {
      const text = `Отримувач: ${payment.recipient}\nIBAN: ${payment.iban}\nПризначення платежу: ${purpose}`;
      copyText(text).then(function () { document.getElementById("copyStatus").textContent = "Реквізити скопійовано"; })
        .catch(function () { document.getElementById("copyStatus").textContent = "Не вдалося скопіювати"; });
    });
  });
})();
