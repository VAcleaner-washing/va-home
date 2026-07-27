import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const content = JSON.parse(fs.readFileSync(path.join(root, "data", "product-content.json"), "utf8"));
const products = new Map(content.products.map((product) => [product.id, product]));
const collections = new Map(content.collections.map((collection) => [collection.id, collection]));
const labels = content.labels;
const reedCarePolicy = content.reedCarePolicy;
const reedSetupPolicy = content.reedSetupPolicy;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const replaceRequired = (source, pattern, replacement, label) => {
  if (!pattern.test(source)) throw new Error(`Could not update ${label}`);
  return source.replace(pattern, replacement);
};

const pills = (values, dictionary) => (values || [])
  .map((value) => `<span class="tag-pill">${escapeHtml(dictionary[value] || value)}</span>`)
  .join("");

const notesMarkup = (product) => `<div class="product-detail-section" id="notesSection"><h2 class="product-detail-section__title">Ноти</h2><p><strong>Верхні:</strong> ${escapeHtml(product.notes.top.join(", "))}</p><p><strong>Серце:</strong> ${escapeHtml(product.notes.heart.join(", "))}</p><p><strong>База:</strong> ${escapeHtml(product.notes.base.join(", "))}</p></div>`;

const journalMarkup = (product) => `<div class="product-journal-proof">
<span class="product-journal-proof__label">VA HOME Journal</span>
<a href="../${escapeHtml(product.journalArticle.path)}"><span class="product-journal-proof__title">${escapeHtml(product.journalArticle.title)}</span><span aria-hidden="true" class="product-journal-proof__arrow">→</span></a>
</div>`;

const scalesMarkup = (product) => {
  const configuredOrder = Array.isArray(labels.scaleOrder) ? labels.scaleOrder : Object.keys(labels.scales || {});
  const fields = configuredOrder.filter((key, index) => key !== "intensity" && labels.scales?.[key] && configuredOrder.indexOf(key) === index);
  return `<div class="product-detail-section" id="scalesSection"><h2 class="product-detail-section__title">Візуальні шкали</h2><div class="scent-scale">${fields.map((key) => {
    const value = Math.max(0, Math.min(10, Number(product.scales?.[key]) || 0));
    return `<div class="scent-scale__row"><span>${escapeHtml(labels.scales[key])}</span><div class="scent-scale__track"><div class="scent-scale__fill" style="width:${value * 10}%"></div></div></div>`;
  }).join("")}</div></div>`;
};

const reedCountLabel = (value) => `${value} палички`;

const reedIntervalLabel = (product) => {
  const min = product.reedCare?.intervalDays?.min;
  const max = product.reedCare?.intervalDays?.max;
  if (!Number.isInteger(min) || !Number.isInteger(max)) return "За потреби";
  if (min === 7 && max === 7) return "Раз на тиждень";
  if (min === max) return `Кожні ${min} дні`;
  return `Кожні ${min}–${max} ${max <= 4 ? "дні" : "днів"}`;
};

const reedSetupMarkup = (product) => {
  const setup = product.reedSetupByArea;
  const cards = reedSetupPolicy.bands.map((band) => {
    const value = setup[band.id];
    const recommended = band.recommended ? " is-recommended" : "";
    return `<article class="product-reed-guide__item${recommended}"><span>${escapeHtml(band.label)}</span><strong>${escapeHtml(reedCountLabel(value.label))}</strong></article>`;
  }).join("");
  const hasExtra = Object.values(setup).some((value) => value && typeof value === "object" && value.extraReeds);
  return `<div class="product-detail-section product-reed-guide" id="reedSetupSection">
<h2 class="product-detail-section__title">${escapeHtml(reedSetupPolicy.title)}</h2>
<p class="product-reed-guide__lead">${escapeHtml(reedSetupPolicy.publicRule)}</p>
<div class="product-reed-guide__grid">${cards}</div>
<div class="product-reed-guide__care"><span>Догляд за паличками</span><strong>${escapeHtml(reedIntervalLabel(product))}</strong></div>
<p class="product-reed-guide__note">${escapeHtml(reedSetupPolicy.adjustmentNote)}</p>
${hasExtra ? `<p class="product-reed-guide__extra">${escapeHtml(reedSetupPolicy.extraReedsNote)}</p>` : ""}
</div>`;
};


