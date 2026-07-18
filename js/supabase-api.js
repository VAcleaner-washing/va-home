/* VA HOME — minimal Supabase Data API client (browser-safe publishable key + RLS). */
(function () {
  "use strict";
  const cfg = window.SITE_CONFIG && window.SITE_CONFIG.supabase;

  function configured() {
    return Boolean(cfg && cfg.url && cfg.publishableKey);
  }

  async function request(path, options) {
    if (!configured()) throw new Error("Supabase is not configured");
    const response = await fetch(`${cfg.url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: cfg.publishableKey,
        Authorization: `Bearer ${cfg.publishableKey}`,
        "Content-Type": "application/json",
        ...(options && options.headers ? options.headers : {})
      }
    });
    if (!response.ok) {
      let details = "";
      try { details = await response.text(); } catch (_) {}
      const error = new Error(`Supabase request failed (${response.status})`);
      error.status = response.status;
      error.details = details;
      throw error;
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function getApprovedReviews(productSlug) {
    const filter = productSlug ? `&product_slug=eq.${encodeURIComponent(productSlug)}` : "";
    return request(`reviews?select=id,product_slug,customer_name,rating,review_text,verified_purchase,created_at&status=eq.approved${filter}&order=created_at.desc`, { method: "GET" });
  }

  function getApprovedRatings() {
    return request("reviews?select=product_slug,rating&status=eq.approved", { method: "GET" });
  }

  function storedAccessToken() {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) || "";
        if (!/^sb-.*-auth-token$/.test(key)) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        const token = parsed && (parsed.access_token || parsed.currentSession?.access_token);
        if (token) return token;
      }
    } catch (_) {}
    return null;
  }

  async function submitReview(payload) {
    if (!configured()) throw new Error("Supabase is not configured");
    const response = await fetch(`${cfg.url}/functions/v1/submit-review`, {
      method: "POST",
      headers: {
        apikey: cfg.publishableKey,
        Authorization: `Bearer ${storedAccessToken() || cfg.publishableKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        product_slug: payload.product_slug,
        customer_name: payload.customer_name,
        rating: payload.rating,
        review_text: payload.review_text
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Review submission failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }


  function getPublicOrderStatus(orderNumber, phoneLast4) {
    return request("rpc/get_public_order_status", {
      method: "POST",
      body: JSON.stringify({ p_order_number: orderNumber, p_phone_last4: phoneLast4 })
    });
  }

  async function submitOrder(payload) {
    if (!configured()) throw new Error("Supabase is not configured");
    const response = await fetch(`${cfg.url}/functions/v1/create-order`, {
      method: "POST",
      headers: {
        apikey: cfg.publishableKey,
        Authorization: `Bearer ${cfg.publishableKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Order creation failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  window.VAHomeSupabase = { configured, getApprovedReviews, getApprovedRatings, submitReview, getPublicOrderStatus, submitOrder };
})();
