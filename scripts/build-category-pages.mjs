import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const content = JSON.parse(fs.readFileSync(path.join(root, "data", "product-content.json"), "utf8"));
const categoryData = JSON.parse(fs.readFileSync(path.join(root, "data", "category-pages.json"), "utf8"));
const reviewSnapshot = JSON.parse(
  fs.readFileSync(path.join(root, "data", "review-seo-snapshot.json"), "utf8")
);
const outputDir = path.join(root, "categories");
fs.mkdirSync(outputDir, { recursive: true });

const collectionById = Object.fromEntries(content.collections.map((item) => [item.id, item]));
const productById = Object.fromEntries(content.products.map((item) => [item.id, item]));
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[char]);
const reviewLabel = (count) => {
  const value = Number(count) || 0;
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return "відгук";
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "відгуки";
  return "відгуків";
};

const productCard = (product, index) => {
  const collection = collectionById[product.collection];
  const rating = reviewSnapshot.products?.[product.id];
  const ratingHtml = rating
    ? `<div class="product-card__rating has-rating" data-product-rating aria-label="Рейтинг товару">★ ${Number(rating.average_rating).toFixed(1)} · ${rating.review_count} ${reviewLabel(rating.review_count)}</div>`
    : "";
  return `<article class="product-card" data-product-id="${product.id}">
  <a aria-label="${escapeHtml(product.name)}" class="product-card__media media-zoom" href="../products/${product.id}.html">
    <img alt="${escapeHtml(product.name)} — аромадифузор VA HOME" class="product-card__image" decoding="async" height="1254" loading="${index < 3 ? "eager" : "lazy"}" src="../${product.images.main}" width="1254"/>
  </a>
  <div class="product-card__body">
    <span class="product-card__collection">${escapeHtml(collection.name)}</span>
    <a href="../products/${product.id}.html"><h3 class="product-card__name">${escapeHtml(product.name)}</h3></a>
    <p class="product-card__desc">${escapeHtml(product.shortDescription)}</p>
    ${ratingHtml}
    <div class="product-card__meta"><span>${escapeHtml(collection.volume)}</span><span class="product-card__price">${collection.price}&nbsp;грн</span></div>
  </div>
  <div class="product-card__actions">
    <a class="btn btn-secondary btn-block" href="../products/${product.id}.html">Детальніше</a>
    <button aria-label="Додати ${escapeHtml(product.name)} у кошик" class="btn btn-primary product-card__cart-btn" data-add-to-cart="${product.id}" type="button">
      <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" viewBox="0 0 24 24" width="20"><path d="M6.5 8.5h11l-.9 10.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3L6.5 8.5z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/></svg>
    </button>
  </div>
</article>`;
};

const schemaFor = (category, products) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `https://vahome.com.ua/categories/${category.slug}.html#page`,
      url: `https://vahome.com.ua/categories/${category.slug}.html`,
      name: category.title,
      description: category.description,
      isPartOf: { "@id": "https://vahome.com.ua/#website" }
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Головна", item: "https://vahome.com.ua/" },
        { "@type": "ListItem", position: 2, name: "Каталог", item: "https://vahome.com.ua/catalog.html" },
        { "@type": "ListItem", position: 3, name: category.title, item: `https://vahome.com.ua/categories/${category.slug}.html` }
      ]
    },
    {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://vahome.com.ua/products/${product.id}.html`,
        name: product.name
      }))
    },
    {
      "@type": "FAQPage",
      mainEntity: category.faq.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer }
      }))
    }
  ]
});

