import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const snapshot = JSON.parse(
  fs.readFileSync(path.join(root, "data", "review-seo-snapshot.json"), "utf8")
);
const productsDir = path.join(root, "products");
const months = [
  "січ.", "лют.", "бер.", "квіт.", "трав.", "черв.",
  "лип.", "серп.", "вер.", "жовт.", "лист.", "груд."
];

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;"
})[char]);

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} р.`;
};

const pluralReviews = (count) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} відгук`;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return `${count} відгуки`;
  return `${count} відгуків`;
};

const renderBreakdown = (reviews) => [5, 4, 3, 2, 1].map((rating) => {
  const count = reviews.filter((review) => Number(review.rating) === rating).length;
  const width = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
  return `<div class="reviews-breakdown__row"><span>${rating}</span><span aria-hidden="true">★</span><div class="reviews-breakdown__track"><span style="width:${width}%"></span></div><span>${count}</span></div>`;
}).join("");

const renderReview = (review) => {
  const rating = Math.max(1, Math.min(5, Number(review.rating) || 0));
  const stars = `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
  const photo = review.photo_url
    ? `<img class="review-card__photo" src="${escapeHtml(review.photo_url)}" alt="Фото покупця до відгуку" width="800" height="600" loading="lazy" decoding="async"/>`
    : "";
  const verified = review.verified_purchase
    ? '<span class="verified-badge">Перевірена покупка</span>'
    : "";
  return `<article class="review-card"><div class="review-card__top"><span aria-label="${rating} з 5" class="review-stars">${stars}</span><time datetime="${escapeHtml(review.created_at)}">${formatDate(review.created_at)}</time></div><p class="review-card__text">${escapeHtml(review.review_text)}</p>${photo}<div class="review-card__author"><strong>${escapeHtml(review.customer_name)}</strong>${verified}</div></article>`;
};

let changed = 0;

for (const filename of fs.readdirSync(productsDir).filter((name) => name.endsWith(".html"))) {
  const slug = filename.replace(/\.html$/, "");
  const entry = snapshot.products?.[slug] || null;
  const reviews = entry?.latest_reviews || [];
  const count = Number(entry?.review_count) || 0;
  const average = count ? Number(entry.average_rating) : 0;
  const file = path.join(productsDir, filename);
  let html = fs.readFileSync(file, "utf8");

  html = html.replace(
    /(<script id="productStructuredData" type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
    (_match, open, source, close) => {
      const data = JSON.parse(source);
      delete data.aggregateRating;
      delete data.review;
      if (count) {
        data.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: average,
          reviewCount: count,
          bestRating: 5,
          worstRating: 1
        };
        data.review = reviews.map((review) => ({
          "@type": "Review",
          author: { "@type": "Person", name: review.customer_name },
          datePublished: String(review.created_at || "").slice(0, 10),
          reviewBody: review.review_text,
          reviewRating: {
            "@type": "Rating",
            ratingValue: Number(review.rating),
            bestRating: 5,
            worstRating: 1
          }
        }));
        if (data.review.length === 1) data.review = data.review[0];
      }
      return `${open}${JSON.stringify(data, null, 2)}${close}`;
    }
  );

  const compact = count
    ? `<div aria-live="polite" class="product-rating-compact has-rating" id="productRatingCompact"><span aria-hidden="true">★★★★★</span> <a href="#reviews">${average.toFixed(1)} · ${pluralReviews(count)}</a></div>`
    : '<div aria-live="polite" class="product-rating-compact is-empty" id="productRatingCompact"><span aria-hidden="true">★★★★★</span> <a href="#reviewForm">Залишити перший відгук</a></div>';
  html = html.replace(
    /<div aria-live="polite" class="product-rating-compact[^"]*" id="productRatingCompact">[\s\S]*?<\/div>/,
    compact
  );

  html = html.replace(
    /<div class="reviews-summary__score" id="reviewsAverage">[\s\S]*?<\/div>/,
    `<div class="reviews-summary__score" id="reviewsAverage">${count ? average.toFixed(1) : "—"}</div>`
  );
  html = html.replace(
    /<p class="reviews-summary__count" id="reviewsCount">[\s\S]*?<\/p>/,
    `<p class="reviews-summary__count" id="reviewsCount">${count ? pluralReviews(count) : "Ще немає відгуків"}</p>`
  );
  html = html.replace(
    /<div class="reviews-breakdown" id="reviewsBreakdown">[\s\S]*?<\/div>\s*<\/aside>/,
    `<div class="reviews-breakdown" id="reviewsBreakdown">${count ? renderBreakdown(reviews) : ""}</div>\n</aside>`
  );
  html = html.replace(
    /<p class="reviews-empty"[^>]*id="reviewsEmpty"[^>]*>[\s\S]*?<\/p>/,
    `<p class="reviews-empty"${count ? ' hidden=""' : ""} id="reviewsEmpty">Для цього аромату ще немає відгуків. Ваш може бути першим.</p>`
  );
  html = html.replace(
    /<div class="reviews-list" id="reviewsList">[\s\S]*?<\/div>\s*(?=<div class="review-form-wrap")/,
    `<div class="reviews-list" id="reviewsList">${reviews.map(renderReview).join("")}</div>\n`
  );

  fs.writeFileSync(file, html);
  changed += 1;
}

let ratingCardPages = 0;
for (const file of walkHtml(root)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  html = html.replace(
    /(<article class="product-card" data-product-id="([^"]+)">)([\s\S]*?)(<\/article>)/g,
    (_match, open, slug, body, close) => {
      const entry = snapshot.products?.[slug];
      const cleanBody = body.replace(
        /<div class="product-card__rating[^"]*"[^>]*>[\s\S]*?<\/div>/g,
        ""
      );
      if (!entry) return `${open}${cleanBody}${close}`;
      const count = Number(entry.review_count) || 0;
      const average = Number(entry.average_rating) || 0;
      const rating = `<div class="product-card__rating has-rating" data-product-rating aria-label="Рейтинг товару">★ ${average.toFixed(1)} · ${pluralReviews(count)}</div>`;
      return `${open}${cleanBody.replace(
        /<div class="product-card__meta">/,
        `${rating}<div class="product-card__meta">`
      )}${close}`;
    }
  );
  if (html !== before) {
    fs.writeFileSync(file, html);
    ratingCardPages += 1;
  }
}

console.log(JSON.stringify({
  ok: true,
  productPages: changed,
  productsWithApprovedReviews: Object.keys(snapshot.products || {}).length,
  approvedReviews: Object.values(snapshot.products || {}).reduce(
    (sum, entry) => sum + Number(entry.review_count || 0),
    0
  ),
  ratingCardPages
}, null, 2));

function walkHtml(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkHtml(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}
