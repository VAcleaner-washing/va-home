import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const publicCodeFiles = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "images", "fonts"].includes(entry.name)) continue;
      collect(fullPath);
      continue;
    }
    if (!/\.(?:html|js|mjs|ts|json|md|txt|sql|xml|webmanifest)$/i.test(entry.name)) continue;
    if (relativePath === "scripts/verify-payment-boundary.mjs") continue;
    publicCodeFiles.push(relativePath);
  }
}

collect(root);

for (const relativePath of publicCodeFiles) {
  const source = read(relativePath);
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/MONO_ACQUIRING_TOKEN\s*[:=]\s*["'][^"'${}<]{12,}["']/i.test(line)) {
      errors.push(`${relativePath}:${index + 1} contains a hard-coded acquiring secret`);
    }
    if (/\bX-Token\b\s*[:=]\s*["'][^"'${}<]{12,}["']/i.test(line)) {
      errors.push(`${relativePath}:${index + 1} contains a hard-coded merchant token`);
    }
  });
}

const cartHtml = read("cart.html");
const cartJs = read("js/cart.js");

if (/value=["']card_online["']/i.test(cartHtml)) {
  errors.push("cart.html exposes card_online before the provider flow is production-ready");
}

if (/api\.monobank\.ua|merchant\/invoice|\bX-Token\b/i.test(cartHtml + "\n" + cartJs)) {
  errors.push("public checkout code contains a direct acquiring API integration");
}

if (!cartHtml.includes('value="bank_transfer"') || !cartHtml.includes('value="cash_on_delivery"')) {
  errors.push("cart.html must retain the two approved production payment methods");
}

if (errors.length) {
  console.error("PAYMENT SAFETY: FAIL");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("PAYMENT SAFETY: PASS");
console.log("- no hard-coded acquiring token detected");
console.log("- card_online is not exposed in checkout");
console.log("- browser code does not call the acquiring API directly");
console.log("- bank transfer and cash on delivery remain available");
