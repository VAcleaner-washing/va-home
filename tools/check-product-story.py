#!/usr/bin/env python3
"""Development helper: report missing required product-story assets."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PRODUCT_PAGES = ROOT / "products"
STORY = ROOT / "images" / "product-story"
REQUIRED = ("hero.webp", "macro.webp", "interior.webp", "detail.webp", "atmosphere.webp", "top.webp", "heart.webp", "base.webp")
failed = False
for page in sorted(PRODUCT_PAGES.glob("*.html")):
    slug = page.stem
    folder = STORY / slug
    missing = [name for name in REQUIRED if not (folder / name).is_file()]
    status = "✓" if not missing else "✗"
    detail = "готово" if not missing else "немає: " + ", ".join(missing)
    print(f"{status} {slug}: {detail}")
    failed = failed or bool(missing)
raise SystemExit(1 if failed else 0)
