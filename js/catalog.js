/* ==========================================================================
   VA HOME — catalog.js
   Client-side filtering, sorting and pagination for catalog.html.
   No page reload, no server calls.
   ========================================================================== */

(function () {
  "use strict";

  const PAGE_SIZE = 12;

  const state = {
    character: "all", // all | fresh | woody | clean | fruity | spa | hotel | warm | evening | molecular
    collection: "all", // all | entry | signature | premium | noir
    room: "all",
    mood: "all",
    sort: "recommended", // recommended | price-asc | price-desc | new
    visibleCount: PAGE_SIZE
  };

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
      render();
    });
  }

  function initSelect(selector, stateKey) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.addEventListener("change", () => {
      state[stateKey] = el.value;
      state.visibleCount = PAGE_SIZE;
      render();
    });
  }

  function initSort() {
    const el = document.getElementById("catalogSort");
    if (!el) return;
    el.addEventListener("change", () => {
      state.sort = el.value;
      render();
    });
  }

  function initLoadMore() {
    const btn = document.getElementById("loadMoreBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      state.visibleCount += PAGE_SIZE;
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
    const character = params.get("character");
    const collection = params.get("collection");
    if (character) {
      state.character = character;
      setActiveChip("#characterChips", character);
    }
    if (collection) {
      state.collection = collection;
      setActiveChip("#collectionChips", collection);
    }
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
    render();
  });
})();
