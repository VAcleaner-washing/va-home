import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const errors = [];
const fail = (message) => errors.push(message);
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const content = JSON.parse(read("data/product-content.json"));
const products = content.products || [];
const collections = content.collections || [];
const byId = new Map(products.map((product) => [product.id, product]));
const labels = content.labels || {};
const reedIntervalLabel = (product) => {
  const min = product.reedCare?.intervalDays?.min;
  const max = product.reedCare?.intervalDays?.max;
  if (!Number.isInteger(min) || !Number.isInteger(max)) return "За потреби";
  if (min === 7 && max === 7) return "Раз на тиждень";
  if (min === max) return `Кожні ${min} дні`;
  return `Кожні ${min}–${max} ${max <= 4 ? "дні" : "днів"}`;
};

if (content.release !== "13.8.27") fail(`central release is ${content.release}, expected 13.8.27`);
if (products.length !== 18) fail(`expected 18 products, found ${products.length}`);
if (new Set(products.map((product) => product.id)).size !== products.length) fail("duplicate product IDs");
if (collections.length !== 4) fail(`expected 4 collections, found ${collections.length}`);

const collectionIds = new Set(collections.map((collection) => collection.id));
for (const product of products) {
  if (!collectionIds.has(product.collection)) fail(`${product.id}: unknown collection ${product.collection}`);
  for (const key of product.character || []) if (!labels.character?.[key]) fail(`${product.id}: unknown character ${key}`);
  for (const key of product.room || []) if (!labels.room?.[key]) fail(`${product.id}: unknown room ${key}`);
  for (const key of product.mood || []) if (!labels.mood?.[key]) fail(`${product.id}: unknown mood ${key}`);

  const primary = product.diffusion?.primary;
  const pack = product.package;
  if (!primary || !pack) {
    fail(`${product.id}: missing diffusion/package`);
    continue;
  }
  if (![4, 5].includes(primary.diameterMm)) fail(`${product.id}: unsupported primary reed diameter`);
  if (![4, 5].includes(pack.reedDiameterMm)) fail(`${product.id}: unsupported package reed diameter`);
  if (!(primary.countMin >= 1 && primary.countMax >= primary.countMin)) fail(`${product.id}: invalid primary reed count`);
  if (primary.diameterMm === pack.reedDiameterMm && primary.countMax > pack.reedCount) {
    fail(`${product.id}: recommends more included reeds than the package contains`);
  }
  const expectedQuickFacts = `${product.reedSetupByArea?.standard?.label || (primary.countMin === primary.countMax ? primary.countMin : `${primary.countMin}–${primary.countMax}`)} палички`;
  if (product.quickFacts !== expectedQuickFacts) fail(`${product.id}: hero quickFacts must be exactly ${expectedQuickFacts}`);
  if (/м²|мм|для\s+\d/.test(product.quickFacts)) fail(`${product.id}: hero quickFacts repeat technical area or reed diameter`);
  if (product.scales?.intensity == null || product.scales.intensity < 1 || product.scales.intensity > 10) {
    fail(`${product.id}: invalid intensity`);
  }
  if (!product.sourceRef?.workbookRow) fail(`${product.id}: missing workbook source row`);
  const care = product.reedCare;
  if (!care || !["dense", "balanced", "light"].includes(care.tier)) fail(`${product.id}: missing or invalid reed-care tier`);
  if (!(Number.isInteger(care?.intervalDays?.min) && Number.isInteger(care?.intervalDays?.max))) fail(`${product.id}: invalid reed-care interval`);
  if (care?.intervalDays?.min < 3 || care?.intervalDays?.max > 7 || care?.intervalDays?.max < care?.intervalDays?.min) fail(`${product.id}: reed-care interval outside 3–7 days`);
  if (!care?.publicText || !care.publicText.includes("Перевертайте палички")) fail(`${product.id}: missing public reed-care instruction`);
  const setup = product.reedSetupByArea;
  if (!setup?.small || !setup?.standard || !setup?.large) fail(`${product.id}: missing room-size reed setup`);
  for (const band of ["small", "standard", "large"]) {
    const value = setup?.[band];
    if (!value || !Number.isInteger(value.min) || !Number.isInteger(value.max) || value.min < 1 || value.max < value.min || !value.label) fail(`${product.id}: invalid ${band} reed setup`);
    if (!value?.extraReeds && value?.max > pack.reedCount) fail(`${product.id}: ${band} setup exceeds included reeds without extraReeds flag`);
  }
  if (setup?.standard?.min !== primary.countMin || setup?.standard?.max !== primary.countMax) fail(`${product.id}: primary setup differs from 15–25 m² setup`);
}