const renderPage = (category) => {
  const products = category.productIds.map((id) => productById[id]).filter(Boolean);
  const cards = products.map(productCard).join("\n");
  const faq = category.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("\n");
  const schema = JSON.stringify(schemaFor(category, products), null, 2).replace(/</g, "\\u003c");
  const description = escapeHtml(category.description);
  const heroBase = category.heroImage.replace(/\.webp$/, "");
  const guideImage = escapeHtml(category.guideImage);
  const guideImagePosition = escapeHtml(category.guideImagePosition || "center");
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<script>document.documentElement.classList.add("va-hero-fonts-loading");</script>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1, viewport-fit=cover" name="viewport"/>
<link as="font" crossorigin="" href="../fonts/cormorant-garamond-cyrillic-500-normal.woff2" rel="preload" type="font/woff2"/>
<link as="font" crossorigin="" href="../fonts/manrope-cyrillic-400-normal.woff2" rel="preload" type="font/woff2"/>
<meta content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://yweluzclearwrazdkahu.supabase.co; font-src 'self'; connect-src 'self' https://yweluzclearwrazdkahu.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';" http-equiv="Content-Security-Policy"/>
<title>${escapeHtml(category.title)} — купити у VA HOME</title>
<meta content="${description}" name="description"/>
<link href="https://vahome.com.ua/categories/${category.slug}.html" rel="canonical"/>
<meta content="index, follow, max-image-preview:large, max-snippet:-1" name="robots"/>
<meta content="website" property="og:type"/>
<meta content="uk_UA" property="og:locale"/>
<meta content="VA HOME" property="og:site_name"/>
<meta content="${escapeHtml(category.title)} — VA HOME" property="og:title"/>
<meta content="${description}" property="og:description"/>
<meta content="https://vahome.com.ua/categories/${category.slug}.html" property="og:url"/>
<meta content="https://vahome.com.ua/${category.heroImage}" property="og:image"/>
<meta content="${escapeHtml(category.title)}" property="og:image:alt"/>
<meta content="summary_large_image" name="twitter:card"/>
<meta content="15.1.1 Production" name="va-home-release"/>
<link href="../favicon/favicon.ico" rel="icon" sizes="any"/>
<link href="../favicon/favicon.svg" rel="icon" type="image/svg+xml"/>
<link href="../css/core.css?v=15.1.1" rel="stylesheet"/>
<link href="../css/site-catalog.css?v=15.1.1" rel="stylesheet"/>
<link href="../css/site-category.css?v=15.1.1" rel="stylesheet"/>
<link href="/manifest.webmanifest" rel="manifest"/>
<meta content="#0b0a08" name="theme-color"/>
<link href="/pwa/apple-touch-icon.png" rel="apple-touch-icon"/>
<style>
.category-hero{background-image:image-set(url("../${heroBase}-1280.avif") type("image/avif"),url("../${heroBase}-1280.webp") type("image/webp"))}
.category-editorial__media img{object-position:${guideImagePosition}}
@media(max-width:680px){.category-hero{background-image:image-set(url("../${heroBase}-640.avif") type("image/avif"),url("../${heroBase}-640.webp") type("image/webp"))}}
</style>
<script id="categoryStructuredData" type="application/ld+json">${schema}</script>
</head>
<body class="category-page">
<div data-active="catalog" data-root="../" id="site-header"></div>
<main id="main-content">
<section class="category-hero">
  <div class="container category-hero__content">
    <p class="eyebrow">${escapeHtml(category.eyebrow)}</p>
    <h1>${escapeHtml(category.title)}</h1>
    <p class="lead">${description}</p>
  </div>
</section>
<section class="section">
  <div class="container category-intro">
    <p class="category-intro__copy">${escapeHtml(category.intro)}</p>
    <div class="category-intro__aside">
      <p class="eyebrow">Не впевнені у виборі?</p>
      <p>Гід ароматів підбере кілька композицій під ваш простір і бажане відчуття.</p>
      <a class="text-link" href="../scent-guide.html">Пройти підбір →</a>
    </div>
  </div>
</section>
<section class="section section--tight category-products">
  <div class="container">
    <div class="category-products__head">
      <div><p class="eyebrow">Добірка VA HOME</p><h2>${escapeHtml(category.selectionTitle)}</h2></div>
      <p>${escapeHtml(category.selectionNote)}</p>
    </div>
    <div class="catalog-grid">${cards}</div>
  </div>
</section>
<section class="category-editorial" aria-labelledby="${category.slug}-journal-title">
  <div class="container category-editorial__grid">
    <figure class="category-editorial__media">
      <img alt="" decoding="async" height="${category.guideImageHeight}" loading="lazy" src="../${guideImage}" width="${category.guideImageWidth}"/>
    </figure>
    <div class="category-editorial__content">
      <p class="eyebrow">${escapeHtml(category.guideEyebrow)}</p>
      <h2 id="${category.slug}-journal-title">${escapeHtml(category.guideTitle)}</h2>
      <p>${escapeHtml(category.guideExcerpt)}</p>
      <a class="category-editorial__link" href="../${category.guide}">
        <span>${escapeHtml(category.guideCta)}</span><span aria-hidden="true">→</span>
      </a>
    </div>
  </div>
</section>
<section class="section">
  <div class="container category-faq">
    <p class="eyebrow">Коротко про вибір</p>
    <h2>Питання перед покупкою</h2>
    ${faq}
  </div>
</section>
</main>
<div data-root="../" id="site-footer"></div>
<script defer src="../js/config.js?v=15.1.1"></script>
<script defer src="../js/products.js?v=15.1.1"></script>
<script defer src="../js/cart.js?v=15.1.1"></script>
<script defer src="../js/main.js?v=15.1.1"></script>
<script defer src="../js/motion.js?v=15.1.1"></script>
<script defer src="/js/pwa.js?v=15.1.1"></script>
</body>
</html>
`;
};

for (const category of categoryData.categories) {
  fs.writeFileSync(path.join(outputDir, `${category.slug}.html`), renderPage(category));
}

console.log(JSON.stringify({
  ok: true,
  pages: categoryData.categories.length,
  output: path.relative(root, outputDir)
}, null, 2));
