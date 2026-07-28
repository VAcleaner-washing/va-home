import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const errors = [];
const chapter4Slugs = [
  "derevni-aromadyfuzory",
  "kvitkovi-aromadyfuzory",
  "svizhi-aromadyfuzory",
  "hotelni-aromaty-dlya-domu",
  "aromadyfuzor-dlya-vitalni",
  "aromadyfuzor-dlya-vannoi"
];
const chapter5Slugs = [
  "ukrainskyi-chy-importnyi-aromadyfuzor",
  "aromadyfuzor-chy-aromatychna-svichka",
  "premialnyi-aromadyfuzor-proty-masmarketu",
  "aromadyfuzor-bez-rizkoho-zapakhu",
  "premialnyi-aromadyfuzor-u-podarunok"
];
const index = fs.readFileSync(path.join(root, "guides", "index.html"), "utf8");
const chapter3Pos = index.indexOf("Chapter III · Living with scent");
const chapter4Pos = index.indexOf("Chapter IV · Scent as interior");
const chapter5Pos = index.indexOf("Chapter V · Choosing with confidence");
if (chapter4Pos < 0) errors.push("Chapter IV missing");
if (chapter5Pos < 0) errors.push("Chapter V missing");
if (chapter3Pos < 0 || chapter4Pos < chapter3Pos) errors.push("Chapter IV must follow Chapter III");
if (chapter4Pos < 0 || chapter5Pos < chapter4Pos) errors.push("Chapter V must follow Chapter IV");
if (!index.includes('"@type":"ItemList"') || !index.includes('"numberOfItems":26')) {
  errors.push("Journal ItemList schema must contain all 26 articles");
}
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const imageSitemap = fs.readFileSync(path.join(root, "image-sitemap.xml"), "utf8");
for (let i = 0; i < chapter4Slugs.length; i++) {
  const slug = chapter4Slugs[i];
  const file = path.join(root, "guides", `${slug}.html`);
  if (!fs.existsSync(file)) { errors.push(`missing article ${slug}`); continue; }
  const html = fs.readFileSync(file, "utf8");
  for (const required of ['rel="canonical"', '@type":"Article"', 'article-lead', 'article-note', 'related-guides', 'va-home-release']) {
    if (!html.includes(required)) errors.push(`${slug} missing ${required}`);
  }
  if (!html.includes(`· ${16 + i}<`)) errors.push(`${slug} has incorrect editorial number`);
  if (!index.includes(`href="${slug}.html"`)) errors.push(`${slug} missing from Journal index`);
  if (!fs.existsSync(path.join(root, "images", "journal", `${slug}.webp`))) errors.push(`${slug} image missing`);
  if (!sitemap.includes(`/guides/${slug}.html`)) errors.push(`${slug} missing from sitemap`);
  if (!imageSitemap.includes(`/images/journal/${slug}.webp`)) errors.push(`${slug} missing from image sitemap`);
}
for (let i = 0; i < chapter5Slugs.length; i++) {
  const slug = chapter5Slugs[i];
  const file = path.join(root, "guides", `${slug}.html`);
  if (!fs.existsSync(file)) { errors.push(`missing article ${slug}`); continue; }
  const html = fs.readFileSync(file, "utf8");
  for (const required of ['rel="canonical"', '@type":"Article"', '@type":"FAQPage"', 'article-lead', 'article-answer', 'article-faq', 'related-guides', 'va-home-release']) {
    if (!html.includes(required)) errors.push(`${slug} missing ${required}`);
  }
  if (!html.includes(`· ${22 + i}<`)) errors.push(`${slug} has incorrect editorial number`);
  if (!index.includes(`href="${slug}.html"`)) errors.push(`${slug} missing from Journal index`);
  if (!fs.existsSync(path.join(root, "images", "journal", `${slug}.webp`))) errors.push(`${slug} image missing`);
  if (!sitemap.includes(`/guides/${slug}.html`)) errors.push(`${slug} missing from sitemap`);
  if (!imageSitemap.includes(`/images/journal/${slug}.webp`)) errors.push(`${slug} missing from image sitemap`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, journalArticles: 26, addedArticles: chapter5Slugs.length, chapterOrder: true }, null, 2));
