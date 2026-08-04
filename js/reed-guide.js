(() => {
  "use strict";

  const COLLECTION_ORDER = ["entry", "signature", "premium", "noir"];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function intervalLabel(product) {
    const min = product?.reedCare?.intervalDays?.min;
    const max = product?.reedCare?.intervalDays?.max;
    if (!Number.isInteger(min) || !Number.isInteger(max)) return "За потреби";
    if (min === 7 && max === 7) return "Раз на тиждень";
    if (min === max) return `Кожні ${min} дні`;
    return `Кожні ${min}–${max} ${max <= 4 ? "дні" : "днів"}`;
  }

  function render(product, result) {
    const collection = typeof window.getCollection === "function" ? window.getCollection(product.collection) : null;
    const diameter = Number(product?.package?.reedDiameterMm || 4);
    const count = Number(product?.package?.reedCount || 4);
    const reserve = Number(product?.package?.reserveCount || 0);
    const reserveText = reserve > 0
      ? `${reserve} ${reserve === 1 ? "паличка" : "палички"} залишаються в запасі.`
      : "Коригуйте інтенсивність лише по одній паличці.";

    result.innerHTML = `
      <div class="reed-finder__identity">
        <span>${escapeHtml(collection?.name || "VA HOME")}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.shortDescription)}</p>
      </div>
      <div class="reed-finder__facts" aria-label="Персональне налаштування ${escapeHtml(product.name)}">
        <div><span>Старт</span><strong>${escapeHtml(product.quickFacts)} · ${diameter} мм</strong></div>
        <div><span>У комплекті</span><strong>${count} × ${diameter} мм</strong></div>
        <div><span>Перевертання</span><strong>${escapeHtml(intervalLabel(product))}</strong></div>
        <div><span>Термін</span><strong>${escapeHtml(product?.duration?.label || "до 10 тижнів")}</strong></div>
      </div>
      <div class="reed-finder__ritual">
        <p><span>Коли замінювати</span><strong>${escapeHtml(product?.reedCare?.replacementText || "Коли перевертання вже не повертає звучання.")}</strong></p>
        <p><span>Запас</span><strong>${escapeHtml(reserveText)}</strong></p>
        <a href="../products/${encodeURIComponent(product.id)}.html#reedSetupSection">Відкрити догляд за ароматом →</a>
      </div>`;
    result.hidden = false;
  }

  function init() {
    const host = document.querySelector("[data-reed-finder]");
    const combobox = document.querySelector("[data-reed-combobox]");
    const trigger = document.getElementById("reedFinderButton");
    const current = trigger?.querySelector("[data-reed-current]");
    const menu = document.getElementById("reedFinderMenu");
    const list = document.getElementById("reedFinderList");
    const select = document.getElementById("reedFinderSelect");
    const result = document.getElementById("reedFinderResult");
    if (!host || !combobox || !trigger || !current || !menu || !list || !select || !result || !Array.isArray(window.PRODUCTS)) return;

    const products = [...window.PRODUCTS].sort((a, b) => {
      const collection = COLLECTION_ORDER.indexOf(a.collection) - COLLECTION_ORDER.indexOf(b.collection);
      return collection || a.name.localeCompare(b.name, "uk");
    });
    const optionButtons = [];

    for (const collectionId of COLLECTION_ORDER) {
      const collectionProducts = products.filter((product) => product.collection === collectionId);
      if (!collectionProducts.length) continue;
      const collection = typeof window.getCollection === "function" ? window.getCollection(collectionId) : null;
      const label = collection?.name || collectionId;

      const nativeGroup = document.createElement("optgroup");
      nativeGroup.label = label;
      const visualGroup = document.createElement("div");
      visualGroup.className = "reed-finder__group";
      visualGroup.setAttribute("role", "group");
      visualGroup.setAttribute("aria-label", label);
      visualGroup.innerHTML = `<span class="reed-finder__group-label">${escapeHtml(label)}</span>`;

      for (const product of collectionProducts) {
        const nativeOption = document.createElement("option");
        nativeOption.value = product.id;
        nativeOption.textContent = product.name;
        nativeGroup.appendChild(nativeOption);

        const option = document.createElement("button");
        option.type = "button";
        option.className = "reed-finder__option";
        option.id = `reed-option-${product.id}`;
        option.dataset.value = product.id;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.tabIndex = -1;
        option.innerHTML = `<span>${escapeHtml(product.name)}</span><small>${escapeHtml(product.quickFacts)} · ${Number(product?.package?.reedDiameterMm || 4)} мм</small>`;
        visualGroup.appendChild(option);
        optionButtons.push(option);
      }
      select.appendChild(nativeGroup);
      list.appendChild(visualGroup);
    }

    function selectedProduct() {
      return products.find((product) => product.id === select.value) || null;
    }

    function syncSelection(product, { updateUrl = true, returnFocus = true } = {}) {
      select.value = product?.id || "";
      current.textContent = product?.name || "Оберіть аромат VA HOME";
      for (const option of optionButtons) {
        const selected = option.dataset.value === product?.id;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-selected", String(selected));
      }
      if (product) render(product, result);
      else {
        result.hidden = true;
        result.innerHTML = "";
      }
      if (updateUrl) {
        const url = new URL(location.href);
        if (product) url.searchParams.set("aroma", product.id);
        else url.searchParams.delete("aroma");
        history.replaceState(null, "", url);
      }
      closeMenu(returnFocus);
    }

    function openMenu(focusSelected = true) {
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      combobox.classList.add("is-open");
      const target = focusSelected
        ? optionButtons.find((option) => option.dataset.value === select.value) || optionButtons[0]
        : optionButtons[0];
      requestAnimationFrame(() => {
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ block: "nearest" });
      });
    }

    function closeMenu(returnFocus = false) {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      combobox.classList.remove("is-open");
      if (returnFocus) trigger.focus({ preventScroll: true });
    }

    function moveFocus(currentOption, direction) {
      const index = Math.max(0, optionButtons.indexOf(currentOption));
      const next = optionButtons[(index + direction + optionButtons.length) % optionButtons.length];
      next?.focus({ preventScroll: true });
      next?.scrollIntoView({ block: "nearest" });
    }

    trigger.addEventListener("click", () => {
      if (menu.hidden) openMenu(true);
      else closeMenu(true);
    });
    trigger.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu(true);
      }
    });
    list.addEventListener("click", (event) => {
      const option = event.target.closest("[data-value]");
      if (!option) return;
      syncSelection(products.find((product) => product.id === option.dataset.value));
    });
    list.addEventListener("keydown", (event) => {
      const option = event.target.closest("[data-value]");
      if (!option) return;
      if (event.key === "ArrowDown") { event.preventDefault(); moveFocus(option, 1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); moveFocus(option, -1); }
      else if (event.key === "Home") { event.preventDefault(); optionButtons[0]?.focus(); optionButtons[0]?.scrollIntoView({ block: "nearest" }); }
      else if (event.key === "End") { event.preventDefault(); optionButtons.at(-1)?.focus(); optionButtons.at(-1)?.scrollIntoView({ block: "nearest" }); }
      else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); syncSelection(products.find((product) => product.id === option.dataset.value)); }
      else if (event.key === "Escape") { event.preventDefault(); closeMenu(true); }
      else if (event.key === "Tab") closeMenu(false);
    });
    document.addEventListener("pointerdown", (event) => {
      if (!combobox.contains(event.target)) closeMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) closeMenu(true);
    });
    select.addEventListener("change", () => syncSelection(selectedProduct(), { updateUrl: true, returnFocus: false }));

    const params = new URLSearchParams(location.search);
    const initial = params.get("aroma");
    const initialProduct = products.find((product) => product.id === initial) || null;
    if (initialProduct) syncSelection(initialProduct, { updateUrl: false, returnFocus: false });

    const reference = document.getElementById("reedReference");
    if (location.hash === "#reedReference" && reference instanceof HTMLDetailsElement) reference.open = true;
    reference?.addEventListener("toggle", () => {
      if (reference.open) window.VAAnalytics?.event?.("select_content", { content_type: "reed_reference_open" });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
