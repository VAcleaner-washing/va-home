import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
const expectedVersion = String(release.version || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(expectedVersion)) throw new Error('Invalid release.json version');

const escapedVersion = expectedVersion.replace(/\./g, '\\.');
const assetVersionPattern = /\?v=(\d+\.\d+\.\d+)/g;
const oldRcPattern = /13\.7\.0 Release Candidate/;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
);

const files = walk(root);
const html = files.filter((file) => file.endsWith('.html'));
const errors = [];

for (const file of html) {
  const source = fs.readFileSync(file, 'utf8');
  if (oldRcPattern.test(source)) errors.push(`old RC meta: ${file}`);

  for (const match of source.matchAll(assetVersionPattern)) {
    if (match[1] !== expectedVersion) {
      errors.push(`stale asset version ${match[1]} (expected ${expectedVersion}): ${file}`);
      break;
    }
  }

  const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(`duplicate id ${[...new Set(duplicates)]}: ${file}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const shortcut of manifest.shortcuts || []) {
  if (!shortcut.url.endsWith('.html')) errors.push(`unsafe PWA shortcut: ${shortcut.url}`);
}

const compare = fs.readFileSync(path.join(root, 'compare.html'), 'utf8');
if (!compare.includes('Content-Security-Policy')) errors.push('compare CSP missing');

const galleryEngine = fs.readFileSync(path.join(root, 'js/gallery-engine.js'), 'utf8');
if (!galleryEngine.includes('product-gallery-stable-fade')) errors.push('stable gallery crossfade missing');
if (!galleryEngine.includes('waitForImage(nextImage)')) errors.push('gallery decode-before-paint guard missing');

for (const file of files.filter((file) => file.endsWith('.js'))) {
  const raw = fs.readFileSync(file, 'utf8');
  const code = raw.replace(/^#!.*\n/, '');
  try {
    new Function(code);
  } catch (error) {
    if (!/\b(?:import|export)\b/.test(code)) errors.push(`JS parse: ${file}: ${error.message}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  html_pages: html.length,
  product_pages: html.filter((file) => file.includes(`${path.sep}products${path.sep}`)).length,
  version: expectedVersion
}, null, 2));
