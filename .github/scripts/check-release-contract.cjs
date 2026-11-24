'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '../..');
const started = performance.now();
const errors = [];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const check = (condition, message) => { if (!condition) errors.push(message); };
function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    if (['.git', 'node_modules'].includes(entry.name) || entry.isSymbolicLink()) return [];
    const file = path.posix.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
let checked = 0;
try {
  const files = walk('');
  const release = JSON.parse(read('release.json'));
  const version = release.version;
  check(typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version), 'release.json: expected a semantic numeric version');
  for (const [file, expected] of [
    ['service-worker.js', version], ['admin/service-worker.js', `1.0.0-${version}`],
    ['js/pwa.js', version], ['admin/pwa.js', version],
  ]) {
    check(read(file).match(/\bconst VERSION\s*=\s*["']([^"']+)["']/)?.[1] === expected, `${file}: VERSION differs from release contract`);
  }
  check(/\bconst CACHE_REVISION\s*=\s*["'][^"']+["']/.test(read('service-worker.js')), 'root service worker: missing cache revision');
  for (const [file, scope] of [['manifest.webmanifest', '/'], ['admin/manifest.webmanifest', '/admin/']]) {
    const manifest = JSON.parse(read(file));
    check(manifest.scope === scope && manifest.start_url === scope && manifest.id === scope, `${file}: scope/start_url/id mismatch`);
    for (const icon of manifest.icons || []) check(fs.existsSync(path.join(root, icon.src.replace(/^\//, ''))), `${file}: missing icon`);
  }
  for (const file of files) {
    if (/\.(json|webmanifest)$/.test(file)) { JSON.parse(read(file)); checked++; }
    if (/\.(js|cjs)$/.test(file)) {
      const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8', timeout: 15000 });
      check(!result.error && result.status === 0, `${file}: syntax check failed\n${result.stderr || result.error?.message || ''}`);
      checked++;
    }
    if (file.endsWith('.html') || file === 'admin/service-worker.js') {
      // Static local CSS/JS versioned references, including the admin offline shell.
      const refs = file.endsWith('.html')
        ? [...read(file).matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(m => m[1])
        : [...read(file).matchAll(/["']([^"']+\?v=[^"']+)["']/g)].map(m => m[1]);
      for (const ref of refs) {
        if (/^(?:[a-z]+:|\/\/|#)/i.test(ref)) continue;
        const url = new URL(ref, `https://local.invalid/${file}`);
        if (!/\.(css|js)$/.test(url.pathname)) continue;
        check(fs.existsSync(path.join(root, decodeURIComponent(url.pathname).replace(/^\//, ''))), `${file}: missing local CSS/JS reference`);
        if (url.searchParams.has('v')) {
          // Existing HTML uses release-prefixed cache revisions; worker/app VERSION remains exact.
          const assetVersion = url.searchParams.get('v');
          const suffix = assetVersion.startsWith(`${version}-`) ? assetVersion.slice(version.length + 1) : '';
          check(assetVersion === version || /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(suffix), `${file}: stale CSS/JS release prefix`);
        }
      }
    }
    if (file.startsWith('docs/') && file.endsWith('.md')) {
      // Repository-relative links only; never fetch remote pages or evaluate code.
      const content = read(file).replace(/```[^\n]*\n[\s\S]*?```/g, '');
      for (const match of content.matchAll(/\]\(([^\s)]+)\)/g)) {
        const target = match[1].replace(/^<|>$/g, '');
        if (/^(?:[a-z]+:|\/\/|#)/i.test(target)) continue;
        const local = decodeURIComponent(target.split('#')[0]);
        const resolved = local.startsWith('/') ? path.join(root, local.slice(1)) : path.resolve(root, path.dirname(file), local);
        check(resolved.startsWith(root + path.sep) && fs.existsSync(resolved), `${file}: broken or escaping relative link`);
      }
    }
  }
} catch (error) { errors.push(error.message); }
const summary = `Release contract: ${errors.length ? 'FAIL' : 'PASS'}; checks=${checked}; duration_ms=${Math.round(performance.now() - started)}`;
for (const error of errors) console.error(error);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${summary}\n`);
process.exitCode = errors.length ? 1 : 0;
