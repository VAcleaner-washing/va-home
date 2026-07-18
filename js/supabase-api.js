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
    return request(`reviews?select=id,product_slug,customer_name,rating,review_text,verified_purchase,photo_url,created_at&status=eq.approved${filter}&order=created_at.desc`, { method: "GET" });
  }

  function getRecentApprovedReviews(limit = 6) {
    const safeLimit = Math.max(1, Math.min(12, Number(limit) || 6));
    return request(`reviews?select=product_slug,customer_name,rating,review_text,verified_purchase,photo_url,created_at&status=eq.approved&order=created_at.desc&limit=${safeLimit}`);
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
        review_text: payload.review_text,
        photo_data: payload.photo_data || null,
        photo_type: payload.photo_type || null
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
    const requestId = `checkout-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let response;
    try {
      response = await fetch(`${cfg.url}/functions/v1/create-order`, {
        method: "POST",
        headers: {
          apikey: cfg.publishableKey,
          Authorization: `Bearer ${cfg.publishableKey}`,
          "Content-Type": "application/json",
          "X-Request-ID": requestId
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (cause) {
      const error = new Error(cause && cause.name === "AbortError" ? "CHECKOUT_TIMEOUT" : "NETWORK_ERROR");
      error.requestId = requestId;
      error.cause = cause;
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    const raw = await response.text().catch(() => "");
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!response.ok) {
      const fallbackCode = response.status === 401 || response.status === 403
        ? "CHECKOUT_AUTH_ERROR"
        : response.status === 404
          ? "CHECKOUT_FUNCTION_MISSING"
          : response.status >= 500
            ? "CHECKOUT_SERVICE_ERROR"
            : `CHECKOUT_HTTP_${response.status}`;
      const error = new Error(data.error || fallbackCode);
      error.status = response.status;
      error.requestId = data.request_id || response.headers.get("x-request-id") || requestId;
      error.details = raw.slice(0, 500);
      throw error;
    }
    return data;
  }

  async function novaPoshtaLookup(payload) {
    if (!configured()) throw new Error("Supabase is not configured");
    const response = await fetch(`${cfg.url}/functions/v1/nova-poshta-locations`, {
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
      const error = new Error(data.error || `Nova Poshta lookup failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return Array.isArray(data.items) ? data.items : [];
  }

  window.VAHomeSupabase = { configured, getApprovedReviews, getRecentApprovedReviews, getApprovedRatings, submitReview, getPublicOrderStatus, submitOrder, novaPoshtaLookup };
})();
