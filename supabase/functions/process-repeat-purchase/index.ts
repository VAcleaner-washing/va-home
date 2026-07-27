import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FROM_EMAIL = "VA HOME <orders@vahome.com.ua>";
const SHOP_EMAIL = "vahome.aroma@gmail.com";
const SITE_URL = "https://vahome.com.ua";
const PROJECT_FUNCTIONS_URL = "https://yweluzclearwrazdkahu.supabase.co/functions/v1";
const BATCH_SIZE = 20;
const FRAGRANCES: Record<string, { name: string; similar: string[] }> = {
  "signature-relax": { name: "Signature Relax", similar: ["pure-zen", "hotel-spring"] },
  "forbidden-fruit": { name: "Forbidden Fruit", similar: ["dark-bloom", "doux-moment"] },
  "doux-moment": { name: "DOUX Moment", similar: ["forbidden-fruit", "evening-ritual"] },
  "wild-berry-way": { name: "Wild Berry Way", similar: ["hotel-spring", "signature-relax"] },
  "hotel-spring": { name: "Hotel Spring", similar: ["hotel-luxe", "signature-relax"] },
  "evening-ritual": { name: "Evening Ritual", similar: ["dark-bloom", "velvet-spa"] },
  "velvet-spa": { name: "Velvet Spa", similar: ["pure-zen", "mineral-salt"] },
  "pure-zen": { name: "Pure Zen", similar: ["velvet-spa", "mineral-salt"] },
  "hotel-luxe": { name: "Hotel Luxe", similar: ["hotel-spring", "mineral-salt"] },
  "old-money": { name: "Old Money", similar: ["the-archive", "linstinct"] },
  "linstinct": { name: "L’INSTINCT", similar: ["old-money", "moss-and-shadow"] },
  "mineral-salt": { name: "Mineral Salt", similar: ["pure-zen", "hotel-luxe"] },
  "pure-imagination": { name: "Pure Imagination", similar: ["silk-molecule", "mineral-salt"] },
  "silk-molecule": { name: "Silk Molecule", similar: ["pure-imagination", "evening-ritual"] },
  "the-archive": { name: "The Archive", similar: ["old-money", "moss-and-shadow"] },
  "silent-temple": { name: "Silent Temple", similar: ["moss-and-shadow", "pure-zen"] },
  "moss-and-shadow": { name: "Moss & Shadow", similar: ["silent-temple", "the-archive"] },
  "dark-bloom": { name: "Dark Bloom", similar: ["evening-ritual", "forbidden-fruit"] },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]!));
}
function normalizeEmail(value: unknown) { return String(value ?? "").trim().toLowerCase(); }
function fullSizeIds(items: unknown) {
  const ids: string[] = [];
  for (const raw of Array.isArray(items) ? items : []) {
    if (!raw || typeof raw !== "object") continue;
    const id = String((raw as Record<string, unknown>).id || "");
    if (FRAGRANCES[id] && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function isAuthorized(req: Request, admin: ReturnType<typeof createClient>) {
  const supplied = req.headers.get("x-cron-secret") || "";
  if (supplied) {
    const { data } = await admin.from("automation_secrets").select("secret_sha256").eq("name", "repeat_purchase_cron").maybeSingle();
    if (data?.secret_sha256 && await sha256(supplied) === data.secret_sha256) return true;
  }
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization) return false;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, anon, { global: { headers: { Authorization: authorization } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return false;
  const { data: adminUser } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  return Boolean(adminUser);
}
async function resend(apiKey: string, payload: Record<string, unknown>, idempotencyKey: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Resend ${response.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}
function promoCode() {
  return `VA-RETURN-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
function uaDate(value: Date) {
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Kyiv" }).format(value);
}
function emailHtml(params: {
  firstName: string; code: string; expires: Date; primaryId: string; unsubscribeToken: string;
}) {
  const primary = FRAGRANCES[params.primaryId];
  const similar = primary.similar.map(id => ({ id, ...FRAGRANCES[id] })).filter(x => x.name);
  const unsubscribeUrl = `${PROJECT_FUNCTIONS_URL}/marketing-unsubscribe?token=${encodeURIComponent(params.unsubscribeToken)}`;
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;background:#F4F1ED;padding:32px 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#171513;">
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background:#FFFFFF;border:1px solid #E7E0D8;">
      <tr><td align="center" style="padding:36px 24px 28px;border-bottom:1px solid #EEE8E1;">
        <div style="font-family:Georgia,serif;font-size:27px;letter-spacing:5px;">VA HOME</div>
        <div style="margin-top:7px;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#B69369;">invisible luxury atmosphere</div>
      </td></tr>
      <tr><td style="padding:42px 34px 38px;">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9B7C58;margin-bottom:15px;">A quiet return</div>
        <h1 style="font-family:Georgia,serif;font-weight:400;font-size:29px;line-height:1.25;margin:0 0 20px;">Час обрати наступну атмосферу</h1>
        <p style="font-size:15px;line-height:1.75;color:#57514B;margin:0 0 17px;">${params.firstName ? `${esc(params.firstName)}, м` : "М"}ожливо, ваш аромат VA HOME уже став тихою частиною простору.</p>
        <p style="font-size:15px;line-height:1.75;color:#57514B;margin:0 0 28px;">Для наступної повнорозмірної композиції ми залишили персональну знижку <strong style="color:#171513;">100 грн</strong>.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4F0;border:1px solid #DED2C5;margin:0 0 28px;"><tr><td align="center" style="padding:25px 18px;">
          <div style="font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#8D8175;margin-bottom:9px;">Ваш персональний код</div>
          <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:2px;color:#171513;">${esc(params.code)}</div>
          <div style="font-size:12px;color:#8D8175;margin-top:9px;">Діє до ${esc(uaDate(params.expires))}</div>
        </td></tr></table>
        <p style="margin:0 0 14px;"><a href="${SITE_URL}/products/${encodeURIComponent(params.primaryId)}.html" style="display:block;text-align:center;background:#171513;color:#fff;text-decoration:none;padding:15px 18px;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Повторити ${esc(primary.name)}</a></p>
        <p style="margin:0 0 31px;"><a href="${SITE_URL}/scent-guide.html" style="display:block;text-align:center;border:1px solid #171513;color:#171513;text-decoration:none;padding:14px 18px;font-size:13px;letter-spacing:.7px;">Підібрати інший аромат</a></p>
        <div style="border-top:1px solid #EEE8E1;padding-top:24px;">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8D8175;margin-bottom:13px;">Схожі композиції</div>
          ${similar.map(item => `<a href="${SITE_URL}/products/${encodeURIComponent(item.id)}.html" style="display:inline-block;margin:0 8px 8px 0;color:#171513;text-decoration:none;border-bottom:1px solid #B69369;padding-bottom:3px;font-family:Georgia,serif;font-size:15px;">${esc(item.name)}</a>`).join("")}
        </div>
        <p style="font-size:12px;line-height:1.6;color:#8D8175;margin:28px 0 0;">Код одноразовий, прив’язаний до цього email, діє 7 днів на аромадифузори 100 мл, не поширюється на Discovery Set і не сумується з іншими промокодами.</p>
      </td></tr>
      <tr><td align="center" style="padding:24px 25px 30px;background:#FAF8F5;border-top:1px solid #EEE8E1;font-size:11px;line-height:1.7;color:#9B9188;">
        Ви отримали цей лист, бо погодилися отримувати персональні пропозиції VA HOME під час оформлення замовлення.<br>
        <a href="${unsubscribeUrl}" style="color:#6F655D;">Відписатися від персональних листів</a> · <a href="${SITE_URL}/privacy.html" style="color:#6F655D;">Політика конфіденційності</a><br>
        ${SHOP_EMAIL}
      </td></tr>
    </table>
  </body></html>`;
}

Deno.serve(async req => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);
  if (!await isAuthorized(req, admin)) return json({ error: "Unauthorized" }, 401);
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json({ error: "RESEND_NOT_CONFIGURED" }, 503);

  const now = new Date();
  const cutoff = new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString();

  // Defense-in-depth: recover eligible completed orders if an earlier trigger was missed.
  const { data: eligibleOrders, error: eligibleError } = await admin
    .from("orders")
    .select("id,customer_email,items,completed_at,status_changed_at")
    .eq("status", "completed")
    .eq("marketing_consent", true)
    .is("repeat_campaign_sent_at", null)
    .lte("completed_at", cutoff)
    .limit(100);
  if (eligibleError) throw eligibleError;
  for (const order of eligibleOrders || []) {
    if (!fullSizeIds(order.items).length) continue;
    await admin.from("repeat_purchase_campaigns").upsert({
      order_id: order.id,
      customer_email: normalizeEmail(order.customer_email),
      scheduled_for: order.completed_at || order.status_changed_at || now.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: "order_id", ignoreDuplicates: true });
  }

  const { data: campaigns, error: campaignError } = await admin
    .from("repeat_purchase_campaigns")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("scheduled_for", now.toISOString())
    .lt("attempt_count", 3)
    .order("scheduled_for", { ascending: true })
    .limit(BATCH_SIZE);
  if (campaignError) throw campaignError;

  const results: Array<Record<string, unknown>> = [];
  for (const campaign of campaigns || []) {
    const { data: locked } = await admin.from("repeat_purchase_campaigns")
      .update({ status: "sending", attempt_count: Number(campaign.attempt_count || 0) + 1, updated_at: new Date().toISOString(), last_error: null })
      .eq("id", campaign.id)
      .in("status", ["pending", "failed"])
      .select("*")
      .maybeSingle();
    if (!locked) continue;

    try {
      const { data: order, error: orderError } = await admin.from("orders").select("*").eq("id", campaign.order_id).single();
      if (orderError || !order) throw new Error("ORDER_NOT_FOUND");
      const email = normalizeEmail(order.customer_email);
      const ids = fullSizeIds(order.items);
      if (order.status !== "completed" || !order.marketing_consent || order.repeat_campaign_sent_at || !email || !ids.length) {
        await admin.from("repeat_purchase_campaigns").update({ status: "skipped", last_error: "ORDER_NOT_ELIGIBLE", updated_at: new Date().toISOString() }).eq("id", campaign.id);
        results.push({ id: campaign.id, status: "skipped" });
        continue;
      }
      const { data: preference } = await admin.from("marketing_preferences").select("*").eq("email", email).maybeSingle();
      if (!preference?.subscribed) {
        await admin.from("repeat_purchase_campaigns").update({ status: "skipped", last_error: "UNSUBSCRIBED", updated_at: new Date().toISOString() }).eq("id", campaign.id);
        results.push({ id: campaign.id, status: "skipped" });
        continue;
      }

      let promoId = campaign.promo_code_id as string | null;
      let code = "";
      let expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (promoId) {
        const { data: existingPromo } = await admin.from("promo_codes").select("id,code,ends_at").eq("id", promoId).maybeSingle();
        if (existingPromo) {
          code = existingPromo.code;
          expires = new Date(existingPromo.ends_at);
        } else promoId = null;
      }
      if (!promoId) {
        for (let attempt = 0; attempt < 4 && !promoId; attempt++) {
          code = promoCode();
          const { data: created, error: promoError } = await admin.from("promo_codes").insert({
            code,
            name: `Repeat purchase · ${order.client_order_id}`,
            discount_type: "fixed",
            discount_value: 100,
            min_order_amount: 799,
            applies_to: "fragrances",
            starts_at: new Date().toISOString(),
            ends_at: expires.toISOString(),
            usage_limit: 1,
            active: true,
            customer_email: email,
            campaign_type: "repeat_55d",
            source_order_id: order.id,
          }).select("id,code,ends_at").single();
          if (!promoError && created) {
            promoId = created.id;
            code = created.code;
            expires = new Date(created.ends_at);
          } else if (promoError?.code !== "23505") throw promoError;
        }
        if (!promoId) throw new Error("PROMO_CREATE_FAILED");
        await admin.from("repeat_purchase_campaigns").update({ promo_code_id: promoId, updated_at: new Date().toISOString() }).eq("id", campaign.id);
      }

      const firstName = String(order.customer_name || "").trim().split(/\s+/)[0] || "";
      const unsubscribeToken = String(preference.unsubscribe_token);
      const unsubscribeUrl = `${PROJECT_FUNCTIONS_URL}/marketing-unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
      const sent = await resend(resendKey, {
        from: FROM_EMAIL,
        to: [email],
        reply_to: SHOP_EMAIL,
        subject: "Час обрати наступну атмосферу — 100 грн для вас",
        html: emailHtml({ firstName, code, expires, primaryId: ids[0], unsubscribeToken }),
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }, `repeat-purchase-${campaign.id}`);

      const sentAt = new Date().toISOString();
      await admin.from("repeat_purchase_campaigns").update({
        status: "sent", sent_at: sentAt, provider_message_id: sent?.id || null, last_error: null, updated_at: sentAt,
      }).eq("id", campaign.id);
      await admin.from("orders").update({ repeat_campaign_sent_at: sentAt }).eq("id", order.id).is("repeat_campaign_sent_at", null);
      results.push({ id: campaign.id, status: "sent", order: order.client_order_id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await admin.from("repeat_purchase_campaigns").update({ status: "failed", last_error: message.slice(0, 900), updated_at: new Date().toISOString() }).eq("id", campaign.id);
      results.push({ id: campaign.id, status: "failed", error: message });
    }
  }

  return json({ ok: true, processed: results.length, results });
});
