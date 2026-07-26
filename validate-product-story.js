#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PRODUCTS_DIR = path.join(ROOT, 'products');
const STORY_DIR = path.join(ROOT, 'images', 'product-story');
const OPTIONAL = new Set(['discovery.webp']);
const REQUIRED = [
  'hero.webp',
  'macro.webp',
  'interior.webp',
  'detail.webp',
  'atmosphere.webp',
  'top.webp',
  'heart.webp',
  'base.webp'
];

const errors = new Set();
const warnings = new Set();

function fail(message) { errors.add(message); }
function warn(message) { warnings.add(message); }
function exists(filePath) { return fs.existsSync(filePath); }

if (!exists(PRODUCTS_DIR)) fail('Відсутня папка products/.');
if (!exists(STORY_DIR)) fail('Відсутня папка images/product-story/.');

const productSlugs = exists(PRODUCTS_DIR)
  ? fs.readdirSync(PRODUCTS_DIR)
      .filter((name) => name.endsWith('.html'))
      .map((name) => path.basename(name, '.html'))
      .sort()
  : [];

const storySlugs = exists(STORY_DIR)
  ? fs.readdirSync(STORY_DIR)
      .filter((name) => fs.statSync(path.join(STORY_DIR, name)).isDirectory())
      .sort()
  : [];

for (const slug of productSlugs) {
  const folder = path.join(STORY_DIR, slug);
  if (!exists(folder)) {
    fail(`${slug}: відсутня папка images/product-story/${slug}/`);
    continue;
  }

  const files = fs.readdirSync(folder)
    .filter((name) => fs.statSync(path.join(folder, name)).isFile());
  const fileSet = new Set(files);

  for (const required of REQUIRED) {
    if (!fileSet.has(required)) {
      fail(`${slug}: відсутній ${required}`);
    }
  }

  for (const file of files) {
    if (file !== file.toLowerCase()) {
      fail(`${slug}: назва не lowercase — ${file}`);
    }
    const ext = path.extname(file).toLowerCase();
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      fail(`${slug}: старий формат зображення — ${file}`);
    }
    if (ext && ext !== '.webp') {
      warn(`${slug}: сторонній файл у product-story — ${file}`);
    }
    if (!REQUIRED.includes(file) && ext === '.webp' && !OPTIONAL.has(file)) {
      warn(`${slug}: додатковий WebP-файл — ${file}`);
    }
  }

  const htmlPath = path.join(PRODUCTS_DIR, `${slug}.html`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const refs = [...html.matchAll(/(?:\.\.\/|https:\/\/vahome\.com\.ua\/)?images\/product-story\/([^/"'\s]+)\/([^?"'\s<]+)/g)];
  for (const match of refs) {
    const refSlug = match[1];
    const refFile = match[2];
    const target = path.join(STORY_DIR, refSlug, refFile);
    if (!exists(target)) {
      fail(`${slug}.html: посилання на відсутній файл images/product-story/${refSlug}/${refFile}`);
    }
    if (refSlug !== refSlug.toLowerCase() || refFile !== refFile.toLowerCase()) {
      fail(`${slug}.html: шлях має неправильний регістр — ${refSlug}/${refFile}`);
    }
  }
}

for (const slug of storySlugs) {
  if (!productSlugs.includes(slug)) {
    warn(`images/product-story/${slug}/ не має відповідної products/${slug}.html`);
  }
}

console.log('VA HOME — product-story release validation');
console.log(`Товарних сторінок: ${productSlugs.length}`);
console.log(`Папок product-story: ${storySlugs.length}`);
console.log(`Обов’язкових файлів на аромат: ${REQUIRED.length}`);

if (warnings.size) {
  console.log('\nПОПЕРЕДЖЕННЯ:');
  [...warnings].sort().forEach((item) => console.log(`- ${item}`));
}

if (errors.size) {
  console.error(`\nПОМИЛКИ (${errors.size}):`);
  [...errors].sort().forEach((item) => console.error(`- ${item}`));
  console.error('\nРЕЛІЗ ЗАБЛОКОВАНО: виправте помилки й запустіть перевірку повторно.');
  process.exit(1);
}

console.log('\nOK: структура product-story повна й узгоджена.');
process.exit(0);
