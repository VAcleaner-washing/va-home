const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const fs = require('node:fs');

async function checkout(changes = {}) {
  const item = { id: 'signature-relax', name: 'Signature Relax', quantity: 1, unit_price: 799, line_total: 799, selections: [] };
  const saved = { id: 1, client_order_id: 'VA-TEST', customer_name: 'Test Customer', customer_phone: '+380951234567', customer_email: 'test@example.com', customer_city: 'Test City', delivery_details: 'Branch 1', delivery_method: 'Нова пошта — відділення / поштомат', payment_method: 'bank_transfer', items: [item], total_amount: 649, discount_amount: 150, promo_code: 'welcome', confirmation_email_status: 'sent' };
  const tables = [];
  const admin = {
    rpc: async () => ({ data: true }),
    from(table) {
      tables.push(table);
      const result = table === 'orders' ? { data: saved, count: 0 } : { data: { code: 'welcome', active: false, usage_limit: 1, usage_count: 1 } };
      const builder = { select() { return this; }, eq() { return this; }, gte() { return this; }, ilike() { return this; }, maybeSingle: async () => result, then(resolve) { resolve(result); } };
      return builder;
    }
  };
  let handler;
  const source = fs.readFileSync(__dirname + '/supabase/functions/create-order/index.ts', 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => admin, Deno: { env: { get: key => key === 'SUPABASE_URL' ? 'https://example.com' : 'mock-service' }, serve: fn => { handler = fn; } },
    crypto: globalThis.crypto, TextEncoder, btoa, Response, console,
    fetch: async () => { throw new Error('Unexpected external call'); }
  });
  const body = { checkout_request_id: '12345678-1234-1234-1234-123456789abc', customer_name: saved.customer_name, customer_phone: saved.customer_phone, customer_email: saved.customer_email, customer_city: saved.customer_city, delivery_method: 'nova_poshta_branch', delivery_details: saved.delivery_details, payment_method: 'bank_transfer', promo_code: 'welcome', items: [{ id: item.id, quantity: 1 }], ...changes };
  const response = await handler(new Request('https://example.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  return { status: response.status, body: await response.json(), tables };
}

test('same checkout returns saved order even after promo was consumed', async () => {
  const result = await checkout();
  assert.equal(result.status, 200);
  assert.equal(result.body.duplicate_prevented, true);
  assert.equal(result.body.order.total_amount, 649);
  assert.equal(result.tables.includes('promo_codes'), false);
});

test('reusing checkout ID with different items is rejected', async () => {
  const result = await checkout({ items: [{ id: 'signature-relax', quantity: 2 }] });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, 'REQUEST_ID_CONFLICT');
});