const catalogFilters = content.catalogFilters || {};
const uniqueIds = (items) => new Set((items || []).map((item) => item.id));
for (const [name, items] of Object.entries(catalogFilters)) {
  if (!Array.isArray(items) || !items.length) fail(`catalog filter ${name} is empty`);
  if (uniqueIds(items).size !== (items || []).length) fail(`catalog filter ${name} has duplicate IDs`);
}
for (const item of catalogFilters.collections || []) if (!collectionIds.has(item.id)) fail(`catalog collection filter uses unknown ID ${item.id}`);
for (const item of catalogFilters.characters || []) if (!labels.character?.[item.id]) fail(`catalog character filter uses unknown ID ${item.id}`);
for (const item of catalogFilters.rooms || []) if (!labels.room?.[item.id]) fail(`catalog room filter uses unknown ID ${item.id}`);
for (const item of catalogFilters.moods || []) if (!labels.mood?.[item.id]) fail(`catalog mood filter uses unknown ID ${item.id}`);
for (const item of catalogFilters.characters || []) {
  const count = products.filter((product) => item.id === "evening"
    ? (product.character || []).includes("evening") || (product.mood || []).includes("warm-evening")
    : (product.character || []).includes(item.id)).length;
  if (!count) fail(`catalog character filter ${item.id} has no products`);
}
for (const item of catalogFilters.rooms || []) if (!products.some((product) => (product.room || []).includes(item.id))) fail(`catalog room filter ${item.id} has no products`);
for (const item of catalogFilters.moods || []) if (!products.some((product) => (product.mood || []).includes(item.id))) fail(`catalog mood filter ${item.id} has no products`);

const guide = content.scentGuide || {};
const guideQuestions = guide.questions || [];
if (guideQuestions.length !== 5) fail(`expected 5 scent-guide questions, found ${guideQuestions.length}`);
if (new Set(guideQuestions.map((question) => question.id)).size !== guideQuestions.length) fail("duplicate scent-guide question IDs");
const productScaleKeys = new Set(products.flatMap((product) => Object.keys(product.scales || {})));
for (const question of guideQuestions) {
  if (!question.title || !question.stepLabel || !Array.isArray(question.options) || !question.options.length) fail(`invalid guide question ${question.id}`);
  if (new Set(question.options.map((option) => option.id)).size !== question.options.length) fail(`duplicate options in guide question ${question.id}`);
  for (const option of question.options) {
    const rule = option.score || {};
    for (const key of Object.keys(rule.character || {})) if (!labels.character?.[key]) fail(`${question.id}/${option.id}: unknown character weight ${key}`);
    for (const key of Object.keys(rule.mood || {})) if (!labels.mood?.[key]) fail(`${question.id}/${option.id}: unknown mood weight ${key}`);
    for (const key of Object.keys(rule.room || {})) if (!labels.room?.[key]) fail(`${question.id}/${option.id}: unknown room weight ${key}`);
    for (const key of Object.keys(rule.collection || {})) if (!collectionIds.has(key)) fail(`${question.id}/${option.id}: unknown collection weight ${key}`);
    for (const scaleRule of rule.scales || []) if (!productScaleKeys.has(scaleRule.key)) fail(`${question.id}/${option.id}: unknown scale ${scaleRule.key}`);
    if (rule.targetScale && !productScaleKeys.has(rule.targetScale.key)) fail(`${question.id}/${option.id}: unknown target scale ${rule.targetScale.key}`);
    if (!(Number(rule.cap) > 0)) fail(`${question.id}/${option.id}: invalid scoring cap`);
  }
}

