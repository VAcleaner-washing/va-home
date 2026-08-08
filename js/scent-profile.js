/* VA HOME v16.3.8 — persistent Personal Scent Profile */
(function () {
  "use strict";

  const STORAGE_KEY = "va_home_scent_profile_v14";
  let cached = null;
  let syncPromise = null;

  function readLocal() {
    if (cached) return cached;
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && parsed.match_scores && parsed.profile_title) cached = parsed;
    } catch (_) {}
    return cached;
  }

  function writeLocal(profile) {
    cached = profile || null;
    try {
      if (profile) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    document.dispatchEvent(new CustomEvent("vahome:scent-profile", { detail: { profile: cached } }));
    apply(cached);
    return cached;
  }

  function accessToken() {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) || "";
        if (!/^sb-.*-auth-token$/.test(key)) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        return parsed?.currentSession?.access_token || parsed?.access_token || null;
      }
    } catch (_) {}
    return null;
  }

  function currentUser() {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) || "";
        if (!/^sb-.*-auth-token$/.test(key)) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        return parsed?.currentSession?.user || parsed?.user || null;
      }
    } catch (_) {}
    return null;
  }

  async function rest(path, options = {}) {
    const cfg = window.SITE_CONFIG?.supabase;
    const token = accessToken();
    if (!cfg?.url || !cfg?.publishableKey || !token) throw new Error("AUTH_REQUIRED");
    const response = await fetch(`${cfg.url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: cfg.publishableKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(raw || `PROFILE_HTTP_${response.status}`);
    return raw ? JSON.parse(raw) : null;
  }

  async function save(profile) {
    const normalized = {
      ...profile,
      saved_at: new Date().toISOString()
    };
    writeLocal(normalized);
    const user = currentUser();
    if (!user?.id) return { local: true, cloud: false };
    try {
      await rest("user_scent_profiles?on_conflict=user_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          user_id: user.id,
          answers: normalized.answers || {},
          profile_title: normalized.profile_title || "Ваш ароматичний профіль",
          profile_text: normalized.profile_text || null,
          profile_tags: normalized.profile_tags || [],
          recommendation_ids: normalized.recommendation_ids || [],
          match_scores: normalized.match_scores || {},
          updated_at: new Date().toISOString()
        })
      });
      return { local: true, cloud: true };
    } catch (_) {
      return { local: true, cloud: false };
    }
  }

  async function sync() {
    if (syncPromise) return syncPromise;
    syncPromise = (async () => {
      const user = currentUser();
      if (!user?.id) return readLocal();
      try {
        const rows = await rest(`user_scent_profiles?select=answers,profile_title,profile_text,profile_tags,recommendation_ids,match_scores,updated_at&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) {
          const localOnly = readLocal();
          if (localOnly) {
            await save(localOnly);
            return readLocal();
          }
          return null;
        }
        // For an authenticated account, Supabase is the single source of truth.
        // This keeps percentages identical in the account, catalogue and product pages.
        return writeLocal({ ...row, saved_at: row.updated_at });
      } catch (_) {
        return readLocal();
      }
    })().finally(() => { syncPromise = null; });
    return syncPromise;
  }

  function badge(percent) {
    const node = document.createElement("span");
    node.className = "scent-match-badge";
    node.textContent = `${percent}% вашого профілю`;
    return node;
  }

  function apply(profile = readLocal()) {
    if (!profile?.match_scores) return;
    document.querySelectorAll(".product-card[data-product-id]").forEach((card) => {
      const existing = card.querySelector(".scent-match-badge");
      // The consultation result already renders its own match percentage.
      // Do not inject the global profile badge there, otherwise mobile cards
      // show two nearly identical percentage labels.
      if (card.closest("#guideResultsGrid")) {
        existing?.remove();
        return;
      }
      const id = card.dataset.productId;
      const percent = Number(profile.match_scores[id]);
      if (!Number.isFinite(percent) || percent < 1) {
        existing?.remove();
        return;
      }
      const label = `${percent}% вашого профілю`;
      if (existing) {
        if (existing.textContent !== label) existing.textContent = label;
        return;
      }
      const body = card.querySelector(".product-card__body");
      if (body) body.prepend(badge(percent));
    });
    const currentId = typeof PRODUCT_ID !== "undefined" ? PRODUCT_ID : (typeof window.PRODUCT_ID === "string" ? window.PRODUCT_ID : "");
    if (currentId) {
      const percent = Number(profile.match_scores[currentId]);
      let host = document.getElementById("productProfileMatch");
      if (!host) {
        const suit = document.querySelector(".product-hero__suit-for");
        if (suit) {
          host = document.createElement("div");
          host.id = "productProfileMatch";
          host.className = "product-profile-match";
          suit.insertAdjacentElement("afterend", host);
        }
      }
      if (host && Number.isFinite(percent)) {
        host.innerHTML = `<span>Збіг із вашим профілем</span><strong>${percent}%</strong><a href="../scent-guide.html">Оновити профіль</a>`;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    apply(readLocal());
    const synced = await sync();
    apply(synced);
    const observer = new MutationObserver(() => apply(readLocal()));
    [document.getElementById("catalogGrid"), document.getElementById("guideResultsGrid"), document.getElementById("similarGrid")].filter(Boolean)
      .forEach((node) => observer.observe(node, { childList: true, subtree: true }));
  });

  window.VAScentProfile = { read: readLocal, save, sync, apply, clear: () => writeLocal(null), storageKey: STORAGE_KEY };
})();
