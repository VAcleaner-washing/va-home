import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FROM_EMAIL = "VA HOME <orders@vahome.com.ua>";
const SHOP_EMAIL = "vahome.aroma@gmail.com";
const ALLOWED = new Set(["https://vahome.com.ua","https://www.vahome.com.ua"]);
const labels: Record<string,string> = {new:"Замовлення отримано",awaiting_payment:"Очікуємо оплату",paid:"Оплату підтверджено",shipped:"Замовлення відправлено",completed:"Замовлення виконано",cancelled:"Замовлення скасовано"};
const PRODUCT_NAMES: Record<string,string> = {
  "signature-relax":"Signature Relax","forbidden-fruit":"Forbidden Fruit","doux-moment":"DOUX Moment",
  "wild-berry-way":"Wild Berry Way","hotel-spring":"Hotel Spring","evening-ritual":"Evening Ritual",
  "velvet-spa":"Velvet Spa","pure-zen":"Pure Zen","hotel-luxe":"Hotel Luxe","old-money":"Old Money",
  "linstinct":"L’INSTINCT","mineral-salt":"Mineral Salt","pure-imagination":"Pure Imagination",
  "silk-molecule":"Silk Molecule","the-archive":"The Archive","silent-temple":"Silent Temple",
  "moss-and-shadow":"Moss & Shadow","dark-bloom":"Dark Bloom"
};
function cors(req:Request){const o=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":ALLOWED.has(o)?o:"https://vahome.com.ua","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};}
function json(req:Request,b:unknown,s=200){return new Response(JSON.stringify(b),{status:s,headers:{...cors(req),"Content-Type":"application/json"}})}
function esc(v:unknown){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]!));}
function money(v:unknown){return `${Number(v||0).toLocaleString("uk-UA",{maximumFractionDigits:2})} грн`;}
function shell(content:string){return `<!doctype html><html lang="uk"><body style="margin:0;background:#090908;padding:20px"><div style="max-width:640px;margin:auto;border:1px solid #6b5432;background:#111;color:#f6f0e8"><div style="padding:30px;text-align:center;border-bottom:1px solid #6b5432"><div style="font:32px Georgia;letter-spacing:7px">VA HOME</div><div style="margin-top:8px;color:#d2b278;font:11px Arial;letter-spacing:4px">INVISIBLE LUXURY ATMOSPHERE</div></div><div style="padding:34px;font:16px/1.65 Arial;color:#e6ddd3">${content}</div><div style="padding:20px;text-align:center;border-top:1px solid #6b5432;color:#a99d91;font:12px Arial">vahome.com.ua · ${SHOP_EMAIL}</div></div></body></html>`}
function reviewTargets(items:unknown){
  const ids = new Set<string>();
  for(const item of Array.isArray(items)?items:[]){
    if(!item || typeof item!=="object") continue;
    const row=item as Record<string,unknown>;
    const id=String(row.id||"");
    if(PRODUCT_NAMES[id]) ids.add(id);
    if(id==="discovery-17") Object.keys(PRODUCT_NAMES).forEach(productId=>ids.add(productId));
    const selected=Array.isArray(row.selection_ids)?row.selection_ids:[];
    selected.forEach(value=>{const productId=String(value||"");if(PRODUCT_NAMES[productId])ids.add(productId);});
  }
  return [...ids].map(id=>({id,name:PRODUCT_NAMES[id]}));
}
function reviewInvitation(items:unknown){
  const targets=reviewTargets(items);
  if(!targets.length)return "";
  const links=targets.map(({id,name})=>`<a href="https://vahome.com.ua/products/${encodeURIComponent(id)}.html?review=1#reviews" style="display:inline-block;margin:0 8px 10px 0;padding:12px 16px;border:1px solid #c7974d;color:#e8c78d;text-decoration:none">Залишити відгук про ${esc(name)}</a>`).join("");
  return `<div style="margin:28px 0 8px;padding:22px;border:1px solid #6b5432;background:#0b0a09"><h2 style="margin:0 0 10px;color:#fff;font:28px/1.2 Georgia">Як аромат відчувається у вашому просторі?</h2><p style="margin:0 0 18px;color:#c9bfb3">Будемо вдячні за чесне враження. Воно допоможе іншим точніше обрати композицію, а нам — уважніше працювати з наступними партіями.</p>${links}<p style="margin:8px 0 0;color:#978b7f;font-size:12px">Відгук з’явиться на сайті після модерації. Для автоматичної позначки «Перевірена покупка» увійдіть у кабінет з email, указаним у замовленні.</p></div>`;
}
async function resend(key:string,payload:unknown){const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});const t=await r.text();if(!r.ok)throw new Error(`Resend ${r.status}: ${t}`);return t?JSON.parse(t):null;}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors(req)});if(req.method!=="POST")return json(req,{error:"Method not allowed"},405);try{const origin=req.headers.get("origin");if(origin&&!ALLOWED.has(origin))return json(req,{error:"Origin not allowed"},403);const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,resendKey=Deno.env.get("RESEND_API_KEY")!;const auth=req.headers.get("Authorization")||"";const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json(req,{error:"Unauthorized"},401);const admin=createClient(url,service);const {data:isAdmin}=await admin.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();if(!isAdmin)return json(req,{error:"Forbidden"},403);const body=await req.json();const orderNo=String(body.client_order_id||"").trim();const {data:o,error}=await admin.from("orders").select("*").eq("client_order_id",orderNo).single();if(error||!o)return json(req,{error:"Order not found"},404);if(o.status==="completed"&&o.review_invitation_sent_at)return json(req,{ok:true,skipped:"review_invitation_already_sent"});const status=labels[o.status]||o.status;const tracking=o.tracking_number?`<div style="margin:22px 0;padding:18px;border:1px solid #6b5432"><strong>ТТН Нової пошти</strong><br><span style="font-size:20px">${esc(o.tracking_number)}</span></div>`:"";const invitation=o.status==="completed"?reviewInvitation(o.items):"";const html=shell(`<p style="margin:0;color:#d2b278;text-transform:uppercase;letter-spacing:2px;font-size:12px">${esc(o.client_order_id)}</p><h1 style="font:38px/1.15 Georgia;margin:10px 0 20px;color:#fff">${esc(status)}</h1><p>Вітаємо, ${esc(o.customer_name)}.</p>${o.status==="paid"?"<p>Оплату підтверджено. Ми готуємо ваше замовлення до відправлення.</p>":""}${o.status==="shipped"?"<p>Ваше замовлення вже передано Новій пошті.</p>":""}${o.status==="completed"?"<p>Дякуємо, що обрали VA HOME. Сподіваємося, аромат став природною частиною вашого простору.</p>":""}${o.status==="cancelled"?"<p>Замовлення скасовано. Для уточнення деталей відповідайте на цей лист.</p>":""}${tracking}<p><strong>Сума замовлення:</strong> ${money(o.total_amount)}</p>${invitation}<p style="margin-top:28px"><a href="https://vahome.com.ua/order-status.html" style="display:inline-block;padding:14px 20px;background:#c7974d;color:#111;text-decoration:none">Перевірити статус</a></p>`);await resend(resendKey,{from:FROM_EMAIL,to:[o.customer_email],reply_to:SHOP_EMAIL,subject:`${status} — ${o.client_order_id}`,html});if(o.status==="completed"){const {error:markError}=await admin.from("orders").update({review_invitation_sent_at:new Date().toISOString()}).eq("id",o.id).is("review_invitation_sent_at",null);if(markError)throw markError;}return json(req,{ok:true,review_invitation:o.status==="completed"});}catch(e){console.error(e);return json(req,{error:e instanceof Error?e.message:"Unknown error"},500)}});
