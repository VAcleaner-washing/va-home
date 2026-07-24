import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FROM_EMAIL = "VA HOME <orders@vahome.com.ua>";
const SHOP_EMAIL = "vahome.aroma@gmail.com";
const ALLOWED = new Set(["https://vahome.com.ua","https://www.vahome.com.ua"]);
const labels: Record<string,string> = {new:"Замовлення отримано",pending:"Очікуємо підтвердження",awaiting_payment:"Очікуємо оплату",paid:"Оплату підтверджено",shipped:"Замовлення відправлено",completed:"Замовлення виконано",cancelled:"Замовлення скасовано"};
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

// Нова преміальна світла оболонка для листів
function shell(content:string){
  return `<!doctype html><html lang="uk"><body style="margin:0;background-color:#F9F8F6;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;background-color:#FFFFFF;margin:0 auto;border:1px solid #E5E5E5;border-radius:2px;"><tr><td align="center" style="padding:40px 24px 32px 24px;border-bottom:1px solid #F5F5F5;"><div style="font-family:'Georgia',serif;font-size:26px;letter-spacing:5px;color:#171717;font-weight:normal;text-transform:uppercase;">VA HOME</div><div style="font-size:9px;letter-spacing:3px;color:#C8A27C;margin-top:6px;text-transform:uppercase;font-weight:500;">invisible luxury atmosphere</div></td></tr><tr><td style="padding:40px 32px 48px 32px;">${content}<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #E5E5E5;padding-top:24px;margin-top:32px;"><tr><td align="center" style="font-size:13px;color:#A3A3A3;line-height:1.5;">Дякуємо, що обираєте нас.<br><a href="https://vahome.com.ua" style="color:#171717;text-decoration:none;font-weight:500;">vahome.com.ua</a> · ${SHOP_EMAIL}</td></tr></table></td></tr></table></body></html>`;
}

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

// Новий світлий блок для відгуків
function reviewInvitation(items:unknown){
  const targets=reviewTargets(items);
  if(!targets.length)return "";
  const links=targets.map(({id,name})=>`<a href="https://vahome.com.ua/products/${encodeURIComponent(id)}.html?review=1#reviews" style="display:inline-block;margin:0 8px 10px 0;padding:10px 14px;border:1px solid #C8A27C;background-color:#FBF9F6;color:#171717;text-decoration:none;font-size:14px;border-radius:2px;">Залишити відгук про ${esc(name)}</a>`).join("");
  return `<div style="margin:32px 0 8px;padding:24px;border:1px solid #EAE8E2;background-color:#F5F4F0;border-radius:3px;"><h2 style="margin:0 0 8px;color:#171717;font:normal 16px/1.3 'Georgia',serif;letter-spacing:0.5px;">Поділіться вашими враженнями</h2><p style="margin:0 0 16px;color:#525252;font-size:14px;line-height:1.5;">Нам буде приємно дізнатися, як саме розкрився аромат у вашому інтер'єрі. Це допоможе іншим точніше обрати композицію.</p><div style="margin-bottom:4px;">${links}</div><p style="margin:8px 0 0;color:#A3A3A3;font-size:11px;line-height:1.4;">Відгук з’явиться на сайті після модерації. Для автоматичної позначки «Перевірена покупка» увійдіть у кабінет з email, указаним у замовленні.</p></div>`;
}

