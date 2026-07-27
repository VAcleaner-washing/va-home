/* ==========================================================================
   VA HOME v13.8.31 — Personal Scent Experience
   Questions, option copy and scoring rules come from data/product-content.json
   through the generated window.VA_SCENT_GUIDE object.
   ========================================================================== */
(function () {
  "use strict";

  const GUIDE = window.VA_SCENT_GUIDE || {};
  const QUESTIONS = Array.isArray(GUIDE.questions) ? GUIDE.questions : [];
  const TOTAL_STEPS = QUESTIONS.length || 5;
  const STORAGE_KEY = GUIDE.storageKey || "vaHomeScentProfileV13822";
  const LABELS = window.VA_PRODUCT_LABELS || { character: {}, room: {}, mood: {} };
  const state = { step: 1, answers: {}, recommendations: [] };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  function getQuestion(questionId) {
    return QUESTIONS.find((question) => question.id === questionId) || null;
  }

  function getOption(questionId, optionId) {
    return getQuestion(questionId)?.options?.find((option) => option.id === optionId) || null;
  }

  function renderGuideControls() {
    document.querySelectorAll(".guide-step[data-question]").forEach((stepNode) => {
      const question = getQuestion(stepNode.dataset.question);
      if (!question) return;
      const stepNumber = Number(stepNode.dataset.step || 0);
      const numberNode = stepNode.querySelector(".guide-step__number");
      const titleNode = stepNode.querySelector(".guide-step__question");
      const optionsNode = stepNode.querySelector(".guide-options");
      if (numberNode) numberNode.textContent = `${String(stepNumber).padStart(2, "0")} · ${question.stepLabel}`;
      if (titleNode) titleNode.textContent = question.title;
      if (optionsNode) {
        optionsNode.innerHTML = (question.options || []).map((option) => `
          <button class="guide-option" data-value="${escapeHtml(option.id)}" type="button" aria-pressed="false">
            <span class="guide-option__title">${escapeHtml(option.title)}</span>
            <span class="guide-option__note">${escapeHtml(option.note)}</span>
          </button>`).join("");
      }
    });
  }

  function bestDimensionMatch(product, dimension, weights, matched) {
    if (!weights || typeof weights !== "object") return 0;
    const values = dimension === "collection"
      ? [product.collection]
      : Array.isArray(product[dimension]) ? product[dimension] : [];
    let best = 0;
    values.forEach((value) => {
      const points = Number(weights[value] || 0);
      if (points > 0) {
        matched[dimension].push(value);
        best = Math.max(best, points);
      }
    });
    return best;
  }

  function scoreOption(product, questionId, option) {
    const rule = option?.score || {};
    const matched = { character: [], mood: [], room: [], collection: [], scales: [], exactRoom: false, intensity: false };
    let positive = 0;
    let penalties = 0;

    ["character", "mood", "room", "collection"].forEach((dimension) => {
      positive += bestDimensionMatch(product, dimension, rule[dimension], matched);
    });

    (rule.scales || []).forEach((scaleRule) => {
      const value = product.scales?.[scaleRule.key];
      if (typeof value !== "number") return;
      const aboveMin = typeof scaleRule.min !== "number" || value >= scaleRule.min;
      const belowMax = typeof scaleRule.max !== "number" || value <= scaleRule.max;
      const points = aboveMin && belowMax ? Number(scaleRule.points || 0) : Number(scaleRule.otherwise || 0);
      if (points >= 0) {
        positive += points;
        if (points) matched.scales.push(scaleRule.key);
      } else {
        penalties += points;
      }
    });

    if (rule.targetScale) {
      const target = rule.targetScale;
      const value = product.scales?.[target.key];
      if (typeof value === "number") {
        const distance = Math.abs(value - Number(target.target));
        const points = distance < (target.pointsByDistance || []).length
          ? Number(target.pointsByDistance[distance] || 0)
          : Number(target.farPenalty || 0);
        if (points >= 0) {
          positive += points;
          matched.intensity = points > 0;
        } else {
          penalties += points;
        }
      }
    }

    if (questionId === "room") {
      const exactRoom = option.id !== "kitchen" && (product.room || []).includes(option.id);
      matched.exactRoom = exactRoom;
      if (option.id !== "kitchen" && !exactRoom) penalties += Number(rule.roomMismatchPenalty || 0);
      if ((product.guide?.avoidRooms || []).includes(option.id)) penalties += Number(rule.avoidRoomPenalty || -10);
    }

    const cappedPositive = Math.min(positive, Number(rule.cap ?? positive));
    return { score: cappedPositive + penalties, matched, maxScore: Number(rule.cap || 0) };
  }

  function scoreProduct(product) {
    let score = 0;
    let maxScore = 0;
    const matched = { character: [], mood: [], room: false, collection: false, intensity: false };
    let exactRoom = false;

    QUESTIONS.forEach((question) => {
      const option = getOption(question.id, state.answers[question.id]);
      if (!option) return;
      const result = scoreOption(product, question.id, option);
      score += result.score;
      maxScore += result.maxScore;
      matched.character.push(...result.matched.character);
      matched.mood.push(...result.matched.mood);
      matched.room = matched.room || result.matched.exactRoom;
      matched.collection = matched.collection || result.matched.collection.length > 0;
      matched.intensity = matched.intensity || result.matched.intensity;
      exactRoom = exactRoom || result.matched.exactRoom;
    });

    matched.character = [...new Set(matched.character)];
    matched.mood = [...new Set(matched.mood)];
    const percent = maxScore > 0 ? Math.max(0, Math.min(100, Math.round((score / maxScore) * 100))) : 0;
    return { score, maxScore, percent, matched, exactRoom };
  }

  function getRecommendations() {
    const scored = PRODUCTS.map((product, index) => ({ product, index, ...scoreProduct(product) }));
    scored.sort((a, b) =>
      b.score - a.score ||
      Number(b.exactRoom) - Number(a.exactRoom) ||
      b.matched.mood.length - a.matched.mood.length ||
      b.matched.character.length - a.matched.character.length ||
      a.index - b.index
    );
    return scored.slice(0, Number(GUIDE.recommendationCount || 3));
  }

  function labelFor(dimension, key) {
    return LABELS?.[dimension]?.[key] || key;
  }

  function reedSetupSummary(product) {
    const setup = product?.reedSetupByArea;
    if (!setup) return product?.quickFacts || "Дивіться рекомендацію в картці";
    return `${setup.standard.label} палички для стандартної кімнати`;
  }

  function buildReason(product, matched) {
    const pieces = [];
    if (matched.mood.length) pieces.push(labelFor("mood", matched.mood[0]).toLowerCase());
    if (matched.character.length) {
      pieces.push(matched.character.slice(0, 2).map((key) => labelFor("character", key).toLowerCase()).join(" + "));
    }
    const roomOption = getOption("room", state.answers.room);
    if (matched.room && roomOption) pieces.push(`підходить для: ${roomOption.title.toLowerCase()}`);
    if (matched.intensity) pieces.push("відповідає бажаній присутності");
    const why = pieces.length ? pieces.join(" · ") : "збалансований збіг за вашим профілем";
    return `Чому підходить: ${why}. Палички: ${reedSetupSummary(product)}. Догляд: ${product.reedCare?.publicText || "перевертайте за потреби"}`;
  }

  function renderProfile() {
    const host = document.getElementById("scentProfile");
    if (!host) return;
    const atmosphere = getOption("atmosphere", state.answers.atmosphere);
    const room = getOption("room", state.answers.room);
    const intensity = getOption("intensity", state.answers.intensity);
    const space = getOption("space", state.answers.space);
    const topProduct = state.recommendations[0]?.product;
    const profile = atmosphere?.profile || {};
    host.innerHTML = `
      <div class="scent-profile__main">
        <p class="scent-profile__eyebrow">Ваш ароматичний профіль</p>
        <h2 class="scent-profile__title">${escapeHtml(profile.title || "Ваш профіль")}</h2>
        <p class="scent-profile__copy">${escapeHtml(profile.text || "Рекомендації сформовано на основі ваших відповідей.")}</p>
        <div class="scent-profile__tags">${(profile.tags || []).map((tag) => `<span class="scent-profile__tag">${escapeHtml(tag)}</span>`).join("")}</div>
      </div>
      <div class="scent-profile__details">
        <dl>
          <div class="scent-profile__row"><dt>Простір</dt><dd>${escapeHtml(room?.title || "Ваш простір")}</dd></div>
          <div class="scent-profile__row"><dt>Присутність</dt><dd>${escapeHtml(intensity?.profileLabel || intensity?.title || "Збалансована")}</dd></div>
          <div class="scent-profile__row"><dt>Естетика</dt><dd>${escapeHtml(space?.title || "Сучасний інтер’єр")}</dd></div>
          <div class="scent-profile__row"><dt>Палички за площею</dt><dd>${escapeHtml(reedSetupSummary(topProduct))}</dd></div>
          <div class="scent-profile__row"><dt>Перевертання</dt><dd>${escapeHtml(topProduct?.reedCare?.publicText || "За потреби")}</dd></div>
        </dl>
      </div>`;
  }

  function renderRecommendations() {
    const grid = document.getElementById("guideResultsGrid");
    if (!grid || !window.VAHomeProducts) return;
    grid.innerHTML = state.recommendations.map(({ product, matched, percent }, index) => {
      const card = window.VAHomeProducts.renderProductCard(product, "", { context: "guide" });
      const reason = `<p class="guide-result-reason">${escapeHtml(buildReason(product, matched))}</p>`;
      const enhanced = card.replace('<div class="product-card__meta">', reason + '<div class="product-card__meta">');
      const match = `${percent}% відповідності`;
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
    if (track) {
      track.setAttribute("aria-valuemax", String(TOTAL_STEPS));
      track.setAttribute("aria-valuenow", String(state.step));
    }
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
      items: state.recommendations.map((item) => ({ item_id: item.product.id, match_percent: item.percent }))
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

  function isValidAnswers(parsed) {
    return QUESTIONS.every((question) =>
      typeof parsed?.[question.id] === "string" &&
      (question.options || []).some((option) => option.id === parsed[question.id])
    );
  }

  function decodeProfile(value) {
    try {
      const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
      const parsed = JSON.parse(decodeURIComponent(escape(atob(padded))));
      return isValidAnswers(parsed) ? parsed : null;
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
    const profile = getOption("atmosphere", state.answers.atmosphere)?.profile;
    const title = "Мій ароматичний профіль VA HOME";
    const text = `Мій профіль — ${profile?.title || "VA HOME"}.`;
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
      if (saved?.answers && isValidAnswers(saved.answers) && Date.now() - Number(saved.savedAt || 0) < 1000 * 60 * 60 * 24 * 30) {
        const saveButton = document.getElementById("guideSave");
        if (saveButton) saveButton.dataset.hasSavedProfile = "true";
      }
    } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!Array.isArray(window.PRODUCTS || (typeof PRODUCTS !== "undefined" ? PRODUCTS : null)) || !QUESTIONS.length) return;
    renderGuideControls();

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
