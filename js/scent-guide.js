/* ==========================================================================
   VA HOME — scent-guide.js
   A short quiz that scores real PRODUCTS by tag overlap with the
   person's answers. No product data is invented — recommendations are
   always drawn from existing `character` / `mood` / `room` / `collection`
   fields in products-data.js.
   ========================================================================== */

(function () {
  "use strict";

  const TOTAL_STEPS = 5;

  const CHARACTER_LABELS = {
    clean: "Чисті", fresh: "Свіжі", fruity: "Фруктові", warm: "Теплі",
    spa: "Спа", hotel: "Готельні", woody: "Деревні", molecular: "Молекулярні"
  };
  const MOOD_LABELS = {
    calm: "спокій", "warm-evening": "теплий вечір",
    hotel: "готельну атмосферу", "warm-sweet": "мʼяку фруктовість"
  };
  const ROOM_LABELS = {
    "living-room": "вітальні", bedroom: "спальні", bathroom: "ванній",
    hallway: "передпокої", office: "кабінеті"
  };

  // ---- Scoring weights contributed by each answer ----
  const ANSWER_WEIGHTS = {
    atmosphere: {
      calm: { character: { clean: 2 }, mood: { calm: 2 } },
      hotel: { character: { hotel: 2 }, mood: { hotel: 2 } },
      "warm-evening": { character: { warm: 2 }, mood: { "warm-evening": 2 } },
      fresh: { character: { fresh: 2 } },
      woody: { character: { woody: 2 } },
      "warm-sweet": { character: { fruity: 2 }, mood: { "warm-sweet": 2 } }
    },
    room: {
      "living-room": { room: { "living-room": 2 } },
      bedroom: { room: { bedroom: 2 } },
      bathroom: { room: { bathroom: 2 } },
      hallway: { room: { hallway: 2 } },
      office: { room: { office: 2 } },
      kitchen: { room: {} } // no products tagged "kitchen" yet — contributes no bonus
    },
    composition: {
      fresh: { character: { fresh: 3 } },
      woody: { character: { woody: 3 } },
      "warm-sweet": { character: { warm: 2, fruity: 1 } },
      clean: { character: { clean: 3 } }
    },
    intensity: {
      light: { character: { clean: 1, molecular: 1 } },
      moderate: {},
      rich: { character: { woody: 1, molecular: 1 } }
    },
    space: {
      entry: { collection: { entry: 3 } },
      signature: { collection: { signature: 3 } },
      premium: { collection: { premium: 3 } },
      noir: { collection: { noir: 3 } }
    }
  };

  const state = {
    step: 1,
    answers: {}
  };

  function mergeWeights(target, source) {
    Object.keys(source || {}).forEach((dim) => {
      target[dim] = target[dim] || {};
      Object.keys(source[dim]).forEach((key) => {
        target[dim][key] = (target[dim][key] || 0) + source[dim][key];
      });
    });
  }

  function computeWeights() {
    const totals = {};
    Object.keys(state.answers).forEach((question) => {
      const value = state.answers[question];
      const weightSet = ANSWER_WEIGHTS[question] && ANSWER_WEIGHTS[question][value];
      if (weightSet) mergeWeights(totals, weightSet);
    });
    return totals;
  }

  function scoreProduct(product, weights) {
    let score = 0;
    const matched = { character: [], mood: [] };

    (product.character || []).forEach((c) => {
      if (weights.character && weights.character[c]) {
        score += weights.character[c];
        matched.character.push(c);
      }
    });
    (product.mood || []).forEach((m) => {
      if (weights.mood && weights.mood[m]) {
        score += weights.mood[m];
        matched.mood.push(m);
      }
    });
    (product.room || []).forEach((r) => {
      if (weights.room && weights.room[r]) {
        score += weights.room[r];
      }
    });
    if (weights.collection && weights.collection[product.collection]) {
      score += weights.collection[product.collection];
    }
    return { score, matched };
  }

  function buildReason(product, matched) {
    const parts = [];
    if (matched.character.length) {
      parts.push(
        matched.character.map((c) => CHARACTER_LABELS[c] || c).join(", ").toLowerCase()
      );
    }
    if (matched.mood.length) {
      parts.push(`підходить під ${matched.mood.map((m) => MOOD_LABELS[m] || m).join(" і ")}`);
    }
    if (!parts.length) {
      return "Добре доповнює вашу композицію за колекцією.";
    }
    return `Характер: ${parts.join(" · ")}.`;
  }

  function getRecommendations() {
    const weights = computeWeights();
    const scored = PRODUCTS.map((p, index) => {
      const { score, matched } = scoreProduct(p, weights);
      return { product: p, score, matched, index };
    });
    scored.sort((a, b) => b.score - a.score || a.index - b.index);
    return scored.slice(0, 3);
  }

  // ---- UI wiring ----
  function updateProgress() {
    const label = document.getElementById("guideStepLabel");
    const fill = document.getElementById("guideProgressFill");
    if (label) label.textContent = `Крок ${state.step} з ${TOTAL_STEPS}`;
    if (fill) fill.style.width = `${(state.step / TOTAL_STEPS) * 100}%`;
  }

  function showStep(n) {
    document.querySelectorAll(".guide-step").forEach((el) => {
      el.classList.toggle("is-active", Number(el.getAttribute("data-step")) === n);
    });
    const backBtn = document.getElementById("guideBack");
    if (backBtn) backBtn.disabled = n <= 1;
    updateProgress();
  }

  function showResults() {
    const form = document.getElementById("scentGuideForm");
    const results = document.getElementById("guideResults");
    const grid = document.getElementById("guideResultsGrid");
    if (form) form.hidden = true;
    if (results) results.classList.add("is-active");

    const recs = getRecommendations();
    window.VAAnalytics?.event?.("select_content", { content_type: "scent_guide_completed", items: recs.map(r => ({ item_id: r.product.id })) });
    if (grid) {
      grid.innerHTML = recs
        .map(({ product, matched }) => {
          const card = window.VAHomeProducts.renderProductCard(product, "", { context: "guide" });
          const reason = `<p class="guide-result-reason">${buildReason(product, matched)}</p>`;
          // Insert the reason inside the card body (right before the price/meta row)
          // instead of as a trailing sibling, so cards of different heights still
          // align consistently — the card's own bottom-pinned price/button row
          // keeps working the same way it does on the catalog page.
          return card.replace('<div class="product-card__meta">', reason + '<div class="product-card__meta">');
        })
        .join("");
    }
  }

  function selectOption(question, value, stepEl) {
    if (Object.keys(state.answers).length === 0) {
      window.VAAnalytics?.event?.("select_content", { content_type: "scent_guide_started" });
    }
    state.answers[question] = value;
    stepEl.querySelectorAll(".guide-option").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.getAttribute("data-value") === value);
    });

    if (state.step < TOTAL_STEPS) {
      setTimeout(() => {
        state.step += 1;
        showStep(state.step);
      }, 180);
    } else {
      setTimeout(showResults, 180);
    }
  }

  function initOptionClicks() {
    document.querySelectorAll(".guide-step").forEach((stepEl) => {
      const question = stepEl.getAttribute("data-question");
      stepEl.querySelectorAll(".guide-option").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectOption(question, btn.getAttribute("data-value"), stepEl);
        });
      });
    });
  }

  function initNav() {
    const backBtn = document.getElementById("guideBack");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (state.step > 1) {
          state.step -= 1;
          showStep(state.step);
        }
      });
    }

    function restart() {
      state.step = 1;
      state.answers = {};
      document.querySelectorAll(".guide-option").forEach((btn) => btn.classList.remove("is-selected"));
      const form = document.getElementById("scentGuideForm");
      const results = document.getElementById("guideResults");
      if (form) form.hidden = false;
      if (results) results.classList.remove("is-active");
      showStep(1);
    }

    const restartBtn = document.getElementById("guideRestart");
    const restartBtn2 = document.getElementById("guideRestart2");
    if (restartBtn) restartBtn.addEventListener("click", restart);
    if (restartBtn2) restartBtn2.addEventListener("click", restart);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof PRODUCTS === "undefined") return;
    initOptionClicks();
    initNav();
    showStep(1);
  });
})();
