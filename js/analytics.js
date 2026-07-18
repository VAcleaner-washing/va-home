/* VA HOME — privacy-conscious GA4 ecommerce events. No PII is transmitted. */
(function () {
  "use strict";

  const measurementId = window.SITE_CONFIG?.analytics?.ga4MeasurementId || "";
  const configured = /^G-[A-Z0-9]+$/i.test(measurementId);
  const consentKey = "vahome_analytics_consent";
  function storedConsent() { try { return localStorage.getItem(consentKey); } catch (_) { return null; } }
  function saveConsent(value) { try { localStorage.setItem(consentKey, value); return true; } catch (_) { return false; } }
  const consent = storedConsent();
  const enabled = configured && consent === "granted";

  function productInfo(id, quantity = 1) {
    const product = typeof getProduct === "function" ? getProduct(id) : null;
    if (product) {
      const price = typeof getProductPrice === "function" ? Number(getProductPrice(product)) : 0;
      const collection = typeof getCollection === "function" ? getCollection(product.collection) : null;
      return {
        item_id: product.id,
        item_name: product.name,
        item_brand: "VA HOME",
        item_category: collection?.name || product.collection || "Аромадифузори",
        price,
        quantity
      };
    }
    const special = {
      "discovery-6": ["Discovery Set — 6 ароматів", 150],
      "discovery-17": ["Discovery Set — 18 ароматів", 450]
    }[id];
    return special ? { item_id: id, item_name: special[0], item_brand: "VA HOME", item_category: "Discovery Set", price: special[1], quantity } : null;
  }

  function event(name, params) {
    if (!enabled || typeof window.gtag !== "function") return;
    window.gtag("event", name, params || {});
  }

  function cartItems() {
    return window.Cart?.getItems?.().map(item => productInfo(item.id, item.quantity)).filter(Boolean) || [];
  }

  function cartValue(items) {
    return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  }

  if (enabled) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { anonymize_ip: true, send_page_view: true });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  window.VAAnalytics = {
    enabled,
    event,
    addToCart(id, quantity) {
      const item = productInfo(id, quantity);
      if (item) event("add_to_cart", { currency: "UAH", value: item.price * item.quantity, items: [item] });
    },
    removeFromCart(id, quantity) {
      const item = productInfo(id, quantity);
      if (item) event("remove_from_cart", { currency: "UAH", value: item.price * item.quantity, items: [item] });
    }
  };

  function initPageTracking() {
    if (configured && consent === null) {
      const banner = document.createElement("aside");
      banner.className = "analytics-consent";
      banner.setAttribute("aria-label", "Налаштування аналітики");
      banner.innerHTML = `<div><strong>Аналітика сайту</strong><p>Допоможіть нам зрозуміти, як покращити магазин. Ми не передаємо Google ім’я, телефон, email або адресу доставки. <a href="${window.VA_HOME_ROOT || ""}privacy.html">Докладніше</a></p></div><div><button type="button" class="btn btn-secondary" data-analytics-consent="denied">Лише необхідні</button><button type="button" class="btn btn-primary" data-analytics-consent="granted">Дозволити аналітику</button></div>`;
      banner.addEventListener("click", (click) => {
        const button = click.target.closest("[data-analytics-consent]");
        if (!button) return;
        saveConsent(button.dataset.analyticsConsent);
        if (button.dataset.analyticsConsent === "granted") location.reload();
        else banner.remove();
      });
      document.body.appendChild(banner);
    }
    if (typeof PRODUCT_ID !== "undefined") {
      const item = productInfo(PRODUCT_ID, 1);
      if (item) event("view_item", { currency: "UAH", value: item.price, items: [item] });
    }

    if (document.getElementById("cartItemsList")) {
      const items = cartItems();
      if (items.length) event("view_cart", { currency: "UAH", value: cartValue(items), items });
    }

    document.getElementById("checkoutForm")?.addEventListener("focusin", () => {
      const items = cartItems();
      if (items.length) event("begin_checkout", { currency: "UAH", value: cartValue(items), items });
    }, { once: true });

    document.getElementById("confirmDiscoverySelection")?.addEventListener("click", () => {
      event("discovery_set_complete", { set_size: 6 });
    });

    if (document.body.classList.contains("thank-you-page") || /thank-you\.html$/.test(location.pathname)) {
      try {
        const order = JSON.parse(sessionStorage.getItem("vahome_last_order") || "null");
        if (order?.orderNumber && !sessionStorage.getItem(`vahome_purchase_tracked_${order.orderNumber}`)) {
          const items = (order.items || []).map(item => productInfo(item.id, item.quantity)).filter(Boolean);
          event("purchase", { transaction_id: order.orderNumber, currency: "UAH", value: Number(order.total || 0), items });
          sessionStorage.setItem(`vahome_purchase_tracked_${order.orderNumber}`, "1");
        }
      } catch (_) {}
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPageTracking, { once: true });
  else initPageTracking();
})();
