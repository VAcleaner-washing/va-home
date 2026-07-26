from pathlib import Path
import re, sys
root=Path(__file__).resolve().parents[1]
text=(root/'js/products.js').read_text(encoding='utf-8')
ids=re.findall(r'"id"\s*:\s*"([^"]+)"', text)
failed=False
for pid in ids:
    hero=root/f'images/product-story/{pid}/hero.webp'
    print(('✓' if hero.exists() else '✗'), pid, '| catalog/story hero:', 'present' if hero.exists() else 'missing')
    failed |= not hero.exists()
refs=[]
for p in list(root.rglob('*.html'))+list((root/'js').glob('*.js'))+list(root.glob('*.xml')):
    t=p.read_text(encoding='utf-8',errors='ignore')
    if 'images/product-gallery/' in t: refs.append(str(p.relative_to(root)))
print('product-gallery runtime refs:', refs or 'none')
print('product-gallery directory:', 'present' if (root/'images/product-gallery').exists() else 'absent')
sys.exit(1 if failed or refs or (root/'images/product-gallery').exists() else 0)
