# VA HOME v13.8.17 — Authenticated checkout prefill

## Scope
- All HTML pages in the archive
- 18 product pages
- Main and Admin PWA manifests/service workers
- Public sitemap and internal links
- Local CSS/JS/image references
- Product JSON-LD and approved-review fallbacks

## Release decisions
- Product lifetime: 8–12 weeks, dependent on reeds, temperature and airflow.
- Reeds: flip only for a temporary intensity boost; frequent flipping accelerates evaporation.
- Reviews: Supabase remains the live source. Static HTML contains an approved-review snapshot for crawlability and graceful degradation.
- PWA: customer and admin apps use independent caches, both versioned 13.8.17.

## Deployment
Upload the complete archive contents to the site root. No new SQL migration or Edge Function deployment is required for this release. The review Storage hardening from v13.8.15 remains included.

- Checkout: when a customer is signed in, the account email is automatically inserted into the checkout form while remaining editable.
