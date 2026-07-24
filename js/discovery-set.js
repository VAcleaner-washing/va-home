(function(){
  "use strict";
  const MAX=6;
  const STORAGE_KEY="vahome_discovery_draft_v1";
  let selected=[];
  const $=s=>document.querySelector(s);
  function productName(id){const p=typeof getProduct==="function"?getProduct(id):null;return p?p.name:id}
  function saveSelection(){try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(selected))}catch(_){}}
  function restoreSelection(validIds){try{const value=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"[]");selected=Array.isArray(value)?[...new Set(value.filter(id=>validIds.has(id)))].slice(0,MAX):[]}catch(_){selected=[]}}
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
  function syncChoices(){document.querySelectorAll("[data-discovery-choice]").forEach(updateChoice);updateSummary()}
  function clearSelection(){selected=[];saveSelection();syncChoices();$("#discoveryPickerError").textContent=""}
  document.addEventListener("DOMContentLoaded",()=>{
    if(!Array.isArray(window.PRODUCTS)&&typeof PRODUCTS==="undefined")return;
    const products=typeof PRODUCTS!=="undefined"?PRODUCTS:window.PRODUCTS;
    const validIds=new Set(products.map(p=>p.id));
    restoreSelection(validIds);
    $("#discoveryPickerList").innerHTML=products.map(p=>`<button type="button" class="discovery-choice" data-discovery-choice="${p.id}" role="checkbox" aria-checked="false"><span><strong>${p.name}</strong><small>${p.shortDescription}</small></span><i aria-hidden="true">✓</i></button>`).join("");
    const picker=$("#discoveryPicker");
    const opener=$("#openDiscoveryPicker");
    const bodyStyle={};
    let pageScrollY=0;
    let pageLocked=false;
    let lastFocused=null;

    function lockPageScroll(){
      if(pageLocked)return;
      pageScrollY=Math.max(0,window.scrollY||window.pageYOffset||0);
      ["position","top","left","right","width"].forEach(key=>bodyStyle[key]=document.body.style[key]);
      Object.assign(document.body.style,{position:"fixed",top:`-${pageScrollY}px`,left:"0",right:"0",width:"100%"});
      document.documentElement.classList.add("has-open-discovery-picker");
      pageLocked=true;
    }
    function unlockPageScroll(){
      if(!pageLocked)return;
      document.documentElement.classList.remove("has-open-discovery-picker");
      Object.assign(document.body.style,bodyStyle);
      pageLocked=false;
      window.scrollTo(0,pageScrollY);
    }
    function openPicker(){
      lastFocused=document.activeElement;
      lockPageScroll();
      if(!picker.open)picker.showModal();
      picker.scrollTop=0;
      requestAnimationFrame(()=>{const target=picker.querySelector('.is-selected')||picker.querySelector('[data-discovery-choice]');target?.focus({preventScroll:true})});
    }
    function closeCleanup(){unlockPageScroll();requestAnimationFrame(()=>{(lastFocused||opener)?.focus?.({preventScroll:true})})}
    picker.addEventListener("close",closeCleanup);
    picker.addEventListener("cancel",()=>requestAnimationFrame(unlockPageScroll));
    opener.addEventListener("click",openPicker);
    const pickerList=$("#discoveryPickerList");
    pickerList.addEventListener("click",e=>{
      const choice=e.target.closest("[data-discovery-choice]");if(!choice)return;
      const id=choice.dataset.discoveryChoice;
      if(!selected.includes(id)){
        if(selected.length>=MAX){$("#discoveryPickerError").textContent="Вже обрано 6 ароматів. Зніміть один вибір, щоб додати інший.";return}
        selected.push(id);
      }else selected=selected.filter(x=>x!==id);
      $("#discoveryPickerError").textContent="";
      saveSelection();updateChoice(choice);updateSummary();
    });
    $("#clearDiscoverySelection").addEventListener("click",clearSelection);
    $("#confirmDiscoverySelection").addEventListener("click",()=>{if(selected.length===MAX)picker.close()});
    $("#addDiscovery6").addEventListener("click",()=>{
      if(selected.length!==MAX){openPicker();return}
      window.Cart.add("discovery-6",1,{selections:[...selected]});
      sessionStorage.removeItem(STORAGE_KEY);
      window.Cart.refreshCountBadge?.();
      window.VAHome?.showToast("Discovery Set із 6 ароматів додано в кошик");
    });
    syncChoices();
  });
})();
