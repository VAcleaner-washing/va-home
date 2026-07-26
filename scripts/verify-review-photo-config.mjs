import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = {
  client: path.join(root, 'js', 'reviews.js'),
  edge: path.join(root, 'supabase', 'functions', 'submit-review', 'index.ts'),
  migration: path.join(root, 'supabase', 'migrations', '20260726_review_photo_storage_10mb.sql')
};

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [
  [files.client, /MAX_PHOTO_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/, 'client photo limit is not 10 MB'],
  [files.edge, /MAX_PHOTO_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/, 'Edge Function photo limit is not 10 MB'],
  [files.edge, /REVIEW_PHOTO_BUCKET\s*=\s*["']review-photos["']/, 'Edge Function bucket name is inconsistent'],
  [files.migration, /10485760/, 'Storage migration does not set 10 MB'],
  [files.migration, /'review-photos'/, 'Storage migration bucket name is inconsistent'],
  [files.migration, /image\/jpeg[\s\S]*image\/png[\s\S]*image\/webp/, 'Storage migration MIME types are incomplete']
];

const failures = [];
for (const [file, pattern, message] of checks) {
  if (!fs.existsSync(file)) {
    failures.push(`Missing file: ${path.relative(root, file)}`);
    continue;
  }
  if (!pattern.test(read(file))) failures.push(message);
}

if (failures.length) {
  console.error('Review photo configuration check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Review photo configuration is synchronized: client, Edge Function and Storage migration all use 10 MB.');
