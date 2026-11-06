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
function appliesToCart(promo: any, ids: string[]) {
  return promo.applies_to === "all"
    || (promo.applies_to === "fragrances" && ids.some((id) => FRAGRANCES.has(id)))
    || (promo.applies_to === "products" && ids.some((id) => (promo.product_ids || []).includes(id)));
}
function previewDiscount(promo: any, subtotal: number, fragranceQuantity: number) {
  if (promo.campaign_type === "discovery_credit") {
    if (fragranceQuantity < 1) return 0;
    const credit = Number(promo.discount_value || 0);
    const amount = credit >= 450 ? (fragranceQuantity >= 2 ? 450 : 250) : Math.min(150, credit);
    return Math.min(Math.max(0, subtotal - 1), amount);
  }
  if (promo.discount_type === "fixed") return Math.min(Math.max(0, subtotal - 1), Number(promo.discount_value || 0));
  if (promo.discount_type === "percent") return Math.min(Math.max(0, subtotal - 1), Math.round(subtotal * Number(promo.discount_value || 0)) / 100);
  return 0;
}
function defaultDescription(promo: any, discount: number) {
  if (promo.checkout_description) return String(promo.checkout_description);
  if (promo.campaign_type === "discovery_credit") return `Discovery Credit: −${discount} грн на повнорозмірні аромати`;
  if (promo.campaign_type === "welcome_scent_profile") return `Welcome Credit: −${discount} грн на перший повнорозмірний аромат`;
  if (promo.discount_type === "free_shipping") return "Безкоштовна доставка для цього замовлення";
  if (promo.discount_type === "percent") return `Знижка ${Number(promo.discount_value || 0)}%`;
  return `Знижка −${discount} грн`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { promos: [] }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const requestedEmail = String(body.customer_email || "").trim().toLowerCase().slice(0, 160);
    let email = "";
    const authorization = req.headers.get("authorization") || "";
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (authorization.startsWith("Bearer ")) {
      const { data, error } = await authClient.auth.getUser(authorization.slice(7));
      if (!error && data.user?.email_confirmed_at && data.user.email?.toLowerCase() === requestedEmail) email = requestedEmail;
    }
    const subtotal = Math.max(0, Number(body.subtotal || 0));
    const items = Array.isArray(body.items) ? body.items : [];
    const ids = items.map((item: any) => String(item?.id || ""));
    const fragranceQuantity = fullSizeQuantity(items);
    if (!items.length || subtotal <= 0) return json(req, { promos: [] });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb.from("promo_codes")
      .select("id,code,name,discount_type,discount_value,min_order_amount,applies_to,product_ids,starts_at,ends_at,usage_limit,usage_count,active,customer_email,campaign_type,show_in_checkout,checkout_description")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const now = Date.now();
    const eligible = [];
    for (const promo of data || []) {
      const boundEmail = String(promo.customer_email || "").trim().toLowerCase();
      const visiblePublic = Boolean(promo.show_in_checkout) && !boundEmail;
      const visiblePersonal = Boolean(email && boundEmail && email === boundEmail);
      if (!visiblePublic && !visiblePersonal) continue;
      if (promo.starts_at && new Date(promo.starts_at).getTime() > now) continue;
      if (promo.ends_at && new Date(promo.ends_at).getTime() < now) continue;
      if (promo.usage_limit && Number(promo.usage_count || 0) >= Number(promo.usage_limit)) continue;
      if (subtotal < Number(promo.min_order_amount || 0)) continue;
      if (!appliesToCart(promo, ids)) continue;
      if (promo.campaign_type === "discovery_credit" && fragranceQuantity < 1) continue;

      if (promo.campaign_type === "welcome_scent_profile" && email) {
        const { data: prior, error: priorError } = await sb.from("orders").select("id,items,status")
          .eq("customer_email", email).neq("status", "cancelled");
        if (priorError) throw priorError;
        const hasFullSize = (prior || []).some((order: any) => (Array.isArray(order.items) ? order.items : [])
          .some((item: any) => FRAGRANCES.has(String(item?.id || ""))));
        if (hasFullSize) continue;
      }

      const discount = previewDiscount(promo, subtotal, fragranceQuantity);
      if (promo.discount_type !== "free_shipping" && discount <= 0) continue;
      eligible.push({
        code: String(promo.code || "").toUpperCase(),
        name: promo.name || null,
        description: defaultDescription(promo, discount),
        discount_amount: discount,
        free_shipping: promo.discount_type === "free_shipping",
        personal: Boolean(boundEmail),
        campaign_type: promo.campaign_type || null
      });
    }

    eligible.sort((a, b) => Number(b.personal) - Number(a.personal) || Number(b.discount_amount || 0) - Number(a.discount_amount || 0));
    return json(req, { promos: eligible.slice(0, 6), email_required_for_personal: !email });
  } catch (error) {
    console.error(error);
    return json(req, { promos: [], message: "Не вдалося завантажити доступні промокоди." }, 500);
  }
});
