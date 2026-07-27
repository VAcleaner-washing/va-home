# VA HOME v14.0.0 RC6 — Atmosphere OS

## Production state

Supabase migrations for Personal Scent Profile, Discovery Credit and Private Preview have already been applied to project `yweluzclearwrazdkahu`. `send-status-email` is deployed as version 11.

The site archive still contains all migrations and Edge Function sources for backup and future environments.

## Creating a Private Preview release

No fictional release is seeded. Create a record only when a real composition is ready. The normal flow is **Admin → Private Releases → Створити реліз**. The form sets `preview_starts_at` exactly 48 hours before the public date by default.

The SQL example below is retained only as a recovery path.

```sql
insert into public.private_releases (
  slug,
  eyebrow,
  title,
  description,
  product_id,
  image_url,
  preview_starts_at,
  public_starts_at,
  active
) values (
  'real-release-slug',
  'PRIVATE RELEASE · NOIR',
  'Назва реального релізу',
  'Короткий преміальний опис без вигаданих нот.',
  'real-product-id',
  '/images/product-story/real-product-id/hero.webp',
  '2026-10-01T08:00:00Z',
  '2026-10-03T08:00:00Z',
  true
);
```

`preview_starts_at` має бути рівно на 48 годин раніше за `public_starts_at`, якщо використовується заявлена механіка 48H.

## Discovery Credit rules

- створюється лише після статусу `completed`;
- Discovery Set IDs: `discovery-6`, `discovery-18`, legacy `discovery-17`;
- 150 грн для `discovery-6`;
- 450 грн для `discovery-18` і legacy `discovery-17`;
- мінімальна сума 799 грн;
- лише повнорозмірні аромати;
- 60 днів;
- один код на одне Discovery-замовлення;
- один раз і лише для email покупця.

## Rollback

Перед відкатом сайту не видаляйте нові таблиці: старий frontend їх не використовує, а дані профілів і кредитів залишаться безпечними. Для повного backend rollback окремо вимикаються тригер `issue_discovery_credit_on_completion` та RLS-доступ до `private_releases`.


## RC6 production additions

- `welcome_credits` table with RLS for personal Welcome Credit.
- `issue-welcome-credit` Edge Function v1 (JWT required).
- `validate-promo` Edge Function v3 with first-purchase enforcement.
- Order insert trigger prevents Welcome Credit after any prior full-size purchase.
