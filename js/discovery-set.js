(function(){
  "use strict";
  const MAX=6;
  let selected=[];
  const $=s=>document.querySelector(s);
  function productName(id){const p=typeof getProduct==="function"?getProduct(id):null;return p?p.name:id}
  function updateSummary(){
    const count=selected.length;
    $("#pickerCount").textContent=`${count} з ${MAX}`;
    $("#discoverySelectedCount").textContent=`${count}/${MAX}`;
    $("#confirmDiscoverySelection").disabled=count!==MAX;
    $("#addDiscovery6").disabled=count!==MAX;
    $("#addDiscovery6").textContent=count===MAX?"Додати в кошик — 150 грн":"Спочатку оберіть 6 ароматів";
    $("#discoverySelectedPreview").textContent=count?selected.map(productName).join(" · "):"Ще нічого не обрано";
  }
  function updateChoice(choice){
    const isSelected=selected.includes(choice.dataset.discoveryChoice);
    choice.classList.toggle("is-selected",isSelected);
    choice.setAttribute("aria-checked",String(isSelected));
  }
  function clearSelection(){
    selected=[];
    document.querySelectorAll("[data-discovery-choice]").forEach(updateChoice);
    $("#discoveryPickerError").textContent="";
    updateSummary();
  }
  document.addEventListener("DOMContentLoaded",()=>{
    if(!Array.isArray(window.PRODUCTS)&&typeof PRODUCTS==="undefined")return;
    const products=typeof PRODUCTS!=="undefined"?PRODUCTS:window.PRODUCTS;
    $("#discoveryPickerList").innerHTML=products.map(p=>`<button type="button" class="discovery-choice" data-discovery-choice="${p.id}" role="checkbox" aria-checked="false"><span><strong>${p.name}</strong><small>${p.shortDescription}</small></span><i aria-hidden="true">✓</i></button>`).join("");
    const picker=$("#discoveryPicker");
    let pageScrollY=0;
    let pageLocked=false;

    function lockPageScroll(){
      if(pageLocked)return;
      pageScrollY=Math.max(0,window.scrollY||window.pageYOffset||0);
      document.body.style.position="fixed";
      document.body.style.top=`-${pageScrollY}px`;
      document.body.style.left="0";
      document.body.style.right="0";
      document.body.style.width="100%";
      document.documentElement.classList.add("has-open-discovery-picker");
      pageLocked=true;
    }

    function unlockPageScroll(){
      if(!pageLocked)return;
      document.documentElement.classList.remove("has-open-discovery-picker");
      document.body.style.position="";
      document.body.style.top="";
      document.body.style.left="";
      document.body.style.right="";
      document.body.style.width="";
      pageLocked=false;
      window.scrollTo(0,pageScrollY);
    }

    const openPicker=()=>{
      lockPageScroll();
      if(!picker.open)picker.showModal();
      picker.scrollTop=0;
    };
    picker.addEventListener("close",()=>{
      unlockPageScroll();
    });
    $("#openDiscoveryPicker").addEventListener("click",openPicker);
    const pickerList=$("#discoveryPickerList");
    pickerList.addEventListener("pointerdown",e=>{if(e.target.closest("[data-discovery-choice]"))e.preventDefault()});
    pickerList.addEventListener("click",e=>{const choice=e.target.closest("[data-discovery-choice]");if(!choice)return;const scrollPosition=pickerList.scrollTop;const id=choice.dataset.discoveryChoice;if(!selected.includes(id)){if(selected.length>=MAX){$("#discoveryPickerError").textContent="Вже обрано 6 ароматів. Зніміть один вибір, щоб додати інший.";return}selected.push(id)}else selected=selected.filter(x=>x!==id);$("#discoveryPickerError").textContent="";updateChoice(choice);updateSummary();requestAnimationFrame(()=>{pickerList.scrollTop=scrollPosition})});
    $("#clearDiscoverySelection").addEventListener("click",clearSelection);
    $("#confirmDiscoverySelection").addEventListener("click",()=>{
      if(selected.length!==MAX)return;
      picker.close();
      requestAnimationFrame(()=>{
        $("#addDiscovery6").focus({preventScroll:true});
      });
    });
    $("#addDiscovery6").addEventListener("click",()=>{if(selected.length!==MAX){openPicker();return}window.Cart.add("discovery-6",1,{selections:[...selected]});window.Cart.refreshCountBadge?.();window.VAHome?.showToast("Discovery Set із 6 ароматів додано в кошик")});
    updateSummary();
  });
})();
