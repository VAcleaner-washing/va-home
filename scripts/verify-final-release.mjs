import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(root); const html=files.filter(f=>f.endsWith('.html')); const errors=[];
for(const f of html){const s=fs.readFileSync(f,'utf8');
 if(/13\.7\.0 Release Candidate/.test(s)) errors.push(`old RC meta: ${f}`);
 if(/\?v=13\.8\.(?!17\b)\d+/.test(s)) errors.push(`stale asset version: ${f}`);
 const ids=[...s.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]); const dup=ids.filter((x,i)=>ids.indexOf(x)!==i); if(dup.length) errors.push(`duplicate id ${[...new Set(dup)]}: ${f}`);
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
for(const x of manifest.shortcuts||[]) if(!x.url.endsWith('.html')) errors.push(`unsafe PWA shortcut: ${x.url}`);
const compare=fs.readFileSync(path.join(root,'compare.html'),'utf8'); if(!compare.includes('Content-Security-Policy')) errors.push('compare CSP missing');
for(const f of files.filter(f=>f.endsWith('.js'))) { const raw=fs.readFileSync(f,'utf8'); const code=raw.replace(/^#!.*\n/,''); try { new Function(code); } catch(e) { if(!/\b(?:import|export)\b/.test(code)) errors.push(`JS parse: ${f}: ${e.message}`); } }
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(JSON.stringify({ok:true,html_pages:html.length,product_pages:html.filter(f=>f.includes(`${path.sep}products${path.sep}`)).length,version:'13.8.17'},null,2));
