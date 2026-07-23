/* ==========================================================================
   VA HOME — catalog.js
   Client-side filtering, sorting and pagination for catalog.html.
   No page reload, no server calls.
   ========================================================================== */

(function () {
  "use strict";

  const PAGE_SIZE = 12;
  const RETURN_STATE_KEY = "vahome:catalog-return-state";

  const ALLOWED = {
    character: new Set(["all", "fresh", "woody", "clean", "fruity", "spa", "hotel", "warm", "evening", "molecular"]),
    collection: new Set(["all", "entry", "signature", "premium", "noir"]),
    sort: new Set(["recommended", "price-asc", "price-desc", "new"])
  };

  const state = {
    character: "all", // all | fresh | woody | clean | fruity | spa | hotel | warm | evening | molecular
    collection: "all", // all | entry | signature | premium | noir
    room: "all",
    mood: "all",
    sort: "recommended", // recommended | price-asc | price-desc | new
    visibleCount: PAGE_SIZE
  };


  function readSafeParam(params, key, fallback, allowedSet) {
    const value = params.get(key);
    if (!value) return fallback;
    return !allowedSet || allowedSet.has(value) ? value : fallback;
  }

  function syncStateToUrl() {
    const url = new URL(window.location.href);
    const values = {
      character: state.character,
      collection: state.collection,
      room: state.room,
      mood: state.mood,
      sort: state.sort
    };

    Object.entries(values).forEach(([key, value]) => {
      if (!value || value === "all" || (key === "sort" && value === "recommended")) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });

    if (state.visibleCount > PAGE_SIZE) {
      url.searchParams.set("shown", String(state.visibleCount));
    } else {
      url.searchParams.delete("shown");
    }

    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function saveReturnPosition() {
    try {
      sessionStorage.setItem(
        RETURN_STATE_KEY,
        JSON.stringify({
          catalogUrl: window.location.href,
          scrollY: Math.max(0, Math.round(window.scrollY)),
          savedAt: Date.now()
        })
      );
    } catch (_) {
      // Storage can be unavailable in private/restricted browsing.
    }
  }

  function restoreReturnPosition() {
    try {
      const raw = sessionStorage.getItem(RETURN_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const sameCatalog = saved.catalogUrl === window.location.href;
      const stillFresh = Date.now() - Number(saved.savedAt || 0) < 30 * 60 * 1000;
      if (!sameCatalog || !stillFresh) return;

      sessionStorage.removeItem(RETURN_STATE_KEY);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.scrollTo(0, Number(saved.scrollY) || 0));
      });
    } catch (_) {
      // Ignore malformed or unavailable storage.
    }
  }

  function initProductReturnTracking() {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;
    grid.addEventListener("click", (event) => {
      const link = event.target.closest('a[href*="products/"]');
      if (link) saveReturnPosition();
    });
  }

  function matchesCharacter(product, value) {
    if (value === "all") return true;
    if (value === "evening") {
      return (product.mood || []).includes("warm-evening");
    }
    return (product.character || []).includes(value);
  }

  function matchesCollection(product, value) {
    return value === "all" || product.collection === value;
  }

  function matchesRoom(product, value) {
    return value === "all" || (product.room || []).includes(value);
  }

  function matchesMood(product, value) {
    return value === "all" || (product.mood || []).includes(value);
  }

  function getFiltered() {
    return PRODUCTS.filter(
      (p) =>
        matchesCharacter(p, state.character) &&
        matchesCollection(p, state.collection) &&
        matchesRoom(p, state.room) &&
        matchesMood(p, state.mood)
    );
  }

  function getSorted(list) {
    const copy = list.slice();
    switch (state.sort) {
      case "price-asc":
        return copy.sort((a, b) => (getProductPrice(a) || 0) - (getProductPrice(b) || 0));
      case "price-desc":
        return copy.sort((a, b) => (getProductPrice(b) || 0) - (getProductPrice(a) || 0));
      case "new":
        return copy.sort((a, b) => {
          const aNew = (a.badges || []).includes("new") ? 1 : 0;
          const bNew = (b.badges || []).includes("new") ? 1 : 0;
          return bNew - aNew;
        });
      case "recommended":
      default:
        return copy;
    }
  }

  function render() {
    const filtered = getSorted(getFiltered());
    const visible = filtered.slice(0, state.visibleCount);
    const grid = document.getElementById("catalogGrid");
    const empty = document.getElementById("catalogEmpty");
    const countEl = document.getElementById("catalogCount");
    const loadMoreWrap = document.getElementById("loadMoreWrap");

    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
    } else {
      if (empty) empty.hidden = true;
      grid.innerHTML = visible
        .map((p) => window.VAHomeProducts.renderProductCard(p, "", { context: "catalog" }))
        .join("");
    }

    if (countEl) {
      countEl.textContent = `${filtered.length} ${pluralizeAromas(filtered.length)}`;
    }

    if (loadMoreWrap) {
      loadMoreWrap.hidden = state.visibleCount >= filtered.length;
    }
    document.dispatchEvent(new CustomEvent("vahome:products-rendered"));
  }

  function pluralizeAromas(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return "ароматів";
    if (mod10 === 1) return "аромат";
    if (mod10 >= 2 && mod10 <= 4) return "аромати";
    return "ароматів";
  }

  function setActiveChip(groupSelector, value) {
    document.querySelectorAll(`${groupSelector} .filter-chip`).forEach((chip) => {
      chip.classList.toggle("is-active", chip.getAttribute("data-value") === value);
    });
  }

  function initChipGroup(groupSelector, stateKey) {
    const group = document.querySelector(groupSelector);
    if (!group) return;
    group.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      state[stateKey] = chip.getAttribute("data-value");
      state.visibleCount = PAGE_SIZE;
      setActiveChip(groupSelector, state[stateKey]);
      syncStateToUrl();
      render();
    });
  }

  function initSelect(selector, stateKey) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.addEventListener("change", () => {
      state[stateKey] = el.value;
      state.visibleCount = PAGE_SIZE;
      syncStateToUrl();
      render();
    });
  }

  function initSort() {
    const el = document.getElementById("catalogSort");
    if (!el) return;
    el.addEventListener("change", () => {
      state.sort = el.value;
      syncStateToUrl();
      render();
    });
  }

  function initLoadMore() {
    const btn = document.getElementById("loadMoreBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      state.visibleCount += PAGE_SIZE;
      syncStateToUrl();
      render();
    });
  }

  function initReset() {
    const btn = document.getElementById("catalogReset");
    const inlineBtn = document.getElementById("catalogResetInline");
    if (!btn) return;
    const doReset = () => {
      state.character = "all";
      state.collection = "all";
      state.room = "all";
      state.mood = "all";
      state.sort = "recommended";
      state.visibleCount = PAGE_SIZE;
      setActiveChip("#characterChips", "all");
      setActiveChip("#collectionChips", "all");
      const roomSelect = document.getElementById("roomSelect");
      const moodSelect = document.getElementById("moodSelect");
      const sortSelect = document.getElementById("catalogSort");
      if (roomSelect) roomSelect.value = "all";
      if (moodSelect) moodSelect.value = "all";
      if (sortSelect) sortSelect.value = "recommended";
      syncStateToUrl();
      render();
    };
    btn.addEventListener("click", doReset);
    if (inlineBtn) inlineBtn.addEventListener("click", doReset);
  }

  function initMobileFilterSheet() {
    const filters = document.getElementById("catalogFilters");
    const toggle = document.getElementById("filtersToggle");
    const closeBtn = document.getElementById("filtersClose");
    const scrim = document.getElementById("filtersScrim");
    const applyBtn = document.getElementById("filtersApply");
    if (!filters || !toggle) return;

    function getFocusable() {
      return Array.from(
        filters.querySelectorAll(
          'button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    function trapKeydown(e) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function open() {
      filters.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");
      filters.addEventListener("keydown", trapKeydown);
      const focusable = getFocusable();
      if (focusable.length) focusable[0].focus();
    }
    function close() {
      filters.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
      filters.removeEventListener("keydown", trapKeydown);
      toggle.focus();
    }
    toggle.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (scrim) scrim.addEventListener("click", close);
    if (applyBtn) applyBtn.addEventListener("click", close);
  }

  function initFromQueryString() {
    const params = new URLSearchParams(window.location.search);

    state.character = readSafeParam(params, "character", "all", ALLOWED.character);
    state.collection = readSafeParam(params, "collection", "all", ALLOWED.collection);
    state.room = readSafeParam(params, "room", "all");
    state.mood = readSafeParam(params, "mood", "all");
    state.sort = readSafeParam(params, "sort", "recommended", ALLOWED.sort);

    const shown = Number.parseInt(params.get("shown") || "", 10);
    state.visibleCount = Number.isFinite(shown) && shown >= PAGE_SIZE
      ? Math.ceil(shown / PAGE_SIZE) * PAGE_SIZE
      : PAGE_SIZE;

    setActiveChip("#characterChips", state.character);
    setActiveChip("#collectionChips", state.collection);

    const roomSelect = document.getElementById("roomSelect");
    const moodSelect = document.getElementById("moodSelect");
    const sortSelect = document.getElementById("catalogSort");

    if (roomSelect && Array.from(roomSelect.options).some((option) => option.value === state.room)) {
      roomSelect.value = state.room;
    } else {
      state.room = "all";
    }

    if (moodSelect && Array.from(moodSelect.options).some((option) => option.value === state.mood)) {
      moodSelect.value = state.mood;
    } else {
      state.mood = "all";
    }

    if (sortSelect) sortSelect.value = state.sort;
    syncStateToUrl();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof PRODUCTS === "undefined") return;
    initFromQueryString();
    initChipGroup("#characterChips", "character");
    initChipGroup("#collectionChips", "collection");
    initSelect("#roomSelect", "room");
    initSelect("#moodSelect", "mood");
    initSort();
    initLoadMore();
    initReset();
    initMobileFilterSheet();
    initProductReturnTracking();
    render();
    restoreReturnPosition();
  });
})();