async function resend(key:string,payload:unknown){const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});const t=await r.text();if(!r.ok)throw new Error(`Resend ${r.status}: ${t}`);return t?JSON.parse(t):null;}

Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors(req)});if(req.method!=="POST")return json(req,{error:"Method not allowed"},405);try{const origin=req.headers.get("origin");if(origin&&!ALLOWED.has(origin))return json(req,{error:"Origin not allowed"},403);const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,resendKey=Deno.env.get("RESEND_API_KEY")!;const auth=req.headers.get("Authorization")||"";const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json(req,{error:"Unauthorized"},401);const admin=createClient(url,service);const {data:isAdmin}=await admin.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();if(!isAdmin)return json(req,{error:"Forbidden"},403);const body=await req.json();const orderNo=String(body.client_order_id||"").trim();const {data:o,error}=await admin.from("orders").select("*").eq("client_order_id",orderNo).single();if(error||!o)return json(req,{error:"Order not found"},404);if(o.status==="completed"&&o.review_invitation_sent_at)return json(req,{ok:true,skipped:"review_invitation_already_sent"});const status=labels[o.status]||o.status;

// Світлий блок ТТН
const tracking=o.tracking_number?`<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FBF9F6;border-radius:3px;border:1px solid #C8A27C;margin:24px 0 32px 0;"><tr><td style="padding:24px;"><h2 style="font-family:'Georgia',serif;font-size:16px;color:#171717;margin:0 0 8px 0;font-weight:normal;letter-spacing:0.5px;">ТТН Нової пошти</h2><div style="font-family:monospace;font-size:18px;font-weight:600;letter-spacing:1px;color:#171717;background:#EAE8E2;padding:6px 12px;display:inline-block;border-radius:2px;">${esc(o.tracking_number)}</div></td></tr></table>`:"";

const invitation=o.status==="completed"?reviewInvitation(o.items):"";

// Кнопка перевірки статусу в новому дизайні
const statusButton=o.status!=="completed"&&o.status!=="cancelled"?`<p style="margin-top:32px;"><a href="https://vahome.com.ua/order-status.html" style="display:inline-block;padding:12px 24px;background:#C8A27C;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:500;letter-spacing:0.5px;border-radius:2px;">Перевірити статус</a></p>`:"";

const html=shell(`
  <div style="font-size:13px;letter-spacing:1px;color:#737373;text-transform:uppercase;margin-bottom:12px;font-family:monospace;">${esc(o.client_order_id)}</div>
  <h1 style="font-family:'Georgia',serif;font-size:26px;line-height:1.3;color:#171717;margin:0 0 16px 0;font-weight:normal;">${esc(status)}</h1>
  <p style="font-size:15px;line-height:1.6;color:#525252;margin:0 0 12px 0;">Вітаємо, ${esc(o.customer_name)}.</p>
  
  ${o.status==="paid"?"<p style='font-size:15px;line-height:1.6;color:#525252;margin:0 0 32px 0;'>Ми успішно зарахували вашу оплату. Ваше замовлення вже передано на пакування та готується до відправлення.</p>":""}
  ${o.status==="shipped"?"<p style='font-size:15px;line-height:1.6;color:#525252;margin:0 0 32px 0;'>Ваша посилка вже передана Новій пошті та прямує до вас. Очікуйте сповіщення від перевізника.</p>":""}
  ${o.status==="completed"?"<p style='font-size:15px;line-height:1.6;color:#525252;margin:0 0 24px 0;'>Щиро дякуємо, що обрали VA HOME. Сподіваємося, цей аромат доповнить затишок вашої оселі та стане невід'ємною частиною вашого простору.</p>":""}
  ${o.status==="cancelled"?"<p style='font-size:15px;line-height:1.6;color:#525252;margin:0 0 32px 0;'>Замовлення скасовано. Якщо у вас виникли питання або ви бажаєте змінити деталі, будь ласка, відповідайте на цей лист.</p>":""}
  
  ${tracking}
  
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F5F4F0;border-radius:3px;border:1px solid #EAE8E2;margin-bottom:16px;">
    <tr>
      <td style="padding:20px 24px;">
        <span style="font-size:14px;color:#737373;">Сума замовлення:</span>
        <span style="font-size:16px;color:#171717;font-weight:600;font-family:'Georgia',serif;float:right;">${money(o.total_amount)}</span>
      </td>
    </tr>
  </table>
  
  ${invitation}
  ${statusButton}
`);

await resend(resendKey,{from:FROM_EMAIL,to:[o.customer_email],reply_to:SHOP_EMAIL,subject:`${status} — ${o.client_order_id}`,html});if(o.status==="completed"){const {error:markError}=await admin.from("orders").update({review_invitation_sent_at:new Date().toISOString()}).eq("id",o.id).is("review_invitation_sent_at",null);if(markError)throw markError;}return json(req,{ok:true,review_invitation:o.status==="completed"});}catch(e){console.error(e);return json(req,{error:e instanceof Error?e.message:"Unknown error"},500)}});