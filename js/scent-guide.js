/* VA HOME v6.6 — Personal Scent Experience */
(function () {
  "use strict";

  const TOTAL_STEPS = 5;
  const STORAGE_KEY = "vaHomeScentProfileV66";

  const CHARACTER_LABELS = {
    clean: "чистий", fresh: "свіжий", fruity: "фруктовий", warm: "теплий",
    spa: "spa", hotel: "готельний", woody: "деревний", molecular: "молекулярний"
  };
  const ROOM_LABELS = {
    "living-room": "вітальня", bedroom: "спальня", bathroom: "ванна",
    hallway: "передпокій", office: "кабінет", kitchen: "кухня"
  };
  const INTENSITY_LABELS = {
    light: "легка присутність", moderate: "збалансована присутність", rich: "виразна присутність"
  };
  const SPACE_LABELS = {
    entry: "світлий мінімалізм", signature: "теплий затишок",
    premium: "архітектурний простір", noir: "темний модернізм"
  };

  const PROFILE_COPY = {
    calm: {
      title: "Тиха чистота",
      text: "Вам близькі композиції, які не заповнюють кімнату шумом, а роблять її світлішою, спокійнішою та зібранішою.",
      tags: ["чистота", "повітря", "мʼякий ритм"]
    },
    hotel: {
      title: "Стриманий комфорт",
      text: "Ви шукаєте відчуття доглянутого простору: чисті лінії, впевнена дифузія та атмосфера хорошого boutique hotel.",
      tags: ["hotel mood", "доглянутість", "елегантність"]
    },
    "warm-evening": {
      title: "Вечірній ритуал",
      text: "Ваш аромат має зігрівати простір, сповільнювати його та створювати відчуття приватного вечора вдома.",
      tags: ["тепло", "дерево", "ритуал"]
    },
    fresh: {
      title: "Прохолодне повітря",
      text: "Вам потрібна композиція, що освіжає без різкості: повітря, вода, мінеральність і відчуття відкритого простору.",
      tags: ["свіжість", "мінерали", "легкість"]
    },
    woody: {
      title: "Архітектура тиші",
      text: "Ви тяжієте до сухих, фактурних ароматів із деревом, каменем і тінню — стриманих, але характерних.",
      tags: ["дерево", "камінь", "характер"]
    },
    "warm-sweet": {
      title: "Мʼякий затишок",
      text: "Вам близькі теплі композиції з фруктовими, кремовими або пряними відтінками, які роблять дім гостиннішим.",
      tags: ["затишок", "мʼяка солодкість", "тепло"]
    }
  };

  const ANSWER_WEIGHTS = {
    atmosphere: {
      calm: { character: { clean: 3, fresh: 1 }, mood: { calm: 3 } },
      hotel: { character: { hotel: 3, clean: 1 }, mood: { hotel: 3 } },
      "warm-evening": { character: { warm: 3, woody: 1 }, mood: { "warm-evening": 3 } },
      fresh: { character: { fresh: 4, clean: 1 } },
      woody: { character: { woody: 4, molecular: 1 } },
      "warm-sweet": { character: { fruity: 3, warm: 2 }, mood: { "warm-sweet": 3 } }
    },
    room: {
      "living-room": { room: { "living-room": 3 } },
      bedroom: { room: { bedroom: 3 }, scales: { intensity: { max: 7, bonus: 1 } } },
      bathroom: { room: { bathroom: 3 }, character: { clean: 1, spa: 1 } },
      hallway: { room: { hallway: 3 }, scales: { intensity: { min: 6, bonus: 1 } } },
      office: { room: { office: 3 }, character: { woody: 1, clean: 1 } },
      kitchen: { character: { fresh: 2, clean: 2 }, scales: { sweetness: { max: 5, bonus: 2 } } }
    },
    composition: {
      fresh: { character: { fresh: 4 } },
      woody: { character: { woody: 4 } },
      "warm-sweet": { character: { warm: 3, fruity: 2 } },
      clean: { character: { clean: 4 } }
    },
    intensity: {
      light: { scales: { intensity: { max: 6, bonus: 4 } } },
      moderate: { scales: { intensity: { min: 5, max: 7, bonus: 4 } } },
      rich: { scales: { intensity: { min: 7, bonus: 4 } }, character: { woody: 1, molecular: 1 } }
    },
    space: {
      entry: { collection: { entry: 4 } },
      signature: { collection: { signature: 4 } },
      premium: { collection: { premium: 4 } },
      noir: { collection: { noir: 4 } }
    }
  };

  const state = { step: 1, answers: {}, recommendations: [] };

  function mergeWeights(target, source) {
    Object.keys(source || {}).forEach((dimension) => {
      if (dimension === "scales") {
        target.scales = target.scales || {};
        Object.assign(target.scales, source.scales);
        return;
      }
      target[dimension] = target[dimension] || {};
      Object.keys(source[dimension] || {}).forEach((key) => {
        target[dimension][key] = (target[dimension][key] || 0) + source[dimension][key];
      });
    });
  }

  function computeWeights() {
    const totals = {};
    Object.entries(state.answers).forEach(([question, value]) => {
      const weightSet = ANSWER_WEIGHTS[question]?.[value];
      if (weightSet) mergeWeights(totals, weightSet);
    });
    return totals;
  }

  function scoreProduct(product, weights) {
    let score = 0;
    const matched = { character: [], mood: [], room: false, collection: false, intensity: false };

    (product.character || []).forEach((item) => {
      if (weights.character?.[item]) {
        score += weights.character[item];
        matched.character.push(item);
      }
    });
    (product.mood || []).forEach((item) => {
      if (weights.mood?.[item]) {
        score += weights.mood[item];
        matched.mood.push(item);
      }
    });
    (product.room || []).forEach((item) => {
      if (weights.room?.[item]) {
        score += weights.room[item];
        matched.room = true;
      }
    });
    if (weights.collection?.[product.collection]) {
      score += weights.collection[product.collection];
      matched.collection = true;
    }

    Object.entries(weights.scales || {}).forEach(([scale, rule]) => {
      const value = product.scales?.[scale];
      if (typeof value !== "number") return;
      const aboveMin = typeof rule.min !== "number" || value >= rule.min;
      const belowMax = typeof rule.max !== "number" || value <= rule.max;
      if (aboveMin && belowMax) {
        score += rule.bonus || 0;
        matched.intensity = true;
      }
    });

    return { score, matched };
  }

  function getRecommendations() {
    const weights = computeWeights();
    const scored = PRODUCTS.map((product, index) => {
      const result = scoreProduct(product, weights);
      return { product, index, ...result };
    });
    scored.sort((a, b) => b.score - a.score || a.index - b.index);
    return scored.slice(0, 3);
  }

  function buildReason(product, matched) {
    const pieces = [];
    if (matched.character.length) {
      pieces.push(matched.character.slice(0, 2).map((item) => CHARACTER_LABELS[item] || item).join(" + "));
    }
    if (matched.room) pieces.push(`підходить для: ${ROOM_LABELS[state.answers.room] || "ваш простір"}`);
    if (matched.intensity) pieces.push("відповідає бажаній інтенсивності");
    if (matched.collection) pieces.push("збігається з вашою естетикою");
    return pieces.length ? `Чому підходить: ${pieces.join(" · ")}.` : "Збалансований варіант на основі всього профілю.";
  }

  function renderProfile() {
    const host = document.getElementById("scentProfile");
    if (!host) return;
    const profile = PROFILE_COPY[state.answers.atmosphere] || PROFILE_COPY.calm;
    const intensity = INTENSITY_LABELS[state.answers.intensity] || "збалансована присутність";
    const room = ROOM_LABELS[state.answers.room] || "простір";
    const aesthetic = SPACE_LABELS[state.answers.space] || "сучасний інтерʼєр";
    host.innerHTML = `
      <div class="scent-profile__main">
        <p class="scent-profile__eyebrow">Ваш ароматичний профіль</p>
        <h2 class="scent-profile__title">${profile.title}</h2>
        <p class="scent-profile__copy">${profile.text}</p>
        <div class="scent-profile__tags">${profile.tags.map((tag) => `<span class="scent-profile__tag">${tag}</span>`).join("")}</div>
      </div>
      <div class="scent-profile__details">
        <dl>
          <div class="scent-profile__row"><dt>Простір</dt><dd>${room}</dd></div>
          <div class="scent-profile__row"><dt>Присутність</dt><dd>${intensity}</dd></div>
          <div class="scent-profile__row"><dt>Естетика</dt><dd>${aesthetic}</dd></div>
          <div class="scent-profile__row"><dt>Рекомендований старт</dt><dd>${state.answers.intensity === "light" ? "2–3 палички" : state.answers.intensity === "rich" ? "4 палички" : "3–4 палички"}</dd></div>
        </dl>
      </div>`;
  }

  function renderRecommendations() {
    const grid = document.getElementById("guideResultsGrid");
    if (!grid || !window.VAHomeProducts) return;
    grid.innerHTML = state.recommendations.map(({ product, matched }, index) => {
      const card = window.VAHomeProducts.renderProductCard(product, "", { context: "guide" });
      const reason = `<p class="guide-result-reason">${buildReason(product, matched)}</p>`;
      const enhanced = card.replace('<div class="product-card__meta">', reason + '<div class="product-card__meta">');
      const match = index === 0 ? "92% збіг" : index === 1 ? "86% збіг" : "79% збіг";
      const withMatch = enhanced.replace('<div class="product-card__body">', `<div class="product-card__body"><span class="guide-result-match">${match}</span>`);
      return `<div class="guide-result-wrap guide-result-wrap--${index === 0 ? "primary" : "alternative"}"><span class="guide-result-rank">${index === 0 ? "Найточніший збіг" : `Альтернатива ${index}`}</span>${withMatch}</div>`;
    }).join("");
  }

  function updateProgress() {
    const percent = Math.round((state.step / TOTAL_STEPS) * 100);
    const label = document.getElementById("guideStepLabel");
    const fill = document.getElementById("guideProgressFill");
    const percentLabel = document.getElementById("guideProgressPercent");
    const track = document.getElementById("guideProgressTrack");
    if (label) label.textContent = `Крок ${state.step} з ${TOTAL_STEPS}`;
    if (fill) fill.style.width = `${percent}%`;
    if (percentLabel) percentLabel.textContent = `${percent}%`;
    if (track) track.setAttribute("aria-valuenow", String(state.step));
  }

  function showStep(step) {
    document.querySelectorAll(".guide-step").forEach((node) => {
      node.classList.toggle("is-active", Number(node.dataset.step) === step);
    });
    const back = document.getElementById("guideBack");
    if (back) back.disabled = step <= 1;
    updateProgress();
  }

  function showResults() {
    const form = document.getElementById("scentGuideForm");
    const results = document.getElementById("guideResults");
    if (form) form.hidden = true;
    state.recommendations = getRecommendations();
    renderProfile();
    renderRecommendations();
    if (results) results.classList.add("is-active");
    document.querySelector(".scent-guide-layout")?.classList.add("has-results");
    window.VAAnalytics?.event?.("select_content", {
      content_type: "scent_guide_completed",
      items: state.recommendations.map((item) => ({ item_id: item.product.id }))
    });
    history.replaceState(null, "", `${location.pathname}?profile=${encodeProfile()}`);
    results?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function selectOption(question, value, stepNode) {
    if (!Object.keys(state.answers).length) {
      window.VAAnalytics?.event?.("select_content", { content_type: "scent_guide_started" });
    }
    state.answers[question] = value;
    stepNode.querySelectorAll(".guide-option").forEach((button) => {
      const selected = button.dataset.value === value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    window.setTimeout(() => {
      if (state.step < TOTAL_STEPS) {
        state.step += 1;
        showStep(state.step);
      } else {
        showResults();
      }
    }, 170);
  }

  function restart() {
    state.step = 1;
    state.answers = {};
    state.recommendations = [];
    document.querySelectorAll(".guide-option").forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
    document.getElementById("scentGuideForm")?.removeAttribute("hidden");
    document.getElementById("guideResults")?.classList.remove("is-active");
    document.querySelector(".scent-guide-layout")?.classList.remove("has-results");
    history.replaceState(null, "", location.pathname);
    showStep(1);
    document.querySelector(".scent-guide-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function encodeProfile() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state.answers)))).replace(/=+$/g, "");
  }

  function decodeProfile(value) {
    try {
      const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
      const parsed = JSON.parse(decodeURIComponent(escape(atob(padded))));
      const expected = ["atmosphere", "room", "composition", "intensity", "space"];
      return expected.every((key) => typeof parsed[key] === "string") ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function toast(message) {
    const node = document.getElementById("scentToast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("is-visible"), 2400);
  }

  function saveResult() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: state.answers, savedAt: Date.now() }));
      toast("Результат збережено на цьому пристрої");
      window.VAAnalytics?.event?.("select_content", { content_type: "scent_guide_saved" });
    } catch (_) {
      toast("Не вдалося зберегти результат");
    }
  }

  async function shareResult() {
    const url = `${location.origin}${location.pathname}?profile=${encodeProfile()}`;
    const title = "Мій ароматичний профіль VA HOME";
    const text = `Мій профіль — ${PROFILE_COPY[state.answers.atmosphere]?.title || "VA HOME"}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast("Посилання скопійовано");
      }
      window.VAAnalytics?.event?.("share", { method: navigator.share ? "native" : "clipboard", content_type: "scent_profile" });
    } catch (error) {
      if (error?.name !== "AbortError") toast("Не вдалося поділитися");
    }
  }

  function restoreSharedOrSaved() {
    const shared = new URLSearchParams(location.search).get("profile");
    const sharedAnswers = shared ? decodeProfile(shared) : null;
    if (sharedAnswers) {
      state.answers = sharedAnswers;
      showResults();
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.answers && Date.now() - Number(saved.savedAt || 0) < 1000 * 60 * 60 * 24 * 30) {
        // Keep the saved profile available without forcing an old result on the visitor.
        const saveButton = document.getElementById("guideSave");
        if (saveButton) saveButton.dataset.hasSavedProfile = "true";
      }
    } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!Array.isArray(window.PRODUCTS || (typeof PRODUCTS !== "undefined" ? PRODUCTS : null))) return;

    document.querySelectorAll(".guide-option").forEach((button) => button.setAttribute("aria-pressed", "false"));
    document.querySelectorAll(".guide-step").forEach((stepNode) => {
      const question = stepNode.dataset.question;
      stepNode.querySelectorAll(".guide-option").forEach((button) => {
        button.addEventListener("click", () => selectOption(question, button.dataset.value, stepNode));
      });
    });

    document.getElementById("guideBack")?.addEventListener("click", () => {
      if (state.step > 1) {
        state.step -= 1;
        showStep(state.step);
      }
    });
    document.getElementById("guideRestart")?.addEventListener("click", restart);
    document.getElementById("guideRestart2")?.addEventListener("click", restart);
    document.getElementById("guideSave")?.addEventListener("click", saveResult);
    document.getElementById("guideShare")?.addEventListener("click", shareResult);

    showStep(1);
    restoreSharedOrSaved();
  });
})();
