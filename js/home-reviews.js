(function(){
  "use strict";
  const esc=(v)=>String(v||"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
  document.addEventListener("DOMContentLoaded",async()=>{
    const section=document.getElementById("homeReviewsSection");
    const grid=document.getElementById("homeReviewsGrid");
    if(!section||!grid||!window.VAHomeSupabase?.getRecentApprovedReviews)return;
    try{
      const rows=await window.VAHomeSupabase.getRecentApprovedReviews(6);
      if(!Array.isArray(rows)||!rows.length)return;
      grid.innerHTML=rows.map(row=>{
        const product=typeof window.getProduct==="function"?window.getProduct(row.product_slug):null;
        return `<article class="home-review-card">${row.photo_url?`<img class="home-review-card__photo" src="${esc(row.photo_url)}" alt="Фото до відгуку про ${esc(product?.name||"аромат VA HOME")}" loading="lazy" decoding="async">`:""}<div class="home-review-card__body"><div class="home-review-card__stars" aria-label="Оцінка ${Number(row.rating)||0} з 5">${"★".repeat(Math.max(1,Math.min(5,Number(row.rating)||1)))}</div><p>${esc(row.review_text)}</p><footer><strong>${esc(row.customer_name)}</strong><span>${esc(product?.name||row.product_slug)}</span>${row.verified_purchase?'<em>Перевірена покупка</em>':""}</footer></div></article>`;
      }).join("");
      section.hidden=false;
    }catch(error){console.warn("Home reviews unavailable",error);}
  });
})();
