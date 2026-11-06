const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

async function run(saved, responses) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', hidden: false, classList: { add() {}, toggle() {} }, addEventListener() {} });
    return nodes.get(id);
  };
  const storage = new Map(saved ? [['vahome_last_order', JSON.stringify(saved)]] : []);
  const calls = [];
  let ready;
  const timers = [];
  const context = {
    URL, URLSearchParams, console, setTimeout: fn => timers.push(fn),
    location: { search: '?payment=return&order=NEW&token=original', href: 'https://example.com/thank-you.html?payment=return&order=NEW&token=original', assign() {} },
    history: { replaceState() {} },
    sessionStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
    document: { getElementById: node, querySelector: () => node('grid'), addEventListener: (_, fn) => { ready = fn; } },
    window: { VAHomeSupabase: { cardPayment: async payload => { calls.push(payload); return responses.shift(); } } }
  };
  vm.runInNewContext(fs.readFileSync(__dirname + '/js/thank-you.js', 'utf8'), context);
  ready();
  await new Promise(resolve => setImmediate(resolve));
  return { calls, nodes, timers, order: JSON.parse(storage.get('vahome_last_order')) };
}

test('Mono return verifies payment without browser order storage', async () => {
  const result = await run(null, [{ payment_status: 'paid' }]);
  assert.equal(result.calls[0].order_number, 'NEW');
  assert.equal(result.order.paymentStatus, 'paid');
});

test('Mono return does not update an unrelated saved order', async () => {
  const result = await run({ orderNumber: 'OLD', paymentMethod: 'bank_transfer' }, [{ payment_status: 'paid' }]);
  assert.equal(result.order.orderNumber, 'NEW');
  assert.equal(result.calls[0].order_number, 'NEW');
});

test('retry preserves rotated token for subsequent attempts', async () => {
  const result = await run({ orderNumber: 'NEW', paymentMethod: 'card_online', paymentRetryRequired: true }, [
    { payment_status: 'pending' },
    { payment_status: 'failed', return_token: 'rotated' },
    { payment_status: 'pending', payment_url: 'https://example.com/pay' }
  ]);
  assert.equal(result.order.paymentReturnToken, 'rotated');
  await result.nodes.get('retryCardPaymentBtn').onclick();
  assert.equal(result.calls[2].token, 'rotated');
});

test('pending payment is checked again and polling stops after paid', async () => {
  const result = await run(null, [{ payment_status: 'pending', payment_url: 'https://example.com/pay' }, { payment_status: 'paid' }]);
  assert.equal(result.timers.length, 1);
  await result.timers.shift()();
  assert.equal(result.calls.length, 2);
  assert.equal(result.timers.length, 0);
  assert.match(result.nodes.get('cardPaymentTitle').textContent, /підтверджено/);
});
