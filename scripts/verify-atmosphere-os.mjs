import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const mustExist = [
  "room-ritual.html",
  "private-preview.html",
  "css/site-room-ritual.css",
  "css/site-private-preview.css",
  "js/room-ritual.js",
  "js/private-preview.js",
  "js/scent-profile.js",
  "supabase/migrations/20260727_atmosphere_os.sql",
  "supabase/migrations/20260727_atomic_promo_order_reservation.sql",
  "supabase/migrations/20260727_fix_discovery_credit_code.sql",
  "supabase/migrations/20260727_discovery_credit_tier_amounts.sql",
  "supabase/functions/send-status-email/index.ts",
  "supabase/functions/issue-welcome-credit/index.ts",
  "supabase/migrations/20260727_welcome_credit_after_scent_profile.sql",
  "supabase/migrations/20260727_enforce_welcome_credit_first_purchase.sql"
];
for (const file of mustExist) if (!exists(file)) errors.push(`missing ${file}`);

const accountHtml = read("account.html");
const accountJs = read("js/account.js");
const profileJs = read("js/scent-profile.js");
const guideJs = read("js/scent-guide.js");
const ritualHtml = read("room-ritual.html");
const ritualJs = read("js/room-ritual.js");
const previewHtml = read("private-preview.html");
const previewJs = read("js/private-preview.js");
const productJs = read("js/product.js");
const migration = read("supabase/migrations/20260727_atmosphere_os.sql");
const promoMigration = read("supabase/migrations/20260727_atomic_promo_order_reservation.sql");
const creditTierMigration = read("supabase/migrations/20260727_discovery_credit_tier_amounts.sql");
const statusEmail = read("supabase/functions/send-status-email/index.ts");
const robots = read("robots.txt");
const sitemap = read("sitemap.xml");
const sw = read("service-worker.js");
const adminHtml = read("admin/index.html");
const adminJs = read("js/admin.js");

for (const token of [
  'data-account-tab="atmosphere"',
  'id="accountAtmosphere"',
  'id="accountScentProfile"',
  'id="accountRoomRitual"',
  'id="accountCredits"',
  'id="accountPrivatePreview"',
  'Повторити цей аромат'
]) if (!accountHtml.includes(token)) errors.push(`account.html missing ${token}`);

for (const token of [
  "addOrderItemsToCart",
  "loadScentProfileCard",
  "loadSavedRoomRitual",
  "loadDiscoveryCredits",
  "loadWelcomeCredit",
  "renderCreditSection",
  "loadPrivatePreviewStatus",
  "loadAtmosphereHub"
]) if (!accountJs.includes(token)) errors.push(`account.js missing ${token}`);

for (const token of [
  "va_home_scent_profile_v14",
  "user_scent_profiles",
  "match_scores",
  "scent-match-badge",
  "productProfileMatch",
  "window.VAScentProfile"
]) if (!profileJs.includes(token)) errors.push(`scent-profile.js missing ${token}`);

for (const token of ["buildPersistentProfile", "VAScentProfile.save", "match_scores", "recommendation_ids"]) {
  if (!guideJs.includes(token)) errors.push(`scent-guide persistence missing ${token}`);
}

for (const token of [
  'id="roomRitualForm"',
  'name="room"',
  'name="area"',
  'name="presence"',
  'name="placement"',
  'meta name="robots" content="index,follow'
]) if (!ritualHtml.includes(token)) errors.push(`Room Ritual page missing ${token}`);
for (const token of ["reedSetupByArea", "70–120 см", "24–48 годин", "va_home_room_ritual_v14", "room-ritual-select__trigger", "room-ritual-stepper", "Переглянути в кабінеті"]) {
  if (!ritualJs.includes(token)) errors.push(`Room Ritual engine missing ${token}`);
}
if (!productJs.includes("room-ritual.html?product=")) errors.push("product page does not link to Room Ritual");
if (!sitemap.includes("/room-ritual.html")) errors.push("Room Ritual missing from sitemap");