const exactMoods = {
  "pure-imagination": ["airy-luxury"],
  "the-archive": ["private-library"],
  "old-money": ["dark-luxury"],
  "linstinct": ["confident-space"],
  "wild-berry-way": ["berry-air"],
  "dark-bloom": ["sensual-evening"],
  "moss-and-shadow": ["mossy-dark"],
  "silent-temple": ["meditative-wood"]
};
for (const [id, expected] of Object.entries(exactMoods)) {
  const actual = byId.get(id)?.mood || [];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${id}: atmosphere drift ${JSON.stringify(actual)}`);
}

const carePolicy = content.reedCarePolicy || {};
if (!carePolicy.faqText || !carePolicy.consumptionNote || !carePolicy.tiers) fail("missing centralized reed-care policy");
const expectedCare = {
  "pure-imagination": [5, 7],
  "silk-molecule": [3, 4],
  "the-archive": [3, 4],
  "silent-temple": [5, 7],
  "moss-and-shadow": [4, 5],
  "dark-bloom": [3, 4],
  "old-money": [4, 5],
  "linstinct": [5, 7],
  "mineral-salt": [7, 7],
  "evening-ritual": [4, 5],
  "velvet-spa": [4, 5],
  "pure-zen": [5, 7],
  "hotel-luxe": [7, 7],
  "signature-relax": [7, 7],
  "hotel-spring": [7, 7],
  "forbidden-fruit": [4, 5],
  "doux-moment": [5, 7],
  "wild-berry-way": [7, 7]
};
for (const [id, interval] of Object.entries(expectedCare)) {
  const actual = byId.get(id)?.reedCare?.intervalDays;
  if (!actual || actual.min !== interval[0] || actual.max !== interval[1]) fail(`${id}: reed-care interval drift`);
}

const setupPolicy = content.reedSetupPolicy || {};
if (!setupPolicy.title || !setupPolicy.adjustmentNote || !setupPolicy.extraReedsNote || setupPolicy.bands?.length !== 3) fail("missing centralized room-size reed setup policy");
const expectedSetup = {
  "pure-imagination": ["2", "3", "4"],
  "silk-molecule": ["3", "4", "4+"],
  "the-archive": ["2", "3", "4"],
  "silent-temple": ["3", "4", "4"],
  "moss-and-shadow": ["2–3", "3–4", "4"],
  "dark-bloom": ["2–3", "3–4", "4"],
  "old-money": ["2", "3", "4"],
  "linstinct": ["2–3", "3–4", "4"],
  "mineral-salt": ["3", "4", "4"],
  "evening-ritual": ["2–3", "3–4", "4"],
  "velvet-spa": ["2–3", "3–4", "4"],
  "pure-zen": ["3", "4", "4+"],
  "hotel-luxe": ["3", "4", "4"],
  "signature-relax": ["2–3", "3–4", "4"],
  "forbidden-fruit": ["2", "3", "4"],
  "doux-moment": ["2", "3", "4"],
  "wild-berry-way": ["3", "4", "4"],
  "hotel-spring": ["3", "4", "4"]
};
for (const [id, expected] of Object.entries(expectedSetup)) {
  const setup = byId.get(id)?.reedSetupByArea;
  const actual = [setup?.small?.label, setup?.standard?.label, setup?.large?.label];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${id}: room-size reed setup drift ${JSON.stringify(actual)}`);
}

