(function(){"use strict";
const cfg=window.SITE_CONFIG.supabase;
const sb=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{storageKey:"vahome_admin_auth_v1",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const statusLabels={new:"Нове",awaiting_payment:"Очікує оплату",paid:"Оплачено",shipped:"Відправлено",completed:"Доставлено",cancelled:"Скасовано"};
const orderStatusOrder=["new","awaiting_payment","paid","shipped","completed","cancelled"];
const paymentMethodLabels={bank_transfer:"На рахунок",cash_on_delivery:"При отриманні",card_online:"Карткою онлайн"};
const paymentStatusLabels={unpaid:"Не оплачено",pending:"Очікує банк",verification:"Перевіряємо",failed:"Не завершено",expired:"Прострочено",paid:"Оплачено",refunded:"Повернено"};
const paymentEventLabels={created:"Рахунок створено",processing:"Банк перевіряє оплату",hold:"Кошти зарезервовано",success:"Оплату підтверджено",failure:"Оплату не завершено",failed:"Оплату не завершено",expired:"Рахунок прострочено",reversed:"Платіж скасовано",refunded:"Кошти повернено"};
let orders=[],reviews=[],promos=[],releases=[],marketingPreferences=[],repeatCampaigns=[],discoveryCredits=[],paymentAttempts=[],paymentSettings=[],adminAudit=[],vahomeExpenses=[],activeOrder=null,activePromo=null,activeRelease=null,activeExpense=null,activeCustomerKey="",customer360ReturnState=null,customer360HistoryActive=false,customer360SkipRestore=false,orderDetailReturnState=null,orderDetailHistoryActive=false,orderDetailSkipRestore=false;
let activeOrderAttempts=[],activeOrderEvents=[],currentOrderSmartFilter="all",adminSearchActiveIndex=-1,adminAutoSyncTimer=null,adminLoadPromise=null;
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const money=v=>`${Number(v||0).toLocaleString("uk-UA",{maximumFractionDigits:2})} грн`;
const date=v=>v?new Intl.DateTimeFormat("uk-UA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";
const shortDate=v=>v?new Intl.DateTimeFormat("uk-UA",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(v)):"—";
const normalizePhone=v=>String(v||"").replace(/[^+\d]/g,"");
const repeatStatusLabels={pending:"Очікує",sending:"Надсилаємо",sent:"Надіслано",failed:"Помилка",skipped:"Пропущено"};
const reviewStatusLabels={pending:"Очікує модерації",approved:"Схвалено",rejected:"Відхилено"};
const creditStatusLabels={active:"Активний",used:"Використано",expired:"Прострочено",cancelled:"Скасовано"};
function relativeAge(value){if(!value)return"—";const ms=Math.max(0,Date.now()-new Date(value).getTime()),m=Math.floor(ms/60000);if(m<1)return"щойно";if(m<60)return`${m} хв тому`;const h=Math.floor(m/60);if(h<24)return`${h} год тому`;const d=Math.floor(h/24);return`${d} дн тому`;}
function setSyncState(state,label=""){
  const top=$("#adminSyncState"),side=$(".admin2-sidebar-foot"),sideText=$("#adminSidebarSync");
  const defaults={syncing:"Оновлюємо…",synced:"Синхронізовано",error:"Помилка синхронізації",offline:"Офлайн"};
  const text=label||defaults[state]||defaults.synced;
  if(top){top.dataset.state=state;top.innerHTML=`<i></i>${esc(text)}`;top.title=state==="synced"?`Останнє успішне оновлення: ${new Date().toLocaleTimeString("uk-UA",{hour:"2-digit",minute:"2-digit"})}`:text;}
  if(side){side.dataset.state=state;}if(sideText)sideText.textContent=text;
  const mobileDot=$("#adminMobileSyncDot");if(mobileDot)mobileDot.dataset.state=state;
}
function startAdminAutoSync(){if(adminAutoSyncTimer)clearInterval(adminAutoSyncTimer);adminAutoSyncTimer=setInterval(()=>{if(!document.hidden&&navigator.onLine&&!$("#dashboardView")?.hidden)loadAll({silent:true}).catch(()=>{});},60000);}
function highlightMatch(value,query){const text=String(value??""),needle=String(query||"").trim();if(!needle)return esc(text);const i=text.toLowerCase().indexOf(needle.toLowerCase());if(i<0)return esc(text);return `${esc(text.slice(0,i))}<mark>${esc(text.slice(i,i+needle.length))}</mark>${esc(text.slice(i+needle.length))}`;}
let confirmResolver=null;
function premiumConfirm({title="Підтвердити дію?",text="",confirmLabel="Підтвердити",kicker="Підтвердження",tone="default"}={}){
  const dialog=$("#adminConfirmDialog");if(!dialog)return Promise.resolve(window.confirm(text||title));
  if(confirmResolver){confirmResolver(false);confirmResolver=null;}
  $("#adminConfirmTitle").textContent=title;$("#adminConfirmText").textContent=text;$("#adminConfirmKicker").textContent=kicker;$("#adminConfirmAccept").textContent=confirmLabel;dialog.dataset.tone=tone;
  if(!dialog.open)dialog.showModal();
  return new Promise(resolve=>{confirmResolver=resolve;});
}

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
}function cardPaymentUi(order){
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
function showLogin(message=""){$("#loginView").hidden=false;$("#dashboardView").hidden=true;document.body.classList.remove("admin2-dashboard-open");const logout=$("#logoutBtn");if(logout)logout.hidden=true;$("#loginMessage").textContent=message;}
function showDashboard(){$("#loginView").hidden=true;$("#loginMessage").textContent="";$("#dashboardView").hidden=false;document.body.classList.add("admin2-dashboard-open");const logout=$("#logoutBtn");if(logout)logout.hidden=false;activateAdmin2View(location.hash.replace(/^#/,"")||"overview",{updateHash:false});window.scrollTo({top:0,behavior:"auto"});}
async function loadAll({silent=false}={}){
  if(adminLoadPromise)return adminLoadPromise;
  adminLoadPromise=(async()=>{
    document.body.classList.add("admin-loading");setSyncState(navigator.onLine?"syncing":"offline");
    try{
      if(!navigator.onLine)throw new Error("OFFLINE");
      const core=await Promise.all([
        sb.from("orders").select("*").order("created_at",{ascending:false}).limit(500),
        sb.from("reviews").select("*").order("created_at",{ascending:false}).limit(500),
        sb.from("promo_codes").select("*").order("created_at",{ascending:false}),
        sb.from("private_releases").select("*").order("public_starts_at",{ascending:false})
      ]);
      const [o,r,p,rel]=core;if(o.error)throw o.error;if(r.error)throw r.error;if(p.error)throw p.error;if(rel.error)throw rel.error;
      orders=o.data||[];reviews=r.data||[];promos=p.data||[];releases=rel.data||[];
      const optional=await Promise.allSettled([
        sb.from("marketing_preferences").select("*").order("created_at",{ascending:false}).limit(500),
        sb.from("repeat_purchase_campaigns").select("*").order("created_at",{ascending:false}).limit(500),
        sb.from("discovery_credits").select("*").order("created_at",{ascending:false}).limit(500),
        sb.from("payment_attempts").select("*").order("created_at",{ascending:false}).limit(500),
        sb.from("payment_settings").select("*"),
        sb.from("vahome_admin_audit").select("id,entity_type,entity_id,action,changed_fields,actor_id,actor_email,created_at,meta").order("created_at",{ascending:false}).limit(60),
        sb.from("vahome_expenses").select("*").order("expense_date",{ascending:false}).order("created_at",{ascending:false}).limit(1000)
      ]);
      const dataOrEmpty=result=>result.status==="fulfilled"&&!result.value.error?(result.value.data||[]):[];
      marketingPreferences=dataOrEmpty(optional[0]);repeatCampaigns=dataOrEmpty(optional[1]);discoveryCredits=dataOrEmpty(optional[2]);paymentAttempts=dataOrEmpty(optional[3]);paymentSettings=dataOrEmpty(optional[4]);adminAudit=dataOrEmpty(optional[5]);vahomeExpenses=dataOrEmpty(optional[6]);
      renderOrders();renderReviews();renderPromos();renderReleases();renderAdmin2();
      setSyncState("synced",`Синхронізовано ${new Date().toLocaleTimeString("uk-UA",{hour:"2-digit",minute:"2-digit"})}`);
      return true;
    }catch(error){setSyncState(navigator.onLine?"error":"offline");if(!silent&&String(error?.message||"")!=="OFFLINE")toast("Не вдалося оновити дані. Перевірте з’єднання.","danger");throw error;}
    finally{document.body.classList.remove("admin-loading");}
  })();
  try{return await adminLoadPromise;}finally{adminLoadPromise=null;}
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
  $("#periodStats").innerHTML=periods.map(([label,start])=>{const ordered=orders.filter(o=>new Date(o.created_at)>=start&&effectiveOrderStatus(o)!=="cancelled"),received=cashReceivedOrders().filter(o=>new Date(o.paid_at||o.updated_at||o.created_at)>=start);return `<article class="admin-period-card"><span>${label}</span><strong>${money(sumAmount(received))}</strong><small class="admin2-period-paid">Отримано · ${received.length} оплат</small><small class="admin2-period-ordered">Замовлено · ${money(sumAmount(ordered))} · ${ordered.length}</small></article>`;}).join("");
  renderChart();renderFocusFilters();
}
function renderChart(){const days=[];for(let i=29;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push({date:d,total:0});}cashReceivedOrders().forEach(o=>{const d=new Date(o.paid_at||o.updated_at||o.created_at);d.setHours(0,0,0,0);const day=days.find(x=>x.date.getTime()===d.getTime());if(day)day.total+=Number(o.total_amount||0);});const max=Math.max(1,...days.map(d=>d.total));$("#salesChart").innerHTML=days.map(d=>`<div class="admin-chart__bar" style="--bar-height:${Math.max(2,d.total/max*100)}%"><span>${d.date.toLocaleDateString("uk-UA",{day:"2-digit",month:"2-digit"})}: ${money(d.total)}</span></div>`).join("");$("#chartTotal").textContent=money(days.reduce((s,d)=>s+d.total,0));}
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
  if(status==="paid"&&!isCardOrder(order)&&!(await premiumConfirm({title:"Оплату отримано?",text:"Підтверджуйте лише після фактичного зарахування коштів.",confirmLabel:"Так, оплату отримано"})))return;
  const old=effectiveOrderStatus(order),payload={status};if(status==="paid"&&!isCardOrder(order))payload.payment_status="paid";
  const {data,error}=await sb.from("orders").update(payload).eq("id",id).select().single();
  if(error)return toast("Помилка: "+error.message,"danger");
  Object.assign(order,data);renderOrders();toast("Статус змінено","success");
  if(old!==effectiveOrderStatus(order))sendStatusEmail(order.client_order_id);
}
function renderReviews(){
  const q=$("#reviewSearch").value.trim().toLowerCase(),filter=$("#reviewStatusFilter").value;
  const list=reviews.filter(r=>(!filter||r.status===filter)&&(!q||[r.product_slug,r.customer_name,r.review_text].join(" ").toLowerCase().includes(q)));
  $("#reviewsBadge").textContent=reviews.filter(r=>r.status==="pending").length||"";
  $("#reviewsAdminEmpty").hidden=!!list.length;
  $("#reviewsAdminList").innerHTML=list.map(r=>`<article class="admin-card review-admin-card"><div>${r.photo_url?`<img class="review-admin-card__photo" src="${esc(r.photo_url)}" alt="Фото до відгуку" loading="lazy">`:""}<div class="review-admin-card__stars">${"★".repeat(Number(r.rating)||0)}${"☆".repeat(5-(Number(r.rating)||0))}</div><div class="admin-card__title">${esc(r.product_slug)} · ${esc(r.customer_name)}</div><p>${esc(r.review_text)}</p><div class="admin-card__meta">${date(r.created_at)} · ${esc(reviewStatusLabels[r.status]||r.status)}${r.verified_purchase?" · Перевірена покупка":""}</div></div><div class="review-admin-card__actions">${r.status!=="approved"?`<button class="btn btn-primary btn-small" data-review-action="approved" data-review-id="${r.id}">Схвалити</button>`:""}${r.status!=="rejected"?`<button class="btn btn-secondary btn-small" data-review-action="rejected" data-review-id="${r.id}">Відхилити</button>`:""}</div></article>`).join("");
  document.querySelectorAll("[data-review-action]").forEach(b=>b.addEventListener("click",()=>moderateReview(b.dataset.reviewId,b.dataset.reviewAction)));
}
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
function captureOrderDetailReturnState(){const main=$("#admin2Main");return{view:activeAdmin2View,scrollTop:main?.scrollTop||0,orderSearch:$("#orderSearch")?.value||"",orderStatus:$("#orderStatusFilter")?.value||"",orderSort:$("#orderSort")?.value||"",smartFilter:currentOrderSmartFilter};}
function restoreOrderDetailReturnState(){const state=orderDetailReturnState;orderDetailReturnState=null;if(!state)return;if(activeAdmin2View!==state.view)activateAdmin2View(state.view,{updateHash:false});if(state.view==="orders"){const search=$("#orderSearch"),status=$("#orderStatusFilter"),sort=$("#orderSort");if(search)search.value=state.orderSearch||"";if(status)status.value=state.orderStatus||"";if(sort)sort.value=state.orderSort||"priority";currentOrderSmartFilter=state.smartFilter||"all";renderOrders();}const main=$("#admin2Main");if(main)requestAnimationFrame(()=>{main.scrollTop=Number(state.scrollTop||0);main.scrollLeft=0;});}
function closeOrderDetail({viaHistory=true,restore=true}={}){const dialog=$("#orderDialog");if(viaHistory&&orderDetailHistoryActive&&history.state?.adminDetail==="order"){history.back();return;}orderDetailSkipRestore=!restore;if(dialog?.open)dialog.close();else if(restore)restoreOrderDetailReturnState();}
async function openOrder(id,{pushHistory=true}={}){
  activeOrder=orders.find(o=>String(o.id)===String(id));if(!activeOrder)return;
  const dialog=$("#orderDialog");if(!dialog.open)orderDetailReturnState=captureOrderDetailReturnState();renderOrderDialog({loading:true});if(!dialog.open)dialog.showModal();dialog.scrollTop=0;dialog._premiumScrollUpdate?.();
  if(pushHistory&&history.state?.adminDetail!=="order"){history.pushState({adminDetail:"order",orderId:String(activeOrder.id)},"",location.href);orderDetailHistoryActive=true;}else if(history.state?.adminDetail==="order")orderDetailHistoryActive=true;
  await loadOrderPaymentHistory(activeOrder.id);renderOrderDialog();dialog.scrollTop=0;
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
  if(nextStatus==="paid"&&!isCardOrder(activeOrder)&&!(await premiumConfirm({title:"Оплату отримано?",text:"Підтверджуйте лише після фактичного зарахування коштів.",confirmLabel:"Так, оплату отримано"}))){select.value=previousStatus;return;}
  if(nextStatus==="cancelled"&&!(await premiumConfirm({title:"Скасувати замовлення?",text:"Статус зміниться на «Скасовано». Для активної карткової оплати діють додаткові серверні обмеження.",confirmLabel:"Скасувати замовлення",tone:"danger"}))){select.value=previousStatus;return;}
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
    if(nextPayment==="paid"&&activeOrder.payment_status!=="paid"&&!(await premiumConfirm({title:"Оплату отримано?",text:"Підтверджуйте лише після фактичного зарахування коштів.",confirmLabel:"Так, оплату отримано"})))return;
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
function openPromo(id="") {
  activePromo = promos.find((promo) => String(promo.id) === String(id)) || null;
  const form = $("#promoForm");
  form.reset();
  form.elements.active.checked = true;
  form.elements.discount_value.value = 100;
  form.elements.min_order_amount.value = 0;
  $("#promoUnlimited").checked = true;
  $("#promoNoEnd").checked = true;
  $("#promoDialogTitle").textContent = activePromo ? "Редагувати промокод" : "Новий промокод";
  $("#promoSubmitLabel").textContent = activePromo ? "Зберегти зміни" : "Створити промокод";
  $("#deletePromoBtn").hidden = !activePromo;
  $("#promoFormMessage").textContent = "";
  if (activePromo) {
    for (const key of ["id", "code", "name", "discount_type", "discount_value", "min_order_amount", "usage_limit", "applies_to", "checkout_description"]) {
      if (form.elements[key]) form.elements[key].value = activePromo[key] ?? "";
    }
    form.elements.starts_at.value = isoLocal(activePromo.starts_at);
    form.elements.ends_at.value = isoLocal(activePromo.ends_at);
    form.elements.product_ids.value = Array.isArray(activePromo.product_ids) ? activePromo.product_ids.join(", ") : "";
    form.elements.active.checked = Boolean(activePromo.active);
    if (form.elements.show_in_checkout) form.elements.show_in_checkout.checked = Boolean(activePromo.show_in_checkout);
    $("#promoUnlimited").checked = !activePromo.usage_limit;
    $("#promoNoEnd").checked = !activePromo.ends_at;
  }
  syncPromoForm();
  const dialog = $("#promoDialog");
  const shell = $("#promoDialog .admin-promo-shell");
  dialog.showModal();
  if (shell) shell.scrollTop = 0;
  setTimeout(() => {
    if (shell) shell.scrollTop = 0;
    try {
      form.elements.code.focus({ preventScroll: true });
    } catch (_) {
      form.elements.code.focus();
      if (shell) shell.scrollTop = 0;
    }
  }, 100);
}
async function savePromo(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    $("#promoFormMessage").textContent = "Код: 3–40 символів, латиниця, цифри, _ або -.";
    return;
  }
  const payload = {
    code,
    name: String(formData.get("name") || "").trim() || null,
    discount_type: formData.get("discount_type"),
    discount_value: Number(formData.get("discount_value") || 0),
    min_order_amount: Number(formData.get("min_order_amount") || 0),
    usage_limit: formData.get("usage_limit") ? Number(formData.get("usage_limit")) : null,
    starts_at: formData.get("starts_at") ? new Date(String(formData.get("starts_at"))).toISOString() : null,
    ends_at: formData.get("ends_at") ? new Date(String(formData.get("ends_at"))).toISOString() : null,
    applies_to: formData.get("applies_to"),
    product_ids: String(formData.get("product_ids") || "").split(",").map((value) => value.trim()).filter(Boolean),
    show_in_checkout: formData.get("show_in_checkout") === "on",
    checkout_description: String(formData.get("checkout_description") || "").trim().slice(0, 140) || null,
    active: formData.get("active") === "on",
    updated_at: new Date().toISOString()
  };
  if (payload.discount_type === "percent" && (payload.discount_value <= 0 || payload.discount_value > 100)) {
    $("#promoFormMessage").textContent = "Відсоток має бути від 1 до 100.";
    return;
  }
  const query = activePromo
    ? sb.from("promo_codes").update(payload).eq("id", activePromo.id).select().single()
    : sb.from("promo_codes").insert(payload).select().single();
  const { data, error } = await query;
  if (error) {
    $("#promoFormMessage").textContent = "Помилка: " + error.message;
    return;
  }
  if (activePromo) Object.assign(activePromo, data);
  else promos.unshift(data);
  $("#promoDialog").close();
  renderPromos();
  toast("Промокод збережено");
}
async function deletePromo(){if(!activePromo||!(await premiumConfirm({title:"Видалити промокод?",text:`${String(activePromo.code||"").toUpperCase()} буде видалено без можливості відновлення.`,confirmLabel:"Видалити",tone:"danger"})))return;const {error}=await sb.from("promo_codes").delete().eq("id",activePromo.id);if(error)return toast("Помилка: "+error.message);promos=promos.filter(p=>p.id!==activePromo.id);$("#promoDialog").close();renderPromos();renderAdmin2();toast("Промокод видалено");}

function releaseStatus(row){const now=Date.now(),preview=new Date(row.preview_starts_at).getTime(),publicAt=new Date(row.public_starts_at).getTime();if(!row.active)return{key:"inactive",label:"Вимкнений"};if(now<preview)return{key:"scheduled",label:"Запланований"};if(now<publicAt)return{key:"private",label:"Private Preview"};return{key:"public",label:"Публічний старт настав"};}
function renderReleases(){const host=$("#releasesList"),empty=$("#releasesEmpty");if(!host||!empty)return;$("#releasesBadge").textContent=releases.filter(r=>releaseStatus(r).key==="private").length||"";empty.hidden=!!releases.length;host.innerHTML=releases.map(row=>{const st=releaseStatus(row);return `<article class="admin-card admin-release-card" data-release="${esc(row.id)}"><div><div class="admin-card__title">${esc(row.title)}</div><div class="admin-card__meta">${esc(row.eyebrow||"PRIVATE RELEASE")} · ${esc(row.slug)}</div></div><div><strong>${date(row.public_starts_at)}</strong><div class="admin-card__meta">Preview: ${date(row.preview_starts_at)}</div></div><span class="status-pill status-${st.key==="private"?"paid":st.key==="scheduled"?"awaiting_payment":"cancelled"}">${esc(st.label)}</span></article>`}).join("");host.querySelectorAll("[data-release]").forEach(el=>el.addEventListener("click",()=>openRelease(el.dataset.release)));}
function releaseSlug(value){return String(value||"").trim().toLowerCase().normalize("NFKD").replace(/[’']/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);}
function syncRelease48(){const f=$("#releaseForm");if(!f||!$("#releaseAuto48").checked||!f.elements.public_starts_at.value)return;const publicAt=new Date(f.elements.public_starts_at.value);if(Number.isNaN(publicAt.getTime()))return;f.elements.preview_starts_at.value=isoLocal(new Date(publicAt.getTime()-48*60*60*1000));}
function fillReleaseProducts(selected=""){const select=$("#releaseProductSelect");if(!select)return;select.innerHTML='<option value="">Без товарної картки</option>'+((window.PRODUCTS||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(""));select.value=selected||"";}
function openRelease(id=""){activeRelease=releases.find(r=>String(r.id)===String(id))||null;const f=$("#releaseForm");f.reset();delete f.elements.slug.dataset.edited;f.elements.eyebrow.value="PRIVATE RELEASE · NOIR";f.elements.active.checked=true;$("#releaseAuto48").checked=true;$("#releaseDialogTitle").textContent=activeRelease?"Редагувати приватний реліз":"Новий приватний реліз";$("#deleteReleaseBtn").hidden=!activeRelease;$("#releaseFormMessage").textContent="";fillReleaseProducts(activeRelease?.product_id||"");if(activeRelease){f.elements.slug.dataset.edited="1";for(const key of ["id","title","slug","eyebrow","description","image_url"]){if(f.elements[key])f.elements[key].value=activeRelease[key]??"";}f.elements.product_id.value=activeRelease.product_id||"";f.elements.preview_starts_at.value=isoLocal(activeRelease.preview_starts_at);f.elements.public_starts_at.value=isoLocal(activeRelease.public_starts_at);f.elements.active.checked=!!activeRelease.active;const diff=new Date(activeRelease.public_starts_at)-new Date(activeRelease.preview_starts_at);$("#releaseAuto48").checked=Math.abs(diff-48*60*60*1000)<60000;}else{const publicAt=new Date(Date.now()+7*24*60*60*1000);publicAt.setMinutes(0,0,0);f.elements.public_starts_at.value=isoLocal(publicAt);syncRelease48();}$("#releaseDialog").showModal();setTimeout(()=>f.elements.title.focus(),80);}
async function saveRelease(event){event.preventDefault();const f=event.currentTarget,fd=new FormData(f),publicAt=new Date(String(fd.get("public_starts_at")||"")),previewAt=new Date(String(fd.get("preview_starts_at")||""));const title=String(fd.get("title")||"").trim(),slug=releaseSlug(fd.get("slug")||title);if(!title||!slug||Number.isNaN(publicAt.getTime())||Number.isNaN(previewAt.getTime())||previewAt>=publicAt){$("#releaseFormMessage").textContent="Перевірте назву, slug і часовий інтервал релізу.";return;}const payload={title,slug,eyebrow:String(fd.get("eyebrow")||"PRIVATE RELEASE").trim(),description:String(fd.get("description")||"").trim(),product_id:String(fd.get("product_id")||"").trim()||null,image_url:String(fd.get("image_url")||"").trim()||null,preview_starts_at:previewAt.toISOString(),public_starts_at:publicAt.toISOString(),active:fd.get("active")==="on",updated_at:new Date().toISOString()};const query=activeRelease?sb.from("private_releases").update(payload).eq("id",activeRelease.id).select().single():sb.from("private_releases").insert(payload).select().single();const {data,error}=await query;if(error){$("#releaseFormMessage").textContent="Помилка: "+error.message;return;}if(activeRelease)Object.assign(activeRelease,data);else releases.unshift(data);$("#releaseDialog").close();renderReleases();renderAdmin2();toast("Private release збережено");}
async function deleteRelease(){if(!activeRelease||!(await premiumConfirm({title:"Видалити приватний реліз?",text:`${activeRelease.title} буде видалено без можливості відновлення.`,confirmLabel:"Видалити",tone:"danger"})))return;const {error}=await sb.from("private_releases").delete().eq("id",activeRelease.id);if(error)return toast("Помилка: "+error.message);releases=releases.filter(r=>r.id!==activeRelease.id);$("#releaseDialog").close();renderReleases();renderAdmin2();toast("Реліз видалено");}


const admin2Views=["overview","orders","attention","customers","catalog","reviews","promos","marketing","payments","finance","analytics","settings"];
const admin2PrimaryMobileViews=new Set(["overview","orders","attention"]);
let activeAdmin2View="overview",manualItems=[];
function admin2MobileActiveTarget(view=activeAdmin2View,moreOpen=false){return moreOpen||!admin2PrimaryMobileViews.has(view)?"more":view;}
function syncAdmin2MobileNav({moreOpen=!$("#adminMoreMenu")?.hidden}={}){
  const target=admin2MobileActiveTarget(activeAdmin2View,moreOpen);
  document.querySelectorAll(".admin2-mobile-nav [data-admin-view]").forEach(button=>button.classList.toggle("is-active",button.dataset.adminView===target));
  const moreButton=$("#adminMoreBtn");
  if(moreButton){moreButton.classList.toggle("is-active",target==="more");moreButton.setAttribute("aria-expanded",String(Boolean(moreOpen)));}
}
function closeAdmin2MoreMenu(){const menu=$("#adminMoreMenu");if(menu)menu.hidden=true;syncAdmin2MobileNav({moreOpen:false});}
function collectionInfo(product){const list=typeof COLLECTIONS!=="undefined"?COLLECTIONS:[];return list.find(row=>row.id===product?.collection)||null;}
function productPrice(product){return Number(collectionInfo(product)?.price||0);}
function fullSizeProducts(){return (window.PRODUCTS||[]).filter(product=>product&&product.id&&!String(product.id).startsWith("discovery-")&&!String(product.id).startsWith("reeds-"));}
function completedOrders(){return orders.filter(order=>effectiveOrderStatus(order)==="completed");}
function cashReceivedOrders(){return orders.filter(order=>effectiveOrderStatus(order)!=="cancelled"&&String(order.payment_status)==="paid");}
function paidRevenueOrders(){return cashReceivedOrders();}
function activeValueOrders(){return orders.filter(order=>effectiveOrderStatus(order)!=="cancelled"&&effectiveOrderStatus(order)!=="completed");}
function awaitingMoneyOrders(){return orders.filter(order=>effectiveOrderStatus(order)!=="cancelled"&&String(order.payment_status)!=="paid"&&order.payment_method!=="cash_on_delivery");}
function sumAmount(rows){return rows.reduce((sum,row)=>sum+Number(row.total_amount||0),0);}
function sameDay(value,base=new Date()){const d=new Date(value);return d.getFullYear()===base.getFullYear()&&d.getMonth()===base.getMonth()&&d.getDate()===base.getDate();}
function daysAgo(days){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-days);return d;}
function customerKey(order){const email=String(order.customer_email||"").trim().toLowerCase();const phone=normalizePhone(order.customer_phone);return email||phone||String(order.customer_name||"").trim().toLowerCase();}
function paidOrderDate(order){return new Date(order.paid_at||order.payment_modified_at||order.updated_at||order.created_at);}
function orderHasDiscovery(order){return (Array.isArray(order.items)?order.items:[]).some(item=>String(item.id||"").startsWith("discovery-"));}
function orderHasFullSize(order){return (Array.isArray(order.items)?order.items:[]).some(item=>{const id=String(item.id||"");return Boolean(id&&!id.startsWith("discovery-")&&!id.startsWith("reeds-"));});}
function customerRows(){
  const map=new Map();
  orders.filter(order=>effectiveOrderStatus(order)!=="cancelled").forEach(order=>{
    const key=customerKey(order);
    if(!key)return;
    let row=map.get(key);
    if(!row){
      row={key,name:order.customer_name||"Клієнт",phone:order.customer_phone||"",email:order.customer_email||"",orders:[],paidOrders:[],completed:0,spent:0,lastAt:order.created_at,lastPaidAt:null,products:new Map(),discovery:false};
      map.set(key,row);
    }
    row.orders.push(order);
    if(new Date(order.created_at)>new Date(row.lastAt))row.lastAt=order.created_at;
    if(String(order.payment_status)==="paid"){
      row.completed++;
      row.spent+=Number(order.total_amount||0);
      row.paidOrders.push(order);
      const pd=paidOrderDate(order);
      if(!row.lastPaidAt||pd>new Date(row.lastPaidAt))row.lastPaidAt=pd.toISOString();
    }
    for(const item of Array.isArray(order.items)?order.items:[]){
      const id=String(item.id||"");
      if(id.startsWith("discovery-"))row.discovery=true;
      if(!id||id.startsWith("reeds-"))continue;
      row.products.set(id,(row.products.get(id)||0)+Number(item.quantity||1));
    }
  });
  return [...map.values()].map(row=>{
    row.paidOrders.sort((a,b)=>paidOrderDate(a)-paidOrderDate(b));
    row.orders.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const fav=[...row.products.entries()].filter(([id])=>!id.startsWith("discovery-")).sort((a,b)=>b[1]-a[1])[0]?.[0]||"";
    row.favorite=productById(fav)?.name||fav||"—";
    row.aov=row.completed?row.spent/row.completed:0;
    row.firstPaidAt=row.paidOrders[0]?paidOrderDate(row.paidOrders[0]).toISOString():null;
    return row;
  }).sort((a,b)=>new Date(b.lastAt)-new Date(a.lastAt));
}
function repeatRate(){const rows=customerRows().filter(row=>row.completed>0);if(!rows.length)return 0;return rows.filter(row=>row.completed>1).length/rows.length*100;}
function productSales(){const map=new Map(fullSizeProducts().map(p=>[p.id,{product:p,qty:0,revenue:0,orders:0}]));orders.filter(order=>effectiveOrderStatus(order)!=="cancelled").forEach(order=>{for(const item of Array.isArray(order.items)?order.items:[]){const row=map.get(String(item.id||""));if(!row)continue;const q=Number(item.quantity||1);row.qty+=q;row.orders++;row.revenue+=Number(item.line_total||item.unit_price*q||productPrice(row.product)*q);}});return [...map.values()].sort((a,b)=>b.qty-a.qty||b.revenue-a.revenue);}
function renderAdmin2(){renderOverview();renderAttention();renderCustomers();renderCatalogAdmin();renderMarketing();renderPayments();renderFinance();renderAnalytics2();renderSettings();syncAdmin2Badges();}
function syncAdmin2Badges(){const count=buildAttentionItems().length;const a=$("#attentionBadge"),m=$("#mobileAttentionBadge");if(a)a.textContent=count||"";if(m)m.textContent=count||"";}
function clearAdminSearchState(){
  const ids=["adminGlobalSearch","orderSearch","customerSearch","catalogSearch","reviewSearch","promoSearch"];
  let changed=false;
  ids.forEach(id=>{const input=$(`#${id}`);if(input&&input.value){input.value="";changed=true;}});
  const results=$("#adminSearchResults");if(results){results.hidden=true;results.innerHTML="";}
  adminSearchActiveIndex=-1;
  if(changed){renderOrders();renderCustomers();renderCatalogAdmin();renderReviews();renderPromos();}
}
function activateAdmin2View(name,{updateHash=true}={}){const view=admin2Views.includes(name)?name:"overview";setAdminMobileSearch(false,{clear:true});clearAdminSearchState();activeAdmin2View=view;document.querySelectorAll(".admin2-view").forEach(panel=>panel.hidden=panel.id!==`${view}Tab`);if(view==="marketing"){const releasesPanel=$("#releasesTab");if(releasesPanel)releasesPanel.hidden=false;}document.querySelectorAll("[data-admin-view]").forEach(button=>button.classList.toggle("is-active",button.dataset.adminView===view));const main=$("#admin2Main");if(main){main.scrollTop=0;main.scrollLeft=0;requestAnimationFrame(()=>{main.scrollTop=0;main.scrollLeft=0;});}if(updateHash&&location.hash!==`#${view}`)history.replaceState(null,"",`#${view}`);closeAdmin2MoreMenu();}
function renderOverview(){const host=$("#overviewKpis");if(!host)return;const now=new Date(),todayPaid=cashReceivedOrders().filter(order=>sameDay(order.paid_at||order.updated_at||order.created_at,now));const last30=cashReceivedOrders().filter(order=>new Date(order.paid_at||order.updated_at||order.created_at)>=daysAgo(29));const paid=cashReceivedOrders(),aov=paid.length?sumAmount(paid)/paid.length:0;const customers=customerRows(),active=activeValueOrders(),waiting=awaitingMoneyOrders();host.innerHTML=[
  ["Отримано сьогодні",money(sumAmount(todayPaid)),`${todayPaid.length} фактичних оплат`],
  ["Отримано 30 днів",money(sumAmount(last30)),`${last30.length} оплачених замовлень`],
  ["Активні замовлення",money(sumAmount(active)),`${active.length} у роботі`],
  ["Очікуємо оплат",money(sumAmount(waiting)),`${waiting.length} без підтвердження`],
  ["Середній чек",money(aov),"фактично оплачені"],
  ["Repeat-rate",`${Math.round(repeatRate())}%`,`${customers.filter(c=>c.completed>1).length} повторних клієнтів`]
].map(([l,v,s])=>`<article class="admin2-kpi"><span>${esc(l)}</span><strong>${esc(v)}</strong><small>${esc(s)}</small></article>`).join("");const od=$("#overviewDate");if(od)od.textContent=new Intl.DateTimeFormat("uk-UA",{weekday:"long",day:"numeric",month:"long"}).format(now);renderOverviewAttention();renderOverviewOrders();renderOverviewProducts();renderOverviewPaymentMix();}
function renderOverviewAttention(){const host=$("#overviewAttention");if(!host)return;const items=buildAttentionItems().slice(0,5);host.innerHTML=items.length?items.map(item=>`<div class="admin2-mini-row" data-attention-kind="${esc(item.kind)}" data-attention-id="${esc(item.id||"")}"><div><strong>${esc(item.title)}</strong><span>${esc(item.detail)}</span></div><em>${esc(item.action||"Відкрити")}</em></div>`).join(""):'<div class="admin2-search-empty">Усе спокійно — термінових дій немає.</div>';bindAttentionClicks(host);}
function renderOverviewOrders(){const host=$("#overviewOrders");if(!host)return;host.innerHTML=orders.slice(0,5).map(order=>`<div class="admin2-mini-row" data-order-open="${esc(order.id)}"><div><strong>${esc(order.client_order_id)} · ${esc(order.customer_name)}</strong><span>${esc(orderItemSummary(order))} · ${shortDate(order.created_at)}</span></div><em>${money(order.total_amount)}</em></div>`).join("")||'<div class="admin2-search-empty">Замовлень ще немає.</div>';host.querySelectorAll("[data-order-open]").forEach(el=>el.onclick=()=>openOrder(el.dataset.orderOpen));}
function renderOverviewProducts(){const host=$("#overviewTopProducts");if(!host)return;const rows=productSales().slice(0,5),max=Math.max(1,...rows.map(r=>r.qty));host.innerHTML=rows.map(row=>`<div class="admin2-product-bar"><header><strong>${esc(row.product.name)}</strong><span>${row.qty} шт · ${money(row.revenue)}</span></header><i style="--value:${Math.round(row.qty/max*100)}%"></i></div>`).join("")||'<div class="admin2-search-empty">Дані з’являться після продажів.</div>';}
function renderOverviewPaymentMix(){const host=$("#overviewPayments");if(!host)return;const valid=orders.filter(o=>effectiveOrderStatus(o)!=="cancelled"),counts={card_online:0,bank_transfer:0,cash_on_delivery:0};valid.forEach(o=>{if(o.payment_method in counts)counts[o.payment_method]++;});const labels={card_online:"Карткою онлайн",bank_transfer:"На рахунок",cash_on_delivery:"При отриманні"};host.innerHTML=`<div class="admin2-payment-mix">${Object.entries(counts).map(([key,n])=>`<div class="admin2-payment-mix-row"><span>${labels[key]}</span><strong>${n} · ${valid.length?Math.round(n/valid.length*100):0}%</strong></div>`).join("")}</div>`;}
function buildAttentionItems(){const out=[];orders.filter(needsAttention).forEach(order=>{const guidance=orderGuidance(order),score=orderPriority(order);out.push({kind:"order",id:order.id,title:`${order.client_order_id} · ${guidance.title}`,detail:`${order.customer_name} · ${orderItemSummary(order)} · ${money(order.total_amount)}`,action:"Відкрити",tone:guidance.tone,at:order.created_at,priority:score>=95?"critical":"high",score});});repeatCampaigns.filter(r=>r.status==="failed").forEach(r=>out.push({kind:"marketing",id:r.id,title:"Не відправилась repeat-кампанія",detail:r.customer_email||"Перевірте журнал кампанії",action:"Маркетинг",tone:"danger",at:r.updated_at||r.created_at,priority:"high",score:66}));reviews.filter(r=>r.status==="pending").forEach(r=>out.push({kind:"review",id:r.id,title:`Новий відгук · ${r.product_slug}`,detail:`${r.customer_name} · ${Number(r.rating||0)}/5`,action:"Модерувати",tone:"warning",at:r.created_at,priority:"normal",score:40}));return out.sort((a,b)=>(b.score||0)-(a.score||0)||new Date(a.at)-new Date(b.at));}
function bindAttentionClicks(host=document){host.querySelectorAll("[data-attention-kind]").forEach(el=>el.onclick=()=>{const kind=el.dataset.attentionKind,id=el.dataset.attentionId;if(kind==="order")openOrder(id);else if(kind==="review")activateAdmin2View("reviews");else if(kind==="marketing")activateAdmin2View("marketing");});}
function renderAttention(){
  const list=buildAttentionItems(),host=$("#attentionList"),empty=$("#attentionEmpty"),summary=$("#attentionSummary");
  if(!host||!summary)return;
  const payment=orders.filter(hasPaymentIssue).length,pendingReviews=reviews.filter(r=>r.status==="pending").length,failedCampaigns=repeatCampaigns.filter(r=>r.status==="failed").length;
  summary.innerHTML=[["Усього",list.length,"конкретних дій"],["Оплати",payment,"проблемних платежів"],["Відгуки",pendingReviews,"на модерації"],["Маркетинг",failedCampaigns,"невдалих кампаній"]].map(([l,v,s])=>`<article class="admin2-kpi"><span>${l}</span><strong>${v}</strong><small>${s}</small></article>`).join("");
  if(empty)empty.hidden=!!list.length;
  host.innerHTML=list.map(item=>`<article class="admin2-attention-card ${item.tone==="danger"?"is-danger":""}" data-priority="${esc(item.priority||"normal")}" data-attention-kind="${esc(item.kind)}" data-attention-id="${esc(item.id||"")}"><div class="admin2-attention-icon">${item.kind==="order"?"→":item.kind==="review"?"★":"!"}</div><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p><time><span class="admin2-attention-age">${esc(relativeAge(item.at))}</span><span>${shortDate(item.at)}</span></time></div><span class="admin2-attention-action">${esc(item.action)}</span></article>`).join("");
  bindAttentionClicks(host);
}
function renderCustomers(){const host=$("#customerList"),stats=$("#customerStats");
if(!host||!stats)return;
const rows=customerRows(),completed=rows.filter(r=>r.completed>0),repeat=rows.filter(r=>r.completed>1),ltv=completed.length?completed.reduce((s,r)=>s+r.spent,0)/completed.length:0;
stats.innerHTML=[["Унікальні клієнти",rows.length,"за всю історію"],["Повторні",repeat.length,`${Math.round(repeatRate())}% repeat-rate`],["Середній LTV",money(ltv),"на клієнта з покупкою"],["Discovery",rows.filter(r=>r.discovery).length,"знайомились через сет"]].map(([l,v,s])=>`<article class="admin2-kpi"><span>${l}</span><strong>${v}</strong><small>${s}</small></article>`).join("");
const q=$("#customerSearch")?.value.trim().toLowerCase()||"",seg=$("#customerSegmentFilter")?.value||"";
const filtered=rows.filter(r=>(!q||[r.name,r.phone,r.email,r.favorite].join(" ").toLowerCase().includes(q))&&(!seg||(seg==="repeat"&&r.completed>1)||(seg==="discovery"&&r.discovery)||(seg==="vip"&&r.spent>=3000)));
host.innerHTML=filtered.map(r=>`<article class="admin2-customer-card" data-customer-key="${esc(r.key)}"><div class="admin2-customer-main"><strong>${esc(r.name)}</strong><span>${esc(r.phone)}${r.email?` · ${esc(r.email)}`:""}</span>${r.completed>1?'<span class="admin2-segment">Повторний клієнт</span>':""}</div><div class="admin2-customer-metric"><span>Замовлень</span><strong>${r.orders.length}</strong></div><div class="admin2-customer-metric"><span>LTV</span><strong>${money(r.spent)}</strong></div><div class="admin2-customer-metric"><span>Середній чек</span><strong>${money(r.aov)}</strong></div><div class="admin2-customer-metric"><span>Улюблений</span><strong>${esc(r.favorite)}</strong></div><span class="admin2-attention-action">Історія →</span></article>`).join("")||'<div class="admin2-search-empty">Клієнтів не знайдено.</div>';
host.querySelectorAll("[data-customer-key]").forEach(el=>el.onclick=()=>openCustomer360(el.dataset.customerKey));
}
function customerMarketingState(row){const email=String(row?.email||"").trim().toLowerCase();const pref=email?marketingPreferences.find(item=>String(item.email||"").trim().toLowerCase()===email):null;return pref?pref.subscribed===true:row?.orders?.some(order=>order.marketing_consent===true)||false;}
function customerLifecycle(row){const paid=(row?.paidOrders||[]).slice().sort((a,b)=>paidOrderDate(a)-paidOrderDate(b));const discoveryOrders=paid.filter(orderHasDiscovery);const firstDiscovery=discoveryOrders[0]||null;const discoveryAt=firstDiscovery?paidOrderDate(firstDiscovery):null;const laterFull=discoveryAt?paid.find(order=>paidOrderDate(order)>discoveryAt&&orderHasFullSize(order)):null;const email=String(row?.email||"").trim().toLowerCase();const credits=email?discoveryCredits.filter(c=>String(c.customer_email||"").trim().toLowerCase()===email):[];const usedPromos=[...new Set(paid.map(o=>String(o.promo_code||"").trim().toUpperCase()).filter(Boolean))];return{discoveryOrders,firstDiscovery,laterFull,converted:Boolean(laterFull),credits,usedPromos};}
function customerSegmentLabels(row){const labels=[];if(row.completed>1)labels.push("Repeat");if(row.spent>=3000)labels.push("VIP");if(row.discovery)labels.push("Discovery");if(customerMarketingState(row))labels.push("Marketing ✓");return labels.length?labels:["Новий клієнт"];}
function customerDaysSinceLast(row){if(!row.lastPaidAt)return null;return Math.max(0,Math.floor((Date.now()-new Date(row.lastPaidAt).getTime())/86400000));}
function captureCustomer360ReturnState(){const main=$("#admin2Main");return{view:activeAdmin2View,scrollTop:main?.scrollTop||0,customerSearch:$("#customerSearch")?.value||"",customerSegment:$("#customerSegmentFilter")?.value||""};}
function restoreCustomer360ReturnState(){const state=customer360ReturnState;customer360ReturnState=null;if(!state)return;const search=$("#customerSearch"),segment=$("#customerSegmentFilter");if(search)search.value=state.customerSearch||"";if(segment)segment.value=state.customerSegment||"";if(activeAdmin2View==="customers")renderCustomers();const main=$("#admin2Main");if(main)requestAnimationFrame(()=>{main.scrollTop=Number(state.scrollTop||0);main.scrollLeft=0;});}
function closeCustomer360({viaHistory=true,restore=true}={}){const dialog=$("#customer360Dialog");if(viaHistory&&customer360HistoryActive&&history.state?.adminDetail==="customer"){history.back();return;}customer360SkipRestore=!restore;if(dialog?.open)dialog.close();else if(restore)restoreCustomer360ReturnState();}
function openCustomerOrders(row){const dialog=$("#customer360Dialog");customer360SkipRestore=true;customer360HistoryActive=false;customer360ReturnState=null;if(history.state?.adminDetail==="customer")history.replaceState(null,"",`${location.pathname}${location.search}#orders`);if(dialog?.open)dialog.close();activateAdmin2View("orders",{updateHash:false});const input=$("#orderSearch");if(input){input.value=row.email||row.phone||row.name;renderOrders();}}
function openCustomer360(key,{pushHistory=true}={}){
  const row=customerRows().find(item=>item.key===key);
  if(!row)return;
  activeCustomerKey=row.key;
  const life=customerLifecycle(row),days=customerDaysSinceLast(row),dialog=$("#customer360Dialog");
  if(!dialog)return;
  if(!dialog.open)customer360ReturnState=captureCustomer360ReturnState();
  closeAdmin2MoreMenu();
  $("#customer360Title").textContent=row.name;
  $("#customer360Subtitle").textContent=`${row.orders.length} ${row.orders.length===1?"замовлення":"замовлень"} · остання активність ${shortDate(row.lastAt)}`;
  $("#customer360Hero").innerHTML=`
    <div>
      <div class="admin2-customer-tags">${customerSegmentLabels(row).map(label=>`<span>${esc(label)}</span>`).join("")}</div>
      <strong>${esc(row.favorite)}</strong><small>улюблений аромат</small>
    </div>
    <div class="admin2-customer-contact-actions">
      ${row.phone?`<a href="tel:${esc(normalizePhone(row.phone))}">Подзвонити</a>`:""}
      ${row.email?`<a href="mailto:${esc(row.email)}">Email</a>`:""}
    </div>`;
  $("#customer360Kpis").innerHTML=[
    ["LTV",money(row.spent),`${row.completed} оплачених`],
    ["AOV",money(row.aov),"середній оплачений чек"],
    ["Остання покупка",days===null?"—":`${days} дн`,row.lastPaidAt?shortDate(row.lastPaidAt):"покупок ще немає"],
    ["Repeat",row.completed>1?"Так":"Ні",row.completed>1?`${row.completed} покупки`:"1 або 0 покупок"]
  ].map(([l,v,sub])=>`<article class="admin2-kpi"><span>${esc(l)}</span><strong>${esc(v)}</strong><small>${esc(sub)}</small></article>`).join("");
  const consent=customerMarketingState(row);
  $("#customer360Profile").innerHTML=`<div class="admin2-profile-lines">
    <div><span>Телефон</span><strong>${esc(row.phone||"—")}</strong></div>
    <div><span>Email</span><strong>${esc(row.email||"—")}</strong></div>
    <div><span>Маркетинг</span><strong>${consent?"Є згода":"Без згоди"}</strong></div>
    <div><span>Промокоди</span><strong>${life.usedPromos.length?esc(life.usedPromos.join(", ")):"Не використовував"}</strong></div>
  </div>`;
  const creditActive=life.credits.filter(c=>c.status==="active").length;
  $("#customer360Lifecycle").innerHTML=`<div class="admin2-profile-lines">
    <div><span>Discovery</span><strong>${life.discoveryOrders.length?`${life.discoveryOrders.length} ${life.discoveryOrders.length===1?"покупка":"покупки"}`:"Не купував"}</strong></div>
    <div><span>Discovery → full-size</span><strong>${life.converted?"Конвертувався ✓":"Ще ні"}</strong></div>
    <div><span>Discovery Credit</span><strong>${creditActive?`${creditActive} ${creditActive===1?"активний":"активні"}`:life.credits.length?"Використано / завершено":"Не видавався"}</strong></div>
    <div><span>Перша покупка</span><strong>${row.firstPaidAt?shortDate(row.firstPaidAt):"—"}</strong></div>
  </div>`;
  $("#customer360Orders").innerHTML=row.orders.map(order=>`<button class="admin2-customer-order-row" data-customer-order="${esc(order.id)}" type="button">
    <div><strong>${esc(order.client_order_id||`#${order.id}`)} · ${esc(orderItemSummary(order))}</strong><span>${shortDate(order.created_at)} · ${esc(paymentStatusLabels[order.payment_status]||order.payment_status||"—")}</span></div>
    <em>${money(order.total_amount)}</em>
  </button>`).join("")||'<div class="admin2-search-empty">Замовлень немає.</div>';
  $("#customer360Orders").querySelectorAll("[data-customer-order]").forEach(el=>el.onclick=()=>openOrder(el.dataset.customerOrder));
  $("#customer360OrdersBtn").onclick=()=>openCustomerOrders(row);
  const scroller=$("#customer360Dialog .admin2-customer-scroll");
  if(scroller)scroller.scrollTop=0;
  if(!dialog.open)dialog.showModal();
  if(pushHistory&&history.state?.adminDetail!=="customer"){history.pushState({adminDetail:"customer",customerKey:row.key},"",location.href);customer360HistoryActive=true;}else if(history.state?.adminDetail==="customer")customer360HistoryActive=true;
  requestAnimationFrame(()=>{if(scroller)scroller.scrollTop=0;$("#customer360Title")?.focus({preventScroll:true});});
}
function handleAdminPopState(event){
  const state=event.state,customerDialog=$("#customer360Dialog"),orderDialog=$("#orderDialog");
  if(orderDialog?.open&&state?.adminDetail!=="order"){orderDetailHistoryActive=false;orderDetailSkipRestore=false;orderDialog.close();}
  if(state?.adminDetail==="order"&&state.orderId){orderDetailHistoryActive=true;if(!orderDialog?.open||String(activeOrder?.id)!==String(state.orderId))openOrder(state.orderId,{pushHistory:false});return;}
  if(state?.adminDetail==="customer"&&state.customerKey){customer360HistoryActive=true;if(!customerDialog?.open||activeCustomerKey!==state.customerKey)openCustomer360(state.customerKey,{pushHistory:false});return;}
  if(customerDialog?.open){customer360HistoryActive=false;customer360SkipRestore=false;customerDialog.close();return;}
  activateAdmin2View(location.hash.slice(1)||"overview",{updateHash:false});
}

function renderCatalogAdmin(){const host=$("#catalogGrid"),stats=$("#catalogStats");
if(!host||!stats)return;
const products=fullSizeProducts(),sales=productSales(),sold=sales.reduce((s,r)=>s+r.qty,0),revenue=sales.reduce((s,r)=>s+r.revenue,0);
stats.innerHTML=[["Ароматів",products.length,"активний каталог"],["Колекцій",4,"Entry · Signature · Premium · Noir"],["Продано",sold,"повнорозмірних флаконів"],["Виручка товарів",money(revenue),"без Discovery і паличок"]].map(([l,v,s])=>`<article class="admin2-kpi"><span>${l}</span><strong>${v}</strong><small>${s}</small></article>`).join("");
const q=$("#catalogSearch")?.value.trim().toLowerCase()||"",collection=$("#catalogCollectionFilter")?.value||"";
const rows=products.filter(p=>(!collection||p.collection===collection)&&(!q||[p.name,p.shortDescription,...(p.notes?.top||[]),...(p.notes?.heart||[]),...(p.notes?.base||[])].join(" ").toLowerCase().includes(q)));
host.innerHTML=rows.map(p=>{const sale=sales.find(s=>s.product.id===p.id)||{qty:0,revenue:0};const image=itemImage({id:p.id});const reeds=p.diffusion?.primary?.label||`${p.package?.reedCount||"—"} палички`;const care=p.reedCare?.publicText||"Персональне налаштування";return `<article class="admin2-catalog-card"><img src="${esc(image||'/images/collections/'+p.collection+'.webp')}" alt="${esc(p.name)}" loading="lazy"><div><span class="collection">${esc(collectionInfo(p)?.name||p.collection)}</span><h3>${esc(p.name)}</h3><div class="admin2-catalog-meta"><span>${money(productPrice(p))}</span><span>${esc(reeds)}</span><span>${sale.qty} продано</span></div><p class="admin-card__meta">${esc(care)}</p><div class="admin2-catalog-foot"><strong>${money(sale.revenue)}</strong><a href="../products/${encodeURIComponent(p.id)}.html" target="_blank" rel="noopener">Відкрити товар ↗</a></div></div></article>`}).join("")||'<div class="admin2-search-empty">Нічого не знайдено.</div>';
}
function renderMarketing(){const stats=$("#marketingStats");
if(!stats)return;
const subs=marketingPreferences.filter(r=>r.subscribed===true).length,activeCredits=discoveryCredits.filter(r=>r.status==="active").length,usedCredits=discoveryCredits.filter(r=>r.status==="used").length,pending=repeatCampaigns.filter(r=>["pending","sending"].includes(r.status)).length,sent=repeatCampaigns.filter(r=>r.status==="sent").length;
stats.innerHTML=[["Підписані",subs,"email-згода"],["Discovery Credit",activeCredits,`${usedCredits} використано`],["Повторні · черга",pending,"очікують відправки"],["Повторні · надіслано",sent,"успішні кампанії"]].map(([l,v,s])=>`<article class="admin2-kpi"><span>${l}</span><strong>${v}</strong><small>${s}</small></article>`).join("");
const repeatHost=$("#repeatCampaignList");
if(repeatHost)repeatHost.innerHTML=repeatCampaigns.slice(0,8).map(r=>`<div class="admin2-campaign-row"><header><strong>${esc(r.customer_email||"Клієнт")}</strong><span class="admin2-state ${r.status==="failed"?"failed":r.status==="sent"?"paid":"pending"}">${esc(repeatStatusLabels[r.status]||r.status||"Очікує")}</span></header><p>${r.scheduled_for?`Заплановано ${shortDate(r.scheduled_for)}`:""}${r.sent_at?` · Надіслано ${shortDate(r.sent_at)}`:""}</p></div>`).join("")||'<div class="admin2-search-empty">Repeat-кампаній ще немає.</div>';
const creditHost=$("#discoveryCreditList");
if(creditHost)creditHost.innerHTML=discoveryCredits.slice(0,8).map(r=>`<div class="admin2-credit-row"><header><strong>${esc(r.customer_email||"Клієнт")}</strong><span class="admin2-state ${r.status==="used"?"paid":r.status==="active"?"pending":"failed"}">${esc(creditStatusLabels[r.status]||r.status||"—")}</span></header><p>${money(r.amount)} · до ${r.expires_at?shortDate(r.expires_at):"—"}</p></div>`).join("")||'<div class="admin2-search-empty">Discovery Credit ще не видавались.</div>';
const releasesPanel=$("#releasesTab");
if(releasesPanel)releasesPanel.hidden=activeAdmin2View!=="marketing";
}
function paymentTone(status){status=String(status||"").toLowerCase();if(status==="paid")return"paid";if(["failed","expired","refunded"].includes(status))return"failed";return status==="unpaid"?"unpaid":"pending";}
function renderPayments(){const stats=$("#paymentStats"),host=$("#paymentsList");
if(!stats||!host)return;
const card=orders.filter(o=>o.payment_method==="card_online"),paid=orders.filter(o=>String(o.payment_status)==="paid"),issues=orders.filter(hasPaymentIssue),bank=orders.filter(o=>o.payment_method==="bank_transfer"),cod=orders.filter(o=>o.payment_method==="cash_on_delivery");
stats.innerHTML=[["Карткою",card.length,`${card.filter(o=>o.payment_status==="paid").length} успішних`],["На рахунок",bank.length,"ручне підтвердження"],["Післяплата",cod.length,"оплата при отриманні"],["Проблемні",issues.length,"помилка / прострочено"]].map(([l,v,s])=>`<article class="admin2-kpi"><span>${l}</span><strong>${v}</strong><small class="${l==="Проблемні"&&v?"bad":""}">${s}</small></article>`).join("");
const method=$("#paymentMethodFilter")?.value||"",state=$("#paymentStateFilter")?.value||"";
const list=orders.filter(o=>(!method||o.payment_method===method)&&(!state||(state==="failed"?["failed","expired"].includes(String(o.payment_status)):String(o.payment_status||"unpaid")===state))).slice(0,120);
host.innerHTML=list.map(o=>`<article class="admin2-payment-card" data-payment-order="${esc(o.id)}"><div><strong>${esc(o.client_order_id)} · ${esc(o.customer_name)}</strong><span>${esc(paymentMethodLabels[o.payment_method]||o.payment_method)} · ${shortDate(o.created_at)}</span></div><div><strong>${esc(orderItemSummary(o))}</strong><span>${esc(o.customer_phone||"")}</span></div><div><span class="admin2-state ${paymentTone(o.payment_status)}">${esc(paymentStatusLabels[o.payment_status]||o.payment_status||"Не оплачено")}</span></div><em>${money(o.total_amount)}</em></article>`).join("")||'<div class="admin2-search-empty">Платежів не знайдено.</div>';
host.querySelectorAll("[data-payment-order]").forEach(el=>el.onclick=()=>openOrder(el.dataset.paymentOrder));
}
const expenseCategoryLabels={cogs:"Собівартість",packaging:"Пакування",delivery:"Доставка",ads:"Реклама",fees:"Комісії",services:"Сервіси",other:"Інше"};
function financePeriodBounds(){const value=$("#financePeriod")?.value||"30",end=new Date();end.setHours(23,59,59,999);let start=null,label="За весь час";if(value==="30"){start=daysAgo(29);label="Останні 30 днів";}else if(value==="90"){start=daysAgo(89);label="Останні 90 днів";}else if(value==="month"){start=new Date(end.getFullYear(),end.getMonth(),1);label=new Intl.DateTimeFormat("uk-UA",{month:"long",year:"numeric"}).format(end);}return{start,end,label};}
function withinPeriod(value,bounds){const d=new Date(value);return Number.isFinite(d.getTime())&&(!bounds.start||d>=bounds.start)&&d<=bounds.end;}
function financeRows(){const bounds=financePeriodBounds();const revenue=cashReceivedOrders().filter(order=>withinPeriod(order.paid_at||order.payment_modified_at||order.updated_at||order.created_at,bounds));const expenses=vahomeExpenses.filter(row=>withinPeriod(`${row.expense_date}T12:00:00`,bounds));return{bounds,revenue,expenses};}
function expenseTotal(rows,categories=[]){return rows.filter(row=>!categories.length||categories.includes(row.category)).reduce((sum,row)=>sum+Number(row.amount||0),0);}
function renderFinance(){
  const kpis=$("#financeKpis"),pnl=$("#financePnl"),breakdown=$("#financeBreakdown"),list=$("#expenseList");
  if(!kpis||!pnl||!breakdown||!list)return;
  const {bounds,revenue,expenses}=financeRows();
  const received=sumAmount(revenue);
  const direct=expenseTotal(expenses,["cogs","packaging"]);
  const operating=expenseTotal(expenses,["delivery","ads","fees","services","other"]);
  const total=direct+operating,result=received-total,hasDirectCosts=direct>0,margin=received&&hasDirectCosts?result/received*100:null,ads=expenseTotal(expenses,["ads"]);
  kpis.innerHTML=[
    ["Отримано",money(received),`${revenue.length} фактичних оплат`],
    ["Собівартість",money(direct),hasDirectCosts?"з пакуванням · внесено":"з пакуванням · не внесена"],
    ["Операційні витрати",money(operating),"без собівартості"],
    ["Операційний результат",money(result),hasDirectCosts?(result>=0?"після внесених витрат":"витрати вищі за отримання"):"без урахування собівартості"],
    ["Маржа",margin===null?"—":`${margin.toFixed(1)}%`,margin===null?"внесіть собівартість":"управлінська"],
    ["Реклама",money(ads),received?`${(ads/received*100).toFixed(1)}% від отримань`:"за період"]
  ].map(([l,v,sub])=>`<article class="admin2-kpi"><span>${esc(l)}</span><strong class="${l==="Операційний результат"&&result<0?"bad":""}">${esc(v)}</strong><small class="${l==="Маржа"&&margin===null?"warn":""}">${esc(sub)}</small></article>`).join("");
  const periodLabel=$("#financePeriodLabel");
  if(periodLabel)periodLabel.textContent=bounds.label;
  const gross=received-direct;
  pnl.innerHTML=`<div class="admin2-pnl">
    <div><span>Отримані оплати</span><strong>${money(received)}</strong></div>
    <div><span>− Собівартість і пакування</span><strong>${money(direct)}</strong></div>
    <div class="is-subtotal"><span>Валовий результат</span><strong>${money(gross)}</strong></div>
    <div><span>− Інші операційні витрати</span><strong>${money(operating)}</strong></div>
    <div class="is-result ${result<0?"is-negative":""}"><span>Операційний результат</span><strong>${money(result)}</strong></div>
  </div>`;
  const categories=Object.keys(expenseCategoryLabels)
    .map(key=>({key,label:expenseCategoryLabels[key],value:expenseTotal(expenses,[key])}))
    .filter(row=>row.value>0).sort((a,b)=>b.value-a.value);
  const max=Math.max(1,...categories.map(row=>row.value));
  breakdown.innerHTML=categories.length?categories.map(row=>`<div class="admin2-product-bar">
    <header><strong>${esc(row.label)}</strong><span>${money(row.value)}</span></header><i style="--value:${Math.round(row.value/max*100)}%"></i>
  </div>`).join(""):'<div class="admin2-search-empty">Додайте витрати — структура з’явиться тут.</div>';
  const category=$("#expenseCategoryFilter")?.value||"";
  const filtered=expenses.filter(row=>!category||row.category===category)
    .sort((a,b)=>String(b.expense_date).localeCompare(String(a.expense_date))||new Date(b.created_at)-new Date(a.created_at));
  list.innerHTML=filtered.map(row=>`<button class="admin2-expense-row" data-expense-id="${esc(row.id)}" type="button">
    <div><strong>${esc(expenseCategoryLabels[row.category]||row.category)}</strong><span>${esc(row.vendor||row.note||"Без уточнення")} · ${new Intl.DateTimeFormat("uk-UA").format(new Date(`${row.expense_date}T12:00:00`))}</span></div>
    <em>${money(row.amount)}</em>
  </button>`).join("")||'<div class="admin2-search-empty">Витрат за цей період немає.</div>';
  list.querySelectorAll("[data-expense-id]").forEach(el=>el.onclick=()=>openExpense(el.dataset.expenseId));
}
function openExpense(id=""){activeExpense=vahomeExpenses.find(row=>String(row.id)===String(id))||null;const form=$("#expenseForm"),dialog=$("#expenseDialog");if(!form||!dialog)return;form.reset();$("#expenseFormMessage").textContent="";$("#expenseDialogTitle").textContent=activeExpense?"Редагувати витрату":"Нова витрата";$("#expenseDelete").hidden=!activeExpense;if(activeExpense){form.elements.id.value=activeExpense.id;form.elements.expense_date.value=activeExpense.expense_date;form.elements.category.value=activeExpense.category;form.elements.amount.value=activeExpense.amount;form.elements.vendor.value=activeExpense.vendor||"";form.elements.note.value=activeExpense.note||"";}else{form.elements.expense_date.value=new Date().toISOString().slice(0,10);form.elements.category.value="cogs";}if(!dialog.open)dialog.showModal();requestAnimationFrame(()=>$("#expenseDialogTitle")?.focus({preventScroll:true}));}
async function saveExpense(event){event.preventDefault();const form=event.currentTarget,fd=new FormData(form),payload={expense_date:String(fd.get("expense_date")||""),category:String(fd.get("category")||""),amount:Number(fd.get("amount")||0),vendor:String(fd.get("vendor")||"").trim()||null,note:String(fd.get("note")||"").trim()||null,updated_at:new Date().toISOString()};const message=$("#expenseFormMessage");if(!payload.expense_date||!expenseCategoryLabels[payload.category]||!Number.isFinite(payload.amount)||payload.amount<=0){message.textContent="Перевірте дату, категорію та суму.";return;}const query=activeExpense?sb.from("vahome_expenses").update(payload).eq("id",activeExpense.id).select().single():sb.from("vahome_expenses").insert(payload).select().single();const {data,error}=await query;if(error){message.textContent=`Помилка: ${error.message}`;return;}if(activeExpense){const index=vahomeExpenses.findIndex(row=>row.id===activeExpense.id);if(index>=0)vahomeExpenses[index]=data;}else vahomeExpenses.unshift(data);$("#expenseDialog").close();activeExpense=null;renderFinance();toast("Витрату збережено","success");}
async function deleteExpense(){if(!activeExpense||!(await premiumConfirm({title:"Видалити витрату?",text:`${expenseCategoryLabels[activeExpense.category]||"Витрата"} · ${money(activeExpense.amount)} буде видалена з управлінського обліку.`,confirmLabel:"Видалити",tone:"danger"})))return;const id=activeExpense.id,{error}=await sb.from("vahome_expenses").delete().eq("id",id);if(error)return toast("Не вдалося видалити витрату: "+error.message,"danger");vahomeExpenses=vahomeExpenses.filter(row=>row.id!==id);activeExpense=null;$("#expenseDialog").close();renderFinance();toast("Витрату видалено","success");}
function paidCustomerCohort(){return customerRows().map(row=>({...row,paidOrders:(row.paidOrders||[]).slice().sort((a,b)=>paidOrderDate(a)-paidOrderDate(b))})).filter(row=>row.paidOrders.length);}
function retentionAt(days){const now=Date.now(),windowMs=days*86400000,cohort=paidCustomerCohort().filter(row=>now-paidOrderDate(row.paidOrders[0]).getTime()>=windowMs);if(!cohort.length)return{rate:0,returned:0,total:0};const returned=cohort.filter(row=>{const first=paidOrderDate(row.paidOrders[0]).getTime();return row.paidOrders.slice(1).some(order=>{const t=paidOrderDate(order).getTime();return t>first&&t<=first+windowMs;});}).length;return{rate:returned/cohort.length*100,returned,total:cohort.length};}
function discoveryConversionStats(){const rows=paidCustomerCohort().filter(row=>row.paidOrders.some(orderHasDiscovery));let converted=0;for(const row of rows){const first=row.paidOrders.find(orderHasDiscovery);const firstAt=paidOrderDate(first);if(row.paidOrders.some(order=>paidOrderDate(order)>firstAt&&orderHasFullSize(order)))converted++;}return{customers:rows.length,converted,rate:rows.length?converted/rows.length*100:0};}
function firstPaidOrderIds(){const ids=new Set();for(const row of paidCustomerCohort()){if(row.paidOrders[0])ids.add(String(row.paidOrders[0].id));}return ids;}
function dimensionRows(rows,getKey,labels={}){const map=new Map();rows.forEach(order=>{const key=String(getKey(order)||"unknown");const row=map.get(key)||{key,label:labels[key]||key||"Не вказано",count:0,revenue:0};row.count++;row.revenue+=Number(order.total_amount||0);map.set(key,row);});return[...map.values()].sort((a,b)=>b.revenue-a.revenue||b.count-a.count);}
function renderDimension(host,rows,empty="Даних ще немає."){if(!host)return;if(!rows.length){host.innerHTML=`<div class="admin2-search-empty">${esc(empty)}</div>`;return;}const total=rows.reduce((sum,row)=>sum+row.count,0),max=Math.max(1,...rows.map(row=>row.count));host.innerHTML=rows.map(row=>`<div class="admin2-product-bar"><header><strong>${esc(row.label)}</strong><span>${row.count} · ${total?Math.round(row.count/total*100):0}%${row.revenue?` · ${money(row.revenue)}`:""}</span></header><i style="--value:${Math.round(row.count/max*100)}%"></i></div>`).join("");}
function renderAnalytics2(){
  const kpis=$("#analyticsKpis");
  if(!kpis)return;
  const customers=customerRows();
  const last30=cashReceivedOrders().filter(o=>new Date(o.paid_at||o.updated_at||o.created_at)>=daysAgo(29));
  const aov=last30.length?sumAmount(last30)/last30.length:0;
  const firstIds=firstPaidOrderIds();
  const newRevenue=sumAmount(last30.filter(order=>firstIds.has(String(order.id))));
  const repeatRevenue=sumAmount(last30.filter(order=>!firstIds.has(String(order.id))));
  const discovery=discoveryConversionStats();
  kpis.innerHTML=[
    ["Отримано 30 днів",money(sumAmount(last30)),`${last30.length} фактичних оплат`],
    ["Нові клієнти",money(newRevenue),"виручка з першої покупки"],
    ["Repeat виручка",money(repeatRevenue),"повторні покупки"],
    ["AOV оплачений",money(aov),"за останні 30 днів"],
    ["Repeat-rate",`${Math.round(repeatRate())}%`,`${customers.filter(c=>c.completed>1).length} клієнтів`],
    ["Discovery → full-size",`${Math.round(discovery.rate)}%`,`${discovery.converted} із ${discovery.customers}`]
  ].map(([l,v,sub])=>`<article class="admin2-kpi"><span>${esc(l)}</span><strong>${esc(v)}</strong><small>${esc(sub)}</small></article>`).join("");
  const products=$("#analyticsTopProducts"),rows=productSales().slice(0,8),max=Math.max(1,...rows.map(r=>r.qty));
  if(products)products.innerHTML=rows.map(row=>`<div class="admin2-product-bar"><header><strong>${esc(row.product.name)}</strong><span>${row.qty} шт · ${money(row.revenue)}</span></header><i style="--value:${Math.round(row.qty/max*100)}%"></i></div>`).join("");
  const retention=$("#analyticsRetention");
  if(retention){
    const points=[30,60,90].map(days=>({days,...retentionAt(days)}));
    retention.innerHTML=`<div class="admin2-retention-grid">${points.map(row=>`<div><span>${row.days} днів</span><strong>${Math.round(row.rate)}%</strong><small>${row.returned} із ${row.total||0} повернулися</small></div>`).join("")}</div>
      <p class="admin2-panel-note">Когорта: клієнти, у яких уже минуло відповідно 30/60/90 днів від першої оплаченої покупки.</p>`;
  }
  const discoveryHost=$("#analyticsDiscovery");
  if(discoveryHost)discoveryHost.innerHTML=`<div class="admin2-discovery-conversion"><strong>${Math.round(discovery.rate)}%</strong><span>${discovery.converted} із ${discovery.customers} клієнтів після оплаченого Discovery зробили пізнішу full-size покупку.</span></div>`;
  const sourceLabels={website:"Сайт",instagram:"Instagram",phone:"Телефон",offline:"Офлайн",admin:"Адмінка",unknown:"Не вказано"};
  const deliveryLabels={nova_poshta_branch:"НП · відділення",nova_poshta_locker:"НП · поштомат",nova_poshta_courier:"НП · кур’єр",pickup:"Самовивіз",unknown:"Не вказано"};
  const paid=cashReceivedOrders();
  renderDimension($("#analyticsSources"),dimensionRows(paid,o=>o.source||"unknown",sourceLabels));
  renderDimension($("#analyticsDelivery"),dimensionRows(paid,o=>o.delivery_method||"unknown",deliveryLabels));
  const promoMap=new Map();
  paid.filter(o=>o.promo_code).forEach(o=>{
    const code=String(o.promo_code||"").toUpperCase();
    const row=promoMap.get(code)||{code,count:0,revenue:0,discount:0};
    row.count++;row.revenue+=Number(o.total_amount||0);row.discount+=Number(o.discount_amount||0);promoMap.set(code,row);
  });
  const promoHost=$("#analyticsPromos"),promoRows=[...promoMap.values()].sort((a,b)=>b.revenue-a.revenue).slice(0,8);
  if(promoHost)promoHost.innerHTML=promoRows.length?promoRows.map(row=>`<div class="admin2-promo-performance">
    <div><strong>${esc(row.code)}</strong><span>${row.count} зам. · знижка ${money(row.discount)}</span></div><em>${money(row.revenue)}</em>
  </div>`).join(""):'<div class="admin2-search-empty">Оплачених замовлень із промокодами ще немає.</div>';
  renderOverviewPaymentMixInto($("#analyticsPayments"));
}
function renderOverviewPaymentMixInto(host){if(!host)return;const valid=orders.filter(o=>effectiveOrderStatus(o)!=="cancelled"),labels={card_online:"Карткою онлайн",bank_transfer:"На рахунок",cash_on_delivery:"При отриманні"};host.innerHTML=`<div class="admin2-payment-mix">${Object.keys(labels).map(key=>{const n=valid.filter(o=>o.payment_method===key).length;return `<div class="admin2-payment-mix-row"><span>${labels[key]}</span><strong>${n} · ${valid.length?Math.round(n/valid.length*100):0}%</strong></div>`}).join("")}</div>`;}
let vahomePushBusy=false;
function pushFunctionUrl(){return `${cfg.url}/functions/v1/vahome-push`;}
async function pushRequest(action,body={}){const token=await getAdminAccessToken(),response=await fetch(pushFunctionUrl(),{method:"POST",headers:{Authorization:`Bearer ${token}`,apikey:cfg.publishableKey,"Content-Type":"application/json"},body:JSON.stringify({action,...body})});const payload=await response.json().catch(()=>({}));if(response.status===401||response.status===403){if(response.status===401)showLogin("Адмінська сесія завершилася. Увійдіть повторно.");throw new Error(payload.error||"FORBIDDEN");}if(!response.ok)throw new Error(payload.error||`HTTP_${response.status}`);return payload;}
function pushDeviceId(){const key="vahome-admin-device-id";let id=localStorage.getItem(key);if(!id){id=crypto.randomUUID?.()||`device-${Date.now()}-${Math.random().toString(16).slice(2)}`;localStorage.setItem(key,id);}return id;}
function urlBase64ToUint8Array(base64String){const padding="=".repeat((4-base64String.length%4)%4),base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/"),raw=atob(base64);return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));}
function isIosDevice(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);}
function isStandalonePwa(){return window.matchMedia?.("(display-mode: standalone)").matches||window.navigator.standalone===true;}
async function currentPushSubscription(){if(!("serviceWorker" in navigator))return null;const registration=await navigator.serviceWorker.ready;return registration.pushManager.getSubscription();}
function renderPushCardState({supported=true,permission=Notification?.permission||"default",subscription=null,devices=[],error=""}={}){
  const host=$("#pushSettingsCard");
  if(!host)return;
  const current=devices.find(device=>device.current),enabled=Boolean(subscription);
  const status=!supported?"Не підтримується":enabled?"Увімкнено":permission==="denied"?"Заблоковано":"Вимкнено";
  host.innerHTML=`<span>Push / PWA</span><h3>Сповіщення адміністратора</h3>
    <div class="admin2-setting-line"><span>Цей пристрій</span><strong>${esc(status)}</strong></div>
    <div class="admin2-setting-line"><span>Підключено</span><strong>${devices.length} / 3</strong></div>
    ${current?`<div class="admin2-setting-line"><span>Остання доставка</span><strong>${current.lastSuccessAt?shortDate(current.lastSuccessAt):"Ще не було"}</strong></div>`:""}
    ${error?`<p class="admin2-push-message is-error">${esc(error)}</p>`:""}
    <div class="admin2-push-actions">${enabled?'<button class="btn btn-secondary btn-small" data-push-action="test" type="button">Тест</button><button class="btn btn-secondary btn-small" data-push-action="disable" type="button">Вимкнути</button>':'<button class="btn btn-primary btn-small" data-push-action="enable" type="button">Увімкнути push</button>'}</div>
    ${devices.length?`<div class="admin2-push-devices">${devices.map(device=>`<div><span>${esc(device.label||device.platform||"Пристрій")}${device.current?" · цей":""}</span><small>${device.lastFailureAt&&!device.lastSuccessAt?"Потрібна перевірка":device.updatedAt?`активний ${relativeAge(device.updatedAt)}`:"активний"}</small></div>`).join("")}</div>`:""}`;
}
async function refreshPushSettings(){const host=$("#pushSettingsCard");if(!host)return;if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){renderPushCardState({supported:false,permission:"denied",devices:[]});return;}try{const subscription=await currentPushSubscription(),payload=await pushRequest("config",{endpoint:subscription?.endpoint||""});renderPushCardState({supported:true,permission:Notification.permission,subscription,devices:payload.devices||[]});}catch(error){renderPushCardState({supported:true,permission:Notification.permission,subscription:await currentPushSubscription().catch(()=>null),devices:[],error:"Не вдалося отримати стан push."});}}
async function handlePushAction(action){
  if(vahomePushBusy)return;
  vahomePushBusy=true;
  try{
    if(action==="enable"){
      if(isIosDevice()&&!isStandalonePwa()){
        toast("На iPhone спочатку додайте VA HOME Admin на Головний екран, відкрийте PWA і повторіть.","danger");
        return;
      }
      const permission=await Notification.requestPermission();
      if(permission!=="granted"){
        toast("Дозвіл на сповіщення не надано.","danger");
        return;
      }
      const config=await pushRequest("config"),registration=await navigator.serviceWorker.ready;
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription){
        subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(config.publicKey)});
      }
      await pushRequest("subscribe",{
        subscription:subscription.toJSON(),deviceId:pushDeviceId(),
        deviceLabel:isIosDevice()?"iPhone · VA HOME":"VA HOME Admin",userAgent:navigator.userAgent
      });
      toast("Push-сповіщення увімкнено","success");
    }else if(action==="disable"){
      const subscription=await currentPushSubscription();
      if(subscription){
        await pushRequest("unsubscribe",{endpoint:subscription.endpoint});
        await subscription.unsubscribe();
      }
      toast("Push на цьому пристрої вимкнено","success");
    }else if(action==="test"){
      const subscription=await currentPushSubscription();
      if(!subscription)throw new Error("subscription_not_found");
      const result=await pushRequest("test",{endpoint:subscription.endpoint});
      toast(result.delivered?"Тестове сповіщення надіслано":"Push не доставлено",result.delivered?"success":"danger");
    }
  }catch(error){
    console.error("vahome push",error);
    toast("Не вдалося виконати дію push. Спробуйте ще раз.","danger");
  }finally{
    vahomePushBusy=false;
    await refreshPushSettings().catch(()=>{});
  }
}

function renderSettings(){
const host=$("#settingsGrid");
if(!host)return;
const card=paymentSettings.find(r=>String(r.id)==="card_online")||{};
const latest=orders[0];
const lastPaid=orders.find(o=>o.payment_status==="paid");
const cards=[
  `<article class="admin2-setting-card"><span>Оплати</span><h3>plata by mono</h3><div class="admin2-setting-line"><span>Карткова оплата</span><strong>${card.enabled===false?"Вимкнена":"Активна"}</strong></div><div class="admin2-setting-line"><span>Провайдер</span><strong>${esc(card.provider||"monobank")}</strong></div><div class="admin2-setting-line"><span>Останній paid</span><strong>${shortDate(lastPaid?.paid_at)}</strong></div></article>`,
  `<article class="admin2-setting-card"><span>Доставка</span><h3>Нова пошта</h3><div class="admin2-setting-line"><span>Стандартна відправка</span><strong>1–2 робочі дні</strong></div><div class="admin2-setting-line"><span>Безкоштовна доставка</span><strong>від 1500 грн</strong></div><div class="admin2-setting-line"><span>Останнє замовлення</span><strong>${latest?shortDate(latest.created_at):"—"}</strong></div></article>`,
  `<article class="admin2-setting-card"><span>Комунікація</span><h3>VA HOME</h3><div class="admin2-setting-line"><span>Менеджер</span><strong>09:00–19:00</strong></div><div class="admin2-setting-line"><span>Email</span><strong>vahome.aroma@gmail.com</strong></div><div class="admin2-setting-line"><span>Автоматизація повторних</span><strong>${repeatCampaigns.length?"Працює":"Очікує даних"}</strong></div></article>`,
  `<article class="admin2-setting-card" id="pushSettingsCard"><span>Push / PWA</span><h3>Сповіщення адміністратора</h3><div class="admin2-setting-line"><span>Стан</span><strong>Перевіряємо…</strong></div></article>`,
  `<article class="admin2-setting-card"><span>Безпека</span><h3>Адмін-доступ</h3><div class="admin2-setting-line"><span>Allowlist</span><strong>Supabase RLS</strong></div><div class="admin2-setting-line"><span>Сесія</span><strong>Авторизована</strong></div><div class="admin2-setting-line"><span>Реліз</span><strong>v16.4.15 · Operations</strong></div></article>`
];
host.innerHTML=cards.join("");
renderAdminAudit();
refreshPushSettings().catch(()=>{});
}
function auditEntityLabel(row){const map={order:"Замовлення",review:"Відгук",promo:"Промокод",release:"Реліз"};return map[row.entity_type]||row.entity_type||"Дія";}
function auditActionLabel(row){const map={update:"оновлено",moderate:"модеровано",delete:"видалено",insert:"створено",source_update:"оновлено джерело",system_update:"системне оновлення",system_insert:"створено системою",system_delete:"видалено системою"};return map[row.action]||row.action||"змінено";}
function renderAdminAudit(){const host=$("#adminAuditList"),state=$("#adminAuditState");if(!host)return;if(!adminAudit.length){host.innerHTML='<div class="admin2-audit-empty">Журнал почне заповнюватися після адміністративних змін.</div>';if(state)state.textContent="Без записів";return;}if(state)state.textContent=`${adminAudit.length} останніх записів`;host.innerHTML=adminAudit.slice(0,20).map(row=>`<div class="admin2-audit-row"><div><strong>${esc(auditEntityLabel(row))} · ${esc(auditActionLabel(row))}</strong><span>${esc(row.actor_email||"Системна дія")}${row.entity_id?` · ${esc(row.entity_id)}`:""}${Array.isArray(row.changed_fields)&&row.changed_fields.length?` · ${esc(row.changed_fields.join(", "))}`:""}</span></div><time>${shortDate(row.created_at)}</time></div>`).join("");}
function globalSearchEntries(query){const q=String(query||"").trim().toLowerCase();
if(q.length<2)return[];
const result=[];
orders.forEach(o=>{const hay=[o.client_order_id,o.customer_name,o.customer_phone,o.customer_email,orderItemSummary(o)].join(" ").toLowerCase();if(hay.includes(q))result.push({type:"Замовлення",title:`${o.client_order_id} · ${o.customer_name}`,sub:`${orderItemSummary(o)} · ${money(o.total_amount)}`,action:()=>openOrder(o.id)});});
customerRows().forEach(c=>{const hay=[c.name,c.phone,c.email,c.favorite].join(" ").toLowerCase();if(hay.includes(q))result.push({type:"Клієнт",title:c.name,sub:`${c.phone}${c.email?` · ${c.email}`:""}`,action:()=>{activateAdmin2View("customers");openCustomer360(c.key);}});});
fullSizeProducts().forEach(p=>{const hay=[p.name,p.shortDescription,...(p.notes?.top||[]),...(p.notes?.heart||[]),...(p.notes?.base||[])].join(" ").toLowerCase();if(hay.includes(q))result.push({type:"Аромат",title:p.name,sub:`${collectionInfo(p)?.name||p.collection} · ${money(productPrice(p))}`,action:()=>{activateAdmin2View("catalog");$("#catalogSearch").value=p.name;renderCatalogAdmin();}});});
promos.forEach(p=>{if([p.code,p.name].join(" ").toLowerCase().includes(q))result.push({type:"Промокод",title:String(p.code||"").toUpperCase(),sub:p.name||"Промокод",action:()=>{activateAdmin2View("promos");openPromo(p.id);}});});
reviews.forEach(r=>{if([r.customer_name,r.product_slug,r.review_text].join(" ").toLowerCase().includes(q))result.push({type:"Відгук",title:`${r.product_slug} · ${r.customer_name}`,sub:(r.review_text||"").slice(0,90),action:()=>{activateAdmin2View("reviews");$("#reviewSearch").value=r.customer_name||r.product_slug;renderReviews();}});});
return result.slice(0,12);
}
function renderGlobalSearch(){const input=$("#adminGlobalSearch"),host=$("#adminSearchResults");if(!input||!host)return;const rows=globalSearchEntries(input.value),q=input.value.trim();if(q.length<2){host.hidden=true;host.innerHTML="";adminSearchActiveIndex=-1;return;}adminSearchActiveIndex=Math.min(Math.max(adminSearchActiveIndex,0),Math.max(0,rows.length-1));host.hidden=false;host.innerHTML=rows.map((r,i)=>`<button type="button" class="admin2-search-result ${i===adminSearchActiveIndex?"is-active":""}" data-global-index="${i}"><small>${esc(r.type)}</small><div><strong>${highlightMatch(r.title,q)}</strong><span>${highlightMatch(r.sub,q)}</span></div><span>→</span></button>`).join("")||'<div class="admin2-search-empty">Нічого не знайдено.</div>';host.querySelectorAll("[data-global-index]").forEach(btn=>{btn.onmouseenter=()=>{adminSearchActiveIndex=Number(btn.dataset.globalIndex);host.querySelectorAll("[data-global-index]").forEach((el,i)=>el.classList.toggle("is-active",i===adminSearchActiveIndex));};btn.onclick=()=>runGlobalSearchResult(rows,Number(btn.dataset.globalIndex));});}
function runGlobalSearchResult(rows,index=adminSearchActiveIndex){const input=$("#adminGlobalSearch"),host=$("#adminSearchResults"),row=rows[index];if(!row)return;if(host)host.hidden=true;if(input)input.value="";adminSearchActiveIndex=-1;setAdminMobileSearch(false,{clear:true});row.action();}
const MANUAL_PRODUCTS=[
  {id:"discovery-6",name:"Discovery Set — 6 ароматів",price:150,type:"discovery6"},
  {id:"discovery-18",name:"Discovery Set — 18 ароматів",price:450,type:"discovery18"},
  {id:"reeds-4mm",name:"Запасні палички 4 мм — 4 шт",price:50,type:"reeds",diameter:4},
  {id:"reeds-5mm",name:"Запасні палички 5 мм — 5 шт",price:50,type:"reeds",diameter:5}
];
function manualCatalog(){return [...fullSizeProducts().map(p=>({id:p.id,name:p.name,price:productPrice(p),type:"fragrance",product:p})),...MANUAL_PRODUCTS];}
function manualEntry(id){return manualCatalog().find(row=>row.id===id)||null;}
function manualProductOptions(){return manualCatalog().map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${money(p.price)}</option>`).join("");}
function manualProductPrice(id){return Number(manualEntry(id)?.price||0);}
function reedCompatible(id){const entry=manualEntry(id);if(entry?.type!=="reeds")return true;return manualItems.some(row=>{const p=productById(row.id);return p&&p.collection!=="noir"&&Number(p.package?.reedDiameterMm||0)===Number(entry.diameter);});}
function renderDiscoveryPicker(row,index){
  if(row.id!=="discovery-6")return"";
  const selected=new Set(Array.isArray(row.selections)?row.selections:[]),products=fullSizeProducts();
  if(row.discoveryConfirmed===true&&selected.size===6){
    const names=[...selected].map(id=>productById(id)?.name||id);
    return `<div class="admin2-manual-discovery admin2-manual-discovery--confirmed"><div class="admin2-manual-discovery-head"><span>Discovery Set готовий</span><strong>6/6 ✓</strong></div><p class="admin2-manual-discovery-summary">${names.map(name=>`<span>${esc(name)}</span>`).join("")}</p><button class="admin2-manual-discovery-edit" type="button" data-manual-discovery-edit>Змінити вибір</button></div>`;
  }
  return `<div class="admin2-manual-discovery"><div class="admin2-manual-discovery-head"><span>Оберіть рівно 6 ароматів</span><strong>${selected.size}/6</strong></div><p class="admin2-manual-discovery-help">Після 6-го вибору набір підтвердиться автоматично.</p>${products.map(p=>`<button type="button" data-manual-scent="${esc(p.id)}" class="${selected.has(p.id)?"is-selected":""}">${esc(p.name)}</button>`).join("")}</div>`;
}
function manualCustomerMatches(query){const q=String(query||"").trim().toLowerCase();if(q.length<2)return[];return customerRows().filter(c=>[c.name,c.phone,c.email].join(" ").toLowerCase().includes(q)).slice(0,6);}
function renderManualCustomerMatches(){const input=$("#manualCustomerLookup"),host=$("#manualCustomerMatches");if(!input||!host)return;const rows=manualCustomerMatches(input.value);if(!rows.length){host.hidden=true;host.innerHTML="";return;}host.hidden=false;host.innerHTML=rows.map((c,i)=>`<button type="button" class="admin2-manual-customer-result" data-manual-customer="${i}"><strong>${esc(c.name)}</strong><span>${esc(c.phone)}${c.email?` · ${esc(c.email)}`:""} · ${c.orders.length} зам.</span></button>`).join("");host.querySelectorAll("[data-manual-customer]").forEach(btn=>btn.onclick=()=>applyManualCustomer(rows[Number(btn.dataset.manualCustomer)]));}
function applyManualCustomer(row){if(!row)return;const form=$("#manualOrderForm"),last=[...row.orders].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];form.elements.customer_name.value=row.name||"";form.elements.customer_phone.value=row.phone||"";form.elements.customer_email.value=row.email||"";if(last?.customer_city){form.elements.customer_city.value=last.customer_city;resolveManualNpCity(last.customer_city);}$("#manualCustomerLookup").value=`${row.name} · ${row.phone}`;$("#manualCustomerMatches").hidden=true;toast("Дані клієнта підставлено","success");}
function normalizeManualPhone(value){const digits=String(value||"").replace(/\D/g,"");if(/^380\d{9}$/.test(digits))return `+${digits}`;if(/^0\d{9}$/.test(digits))return `+38${digits}`;return String(value||"").trim();}
const MANUAL_NP_CITY_CACHE_KEY="vahome_np_city_cache_v3",MANUAL_NP_WAREHOUSE_CACHE_KEY="vahome_np_warehouse_cache_v3",MANUAL_NP_CITY_TTL=86400000,MANUAL_NP_WAREHOUSE_TTL=21600000;
let manualNpCityTimer=0,manualNpWarehouseTimer=0,manualNpCityController=null,manualNpWarehouseController=null,manualNpWarehouseItems=[],manualNpSerial=0;
const manualNpNormalize=value=>String(value||"").toLocaleLowerCase("uk-UA").replace(/[’']/g,"'").replace(/\s+/g," ").trim();
function manualNpReadCache(key){try{return JSON.parse(localStorage.getItem(key)||"{}");}catch(_){return{};}}
function manualNpGetCached(key,id,ttl){const entry=manualNpReadCache(key)[id];return entry&&Date.now()-Number(entry.savedAt||0)<ttl&&Array.isArray(entry.items)?entry.items:null;}
function manualNpPutCached(key,id,items,maxEntries=20){try{const cache=manualNpReadCache(key);cache[id]={savedAt:Date.now(),items};Object.keys(cache).sort((a,b)=>Number(cache[b]?.savedAt||0)-Number(cache[a]?.savedAt||0)).slice(maxEntries).forEach(oldKey=>delete cache[oldKey]);localStorage.setItem(key,JSON.stringify(cache));}catch(_){}}
async function manualNovaPoshtaLookup(payload,{signal}={}){const controller=new AbortController(),abort=()=>controller.abort();if(signal){if(signal.aborted)controller.abort();else signal.addEventListener("abort",abort,{once:true});}const timeout=setTimeout(()=>controller.abort(),7000);try{const response=await fetch(`${cfg.url}/functions/v1/nova-poshta-locations`,{method:"POST",headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,"Content-Type":"application/json"},body:JSON.stringify(payload),signal:controller.signal});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Nova Poshta lookup failed (${response.status})`);return Array.isArray(data.items)?data.items:[];}finally{clearTimeout(timeout);if(signal)signal.removeEventListener("abort",abort);}}
function manualNpParts(){const form=$("#manualOrderForm");return{form,city:form?.elements.customer_city,cityRef:form?.elements.nova_poshta_city_ref,settlementRef:form?.elements.nova_poshta_settlement_ref,warehouse:form?.elements.delivery_details,warehouseRef:form?.elements.nova_poshta_warehouse_ref,cityList:$("#manualNpCitySuggestions"),warehouseList:$("#manualNpWarehouseSuggestions"),cityHint:$("#manualNpCityHint"),warehouseHint:$("#manualNpWarehouseHint")};}
function manualNpClose(input,list){if(list)list.hidden=true;if(input)input.setAttribute("aria-expanded","false");}
function manualNpCloseAll(){const p=manualNpParts();manualNpClose(p.city,p.cityList);manualNpClose(p.warehouse,p.warehouseList);}
function manualNpRenderState(input,list,text,action){if(!list)return;list.innerHTML=`<div class="admin2-np-state"><p>${esc(text)}</p>${action?`<button type="button" data-manual-np-action>${esc(action.label)}</button>`:""}</div>`;list.hidden=false;input?.setAttribute("aria-expanded","true");if(action)list.querySelector("[data-manual-np-action]")?.addEventListener("click",action.run);}
function manualNpRenderItems(input,list,items,title,onSelect){if(!list)return;list.innerHTML=`<div class="admin2-np-head"><strong>${esc(title)}</strong><button type="button" aria-label="Закрити" data-manual-np-close>×</button></div><div class="admin2-np-body">${items.map((item,index)=>`<button type="button" class="admin2-np-result" data-manual-np-index="${index}"><span>${esc(item.label||"")}</span>${item.shortAddress||item.area?`<small>${esc(item.shortAddress||item.area||"")}</small>`:""}</button>`).join("")}</div>`;list.hidden=false;input?.setAttribute("aria-expanded","true");list.querySelector("[data-manual-np-close]")?.addEventListener("click",()=>manualNpClose(input,list));list.querySelectorAll("[data-manual-np-index]").forEach(btn=>btn.addEventListener("click",()=>onSelect(items[Number(btn.dataset.manualNpIndex)])));}
function useManualNpCity(){const p=manualNpParts(),value=String(p.city?.value||"").trim();if(value.length<2)return;p.cityRef.value="";p.settlementRef.value="";p.form.dataset.manualNpCityManual="true";p.warehouse.value="";p.warehouseRef.value="";p.form.dataset.manualNpWarehouseManual="true";p.warehouse.disabled=false;p.warehouse.placeholder="Введіть відділення або поштомат вручну";if(p.cityHint)p.cityHint.textContent="Місто введено вручну.";if(p.warehouseHint)p.warehouseHint.textContent="Відділення можна ввести вручну.";manualNpClose(p.city,p.cityList);}
function useManualNpWarehouse(){const p=manualNpParts(),value=String(p.warehouse?.value||"").trim();if(value.length<2)return;p.warehouseRef.value="";p.form.dataset.manualNpWarehouseManual="true";if(p.warehouseHint)p.warehouseHint.textContent="Відділення введено вручну.";manualNpClose(p.warehouse,p.warehouseList);}
function selectManualNpCity(item,{quiet=false}={}){if(!item)return;const p=manualNpParts();p.city.value=item.label||item.city||"";p.cityRef.value=item.ref||"";p.settlementRef.value=item.settlementRef||"";p.form.dataset.manualNpCityManual="false";p.warehouse.value="";p.warehouseRef.value="";p.form.dataset.manualNpWarehouseManual="false";manualNpWarehouseItems=[];p.warehouse.disabled=false;p.warehouse.placeholder="Номер або частина адреси";if(p.cityHint)p.cityHint.textContent="Місто обрано з бази Нової пошти.";if(p.warehouseHint)p.warehouseHint.textContent="Завантажуємо актуальні відділення…";manualNpClose(p.city,p.cityList);if(!quiet)toast("Місто обрано","success");loadManualNpWarehouses("");}
function selectManualNpWarehouse(item){if(!item)return;const p=manualNpParts();p.warehouse.value=item.label||item.shortAddress||"";p.warehouseRef.value=item.ref||"";p.form.dataset.manualNpWarehouseManual="false";if(p.warehouseHint)p.warehouseHint.textContent=manualNpNormalize(item.label).includes("поштомат")?"Поштомат обрано з бази Нової пошти.":"Відділення обрано з бази Нової пошти.";manualNpClose(p.warehouse,p.warehouseList);}
function manualNpCityExact(items,value){const needle=manualNpNormalize(value).replace(/^м\.?\s*/,"");return items.find(item=>manualNpNormalize(item.city||"")===needle)||items.find(item=>manualNpNormalize(item.label||"").includes(`м. ${needle}`))||null;}
async function searchManualNpCities(query,{autoExact=false,quiet=false}={}){
  const p=manualNpParts();
  const value=String(query||"").trim();
  if(value.length<3){
    manualNpClose(p.city,p.cityList);
    if(p.cityHint)p.cityHint.textContent=`Введіть ще ${Math.max(0,3-value.length)} симв. для пошуку.`;
    return null;
  }
  const cacheId=manualNpNormalize(value);
  const cached=manualNpGetCached(MANUAL_NP_CITY_CACHE_KEY,cacheId,MANUAL_NP_CITY_TTL);
  if(cached){
    const exact=autoExact?manualNpCityExact(cached,value):null;
    if(exact){selectManualNpCity(exact,{quiet:true});return exact;}
    if(!quiet)manualNpRenderItems(p.city,p.cityList,cached,"Знайдені населені пункти",selectManualNpCity);
    return null;
  }
  manualNpCityController?.abort();
  manualNpCityController=new AbortController();
  const serial=++manualNpSerial;
  if(!quiet)manualNpRenderState(p.city,p.cityList,"Шукаємо населені пункти…");
  try{
    const items=await manualNovaPoshtaLookup({action:"cities",query:value},{signal:manualNpCityController.signal});
    if(serial!==manualNpSerial)return null;
    manualNpPutCached(MANUAL_NP_CITY_CACHE_KEY,cacheId,items,30);
    const exact=autoExact?manualNpCityExact(items,value):null;
    if(exact){selectManualNpCity(exact,{quiet:true});return exact;}
    if(!quiet){
      if(items.length)manualNpRenderItems(p.city,p.cityList,items,"Знайдені населені пункти",selectManualNpCity);
      else manualNpRenderState(p.city,p.cityList,"Населений пункт не знайдено.",{label:"Використати введене вручну",run:useManualNpCity});
    }
    return null;
  }catch(error){
    if(error?.name==="AbortError")return null;
    if(p.cityHint)p.cityHint.textContent="Пошук Нової пошти тимчасово недоступний.";
    if(!quiet)manualNpRenderState(p.city,p.cityList,"Не вдалося завантажити міста.",{label:"Використати введене вручну",run:useManualNpCity});
    return null;
  }
}
function manualNpWarehouseScore(item,query){const needle=manualNpNormalize(query);if(!needle)return 0;const number=manualNpNormalize(item.number||"").replace(/^№/,""),label=manualNpNormalize(item.label||""),address=manualNpNormalize(item.shortAddress||"");if(/^\d+$/.test(needle)){if(number===needle)return 0;if(number.startsWith(needle))return 1;if(number.includes(needle))return 2;if(label.includes(needle))return 3;if(address.includes(needle))return 4;return 99;}if(label.startsWith(needle)||address.startsWith(needle))return 0;if(label.includes(needle))return 1;if(address.includes(needle))return 2;return 99;}
function manualNpWarehouseMatches(query){return manualNpWarehouseItems.map((item,index)=>({item,index,score:manualNpWarehouseScore(item,query)})).filter(row=>!query||row.score<99).sort((a,b)=>a.score-b.score||a.index-b.index).slice(0,60).map(row=>row.item);}
function showManualNpWarehouses(query,items){const p=manualNpParts(),matches=query?items.filter(item=>manualNpWarehouseScore(item,query)<99).sort((a,b)=>manualNpWarehouseScore(a,query)-manualNpWarehouseScore(b,query)).slice(0,60):items.slice(0,60);if(matches.length)manualNpRenderItems(p.warehouse,p.warehouseList,matches,query?"Знайдені відділення":"Оберіть відділення / поштомат",selectManualNpWarehouse);else manualNpRenderState(p.warehouse,p.warehouseList,"Відділень не знайдено.",{label:"Ввести вручну",run:useManualNpWarehouse});}
async function loadManualNpWarehouses(query=""){
  const p=manualNpParts();
  if(p.form?.elements.delivery_method?.value==="nova_poshta_courier")return;
  if(!p.cityRef?.value){
    if(p.form?.dataset.manualNpCityManual==="true"){
      return manualNpRenderState(
        p.warehouse,p.warehouseList,
        "Місто введене вручну — відділення теж можна ввести вручну.",
        {label:"Використати введене",run:useManualNpWarehouse}
      );
    }
    return manualNpRenderState(p.warehouse,p.warehouseList,"Спочатку оберіть місто зі списку Нової пошти.");
  }
  const cacheId=`${p.cityRef.value}:${manualNpNormalize(query)}`;
  const cached=manualNpGetCached(MANUAL_NP_WAREHOUSE_CACHE_KEY,cacheId,MANUAL_NP_WAREHOUSE_TTL);
  if(cached){
    if(!query)manualNpWarehouseItems=cached;
    showManualNpWarehouses(query,cached);
    if(p.warehouseHint)p.warehouseHint.textContent="Оберіть відділення або поштомат зі списку.";
    return;
  }
  manualNpWarehouseController?.abort();
  manualNpWarehouseController=new AbortController();
  manualNpRenderState(p.warehouse,p.warehouseList,"Завантажуємо відділення…");
  try{
    const items=await manualNovaPoshtaLookup(
      {action:"warehouses",city_ref:p.cityRef.value,query},
      {signal:manualNpWarehouseController.signal}
    );
    manualNpPutCached(MANUAL_NP_WAREHOUSE_CACHE_KEY,cacheId,items,20);
    if(!query)manualNpWarehouseItems=items;
    else{
      const merged=new Map(manualNpWarehouseItems.map(item=>[item.ref,item]));
      items.forEach(item=>merged.set(item.ref,item));
      manualNpWarehouseItems=[...merged.values()];
    }
    showManualNpWarehouses(query,query?manualNpWarehouseMatches(query):items);
    if(p.warehouseHint)p.warehouseHint.textContent="Оберіть відділення або поштомат зі списку.";
  }catch(error){
    if(error?.name==="AbortError")return;
    if(p.warehouseHint)p.warehouseHint.textContent="Не вдалося завантажити відділення.";
    manualNpRenderState(
      p.warehouse,p.warehouseList,
      "Нова пошта тимчасово недоступна.",
      {label:"Ввести вручну",run:useManualNpWarehouse}
    );
  }
}
async function resolveManualNpCity(value){const p=manualNpParts(),name=String(value||"").trim();p.cityRef.value="";p.settlementRef.value="";p.form.dataset.manualNpCityManual="false";p.warehouse.value="";p.warehouseRef.value="";manualNpWarehouseItems=[];if(name.length<3)return null;if(p.cityHint)p.cityHint.textContent="Перевіряємо місто через Нову пошту…";const exact=await searchManualNpCities(name,{autoExact:true,quiet:true});if(!exact){p.form.dataset.manualNpCityManual="true";if(p.cityHint)p.cityHint.textContent="Місто не зіставлено автоматично. Натисніть поле й оберіть зі списку.";if(p.warehouseHint)p.warehouseHint.textContent="Оберіть місто зі списку, щоб шукати відділення.";}return exact;}
function resetManualNp(){const p=manualNpParts();manualNpCityController?.abort();manualNpWarehouseController?.abort();clearTimeout(manualNpCityTimer);clearTimeout(manualNpWarehouseTimer);manualNpWarehouseItems=[];if(!p.form)return;p.form.dataset.manualNpCityManual="false";p.form.dataset.manualNpWarehouseManual="false";p.cityRef.value="";p.settlementRef.value="";p.warehouseRef.value="";manualNpCloseAll();if(p.cityHint)p.cityHint.textContent="Перевіряємо місто через Нову пошту…";if(p.warehouseHint)p.warehouseHint.textContent="Після вибору міста завантажимо актуальні відділення.";resolveManualNpCity(p.city.value);}
function bindManualNovaPoshta(){const p=manualNpParts();if(!p.form||!p.city||!p.warehouse)return;p.city.addEventListener("input",()=>{p.cityRef.value="";p.settlementRef.value="";p.form.dataset.manualNpCityManual="false";p.warehouse.value="";p.warehouseRef.value="";manualNpWarehouseItems=[];if(p.warehouseHint)p.warehouseHint.textContent="Спочатку оберіть місто зі списку.";clearTimeout(manualNpCityTimer);manualNpCityTimer=window.setTimeout(()=>searchManualNpCities(p.city.value),240);});p.city.addEventListener("focus",()=>{if(p.city.value.trim().length>=3&&!p.cityRef.value)searchManualNpCities(p.city.value);});p.warehouse.addEventListener("input",()=>{p.warehouseRef.value="";p.form.dataset.manualNpWarehouseManual="false";const q=p.warehouse.value.trim(),local=manualNpWarehouseMatches(q);if(local.length)showManualNpWarehouses(q,local);clearTimeout(manualNpWarehouseTimer);if(q.length>=2&&local.length<4)manualNpWarehouseTimer=window.setTimeout(()=>loadManualNpWarehouses(q),260);});p.warehouse.addEventListener("focus",()=>{if(p.form.elements.delivery_method?.value!=="nova_poshta_courier")loadManualNpWarehouses(p.warehouse.value.trim());});}
function toggleManualDeliveryFields(){const form=$("#manualOrderForm");if(!form)return;const courier=form.elements.delivery_method?.value==="nova_poshta_courier";form.querySelectorAll("[data-manual-branch]").forEach(el=>el.hidden=courier);form.querySelectorAll("[data-manual-courier]").forEach(el=>el.hidden=!courier);if(form.elements.delivery_details)form.elements.delivery_details.required=!courier;if(form.elements.courier_street)form.elements.courier_street.required=courier;if(form.elements.courier_house)form.elements.courier_house.required=courier;const p=manualNpParts();if(courier)manualNpClose(p.warehouse,p.warehouseList);else if(form.elements.nova_poshta_city_ref?.value&&!form.elements.delivery_details?.value)loadManualNpWarehouses("");}
function resetManualOrder(){manualItems=[{id:fullSizeProducts()[0]?.id||"signature-relax",quantity:1,selections:[],discoveryConfirmed:false}];const form=$("#manualOrderForm");if(form){form.reset();form.elements.customer_city.value="Полтава";form.elements.source.value="instagram";toggleManualDeliveryFields();resetManualNp();}const lookup=$("#manualCustomerLookup"),matches=$("#manualCustomerMatches");if(lookup)lookup.value="";if(matches){matches.hidden=true;matches.innerHTML="";}renderManualItems();const msg=$("#manualOrderMessage");if(msg)msg.textContent="";}
function renderManualItems(){
  const host=$("#manualItems");if(!host)return;
  host.innerHTML=manualItems.map((row,i)=>{
    const entry=manualEntry(row.id),reed=entry?.type==="reeds",maxQty=entry?.type==="discovery6"?1:reed?3:10;
    const reedNote=reed&&!reedCompatible(row.id)?'<div class="admin2-manual-reed-note">Додайте до замовлення сумісний дифузор цього діаметра.</div>':"";
    return `<div class="admin2-manual-item" data-manual-row="${i}"><div class="admin2-manual-product-wrap"><select data-manual-product>${manualProductOptions()}</select>${reedNote}${renderDiscoveryPicker(row,i)}</div><input data-manual-qty type="number" min="1" max="${maxQty}" value="${row.quantity}"><button type="button" data-manual-remove aria-label="Видалити">×</button></div>`;
  }).join("");
  host.querySelectorAll("[data-manual-row]").forEach(el=>{
    const i=Number(el.dataset.manualRow),select=el.querySelector("[data-manual-product]"),qty=el.querySelector("[data-manual-qty]");
    select.value=manualItems[i].id;
    select.onchange=()=>{manualItems[i]={id:select.value,quantity:1,selections:[],discoveryConfirmed:false};renderManualItems();};
    qty.oninput=()=>{const type=manualEntry(manualItems[i].id)?.type,max=type==="discovery6"?1:type==="reeds"?3:10;manualItems[i].quantity=Math.max(1,Math.min(max,Number(qty.value||1)));renderManualTotal();};
    el.querySelector("[data-manual-remove]").onclick=()=>{if(manualItems.length<=1)return;manualItems.splice(i,1);renderManualItems();};
    el.querySelectorAll("[data-manual-scent]").forEach(btn=>btn.onclick=()=>{
      const row=manualItems[i],set=new Set(row.selections||[]),id=btn.dataset.manualScent;
      if(set.has(id))set.delete(id);else if(set.size<6)set.add(id);else return toast("Для Discovery Set оберіть рівно 6 ароматів","warning");
      row.selections=[...set];
      row.discoveryConfirmed=set.size===6;
      renderManualItems();
      if(row.discoveryConfirmed){
        toast("Discovery Set: 6 ароматів підтверджено","success");
        requestAnimationFrame(()=>host.querySelector(`[data-manual-row="${i}"]`)?.scrollIntoView({block:"nearest",behavior:"smooth"}));
      }
    });
    el.querySelector("[data-manual-discovery-edit]")?.addEventListener("click",()=>{
      manualItems[i].discoveryConfirmed=false;
      renderManualItems();
      requestAnimationFrame(()=>host.querySelector(`[data-manual-row="${i}"] .admin2-manual-discovery`)?.scrollIntoView({block:"nearest"}));
    });
  });
  renderManualTotal();
}
function renderManualTotal(){const total=manualItems.reduce((s,row)=>s+manualProductPrice(row.id)*Number(row.quantity||1),0);const el=$("#manualOrderTotal");if(el)el.textContent=money(total);}
async function createManualOrder(event){event.preventDefault();
const form=event.currentTarget,msg=$("#manualOrderMessage"),fd=new FormData(form);
msg.textContent="Створюємо замовлення…";
const deliveryMethod=String(fd.get("delivery_method")||"nova_poshta_branch");
const courier=deliveryMethod==="nova_poshta_courier";
const cityRef=String(fd.get("nova_poshta_city_ref")||"").trim();
const warehouseRef=String(fd.get("nova_poshta_warehouse_ref")||"").trim();
if(!cityRef&&form.dataset.manualNpCityManual!=="true"){
  msg.textContent="Оберіть місто зі списку Нової пошти або явно використайте ручний ввід.";
  form.elements.customer_city?.focus();return;
}
if(!courier&&!warehouseRef&&form.dataset.manualNpWarehouseManual!=="true"){
  msg.textContent="Оберіть відділення / поштомат зі списку Нової пошти або явно введіть його вручну.";
  form.elements.delivery_details?.focus();return;
}
const body={
  checkout_request_id:crypto.randomUUID(),
  customer_name:String(fd.get("customer_name")||"").trim(),
  customer_phone:normalizeManualPhone(fd.get("customer_phone")),
  customer_email:String(fd.get("customer_email")||"").trim().toLowerCase(),
  customer_city:String(fd.get("customer_city")||"").trim(),
  nova_poshta_city_ref:cityRef||null,
  nova_poshta_settlement_ref:String(fd.get("nova_poshta_settlement_ref")||"").trim()||null,
  nova_poshta_warehouse_ref:courier?null:warehouseRef||null,
  delivery_method:deliveryMethod,
  delivery_details:courier?null:String(fd.get("delivery_details")||"").trim(),
  courier_street:courier?String(fd.get("courier_street")||"").trim():null,
  courier_house:courier?String(fd.get("courier_house")||"").trim():null,
  courier_apartment:courier?String(fd.get("courier_apartment")||"").trim()||null:null,
  payment_method:String(fd.get("payment_method")||"bank_transfer"),
  marketing_consent:fd.get("marketing_consent")==="on",
  customer_comment:`[${String(fd.get("source")||"admin").toUpperCase()}] ${String(fd.get("customer_comment")||"").trim()}`.trim(),
  promo_code:String(fd.get("promo_code")||"").trim()||null,
  items:manualItems.map(row=>({id:row.id,quantity:Number(row.quantity||1),selections:Array.isArray(row.selections)?row.selections:[]}))
};
const invalidDiscovery=manualItems.find(row=>row.id==="discovery-6"&&((row.selections||[]).length!==6||row.discoveryConfirmed!==true));if(invalidDiscovery){msg.textContent="Для Discovery Set — 6 завершіть вибір шести ароматів.";invalidDiscovery.discoveryConfirmed=false;renderManualItems();return;}const invalidReed=manualItems.find(row=>manualEntry(row.id)?.type==="reeds"&&!reedCompatible(row.id));if(invalidReed){msg.textContent="Запасні палички можна додати лише разом із сумісним дифузором.";return;}
try{const response=await fetch(`${cfg.url}/functions/v1/create-order`,{method:"POST",headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,"Content-Type":"application/json","X-Request-ID":body.checkout_request_id},body:JSON.stringify(body)});
const result=await response.json().catch(()=>({}));
if(!response.ok)throw new Error(result.error||`HTTP_${response.status}`);
if(result.order?.client_order_id){const source=String(fd.get("source")||"admin");await sb.from("orders").update({source}).eq("client_order_id",result.order.client_order_id);}
const discount=Number(result.discount_amount||result.order?.discount_amount||0);msg.textContent=result.payment_url?`Замовлення створено${discount?` · знижка ${money(discount)}`:""}. Платіжне посилання скопійовано.`:`Замовлення створено${discount?` · знижка ${money(discount)}`:""}.`;
if(result.payment_url)copyText(result.payment_url,"Платіжне посилання скопійовано");
toast("Нове замовлення додано","success");
setTimeout(()=>$("#manualOrderDialog").close(),700);
await loadAll();
activateAdmin2View("orders");
}catch(error){msg.textContent=`Помилка: ${error.message}`;
}}


function closeAdmin2Selects(except=null){
  document.querySelectorAll(".admin2-select").forEach(root=>{
    if(root===except)return;
    const trigger=root.querySelector(".admin2-select-trigger"),menu=root.querySelector(".admin2-select-menu");
    if(menu)menu.hidden=true;
    if(trigger)trigger.setAttribute("aria-expanded","false");
    root.classList.remove("is-open");
  });
}
function initAdmin2Selects(){
  document.querySelectorAll(".admin2-select[data-admin-select]").forEach(root=>{
    if(root.dataset.bound==="true")return;
    const input=root.querySelector("input[type=hidden]"),trigger=root.querySelector(".admin2-select-trigger"),label=trigger?.querySelector("span"),menu=root.querySelector(".admin2-select-menu");
    const options=[...(menu?.querySelectorAll("[data-value]")||[])];
    if(!input||!trigger||!label||!menu||!options.length)return;
    const sync=()=>{
      const active=options.find(option=>String(option.dataset.value||"")===String(input.value||""))||options[0];
      label.textContent=active.textContent.trim();
      options.forEach(option=>{const selected=option===active;option.classList.toggle("is-selected",selected);option.setAttribute("aria-selected",selected?"true":"false");});
    };
    const close=()=>{menu.hidden=true;trigger.setAttribute("aria-expanded","false");root.classList.remove("is-open");};
    const open=()=>{closeAdmin2Selects(root);menu.hidden=false;trigger.setAttribute("aria-expanded","true");root.classList.add("is-open");requestAnimationFrame(()=>menu.querySelector(".is-selected")?.focus({preventScroll:true}));};
    trigger.addEventListener("click",event=>{event.stopPropagation();menu.hidden?open():close();});
    trigger.addEventListener("keydown",event=>{if(["ArrowDown","Enter"," "].includes(event.key)){event.preventDefault();open();}else if(event.key==="Escape")close();});
    options.forEach(option=>option.addEventListener("click",event=>{event.stopPropagation();input.value=String(option.dataset.value||"");sync();close();input.dispatchEvent(new Event("input",{bubbles:true}));trigger.focus({preventScroll:true});}));
    menu.addEventListener("keydown",event=>{const current=options.indexOf(document.activeElement),direction=event.key==="ArrowDown"?1:event.key==="ArrowUp"?-1:0;if(direction){event.preventDefault();options[(Math.max(0,current)+direction+options.length)%options.length].focus({preventScroll:true});}else if(event.key==="Escape"){event.preventDefault();close();trigger.focus({preventScroll:true});}});
    sync();root.dataset.bound="true";
  });
}

function isMobileAdmin(){return window.matchMedia?.("(max-width: 820px)")?.matches===true;}
function setAdminMobileSearch(open,{focus=true,clear=false}={}){
  const wrap=$("#adminGlobalSearchWrap"),trigger=$("#adminMobileSearchTrigger"),input=$("#adminGlobalSearch"),results=$("#adminSearchResults");
  if(!wrap||!trigger)return;
  const next=Boolean(open)&&isMobileAdmin();
  wrap.classList.toggle("is-mobile-open",next);
  trigger.setAttribute("aria-expanded",String(next));
  trigger.setAttribute("aria-label",next?"Закрити пошук":"Відкрити пошук");
  if(!next){
    if(clear&&input)input.value="";
    if(results){results.hidden=true;if(clear)results.innerHTML="";}
    if(input&&document.activeElement===input)input.blur();
    return;
  }
  if(focus&&input)requestAnimationFrame(()=>input.focus({preventScroll:true}));
}

function bind(){
  initAdmin2Selects();
  $("#adminMobileSearchTrigger")?.addEventListener("click",()=>{const wrap=$("#adminGlobalSearchWrap");setAdminMobileSearch(!wrap?.classList.contains("is-mobile-open"));});
  document.querySelectorAll("[data-admin-view]").forEach(button=>button.addEventListener("click",()=>activateAdmin2View(button.dataset.adminView)));
  document.querySelectorAll("[data-admin-jump]").forEach(button=>button.addEventListener("click",()=>activateAdmin2View(button.dataset.adminJump)));
  const globalSearch=$("#adminGlobalSearch");if(globalSearch){globalSearch.addEventListener("input",()=>{adminSearchActiveIndex=0;renderGlobalSearch();});globalSearch.addEventListener("keydown",event=>{const rows=globalSearchEntries(globalSearch.value);if(event.key==="Escape"){globalSearch.value="";renderGlobalSearch();setAdminMobileSearch(false,{clear:true});globalSearch.blur();return;}if(!rows.length)return;if(event.key==="ArrowDown"){event.preventDefault();adminSearchActiveIndex=(adminSearchActiveIndex+1)%rows.length;renderGlobalSearch();$("#adminSearchResults .is-active")?.scrollIntoView({block:"nearest"});}else if(event.key==="ArrowUp"){event.preventDefault();adminSearchActiveIndex=(adminSearchActiveIndex-1+rows.length)%rows.length;renderGlobalSearch();$("#adminSearchResults .is-active")?.scrollIntoView({block:"nearest"});}else if(event.key==="Enter"){event.preventDefault();runGlobalSearchResult(rows,Math.max(0,adminSearchActiveIndex));}});}
  document.addEventListener("keydown",event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();if(isMobileAdmin())setAdminMobileSearch(true);else $("#adminGlobalSearch")?.focus();return;}if(event.key==="Escape"&&$("#adminGlobalSearchWrap")?.classList.contains("is-mobile-open")){setAdminMobileSearch(false,{clear:true});return;}if(event.key==="Escape"&&!$("#adminMoreMenu")?.hidden)closeAdmin2MoreMenu();if(event.key==="Escape")closeAdmin2Selects();});
  document.addEventListener("click",event=>{const box=$("#adminSearchResults");if(box&&!event.target.closest(".admin2-global-search"))box.hidden=true;if($("#adminGlobalSearchWrap")?.classList.contains("is-mobile-open")&&!event.target.closest("#adminGlobalSearchWrap")&&!event.target.closest("#adminMobileSearchTrigger"))setAdminMobileSearch(false);const matches=$("#manualCustomerMatches");if(matches&&!event.target.closest(".admin2-manual-customer"))matches.hidden=true;if(!event.target.closest(".admin2-np-combobox"))manualNpCloseAll();const more=$("#adminMoreMenu");if(more&&!more.hidden&&!event.target.closest("#adminMoreMenu")&&!event.target.closest("#adminMoreBtn"))closeAdmin2MoreMenu();if(!event.target.closest(".admin2-select"))closeAdmin2Selects();});
  ["#customerSearch","#customerSegmentFilter"].forEach(sel=>$(sel)?.addEventListener("input",renderCustomers));
  ["#catalogSearch","#catalogCollectionFilter"].forEach(sel=>$(sel)?.addEventListener("input",renderCatalogAdmin));
  ["#paymentMethodFilter","#paymentStateFilter"].forEach(sel=>$(sel)?.addEventListener("input",renderPayments));
  ["#financePeriod","#expenseCategoryFilter"].forEach(sel=>$(sel)?.addEventListener("input",renderFinance));
  $("#newExpenseBtn")?.addEventListener("click",()=>openExpense());
  $("#expenseForm")?.addEventListener("submit",saveExpense);$("#expenseDelete")?.addEventListener("click",deleteExpense);$("#expenseDialogClose")?.addEventListener("click",()=>$("#expenseDialog")?.close());$("#expenseCancel")?.addEventListener("click",()=>$("#expenseDialog")?.close());
  $("#customer360Close")?.addEventListener("click",()=>closeCustomer360());$("#customer360Back")?.addEventListener("click",()=>closeCustomer360());$("#customer360MobileClose")?.addEventListener("click",()=>closeCustomer360());$("#customer360Dialog")?.addEventListener("cancel",event=>{event.preventDefault();closeCustomer360();});$("#customer360Dialog")?.addEventListener("close",()=>{activeCustomerKey="";customer360HistoryActive=false;const scroller=$("#customer360Dialog .admin2-customer-scroll");if(scroller)scroller.scrollTop=0;if(customer360SkipRestore){customer360SkipRestore=false;return;}restoreCustomer360ReturnState();});
  document.addEventListener("click",event=>{const button=event.target.closest("[data-push-action]");if(button)handlePushAction(button.dataset.pushAction);});
  $("#adminMoreBtn")?.addEventListener("click",()=>{const menu=$("#adminMoreMenu");if(!menu)return;const opening=menu.hidden;menu.hidden=!opening;syncAdmin2MobileNav({moreOpen:opening});});
  const openManualOrder=()=>{resetManualOrder();const dialog=$("#manualOrderDialog");dialog.showModal();requestAnimationFrame(()=>$("#manualOrderTitle")?.focus({preventScroll:true}));};$("#newOrderBtn")?.addEventListener("click",openManualOrder);$("#mobileNewOrderBtn")?.addEventListener("click",openManualOrder);
  $("#manualOrderClose")?.addEventListener("click",()=>$("#manualOrderDialog").close());$("#manualOrderCancel")?.addEventListener("click",()=>$("#manualOrderDialog").close());
  $("#manualOrderForm")?.elements.delivery_method?.addEventListener("change",toggleManualDeliveryFields);bindManualNovaPoshta();$("#manualCustomerLookup")?.addEventListener("input",renderManualCustomerMatches);
  $("#manualAddItem")?.addEventListener("click",()=>{manualItems.push({id:fullSizeProducts()[0]?.id||"signature-relax",quantity:1,selections:[],discoveryConfirmed:false});renderManualItems();});$("#manualOrderForm")?.addEventListener("submit",createManualOrder);
  $("#adminConfirmCancel")?.addEventListener("click",()=>{if($("#adminConfirmDialog")?.open)$("#adminConfirmDialog").close();if(confirmResolver){confirmResolver(false);confirmResolver=null;}});$("#adminConfirmAccept")?.addEventListener("click",()=>{if($("#adminConfirmDialog")?.open)$("#adminConfirmDialog").close();if(confirmResolver){confirmResolver(true);confirmResolver=null;}});$("#adminConfirmDialog")?.addEventListener("cancel",event=>{event.preventDefault();$("#adminConfirmDialog").close();if(confirmResolver){confirmResolver(false);confirmResolver=null;}});
  $("#loginForm").addEventListener("submit",async event=>{
    event.preventDefault();$("#loginMessage").textContent="Входимо…";
    const email=event.target.email.value.trim(),password=event.target.password.value;
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error)return showLogin("Помилка входу: "+error.message);
    try{await requireAdmin();showDashboard();await loadAll();}catch(err){showLogin(err.message);}
  });
  $("#logoutBtn").addEventListener("click",async()=>{await sb.auth.signOut({scope:"local"});showLogin();});
  $("#refreshBtn").addEventListener("click",()=>loadAll().catch(()=>{}));window.addEventListener("offline",()=>setSyncState("offline"));window.addEventListener("online",()=>loadAll({silent:true}).catch(()=>{}));document.addEventListener("visibilitychange",()=>{if(!document.hidden&&navigator.onLine&&!$("#dashboardView")?.hidden)loadAll({silent:true}).catch(()=>{});});startAdminAutoSync();
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
  orderDialogClose.addEventListener("click",()=>closeOrderDetail());$("#orderDialogBack")?.addEventListener("click",()=>closeOrderDetail());$("#orderDialogMobileClose")?.addEventListener("click",()=>closeOrderDetail());orderDialog.addEventListener("cancel",event=>{event.preventDefault();closeOrderDetail();});orderDialog.addEventListener("close",()=>{orderDetailHistoryActive=false;activeOrder=null;if(orderDetailSkipRestore){orderDetailSkipRestore=false;return;}restoreOrderDetailReturnState();});
  orderDialog.addEventListener("cancel",()=>{activeOrder=null;activeOrderAttempts=[];activeOrderEvents=[];});
  orderDialog.addEventListener("close",()=>{activeOrder=null;activeOrderAttempts=[];activeOrderEvents=[];});
  $("#cancelPromoBtn").addEventListener("click",()=>$("#promoDialog").close());$("#promoDialog .admin-promo-close").addEventListener("click",()=>$("#promoDialog").close());$("#generatePromoBtn").addEventListener("click",generatePromoCode);
  ["#promoUnlimited","#promoNoEnd"].forEach(selector=>{const el=$(selector);el.addEventListener("pointerdown",capturePromoViewport,{passive:true});el.addEventListener("keydown",event=>{if(event.key===" "||event.key==="Enter")capturePromoViewport();});el.addEventListener("change",syncPromoForm);});
  ["discount_type","applies_to"].forEach(name=>{const el=$("#promoForm").elements[name];el.addEventListener("pointerdown",capturePromoViewport,{passive:true});el.addEventListener("keydown",capturePromoViewport);el.addEventListener("change",syncPromoForm);});
  $("#promoDialog").addEventListener("close",()=>{const shell=$("#promoDialog .admin-promo-shell");if(shell)shell.scrollTop=0;promoViewportSnapshot=null;});
  $("#promoForm").elements.code.addEventListener("input",event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,"");});
  const activateTab=(name,{updateHash=true}={})=>activateAdmin2View(name,{updateHash});
  window.addEventListener("hashchange",()=>{if(history.state?.adminDetail!=="customer")activateAdmin2View(location.hash.slice(1),{updateHash:false});});
  window.addEventListener("popstate",handleAdminPopState);
  activateAdmin2View(location.hash.slice(1)||"overview",{updateHash:false});
}
document.addEventListener("DOMContentLoaded",async()=>{bind();const {data:{session}}=await sb.auth.getSession();if(!session)return showLogin();try{await requireAdmin();showDashboard();await loadAll();}catch(err){showLogin(err.message);}});
})();
