import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const widths = [640, 960, 1280];
const fixedSources = [
  "images/home/hero-main.webp",
  "images/home/hero-discovery.webp",
  "images/home/hero-noir.webp",
  "images/pages/about-hero.webp",
  "images/pages/catalog-hero.webp",
  "images/pages/collections-hero.webp",
  "images/pages/discovery-hero.webp",
  "images/pages/journal-hero.webp",
  "images/pages/scent-guide-hero.webp",
  "images/journal/aromat-dlya-spalni.webp",
  "images/journal/aromadyfuzor-dlya-vitalni.webp",
  "images/journal/aromadyfuzor-dlya-vannoi.webp",
  "images/journal/premialnyi-aromadyfuzor-u-podarunok.webp",
  "images/journal/hotelni-aromaty-dlya-domu.webp",
  "images/product-story/pure-zen/interior.webp",
  "images/product-story/pure-imagination/interior.webp",
  "images/product-story/mineral-salt/interior.webp",
  "images/product-story/hotel-luxe/interior.webp"
];

const productHeroes = fs.readdirSync(path.join(root, "images", "product-story"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `images/product-story/${entry.name}/hero.webp`)
  .filter((relative) => fs.existsSync(path.join(root, relative)));

const sources = [...new Set([...fixedSources, ...productHeroes])]
  .filter((relative) => fs.existsSync(path.join(root, relative)));

const variantPath = (relative, width, extension) => {
  const parsed = path.parse(relative);
  return path.join(parsed.dir, `${parsed.name}-${width}.${extension}`).replaceAll("\\", "/");
};

const manifest = {};

for (const relative of sources) {
  const source = path.join(root, relative);
  const metadata = await sharp(source).metadata();
  const sourceWidth = Number(metadata.width) || 0;
  const availableWidths = widths.filter((width) => width < sourceWidth);
  if (!availableWidths.length) continue;

  manifest[relative] = { width: sourceWidth, variants: {} };
  for (const width of availableWidths) {
    const webpRelative = variantPath(relative, width, "webp");
    const avifRelative = variantPath(relative, width, "avif");
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5, smartSubsample: true })
      .toFile(path.join(root, webpRelative));
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .avif({ quality: 52, effort: 5, chromaSubsampling: "4:2:0" })
      .toFile(path.join(root, avifRelative));
    manifest[relative].variants[width] = {
      webp: webpRelative,
      avif: avifRelative
    };
  }
}

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

let htmlUpdates = 0;
for (const file of walk(root).filter((candidate) => candidate.endsWith(".html"))) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
    if (!src || /\ssrcset=/.test(tag)) return tag;
    const clean = src.split("?")[0].split("#")[0];
    const absolute = clean.startsWith("/")
      ? path.join(root, clean)
      : path.resolve(path.dirname(file), clean);
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    const entry = manifest[relative];
    if (!entry) return tag;
    const candidates = Object.entries(entry.variants)
      .map(([width, variants]) => {
        const ref = path.relative(path.dirname(file), path.join(root, variants.webp)).replaceAll("\\", "/");
        return `${ref.startsWith(".") ? ref : `./${ref}`} ${width}w`;
      });
    const originalWidth = entry.width;
    candidates.push(`${src} ${originalWidth}w`);
    const sizes = /product-card__/.test(tag)
      ? "(max-width: 680px) 100vw, (max-width: 980px) 50vw, 33vw"
      : /id="productMainImage"/.test(tag)
        ? "(max-width: 980px) 100vw, 50vw"
        : "100vw";
    return tag.replace(/\ssrc="/, ` srcset="${candidates.join(", ")}" sizes="${sizes}" src="`);
  });
  if (html !== before) {
    fs.writeFileSync(file, html);
    htmlUpdates += 1;
  }
}

fs.writeFileSync(
  path.join(root, "data", "responsive-images.json"),
  `${JSON.stringify({
    generated_at: new Date().toISOString(),
    widths,
    sources: manifest
  }, null, 2)}\n`
);

console.log(JSON.stringify({
  ok: true,
  sourceImages: Object.keys(manifest).length,
  generatedFiles: Object.values(manifest).reduce(
    (sum, entry) => sum + Object.keys(entry.variants).length * 2,
    0
  ),
  htmlPagesUpdated: htmlUpdates
}, null, 2));
