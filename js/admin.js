(function(){"use strict";
const cfg=window.SITE_CONFIG.supabase;
const sb=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{storageKey:"vahome_admin_auth_v1",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const statusLabels={new:"Нове",awaiting_payment:"Очікує оплату",paid:"Оплачено",shipped:"Відправлено",completed:"Доставлено",cancelled:"Скасовано"};
const orderStatusOrder=["new","awaiting_payment","paid","shipped","completed","cancelled"];
const paymentMethodLabels={bank_transfer:"На рахунок",cash_on_delivery:"При отриманні",card_online:"Карткою онлайн"};
const paymentStatusLabels={unpaid:"Не оплачено",pending:"Очікує банк",verification:"Перевіряємо",failed:"Не завершено",expired:"Прострочено",paid:"Оплачено",refunded:"Повернено"};
const paymentEventLabels={created:"Рахунок створено",processing:"Банк перевіряє оплату",hold:"Кошти зарезервовано",success:"Оплату підтверджено",failure:"Оплату не завершено",failed:"Оплату не завершено",expired:"Рахунок прострочено",reversed:"Платіж скасовано",refunded:"Кошти повернено"};
let orders=[],reviews=[],promos=[],releases=[],activeOrder=null,activePromo=null,activeRelease=null;
let activeOrderAttempts=[],activeOrderEvents=[],currentOrderSmartFilter="all";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const money=v=>`${Number(v||0).toLocaleString("uk-UA",{maximumFractionDigits:2})} грн`;
const date=v=>v?new Intl.DateTimeFormat("uk-UA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";
const shortDate=v=>v?new Intl.DateTimeFormat("uk-UA",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(v)):"—";
const normalizePhone=v=>String(v||"").replace(/[^+\d]/g,"");

async function getAdminAccessToken(){
  let {data:{session},error}=await sb.auth.getSession();
  if(error||!session)throw new Error("SESSION_EXPIRED");
  const expiresAt=Number(session.expires_at||0)*1000;
  if(expiresAt&&expiresAt-Date.now()<90_000){
    const refreshed=await sb.auth.refreshSession();
    if(refreshed.error||!refreshed.data.session)throw new Error("SESSION_EXPIRED");
    session=refreshed.data.session;
  }
  return session.access_token;
}
async function adminOrderRequest(body){
  let token;
  try{token=await getAdminAccessToken();}
  catch(_){showLogin("Адмінська сесія завершилася. Увійдіть повторно.");throw new Error("SESSION_EXPIRED");}
  const response=await fetch(`${cfg.url}/functions/v1/admin-order-update`,{
    method:"POST",
    headers:{Authorization:`Bearer ${token}`,apikey:cfg.publishableKey,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const payload=await response.json().catch(()=>({}));
  if(response.status===401){await sb.auth.signOut({scope:"local"}).catch(()=>{});showLogin("Адмінська сесія завершилася. Увійдіть повторно.");throw new Error("SESSION_EXPIRED");}
  if(!response.ok)throw new Error(String(payload.error||`HTTP_${response.status}`));
  return payload;
}
function applyUpdatedOrder(data){
  if(!data)return;
  activeOrder=data;
  const index=orders.findIndex(order=>String(order.id)===String(data.id));
  if(index>=0)orders[index]=data;
}
function announceOrderResult(result,{fallback="Замовлення оновлено"}={}){
  if(result?.status_changed){
    if(result.email?.sent)return toast("Статус оновлено · лист надіслано","success");
    if(result.email?.skipped)return toast("Статус оновлено · лист уже надсилався","success");
    return toast("Статус оновлено, але лист не надіслано. Натисніть «Надіслати лист повторно».","danger");
  }
  toast(fallback,"success");
}
async function sendStatusEmail(clientOrderId,{announce=true}={}){
  try{
    const result=await adminOrderRequest({action:"resend_email",client_order_id:clientOrderId});
    if(announce)toast(result.email?.sent?"Лист клієнту надіслано":"Лист уже надсилався раніше","success");
    return true;
  }catch(error){
    if(String(error.message)!=="SESSION_EXPIRED"&&announce)toast("Не вдалося надіслати лист. Спробуйте ще раз.","danger");
    return false;
  }
}
function setupPremiumScrollbar(dialog){
  const rail=dialog?.querySelector(".admin-scroll-indicator"),thumb=rail?.querySelector("span");
  if(!dialog||!rail||!thumb)return;
  let raf=0;
  const update=()=>{
    raf=0;
    if(!dialog.open){rail.hidden=true;return;}
    const maxScroll=Math.max(0,dialog.scrollHeight-dialog.clientHeight);
    if(maxScroll<4){rail.hidden=true;return;}
    const rect=dialog.getBoundingClientRect();
    const railTop=Math.max(rect.top+72,12);
    const railBottom=Math.min(rect.bottom-24,window.innerHeight-12);
    const railHeight=Math.max(90,railBottom-railTop);
    const thumbHeight=Math.max(48,Math.min(railHeight,railHeight*(dialog.clientHeight/dialog.scrollHeight)));
    const travel=Math.max(0,railHeight-thumbHeight);
    const offset=maxScroll?travel*(dialog.scrollTop/maxScroll):0;
    rail.hidden=false;
    rail.style.left=`${Math.max(4,Math.min(window.innerWidth-8,rect.right-7))}px`;
    rail.style.top=`${railTop}px`;
    rail.style.height=`${railHeight}px`;
    thumb.style.height=`${thumbHeight}px`;
    thumb.style.transform=`translate3d(0,${offset}px,0)`;
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(update);};
  dialog.addEventListener("scroll",schedule,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  if("ResizeObserver" in window)new ResizeObserver(schedule).observe(dialog);
  dialog._premiumScrollUpdate=schedule;
}

function isCardOrder(order){return order?.payment_method==="card_online";}
function effectiveOrderStatus(order){
  if(!isCardOrder(order))return order?.status||"new";
  if(order?.status==="cancelled")return "cancelled";
  const payment=String(order?.payment_status||"pending");
  if(payment==="paid")return ["shipped","completed"].includes(order.status)?order.status:"paid";
  if(payment==="refunded")return "cancelled";
  return "awaiting_payment";
}
function isActiveCardPayment(order){return isCardOrder(order)&&["unpaid","pending","verification"].includes(String(order.payment_status||"pending"));}
function cardPaymentUi(order){
  const status=String(order?.payment_status||"pending");
  const states={
    unpaid:{key:"pending",label:"Очікує створення рахунку",detail:"Платіжне посилання ще не створене або клієнт не почав оплату."},
    pending:{key:"pending",label:"Очікує оплату",detail:"Активний рахунок plata by mono. Банк ще не підтвердив списання."},
    verification:{key:"pending",label:"Перевіряється",detail:"Банк завершує перевірку платежу."},
    failed:{key:"failed",label:"Не завершено",detail:order?.payment_failure_reason||"Банк відхилив або не завершив платіж."},
    expired:{key:"failed",label:"Рахунок прострочено",detail:"Клієнту потрібно створити нове платіжне посилання."},
    paid:{key:"paid",label:"Оплачено банком",detail:"Оплату підтверджено plata by mono. Замовлення можна готувати до відправлення."},
    refunded:{key:"refunded",label:"Кошти повернено",detail:"Повернення підтверджене платіжним сервісом."}
  };
  return states[status]||{key:"pending",label:paymentStatusLabels[status]||status,detail:"Статус отримано від платіжного сервісу."};
}
function cardAllowedStatuses(order){
  if(!isCardOrder(order))return orderStatusOrder;
  const payment=String(order.payment_status||"pending");
  if(payment==="paid")return ["paid","shipped","completed"];
  if(payment==="refunded")return ["cancelled"];
  if(["failed","expired"].includes(payment))return ["awaiting_payment","cancelled"];
  return ["new","awaiting_payment"];
}
function canSetOrderStatus(order,nextStatus){return !isCardOrder(order)||cardAllowedStatuses(order).includes(nextStatus);}
function orderStatusOptions(order){
  const current=effectiveOrderStatus(order);
  const allowed=new Set(cardAllowedStatuses(order));
  if(current)allowed.add(current);
  return orderStatusOrder.map(value=>{
    const disabled=isCardOrder(order)&&!allowed.has(value);
    return `<option value="${value}" ${current===value?"selected":""} ${disabled?"disabled":""}>${statusLabels[value]}${disabled?" — недоступно":""}</option>`;
  }).join("");
}
function manualPaymentOptions(order){
  const values=order.payment_method==="cash_on_delivery"?["unpaid","paid"]:["unpaid","verification","paid","refunded"];
  if(order.payment_status&&!values.includes(order.payment_status))values.push(order.payment_status);
  return values.map(value=>`<option value="${esc(value)}" ${order.payment_status===value?"selected":""}>${esc(paymentStatusLabels[value]||value)}</option>`).join("");
}
function productById(id){return (window.PRODUCTS||[]).find(product=>product.id===id)||null;}
function itemImage(item){
  if(["discovery-6","discovery-17","discovery-18"].includes(String(item?.id||"")))return "/images/discovery/discovery-set.webp";
  const product=productById(item?.id);
  const src=product?.images?.main||product?.image||"";
  return src?`/${String(src).replace(/^\/+/,"")}`:"";
}
function itemSelections(item){
  const list=Array.isArray(item?.selections)?item.selections:Array.isArray(item?.selection_ids)?item.selection_ids:[];
  return list.filter(Boolean);
}
function orderItemSummary(order){
  const items=Array.isArray(order?.items)?order.items:[];
  if(!items.length)return "Без товарів";
  const totalQty=items.reduce((sum,item)=>sum+Math.max(1,Number(item.quantity||1)),0);
  const first=items[0]?.name||"Товар";
  return items.length===1?`${first} × ${totalQty}`:`${first} та ще ${items.length-1}`;
}
function orderAgeMinutes(order){return Math.max(0,(Date.now()-new Date(order.created_at).getTime())/60000);}
function orderGuidance(order){
  const status=effectiveOrderStatus(order);
  const method=order.payment_method;
  const payment=String(order.payment_status||"unpaid");
  if(status==="cancelled")return{tone:"muted",title:"Замовлення скасовано",detail:payment==="refunded"?"Кошти повернено клієнту.":"Подальших дій не потрібно.",action:null};
  if(isCardOrder(order)&&["failed","expired"].includes(payment))return{tone:"danger",title:payment==="expired"?"Платіжне посилання прострочене":"Оплату не завершено",detail:order.payment_failure_reason||"Клієнт може повторити оплату з кабінету або сторінки замовлення.",action:null};
  if(isCardOrder(order)&&["unpaid","pending","verification"].includes(payment))return{tone:"pending",title:"Очікуємо підтвердження банку",detail:"Не відправляйте замовлення, доки plata by mono не підтвердить оплату.",action:null};
  if(status==="new"&&method==="bank_transfer")return{tone:"attention",title:"Перевірте надходження",detail:"Після фактичного зарахування коштів підтвердьте оплату вручну.",action:{label:"Оплату отримано",status:"paid"}};
  if(status==="awaiting_payment"&&method==="bank_transfer")return{tone:"attention",title:"Очікуємо переказ",detail:"Перевірте рахунок і підтвердьте оплату лише після надходження коштів.",action:{label:"Оплату отримано",status:"paid"}};
  if(["new","awaiting_payment"].includes(status)&&method==="cash_on_delivery")return{tone:"attention",title:"Підготуйте до відправлення",detail:"Клієнт оплатить замовлення у відділенні або поштоматі.",action:{label:"Позначити відправленим",status:"shipped"}};
  if(status==="paid")return{tone:"success",title:"Оплату підтверджено",detail:order.tracking_number?"ТТН уже додано — замовлення можна відправляти.":"Підготуйте замовлення, створіть ТТН і позначте його відправленим.",action:{label:"Позначити відправленим",status:"shipped"}};
  if(status==="shipped")return{tone:order.tracking_number?"info":"attention",title:order.tracking_number?"Замовлення в дорозі":"Додайте номер ТТН",detail:order.tracking_number?`ТТН ${order.tracking_number}. Статус зміниться автоматично після отримання.`:"Номер ТТН допоможе клієнту відстежувати посилку.",action:{label:"Позначити доставленим",status:"completed"}};
  if(status==="completed")return{tone:"success",title:"Посилку доставлено",detail:order.review_invitation_sent_at?"Запрошення залишити відгук уже надіслано.":"Клієнту можна надіслати запрошення залишити відгук.",action:null};
  return{tone:"muted",title:"Перевірте замовлення",detail:"Уточніть дані клієнта, оплату та спосіб доставки.",action:null};
}
function orderPriority(order){
  const status=effectiveOrderStatus(order),payment=String(order.payment_status||"");
  if(status==="cancelled"||status==="completed")return 0;
  if(isCardOrder(order)&&["failed","expired"].includes(payment))return 100;
  if(status==="new")return 92;
  if(status==="awaiting_payment"&&order.payment_method==="bank_transfer")return 88;
  if(status==="paid")return 82;
  if(status==="shipped"&&!order.tracking_number)return 78;
  if(isCardOrder(order)&&["pending","verification"].includes(payment)&&orderAgeMinutes(order)>30)return 70;
  if(status==="shipped")return 48;
  return 30;
}
function needsAttention(order){return orderPriority(order)>=70;}
function readyToShip(order){const status=effectiveOrderStatus(order);return status==="paid"||(["new","awaiting_payment"].includes(status)&&order.payment_method==="cash_on_delivery");}
function hasPaymentIssue(order){return isCardOrder(order)&&["failed","expired"].includes(String(order.payment_status||""));}
function createdToday(order){const d=new Date(order.created_at),n=new Date();return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate();}
function smartFilterMatch(order,filter){
  if(filter==="attention")return needsAttention(order);
  if(filter==="ready")return readyToShip(order);
  if(filter==="payment")return hasPaymentIssue(order);
  if(filter==="today")return createdToday(order);
  return true;
}
function toast(text,tone="default"){
  const el=document.createElement("div");el.className=`admin-toast admin-toast--${tone}`;el.setAttribute("role","status");el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),3200);
}
async function copyText(value,label="Скопійовано"){
  const text=String(value||"");if(!text)return;
  try{await navigator.clipboard.writeText(text);}catch(_){const input=document.createElement("textarea");input.value=text;input.style.position="fixed";input.style.opacity="0";document.body.appendChild(input);input.select();document.execCommand("copy");input.remove();}
  toast(label,"success");
}
async function requireAdmin(){const {data:{user}}=await sb.auth.getUser();if(!user)return false;const {data,error}=await sb.from("admin_users").select("user_id,email").eq("user_id",user.id).maybeSingle();if(error||!data){await sb.auth.signOut({scope:"local"});throw new Error("Цей акаунт не має доступу до адмін-панелі.");}$("#adminIdentity").textContent=data.email;return true;}
function showLogin(message=""){$("#loginView").hidden=false;$("#dashboardView").hidden=true;$("#logoutBtn").hidden=true;$("#loginMessage").textContent=message;}
function showDashboard(){$("#loginView").hidden=true;$("#loginMessage").textContent="";$("#dashboardView").hidden=false;$("#logoutBtn").hidden=false;window.scrollTo({top:0,behavior:"auto"});}
async function loadAll(){
  document.body.classList.add("admin-loading");
  try{
    const [o,r,p,rel]=await Promise.all([
      sb.from("orders").select("*").order("created_at",{ascending:false}).limit(500),
      sb.from("reviews").select("*").order("created_at",{ascending:false}).limit(500),
      sb.from("promo_codes").select("*").order("created_at",{ascending:false}),
      sb.from("private_releases").select("*").order("public_starts_at",{ascending:false})
    ]);
    if(o.error)throw o.error;if(r.error)throw r.error;if(p.error)throw p.error;if(rel.error)throw rel.error;
    orders=o.data||[];reviews=r.data||[];promos=p.data||[];releases=rel.data||[];
    renderOrders();renderReviews();renderPromos();renderReleases();
  }finally{document.body.classList.remove("admin-loading");}
}
function renderFocusFilters(){
  const counts={all:orders.length,attention:orders.filter(needsAttention).length,ready:orders.filter(readyToShip).length,payment:orders.filter(hasPaymentIssue).length,today:orders.filter(createdToday).length};
  const labels={all:"Усі",attention:"Потребують уваги",ready:"Готові до відправлення",payment:"Проблеми з оплатою",today:"Сьогодні"};
  const host=$("#orderFocusFilters");
  if(host)host.innerHTML=Object.entries(labels).map(([key,label])=>`<button type="button" data-smart-filter="${key}" class="${currentOrderSmartFilter===key?"is-active":""}"><span>${esc(label)}</span><strong>${counts[key]}</strong></button>`).join("");
  const summary=$("#orderQueueSummary");
  if(summary)summary.innerHTML=counts.attention?`<strong>${counts.attention}</strong> ${counts.attention===1?"замовлення потребує":"замовлень потребують"} уваги`:`<strong>Усе спокійно.</strong> Немає термінових замовлень.`;
}
function renderStats(){
  const counts={new:0,awaiting_payment:0,paid:0,shipped:0,completed:0,cancelled:0};
  orders.forEach(order=>{const status=effectiveOrderStatus(order);if(counts[status]!==undefined)counts[status]++;});
  $("#ordersStats").innerHTML=Object.entries(counts).map(([s,n])=>`<button class="admin-stat" data-status-jump="${s}" type="button"><strong>${n}</strong><span>${statusLabels[s]}</span></button>`).join("");
  document.querySelectorAll("[data-status-jump]").forEach(button=>button.addEventListener("click",()=>{
    currentOrderSmartFilter="all";$("#orderStatusFilter").value=button.dataset.statusJump;renderOrders();$("#ordersList").scrollIntoView({behavior:"smooth",block:"start"});
  }));
  $("#ordersBadge").textContent=orders.filter(needsAttention).length||"";
  const now=new Date(),startDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()),startWeek=new Date(startDay);startWeek.setDate(startDay.getDate()-6);const startMonth=new Date(now.getFullYear(),now.getMonth(),1);
  const periods=[["Сьогодні",startDay],["7 днів",startWeek],["Цей місяць",startMonth]];
  $("#periodStats").innerHTML=periods.map(([label,start])=>{const rows=orders.filter(o=>new Date(o.created_at)>=start&&effectiveOrderStatus(o)!=="cancelled");const total=rows.reduce((sum,o)=>sum+Number(o.total_amount||0),0);return `<article class="admin-period-card"><span>${label}</span><strong>${money(total)}</strong><small>${rows.length} замовлень</small></article>`;}).join("");
  renderChart();renderFocusFilters();
}
function renderChart(){const days=[];for(let i=29;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push({date:d,total:0});}orders.filter(o=>effectiveOrderStatus(o)!=="cancelled").forEach(o=>{const d=new Date(o.created_at);d.setHours(0,0,0,0);const day=days.find(x=>x.date.getTime()===d.getTime());if(day)day.total+=Number(o.total_amount||0);});const max=Math.max(1,...days.map(d=>d.total));$("#salesChart").innerHTML=days.map(d=>`<div class="admin-chart__bar" style="--bar-height:${Math.max(2,d.total/max*100)}%"><span>${d.date.toLocaleDateString("uk-UA",{day:"2-digit",month:"2-digit"})}: ${money(d.total)}</span></div>`).join("");$("#chartTotal").textContent=money(days.reduce((s,d)=>s+d.total,0));}
function orderSort(rows){
  const mode=$("#orderSort")?.value||"priority";
  return [...rows].sort((a,b)=>{
    if(mode==="oldest")return new Date(a.created_at)-new Date(b.created_at);
    if(mode==="amount")return Number(b.total_amount||0)-Number(a.total_amount||0);
    if(mode==="newest")return new Date(b.created_at)-new Date(a.created_at);
    return orderPriority(b)-orderPriority(a)||new Date(b.created_at)-new Date(a.created_at);
  });
}
function renderOrders(){
  renderStats();
  const q=$("#orderSearch").value.trim().toLowerCase(),filter=$("#orderStatusFilter").value;
  let list=orders.filter(o=>smartFilterMatch(o,currentOrderSmartFilter)&&(!filter||effectiveOrderStatus(o)===filter)&&(!q||[o.client_order_id,o.customer_name,o.customer_phone,o.customer_email,o.customer_city,o.delivery_details,orderItemSummary(o)].join(" ").toLowerCase().includes(q)));
  list=orderSort(list);
  $("#ordersEmpty").hidden=!!list.length;
  $("#ordersList").innerHTML=list.map(o=>{
    const cardPayment=isCardOrder(o),displayedStatus=effectiveOrderStatus(o),bank=cardPayment?cardPaymentUi(o):null,guidance=orderGuidance(o),quick=[];
    if(cardPayment){
      if(o.payment_status==="paid"&&displayedStatus==="paid")quick.push('<button data-quick-status="shipped">Відправлено</button>');
      if(o.payment_status==="paid"&&displayedStatus==="shipped")quick.push('<button data-quick-status="completed">Доставлено + відгук</button>');
    }else if(o.payment_method==="cash_on_delivery"){
      if(["new","awaiting_payment"].includes(displayedStatus))quick.push('<button data-quick-status="shipped">Відправлено</button>');
      if(displayedStatus==="shipped")quick.push('<button data-quick-status="completed">Доставлено + відгук</button>');
    }else{
      if(["new","awaiting_payment"].includes(displayedStatus))quick.push('<button data-quick-status="paid">Оплату отримано</button>');
      if(displayedStatus==="paid")quick.push('<button data-quick-status="shipped">Відправлено</button>');
      if(displayedStatus==="shipped")quick.push('<button data-quick-status="completed">Доставлено + відгук</button>');
    }
    // Card payment status is bank-controlled; never expose a manual “paid” action.
    if(cardPayment){
      for(let i=quick.length-1;i>=0;i-=1){
        if(quick[i].includes('data-quick-status="paid"'))quick.splice(i,1);
      }
    }
    return `<article class="admin-card admin-order-card admin-order-card--${guidance.tone}" data-order="${esc(o.id)}">
      <header class="admin-order-card__head"><div><div class="admin-card__title">${esc(o.client_order_id)}</div><div class="admin-card__meta">${date(o.created_at)}</div></div><div class="admin-card__amount">${money(o.total_amount)}</div></header>
      <div class="admin-order-card__customer"><strong>${esc(o.customer_name)}</strong><span>${esc(o.customer_phone)}${o.customer_city?` · ${esc(o.customer_city)}`:""}</span></div>
      <div class="admin-order-card__product"><span>Замовлення</span><strong>${esc(orderItemSummary(o))}</strong></div>
      <div class="admin-order-card__states"><span class="status-pill status-${esc(displayedStatus)}">${esc(statusLabels[displayedStatus]||displayedStatus)}</span>${cardPayment?`<span class="admin-payment-state admin-payment-state--${bank.key}"><span>Банк</span><strong>${esc(bank.label)}</strong></span>`:`<span class="admin-payment-method">${esc(paymentMethodLabels[o.payment_method]||o.payment_method||"Оплата не вказана")}</span>`}</div>
      <footer class="admin-order-card__footer"><div class="admin-next-mini admin-next-mini--${guidance.tone}"><span>Наступний крок</span><strong>${esc(guidance.title)}</strong></div><div class="admin-quick-status">${quick.join("")}</div></footer>
    </article>`;
  }).join("");
  document.querySelectorAll("[data-order]").forEach(el=>el.addEventListener("click",()=>openOrder(el.dataset.order)));
  document.querySelectorAll("[data-quick-status]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();quickStatus(btn.closest("[data-order]").dataset.order,btn.dataset.quickStatus);}));
}
async function quickStatus(id,status){
  const order=orders.find(o=>String(o.id)===String(id));if(!order)return;
  if(isCardOrder(order)&&!canSetOrderStatus(order,status))return toast(order.payment_status==="paid"?"Оплачене карткове замовлення не скасовується вручну":"Дочекайтеся актуального статусу plata by mono","warning");
  if(status==="paid"&&isCardOrder(order))return toast("Карткову оплату підтверджує тільки plata by mono","warning");
  if(status==="paid"&&!isCardOrder(order)&&!confirm("Підтвердити, що оплату фактично отримано?"))return;
  const old=effectiveOrderStatus(order),payload={status};if(status==="paid"&&!isCardOrder(order))payload.payment_status="paid";
  const {data,error}=await sb.from("orders").update(payload).eq("id",id).select().single();
  if(error)return toast("Помилка: "+error.message,"danger");
  Object.assign(order,data);renderOrders();toast("Статус змінено","success");
  if(old!==effectiveOrderStatus(order))sendStatusEmail(order.client_order_id);
}
function renderReviews(){const q=$("#reviewSearch").value.trim().toLowerCase(),filter=$("#reviewStatusFilter").value;const list=reviews.filter(r=>(!filter||r.status===filter)&&(!q||[r.product_slug,r.customer_name,r.review_text].join(" ").toLowerCase().includes(q)));$("#reviewsBadge").textContent=reviews.filter(r=>r.status==="pending").length||"";$("#reviewsAdminEmpty").hidden=!!list.length;$("#reviewsAdminList").innerHTML=list.map(r=>`<article class="admin-card review-admin-card"><div>${r.photo_url?`<img class="review-admin-card__photo" src="${esc(r.photo_url)}" alt="Фото до відгуку" loading="lazy">`:""}<div class="review-admin-card__stars">${"★".repeat(Number(r.rating)||0)}${"☆".repeat(5-(Number(r.rating)||0))}</div><div class="admin-card__title">${esc(r.product_slug)} · ${esc(r.customer_name)}</div><p>${esc(r.review_text)}</p><div class="admin-card__meta">${date(r.created_at)} · ${esc(r.status)}${r.verified_purchase?" · Перевірена покупка":""}</div></div><div class="review-admin-card__actions">${r.status!=="approved"?`<button class="btn btn-primary btn-small" data-review-action="approved" data-review-id="${r.id}">Схвалити</button>`:""}${r.status!=="rejected"?`<button class="btn btn-secondary btn-small" data-review-action="rejected" data-review-id="${r.id}">Відхилити</button>`:""}</div></article>`).join("");document.querySelectorAll("[data-review-action]").forEach(b=>b.addEventListener("click",()=>moderateReview(b.dataset.reviewId,b.dataset.reviewAction)));}
async function moderateReview(id,status){const {error}=await sb.from("reviews").update({status}).eq("id",id);if(error)return toast("Помилка: "+error.message,"danger");const row=reviews.find(r=>String(r.id)===String(id));if(row)row.status=status;renderReviews();toast(status==="approved"?"Відгук схвалено":"Відгук відхилено","success");}
function paymentEventLabel(status){return paymentEventLabels[String(status||"").toLowerCase()]||`Статус банку: ${status||"—"}`;}
function paymentEventTone(status){status=String(status||"").toLowerCase();if(status==="success")return"success";if(["failure","failed","expired"].includes(status))return"danger";if(["refunded","reversed"].includes(status))return"info";return"pending";}
function buildPaymentTimeline(){
  const entries=[{time:activeOrder.created_at,title:"Замовлення створено",detail:`${paymentMethodLabels[activeOrder.payment_method]||"Спосіб оплати не вказано"}`,tone:"neutral"}];
  const seen=new Set();
  activeOrderEvents.filter(event=>event.accepted!==false).forEach(event=>{
    const key=[event.invoice_id,event.provider_status,event.provider_modified_at||event.created_at].join("|");if(seen.has(key))return;seen.add(key);
    const suffix=event.invoice_id?` · invoice …${String(event.invoice_id).slice(-6)}`:"";
    entries.push({time:event.provider_modified_at||event.created_at,title:paymentEventLabel(event.provider_status),detail:`${event.reason==="APPLIED"?"plata by mono":event.reason||"Подія платежу"}${suffix}`,tone:paymentEventTone(event.provider_status)});
  });
  if(activeOrder.tracking_number)entries.push({time:activeOrder.status_changed_at||activeOrder.updated_at,title:"Додано ТТН",detail:activeOrder.tracking_number,tone:"info"});
  if(activeOrder.status==="completed")entries.push({time:activeOrder.delivery_confirmed_at||activeOrder.completed_at||activeOrder.status_changed_at||activeOrder.updated_at,title:"Посилку доставлено",detail:activeOrder.nova_poshta_status_text||"Отримання підтверджено, цикл замовлення завершено",tone:"success"});
  return entries.sort((a,b)=>new Date(a.time)-new Date(b.time));
}
async function loadOrderPaymentHistory(orderId){
  activeOrderAttempts=[];activeOrderEvents=[];
  if(!isCardOrder(activeOrder))return;
  const [attemptsResult,eventsResult]=await Promise.all([
    sb.from("payment_attempts").select("id,invoice_id,page_url,reference,amount_minor,currency,status,provider_created_at,provider_modified_at,paid_at,failure_reason,error_code,created_at,updated_at").eq("order_id",orderId).order("created_at",{ascending:false}),
    sb.from("payment_events").select("id,invoice_id,provider_status,provider_modified_at,amount_minor,currency,accepted,reason,created_at").eq("order_id",orderId).order("created_at",{ascending:false}).limit(40)
  ]);
  if(!attemptsResult.error)activeOrderAttempts=attemptsResult.data||[];
  if(!eventsResult.error)activeOrderEvents=eventsResult.data||[];
}
function orderPaymentPanel(){
  if(!isCardOrder(activeOrder)){
    const title=activeOrder.payment_method==="cash_on_delivery"?"Оплата при отриманні":"Переказ на рахунок";
    const detail=activeOrder.payment_method==="cash_on_delivery"?"Замовлення можна відправити до оплати. Факт отримання коштів підтверджується вручну.":"Підтверджуйте оплату лише після фактичного зарахування коштів.";
    return `<section class="admin-order-section"><div class="admin-order-section__head"><div><p class="eyebrow">Оплата</p><h3>${esc(title)}</h3></div><span class="status-pill status-${activeOrder.payment_status==="paid"?"paid":"awaiting_payment"}">${esc(paymentStatusLabels[activeOrder.payment_status]||activeOrder.payment_status)}</span></div><p class="admin-section-copy">${esc(detail)}</p></section>`;
  }
  const bank=cardPaymentUi(activeOrder),attempt=activeOrderAttempts.find(row=>row.invoice_id===activeOrder.payment_invoice_id)||activeOrderAttempts[0]||null;
  const invoice=activeOrder.payment_invoice_id||attempt?.invoice_id||"";
  const paidAt=activeOrder.paid_at||attempt?.paid_at;
  return `<section class="admin-order-section admin-payment-premium admin-payment-premium--${bank.key}">
    <div class="admin-order-section__head"><div><p class="eyebrow">Карткова оплата</p><h3>plata by mono</h3></div><span class="admin-provider-badge admin-provider-badge--${bank.key}">${esc(bank.label)}</span></div>
    <p class="admin-section-copy">${esc(bank.detail)}</p>
    <div class="admin-payment-facts">
      <div><span>Сума</span><strong>${money(activeOrder.total_amount)}</strong></div>
      <div><span>Підтверджено</span><strong>${paidAt?date(paidAt):"—"}</strong></div>
      <div><span>Invoice</span><strong>${invoice?`…${esc(String(invoice).slice(-10))}`:"—"}</strong>${invoice?`<button type="button" data-copy="${esc(invoice)}" data-copy-label="Invoice скопійовано">Копіювати</button>`:""}</div>
      <div><span>Код банку</span><strong>${esc(activeOrder.payment_error_code||attempt?.error_code||"—")}</strong></div>
    </div>
    ${(activeOrder.payment_failure_reason||attempt?.failure_reason)?`<div class="admin-payment-alert"><span>Причина</span><strong>${esc(activeOrder.payment_failure_reason||attempt.failure_reason)}</strong></div>`:""}
    <div class="admin-inline-actions"><button id="refreshCardPaymentBtn" class="btn btn-secondary" type="button">Синхронізувати з mono</button></div>
  </section>`;
}
function orderTimelinePanel(){
  const timeline=buildPaymentTimeline();
  return `<section class="admin-order-section"><div class="admin-order-section__head"><div><p class="eyebrow">Історія</p><h3>Події замовлення</h3></div><small>${timeline.length} подій</small></div><div class="admin-order-timeline">${timeline.map((entry,index)=>`<article class="admin-timeline-item admin-timeline-item--${entry.tone}${index===timeline.length-1?" is-latest":""}"><span class="admin-timeline-dot"></span><div><time>${shortDate(entry.time)}</time><strong>${esc(entry.title)}</strong><p>${esc(entry.detail)}</p></div></article>`).join("")}</div></section>`;
}
function renderOrderDialog({loading=false}={}){
  if(!activeOrder)return;
  if(loading){$("#orderDialogContent").innerHTML='<div class="admin-dialog__body"><div class="admin-order-loading"><span></span><p>Збираємо дані замовлення…</p></div></div>';return;}
  const items=Array.isArray(activeOrder.items)?activeOrder.items:[],cardPayment=isCardOrder(activeOrder),guidance=orderGuidance(activeOrder),displayedStatus=effectiveOrderStatus(activeOrder);
  $("#orderDialogContent").innerHTML=`<div class="admin-dialog__body admin-order-view">
    <header class="admin-order-hero">
      <img class="admin-order-hero__photo" src="/images/pages/delivery-cta.webp" alt="Пакування VA HOME" width="1672" height="941" loading="eager">
      <div class="admin-order-hero__shade" aria-hidden="true"></div>
      <div class="admin-order-hero__glass">
        <p class="eyebrow">Замовлення</p>
        <h2>${esc(activeOrder.client_order_id)}</h2>
        <div class="admin-order-hero__meta"><span>${date(activeOrder.created_at)}</span><span class="status-pill status-${esc(displayedStatus)}">${esc(statusLabels[displayedStatus]||displayedStatus)}</span></div>
        <strong class="admin-order-total">${money(activeOrder.total_amount)}</strong>
      </div>
    </header>
    <section class="admin-next-step admin-next-step--${guidance.tone}"><div><p class="eyebrow">Наступний крок</p><h3>${esc(guidance.title)}</h3><p>${esc(guidance.detail)}</p></div>${guidance.action?`<button class="btn btn-primary" type="button" data-dialog-primary-status="${guidance.action.status}">${esc(guidance.action.label)}</button>`:""}</section>
    <section class="admin-order-section"><div class="admin-order-section__head"><div><p class="eyebrow">Клієнт і доставка</p><h3>${esc(activeOrder.customer_name)}</h3></div><div class="admin-contact-actions"><a href="tel:${esc(normalizePhone(activeOrder.customer_phone))}">Подзвонити</a><a href="mailto:${esc(activeOrder.customer_email)}">Написати</a></div></div><div class="admin-detail-grid admin-detail-grid--premium">
      <div class="admin-detail"><span>Телефон</span><strong>${esc(activeOrder.customer_phone)}</strong><button type="button" data-copy="${esc(activeOrder.customer_phone)}" data-copy-label="Телефон скопійовано">Копіювати</button></div>
      <div class="admin-detail"><span>Email</span><strong>${esc(activeOrder.customer_email)}</strong><button type="button" data-copy="${esc(activeOrder.customer_email)}" data-copy-label="Email скопійовано">Копіювати</button></div>
      <div class="admin-detail admin-detail--wide"><span>Доставка</span><strong>${esc(activeOrder.delivery_method||"Нова пошта")}</strong><p>${esc([activeOrder.customer_city,activeOrder.delivery_details].filter(Boolean).join(", ")||"Дані доставки не вказані")}</p></div>
      ${activeOrder.tracking_number?`<div class="admin-detail admin-detail--wide admin-delivery-live"><span>Нова пошта</span><strong>${esc(activeOrder.nova_poshta_status_text||"Очікуємо першу автоматичну перевірку")}</strong><p>${activeOrder.nova_poshta_checked_at?`Оновлено ${esc(date(activeOrder.nova_poshta_checked_at))}`:"Перевіряємо кожні 30 хвилин після відправлення."}</p></div>`:""}
      <div class="admin-detail"><span>Персональні пропозиції</span><strong>${activeOrder.marketing_consent?"Згода надана":"Без згоди"}</strong></div>
    </div></section>
    <section class="admin-order-section"><div class="admin-order-section__head"><div><p class="eyebrow">Склад замовлення</p><h3>${items.length} ${items.length===1?"позиція":"позиції"}</h3></div></div><div class="admin-items admin-items--premium">${items.map(item=>{const image=itemImage(item),selections=itemSelections(item);return `<article class="admin-item admin-item--premium">${image?`<img src="${esc(image)}" alt="" loading="lazy">`:""}<div><strong>${esc(item.name||item.id||"Товар")} × ${esc(item.quantity||1)}</strong>${selections.length?`<small>Обрано: ${selections.map(esc).join(" · ")}</small>`:""}</div><span>${money(item.line_total)}</span></article>`;}).join("")}</div>${activeOrder.discount_amount?`<div class="admin-order-discount"><span>Промокод ${esc(activeOrder.promo_code||"")}</span><strong>−${money(activeOrder.discount_amount)}</strong></div>`:""}</section>
    ${orderPaymentPanel()}
    ${cardPayment?orderTimelinePanel():""}
    <section class="admin-order-section admin-order-management"><div class="admin-order-section__head"><div><p class="eyebrow">Керування</p><h3>Статус і відправлення</h3></div></div><div class="admin-actions">
      <label class="admin-field">Статус замовлення<select id="editStatus">${orderStatusOptions(activeOrder)}</select><small>${cardPayment?"Етапи залежать від підтвердженого статусу банку. ":""}Зміна статусу зберігається одразу.</small></label>
      <label class="admin-field">Статус оплати<select id="editPayment" ${cardPayment?"disabled":""}>${cardPayment?`<option>${esc(paymentStatusLabels[activeOrder.payment_status]||activeOrder.payment_status)}</option>`:manualPaymentOptions(activeOrder)}</select>${cardPayment?"<small>Статус змінює лише plata by mono.</small>":"<small>Підтверджуйте оплату тільки після фактичного надходження.</small>"}</label>
      <label class="admin-field">Спосіб оплати<select id="editPaymentMethod" ${cardPayment?"disabled":""}><option value="bank_transfer" ${activeOrder.payment_method==="bank_transfer"?"selected":""}>На рахунок</option><option value="cash_on_delivery" ${activeOrder.payment_method==="cash_on_delivery"?"selected":""}>При отриманні</option>${cardPayment?'<option value="card_online" selected>Карткою онлайн</option>':""}</select>${cardPayment?"<small>Спосіб зафіксований платіжним замовленням.</small>":""}</label>
      <label class="admin-field">ТТН<input id="editTracking" value="${esc(activeOrder.tracking_number||"")}" placeholder="Номер ТТН"><small>Клієнт побачить номер у своєму кабінеті.</small></label>
      ${activeOrder.status==="shipped"&&activeOrder.tracking_number?`<div class="admin-delivery-sync"><div><strong>Автоматичне відстеження активне</strong><small>Після отримання Нова пошта змінить статус на «Доставлено» й клієнту піде лист.</small></div><button id="syncDeliveryBtn" class="btn btn-secondary" type="button">Перевірити зараз</button></div>`:""}
      <label class="admin-field admin-field--wide">Коментар адміністратора<textarea id="editNote" placeholder="Внутрішня примітка — клієнт її не бачить">${esc(activeOrder.admin_note||"")}</textarea></label>
      <div class="admin-actions__buttons"><button id="resendStatusEmailBtn" class="btn btn-secondary" type="button">Надіслати лист повторно</button><button id="saveOrderBtn" class="btn btn-primary" type="button">Зберегти ТТН і примітку</button></div>
    </div></section>
  </div>`;
  $("#saveOrderBtn").addEventListener("click",saveOrder);
  $("#resendStatusEmailBtn").addEventListener("click",()=>sendStatusEmail(activeOrder.client_order_id));
  $("#editStatus").addEventListener("change",saveOrderStatusImmediately);
  requestAnimationFrame(()=>$("#orderDialog")?._premiumScrollUpdate?.());
  if(cardPayment)$("#refreshCardPaymentBtn")?.addEventListener("click",refreshCardPaymentStatus);
  $("#syncDeliveryBtn")?.addEventListener("click",syncDeliveryStatus);
  if(!cardPayment)$("#editPaymentMethod").addEventListener("change",async e=>{const {error}=await sb.from("orders").update({payment_method:e.target.value}).eq("id",activeOrder.id);if(error)return toast("Не вдалося змінити спосіб оплати","danger");activeOrder.payment_method=e.target.value;renderOrderDialog();toast("Спосіб оплати змінено","success");});
  $("#orderDialogContent").querySelectorAll("[data-copy]").forEach(button=>button.addEventListener("click",()=>copyText(button.dataset.copy,button.dataset.copyLabel)));
  $("#orderDialogContent").querySelectorAll("[data-dialog-primary-status]").forEach(button=>button.addEventListener("click",async()=>{const select=$("#editStatus");select.value=button.dataset.dialogPrimaryStatus;await saveOrderStatusImmediately();}));
}
async function openOrder(id){
  activeOrder=orders.find(o=>String(o.id)===String(id));if(!activeOrder)return;
  const dialog=$("#orderDialog");renderOrderDialog({loading:true});if(!dialog.open)dialog.showModal();dialog._premiumScrollUpdate?.();
  await loadOrderPaymentHistory(activeOrder.id);renderOrderDialog();
}
async function reloadActiveOrder(){
  if(!activeOrder)return;
  const {data,error}=await sb.from("orders").select("*").eq("id",activeOrder.id).single();if(error)throw error;
  activeOrder=data;const index=orders.findIndex(order=>String(order.id)===String(data.id));if(index>=0)orders[index]=data;
  await loadOrderPaymentHistory(data.id);renderOrders();renderOrderDialog();
}
async function saveOrderStatusImmediately(){
  if(!activeOrder)return;
  const select=$("#editStatus"),nextStatus=select.value,previousStatus=effectiveOrderStatus(activeOrder);if(nextStatus===previousStatus)return;
  if(isCardOrder(activeOrder)&&!canSetOrderStatus(activeOrder,nextStatus)){select.value=previousStatus;return toast("Цей етап недоступний для поточного статусу карткової оплати","warning");}
  if(nextStatus==="paid"&&isCardOrder(activeOrder)){select.value=previousStatus;return toast("Карткову оплату підтверджує тільки plata by mono","warning");}
  if(nextStatus==="paid"&&!isCardOrder(activeOrder)&&!confirm("Підтвердити, що оплату фактично отримано?")){select.value=previousStatus;return;}
  if(nextStatus==="cancelled"&&!confirm("Скасувати це замовлення?")){select.value=previousStatus;return;}
  select.disabled=true;
  const payload={action:"update",order_id:activeOrder.id,status:nextStatus};
  if(nextStatus==="paid"&&!isCardOrder(activeOrder))payload.payment_status="paid";
  try{
    const result=await adminOrderRequest(payload);
    applyUpdatedOrder(result.order);renderOrders();renderOrderDialog();announceOrderResult(result,{fallback:`Статус: ${statusLabels[effectiveOrderStatus(activeOrder)]||effectiveOrderStatus(activeOrder)}`});
  }catch(error){
    select.disabled=false;select.value=previousStatus;
    const message=String(error.message||"");
    if(message==="SESSION_EXPIRED")return;
    if(message.includes("CARD_ORDER_NOT_PAID"))return toast("Спочатку plata by mono має підтвердити оплату","warning");
    if(message.includes("CARD_ORDER_HAS_ACTIVE_INVOICE"))return toast("Не можна скасувати замовлення, доки рахунок mono активний","warning");
    if(message.includes("CARD_PAYMENT_SERVER_MANAGED"))return toast("Платіжні поля карткового замовлення змінює тільки сервер","warning");
    toast("Помилка: "+message,"danger");
  }finally{if(select)select.disabled=false;}
}
async function refreshCardPaymentStatus(){
  if(!activeOrder||!isCardOrder(activeOrder))return;
  const button=$("#refreshCardPaymentBtn");if(button){button.disabled=true;button.textContent="Синхронізуємо…";}
  const {error}=await sb.functions.invoke("admin-payment-sync",{body:{order_number:activeOrder.client_order_id}});
  if(error){if(button){button.disabled=false;button.textContent="Синхронізувати з mono";}return toast("Не вдалося отримати актуальний статус банку","danger");}
  try{await reloadActiveOrder();toast("Статус банку оновлено","success");}catch(_){toast("Банк відповів, але дані не вдалося оновити","warning");}
}
async function syncDeliveryStatus(){
  if(!activeOrder||activeOrder.status!=="shipped"||!activeOrder.tracking_number)return;
  const button=$("#syncDeliveryBtn");
  if(button){button.disabled=true;button.textContent="Перевіряємо…";}
  try{
    const token=await getAdminAccessToken();
    const response=await fetch(`${cfg.url}/functions/v1/sync-nova-poshta-deliveries`,{
      method:"POST",
      headers:{Authorization:`Bearer ${token}`,apikey:cfg.publishableKey,"Content-Type":"application/json"},
      body:JSON.stringify({order_id:activeOrder.id})
    });
    const payload=await response.json().catch(()=>({}));
    if(response.status===401){showLogin("Адмінська сесія завершилася. Увійдіть повторно.");return;}
    if(!response.ok)throw new Error(String(payload.error||`HTTP_${response.status}`));
    const result=Array.isArray(payload.results)?payload.results[0]:null;
    await reloadActiveOrder();
    if(result?.delivered)return toast("Нова пошта підтвердила отримання · статус «Доставлено»","success");
    if(result?.found)return toast(result.status_text||"Посилка ще в дорозі","success");
    toast("Нова пошта ще не повернула статус для цієї ТТН","warning");
  }catch(error){
    if(String(error.message)!=="SESSION_EXPIRED")toast("Не вдалося перевірити доставку. Спробуйте ще раз.","danger");
  }finally{
    if(button){button.disabled=false;button.textContent="Перевірити зараз";}
  }
}
async function saveOrder(){
  if(!activeOrder)return;
  const nextStatus=$("#editStatus").value;if(isCardOrder(activeOrder)&&!canSetOrderStatus(activeOrder,nextStatus))return toast("Цей етап недоступний для поточного статусу карткової оплати","warning");
  const payload={action:"update",order_id:activeOrder.id,status:nextStatus,tracking_number:$("#editTracking").value.trim()||null,admin_note:$("#editNote").value.trim()||null};
  if(!isCardOrder(activeOrder)){
    const nextPayment=$("#editPayment").value;
    if(nextPayment==="paid"&&activeOrder.payment_status!=="paid"&&!confirm("Підтвердити, що оплату фактично отримано?"))return;
    payload.payment_status=nextPayment;
    if(activeOrder.payment_method==="bank_transfer"&&nextPayment==="paid"&&["new","awaiting_payment"].includes(nextStatus))payload.status="paid";
  }
  try{
    const result=await adminOrderRequest(payload);
    applyUpdatedOrder(result.order);renderOrders();renderOrderDialog();announceOrderResult(result);
  }catch(error){
    const message=String(error.message||"");if(message==="SESSION_EXPIRED")return;
    if(message.includes("CARD_ORDER_NOT_PAID"))return toast("Спочатку plata by mono має підтвердити оплату","warning");
    if(message.includes("CARD_ORDER_HAS_ACTIVE_INVOICE"))return toast("Не можна скасувати замовлення, доки рахунок mono активний","warning");
    if(message.includes("CARD_PAYMENT_SERVER_MANAGED"))return toast("Платіжні поля карткового замовлення змінює тільки сервер","warning");
    toast("Помилка: "+message,"danger");
  }
}

function promoStatus(row){const now=Date.now();if(!row.active)return "inactive";if(row.starts_at&&new Date(row.starts_at).getTime()>now)return "scheduled";if(row.ends_at&&new Date(row.ends_at).getTime()<now)return "expired";if(row.usage_limit&&Number(row.usage_count||0)>=Number(row.usage_limit))return "exhausted";return "active";}
function renderPromos(){const q=$("#promoSearch").value.trim().toLowerCase(),filter=$("#promoStatusFilter").value;const list=promos.filter(p=>{const st=promoStatus(p);return(!q||[p.code,p.name].join(" ").toLowerCase().includes(q))&&(!filter||(filter==="active"?st==="active":st!=="active"));});$("#promosBadge").textContent=promos.filter(p=>promoStatus(p)==="active").length||"";$("#promosEmpty").hidden=!!list.length;$("#promosList").innerHTML=list.map(p=>`<article class="admin-card admin-promo-card" data-promo="${esc(p.id)}"><div><div class="admin-card__title">${esc(String(p.code||"").toUpperCase())}</div><div class="admin-card__meta">${esc(p.name||"Без назви")}</div></div><div><strong>${p.discount_type==="percent"?`${Number(p.discount_value)}%`:p.discount_type==="free_shipping"?"Безкоштовна доставка":money(p.discount_value)}</strong><div class="admin-card__meta">Використано: ${Number(p.usage_count||0)}${p.usage_limit?` / ${Number(p.usage_limit)}`:""}</div></div><span class="status-pill status-${promoStatus(p)==="active"?"paid":"cancelled"}">${promoStatus(p)==="active"?"Активний":promoStatus(p)==="scheduled"?"Запланований":promoStatus(p)==="expired"?"Завершений":"Вимкнений"}</span></article>`).join("");document.querySelectorAll("[data-promo]").forEach(el=>el.addEventListener("click",()=>openPromo(el.dataset.promo)));}
function isoLocal(v){if(!v)return "";const d=new Date(v);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);}
let promoViewportSnapshot=null;function capturePromoViewport(){const shell=$("#promoDialog .admin-promo-shell");promoViewportSnapshot={shellTop:shell?shell.scrollTop:0,pageX:window.scrollX,pageY:window.scrollY};}function restorePromoViewport(snapshot=promoViewportSnapshot){const shell=$("#promoDialog .admin-promo-shell");if(!snapshot)return;const restore=()=>{if(shell)shell.scrollTop=snapshot.shellTop;window.scrollTo(snapshot.pageX,snapshot.pageY);};restore();requestAnimationFrame(()=>{restore();requestAnimationFrame(restore);});promoViewportSnapshot=null;}function syncPromoForm(){const f=$("#promoForm"),shell=$("#promoDialog .admin-promo-shell"),snapshot=promoViewportSnapshot||{shellTop:shell?shell.scrollTop:0,pageX:window.scrollX,pageY:window.scrollY},type=f.elements.discount_type.value,applies=f.elements.applies_to.value;$("#promoValueField").classList.toggle("is-hidden",type==="free_shipping");$("#promoValueSuffix").textContent=type==="percent"?"%":"грн";$("#promoProductsField").classList.toggle("is-hidden",applies!=="products");const unlimited=$("#promoUnlimited").checked,noEnd=$("#promoNoEnd").checked;f.elements.usage_limit.disabled=unlimited;if(unlimited)f.elements.usage_limit.value="";f.elements.ends_at.disabled=noEnd;if(noEnd)f.elements.ends_at.value="";restorePromoViewport(snapshot);}
function generatePromoCode(){const prefixes=["VAHOME","WELCOME","SCENT","RITUAL","MOLECULE","PRIVATE"];const suffix=Math.random()<.55?String([10,15,20,50,100][Math.floor(Math.random()*5)]):Math.random().toString(36).slice(2,6).toUpperCase();const input=$("#promoForm").elements.code;input.value=`${prefixes[Math.floor(Math.random()*prefixes.length)]}${suffix}`;input.focus();input.select();}
function openPromo(id=""){activePromo=promos.find(p=>String(p.id)===String(id))||null;const f=$("#promoForm");f.reset();f.elements.active.checked=true;f.elements.discount_value.value=100;f.elements.min_order_amount.value=0;$("#promoUnlimited").checked=true;$("#promoNoEnd").checked=true;$("#promoDialogTitle").textContent=activePromo?"Редагувати промокод":"Новий промокод";$("#promoSubmitLabel").textContent=activePromo?"Зберегти зміни":"Створити промокод";$("#deletePromoBtn").hidden=!activePromo;$("#promoFormMessage").textContent="";if(activePromo){for(const k of ["id","code","name","discount_type","discount_value","min_order_amount","usage_limit","applies_to"]){if(f.elements[k])f.elements[k].value=activePromo[k]??"";}f.elements.starts_at.value=isoLocal(activePromo.starts_at);f.elements.ends_at.value=isoLocal(activePromo.ends_at);f.elements.product_ids.value=Array.isArray(activePromo.product_ids)?activePromo.product_ids.join(", "):"";f.elements.active.checked=!!activePromo.active;$("#promoUnlimited").checked=!activePromo.usage_limit;$("#promoNoEnd").checked=!activePromo.ends_at;}syncPromoForm();const dialog=$("#promoDialog"),shell=$("#promoDialog .admin-promo-shell");dialog.showModal();if(shell)shell.scrollTop=0;setTimeout(()=>{if(shell)shell.scrollTop=0;try{f.elements.code.focus({preventScroll:true});}catch(_){f.elements.code.focus();if(shell)shell.scrollTop=0;}},100);}
async function savePromo(e){e.preventDefault();const f=e.currentTarget,fd=new FormData(f),code=String(fd.get("code")||"").trim().toUpperCase();if(!/^[A-Z0-9_-]{3,40}$/.test(code)){ $("#promoFormMessage").textContent="Код: 3–40 символів, латиниця, цифри, _ або -.";return;}const payload={code,name:String(fd.get("name")||"").trim()||null,discount_type:fd.get("discount_type"),discount_value:Number(fd.get("discount_value")||0),min_order_amount:Number(fd.get("min_order_amount")||0),usage_limit:fd.get("usage_limit")?Number(fd.get("usage_limit")):null,starts_at:fd.get("starts_at")?new Date(String(fd.get("starts_at"))).toISOString():null,ends_at:fd.get("ends_at")?new Date(String(fd.get("ends_at"))).toISOString():null,applies_to:fd.get("applies_to"),product_ids:String(fd.get("product_ids")||"").split(",").map(x=>x.trim()).filter(Boolean),active:fd.get("active")==="on",updated_at:new Date().toISOString()};if(payload.discount_type==="percent"&&(payload.discount_value<=0||payload.discount_value>100)){$("#promoFormMessage").textContent="Відсоток має бути від 1 до 100.";return;}const q=activePromo?sb.from("promo_codes").update(payload).eq("id",activePromo.id).select().single():sb.from("promo_codes").insert(payload).select().single();const {data,error}=await q;if(error){$("#promoFormMessage").textContent="Помилка: "+error.message;return;}if(activePromo)Object.assign(activePromo,data);else promos.unshift(data);$("#promoDialog").close();renderPromos();toast("Промокод збережено");}
async function deletePromo(){if(!activePromo||!confirm(`Видалити промокод ${activePromo.code}?`))return;const {error}=await sb.from("promo_codes").delete().eq("id",activePromo.id);if(error)return toast("Помилка: "+error.message);promos=promos.filter(p=>p.id!==activePromo.id);$("#promoDialog").close();renderPromos();toast("Промокод видалено");}

function releaseStatus(row){const now=Date.now(),preview=new Date(row.preview_starts_at).getTime(),publicAt=new Date(row.public_starts_at).getTime();if(!row.active)return{key:"inactive",label:"Вимкнений"};if(now<preview)return{key:"scheduled",label:"Запланований"};if(now<publicAt)return{key:"private",label:"Private Preview"};return{key:"public",label:"Публічний старт настав"};}
function renderReleases(){const host=$("#releasesList"),empty=$("#releasesEmpty");if(!host||!empty)return;$("#releasesBadge").textContent=releases.filter(r=>releaseStatus(r).key==="private").length||"";empty.hidden=!!releases.length;host.innerHTML=releases.map(row=>{const st=releaseStatus(row);return `<article class="admin-card admin-release-card" data-release="${esc(row.id)}"><div><div class="admin-card__title">${esc(row.title)}</div><div class="admin-card__meta">${esc(row.eyebrow||"PRIVATE RELEASE")} · ${esc(row.slug)}</div></div><div><strong>${date(row.public_starts_at)}</strong><div class="admin-card__meta">Preview: ${date(row.preview_starts_at)}</div></div><span class="status-pill status-${st.key==="private"?"paid":st.key==="scheduled"?"awaiting_payment":"cancelled"}">${esc(st.label)}</span></article>`}).join("");host.querySelectorAll("[data-release]").forEach(el=>el.addEventListener("click",()=>openRelease(el.dataset.release)));}
function releaseSlug(value){return String(value||"").trim().toLowerCase().normalize("NFKD").replace(/[’']/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);}
function syncRelease48(){const f=$("#releaseForm");if(!f||!$("#releaseAuto48").checked||!f.elements.public_starts_at.value)return;const publicAt=new Date(f.elements.public_starts_at.value);if(Number.isNaN(publicAt.getTime()))return;f.elements.preview_starts_at.value=isoLocal(new Date(publicAt.getTime()-48*60*60*1000));}
function fillReleaseProducts(selected=""){const select=$("#releaseProductSelect");if(!select)return;select.innerHTML='<option value="">Без товарної картки</option>'+((window.PRODUCTS||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(""));select.value=selected||"";}
function openRelease(id=""){activeRelease=releases.find(r=>String(r.id)===String(id))||null;const f=$("#releaseForm");f.reset();delete f.elements.slug.dataset.edited;f.elements.eyebrow.value="PRIVATE RELEASE · NOIR";f.elements.active.checked=true;$("#releaseAuto48").checked=true;$("#releaseDialogTitle").textContent=activeRelease?"Редагувати приватний реліз":"Новий приватний реліз";$("#deleteReleaseBtn").hidden=!activeRelease;$("#releaseFormMessage").textContent="";fillReleaseProducts(activeRelease?.product_id||"");if(activeRelease){f.elements.slug.dataset.edited="1";for(const key of ["id","title","slug","eyebrow","description","image_url"]){if(f.elements[key])f.elements[key].value=activeRelease[key]??"";}f.elements.product_id.value=activeRelease.product_id||"";f.elements.preview_starts_at.value=isoLocal(activeRelease.preview_starts_at);f.elements.public_starts_at.value=isoLocal(activeRelease.public_starts_at);f.elements.active.checked=!!activeRelease.active;const diff=new Date(activeRelease.public_starts_at)-new Date(activeRelease.preview_starts_at);$("#releaseAuto48").checked=Math.abs(diff-48*60*60*1000)<60000;}else{const publicAt=new Date(Date.now()+7*24*60*60*1000);publicAt.setMinutes(0,0,0);f.elements.public_starts_at.value=isoLocal(publicAt);syncRelease48();}$("#releaseDialog").showModal();setTimeout(()=>f.elements.title.focus(),80);}
async function saveRelease(event){event.preventDefault();const f=event.currentTarget,fd=new FormData(f),publicAt=new Date(String(fd.get("public_starts_at")||"")),previewAt=new Date(String(fd.get("preview_starts_at")||""));const title=String(fd.get("title")||"").trim(),slug=releaseSlug(fd.get("slug")||title);if(!title||!slug||Number.isNaN(publicAt.getTime())||Number.isNaN(previewAt.getTime())||previewAt>=publicAt){$("#releaseFormMessage").textContent="Перевірте назву, slug і часовий інтервал релізу.";return;}const payload={title,slug,eyebrow:String(fd.get("eyebrow")||"PRIVATE RELEASE").trim(),description:String(fd.get("description")||"").trim(),product_id:String(fd.get("product_id")||"").trim()||null,image_url:String(fd.get("image_url")||"").trim()||null,preview_starts_at:previewAt.toISOString(),public_starts_at:publicAt.toISOString(),active:fd.get("active")==="on",updated_at:new Date().toISOString()};const query=activeRelease?sb.from("private_releases").update(payload).eq("id",activeRelease.id).select().single():sb.from("private_releases").insert(payload).select().single();const {data,error}=await query;if(error){$("#releaseFormMessage").textContent="Помилка: "+error.message;return;}if(activeRelease)Object.assign(activeRelease,data);else releases.unshift(data);$("#releaseDialog").close();renderReleases();toast("Private release збережено");}
async function deleteRelease(){if(!activeRelease||!confirm(`Видалити реліз ${activeRelease.title}?`))return;const {error}=await sb.from("private_releases").delete().eq("id",activeRelease.id);if(error)return toast("Помилка: "+error.message);releases=releases.filter(r=>r.id!==activeRelease.id);$("#releaseDialog").close();renderReleases();toast("Реліз видалено");}

function bind(){
  $("#loginForm").addEventListener("submit",async event=>{
    event.preventDefault();$("#loginMessage").textContent="Входимо…";
    const email=event.target.email.value.trim(),password=event.target.password.value;
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error)return showLogin("Помилка входу: "+error.message);
    try{await requireAdmin();showDashboard();await loadAll();}catch(err){showLogin(err.message);}
  });
  $("#logoutBtn").addEventListener("click",async()=>{await sb.auth.signOut({scope:"local"});showLogin();});
  $("#refreshBtn").addEventListener("click",loadAll);
  ["#orderSearch","#orderStatusFilter","#orderSort"].forEach(selector=>$(selector)?.addEventListener("input",renderOrders));
  $("#orderFocusFilters")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-smart-filter]");if(!button)return;
    currentOrderSmartFilter=button.dataset.smartFilter||"all";
    $("#orderStatusFilter").value="";
    renderOrders();
    $("#ordersList").scrollIntoView({behavior:"smooth",block:"start"});
  });
  ["#reviewSearch","#reviewStatusFilter"].forEach(selector=>$(selector).addEventListener("input",renderReviews));
  $("#promoSearch").addEventListener("input",renderPromos);$("#promoStatusFilter").addEventListener("input",renderPromos);
  $("#newPromoBtn").addEventListener("click",()=>openPromo());$("#promoForm").addEventListener("submit",savePromo);$("#deletePromoBtn").addEventListener("click",deletePromo);
  $("#newReleaseBtn").addEventListener("click",()=>openRelease());$("#releaseForm").addEventListener("submit",saveRelease);$("#deleteReleaseBtn").addEventListener("click",deleteRelease);$("#cancelReleaseBtn").addEventListener("click",()=>$("#releaseDialog").close());$("#releaseDialog .admin-release-close").addEventListener("click",()=>$("#releaseDialog").close());
  $("#releaseForm").elements.public_starts_at.addEventListener("change",syncRelease48);$("#releaseAuto48").addEventListener("change",syncRelease48);
  $("#releaseForm").elements.title.addEventListener("input",event=>{const slug=$("#releaseForm").elements.slug;if(!activeRelease&&!slug.dataset.edited)slug.value=releaseSlug(event.target.value);});
  $("#releaseForm").elements.slug.addEventListener("input",event=>{event.target.dataset.edited="1";event.target.value=releaseSlug(event.target.value);});
  const orderDialog=$("#orderDialog"),orderDialogClose=$("#orderDialogClose");
  setupPremiumScrollbar(orderDialog);
  orderDialogClose.addEventListener("click",()=>{if(orderDialog.open)orderDialog.close();});
  orderDialog.addEventListener("cancel",()=>{activeOrder=null;activeOrderAttempts=[];activeOrderEvents=[];});
  orderDialog.addEventListener("close",()=>{activeOrder=null;activeOrderAttempts=[];activeOrderEvents=[];});
  $("#cancelPromoBtn").addEventListener("click",()=>$("#promoDialog").close());$("#promoDialog .admin-promo-close").addEventListener("click",()=>$("#promoDialog").close());$("#generatePromoBtn").addEventListener("click",generatePromoCode);
  ["#promoUnlimited","#promoNoEnd"].forEach(selector=>{const el=$(selector);el.addEventListener("pointerdown",capturePromoViewport,{passive:true});el.addEventListener("keydown",event=>{if(event.key===" "||event.key==="Enter")capturePromoViewport();});el.addEventListener("change",syncPromoForm);});
  ["discount_type","applies_to"].forEach(name=>{const el=$("#promoForm").elements[name];el.addEventListener("pointerdown",capturePromoViewport,{passive:true});el.addEventListener("keydown",capturePromoViewport);el.addEventListener("change",syncPromoForm);});
  $("#promoDialog").addEventListener("close",()=>{const shell=$("#promoDialog .admin-promo-shell");if(shell)shell.scrollTop=0;promoViewportSnapshot=null;});
  $("#promoForm").elements.code.addEventListener("input",event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,"");});
  const activateTab=(name,{updateHash=true}={})=>{const allowed=["orders","reviews","promos","releases","analytics"],tab=allowed.includes(name)?name:"orders";document.querySelectorAll("[data-tab]").forEach(button=>button.classList.toggle("is-active",button.dataset.tab===tab));$("#ordersTab").hidden=tab!=="orders";$("#reviewsTab").hidden=tab!=="reviews";$("#promosTab").hidden=tab!=="promos";$("#releasesTab").hidden=tab!=="releases";$("#analyticsTab").hidden=tab!=="analytics";if(updateHash&&location.hash!==`#${tab}`)history.replaceState(null,"",`#${tab}`);};
  document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>activateTab(button.dataset.tab)));window.addEventListener("hashchange",()=>activateTab(location.hash.slice(1),{updateHash:false}));activateTab(location.hash.slice(1),{updateHash:false});
}
document.addEventListener("DOMContentLoaded",async()=>{bind();const {data:{session}}=await sb.auth.getSession();if(!session)return showLogin();try{await requireAdmin();showDashboard();await loadAll();}catch(err){showLogin(err.message);}});
})();
