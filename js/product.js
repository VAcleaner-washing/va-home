/* ==========================================================================
   VA HOME — product.js
   Product page CONTENT (name, price, notes, scales, tags, similar aromas)
   is pre-rendered as static HTML directly in each products/*.html file —
   this keeps it crawlable without executing JS. This script only wires up
   the interactive bits: the quantity stepper and "Додати в кошик".
   ========================================================================== */

(function () {
  "use strict";


  const LABELS = {
    character: { clean: "Чисті", fresh: "Свіжі", fruity: "Фруктові", warm: "Теплі", woody: "Деревні", spa: "Спа", molecular: "Молекулярні" },
    room: { "living-room": "Вітальня", bedroom: "Спальня", bathroom: "Ванна", office: "Кабінет", hallway: "Передпокій", wardrobe: "Гардероб" },
    mood: { calm: "Спокій", "warm-evening": "Теплий вечір", "warm-sweet": "Тепла солодкість", clean: "Чистота", focus: "Фокус" },
    scales: { freshness: "Свіжість", sweetness: "Солодкість", woodiness: "Деревність", cleanliness: "Чистота" }
  };

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
    if (!normalized.length && product?.images?.main) {
      normalized.push({ type: "hero", label: "Hero", src: product.images.main });
    }
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
      additionalProperty: [{ "@type": "PropertyValue", name: "Об’єм", value: volume }, { "@type": "PropertyValue", name: "Інтенсивність", value: `${product.scales.intensity} з 10` }]
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
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
    document.querySelector(".product-hero__quickfacts")?.replaceChildren(document.createTextNode(product.quickFacts || "3–4 палички для старту"));
    document.querySelector(".product-hero__suit-for")?.replaceChildren(document.createTextNode(product.suitFor || ""));

    const gallery = getProductGallery(product);
    if (window.VAHomeGallery) {
      window.VAHomeGallery.mount({ product, items: gallery, root: "../", fallbackSrc: `../${product.images?.main || ""}` });
    }
    const badges = document.getElementById("productBadges");
    if (badges) badges.innerHTML = (product.badges || []).map((badge) => `<span class="badge badge--${escapeHtml(badge)}">${badge === "bestseller" ? "Bestseller" : badge === "new" ? "Новинка" : "Limited"}</span>`).join("");

    renderPills("profileTags", product.character, LABELS.character);
    renderPills("roomTags", product.room, LABELS.room);
    renderPills("moodTags", product.mood, LABELS.mood);

    const notes = document.getElementById("notesSection");
    if (notes) notes.innerHTML = `<h2 class="product-detail-section__title">Ноти</h2><p><strong>Верхні:</strong> ${escapeHtml(product.notes.top.join(", "))}</p><p><strong>Серце:</strong> ${escapeHtml(product.notes.heart.join(", "))}</p><p><strong>База:</strong> ${escapeHtml(product.notes.base.join(", "))}</p>`;
    const scales = document.getElementById("scalesSection");
    if (scales) scales.innerHTML = `<h2 class="product-detail-section__title">Візуальні шкали</h2><div class="scent-scale">${Object.entries(LABELS.scales).map(([key,label]) => `<div class="scent-scale__row"><span>${label}</span><div class="scent-scale__track"><div class="scent-scale__fill" style="width:${Math.max(0,Math.min(10,product.scales[key]))*10}%"></div></div></div>`).join("")}</div>`;
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
    reassurance.innerHTML = `<div><span class="product-support-icon" aria-hidden="true">✓</span><p><strong>Відправка 1–2 дні</strong><span>Товар є в наявності</span></p></div><div><span class="product-support-icon" aria-hidden="true">◇</span><p><strong>Безкоштовно від 2000 грн</strong><span>Доставка Новою поштою</span></p></div><div><span class="product-support-icon" aria-hidden="true">○</span><p><strong>Зручна оплата</strong><span>На рахунок або при отриманні</span></p></div><a href="../delivery.html#returns">Доставка, оплата та повернення →</a>`;
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
    const atmosphereImage = product.images.atmosphere || `images/atmosphere/${product.id}.webp`;
    const atmosphereFallback = (collection && collection.heroImage) || product.images.main;
    const galleryItems = getProductGallery(product);
    const byType = (type, fallback) => galleryItems.find((item) => item.type === type)?.src || fallback;
    const storyBase = `images/product-story/${product.id}`;
    const storyAsset = (name) => `${storyBase}/${name}.webp`;
    const interiorFallback = byType("interior", atmosphereImage);
    const macroFallback = byType("macro", product.images.main);
    const detailFallback = byType("detail", interiorFallback);
    const heroStoryImage = storyAsset("hero");
    const atmosphereStoryImage = storyAsset("atmosphere");
    const interiorStoryImage = storyAsset("interior");
    const macroStoryImage = storyAsset("macro");
    const detailStoryImage = storyAsset("detail");
    const topStoryImage = storyAsset("top");
    const heartStoryImage = storyAsset("heart");
    const baseStoryImage = storyAsset("base");
    const discoveryStoryImage = storyAsset("discovery");
    const quote = insight.aura || product.shortDescription || "Аромат, що змінює відчуття простору.";
    const labels = {
      freshness: "Свіжість",
      sweetness: "Солодкість",
      woodiness: "Деревність",
      cleanliness: "Чистота",
      intensity: "Інтенсивність"
    };
    const radarKeys = ["freshness", "sweetness", "woodiness", "cleanliness", "intensity"];
    const radarLabels = ["Свіжість", "Солодкість", "Деревність", "Чистота", "Інтенсивність"];
    const radarValues = radarKeys.map((key) => Math.max(0, Math.min(10, Number(product.scales[key]) || 0)));
    const radarPoint = (value, index, radius = 82) => {
      const angle = (-90 + index * (360 / radarValues.length)) * Math.PI / 180;
      const r = radius * value / 10;
      return `${100 + Math.cos(angle) * r},${100 + Math.sin(angle) * r}`;
    };
    const radarGrid = [2.5, 5, 7.5, 10].map((level) => `<polygon points="${radarValues.map((_, i) => radarPoint(level, i)).join(" ")}"/>`).join("");
    const radarAxes = radarValues.map((_, i) => `<line x1="100" y1="100" x2="${radarPoint(10, i).split(',')[0]}" y2="${radarPoint(10, i).split(',')[1]}"/>`).join("");
    const radarShapePoints = radarValues.map((value, i) => radarPoint(value, i));
    const radarShape = radarShapePoints.join(" ");
    const radarLabelPoint = (index, radius = 103) => {
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
    const characterWords = {
      freshness: "свіжий",
      sweetness: "м’який",
      woodiness: "деревний",
      cleanliness: "чистий",
      intensity: "виразний"
    };
    const character = radarKeys
      .map((key, i) => ({ key, value: radarValues[i] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((item) => characterWords[item.key])
      .join(" · ");

    const existingFormula = document.querySelector(".product-formula-proof");
    const formulaIntent = existingFormula?.querySelector(".product-formula-proof__intent")?.innerHTML || `<strong>Задум композиції.</strong> ${escapeHtml(product.formulaIntent || product.shortDescription)}`;

    info.querySelectorAll(".product-detail-section, .product-formula-proof, .product-accordion").forEach((node) => node.remove());
    document.querySelector(".product-substance")?.remove();
    document.querySelector(".product-experience")?.remove();
    document.querySelector(".product-discovery-link")?.remove();
    document.querySelector(".product-editorial-story")?.remove();

    const story = document.createElement("div");
    story.className = "product-editorial-story product-story-v10";
    story.innerHTML = `
      <section class="story-cinema" aria-labelledby="storyQuoteTitle">
        <img src="../${atmosphereStoryImage}" alt="${escapeHtml(product.name)} в інтер’єрі" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='../${atmosphereImage}';this.onerror=()=>{this.onerror=null;this.closest('section,figure,article')?.classList.add('story-media-missing');this.remove()}">
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
          <img src="../${macroStoryImage}" alt="Деталь флакону ${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='../${macroFallback}';this.onerror=()=>{this.onerror=null;this.closest('section,figure,article')?.classList.add('story-media-missing');this.remove()}">
        </figure>
        <div class="story-dna">
          <p class="eyebrow">DNA аромату</p>
          <div class="story-dna__radar" role="img" aria-label="Радарний профіль аромату">
            <svg viewBox="-18 -18 236 236" aria-hidden="true"><g class="story-dna__grid">${radarGrid}${radarAxes}</g><polygon class="story-dna__shape" points="${radarShape}"/>${radarDots}${radarLabelsSvg}</svg>
          </div>
          <div class="story-dna__character"><span>Характер</span><strong>${character}</strong></div>
          <ul class="story-dna__legend">${radarLegend}</ul>
        </div>
      </section>

      <section class="story-notes" aria-labelledby="storyNotesTitle">
        <div class="story-notes__label"><p class="eyebrow">Ноти аромату</p><h2 id="storyNotesTitle">Три фази звучання</h2></div>
        <div class="story-notes__grid">
          <article>
            <img src="../${topStoryImage}" alt="Верхні ноти ${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='../${interiorFallback}';this.onerror=()=>{this.onerror=null;this.closest('article')?.classList.add('story-media-missing');this.remove()}">
            <div><span>Верхні ноти</span><h3>${escapeHtml(product.notes.top.join(", "))}</h3><p>перший дотик</p></div>
          </article>
          <article>
            <img src="../${heartStoryImage}" alt="Серце аромату ${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='../${macroFallback}';this.onerror=()=>{this.onerror=null;this.closest('section,figure,article')?.classList.add('story-media-missing');this.remove()}">
            <div><span>Серце</span><h3>${escapeHtml(product.notes.heart.join(", "))}</h3><p>через кілька хвилин</p></div>
          </article>
          <article>
            <img src="../${baseStoryImage}" alt="База аромату ${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='../${detailFallback}';this.onerror=()=>{this.onerror=null;this.closest('article')?.classList.add('story-media-missing');this.remove()}">
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
            <div><span>02</span><h3>Додайте 3–4 палички</h3><p>Регулюйте кількість під бажану інтенсивність.</p></div>
          </article>
          <article>
            <div class="story-ritual__icon" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><path d="M24 13v12l8 5"/></svg></div>
            <div><span>03</span><h3>Дайте аромату час</h3><p>Через 24–48 годин композиція розкриється.</p></div>
          </article>
          <figure><img src="../${interiorStoryImage}" alt="${escapeHtml(product.name)} у просторі" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='../${interiorFallback}';this.onerror=()=>{this.onerror=null;this.src='../${atmosphereImage}'}"></figure>
        </div>
        <div class="container"><details class="story-ritual__details"><summary>Комплектація та безпечне використання</summary><div><p><strong>У комплекті:</strong> флакон 100 мл і 4 чорні палички.</p><p><strong>Тривалість:</strong> орієнтовно 8–12 тижнів.</p><p>Не ковтати. Уникайте контакту рідини зі шкірою, очима, меблями та текстилем. Тримайте подалі від дітей, домашніх тварин, вогню й джерел тепла.</p></div></details></div>
      </section>

      <section class="story-discovery">
        <div class="container story-discovery__inner">
          <div><p class="eyebrow">Не можете обрати один?</p><h2>Спробуйте Discovery Set</h2><p>6 композицій по 5 мл для знайомства з колекцією.</p><a class="btn btn-outline" href="../discovery-set.html">Дізнатися більше</a></div>
          <img src="../${discoveryStoryImage}" alt="Discovery Set ${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='../images/discovery/discovery-set.webp'">
        </div>
      </section>`;

    heroSection.insertAdjacentElement("afterend", story);
    similarSection.classList.add("story-similar");
    document.body.classList.add("has-editorial-product-story", "has-product-story-v10");
  }

  function initCompactDetails() {
    const info = document.querySelector(".product-hero__info");
    if (!info) return;
    const sections = Array.from(info.children).filter((el) => el.classList && el.classList.contains("product-detail-section"));
    if (sections.length < 3) return;

    const byTitle = new Map();
    sections.forEach((section) => {
      const title = section.querySelector(".product-detail-section__title");
      if (title) byTitle.set(title.textContent.trim(), section);
    });

    ["Ароматичний профіль", "Ноти"].forEach((title) => {
      const section = byTitle.get(title);
      if (section) section.classList.add("product-detail-section--compact");
    });

    const groups = [
      { label: "Характер та інтенсивність", titles: ["Візуальні шкали", "Інтенсивність"] },
      { label: "Для якого простору", titles: ["Для якої кімнати", "Яку атмосферу створює"] },
      { label: "Комплектація та використання", titles: ["Комплектація та використання"] },
      { label: "Безпечне використання", titles: ["Безпечне використання"] }
    ];

    const accordion = document.createElement("div");
    accordion.className = "product-accordion";
    groups.forEach((group) => {
      const sources = group.titles.map((title) => byTitle.get(title)).filter((section) => section && !section.hidden);
      if (!sources.length) return;
      const details = document.createElement("details");
      details.className = "product-accordion__item";
      const summary = document.createElement("summary");
      summary.textContent = group.label;
      const content = document.createElement("div");
      content.className = "product-accordion__content";

      sources.forEach((section) => {
        const title = section.querySelector(".product-detail-section__title");
        if (sources.length > 1 && title) {
          const subheading = document.createElement("h3");
          subheading.className = "product-accordion__subheading";
          subheading.textContent = title.textContent.trim();
          content.appendChild(subheading);
        }
        Array.from(section.children).forEach((child) => {
          if (child !== title) content.appendChild(child);
        });
        section.remove();
      });

      details.append(summary, content);
      accordion.appendChild(details);
    });

    const notes = byTitle.get("Ноти");
    const accordionAnchor = document.querySelector(".product-formula-proof") || notes;
    if (accordionAnchor && accordion.children.length) accordionAnchor.insertAdjacentElement("afterend", accordion);
    info.classList.add("is-compact");

    accordion.querySelectorAll("details").forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        accordion.querySelectorAll("details[open]").forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  function initProductSubstanceLayout() {
    const hero = document.querySelector(".product-hero");
    const gallery = document.querySelector(".product-gallery");
    const proof = document.querySelector(".product-formula-proof");
    const accordion = document.querySelector(".product-accordion");
    if (!hero || !gallery || !proof || !accordion || hero.classList.contains("has-premium-substance")) return;

    // Keep the purchase hero visually balanced: image and buying information only.
    // Deeper product information becomes a full-width editorial block below it,
    // preventing either column from creating a large empty vertical area.
    const visualStack = document.createElement("div");
    visualStack.className = "product-hero__visual-stack";
    hero.insertBefore(visualStack, gallery);
    visualStack.appendChild(gallery);

    const substance = document.createElement("div");
    substance.className = "product-substance";
    substance.setAttribute("aria-label", "Детальна інформація про аромат");
    substance.append(proof, accordion);
    hero.insertAdjacentElement("afterend", substance);

    hero.classList.add("has-premium-substance");
  }


  document.addEventListener("DOMContentLoaded", () => {
    hydrateProductPage();
    initQtyStepper();
    initAddToCart();
    initPurchaseSupport();
    initEditorialProductStory();
  });
})();
