# VA HOME system inventory — provisional

Observed main cd48db717d0bf19af327f8f1e2bae6baf0eabb91, release 16.4.18. Root contains public HTML, css/js/data/products, admin/, pwa/, supabase/, db-changes/, manifest.webmanifest, service-worker.js and release.json. CNAME vahome.com.ua. No live audit performed.
Existing release notes specify transient read retries, single-flight session refresh, user-scoped read-only snapshot with 14-day expiry, explicit logout/access-denial clearing, and no automatic ambiguous write retries. Existing payment-flow tests cover Mono return verification, unrelated order isolation, token rotation and polling. Server-checkout tests cover duplicate prevention and request-ID conflict. Preserve these contracts.
Audit required: canonical order/product/inventory/financial owners, RLS, migrations, webhook and shipping contracts, deployment provenance, PWA identity, design tokens and metrics. Record evidence and owner-approved rules here; do not invent them.
