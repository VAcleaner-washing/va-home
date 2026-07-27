/* VA HOME v14.0.0 — Room Ritual engine */
(function () {
  "use strict";
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

  function render(result) {
    const p = result.product;
    const title = `${result.reeds} ${result.reeds === 1 ? "паличка" : result.reeds < 5 ? "палички" : "паличок"} · ${result.diameter} мм`;
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
      <div class="room-ritual-card__actions"><a class="btn btn-primary" href="products/${encodeURIComponent(p.id)}.html">Перейти до ${esc(p.name)}</a><button class="btn btn-secondary" type="button" id="ritualSave">Зберегти ритуал</button></div>
    </article>`;
    $("ritualSave")?.addEventListener("click", () => {
      try { localStorage.setItem("va_home_room_ritual_v14", JSON.stringify({ ...result, product: { id:p.id, name:p.name }, savedAt:Date.now() })); } catch (_) {}
      window.VAHome?.showToast?.("Room Ritual збережено на цьому пристрої");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const select = $("ritualProduct");
    if (!select || !products.length) return;
    select.innerHTML = products.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
    const requested = new URLSearchParams(location.search).get("product");
    if (requested && getProduct(requested)?.id === requested) select.value = requested;
    $("roomRitualForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const result = calculate({
        product: form.get("product"), room: form.get("room"), area: form.get("area"),
        presence: form.get("presence"), placement: form.get("placement")
      });
      render(result);
      window.VAAnalytics?.event?.("select_content", { content_type:"room_ritual_completed", item_id:result.product.id, room:form.get("room"), area:result.area, reeds:result.reeds });
      $("roomRitualResult")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start" });
    });
  });
})();
