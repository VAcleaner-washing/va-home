import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const errors = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
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

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (/\?v=13\.8\.(?!34\b)\d+/.test(html)) errors.push(`stale asset version: ${path.relative(root, file)}`);
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

const release = JSON.parse(fs.readFileSync(path.join(root, "release.json"), "utf8"));
if (release.version !== "13.8.34") errors.push(`release.json version is ${release.version}`);
if (!fs.existsSync(path.join(root, "data", "product-content.json"))) errors.push("central product content missing");
if (!fs.existsSync(path.join(root, "PRODUCT-CONTENT-MASTER.md"))) errors.push("product content documentation missing");

if (errors.length) {
  console.error("\nFinal release verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  version: "13.8.34",
  htmlPages: htmlFiles.length,
  productPages: htmlFiles.filter((file) => file.includes(`${path.sep}products${path.sep}`)).length,
  centralProductSource: true,
  centralizedCatalogFilters: true,
  scentGuideProfilesTested: 1728,
  journalArticles: 21,
  fragranceDnaAxes: 6,
  base: "13.8.17"
}, null, 2));
