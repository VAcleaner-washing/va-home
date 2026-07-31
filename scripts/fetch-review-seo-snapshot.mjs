import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const configSource = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const url = process.env.SUPABASE_URL || configSource.match(/supabase:\s*\{[\s\S]*?url:\s*"([^"]+)"/)?.[1];
const key = process.env.SUPABASE_PUBLISHABLE_KEY || configSource.match(/publishableKey:\s*"([^"]+)"/)?.[1];

if (!url || !key) {
  throw new Error("Supabase URL or publishable key is missing.");
}

const endpoint = new URL("/rest/v1/reviews", url);
endpoint.searchParams.set(
  "select",
  "product_slug,customer_name,rating,review_text,verified_purchase,photo_url,created_at"
);
endpoint.searchParams.set("status", "eq.approved");
endpoint.searchParams.set("order", "product_slug.asc,created_at.desc");

const response = await fetch(endpoint, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json"
  }
});

if (!response.ok) {
  throw new Error(`Approved review request failed: ${response.status} ${await response.text()}`);
}

const rows = await response.json();
const products = {};

for (const row of rows) {
  const slug = String(row.product_slug || "").trim();
  if (!slug) continue;
  products[slug] ||= {
    review_count: 0,
    average_rating: 0,
    verified_count: 0,
    latest_reviews: []
  };
  const entry = products[slug];
  entry.review_count += 1;
  entry.average_rating += Number(row.rating) || 0;
  entry.verified_count += row.verified_purchase ? 1 : 0;
  entry.latest_reviews.push({
    rating: Number(row.rating),
    photo_url: row.photo_url || null,
    created_at: row.created_at,
    review_text: row.review_text,
    customer_name: row.customer_name,
    verified_purchase: Boolean(row.verified_purchase)
  });
}

for (const entry of Object.values(products)) {
  entry.average_rating = Number((entry.average_rating / entry.review_count).toFixed(2));
  entry.latest_reviews = entry.latest_reviews.slice(0, 10);
}

const snapshot = {
  generated_at: new Date().toISOString(),
  source: "Supabase approved reviews",
  products
};

fs.writeFileSync(
  path.join(root, "data", "review-seo-snapshot.json"),
  `${JSON.stringify(snapshot, null, 2)}\n`
);

console.log(JSON.stringify({
  ok: true,
  products: Object.keys(products).length,
  reviews: rows.length
}, null, 2));