const heroFactsMarkup = (product) => `<div class="product-essential-facts"><div><span>Тривалість</span><strong id="productHeroDuration">8–12 тижнів</strong></div><div><span>У комплекті</span><strong id="productHeroPackage">${escapeHtml(product.package.reedCount)} чорні палички</strong></div><div class="product-essential-facts__care"><span>Перевертання</span><strong id="productHeroReedCare">${escapeHtml(reedIntervalLabel(product))}</strong><small>Орієнтовно; рідше, якщо інтенсивність достатня</small></div></div>`;

const packageMarkup = (product) => {
  const pack = product.package;
  const primary = product.diffusion.primary;
  const packageText = `${pack.reedCount} чорні палички ${pack.reedDiameterMm} мм`;
  const useCount = primary.countMin === primary.countMax
    ? `${primary.countMin} палички`
    : `${primary.countMin}–${primary.countMax} палички`;
  return `<div class="product-detail-section product-usage-guide" id="productUsageSection">
<h2 class="product-detail-section__title">Як користуватися</h2>
<div class="product-usage-guide__steps">
<article><span>01</span><div><strong>Вставте ${escapeHtml(useCount)}</strong><p>Використовуйте палички з комплекту та поставте флакон на стійку поверхню.</p></div></article>
<article><span>02</span><div><strong>Зачекайте 24–48 годин</strong><p>Аромат розкривається поступово — не оцінюйте інтенсивність одразу.</p></div></article>
<article><span>03</span><div><strong>Перевертайте палички</strong><p>${escapeHtml(product.reedCare.publicText)}</p></div></article>
</div>
<div class="product-usage-guide__meta"><p><strong>У комплекті:</strong> флакон 100 мл і ${escapeHtml(packageText)}.</p><p><strong>Тривалість:</strong> орієнтовно 8–12 тижнів.</p></div>
<p class="product-usage-guide__note">${escapeHtml(reedCarePolicy.consumptionNote)}</p>
</div>`;
};

