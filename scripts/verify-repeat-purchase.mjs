import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const errors = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

for (const file of [
  'supabase/migrations/20260727_repeat_purchase_email_campaign.sql',
  'supabase/functions/process-repeat-purchase/index.ts',
  'supabase/functions/marketing-unsubscribe/index.ts',
  'supabase/functions/create-order/index.ts',
  'supabase/functions/validate-promo/index.ts',
]) if (!exists(file)) errors.push(`missing ${file}`);

const cart = read('cart.html');
const cartJs = read('js/cart.js');
const privacy = read('privacy.html');
const migration = read('supabase/migrations/20260727_repeat_purchase_email_campaign.sql');
const createOrder = read('supabase/functions/create-order/index.ts');
const validatePromo = read('supabase/functions/validate-promo/index.ts');
const processor = read('supabase/functions/process-repeat-purchase/index.ts');
const unsubscribe = read('supabase/functions/marketing-unsubscribe/index.ts');

if (!cart.includes('id="marketingConsent"') || /id="marketingConsent"[^>]*required/.test(cart)) errors.push('marketing consent must exist and remain optional');
if (!cartJs.includes('marketing_consent: Boolean(form.elements.marketingConsent?.checked)')) errors.push('checkout does not submit marketing consent');
if (!cartJs.includes('customer_email:form?.elements?.customerEmail')) errors.push('promo validation does not submit customer email');
if (!privacy.includes('Персональні пропозиції') || !privacy.includes('відписки')) errors.push('privacy disclosure missing');

for (const token of ['marketing_preferences','repeat_purchase_campaigns','55 days','pg_cron','pg_net','repeat_campaign_sent_at']) {
  if (!migration.includes(token)) errors.push(`migration missing ${token}`);
}
if (/[A-Za-z0-9_-]{35,}/.test(migration.match(/x-cron-secret[^\n]*/)?.[0] || '')) errors.push('plain cron secret appears in migration');
if (!migration.includes('gen_random_bytes(32)')) errors.push('cron secret is not generated at deployment');
if (!createOrder.includes('marketingConsent') || !createOrder.includes('marketing_preferences')) errors.push('create-order marketing consent flow missing');
if (!createOrder.includes('promoRow.customer_email')) errors.push('create-order does not enforce email-bound promos');
if (!validatePromo.includes('email_bound') || !validatePromo.includes('validated_email')) errors.push('validate-promo personal code support missing');

for (const token of ['55 * 24 * 60 * 60 * 1000','discount_value: 100','7 * 24 * 60 * 60 * 1000','Idempotency-Key','List-Unsubscribe','usage_limit: 1','customer_email: email']) {
  if (!processor.includes(token)) errors.push(`processor missing ${token}`);
}
if (!unsubscribe.includes('subscribed: false') || !unsubscribe.includes('Сервісні листи')) errors.push('unsubscribe flow incomplete');

if (errors.length) {
  console.error('Repeat purchase verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, triggerDays: 55, discountUAH: 100, validityDays: 7, consent: 'optional', unsubscribe: true }, null, 2));
