from pathlib import Path
import re, sys
root=Path(__file__).resolve().parents[1]
text=(root/'js/products.js').read_text(encoding='utf-8')
ids=re.findall(r'"id"\s*:\s*"([^"]+)"', text)
slots=['hero','macro','interior','detail']
failed=False
for pid in ids:
    gallery=root/f'images/product-gallery/{pid}/hero.webp'
    missing=[s for s in slots if not (root/f'images/product-story/{pid}/{s}.webp').exists()]
    print(('✓' if gallery.exists() else '✗'),pid,'| story missing:',', '.join(missing) if missing else 'none')
    failed |= not gallery.exists()
refs=[]
for p in list(root.rglob('*.html'))+list((root/'js').glob('*.js')):
    t=p.read_text(encoding='utf-8',errors='ignore')
    if 'images/products/' in t: refs.append(str(p.relative_to(root)))
print('old runtime refs:', refs or 'none')
sys.exit(1 if failed or refs else 0)
