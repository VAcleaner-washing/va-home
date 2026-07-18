/* ==========================================================================
   VA HOME — product.js
   Product page CONTENT (name, price, notes, scales, tags, similar aromas)
   is pre-rendered as static HTML directly in each products/*.html file —
   this keeps it crawlable without executing JS. This script only wires up
   the interactive bits: the quantity stepper and "Додати в кошик".
   ========================================================================== */

(function () {
  "use strict";

  const PRODUCT_INSIGHTS = {
    "signature-relax": { aura: "М’яка чайна атмосфера", season: "Універсальний", zones: "Спальня · зона відпочинку · кабінет", comfort: "Дуже комфортний для щоденного використання", evolution: "Спочатку — мандарин і лимон. За кілька днів аромат стає теплішим, а білий чай формує спокійну шовкову ауру." },
    "forbidden-fruit": { aura: "Темна соковита вишня", season: "Осінь · зима", zones: "Спальня · lounge · beauty-zone", comfort: "Виразний вечірній характер", evolution: "Стартує соковитою вишнею з лікерним акцентом, а з часом стає глибшим, теплішим і менш солодким." },
    "doux-moment": { aura: "Тепла вершкова атмосфера", season: "Осінь · зима", zones: "Вітальня · їдальня · затишна зона", comfort: "М’який домашній gourmand", evolution: "Груша й яблуко відкривають аромат, після чого вершки, карамель і праліне створюють відчуття дорогого домашнього спокою." },
    "wild-berry-way": { aura: "Свіже ягідне повітря", season: "Весна · літо", zones: "Тераса · балкон · ванна кімната", comfort: "Легкий і ненав’язливий", evolution: "Ожина й лавр звучать свіжо на старті; за кілька днів проявляються грейпфрут, кедр і чиста деревна повітряність." },
    "hotel-spring": { aura: "Світла весняна clean-атмосфера", season: "Березень · червень", zones: "Світлі кімнати · хол · вітальня", comfort: "Легкий сезонний характер", evolution: "Дзвінкий юзу та світлі квіти поступово стають м’якшими й формують атмосферу весняного boutique hotel." },
    "evening-ritual": { aura: "Темна квіткова атмосфера", season: "Осінь · вечір цілий рік", zones: "Спальня · lounge · зона відпочинку", comfort: "Найкраще розкривається ввечері", evolution: "Повітряні квіти й озон на старті переходять у темнішу кашемірову композицію з пачулі, мускусом та амброю." },
    "velvet-spa": { aura: "Оксамитова SPA-хмара", season: "Осінь · зима", zones: "Ванна кімната · SPA · спальня", comfort: "Теплий огортальний профіль", evolution: "Кокосове молоко й бензоїн поступово зливаються із сандалом та кедром у м’яку атмосферу домашнього SPA." },
    "pure-zen": { aura: "Тиха медитативна атмосфера", season: "Весна · універсальний", zones: "Спальня · SPA · зона медитації", comfort: "Один із найтихіших ароматів лінійки", evolution: "Білий чай, цитрус і кардамон стають спокійнішими, відкриваючи лотос, сандал і м’яку мигдальну глибину." },
    "hotel-luxe": { aura: "Об’ємна готельна чистота", season: "Універсальний", zones: "Хол · великі простори · гардероб", comfort: "Чистий профіль без відчуття стерильності", evolution: "Озон, льон і свіже повітря поступово набувають теплої текстури — так формується ефект дорогого готелю." },
    "old-money": { aura: "Глибока dark luxury-атмосфера", season: "Осінь · зима", zones: "Кабінет · темний інтер’єр · представницький простір", comfort: "Камерний, стриманий характер", evolution: "Суха шкіра й бергамот відкривають композицію; пізніше тютюн, лабданум та амбра створюють теплу кашемірову глибину." },
    "linstinct": { aura: "Впевнена деревно-пряна атмосфера", season: "Універсальний · холодний сезон", zones: "Кабінет · showroom · передпокій", comfort: "Виразний характер для просторих зон", evolution: "Бергамот і перець звучать енергійно, а з часом кедр, ветивер і лабданум формують суху деревну основу." },
    "mineral-salt": { aura: "Повітряна мінеральна SPA-атмосфера", season: "Весна · літо · універсальний", zones: "Ванна · спальня · SPA · гардероб", comfort: "Свіжий профіль для тривалого використання", evolution: "Морська сіль, шавлія та грейпфрут створюють свіжий старт; пізніше аромат стає глибшим і шовковистішим." },
    "pure-imagination": { aura: "Об’ємний кришталевий luxury-шлейф", season: "Універсальний", zones: "Вітальня · open-space · lobby · кабінет", comfort: "Найкраще для великого простору", evolution: "Повітряний цитрус дає швидкий room bloom, а троянда, жасмин, сандал і пачулі поступово додають теплу глибину." },
    "silk-molecule": { aura: "М’яка шовкова аура", season: "Осінь · зима", zones: "Спальня · гардероб · особистий простір", comfort: "Камерна texture-атмосфера", evolution: "Шафран і легкі спеції переходять у кашемірово-мускусну хмару з фіалкою, сандалом та м’якою ваніллю." },
    "the-archive": { aura: "Суха інтелектуальна атмосфера", season: "Осінь · зима", zones: "Бібліотека · кабінет · приватний lounge", comfort: "Нішевий камерний профіль", evolution: "Копал, кедр і прохолодна камфора поступово теплішають, створюючи атмосферу тихої приватної бібліотеки." },
    "silent-temple": { aura: "Тиха японська temple-атмосфера", season: "Весна · осінь · універсальний", zones: "Кабінет · SPA · спальня · медитація", comfort: "Найспокійніший характер NOIR", evolution: "Евкаліпт, озон і білий чай відкривають композицію; кипарис, сосна й кедр залишають чисту деревну тишу." },
    "moss-and-shadow": { aura: "Темна мохова luxury-атмосфера", season: "Осінь · зима", zones: "Кабінет · бібліотека · темний lounge", comfort: "Нішевий природний профіль", evolution: "Шавлія та цитруси поступаються лаванді, дубовому моху й амбрі — ніби повітря після дощу в старому лісі." },
    "dark-bloom": { aura: "Темна квітково-смоляна атмосфера", season: "Осінь · зима · вечір", zones: "Спальня · lounge · темний інтер’єр", comfort: "Виразний вечірній профіль", evolution: "Рожевий перець і слива відкривають композицію; чорна троянда, пачулі та лабданум поступово створюють темну оксамитову ауру." }
  };

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

    const reassurance = document.createElement("div");
    reassurance.className = "product-purchase-support";
    reassurance.innerHTML = `<div><strong>В наявності</strong><span>Відправка 1–2 робочі дні</span></div><div><strong>Нова пошта</strong><span>Безкоштовно від 2000 грн</span></div><div><strong>Зручна оплата</strong><span>На рахунок або при отриманні</span></div><a href="../delivery.html#returns">Умови доставки й повернення</a>`;
    primaryButton.closest(".product-purchase-row")?.insertAdjacentElement("afterend", reassurance);

    const facts = document.createElement("div");
    facts.className = "product-buy-facts";
    facts.setAttribute("aria-label", "Коротко про використання");
    facts.innerHTML = `<span><strong>100 мл</strong> об’єм</span><span><strong>3–4 палички</strong> рекомендований старт</span><span><strong>Регульована</strong> інтенсивність</span>`;
    reassurance.insertAdjacentElement("beforebegin", facts);

    const discovery = document.createElement("a");
    discovery.className = "product-discovery-link";
    discovery.href = "../discovery-set.html";
    discovery.innerHTML = `<span>Не впевнені у виборі?</span><strong>Спробувати Discovery Set →</strong>`;
    reassurance.insertAdjacentElement("afterend", discovery);

    const sticky = document.createElement("div");
    sticky.className = "product-mobile-buy";
    const product = typeof getProduct === "function" && typeof PRODUCT_ID !== "undefined" ? getProduct(PRODUCT_ID) : null;
    const price = product && typeof getProductPrice === "function" ? getProductPrice(product) : 0;
    sticky.innerHTML = `<div><span>${product?.name || "VA HOME"}</span><strong>${Number(price).toLocaleString("uk-UA")} грн</strong></div><button type="button">Додати в кошик</button>`;
    sticky.querySelector("button").addEventListener("click", addCurrentProductToCart);
    document.body.appendChild(sticky);

    let primaryVisible = true;
    let footerVisible = false;
    const updateSticky = () => {
      const visible = !primaryVisible && !footerVisible;
      sticky.classList.toggle("is-visible", visible);
      document.body.classList.toggle("product-buybar-visible", visible);
    };
    const primaryObserver = new IntersectionObserver(([entry]) => {
      primaryVisible = entry.isIntersecting;
      updateSticky();
    }, { threshold: .15 });
    primaryObserver.observe(primaryButton);

    const footerTarget = document.getElementById("site-footer");
    if (footerTarget) {
      const footerObserver = new IntersectionObserver(([entry]) => {
        footerVisible = entry.isIntersecting;
        updateSticky();
      }, { threshold: 0 });
      footerObserver.observe(footerTarget);
    }
  }

  function initProductExperience() {
    if (typeof PRODUCT_ID === "undefined" || typeof getProduct !== "function") return;
    const product = getProduct(PRODUCT_ID);
    if (!product || !product.scales || !product.images || !product.images.main) return;
    const similarSection = document.getElementById("similarGrid")?.closest("section");
    if (!similarSection) return;

    const scaleLabels = {
      freshness: "Свіжість",
      sweetness: "Солодкість",
      woodiness: "Деревність",
      cleanliness: "Чистота",
      intensity: "Інтенсивність"
    };
    const collection = typeof getCollection === "function" ? getCollection(product.collection) : null;
    const insight = PRODUCT_INSIGHTS[product.id] || {};
    const atmosphereImage = product.images.atmosphere || `images/atmosphere/${product.id}.webp`;
    const atmosphereFallback = (collection && collection.heroImage) || product.images.main;
    const scaleRows = Object.entries(scaleLabels).map(([key, label]) => {
      const value = Math.max(0, Math.min(10, Number(product.scales[key]) || 0));
      return `<div class="product-dna__row"><div class="product-dna__label"><span>${label}</span><strong>${value}/10</strong></div><div class="product-dna__track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${value}"><span style="--dna-value:${value * 10}%"></span></div></div>`;
    }).join("");

    const section = document.createElement("section");
    section.className = "section product-experience";
    section.innerHTML = `<div class="container"><div class="product-experience__head"><p class="eyebrow">Відчуття у просторі</p><h2>Як виглядає аромат</h2></div><div class="product-experience__grid"><figure class="product-atmosphere"><img src="../${atmosphereImage}" data-dna-photo="${product.id}" alt="Атмосфера аромату ${product.name}" loading="lazy" onerror="this.onerror=null;this.src='../${atmosphereFallback}'"><figcaption><span>${product.name}</span><p>${insight.aura || product.shortDescription}</p><small>${insight.zones ? `Найкраще: ${insight.zones}` : (collection ? collection.tagline : "")}</small></figcaption></figure><div class="product-dna"><div class="product-dna__heading"><p class="eyebrow">Scent profile</p><h3>DNA аромату</h3><p>${insight.evolution || "Характер композиції у п’яти зрозумілих вимірах."}</p></div><div class="product-dna__scales">${scaleRows}</div><div class="product-dna__facts">${insight.season ? `<div><span>Сезон</span><strong>${insight.season}</strong></div>` : ""}${insight.comfort ? `<div><span>Комфорт</span><strong>${insight.comfort}</strong></div>` : ""}</div></div></div></div>`;
    similarSection.parentNode.insertBefore(section, similarSection);

    document.getElementById("scalesSection")?.remove();
    document.getElementById("intensitySection")?.remove();
    document.querySelectorAll(".product-hero__info .product-detail-section").forEach((detail) => {
      const title = detail.querySelector(".product-detail-section__title")?.textContent.trim();
      if (["Для якої кімнати", "Яку атмосферу створює"].includes(title)) detail.remove();
    });
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
    const media = document.querySelector(".product-hero__media");
    const info = document.querySelector(".product-hero__info");
    const proof = document.querySelector(".product-formula-proof");
    const accordion = document.querySelector(".product-accordion");
    if (!hero || !media || !info || !proof || !accordion || hero.classList.contains("has-inline-substance")) return;

    const visualStack = document.createElement("div");
    visualStack.className = "product-hero__visual-stack";
    hero.insertBefore(visualStack, media);
    visualStack.append(media, proof);
    info.appendChild(accordion);
    hero.classList.add("has-inline-substance");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initQtyStepper();
    initAddToCart();
    initPurchaseSupport();
    initProductExperience();
    initCompactDetails();
    initProductSubstanceLayout();
  });
})();
