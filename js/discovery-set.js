(function(){
  "use strict";
  const MAX=6;
  let selected=[];
  const $=s=>document.querySelector(s);
  function productName(id){const p=typeof getProduct==="function"?getProduct(id):null;return p?p.name:id}
  function render(){
    const pickerList=$("#discoveryPickerList");
    const savedScrollTop=pickerList?pickerList.scrollTop:0;
    const count=selected.length;
    $("#pickerCount").textContent=`${count} з ${MAX}`;
    $("#discoverySelectedCount").textContent=`${count}/${MAX}`;
    $("#confirmDiscoverySelection").disabled=count!==MAX;
    $("#addDiscovery6").disabled=count!==MAX;
    $("#addDiscovery6").textContent=count===MAX?"Додати в кошик — 150 грн":"Спочатку оберіть 6 ароматів";
    $("#discoverySelectedPreview").textContent=count?selected.map(productName).join(" · "):"Ще нічого не обрано";
    document.querySelectorAll("[data-discovery-choice]").forEach(choice=>{const isSelected=selected.includes(choice.dataset.discoveryChoice);choice.classList.toggle("is-selected",isSelected);choice.setAttribute("aria-checked",String(isSelected))});
    if(pickerList)pickerList.scrollTop=savedScrollTop;
    const picker=$("#discoveryPicker");
    if(picker)picker.scrollTop=0;
  }
  document.addEventListener("DOMContentLoaded",()=>{
    if(!Array.isArray(window.PRODUCTS)&&typeof PRODUCTS==="undefined")return;
    const products=typeof PRODUCTS!=="undefined"?PRODUCTS:window.PRODUCTS;
    $("#discoveryPickerList").innerHTML=products.map(p=>`<button type="button" class="discovery-choice" data-discovery-choice="${p.id}" role="checkbox" aria-checked="false"><span><strong>${p.name}</strong><small>${p.shortDescription}</small></span><i aria-hidden="true">✓</i></button>`).join("");
    const picker=$("#discoveryPicker");
    const openPicker=()=>{
      if(!picker.open)picker.showModal();
      picker.scrollTop=0;
      document.documentElement.classList.add("has-open-discovery-picker");
    };
    picker.addEventListener("close",()=>document.documentElement.classList.remove("has-open-discovery-picker"));
    $("#openDiscoveryPicker").addEventListener("click",openPicker);
    $("#discoveryPickerList").addEventListener("mousedown",e=>{if(e.target.closest("[data-discovery-choice]"))e.preventDefault()});
    $("#discoveryPickerList").addEventListener("click",e=>{const choice=e.target.closest("[data-discovery-choice]");if(!choice)return;const id=choice.dataset.discoveryChoice;const listScrollTop=$("#discoveryPickerList").scrollTop;if(!selected.includes(id)){if(selected.length>=MAX){$("#discoveryPickerError").textContent="Вже обрано 6 ароматів. Зніміть один вибір, щоб додати інший.";return}selected.push(id)}else selected=selected.filter(x=>x!==id);$("#discoveryPickerError").textContent="";render();$("#discoveryPickerList").scrollTop=listScrollTop;picker.scrollTop=0});
    $("#clearDiscoverySelection").addEventListener("click",()=>{selected=[];render()});
    $("#confirmDiscoverySelection").addEventListener("click",()=>{if(selected.length!==MAX)return;picker.close();$("#addDiscovery6").focus()});
    $("#addDiscovery6").addEventListener("click",()=>{if(selected.length!==MAX){openPicker();return}window.Cart.add("discovery-6",1,{selections:[...selected]});window.Cart.refreshCountBadge?.();window.VAHome?.showToast("Discovery Set із 6 ароматів додано в кошик")});
    render();
  });
})();
