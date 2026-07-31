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
      collect(fullPath); continue;
    }
    if (!/\.(?:html|js|mjs|ts|json|md|txt|sql|xml|webmanifest)$/i.test(entry.name)) continue;
    if (relativePath === "scripts/verify-payment-boundary.mjs") continue;
    publicCodeFiles.push(relativePath);
  }
}
collect(root);
for (const relativePath of publicCodeFiles) {
  const source = read(relativePath);
  source.split(/\r?\n/).forEach((line, index) => {
    if (/MONO_ACQUIRING_TOKEN\s*[:=]\s*["'][^"'${}<]{12,}["']/i.test(line)) errors.push(`${relativePath}:${index + 1} contains a hard-coded acquiring secret`);
    if (/\bX-Token\b\s*[:=]\s*["'][^"'${}<]{12,}["']/i.test(line)) errors.push(`${relativePath}:${index + 1} contains a hard-coded merchant token`);
  });
}
const cartHtml = read("cart.html");
const browserCode = [cartHtml, read("js/cart.js"), read("js/supabase-api.js"), read("js/thank-you.js")].join("\n");
if (!/value=["']card_online["']/i.test(cartHtml)) errors.push("cart.html does not contain the card_online payment option");
if (!/id=["']cardOnlinePaymentOption["'][^>]*hidden/i.test(cartHtml) && !/hidden[^>]*id=["']cardOnlinePaymentOption["']/i.test(cartHtml)) errors.push("card_online must be hidden until server payment-config enables it");
if (/api\.monobank\.ua|merchant\/invoice|\bX-Token\b/i.test(browserCode)) errors.push("browser code contains a direct acquiring API integration");
if (!cartHtml.includes('value="bank_transfer"') || !cartHtml.includes('value="cash_on_delivery"')) errors.push("cart.html must retain bank transfer and cash on delivery");
for (const required of [
  "supabase/functions/create-order/index.ts",
  "supabase/functions/card-payment/index.ts",
  "supabase/functions/payment-config/index.ts",
  "supabase/functions/mono-webhook/index.ts",
  "supabase/migrations/20260731210500_monobank_card_payments.sql"
]) if (!fs.existsSync(path.join(root, required))) errors.push(`${required} is missing`);
const createOrder = read("supabase/functions/create-order/index.ts");
const webhook = read("supabase/functions/mono-webhook/index.ts");
if (!createOrder.includes('card_online') || !createOrder.includes('payment_method')) errors.push("create-order does not accept card_online server-side");
if (!webhook.includes("x-sign") || !(webhook.includes("signatureValid") || webhook.includes("verifySignature"))) errors.push("mono-webhook does not verify X-Sign");
if (errors.length) { console.error("PAYMENT SAFETY: FAIL"); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }
console.log("PAYMENT SAFETY: PASS");
console.log("- no hard-coded acquiring token detected");
console.log("- card option is feature-flagged by payment-config");
console.log("- browser never calls monobank directly");
console.log("- webhook signature verification is present");
console.log("- bank transfer and cash on delivery remain available");
