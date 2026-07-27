import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const sourcePath = path.join(root, "data", "product-content.json");
const runtimePath = path.join(root, "scripts", "products-runtime.js");
const outputPath = path.join(root, "js", "products.js");

const content = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const runtime = fs.readFileSync(runtimePath, "utf8");

if (!Array.isArray(content.collections) || content.collections.length !== 4) {
  throw new Error("product-content.json must contain exactly 4 collections");
}
if (!Array.isArray(content.products) || content.products.length !== 18) {
  throw new Error("product-content.json must contain exactly 18 products");
}
if (!content.catalogFilters || !content.scentGuide || !content.reedCarePolicy || !content.reedSetupPolicy) {
  throw new Error("product-content.json must contain catalogFilters, scentGuide, reedCarePolicy and reedSetupPolicy");
}

const js = `/* ==========================================================================
   VA HOME — products.js
   AUTO-GENERATED from data/product-content.json.
   Do not edit product copy, filters, guide rules, rooms, scales or reed guidance here.
   Run: node scripts/build-product-content.mjs
   ========================================================================== */

const PRODUCT_CONTENT_VERSION = ${JSON.stringify(content.release)};
const PRODUCT_LABELS = ${JSON.stringify(content.labels, null, 2)};
const PRODUCT_CATALOG_FILTERS = ${JSON.stringify(content.catalogFilters, null, 2)};
const PRODUCT_SCENT_GUIDE = ${JSON.stringify(content.scentGuide, null, 2)};
const PRODUCT_REED_CARE_POLICY = ${JSON.stringify(content.reedCarePolicy, null, 2)};
const PRODUCT_REED_SETUP_POLICY = ${JSON.stringify(content.reedSetupPolicy, null, 2)};
const COLLECTIONS = ${JSON.stringify(content.collections, null, 2)};
const PRODUCTS = ${JSON.stringify(content.products, null, 2)};

window.VA_PRODUCT_LABELS = PRODUCT_LABELS;
window.VA_CATALOG_FILTERS = PRODUCT_CATALOG_FILTERS;
window.VA_SCENT_GUIDE = PRODUCT_SCENT_GUIDE;
window.VA_REED_CARE_POLICY = PRODUCT_REED_CARE_POLICY;
window.VA_REED_SETUP_POLICY = PRODUCT_REED_SETUP_POLICY;
window.VA_PRODUCT_CONTENT_VERSION = PRODUCT_CONTENT_VERSION;

function getCollection(collectionId) {
  return COLLECTIONS.find((collection) => collection.id === collectionId) || null;
}

${runtime}
`;

fs.writeFileSync(outputPath, js);

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function replaceElementInner(source, openNeedle, inner) {
  const openAt = source.indexOf(openNeedle);
  if (openAt < 0) throw new Error(`Cannot find ${openNeedle}`);
  const openEnd = source.indexOf(">", openAt);
  const closeAt = source.indexOf(openNeedle.startsWith("<select") ? "</select>" : "</div>", openEnd + 1);
  if (closeAt < 0) throw new Error(`Cannot find closing tag for ${openNeedle}`);
  return source.slice(0, openEnd + 1) + inner + source.slice(closeAt);
}

function syncCatalogHtml() {
  const file = path.join(root, "catalog.html");
  let html = fs.readFileSync(file, "utf8");
  const chips = (items) => [
    '<button class="filter-chip is-active" data-value="all" type="button">Усі</button>',
    ...items.map((item) => `<button class="filter-chip" data-value="${escapeHtml(item.id)}" type="button">${escapeHtml(item.label)}</button>`)
  ].join("\n");
  const options = (items, allLabel) => [
    `<option value="all">${escapeHtml(allLabel)}</option>`,
    ...items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`)
  ].join("\n");
  html = replaceElementInner(html, '<div class="filter-chips" id="collectionChips"', `\n${chips(content.catalogFilters.collections)}\n`);
  html = replaceElementInner(html, '<div class="filter-chips" id="characterChips"', `\n${chips(content.catalogFilters.characters)}\n`);
  html = replaceElementInner(html, '<select class="filter-select" id="roomSelect"', `\n${options(content.catalogFilters.rooms, "Усі кімнати")}\n`);
  html = replaceElementInner(html, '<select class="filter-select" id="moodSelect"', `\n${options(content.catalogFilters.moods, "Усі настрої")}\n`);
  html = replaceElementInner(html, '<select class="filter-select" id="catalogSort"', `\n${content.catalogFilters.sort.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join("\n")}\n`);
  fs.writeFileSync(file, html);
}

function syncGuideHtml() {
  const file = path.join(root, "scent-guide.html");
  let html = fs.readFileSync(file, "utf8");
  for (const [index, question] of content.scentGuide.questions.entries()) {
    const marker = `data-question="${question.id}"`;
    const stepAt = html.indexOf(marker);
    if (stepAt < 0) throw new Error(`Cannot find guide question ${question.id}`);
    const nextMarkerCandidates = [
      ...content.scentGuide.questions.slice(index + 1).map((item) => html.indexOf(`data-question="${item.id}"`, stepAt + marker.length)).filter((value) => value >= 0),
      html.indexOf('<div class="guide-nav">', stepAt)
    ].filter((value) => value >= 0);
    const segmentEnd = Math.min(...nextMarkerCandidates);
    const segment = html.slice(stepAt, segmentEnd);
    const numberMatch = segment.match(/<span class="guide-step__number">[\s\S]*?<\/span>/);
    const titleMatch = segment.match(/<h2 class="guide-step__question">[\s\S]*?<\/h2>/);
    if (!numberMatch || !titleMatch) throw new Error(`Guide headings missing for ${question.id}`);
    let updated = segment
      .replace(numberMatch[0], `<span class="guide-step__number">${String(index + 1).padStart(2, "0")} · ${escapeHtml(question.stepLabel)}</span>`)
      .replace(titleMatch[0], `<h2 class="guide-step__question">${escapeHtml(question.title)}</h2>`);
    const optionsOpen = '<div class="guide-options">';
    const optionsAt = updated.indexOf(optionsOpen);
    const optionsEnd = updated.indexOf("</div>", optionsAt + optionsOpen.length);
    if (optionsAt < 0 || optionsEnd < 0) throw new Error(`Guide options missing for ${question.id}`);
    const buttons = question.options.map((option) => `<button class="guide-option" data-value="${escapeHtml(option.id)}" type="button"><span class="guide-option__title">${escapeHtml(option.title)}</span><span class="guide-option__note">${escapeHtml(option.note)}</span></button>`).join("\n");
    updated = updated.slice(0, optionsAt + optionsOpen.length) + `\n${buttons}\n` + updated.slice(optionsEnd);
    html = html.slice(0, stepAt) + updated + html.slice(segmentEnd);
  }
  fs.writeFileSync(file, html);
}

syncCatalogHtml();
syncGuideHtml();

console.log(JSON.stringify({
  ok: true,
  release: content.release,
  products: content.products.length,
  catalogFilters: Object.values(content.catalogFilters).reduce((sum, items) => sum + items.length, 0),
  guideQuestions: content.scentGuide.questions.length,
  reedCarePolicy: true,
  reedSetupPolicy: true,
  output: path.relative(root, outputPath)
}, null, 2));
