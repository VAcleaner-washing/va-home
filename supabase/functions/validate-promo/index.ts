import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set(["https://vahome.com.ua", "https://www.vahome.com.ua"]);
const FRAGRANCES = new Set([
  "signature-relax","forbidden-fruit","doux-moment","wild-berry-way","hotel-spring",
  "evening-ritual","velvet-spa","pure-zen","hotel-luxe","old-money","linstinct",
  "mineral-salt","pure-imagination","silk-molecule","the-archive","silent-temple",
  "moss-and-shadow","dark-bloom"
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://vahome.com.ua",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}
function fullSizeQuantity(items: any[]) {
  return items.reduce((sum, item) => FRAGRANCES.has(String(item?.id || ""))
    ? sum + Math.max(1, Math.trunc(Number(item?.quantity || 1)))
    : sum, 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { valid: false }, 405);
  try {
    const body = await req.json();
    const email = String(body.customer_email || "").trim().toLowerCase().slice(0, 160);
    const code = String(body.code || "").trim().toUpperCase().slice(0, 40);
    const subtotal = Math.max(0, Number(body.subtotal || 0));
    const items = Array.isArray(body.items) ? body.items : [];
    const ids = items.map((item: any) => String(item?.id || ""));
    const fragranceQuantity = fullSizeQuantity(items);
    if (!code) return json(req, { valid: false, message: "Введіть промокод." }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: promo, error } = await sb.from("promo_codes").select("*").ilike("code", code).maybeSingle();
    if (error) throw error;
    const now = Date.now();
    if (!promo || !promo.active || (promo.starts_at && new Date(promo.starts_at).getTime() > now)
      || (promo.ends_at && new Date(promo.ends_at).getTime() < now)
      || (promo.usage_limit && promo.usage_count >= promo.usage_limit)) {
      return json(req, { valid: false, message: "Промокод не знайдено або він уже не діє." }, 400);
    }
    if (promo.customer_email && (!email || email !== String(promo.customer_email).trim().toLowerCase())) {
      return json(req, { valid: false, message: email
        ? "Цей персональний промокод прив’язаний до іншого email."
        : "Спочатку вкажіть email, на який отримали промокод." }, 400);
    }
    if (subtotal < Number(promo.min_order_amount || 0)) {
      return json(req, { valid: false, message: `Мінімальна сума для цього промокоду — ${Number(promo.min_order_amount)} грн.` }, 400);
    }
    const eligible = promo.applies_to === "all"
      || (promo.applies_to === "fragrances" && ids.some((id: string) => FRAGRANCES.has(id)))
      || (promo.applies_to === "products" && ids.some((id: string) => (promo.product_ids || []).includes(id)));
    if (!eligible) return json(req, { valid: false, message: "Промокод не діє на товари у кошику." }, 400);

    if (promo.campaign_type === "welcome_scent_profile") {
      const { data: prior, error: priorError } = await sb.from("orders").select("id,items,status")
        .eq("customer_email", email).neq("status", "cancelled");
      if (priorError) throw priorError;
      const hasFullSize = (prior || []).some((order: any) => (Array.isArray(order.items) ? order.items : [])
        .some((item: any) => FRAGRANCES.has(String(item?.id || ""))));
      if (hasFullSize) return json(req, { valid: false, message: "Welcome Credit діє лише на першу повнорозмірну покупку." }, 400);
    }

    let discount = 0;
    let freeShipping = false;
    let tierMessage = "";
    if (promo.campaign_type === "discovery_credit") {
      const creditAmount = Number(promo.discount_value || 0);
      if (fragranceQuantity < 1) return json(req, { valid: false, message: "Discovery Credit діє лише на повнорозмірні аромати." }, 400);
      if (creditAmount >= 450) {
        discount = fragranceQuantity >= 2 ? 450 : 250;
        tierMessage = fragranceQuantity >= 2
          ? "Застосовано всі 450 грн на замовлення від двох повнорозмірних ароматів."
          : "Застосовано 250 грн. Додайте другий повнорозмірний аромат, щоб використати всі 450 грн.";
      } else {
        discount = Math.min(150, creditAmount);
        tierMessage = "Застосовано 150 грн на повнорозмірний аромат.";
      }
      discount = Math.min(subtotal, discount);
    } else if (promo.discount_type === "fixed") {
      discount = Math.min(subtotal, Number(promo.discount_value || 0));
    } else if (promo.discount_type === "percent") {
      discount = Math.min(subtotal, Math.round(subtotal * Number(promo.discount_value || 0)) / 100);
    } else if (promo.discount_type === "free_shipping") {
      freeShipping = true;
    }

    return json(req, {
      valid: true,
      promo: {
        id: promo.id,
        code: promo.code,
        discount_amount: discount,
        discount_value: Number(promo.discount_value || 0),
        credit_amount: promo.campaign_type === "discovery_credit" ? Number(promo.discount_value || 0) : null,
        campaign_type: promo.campaign_type || null,
        full_size_quantity: fragranceQuantity,
        tier_message: tierMessage || null,
        free_shipping: freeShipping,
        discount_type: promo.discount_type,
        email_bound: Boolean(promo.customer_email),
        validated_email: promo.customer_email ? email : null
      }
    });
  } catch (error) {
    console.error(error);
    return json(req, { valid: false, message: "Не вдалося перевірити промокод." }, 500);
  }
});
