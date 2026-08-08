/* VA HOME v16.3.9 RC6 — Room Ritual engine */
(function () {
  "use strict";
  const STORAGE_KEY = "va_home_room_ritual_v14";
  const $ = (id) => document.getElementById(id);
  const products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const roomLabels = { "living-room":"вітальні", bedroom:"спальні", bathroom:"ванній / SPA-зоні", hallway:"передпокої", office:"кабінеті" };
  const presenceLabels = { quiet:"тиха", balanced:"збалансована", expressive:"виразна" };
  const placementCopy = {
    open: "Поставте флакон на відкритій стійкій поверхні на висоті 70–120 см.",
    airflow: "Змістіть флакон убік від прямого потоку повітря: протяг посилює випаровування й скорочує ресурс.",
    niche: "Винесіть флакон ближче до краю ніші, щоб повітря вільно проходило між паличками.",
    high: "На високій полиці аромат підніматиметься ще вище; для відчуття на рівні людини краще висота 70–120 см."
  };

  function getProduct(id) { return products.find(p => p.id === id) || products[0]; }
  function interval(product) {
    const min = product?.reedCare?.intervalDays?.min;
    const max = product?.reedCare?.intervalDays?.max;
    if (!min) return "за потреби";
    return min === max ? `раз на ${min} днів` : `кожні ${min}–${max} днів`;
  }
  function areaBand(area) { return area <= 12 ? "small" : area <= 25 ? "standard" : "large"; }
  function baseReeds(product, band) {
    const item = product?.reedSetupByArea?.[band];
    return Number(item?.min || item?.max || product?.package?.reedCount || 4);
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function reedTitle(reeds, diameter) {
    return `${reeds} ${reeds === 1 ? "паличка" : reeds < 5 ? "палички" : "паличок"} · ${diameter} мм`;
  }

  function calculate(data) {
    const product = getProduct(data.product);
    const area = clamp(Number(data.area) || 18, 4, 60);
    const band = areaBand(area);
    let reeds = baseReeds(product, band);
    if (data.presence === "quiet") reeds -= 1;
    if (data.presence === "expressive") reeds += 1;
    if (data.room === "bedroom") reeds -= 1;
    if (data.room === "hallway") reeds += 1;
    if (data.placement === "airflow") reeds -= 1;
    if (data.placement === "niche") reeds += 1;
    const maxReeds = Number(product?.package?.reedCount || 4);
    reeds = clamp(reeds, 1, maxReeds);
    const extra = band === "large" && product?.reedSetupByArea?.large?.extraReeds;
    const diameter = product?.package?.reedDiameterMm || product?.diffusion?.primary?.diameterMm || 4;
    return {
      product, area, band, reeds, diameter, extra,
      room: roomLabels[data.room] || "кімнаті",
      presence: presenceLabels[data.presence] || "збалансована",
      placement: placementCopy[data.placement] || placementCopy.open,
      care: interval(product)
    };
  }

  function readSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
    catch (_) { return null; }
  }

  function savedResult(saved) {
    if (!saved) return null;
    const raw = saved.result || saved;
    const productId = raw?.product?.id || saved?.inputs?.product;
    const product = getProduct(productId);
    if (!product || !Number(raw?.reeds)) return null;
    return { ...raw, product };
  }

  function savePayload(result, inputs) {
    const product = result.product;
    return {
      version: 2,
      inputs: {
        product: String(inputs.product || product.id),
        room: String(inputs.room || "living-room"),
        area: Number(inputs.area || result.area),
        presence: String(inputs.presence || "balanced"),
        placement: String(inputs.placement || "open")
      },
      result: {
        product: { id: product.id, name: product.name },
        area: result.area,
        band: result.band,
        reeds: result.reeds,
        diameter: result.diameter,
        extra: Boolean(result.extra),
        room: result.room,
        presence: result.presence,
        placement: result.placement,
        care: result.care
      },
      savedAt: Date.now()
    };
  }

  function setSavedState(saved) {
    const button = $("ritualSave");
    const account = $("ritualAccountLink");
    if (button) {
      button.classList.toggle("is-saved", saved);
      button.textContent = saved ? "Збережено ✓" : "Зберегти ритуал";
    }
    if (account) account.hidden = !saved;
  }

  function render(result, inputs, isSaved = false) {
    const p = result.product;
    const title = reedTitle(result.reeds, result.diameter);
    $("roomRitualResult").innerHTML = `<article class="room-ritual-card">
      <p class="room-ritual-card__eyebrow">ROOM RITUAL · ${esc(p.name)}</p>
      <h2>${esc(p.name)} у вашому просторі</h2>
      <p class="room-ritual-card__summary">Для ${esc(result.room)} площею ${result.area} м² і бажаної присутності «${esc(result.presence)}» почніть зі стриманого налаштування. Остаточне звучання оцінюйте не раніше ніж через 24–48 годин.</p>
      <div class="room-ritual-card__primary"><span>Рекомендований старт</span><strong>${esc(title)}</strong></div>
      <dl class="room-ritual-card__steps">
        <div><dt>Розміщення</dt><dd>${esc(result.placement)}</dd></div>
        <div><dt>Догляд</dt><dd>Перевертайте палички ${esc(result.care)} або лише тоді, коли звучання стало тихішим.</dd></div>
        <div><dt>Корекція</dt><dd>Змінюйте кількість лише на одну паличку та повторно оцінюйте аромат через добу.</dd></div>
      </dl>
      <p class="room-ritual-card__note">${esc(p?.reedSetupByArea?.note || p?.diffusion?.tip || "Починайте з меншої інтенсивності та поступово коригуйте.")}${result.extra ? " Для простору понад 25 м² краще додати другий дифузор, а не перевантажувати один флакон." : ""}</p>
      <div class="room-ritual-card__actions">
        <a class="btn btn-primary" href="products/${encodeURIComponent(p.id)}.html">Перейти до ${esc(p.name)}</a>
        <button class="btn btn-secondary" type="button" id="ritualSave">Зберегти ритуал</button>
        <a class="btn btn-secondary room-ritual-account-link" id="ritualAccountLink" href="account.html?tab=atmosphere#accountRoomRitual" hidden>Переглянути в кабінеті</a>
      </div>
    </article>`;
    setSavedState(isSaved);
    $("ritualSave")?.addEventListener("click", () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savePayload(result, inputs))); }
      catch (_) {
        window.VAHome?.showToast?.("Не вдалося зберегти ритуал у браузері");
        return;
      }
      setSavedState(true);
      window.VAHome?.showToast?.("Ритуал збережено — він уже відображається в кабінеті");
    });
  }

  function closeSelects(except) {
    document.querySelectorAll(".room-ritual-select.is-open").forEach((wrapper) => {
      if (wrapper === except) return;
      wrapper.classList.remove("is-open");
      wrapper.querySelector(".room-ritual-select__trigger")?.setAttribute("aria-expanded", "false");
      const menu = wrapper.querySelector(".room-ritual-select__menu");
      if (menu) menu.hidden = true;
    });
  }

  function enhanceSelect(select) {
    if (!select || select.dataset.enhanced === "true") return;
    select.dataset.enhanced = "true";
    select.classList.add("room-ritual-select__native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    const wrapper = document.createElement("div");
    wrapper.className = "room-ritual-select";
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "room-ritual-select__trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = '<span></span><i aria-hidden="true"></i>';

    const menu = document.createElement("div");
    menu.className = "room-ritual-select__menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    function sync() {
      const selected = select.options[select.selectedIndex] || select.options[0];
      trigger.querySelector("span").textContent = selected?.textContent || "Оберіть";
      menu.querySelectorAll("[data-value]").forEach((option) => {
        const active = option.dataset.value === select.value;
        option.classList.toggle("is-selected", active);
        option.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    function build() {
      menu.innerHTML = "";
      Array.from(select.options).forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "room-ritual-select__option";
        button.dataset.value = option.value;
        button.setAttribute("role", "option");
        button.textContent = option.textContent;
        button.addEventListener("click", () => {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          sync();
          closeSelects();
          trigger.focus();
        });
        menu.appendChild(button);
      });
      sync();
    }

    trigger.addEventListener("click", () => {
      const open = !wrapper.classList.contains("is-open");
      closeSelects(open ? wrapper : null);
      wrapper.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      menu.hidden = !open;
      if (open) menu.querySelector(".is-selected")?.scrollIntoView({ block: "nearest" });
    });
    trigger.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key) && !wrapper.classList.contains("is-open")) {
        event.preventDefault();
        trigger.click();
        menu.querySelector(".is-selected")?.focus();
      }
    });
    menu.addEventListener("keydown", (event) => {
      const items = Array.from(menu.querySelectorAll(".room-ritual-select__option"));
      const index = items.indexOf(document.activeElement);
      if (event.key === "Escape") { event.preventDefault(); closeSelects(); trigger.focus(); }
      if (event.key === "ArrowDown") { event.preventDefault(); items[Math.min(items.length - 1, index + 1)]?.focus(); }
      if (event.key === "ArrowUp") { event.preventDefault(); items[Math.max(0, index - 1)]?.focus(); }
    });
    select.addEventListener("change", sync);
    wrapper.append(trigger, menu);
    build();
    select._roomRitualRefresh = build;
  }

  function enhanceNumber(input) {
    if (!input || input.dataset.enhanced === "true") return;
    input.dataset.enhanced = "true";
    const wrapper = document.createElement("div");
    wrapper.className = "room-ritual-stepper";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    const minus = document.createElement("button");
    const plus = document.createElement("button");
    minus.type = plus.type = "button";
    minus.className = plus.className = "room-ritual-stepper__button";
    minus.setAttribute("aria-label", "Зменшити площу");
    plus.setAttribute("aria-label", "Збільшити площу");
    minus.textContent = "−";
    plus.textContent = "+";
    function step(direction) {
      const min = Number(input.min || 4);
      const max = Number(input.max || 60);
      const step = Number(input.step || 1);
      input.value = String(clamp((Number(input.value) || min) + direction * step, min, max));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    minus.addEventListener("click", () => step(-1));
    plus.addEventListener("click", () => step(1));
    wrapper.prepend(minus);
    wrapper.append(plus);
  }

  function currentInputs(form) {
    const data = new FormData(form);
    return {
      product: data.get("product"), room: data.get("room"), area: data.get("area"),
      presence: data.get("presence"), placement: data.get("placement")
    };
  }

  function applySavedInputs(saved) {
    const inputs = saved?.inputs;
    if (!inputs) return;
    const product = $("ritualProduct");
    const room = $("ritualRoom");
    const area = $("ritualArea");
    const placement = $("ritualPlacement");
    if (product && getProduct(inputs.product)?.id === inputs.product) product.value = inputs.product;
    if (room && room.querySelector(`option[value="${CSS.escape(String(inputs.room))}"]`)) room.value = inputs.room;
    if (area) area.value = String(clamp(Number(inputs.area) || 18, 4, 60));
    if (placement && placement.querySelector(`option[value="${CSS.escape(String(inputs.placement))}"]`)) placement.value = inputs.placement;
    const presence = document.querySelector(`input[name="presence"][value="${CSS.escape(String(inputs.presence || "balanced"))}"]`);
    if (presence) presence.checked = true;
    [product, room, placement].forEach((select) => select?.dispatchEvent(new Event("change", { bubbles: true })));
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".room-ritual-select")) closeSelects();
  });

  document.addEventListener("DOMContentLoaded", () => {
    const select = $("ritualProduct");
    if (!select || !products.length) return;
    select.innerHTML = products.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
    [select, $("ritualRoom"), $("ritualPlacement")].forEach(enhanceSelect);
    enhanceNumber($("ritualArea"));

    const requested = new URLSearchParams(location.search).get("product");
    if (requested && getProduct(requested)?.id === requested) {
      select.value = requested;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const saved = readSaved();
    if (new URLSearchParams(location.search).get("restore") === "1" && saved) {
      applySavedInputs(saved);
      const restored = savedResult(saved);
      if (restored) render(restored, saved.inputs || currentInputs($("roomRitualForm")), true);
    }

    $("roomRitualForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const inputs = currentInputs(event.currentTarget);
      const result = calculate(inputs);
      render(result, inputs, false);
      window.VAAnalytics?.event?.("select_content", { content_type:"room_ritual_completed", item_id:result.product.id, room:inputs.room, area:result.area, reeds:result.reeds });
      $("roomRitualResult")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start" });
    });
  });
})();
