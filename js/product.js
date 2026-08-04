/* ==========================================================================
   VA HOME — product.js
   Product page CONTENT (name, price, notes, scales, tags, similar aromas)
   is pre-rendered as static HTML directly in each products/*.html file —
   this keeps it crawlable without executing JS. This script only wires up
   the interactive bits: the quantity stepper and "Додати в кошик".
   ========================================================================== */

(function () {
  "use strict";


  const REED_CARE_POLICY = window.VA_REED_CARE_POLICY || { consumptionNote: "Кожне перевертання тимчасово посилює аромат і пришвидшує випаровування." };
  const REED_ADDON_POLICY = window.VA_REED_ADDON_POLICY || { price: 50, noirIncludedText: "У NOIR палички вже включено у вартість." };
  const REED_SETUP_POLICY = window.VA_REED_SETUP_POLICY || {
    title: "Налаштуйте аромат під кімнату",
    publicRule: "Почніть із рекомендованої кількості. Остаточне звучання оцініть наступного дня.",
    adjustmentNote: "Якщо аромат звучить занадто тихо — додайте одну паличку. Якщо надто виразно — приберіть одну.",
    extraReedsNote: "Для великого простору може знадобитися додатковий комплект паличок.",
    bands: [{ id: "small", label: "Невелика кімната" }, { id: "standard", label: "Стандартна кімната", recommended: true }, { id: "large", label: "Великий простір" }]
  };

  const LABELS = window.VA_PRODUCT_LABELS || {
    "character": {
      "clean": "Чисті",
      "fresh": "Свіжі",
      "fruity": "Фруктові",
      "warm": "Теплі",
      "woody": "Деревні",
      "spa": "SPA",
      "molecular": "Молекулярні",
      "hotel": "Готельні",
      "floral": "Квіткові",
      "evening": "Вечірні",
      "spicy": "Пряні"
    },
    "room": {
      "living-room": "Вітальня",
      "bedroom": "Спальня",
      "bathroom": "Ванна",
      "office": "Кабінет",
      "hallway": "Передпокій",
      "wardrobe": "Гардероб",
      "library": "Бібліотека",
      "lounge": "Lounge",
      "balcony": "Балкон",
      "terrace": "Тераса",
      "showroom": "Showroom",
      "dining-room": "Їдальня",
      "spa-zone": "SPA-зона"
    },
    "mood": {
      "calm": "Спокій",
      "warm-evening": "Теплий вечір",
      "warm-sweet": "Тепла солодкість",
      "hotel-clean": "Готельна чистота",
      "spring-fresh": "Весняна свіжість",
      "berry-air": "Свіже ягідне повітря",
      "dark-luxury": "Темна розкіш",
      "confident-space": "Впевнений простір",
      "airy-luxury": "Повітряна розкіш",
      "private-library": "Приватна бібліотека",
      "silk-aura": "Шовкова аура",
      "meditative-wood": "Медитативна деревна свіжість",
      "mossy-dark": "Мохово-деревна атмосфера",
      "sensual-evening": "Чуттєвий вечір",
      "spa": "SPA"
    },
    "scales": {
      "freshness": "Свіжість",
      "warmth": "Теплість",
      "sweetness": "Солодкість",
      "woodiness": "Деревність",
      "cleanliness": "Чистота",
      "intensity": "Інтенсивність"
    },
    "scaleOrder": ["freshness", "warmth", "sweetness", "woodiness", "cleanliness", "intensity"],
    "scaleCharacterWords": {
      "freshness": "свіжий",
      "warmth": "теплий",
      "sweetness": "солодкий",
      "woodiness": "деревний",
      "cleanliness": "чистий",
      "intensity": "виразний"
    }
  };

  function getProductScaleEntries() {
    const labels = LABELS.scales || {};
    const configuredOrder = Array.isArray(LABELS.scaleOrder) ? LABELS.scaleOrder : Object.keys(labels);
    const order = configuredOrder.filter((key, index) => labels[key] && configuredOrder.indexOf(key) === index);
    return order.map((key) => ({ key, label: labels[key] }));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value || "";
  }

  function renderPills(id, values, map) {
    const node = document.getElementById(id);
    if (!node) return;
    node.innerHTML = (values || []).map((value) => `<span class="tag-pill">${escapeHtml(map[value] || value)}</span>`).join("");
  }

  function getProductGallery(product) {
    const typed = Array.isArray(product?.images?.gallery) ? product.images.gallery : [];
    const normalized = typed
      .map((item, index) => typeof item === "string"
        ? { type: index === 0 ? "hero" : "detail", label: `Фото ${index + 1}`, src: item }
        : item)
      .filter((item) => item && item.src);
    return normalized;
  }

  function getPrimaryProductImage(product) {
    return getProductGallery(product)[0]?.src || product?.images?.main || "";
  }

  function hydrateSeo(product, collection, price, volume) {
    const title = `${product.name} — аромадифузор ${volume} | VA HOME`;
    const description = `${product.shortDescription} ${volume}, ${price} грн. Преміальний аромадифузор VA HOME.`;
    document.title = title;
    const setMeta = (selector, content) => { const el = document.querySelector(selector); if (el) el.setAttribute("content", content); };
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:image"]', `https://vahome.com.ua/${getPrimaryProductImage(product)}`);
    setMeta('meta[property="og:url"]', location.href);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);

    const schema = {
      "@context": "https://schema.org", "@type": "Product", name: product.name,
      image: [`https://vahome.com.ua/${getPrimaryProductImage(product)}`], description: product.shortDescription,
      brand: { "@type": "Brand", name: "VA HOME" }, sku: product.id,
      offers: { "@type": "Offer", url: location.href, priceCurrency: "UAH", price, availability: "https://schema.org/InStock" },
      additionalProperty: [
        { "@type": "PropertyValue", name: "Об’єм", value: volume },
        { "@type": "PropertyValue", name: "Рекомендований старт", value: product.quickFacts },
        { "@type": "PropertyValue", name: "Палички у комплекті", value: `${product.package?.reedCount || 4} × ${product.package?.reedDiameterMm || 4} мм` },
        { "@type": "PropertyValue", name: "Рекомендована площа", value: product.diffusion?.area || "до 25 м²" },
        { "@type": "PropertyValue", name: "Інтенсивність", value: `${product.scales.intensity} з 10` },
        { "@type": "PropertyValue", name: "Перевертання паличок", value: product.reedCare?.publicText || "За потреби" },
        { "@type": "PropertyValue", name: "Орієнтовний термін", value: durationLabel(product) },
        { "@type": "PropertyValue", name: "Коли замінювати палички", value: product.reedCare?.replacementText || REED_CARE_POLICY.replacementRule || "Коли перевертання вже не допомагає" },
        { "@type": "PropertyValue", name: "Запасні палички", value: product.collection === "noir" ? "Підібраний комплект уже включено у вартість" : `Можна додати у кошику за ${Number(REED_ADDON_POLICY.price || 50)} грн` },
        { "@type": "PropertyValue", name: "Палички до 15 м²", value: product.reedSetupByArea?.small?.label || "—" },
        { "@type": "PropertyValue", name: "Палички для 15–25 м²", value: product.reedSetupByArea?.standard?.label || "—" },
        { "@type": "PropertyValue", name: "Палички для 25 м²+", value: product.reedSetupByArea?.large?.label || "—" }
      ]
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  function reedCountLabel(value) {
    return `${value} палички`;
  }

  function reedIntervalLabel(product) {
    const min = product.reedCare?.intervalDays?.min;
    const max = product.reedCare?.intervalDays?.max;
    if (!Number.isInteger(min) || !Number.isInteger(max)) return "За потреби";
    if (min === 7 && max === 7) return "Раз на тиждень";
    if (min === max) return `Кожні ${min} дні`;
    return `Кожні ${min}–${max} ${max <= 4 ? "дні" : "днів"}`;
  }

  function durationLabel(product) {
    return product.duration?.label || "до 10 тижнів";
  }

  function startLabel(product) {
    return `${product.quickFacts || "3–4 палички"} · ${product.package?.reedDiameterMm || 4} мм`;
  }

  function renderReedSetup(product) {
    const host = document.getElementById("reedSetupSection");
    const setup = product.reedSetupByArea;
    if (!host || !setup) return;
    const cards = (REED_SETUP_POLICY.bands || []).map((band) => {
      const value = setup[band.id];
      if (!value) return "";
      const recommended = band.recommended ? " is-recommended" : "";
      return `<article class="product-reed-guide__item${recommended}"><span>${escapeHtml(band.label)}</span><strong>${escapeHtml(reedCountLabel(value.label))}</strong></article>`;
    }).join("");
    const reserve = Number(product.package?.reserveCount || 0);
    const commerceNote = product.collection === "noir"
      ? (REED_ADDON_POLICY.noirIncludedText || "У NOIR підібраний комплект паличок уже включено у вартість.")
      : `Запасний комплект ${product.package?.reedDiameterMm || 4} мм можна додати в кошику · ${Number(REED_ADDON_POLICY.price || 50)} грн. Він знадобиться лише тоді, коли перевертання вже не повертає інтенсивність, і поїде разом із дифузором.`;
    host.innerHTML = `
      <h2 class="product-detail-section__title">${escapeHtml(REED_SETUP_POLICY.title)}</h2>
      <p class="product-reed-guide__lead">${escapeHtml(REED_SETUP_POLICY.publicRule)}</p>
      <div class="product-reed-guide__grid">${cards}</div>
      <div class="product-reed-guide__facts">
        <div><span>Перевертання</span><strong>${escapeHtml(reedIntervalLabel(product))}</strong></div>
        <div><span>Заміна</span><strong>Коли перевертання вже не допомагає</strong></div>
        <div><span>Орієнтовний термін</span><strong>${escapeHtml(durationLabel(product))}</strong></div>
      </div>
      <p class="product-reed-guide__note">${escapeHtml(REED_SETUP_POLICY.adjustmentNote)} ${escapeHtml(REED_CARE_POLICY.consumptionNote)}</p>
      <p class="product-reed-guide__placement">${escapeHtml(REED_SETUP_POLICY.placementNote || "Ставте на відкритому місці з легким рухом повітря.")}</p>
      ${reserve ? `<p class="product-reed-guide__extra">У комплекті ${escapeHtml(String(reserve))} ${reserve === 1 ? "паличка залишається" : "палички залишаються"} в запасі для посилення або першої заміни.</p>` : ""}
      <p class="product-reed-guide__commerce">
        <strong>${product.collection === "noir" ? "Вже у вартості" : "Запасний набір для заміни"}</strong>
        <span>${escapeHtml(commerceNote)}</span>
      </p>
      <a class="product-reed-guide__ritual" href="../room-ritual.html?product=${encodeURIComponent(product.id)}">
        <span>ROOM RITUAL</span><strong>Налаштувати аромат під мою кімнату →</strong>
      </a>
      <a class="product-reed-guide__guide-link" href="../guides/yak-korystuvatis-dyfuzorom.html?aroma=${encodeURIComponent(product.id)}#reedFinder">Повний гід по паличках →</a>`;
  }


  function hydrateProductPage() {
    if (typeof PRODUCT_ID === "undefined" || typeof getProduct !== "function") return false;
    const product = getProduct(PRODUCT_ID);
    if (!product) return false;
    const collection = getCollection(product.collection);
    const price = getProductPrice(product);
    const volume = getProductVolume(product);

    setText("breadcrumbCollection", collection?.name);
    const crumb = document.getElementById("breadcrumbCollection");
    if (crumb) crumb.href = `../collections.html#${product.collection}`;
    setText("breadcrumbName", product.name);
    setText("productCollectionLabel", collection?.name);
    setText("productName", product.name);
    const productNameEl = document.getElementById("productName");
    if (productNameEl && product.id === "pure-imagination") {
      productNameEl.replaceChildren(
        Object.assign(document.createElement("span"), { className: "product-title-line", textContent: "Pure" }),
        Object.assign(document.createElement("span"), { className: "product-title-line", textContent: "Imagination" })
      );
    }
    setText("productDesc", product.shortDescription);
    setText("productVolume", volume);
    setText("productPrice", `${Number(price).toLocaleString("uk-UA")} грн`);
    setText("productHeroStart", startLabel(product));
    setText("productHeroDuration", durationLabel(product));
    setText("productHeroPackage", `${product.package?.reedCount || 4} × ${product.package?.reedDiameterMm || 4} мм`);
    document.querySelector(".product-hero__suit-for")?.replaceChildren(document.createTextNode(product.suitFor || ""));

    renderReedSetup(product);

    const gallery = getProductGallery(product);
    if (window.VAHomeGallery) {
      window.VAHomeGallery.mount({ product, items: gallery, root: "../" });
    }
    const badges = document.getElementById("productBadges");
    if (badges) badges.innerHTML = (product.badges || []).map((badge) => `<span class="badge badge--${escapeHtml(badge)}">${badge === "bestseller" ? "Bestseller" : badge === "new" ? "Новинка" : "Limited"}</span>`).join("");

    renderPills("profileTags", product.character, LABELS.character);
    renderPills("roomTags", product.room, LABELS.room);
    renderPills("moodTags", product.mood, LABELS.mood);

    const notes = document.getElementById("notesSection");
    if (notes) notes.innerHTML = `<h2 class="product-detail-section__title">Ноти</h2><p><strong>Верхні:</strong> ${escapeHtml(product.notes.top.join(", "))}</p><p><strong>Серце:</strong> ${escapeHtml(product.notes.heart.join(", "))}</p><p><strong>База:</strong> ${escapeHtml(product.notes.base.join(", "))}</p>`;
    const scales = document.getElementById("scalesSection");
    if (scales) {
      const visibleScaleEntries = getProductScaleEntries().filter(({ key }) => key !== "intensity");
      scales.innerHTML = `<h2 class="product-detail-section__title">Візуальні шкали</h2><div class="scent-scale">${visibleScaleEntries.map(({ key, label }) => `<div class="scent-scale__row"><span>${label}</span><div class="scent-scale__track"><div class="scent-scale__fill" style="width:${Math.max(0,Math.min(10,Number(product.scales[key]) || 0))*10}%"></div></div></div>`).join("")}</div>`;
    }
    const intensity = document.getElementById("intensitySection");
    if (intensity) intensity.innerHTML = `<h2 class="product-detail-section__title">Інтенсивність</h2><p>${product.scales.intensity} / 10</p>`;
    const formula = document.querySelector(".product-formula-proof__intent");
    if (formula) formula.innerHTML = `<strong>Задум композиції.</strong> ${escapeHtml(product.formulaIntent)}`;

    const similarTitleName = document.getElementById("similarSourceName");
    if (similarTitleName) similarTitleName.textContent = product.name;

    const similar = document.getElementById("similarGrid");
    if (similar && window.VAHomeProducts) {
      const recommendations = getSimilarProducts(product);
      similar.innerHTML = recommendations.map((item) => window.VAHomeProducts.renderProductCard(item, "", { context: "product" })).join("");

      const recommendationReason = (source, item) => {
        const sourceChars = new Set(source.character || []);
        const shared = (item.character || []).find((value) => sourceChars.has(value));
        const phrases = {
          fresh: "Свіжіша й повітряніша інтерпретація.",
          clean: "Таке ж чисте, спокійне звучання.",
          molecular: "Споріднений молекулярний характер.",
          woody: "Глибший деревний настрій.",
          warm: "Тепліша, камерніша атмосфера.",
          spa: "Більш мінеральне відчуття SPA.",
          fruity: "М’якший фруктовий акцент."
        };
        if (shared && phrases[shared]) return phrases[shared];
        const delta = (item.scales?.woodiness || 0) - (source.scales?.woodiness || 0);
        if (delta >= 2) return "Глибший, більш деревний характер.";
        if ((item.scales?.freshness || 0) > (source.scales?.freshness || 0)) return "Свіжіша й легша за настроєм.";
        if ((item.scales?.sweetness || 0) > (source.scales?.sweetness || 0)) return "М’якша, тепліша інтерпретація.";
        return "Інший відтінок спорідненої атмосфери.";
      };

      similar.querySelectorAll(".product-card").forEach((card, index) => {
        const body = card.querySelector(".product-card__body");
        const meta = card.querySelector(".product-card__meta");
        const item = recommendations[index];
        if (!body || !item || body.querySelector(".product-card__reason")) return;
        const reason = document.createElement("p");
        reason.className = "product-card__reason";
        reason.textContent = recommendationReason(product, item);
        body.insertBefore(reason, meta || null);
      });
      document.dispatchEvent(new CustomEvent("vahome:products-rendered"));
    }
    // SEO is pre-rendered statically in each product HTML for crawler reliability.
    if (!document.getElementById("productStructuredData")) hydrateSeo(product, collection, price, volume);
    return true;
  }

  function initQtyStepper() {
    const input = document.getElementById("qtyInput");
    const minus = document.getElementById("qtyMinus");
    const plus = document.getElementById("qtyPlus");
    if (!input) return;
    const clamp = (n) => Math.max(1, Math.min(10, n));
    if (minus) {
      minus.addEventListener("click", () => {
        input.value = clamp(parseInt(input.value, 10) - 1 || 1);
      });
    }
    if (plus) {
      plus.addEventListener("click", () => {
        input.value = clamp(parseInt(input.value, 10) + 1 || 1);
      });
    }
    input.addEventListener("change", () => {
      input.value = clamp(parseInt(input.value, 10) || 1);
    });
  }

  function initAddToCart() {
    const btn = document.getElementById("addToCartBtn");
    if (!btn || typeof PRODUCT_ID === "undefined") return;
    btn.addEventListener("click", () => {
      const qtyInput = document.getElementById("qtyInput");
      const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
      const product = typeof getProduct === "function" ? getProduct(PRODUCT_ID) : null;
      const name = product ? product.name : "Товар";

      if (window.Cart && typeof window.Cart.add === "function") {
        window.Cart.add(PRODUCT_ID, qty);
        window.VAAnalytics?.addToCart?.(PRODUCT_ID, qty);
        if (window.VAHome && window.VAHome.showToast) {
          window.VAHome.showToast(`${name} додано в кошик`);
        }
        if (window.Cart.refreshCountBadge) window.Cart.refreshCountBadge();
      } else if (window.VAHome && window.VAHome.showToast) {
        window.VAHome.showToast("Кошик буде доступний найближчим часом");
      }
    });
  }

  function addCurrentProductToCart() {
    if (typeof PRODUCT_ID === "undefined" || !window.Cart) return;
    const qtyInput = document.getElementById("qtyInput");
    window.Cart.add(PRODUCT_ID, qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1);
    window.VAAnalytics?.addToCart?.(PRODUCT_ID, qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1);
    window.Cart.refreshCountBadge?.();
    const product = typeof getProduct === "function" ? getProduct(PRODUCT_ID) : null;
    window.VAHome?.showToast(`${product?.name || "Аромат"} додано в кошик`);
  }

  function initPurchaseSupport() {
    const primaryButton = document.getElementById("addToCartBtn");
    const info = document.querySelector(".product-hero__info");
    if (!primaryButton || !info) return;

    if (info.querySelector(".product-purchase-support")) return;

    const reassurance = document.createElement("div");
    reassurance.className = "product-purchase-support";
    reassurance.innerHTML = `<div><span class="product-support-icon" aria-hidden="true">✓</span><p><strong>Відправка 1–2 дні</strong><span>Товар є в наявності</span></p></div><div><span class="product-support-icon" aria-hidden="true">◇</span><p><strong>Безкоштовно від 1500 грн</strong><span>Доставка Новою поштою</span></p></div><div><span class="product-support-icon" aria-hidden="true">○</span><p><strong>Зручна оплата</strong><span>На рахунок або при отриманні</span></p></div><a href="../delivery.html#returns">Доставка, оплата та повернення →</a>`;
    const hero = document.querySelector(".product-hero");
    if (hero) {
      reassurance.classList.add("product-purchase-support--full");
      hero.insertAdjacentElement("afterend", reassurance);
    } else {
      info.querySelector(".product-primary-actions")?.insertAdjacentElement("afterend", reassurance);
    }

    const discovery = document.createElement("a");
    discovery.className = "product-discovery-link";
    discovery.href = "../discovery-set.html";
    discovery.innerHTML = `<span class="product-discovery-link__eyebrow">Discovery Set</span><span class="product-discovery-link__copy"><strong>Спочатку відчуйте аромат</strong><small>Оберіть 6 із 18 композицій · 150 грн</small></span><span class="product-discovery-link__arrow" aria-hidden="true">→</span>`;
    reassurance.insertAdjacentElement("afterend", discovery);

    const sticky = document.createElement("div");
    sticky.className = "product-mobile-buy";
    const product = typeof getProduct === "function" && typeof PRODUCT_ID !== "undefined" ? getProduct(PRODUCT_ID) : null;
    const price = product && typeof getProductPrice === "function" ? getProductPrice(product) : 0;
    sticky.innerHTML = `<div><span>${product?.name || "VA HOME"}</span><strong>${Number(price).toLocaleString("uk-UA")} грн</strong></div><button type="button">У кошик</button>`;
    sticky.querySelector("button").addEventListener("click", addCurrentProductToCart);
    document.body.appendChild(sticky);

    const observer = new IntersectionObserver(([entry]) => sticky.classList.toggle("is-visible", !entry.isIntersecting), { threshold: .15 });
    observer.observe(primaryButton);
  }

  function initEditorialProductStory() {
    if (typeof PRODUCT_ID === "undefined" || typeof getProduct !== "function") return;
    const product = getProduct(PRODUCT_ID);
    if (!product || !product.scales || !product.images) return;

    const hero = document.querySelector(".product-hero");
    const heroSection = hero?.closest("section");
    const similarSection = document.getElementById("similarGrid")?.closest("section");
    const info = document.querySelector(".product-hero__info");
    if (!hero || !heroSection || !similarSection || !info) return;

    const collection = typeof getCollection === "function" ? getCollection(product.collection) : null;
    const insight = product.insights || {};
    const storyMap = product.images.story || {};
    const storyAsset = (name) => storyMap[name] || "";    const atmosphereStoryImage = storyAsset("atmosphere");
    const interiorStoryImage = storyAsset("interior");
    const macroStoryImage = storyAsset("macro");    const topStoryImage = storyAsset("top");
    const heartStoryImage = storyAsset("heart");
    const baseStoryImage = storyAsset("base");
    const discoveryStoryImage = storyAsset("discovery") || "images/discovery/discovery-set.webp";
    const quote = insight.aura || product.shortDescription || "Аромат, що змінює відчуття простору.";
    const radarEntries = getProductScaleEntries();
    const radarKeys = radarEntries.map(({ key }) => key);
    const radarLabels = radarEntries.map(({ label }) => label);
    const radarValues = radarKeys.map((key) => Math.max(0, Math.min(10, Number(product.scales[key]) || 0)));
    if (radarEntries.length !== 6) return;
    const radarPoint = (value, index, radius = 82) => {
      const angle = (-90 + index * (360 / radarValues.length)) * Math.PI / 180;
      const r = radius * value / 10;
      return `${100 + Math.cos(angle) * r},${100 + Math.sin(angle) * r}`;
    };
    const radarGrid = [2.5, 5, 7.5, 10].map((level) => `<polygon points="${radarValues.map((_, i) => radarPoint(level, i)).join(" ")}"/>`).join("");
    const radarAxes = radarValues.map((_, i) => `<line x1="100" y1="100" x2="${radarPoint(10, i).split(',')[0]}" y2="${radarPoint(10, i).split(',')[1]}"/>`).join("");
    const radarShapePoints = radarValues.map((value, i) => radarPoint(value, i));
    const radarShape = radarShapePoints.join(" ");
    const radarLabelPoint = (index, radius = 108) => {
      const angle = (-90 + index * (360 / radarValues.length)) * Math.PI / 180;
      return { x: 100 + Math.cos(angle) * radius, y: 100 + Math.sin(angle) * radius };
    };
    const radarLabelsSvg = radarLabels.map((label, i) => {
      const point = radarLabelPoint(i);
      const anchor = point.x < 85 ? "end" : point.x > 115 ? "start" : "middle";
      return `<text class="story-dna__axis-label" x="${point.x.toFixed(1)}" y="${point.y.toFixed(1)}" text-anchor="${anchor}"><tspan>${label}</tspan><tspan class="story-dna__axis-value" x="${point.x.toFixed(1)}" dy="11">${radarValues[i]}</tspan></text>`;
    }).join("");
    const radarDots = radarShapePoints.map((point) => {
      const [cx, cy] = point.split(",");
      return `<circle class="story-dna__point" cx="${cx}" cy="${cy}" r="2.6"/>`;
    }).join("");
    const levelName = (value) => value <= 3 ? "Низька" : value <= 6 ? "Середня" : "Висока";
    const radarLegend = radarLabels.map((label, i) => `<li><span>${label}</span><i aria-hidden="true"><b style="--dna-level:${radarValues[i]}"></b></i><strong>${levelName(radarValues[i])}</strong></li>`).join("");
    const characterWords = LABELS.scaleCharacterWords || {};
    const character = radarKeys
      .map((key, i) => ({ key, value: radarValues[i], order: i }))
      .sort((a, b) => b.value - a.value || a.order - b.order)
      .slice(0, 3)
      .map((item) => characterWords[item.key] || String(LABELS.scales?.[item.key] || item.key).toLowerCase())
      .join(" · ");
    const radarAria = radarEntries.map(({ label }, index) => `${label}: ${radarValues[index]} з 10`).join(", ");

    const existingFormula = document.querySelector(".product-formula-proof");
    const formulaIntent = existingFormula?.querySelector(".product-formula-proof__intent")?.innerHTML || `<strong>Задум композиції.</strong> ${escapeHtml(product.formulaIntent || product.shortDescription)}`;
    const startRange = (String(product.quickFacts || "3–4 палички").match(/\d+(?:\s*[–-]\s*\d+)?/) || ["3–4"])[0]
      .replace(/\s/g, "")
      .replace("-", "–");
    const reedDiameter = Number(product.package?.reedDiameterMm || 4);
    const reedCount = Number(product.package?.reedCount || 4);
    const reserveCount = Number(product.package?.reserveCount || 0);
    const reedPackageLabel = reedCount === 1
      ? "1 чорна паличка"
      : reedCount >= 5
        ? `${reedCount} чорних паличок`
        : `${reedCount} чорні палички`;
    const reserveCopy = reserveCount > 0
      ? `Ще ${reserveCount} ${reserveCount === 1 ? "паличка залишається" : "палички залишаються"} в запасі для посилення або першої заміни.`
      : "Змінюйте інтенсивність лише на одну паличку за раз.";
    const ritualCare = product.reedCare?.publicText || "Перевертайте палички, коли звучання стало тихішим.";
    const ritualReplacement = product.reedCare?.replacementText || "Замініть палички, коли перевертання вже не повертає звучання.";
    const durationNote = product.duration?.note || "Термін залежить від температури, вентиляції та кількості паличок.";

    info.querySelectorAll(".product-detail-section, .product-formula-proof, .product-accordion").forEach((node) => node.remove());
    document.querySelector(".product-substance")?.remove();
    document.querySelector(".product-experience")?.remove();
    document.querySelector(".product-discovery-link")?.remove();
    document.querySelector(".product-editorial-story")?.remove();

    const story = document.createElement("div");
    story.className = "product-editorial-story product-story-v10";
    story.innerHTML = `
      <section class="story-cinema" aria-labelledby="storyQuoteTitle">
        <img src="../${atmosphereStoryImage}" alt="${escapeHtml(product.name)} в інтер’єрі" loading="lazy" decoding="async" onerror="this.onerror=null;this.closest('section,figure,article')?.classList.add('story-media-missing');this.remove()">
        <div class="story-cinema__shade"></div>
        <div class="container story-cinema__copy">
          <p class="eyebrow">Відчуття у просторі</p>
          <h2 id="storyQuoteTitle">${escapeHtml(quote)}</h2>
          <span>VA HOME</span>
        </div>
      </section>

      <section class="story-composition">
        <div class="story-composition__copy">
          <p class="eyebrow">Формула VA HOME</p>
          <h2>Від композиції<br>до простору</h2>
          <p>${formulaIntent}</p>
          <a href="../scent-guide.html">Дізнатися більше про аромат →</a>
        </div>
        <figure class="story-composition__macro">
          <img src="../${macroStoryImage}" alt="Деталь флакону ${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.closest('section,figure,article')?.classList.add('story-media-missing');this.remove()">
        </figure>
        <div class="story-dna">
          <p class="eyebrow">DNA аромату</p>
          <div class="story-dna__radar" role="img" aria-label="Профіль аромату ${escapeHtml(product.name)}. ${escapeHtml(radarAria)}">
            <svg viewBox="-42 -42 284 284" aria-hidden="true"><g class="story-dna__grid">${radarGrid}${radarAxes}</g><polygon class="story-dna__shape" points="${radarShape}"/>${radarDots}${radarLabelsSvg}</svg>
          </div>
          <div class="story-dna__character"><span>Характер</span><strong>${character}</strong></div>
          <ul class="story-dna__legend">${radarLegend}</ul>
        </div>
      </section>

      <section class="story-notes" aria-labelledby="storyNotesTitle">
        <div class="story-notes__label"><p class="eyebrow">Ноти аромату</p><h2 id="storyNotesTitle">Три фази звучання</h2></div>
        <div class="story-notes__grid">
          <article>
            <img src="../${topStoryImage}" alt="Верхні ноти ${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.closest('article')?.classList.add('story-media-missing');this.remove()">
            <div><span>Верхні ноти</span><h3>${escapeHtml(product.notes.top.join(", "))}</h3><p>перший дотик</p></div>
          </article>
          <article>
            <img src="../${heartStoryImage}" alt="Серце аромату ${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.closest('section,figure,article')?.classList.add('story-media-missing');this.remove()">
            <div><span>Серце</span><h3>${escapeHtml(product.notes.heart.join(", "))}</h3><p>через кілька хвилин</p></div>
          </article>
          <article>
            <img src="../${baseStoryImage}" alt="База аромату ${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.closest('article')?.classList.add('story-media-missing');this.remove()">
            <div><span>База</span><h3>${escapeHtml(product.notes.base.join(", "))}</h3><p>довгий післясмак</p></div>
          </article>
        </div>
      </section>

      <section class="story-ritual story-ritual--render">
        <div class="story-ritual__header"><p class="eyebrow">Ритуал використання</p></div>
        <div class="story-ritual__bar">
          <article>
            <div class="story-ritual__icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M18 10h12M20 10V5h8v5M17 16h14v24H17zM20 21h8"/></svg></div>
            <div><span>01</span><h3>Відкрийте флакон</h3><p>Зніміть захисну кришку.</p></div>
          </article>
          <article>
            <div class="story-ritual__icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M17 38h14M19 24h10l2 14H17zM21 24 15 5M24 24V4M27 24 34 6"/></svg></div>
            <div><span>02</span><h3>Почніть із ${startRange} паличок ${reedDiameter} мм</h3><p>${escapeHtml(reserveCopy)}</p></div>
          </article>
          <article>
            <div class="story-ritual__icon" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><path d="M24 13v12l8 5"/></svg></div>
            <div><span>03</span><h3>Підтримуйте звучання</h3><p>${escapeHtml(ritualCare)}</p></div>
          </article>
          <figure><img src="../${interiorStoryImage}" alt="${escapeHtml(product.name)} у просторі" loading="lazy" decoding="async" onerror="this.onerror=null;this.closest('figure')?.classList.add('story-media-missing');this.remove()"></figure>
        </div>
        <div class="container"><details class="story-ritual__details"><summary><span class="story-ritual__summary-copy"><strong>Комплектація та безпечне використання</strong><small>Натисніть, щоб переглянути деталі</small></span><span class="story-ritual__summary-icon" aria-hidden="true"></span></summary><div>
          <p><strong>Комплектація:</strong> флакон 100 мл і ${escapeHtml(reedPackageLabel)} ${reedDiameter} мм.</p>
          <p><strong>Старт:</strong> ${escapeHtml(product.quickFacts || `${startRange} палички`)}. ${escapeHtml(reserveCopy)}</p>
          <p><strong>Догляд:</strong> ${escapeHtml(ritualCare)} ${escapeHtml(ritualReplacement)}</p>
          <p><strong>Перший запуск:</strong> після встановлення паличок дайте композиції 24–48 годин.</p>
          <p><strong>Тривалість:</strong> ${escapeHtml(durationLabel(product))}. ${escapeHtml(durationNote)}</p>
          <p>Не ковтати. Уникайте контакту рідини зі шкірою, очима, меблями та текстилем. Тримайте подалі від дітей, домашніх тварин, вогню й джерел тепла.</p>
        </div></details></div>
      </section>

      <section class="story-discovery">
        <div class="container story-discovery__inner">
          <div><p class="eyebrow">Не можете обрати один?</p><h2>Спробуйте Discovery Set</h2><p>6 композицій по 5 мл для знайомства з колекцією.</p><a class="btn btn-outline" href="../discovery-set.html">Дізнатися більше</a></div>
          <img src="../${discoveryStoryImage}" alt="Discovery Set ${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.closest('section,figure,article')?.classList.add('story-media-missing');this.remove()">
        </div>
      </section>`;

    heroSection.insertAdjacentElement("afterend", story);
    similarSection.classList.add("story-similar");
    document.body.classList.add("has-editorial-product-story", "has-product-story-v10");
  }document.addEventListener("DOMContentLoaded", () => {
    hydrateProductPage();
    initQtyStepper();
    initAddToCart();
    initPurchaseSupport();
    initEditorialProductStory();
  });
})();
