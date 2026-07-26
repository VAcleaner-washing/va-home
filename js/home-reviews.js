(function(){
  "use strict";

  const esc=(value)=>String(value||"").replace(/[&<>'"]/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const trimReview=(value,max=118)=>{
    const text=String(value||"").replace(/\s+/g," ").trim();
    if(text.length<=max)return text;
    const cut=text.slice(0,max-1).replace(/\s+\S*$/u,"").trim();
    return `${cut || text.slice(0,max-1).trim()}…`;
  };

  document.addEventListener("DOMContentLoaded",async()=>{
    const section=document.getElementById("homeReviewsSection");
    const grid=document.getElementById("homeReviewsGrid");
    const prev=document.getElementById("homeReviewsPrev");
    const next=document.getElementById("homeReviewsNext");
    const dots=document.getElementById("homeReviewsDots");
    if(!section||!grid||!window.VAHomeSupabase?.getRecentApprovedReviews)return;

    try{
      const allRows=await window.VAHomeSupabase.getRecentApprovedReviews(24);
      const rows=(Array.isArray(allRows)?allRows:[]).filter((row)=>row.photo_url).slice(0,5);
      if(!rows.length)return;

      grid.innerHTML=rows.map((row)=>{
        const product=typeof window.getProduct==="function"?window.getProduct(row.product_slug):null;
        const tag=product?"a":"article";
        const hrefAttr=product?` href="products/${esc(product.id)}.html"`:"";
        const name=esc(row.customer_name||"Клієнт VA HOME");
        const productName=esc(product?.name||row.product_slug||"VA HOME");
        const review=esc(trimReview(row.review_text));
        return `<${tag} class="home-review-card"${hrefAttr} aria-label="Відгук ${name} про ${productName}">
          <img class="home-review-card__photo" src="${esc(row.photo_url)}" alt="Фото до відгуку про ${productName}" loading="lazy" decoding="async" onerror="this.closest('.home-review-card')?.remove()">
          <div class="home-review-card__overlay">
            <p>${review}</p>
            <footer><strong>${name}</strong><span>${productName}</span></footer>
          </div>
        </${tag}>`;
      }).join("");

      const cards=Array.from(grid.querySelectorAll(".home-review-card"));
      if(!cards.length)return;

      const updateNav=()=>{
        const max=Math.max(0,grid.scrollWidth-grid.clientWidth);
        prev.disabled=grid.scrollLeft<8;
        next.disabled=grid.scrollLeft>max-8;
        const progress=max?grid.scrollLeft/max:0;
        const dotIndex=Math.round(progress*Math.max(0,dots.children.length-1));
        Array.from(dots.children).forEach((dot,index)=>dot.classList.toggle("is-active",index===dotIndex));
      };

      const buildDots=()=>{
        const cardWidth=cards[0].getBoundingClientRect().width;
        const gap=parseFloat(getComputedStyle(grid).columnGap||getComputedStyle(grid).gap||0);
        const step=Math.max(1,cardWidth+gap);
        const pages=window.matchMedia("(max-width: 600px)").matches?cards.length:Math.max(1,Math.ceil((grid.scrollWidth-grid.clientWidth)/step)+1);
        dots.innerHTML=Array.from({length:pages},(_,index)=>`<span class="${index===0?"is-active":""}" data-index="${index}"></span>`).join("");
        dots.querySelectorAll("span").forEach((dot)=>dot.addEventListener("click",()=>{
          const cardWidth=cards[0].getBoundingClientRect().width;
          const gap=parseFloat(getComputedStyle(grid).columnGap||getComputedStyle(grid).gap||0);
          grid.scrollTo({left:Number(dot.dataset.index)*(cardWidth+gap),behavior:"smooth"});
        }));
        updateNav();
      };

      const move=(direction)=>{
        const cardWidth=cards[0].getBoundingClientRect().width;
        const gap=parseFloat(getComputedStyle(grid).columnGap||getComputedStyle(grid).gap||0);
        grid.scrollBy({left:direction*(cardWidth+gap),behavior:"smooth"});
      };
      prev.addEventListener("click",()=>move(-1));
      next.addEventListener("click",()=>move(1));
      grid.addEventListener("scroll",()=>requestAnimationFrame(updateNav),{passive:true});
      window.addEventListener("resize",buildDots,{passive:true});

      section.hidden=false;
      buildDots();
    }catch(error){
      section.hidden=true;
    }
  });
})();
