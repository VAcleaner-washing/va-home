import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const errors = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (entry.name === "node_modules") return [];
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));

try {
  childProcess.execFileSync(process.execPath, [path.join(root, "scripts", "validate-product-content.mjs"), root], { stdio: "inherit" });
} catch {
  errors.push("product-content validator failed");
}
try {
  childProcess.execFileSync(process.execPath, [path.join(root, "scripts", "verify-review-photo-config.mjs")], { stdio: "inherit" });
} catch {
  errors.push("review-photo configuration validator failed");
}
try {
  childProcess.execFileSync(process.execPath, [path.join(root, "scripts", "verify-scent-guide.mjs"), root], { stdio: "inherit" });
} catch {
  errors.push("scent-guide matrix validator failed");
}
try {
  childProcess.execFileSync(process.execPath, [path.join(root, "scripts", "verify-product-radar.mjs"), root], { stdio: "inherit" });
} catch {
  errors.push("six-axis product radar validator failed");
}

try {
  childProcess.execFileSync(process.execPath, [path.join(root, "scripts", "verify-journal-seo.mjs"), root], { stdio: "inherit" });
} catch {
  errors.push("Journal SEO validator failed");
}
try {
  childProcess.execFileSync(process.execPath, [path.join(root, "scripts", "verify-repeat-purchase.mjs"), root], { stdio: "inherit" });
} catch {
  errors.push("repeat-purchase campaign validator failed");
}
try {
  childProcess.execFileSync(process.execPath, [path.join(root, "scripts", "verify-atmosphere-os.mjs"), root], { stdio: "inherit" });
} catch {
  errors.push("Atmosphere OS validator failed");
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (/\?v=(?!15\.1\.1\b)\d+\.\d+\.\d+/.test(html)) errors.push(`stale asset version: ${path.relative(root, file)}`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) errors.push(`duplicate IDs ${duplicates.join(", ")}: ${path.relative(root, file)}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
for (const shortcut of manifest.shortcuts || []) {
  if (!shortcut.url.endsWith(".html")) errors.push(`unsafe PWA shortcut: ${shortcut.url}`);
}
const compare = fs.readFileSync(path.join(root, "compare.html"), "utf8");
if (!compare.includes("Content-Security-Policy")) errors.push("compare CSP missing");

const localRefPattern = /(?:href|src)="([^"]+)"/g;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const relativeDir = path.dirname(file);
  for (const match of html.matchAll(localRefPattern)) {
    const ref = match[1].split("#")[0].split("?")[0];
    if (!ref || /^(?:https?:|mailto:|tel:|data:|javascript:)/.test(ref)) continue;
    const target = ref.startsWith("/") ? path.join(root, ref) : path.resolve(relativeDir, ref);
    if (!fs.existsSync(target) && !fs.existsSync(`${target}.html`) && !ref.endsWith("/")) {
      errors.push(`missing local asset ${ref}: ${path.relative(root, file)}`);
    }
  }
}

for (const file of files.filter((file) => file.endsWith(".js") || file.endsWith(".mjs"))) {
  try {
    childProcess.execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    errors.push(`syntax error: ${path.relative(root, file)}`);
  }
}


const productContent = JSON.parse(fs.readFileSync(path.join(root, "data", "product-content.json"), "utf8"));
const hotelSpring = (productContent.products || []).find((product) => product.id === "hotel-spring");
const floralProducts = (productContent.products || []).filter((product) => (product.character || []).includes("floral"));
if (!hotelSpring?.character?.includes("floral")) errors.push("Hotel Spring is missing from the Floral catalog filter");
if (floralProducts.length < 2) errors.push("Floral catalog filter must contain at least two relevant products");
const scentGuideJs = fs.readFileSync(path.join(root, "js", "scent-guide.js"), "utf8");
if (!scentGuideJs.includes("guide-result-reason__row") || !scentGuideJs.includes("renderReason")) errors.push("scent-guide recommendation details are not separated into readable rows");
const homeReviewsJs = fs.readFileSync(path.join(root, "js", "home-reviews.js"), "utf8");
if (!homeReviewsJs.includes("preloadPhoto") || !homeReviewsJs.includes("Keep the server-rendered cards visible")) errors.push("home review photo preloading/stable fallback is missing");
const homeHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!homeHtml.includes("hero-discovery-mobile.webp")) errors.push("dedicated portrait Discovery hero is missing");
if (!homeHtml.includes("шість тестерів у матових пакетах")) errors.push("Discovery hero alternative text is stale");
if (!fs.existsSync(path.join(root, "images", "home", "hero-discovery-mobile.webp"))) errors.push("portrait Discovery hero asset is missing");
const scentGuideHtml = fs.readFileSync(path.join(root, "scent-guide.html"), "utf8");
if (!scentGuideHtml.includes("шість тестерів для знайомства вдома")) errors.push("scent-guide Discovery visual is stale");
for (const discoveryAsset of [
  "images/discovery/discovery-set.webp",
  "images/pages/discovery-ritual.webp",
  "images/pages/footer-discovery.webp",
  "images/product-story/pure-imagination/discovery.webp",
  "images/product-story/silk-molecule/discovery.webp",
  "images/product-story/the-archive/discovery.webp"
]) {
  if (!fs.existsSync(path.join(root, discoveryAsset))) errors.push(`Discovery visual missing: ${discoveryAsset}`);
}
const serviceWorkerJs = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
if (!serviceWorkerJs.includes("production-7")) errors.push("public PWA cache revision is stale after authentic Noir packaging update");

const release = JSON.parse(fs.readFileSync(path.join(root, "release.json"), "utf8"));
if (release.version !== "15.1.1") errors.push(`release.json version is ${release.version}`);
if (!fs.existsSync(path.join(root, "data", "product-content.json"))) errors.push("central product content missing");
if (!fs.existsSync(path.join(root, "PRODUCT-CONTENT-MASTER.md"))) errors.push("product content documentation missing");

const categoryConfig = JSON.parse(fs.readFileSync(path.join(root, "data", "category-pages.json"), "utf8"));
for (const category of categoryConfig.categories || []) {
  for (const field of [
    "selectionTitle",
    "selectionNote",
    "guideEyebrow",
    "guideTitle",
    "guideExcerpt",
    "guideCta",
    "guideImage",
    "guideImageWidth",
    "guideImageHeight"
  ]) {
    if (!category[field]) errors.push(`category editorial field ${field} missing: ${category.slug}`);
  }
  if (!fs.existsSync(path.join(root, category.guideImage || ""))) {
    errors.push(`category editorial image missing: ${category.slug}`);
  }
  const categoryFile = path.join(root, "categories", `${category.slug}.html`);
  if (!fs.existsSync(categoryFile)) errors.push(`category landing page missing: ${category.slug}`);
  else {
    const html = fs.readFileSync(categoryFile, "utf8");
    if (!html.includes('"@type": "ItemList"')) errors.push(`category ItemList schema missing: ${category.slug}`);
    if (!html.includes('"@type": "FAQPage"')) errors.push(`category FAQ schema missing: ${category.slug}`);
    if (!html.includes('class="category-editorial"')) errors.push(`premium category editorial block missing: ${category.slug}`);
    if (!html.includes('class="product-card__image"')) errors.push(`category product image sizing hook missing: ${category.slug}`);
    if (/Не SEO-текст|короткий практичний матеріал|Аромати для цього сценарію/.test(html)) {
      errors.push(`internal or generic category copy leaked into production: ${category.slug}`);
    }
  }
}

const responsiveManifestPath = path.join(root, "data", "responsive-images.json");
if (!fs.existsSync(responsiveManifestPath)) errors.push("responsive image manifest missing");
else {
  const responsiveManifest = JSON.parse(fs.readFileSync(responsiveManifestPath, "utf8"));
  if (Object.keys(responsiveManifest.sources || {}).length < 30) errors.push("responsive image source coverage is incomplete");
  for (const entry of Object.values(responsiveManifest.sources || {})) {
    for (const variants of Object.values(entry.variants || {})) {
      if (!fs.existsSync(path.join(root, variants.webp))) errors.push(`missing responsive WebP: ${variants.webp}`);
      if (!fs.existsSync(path.join(root, variants.avif))) errors.push(`missing responsive AVIF: ${variants.avif}`);
    }
  }
}

const reviewSnapshot = JSON.parse(fs.readFileSync(path.join(root, "data", "review-seo-snapshot.json"), "utf8"));
const approvedReviewCount = Object.values(reviewSnapshot.products || {}).reduce(
  (sum, entry) => sum + Number(entry.review_count || 0),
  0
);
if (approvedReviewCount < 8) errors.push(`review SEO snapshot contains only ${approvedReviewCount} approved reviews`);
for (const slug of Object.keys(reviewSnapshot.products || {})) {
  const html = fs.readFileSync(path.join(root, "products", `${slug}.html`), "utf8");
  if (!html.includes('"aggregateRating"')) errors.push(`AggregateRating missing: ${slug}`);
  if (!html.includes('class="review-card"')) errors.push(`static review card missing: ${slug}`);
}

if (errors.length) {
  console.error("\nFinal release verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  version: "15.1.1",
  htmlPages: htmlFiles.length,
  productPages: htmlFiles.filter((file) => file.includes(`${path.sep}products${path.sep}`)).length,
  categoryPages: (categoryConfig.categories || []).length,
  approvedReviewsPrerendered: approvedReviewCount,
  responsiveImageSources: fs.existsSync(responsiveManifestPath)
    ? Object.keys(JSON.parse(fs.readFileSync(responsiveManifestPath, "utf8")).sources || {}).length
    : 0,
  centralProductSource: true,
  atmosphereOS: true,
  centralizedCatalogFilters: true,
  scentGuideProfilesTested: 1728,
  journalArticles: 26,
  publicFeaturePages: 2,
  fragranceDnaAxes: 6,
  base: "13.8.36"
}, null, 2));
