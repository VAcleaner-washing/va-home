#!/usr/bin/env python3
"""Development helper: report missing product-story assets. Not loaded by the website."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "images" / "product-gallery"
STORY = ROOT / "images" / "product-story"
REQUIRED = ("hero", "macro", "interior", "detail")
for folder in sorted(p for p in PRODUCTS.iterdir() if p.is_dir()):
    missing=[]
    for key in REQUIRED:
        if not any((STORY/folder.name/name).exists() for name in (f"{key}.webp", f"{key.capitalize()}.webp")):
            missing.append(f"{key}.webp")
    status = "✓" if not missing else "✗"
    detail = "готово" if not missing else "немає: " + ", ".join(missing)
    print(f"{status} {folder.name}: {detail}")
