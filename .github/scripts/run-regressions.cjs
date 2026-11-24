'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '../..');
const suites = [
  ['admin-regressions.test.cjs', 4],
  ['payment-flow.test.cjs', 4],
  ['product-revenue.test.cjs', 6],
  ['promo-access.test.cjs', 3],
  ['server-checkout.test.cjs', 2],
];
const started = performance.now();
let passed = 0;
let failed = false;
const discovered = fs.readdirSync(root).filter(f => f.endsWith('.test.cjs')).sort();
if (JSON.stringify(discovered) !== JSON.stringify(suites.map(([f]) => f).sort())) {
  console.error('Regression discovery differs from the reviewed five-suite manifest. Review additions/removals explicitly.');
  process.exit(1);
}
for (const [file, expected] of suites) {
  // Direct require avoids file-level-only discovery; TAP proves each named scenario.
  const result = spawnSync(process.execPath, ['--test-reporter=tap', '-e', 'require(process.argv[1])', path.join(root, file)], {
    cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024,
  });
  console.log(`\n=== ${file} ===`);
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  const count = name => Number((result.stdout || '').match(new RegExp(`^# ${name} (\\d+)\\r?$`, 'm'))?.[1] ?? NaN);
  const ok = !result.error && !result.signal && result.status === 0
    && count('tests') === expected && count('pass') === expected
    && ['fail', 'cancelled', 'skipped', 'todo'].every(name => count(name) === 0);
  if (!ok) {
    failed = true;
    console.error(`FAIL: ${file}: expected ${expected} passing named tests, no skips/todos/cancellations; exit=${result.status}, signal=${result.signal || 'none'}`);
    if (result.error) console.error(result.error.message);
  } else passed += expected;
}
const durationMs = Math.round(performance.now() - started);
const summary = `Regression: ${failed ? 'FAIL' : 'PASS'}; suites=${suites.length}; passed=${passed}/19; duration_ms=${durationMs}; node=${process.version}`;
console.log(`\n${summary}`);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${summary}\n`);
process.exitCode = failed ? 1 : 0;