const silk = byId.get("silk-molecule");
if (silk?.package?.reedCount !== 4 || silk?.package?.reedDiameterMm !== 5) fail("silk-molecule package must be 4 × 5 mm");
if (silk?.diffusion?.primary?.countMin !== 4 || silk?.diffusion?.primary?.diameterMm !== 5) fail("silk-molecule standard setup must be 4 × 5 mm");
const pureZen = byId.get("pure-zen");
if (pureZen?.scales?.intensity !== 5) fail("pure-zen intensity must remain 5/10");

const serialized = JSON.stringify(content);
for (const privateKey of ["formulaPercent", "perfumerComment", "spatialEvolution", "synergy"]) {
  if (serialized.includes(`"${privateKey}"`)) fail(`private workbook field leaked into public JSON: ${privateKey}`);
}

const productsJs = read("js/products.js");
if (!productsJs.includes("AUTO-GENERATED from data/product-content.json")) fail("products.js is not marked generated");
if (!productsJs.includes('const PRODUCT_CONTENT_VERSION = "13.8.27";')) fail("products.js content version mismatch");
if (!productsJs.includes("const PRODUCT_CATALOG_FILTERS") || !productsJs.includes("const PRODUCT_SCENT_GUIDE") || !productsJs.includes("const PRODUCT_REED_CARE_POLICY") || !productsJs.includes("const PRODUCT_REED_SETUP_POLICY")) fail("generated products.js is missing centralized catalog/guide/reed-care/setup config");
if (!productsJs.includes("window.VA_CATALOG_FILTERS") || !productsJs.includes("window.VA_SCENT_GUIDE") || !productsJs.includes("window.VA_REED_CARE_POLICY") || !productsJs.includes("window.VA_REED_SETUP_POLICY")) fail("centralized catalog/guide/reed-care/setup config is not exported to storefront modules");
try {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(`${productsJs}\nthis.__products = PRODUCTS; this.__collections = COLLECTIONS;`, context);
  if (context.__products?.length !== 18) fail("generated products.js does not expose 18 products");
} catch (error) {
  fail(`generated products.js cannot execute: ${error.message}`);
}

const htmlEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const extract = (source, pattern) => source.match(pattern)?.[1] ?? null;
for (const product of products) {
  const html = read(`products/${product.id}.html`);
  const h1 = extract(html, /<h1 class="product-hero__name" id="productName">([\s\S]*?)<\/h1>/);
  const mood = extract(html, /<div class="tag-pills" id="moodTags">([\s\S]*?)<\/div>/);
  const rooms = extract(html, /<div class="tag-pills" id="roomTags">([\s\S]*?)<\/div>/);
  const intensity = extract(html, /<div class="product-detail-section" id="intensitySection">[\s\S]*?<p>([\s\S]*?)<\/p><\/div>/);
  if (h1 !== htmlEscape(product.name)) fail(`${product.id}: static H1 differs from JSON`);
  for (const key of product.mood || []) if (!mood?.includes(htmlEscape(labels.mood[key]))) fail(`${product.id}: missing mood label ${labels.mood[key]}`);
  for (const key of product.room || []) if (!rooms?.includes(htmlEscape(labels.room[key]))) fail(`${product.id}: missing room label ${labels.room[key]}`);
  if (intensity?.trim() !== `${product.scales.intensity} / 10`) fail(`${product.id}: intensity HTML mismatch`);
  if (!html.includes(`${product.package.reedCount} чорні палички ${product.package.reedDiameterMm} мм`)) fail(`${product.id}: package reeds HTML mismatch`);
  if (!html.includes(htmlEscape(product.reedCare.publicText))) fail(`${product.id}: reed-care HTML mismatch`);
  if (!html.includes(htmlEscape(carePolicy.consumptionNote))) fail(`${product.id}: reed-care consumption note missing`);
  if (!html.includes('id="reedSetupSection"') || !html.includes('id="productUsageSection"') || !html.includes("css/reed-guide.css?v=13.8.27")) fail(`${product.id}: customer-friendly reed guide, usage section or stylesheet missing`);
  if (html.includes("<span>Старт</span>") || html.includes("<span>Площа</span>")) fail(`${product.id}: duplicated hero start/area facts are still visible`);
  if (!html.includes('id="productHeroDuration"') || !html.includes('id="productHeroPackage"') || !html.includes('id="productHeroReedCare"')) fail(`${product.id}: visible hero duration, package or reed-care fact is missing`);
  if (!html.includes(reedIntervalLabel(product))) fail(`${product.id}: hero/card reed-care interval is not visible`);
  const reedSection = extract(html, /<div class="product-detail-section product-reed-guide" id="reedSetupSection">([\s\S]*?)<\/div>\s*<div class="product-detail-section">/);
  if (!reedSection) fail(`${product.id}: cannot inspect reed setup section`);
  if (reedSection && /м²|<small>/.test(reedSection)) fail(`${product.id}: technical area labels remain visible in reed cards`);
  if (!html.includes("Догляд за паличками") || !html.includes("Перевертайте палички")) fail(`${product.id}: visible reed-care instruction missing`);
  if (html.includes("<small>паличок 4 мм</small>") || html.includes("<small>паличок 5 мм</small>")) fail(`${product.id}: technical reed diameter is still repeated in room cards`);
  for (const band of ["small", "standard", "large"]) if (!html.includes(`>${htmlEscape(product.reedSetupByArea[band].label)} палички</strong>`)) fail(`${product.id}: ${band} room-size reed value missing from HTML`);

  const schemaMatch = html.match(/<script id="productStructuredData" type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!schemaMatch) {
    fail(`${product.id}: missing JSON-LD`);
  } else {
    try {
      const schema = JSON.parse(schemaMatch[1]);
      const props = Object.fromEntries((schema.additionalProperty || []).map((item) => [item.name, item.value]));
      if (schema.name !== product.name) fail(`${product.id}: JSON-LD name mismatch`);
      if (props["Рекомендований старт"] !== product.quickFacts) fail(`${product.id}: JSON-LD reed start mismatch`);
      if (props["Палички у комплекті"] !== `${product.package.reedCount} × ${product.package.reedDiameterMm} мм`) fail(`${product.id}: JSON-LD package mismatch`);
      if (props["Перевертання паличок"] !== product.reedCare.publicText) fail(`${product.id}: JSON-LD reed-care mismatch`);
      if (props["Палички до 15 м²"] !== product.reedSetupByArea.small.label) fail(`${product.id}: JSON-LD small-room setup mismatch`);
      if (props["Палички для 15–25 м²"] !== product.reedSetupByArea.standard.label) fail(`${product.id}: JSON-LD standard-room setup mismatch`);
      if (props["Палички для 25 м²+"] !== product.reedSetupByArea.large.label) fail(`${product.id}: JSON-LD large-room setup mismatch`);
    } catch (error) {
      fail(`${product.id}: invalid JSON-LD: ${error.message}`);
    }
  }
}



const indexHtml = read("index.html");
if (!indexHtml.includes(carePolicy.faqText) || !indexHtml.includes(carePolicy.consumptionNote) || !indexHtml.includes(setupPolicy.adjustmentNote) || !indexHtml.includes('id="faq-care"') || !indexHtml.includes("Як часто перевертати палички?") || !indexHtml.includes("Скільки паличок використовувати?")) fail("homepage FAQ is not synchronized with reed policies");
const usageGuideHtml = read("guides/yak-korystuvatis-dyfuzorom.html");
const openedGuideHtml = read("guides/pislya-vidkryttya-flakona.html");
if (!usageGuideHtml.includes(carePolicy.faqText) || !openedGuideHtml.includes(carePolicy.faqText)) fail("journal reed-care guidance is not synchronized");
for (const file of ["products/pure-imagination.html", "products/silk-molecule.html", "products/the-archive.html"]) {
  if (read(file).includes("Перевертайте палички лише тоді")) fail(`${file}: stale universal reed-care instruction returned`);
}

