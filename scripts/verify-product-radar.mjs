import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const content = JSON.parse(fs.readFileSync(path.join(root, "data", "product-content.json"), "utf8"));
const errors = [];
const fail = (message) => errors.push(message);
const expectedOrder = ["freshness", "warmth", "sweetness", "woodiness", "cleanliness", "intensity"];
const order = content.labels?.scaleOrder || [];
const labels = content.labels?.scales || {};
const words = content.labels?.scaleCharacterWords || {};

if (JSON.stringify(order) !== JSON.stringify(expectedOrder)) fail(`scale order must be ${expectedOrder.join(", ")}`);
for (const key of expectedOrder) {
  if (!labels[key]) fail(`missing scale label: ${key}`);
  if (!words[key]) fail(`missing character word: ${key}`);
}
if (labels.warmth !== "Теплість") fail(`warmth label is ${labels.warmth || "missing"}`);

const point = (value, index, count, radius = 82) => {
  const angle = (-90 + index * (360 / count)) * Math.PI / 180;
  const r = radius * value / 10;
  return [100 + Math.cos(angle) * r, 100 + Math.sin(angle) * r];
};
for (const product of content.products || []) {
  for (const key of expectedOrder) {
    const value = Number(product.scales?.[key]);
    if (!Number.isFinite(value) || value < 0 || value > 10) fail(`${product.id}: invalid ${key} scale`);
  }
  const points = expectedOrder.map((key, index) => point(Number(product.scales[key]), index, expectedOrder.length));
  if (points.length !== 6 || points.flat().some((value) => !Number.isFinite(value))) fail(`${product.id}: invalid six-axis radar geometry`);
  const html = fs.readFileSync(path.join(root, "products", `${product.id}.html`), "utf8");
  if (!html.includes("Теплість")) fail(`${product.id}: warmth is missing from static visual scales`);
  for (const key of expectedOrder.filter((key) => key !== "intensity")) {
    if (!html.includes(labels[key])) fail(`${product.id}: static scale label missing: ${labels[key]}`);
  }
}


const radarCss = fs.readFileSync(path.join(root, "css", "fragrance-dna.css"), "utf8");
if (!radarCss.includes("height:auto") || !radarCss.includes("min-height:clamp(420px,39vw,590px)")) fail("desktop story composition does not use the natural v13.8.27 geometry");
if (!radarCss.includes("width:min(100%,340px)")) fail("six-axis radar is not balanced to the v13.8.27 block height");
if (/\n\s*height:clamp\(420px,39vw,590px\)/.test(radarCss)) fail("fixed desktop story height must not return");
if (radarCss.includes("width:min(100%,390px)")) fail("oversized 390px radar is still present");
if (!radarCss.includes("@media (max-width:1050px)")) fail("stacked responsive DNA layout is missing");

const productJs = fs.readFileSync(path.join(root, "js", "product.js"), "utf8");
if (!productJs.includes("getProductScaleEntries")) fail("product.js does not consume centralized scale configuration");
if (!productJs.includes('radarEntries.length !== 6')) fail("product.js does not enforce six radar axes");
if (productJs.includes('const radarKeys = ["freshness", "sweetness", "woodiness", "cleanliness", "intensity"]')) fail("legacy five-axis radar is still hardcoded");
if (!productJs.includes('viewBox="-42 -42 284 284"')) fail("six-axis radar viewBox is not applied");

if (errors.length) {
  console.error("Product radar verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, axes: expectedOrder.length, products: content.products.length, source: "data/product-content.json" }, null, 2));
