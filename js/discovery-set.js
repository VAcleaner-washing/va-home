(function(){
  "use strict";
  const MAX=6;
  let selected=[];
  const $=s=>document.querySelector(s);
  function productName(id){const p=typeof getProduct==="function"?getProduct(id):null;return p?p.name:id}
  function render(){
    const count=selected.length;
    $("#pickerCount").textContent=`${count} з ${MAX}`;
    $("#discoverySelectedCount").textContent=`${count}/${MAX}`;
    $("#confirmDiscoverySelection").disabled=count!==MAX;
    $("#addDiscovery6").disabled=count!==MAX;
    $("#addDiscovery6").textContent=count===MAX?"Додати в кошик — 150 грн":"Спочатку оберіть 6 ароматів";
    $("#discoverySelectedPreview").textContent=count?selected.map(productName).join(" · "):"Ще нічого не обрано";
    document.querySelectorAll("[data-discovery-choice]").forEach(label=>{const input=label.querySelector("input");input.checked=selected.includes(input.value);label.classList.toggle("is-selected",input.checked);input.disabled=!input.checked&&count>=MAX});
  }
  document.addEventListener("DOMContentLoaded",()=>{
    if(!Array.isArray(window.PRODUCTS)&&typeof PRODUCTS==="undefined")return;
    const products=typeof PRODUCTS!=="undefined"?PRODUCTS:window.PRODUCTS;
    $("#discoveryPickerList").innerHTML=products.map(p=>`<label class="discovery-choice" data-discovery-choice><input type="checkbox" value="${p.id}"><span><strong>${p.name}</strong><small>${p.shortDescription}</small></span><i aria-hidden="true">✓</i></label>`).join("");
    const picker=$("#discoveryPicker");
    const openPicker=()=>{
      if(!picker.open)picker.showModal();
      document.documentElement.classList.add("has-open-discovery-picker");
    };
    picker.addEventListener("close",()=>document.documentElement.classList.remove("has-open-discovery-picker"));
    $("#openDiscoveryPicker").addEventListener("click",openPicker);
    $("#discoveryPickerList").addEventListener("change",e=>{if(!e.target.matches("input"))return;const id=e.target.value;if(e.target.checked&&!selected.includes(id)){if(selected.length>=MAX){e.target.checked=false;$("#discoveryPickerError").textContent="Можна обрати рівно 6 ароматів.";return}selected.push(id)}else selected=selected.filter(x=>x!==id);$("#discoveryPickerError").textContent="";render()});
    $("#clearDiscoverySelection").addEventListener("click",()=>{selected=[];render()});
    $("#confirmDiscoverySelection").addEventListener("click",()=>{if(selected.length!==MAX)return;picker.close();$("#addDiscovery6").focus()});
    $("#addDiscovery6").addEventListener("click",()=>{if(selected.length!==MAX){openPicker();return}window.Cart.add("discovery-6",1,{selections:[...selected]});window.Cart.refreshCountBadge?.();window.VAHome?.showToast("Discovery Set із 6 ароматів додано в кошик")});
    render();
  });
})();