function updateStructuredData(html, product, collection) {
  const pattern = /<script id="productStructuredData" type="application\/ld\+json">([\s\S]*?)<\/script>/;
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing productStructuredData for ${product.id}`);
  const schema = JSON.parse(match[1]);
  schema.name = product.name;
  schema.description = product.shortDescription;
  schema.sku = product.id;
  schema.additionalProperty = Array.isArray(schema.additionalProperty) ? schema.additionalProperty : [];
  const setProperty = (name, value) => {
    const found = schema.additionalProperty.find((item) => item.name === name);
    if (found) found.value = value;
    else schema.additionalProperty.push({ "@type": "PropertyValue", name, value });
  };
  setProperty("Об’єм", collection.volume);
  setProperty("Колекція", collection.name);
  setProperty("Рекомендований старт", product.quickFacts);
  setProperty("Палички у комплекті", `${product.package.reedCount} × ${product.package.reedDiameterMm} мм`);
  setProperty("Рекомендована площа", product.diffusion.area);
  setProperty("Інтенсивність", `${product.scales.intensity} з 10`);
  setProperty("Перевертання паличок", product.reedCare.publicText);
  setProperty("Палички до 15 м²", product.reedSetupByArea.small.label);
  setProperty("Палички для 15–25 м²", product.reedSetupByArea.standard.label);
  setProperty("Палички для 25 м²+", product.reedSetupByArea.large.label);
  return html.replace(pattern, `<script id="productStructuredData" type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`);
}

function updateProductPage(file, product) {
  const collection = collections.get(product.collection);
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes("css/reed-guide.css")) {
    html = html.replace(/(<link href="\.\.\/css\/site-product\.css\?v=[^"]+" rel="stylesheet"\/>)/, `$1<link href="../css/reed-guide.css?v=${content.release}" rel="stylesheet"/>`);
  }
  if (!html.includes("css/fragrance-dna.css")) {
    html = html.replace(/(<link href="\.\.\/css\/site-product\.css\?v=[^"]+" rel="stylesheet"\/>)/, `$1<link href="../css/fragrance-dna.css?v=${content.release}" rel="stylesheet"/>`);
  }
  const pageDescription = `${product.shortDescription} 100 мл, ${collection.price} грн. Преміальний аромадифузор VA HOME.`;

  html = replaceRequired(html, /<meta content="[^"]*" name="description"\/>/, `<meta content="${escapeHtml(pageDescription)}" name="description"/>`, `${product.id} meta description`);
  html = replaceRequired(html, /<meta content="[^"]*" property="og:description"\/>/, `<meta content="${escapeHtml(pageDescription)}" property="og:description"/>`, `${product.id} og description`);
  html = replaceRequired(html, /<meta content="[^"]*" name="twitter:description"\/>/, `<meta content="${escapeHtml(pageDescription)}" name="twitter:description"/>`, `${product.id} twitter description`);
  html = replaceRequired(html, /(<span aria-current="page" id="breadcrumbName">)[\s\S]*?(<\/span>)/, `$1${escapeHtml(product.name)}$2`, `${product.id} breadcrumb`);
  html = replaceRequired(html, /(<h1 class="product-hero__name" id="productName">)[\s\S]*?(<\/h1>)/, `$1${escapeHtml(product.name)}$2`, `${product.id} h1`);
  html = replaceRequired(html, /(<p class="product-hero__desc" id="productDesc">)[\s\S]*?(<\/p>)/, `$1${escapeHtml(product.shortDescription)}$2`, `${product.id} description`);
  html = replaceRequired(html, /<div class="product-essential-facts">[\s\S]*?<div class="product-hero__suit-for">/, `${heroFactsMarkup(product)}<div class="product-hero__suit-for">`, `${product.id} hero facts`);
  html = replaceRequired(html, /(<div class="product-hero__suit-for">)[\s\S]*?(<\/div>)/, `$1${escapeHtml(product.suitFor)}$2`, `${product.id} suitFor`);
  html = replaceRequired(html, /<div class="product-journal-proof">[\s\S]*?<\/div>\s*<!-- ---- Ароматичний профіль ---- -->/, `${journalMarkup(product)}\n<!-- ---- Ароматичний профіль ---- -->`, `${product.id} journal article`);
  html = replaceRequired(html, /(<div class="tag-pills" id="profileTags">)[\s\S]*?(<\/div>)/, `$1${pills(product.character, labels.character)}$2`, `${product.id} profile tags`);
  html = replaceRequired(html, /<div class="product-detail-section" id="notesSection">[\s\S]*?<\/div>/, notesMarkup(product), `${product.id} notes`);
  html = replaceRequired(html, /(<p class="product-formula-proof__intent">)[\s\S]*?(<\/p>)/, `$1<strong>Задум композиції.</strong> ${escapeHtml(product.formulaIntent)}$2`, `${product.id} formula intent`);
  html = replaceRequired(html, /(<dt>Рекомендований старт<\/dt><dd>)[\s\S]*?(<\/dd>)/, `$1${escapeHtml(product.diffusion.primary.label)}$2`, `${product.id} formula start`);
  html = replaceRequired(html, /<div class="product-detail-section" id="scalesSection">[\s\S]*?<!-- ---- Для якої кімнати ---- -->/, `${scalesMarkup(product)}\n<!-- ---- Для якої кімнати ---- -->`, `${product.id} scales`);
  html = replaceRequired(html, /(<div class="tag-pills" id="roomTags">)[\s\S]*?(<\/div>)/, `$1${pills(product.room, labels.room)}$2`, `${product.id} room tags`);
  html = replaceRequired(html, /(<div class="tag-pills" id="moodTags">)[\s\S]*?(<\/div>)/, `$1${pills(product.mood, labels.mood)}$2`, `${product.id} mood tags`);
  html = replaceRequired(html, /<div class="product-detail-section" id="intensitySection">[\s\S]*?<\/div>/, `<div class="product-detail-section" id="intensitySection"><h2 class="product-detail-section__title">Інтенсивність</h2><p>${product.scales.intensity} / 10</p></div>`, `${product.id} intensity`);
  html = replaceRequired(html, /<div class="product-detail-section(?: product-usage-guide)?"(?: id="productUsageSection")?>\s*<h2 class="product-detail-section__title">(?:Комплектація та використання|Як користуватися)<\/h2>[\s\S]*?(?:<div class="product-detail-section product-reed-guide" id="reedSetupSection">[\s\S]*?<\/div>\s*)?<div class="product-detail-section">\s*<h2 class="product-detail-section__title">Безпечне використання<\/h2>/, `${packageMarkup(product)}\n${reedSetupMarkup(product)}\n<div class="product-detail-section">\n<h2 class="product-detail-section__title">Безпечне використання</h2>`, `${product.id} usage`);
  html = updateStructuredData(html, product, collection);
  fs.writeFileSync(file, html);
}

function updateProductCards(html) {
  for (const product of content.products) {
    const collection = collections.get(product.collection);
    const articlePattern = new RegExp(`<article class="product-card"[^>]*data-product-id="${product.id}"[^>]*>[\\s\\S]*?<\\/article>`, "g");
    html = html.replace(articlePattern, (article) => {
      article = article.replace(/(<span class="product-card__collection">)[\s\S]*?(<\/span>)/, `$1${escapeHtml(collection.name)}$2`);
      article = article.replace(/(<h3 class="product-card__name">)[\s\S]*?(<\/h3>)/, `$1${escapeHtml(product.name)}$2`);
      article = article.replace(/(<p class="product-card__desc">)[\s\S]*?(<\/p>)/, `$1${escapeHtml(product.shortDescription)}$2`);
      article = article.replace(/(<span class="product-card__price">)[\s\S]*?(<\/span>)/, `$1${collection.price}\u00A0грн$2`);
      return article;
    });
  }
  return html;
}

function syncGlobalReedCareCopy() {
  const combined = `${reedCarePolicy.faqText} ${reedCarePolicy.consumptionNote}`;
  const setupFaq = `Кількість залежить від конкретного аромату й відчуття простору. На кожній картці є три прості варіанти: невелика кімната, стандартна кімната та великий простір. ${reedSetupPolicy.adjustmentNote}`;
  const indexFile = path.join(root, "index.html");
  let indexHtml = fs.readFileSync(indexFile, "utf8");
  const durationText = "Орієнтовно 8–12 тижнів. Тривалість залежить від композиції, кількості паличок, температури й руху повітря.";
  indexHtml = indexHtml.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, raw) => {
    try {
      const schema = JSON.parse(raw);
      if (schema?.["@type"] !== "FAQPage" || !Array.isArray(schema.mainEntity)) return full;
      const duration = schema.mainEntity.find((item) => item?.name === "Як довго звучить аромат?");
      if (duration?.acceptedAnswer) duration.acceptedAnswer.text = durationText;
      const setup = schema.mainEntity.find((item) => item?.name === "Скільки паличок використовувати?");
      if (setup?.acceptedAnswer) setup.acceptedAnswer.text = setupFaq;
      let care = schema.mainEntity.find((item) => item?.name === "Як часто перевертати палички?");
      if (!care) {
        care = { "@type": "Question", name: "Як часто перевертати палички?", acceptedAnswer: { "@type": "Answer", text: combined } };
        const durationIndex = schema.mainEntity.indexOf(duration);
        schema.mainEntity.splice(durationIndex >= 0 ? durationIndex + 1 : schema.mainEntity.length, 0, care);
      } else if (care.acceptedAnswer) {
        care.acceptedAnswer.text = combined;
      }
      return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
    } catch {
      return full;
    }
  });
  indexHtml = indexHtml.replace(
    /(<div class="accordion-panel" id="faq-2">[\s\S]*?<div class="accordion-panel__inner">\s*<p>)[\s\S]*?(<\/p>)/,
    `$1${escapeHtml(setupFaq)}$2`
  );
  indexHtml = indexHtml.replace(
    /(<div class="accordion-panel" id="faq-3">[\s\S]*?<div class="accordion-panel__inner">\s*<p>)[\s\S]*?(<\/p>)/,
    `$1${escapeHtml(durationText)}$2`
  );
  const careMarkup = `<div class="accordion-item" data-reed-care-faq>
<h3>
<button aria-controls="faq-care" aria-expanded="false" class="accordion-trigger" type="button">
              Як часто перевертати палички?
              <span aria-hidden="true" class="accordion-trigger__icon"></span>
</button>
</h3>
<div class="accordion-panel" id="faq-care">
<div class="accordion-panel__inner">
<p>${escapeHtml(combined)}</p>
</div>
</div>
</div>`;
  if (indexHtml.includes('id="faq-care"')) {
    indexHtml = indexHtml.replace(
      /(<div class="accordion-panel" id="faq-care">[\s\S]*?<div class="accordion-panel__inner">\s*<p>)[\s\S]*?(<\/p>)/,
      `$1${escapeHtml(combined)}$2`
    );
  } else {
    indexHtml = indexHtml.replace(
      /(<div class="accordion-item">\s*<h3>\s*<button aria-controls="faq-4")/,
      `${careMarkup}\n$1`
    );
  }
  fs.writeFileSync(indexFile, indexHtml);

  const usageGuideFile = path.join(root, "guides", "yak-korystuvatis-dyfuzorom.html");
  let usageGuide = fs.readFileSync(usageGuideFile, "utf8");
  usageGuide = usageGuide.replace(
    /(<h2>Коли варто перевертати палички<\/h2>)\s*<p>[\s\S]*?<\/p>/,
    `$1<p>${escapeHtml(reedCarePolicy.faqText)} ${escapeHtml(reedCarePolicy.consumptionNote)}</p>`
  );
  const setupGuideCopy = `${reedSetupPolicy.publicRule} ${reedSetupPolicy.adjustmentNote} ${reedSetupPolicy.extraReedsNote}`;
  if (usageGuide.includes('data-central-reed-setup')) {
    usageGuide = usageGuide.replace(/(<p data-central-reed-setup>)[\s\S]*?(<\/p>)/, `$1${escapeHtml(setupGuideCopy)}$2`);
  } else {
    usageGuide = usageGuide.replace(/(<h2>Скільки паличок використовувати<\/h2>)/, `$1<p data-central-reed-setup>${escapeHtml(setupGuideCopy)}</p>`);
  }
  fs.writeFileSync(usageGuideFile, usageGuide);

  const openedGuideFile = path.join(root, "guides", "pislya-vidkryttya-flakona.html");
  let openedGuide = fs.readFileSync(openedGuideFile, "utf8");
  openedGuide = openedGuide.replace(
    /(<h2>Перевертання паличок — частота залежить від композиції<\/h2>|<h2>Перевертання паличок — коротке посилення<\/h2>)<p>[\s\S]*?<\/p><p>[\s\S]*?<\/p>/,
    `<h2>Перевертання паличок — частота залежить від композиції</h2><p>${escapeHtml(reedCarePolicy.faqText)}</p><p>${escapeHtml(reedCarePolicy.consumptionNote)}</p>`
  );
  fs.writeFileSync(openedGuideFile, openedGuide);
}

for (const product of content.products) {
  updateProductPage(path.join(root, "products", `${product.id}.html`), product);
}
syncGlobalReedCareCopy();

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
for (const file of walk(root).filter((file) => file.endsWith(".html"))) {
  const before = fs.readFileSync(file, "utf8");
  const after = updateProductCards(before);
  if (after !== before) fs.writeFileSync(file, after);
}

console.log(JSON.stringify({ ok: true, products: content.products.length, release: content.release }, null, 2));
