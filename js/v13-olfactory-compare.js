(() => {
'use strict';
const KEY='vahome_compare_v1';
const chars={clean:'Чистий',fresh:'Свіжий',warm:'Теплий',fruity:'Фруктовий',woody:'Деревний',floral:'Квітковий',mineral:'Мінеральний',molecular:'Молекулярний',spicy:'Пряний',sweet:'Солодкий',smoky:'Димний',spa:'SPA',hotel:'Hotel'};
const rooms={'living-room':'Вітальня',bedroom:'Спальня',office:'Кабінет',hallway:'Передпокій',bathroom:'Ванна'};
const scaleLabels={freshness:'Свіжість',warmth:'Теплота',woodiness:'Деревність',intensity:'Інтенсивність',cleanliness:'Чистота',sweetness:'Солодкість'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(Boolean).slice(0,3)}catch{return[]}};
const productById=id=>(window.PRODUCTS||[]).find(p=>p.id===id);
const coll=p=>typeof window.getCollection==='function'?window.getCollection(p.collection):null;
const imageCandidates=p=>[
  `images/product-story/${p.id}/macro.webp`,
  `images/product-story/${p.id}/Macro.webp`,
  `images/product-gallery/${p.id}/hero.webp`
].filter(Boolean);
const tags=p=>(p.character||[]).slice(0,4).map(x=>`<span class="oc-tag">${esc(chars[x]||x)}</span>`).join('');
const scale=(p,k)=>{const v=Math.max(0,Math.min(10,Number(p.scales?.[k])||0));return `<div class="oc-scale-wrap"><div class="oc-scale">${Array.from({length:10},(_,i)=>`<i class="${i<v?'on':''}"></i>`).join('')}</div><span class="oc-scale-value">${v}/10</span></div>`};
const names=p=>(p.room||[]).slice(0,3).map(x=>rooms[x]||x).join(' · ')||'Універсальний простір';
const allNotes=p=>[...(p.notes?.top||[]),...(p.notes?.heart||[]),...(p.notes?.base||[])].slice(0,6).join(' · ')||'—';
function strongest(p){return Object.entries(p.scales||{}).filter(([k])=>scaleLabels[k]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${scaleLabels[k].toLowerCase()} ${v}/10`)}
function choiceCopy(p){const s=p.scales||{};if((s.freshness||0)>=8&&(s.cleanliness||0)>=7)return 'хочете чистоту, легкість і відчуття свіжого простору';if((s.warmth||0)>=7)return 'цінуєте теплу, обволікаючу атмосферу для вечора';if((s.woodiness||0)>=7)return 'шукаєте глибину, дерево й виразний характер';if((s.intensity||0)>=8)return 'потрібен аромат, який відчувається одразу';return p.suitFor?.replace(/^Підійде, якщо\s*/i,'')||'хочете збалансовану композицію на щодень'}
function productHead(p,i){const c=coll(p)||{};const candidates=imageCandidates(p);return `<article class="oc-product"><button class="oc-remove" data-remove="${esc(p.id)}" aria-label="Прибрати ${esc(p.name)}">×</button><figure class="oc-sample"><img src="${esc(candidates[0]||'')}" data-candidates='${esc(JSON.stringify(candidates))}' data-index="0" alt="Макродеталь ${esc(p.name)}" loading="eager" decoding="auto"></figure><div class="oc-product__copy"><p class="oc-product__collection">${esc(c.name||p.collection)}</p><span class="oc-product__index">SCENT ${String(i+1).padStart(2,'0')}</span><h2>${esc(p.name)}</h2><div class="oc-product__meta"><span>${esc(c.volume||'100 мл')}</span><strong>${esc(c.price||'—')} грн</strong></div></div></article>`}
function row(label,products,render,extra=''){return `<div class="oc-row"><div class="oc-row__label">${label}</div>${products.map(p=>`<div class="oc-cell ${extra}" data-product="${esc(p.name)}">${render(p)}</div>`).join('')}</div>`}
function render(){const host=document.getElementById('olfactoryCompare');const ps=read().map(productById).filter(Boolean);if(ps.length<2){host.innerHTML=`<section class="oc-empty"><h2>Оберіть щонайменше два аромати.</h2><p>Додайте композиції в каталозі — і поверніться до порівняння.</p><a href="catalog.html">Перейти до каталогу</a></section>`;return}
 host.style.setProperty('--oc-count',ps.length);
 host.innerHTML=`<section class="oc-products" style="--oc-count:${ps.length}">${ps.map(productHead).join('')}</section>
 <section class="oc-matrix">
 ${['freshness','warmth','woodiness','intensity','cleanliness','sweetness'].map(k=>row(scaleLabels[k],ps,p=>scale(p,k))).join('')}
 ${row('Атмосфера',ps,p=>esc(p.insights?.aura||p.shortDescription),'oc-cell--serif')}
 ${row('Найкраще звучить',ps,p=>esc(names(p)))}
 ${row('Ноти',ps,p=>esc(allNotes(p)))}
 </section>
 <section class="oc-verdict"><div class="oc-verdict__intro"><p class="oc-section-label">Якщо обирати лише один</p><h2>Ваш орієнтир.</h2></div><div class="oc-verdict__grid" style="--oc-count:${ps.length}">${ps.map(p=>`<article class="oc-verdict__item"><h3>${esc(p.name)}</h3><p>Обирайте, якщо ${esc(choiceCopy(p))}.</p><ul>${strongest(p).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><a class="oc-product-link" href="products/${esc(p.id)}.html">Відкрити аромат →</a></article>`).join('')}</div></section>`;
 host.querySelectorAll('.oc-sample img').forEach(img=>img.addEventListener('error',()=>{let list=[];try{list=JSON.parse(img.dataset.candidates||'[]')}catch{}const next=(Number(img.dataset.index)||0)+1;if(next<list.length){img.dataset.index=String(next);img.src=list[next]}else{img.style.opacity='.18'}}));
 host.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{localStorage.setItem(KEY,JSON.stringify(read().filter(id=>id!==btn.dataset.remove)));render()}));
}
document.addEventListener('DOMContentLoaded',()=>{render();const clear=document.getElementById('ocClearAll');if(clear)clear.addEventListener('click',()=>{localStorage.removeItem(KEY);render()})});
})();