for (const token of [
  'meta name="robots" content="noindex,nofollow,noarchive"',
  'id="privatePreviewState"',
  'id="privatePreviewGrid"'
]) if (!previewHtml.includes(token)) errors.push(`Private Preview page missing ${token}`);
for (const token of ["private_releases", "preview_starts_at", "public_starts_at", "data-private-cart"]) {
  if (!previewJs.includes(token)) errors.push(`Private Preview engine missing ${token}`);
}
if (!robots.includes("Disallow: /private-preview.html")) errors.push("Private Preview is not blocked in robots.txt");
if (!sw.includes("private-preview")) errors.push("Private Preview is not protected from PWA caching");
for (const token of ['data-tab="releases"', 'id="releasesTab"', 'id="releaseDialog"']) if (!adminHtml.includes(token)) errors.push(`Admin Private Releases missing ${token}`);
for (const token of ["renderReleases", "saveRelease", "private_releases", "48*60*60*1000"]) if (!adminJs.includes(token)) errors.push(`Admin Private Releases engine missing ${token}`);

for (const token of [
  "create table if not exists public.user_scent_profiles",
  "create table if not exists public.discovery_credits",
  "create table if not exists public.private_releases",
  "Customers read own scent profile",
  "Customers read own discovery credits",
  "Members see private preview",
  "issue_discovery_credit_for_order",
  "interval '60 days'",
  "usage_limit",
  "customer_email"
]) if (!migration.includes(token)) errors.push(`Atmosphere OS migration missing ${token}`);
if (migration.includes("gen_random_bytes(6)")) errors.push("Discovery Credit still uses unavailable gen_random_bytes");
if (!promoMigration.includes("mark_personal_credit_used")) errors.push("Discovery Credit use-state trigger missing");
for (const token of ["when 'discovery-6' then 150", "when 'discovery-18' then 450", "when 'discovery-17' then 450", "'fixed', credit_amount, 799, 'fragrances'"]) {
  if (!creditTierMigration.includes(token)) errors.push(`Discovery Credit tier migration missing ${token}`);
}

for (const token of [
  "issue_discovery_credit_for_order",
  "discovery_credits",
  "Discovery Credit",
  "money(credit.amount)",
  "notified_at"
]) if (!statusEmail.includes(token)) errors.push(`completed-order email missing ${token}`);


const discoveryHtml = read("discovery-set.html");
for (const token of ["150 грн за набір із 6 композицій", "450 грн за повний набір із 18", "діятиме 60 днів", "автоматично з’явиться в кабінеті"]) {
  if (!discoveryHtml.includes(token)) errors.push(`Discovery Set copy missing ${token}`);
}
if (/30 дн|протягом 30|діє 30/.test(discoveryHtml)) errors.push("Discovery Set still contains stale 30-day credit copy");

for (const token of ["WELCOME CREDIT", "100 грн на ваш перший аромат", "guideWelcomeCredit"]) {
  if (!read("scent-guide.html").includes(token)) errors.push(`Welcome Credit UI missing ${token}`);
}
for (const token of ["issueWelcomeCredit", "issue-welcome-credit"]) {
  if (!read("js/supabase-api.js").includes(token)) errors.push(`Welcome Credit client missing ${token}`);
}
for (const token of ["Розміщення", "Догляд", "Корекція", "Повторна оцінка", "24–48 годин"]) {
  if (!accountJs.includes(token)) errors.push(`Expanded account Room Ritual missing ${token}`);
}

const productPages = fs.readdirSync(path.join(root, "products")).filter((name) => name.endsWith(".html"));
for (const name of productPages) {
  const html = read(`products/${name}`);
  if (!html.includes("js/scent-profile.js?v=14.0.0")) errors.push(`${name}: Personal Scent Profile script missing`);
}

if (errors.length) {
  console.error("Atmosphere OS verification failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  version: "14.0.0",
  repeatAtmosphere: true,
  personalScentProfile: true,
  discoveryCreditUAH: { discovery6: 150, discovery18: 450 },
  discoveryCreditValidityDays: 60,
  roomRitual: true,
  privatePreview: true,
  productProfileCoverage: productPages.length
}, null, 2));
