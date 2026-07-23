# VA HOME v12.0 RC2

## Critical fixes
- Fixed the RC1 stylesheet path on every nested product, guide and admin page. RC1 styles now actually load there.
- Fixed an older broken hero stylesheet path on nested Journal guide pages.
- Added explicit `type="button"` to presentational controls to prevent accidental form submission.
- Added `noopener noreferrer` protection to links that open a new tab.

## Mobile and Safari hardening
- Added horizontal-overflow protection and stable viewport text sizing.
- Added 16 px mobile form controls to prevent unwanted iOS Safari zoom.
- Added safe touch-target rules, modal overscroll containment and anchor offsets.
- Stabilised wishlist 4:5 image rendering and long-title wrapping.
- Added a final comparison-card scroll spacer and stronger mobile containment.

## Accessibility
- Strengthened keyboard focus visibility.
- Added reduced-motion and forced-colour fallbacks.
- Added accessible labels to icon-only close/remove controls.
- Added `aria-current="page"` to matching navigation links at runtime.

## Validation
- Checked all JavaScript sources with `node --check`.
- Audited local HTML asset references, duplicate IDs, image alt text, H1 counts and metadata.
- No product data, prices, checkout logic, Supabase logic, hero design or header design was changed.
