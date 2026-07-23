# VA HOME — product story photo system

Each product page uses one folder:

`images/product-story/<product-id>/`

Required filenames:

- `hero.webp` — main product gallery image, recommended 4:5 or square;
- `atmosphere.webp` — wide cinematic banner below the product hero, recommended 16:9;
- `interior.webp` — interior/lifestyle scene used in the ritual section, recommended 4:5 or 16:9;
- `macro.webp` — close product shot for the Formula section, recommended 4:5 or square;
- `detail.webp` — extra close detail and fourth hero-gallery frame, recommended square;
- `top.webp` — visual for top notes, recommended square;
- `heart.webp` — visual for heart notes, recommended square;
- `base.webp` — visual for base notes, recommended square;
- `discovery.webp` — Discovery Set banner, recommended 16:9.

## How it works

The same folder powers both the top gallery and all scenes below the hero.

The top gallery automatically uses:

1. `hero.webp`
2. `interior.webp`
3. `macro.webp`
4. `detail.webp`

The editorial story automatically uses all nine files. Missing files safely fall back to the site's older product and atmosphere images, so products can be migrated one by one.

## Current status

`silk-molecule` contains a complete nine-image set and is the reference implementation.