const catalogHtml = read("catalog.html");
for (const item of catalogFilters.characters || []) if (!catalogHtml.includes(`data-value="${item.id}"`)) fail(`catalog.html missing character filter ${item.id}`);
for (const item of catalogFilters.rooms || []) if (!catalogHtml.includes(`<option value="${item.id}">${item.label}</option>`)) fail(`catalog.html missing room filter ${item.id}`);
for (const item of catalogFilters.moods || []) if (!catalogHtml.includes(`<option value="${item.id}">${item.label}</option>`)) fail(`catalog.html missing mood filter ${item.id}`);
const guideHtml = read("scent-guide.html");
if (/до 15 м²:|15–25 м²:|25 м²\+:/.test(read("js/scent-guide.js")) || /до 15 м²:|15–25 м²:|25 м²\+:/.test(read("js/compare.js"))) fail("technical area matrix returned to guide or compare cards");
for (const question of guideQuestions) {
  if (!guideHtml.includes(`data-question="${question.id}"`)) fail(`scent-guide.html missing question ${question.id}`);
  for (const option of question.options || []) if (!guideHtml.includes(`data-value="${option.id}"`)) fail(`scent-guide.html missing option ${question.id}/${option.id}`);
}
const catalogJs = read("js/catalog.js");
const guideJs = read("js/scent-guide.js");
const compareJs = read("js/compare.js");
if (!catalogJs.includes("window.VA_CATALOG_FILTERS")) fail("catalog.js is not driven by the central filter config");
if (!guideJs.includes("window.VA_SCENT_GUIDE")) fail("scent-guide.js is not driven by the central guide config");
if (!guideJs.includes("product.reedCare") || !compareJs.includes("product.reedCare")) fail("scent guide or compare is not using centralized reed-care data");
if (!guideJs.includes("reedSetupByArea") || !compareJs.includes("reedSetupByArea") || !read("js/product.js").includes("reedSetupByArea")) fail("product, compare or scent guide is not using centralized room-size reed setup");
if (/92% збіг|86% збіг|79% збіг/.test(guideJs)) fail("fixed fake scent-guide percentages returned");

const cart = read("js/cart.js");
if (!cart.includes("prefillCheckoutFromAccount(form)") || !cart.includes("Підтягнуто з вашого кабінету")) {
  fail("authenticated checkout email prefill from v13.8.17 is missing");
}

const sha256 = (relative) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const galleryHashes = {
  "js/gallery-engine.js": "23ee5bac9dc05de92ebbbe603513db220a25139af14d424c927ed5180b08802c",
  "css/site-product.css": "e36b36fc53ad1465cb79e1a3f4967ccc666cd5c68fc0fc95113ab6654a11a921"
};
for (const [file, expected] of Object.entries(galleryHashes)) {
  if (sha256(file) !== expected) fail(`${file}: differs from the chosen v13.8.17 gallery baseline`);
}

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
for (const file of walk(root).filter((file) => file.endsWith(".html"))) {
  const html = fs.readFileSync(file, "utf8");
  if (/\?v=13\.8\.(?!27\b)\d+/.test(html)) fail(`stale asset version: ${path.relative(root, file)}`);
}
if (!read("service-worker.js").includes("const VERSION = '13.8.27';")) fail("root service worker version mismatch");
if (!read("admin/service-worker.js").includes("1.0.0-13.8.27")) fail("admin service worker version mismatch");

if (errors.length) {
  console.error("Product content validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  release: content.release,
  products: products.length,
  catalogFilters: Object.values(catalogFilters).reduce((sum, items) => sum + items.length, 0),
  guideQuestions: guideQuestions.length,
  source: content.source.workbook,
  silkMolecule: "4 × 5 mm",
  baseGallery: "v13.8.17",
  checkoutEmailPrefill: true,
  reedCareProducts: products.length,
  roomSizeReedSetupProducts: products.length
}, null, 2));
