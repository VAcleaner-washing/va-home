import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED = new Set(["https://vahome.com.ua", "https://www.vahome.com.ua"]);
const FULL_SIZE_IDS = new Set([
  "signature-relax", "forbidden-fruit", "doux-moment", "wild-berry-way", "hotel-spring",
  "evening-ritual", "velvet-spa", "pure-zen", "hotel-luxe", "old-money", "linstinct",
  "mineral-salt", "pure-imagination", "silk-molecule", "the-archive", "silent-temple",
  "moss-and-shadow", "dark-bloom"
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "https://vahome.com.ua",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" }
  });
}

function hasFullSize(items: unknown) {
  return (Array.isArray(items) ? items : []).some((item) => {
    if (!item || typeof item !== "object") return false;
    return FULL_SIZE_IDS.has(String((item as Record<string, unknown>).id || ""));
  });
}

function creditPayload(row: any) {
  const promo = Array.isArray(row?.promo_codes) ? row.promo_codes[0] : row?.promo_codes;
  return {
    id: row?.id || null,
    amount: Number(row?.amount || 100),
    status: row?.status || "active",
    issued_at: row?.issued_at || null,
    expires_at: row?.expires_at || null,
    used_at: row?.used_at || null,
    promo: promo ? {
      code: promo.code,
      usage_count: Number(promo.usage_count || 0),
      active: Boolean(promo.active),
      ends_at: promo.ends_at || null
    } : null
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "METHOD_NOT_ALLOWED" }, 405);
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED.has(origin)) return json(req, { error: "ORIGIN_NOT_ALLOWED" }, 403);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.id || !user.email) return json(req, { error: "UNAUTHORIZED" }, 401);

    const email = String(user.email).trim().toLowerCase();
    const admin = createClient(url, service);

    const { data: profile, error: profileError } = await admin
      .from("user_scent_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return json(req, { eligible: false, reason: "PROFILE_REQUIRED" }, 200);

    const existingSelect = "id,amount,status,issued_at,expires_at,used_at,promo_codes(code,usage_count,active,ends_at)";
    const { data: existing, error: existingError } = await admin
      .from("welcome_credits")
      .select(existingSelect)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return json(req, { eligible: true, created: false, credit: creditPayload(existing) });

    const [byUser, byEmail] = await Promise.all([
      admin.from("orders").select("id,status,items").eq("customer_user_id", user.id).neq("status", "cancelled"),
      admin.from("orders").select("id,status,items").eq("customer_email", email).neq("status", "cancelled")
    ]);
    if (byUser.error) throw byUser.error;
    if (byEmail.error) throw byEmail.error;
    const orders = [...(byUser.data || []), ...(byEmail.data || [])]
      .filter((order, index, rows) => rows.findIndex((candidate) => candidate.id === order.id) === index);
    if (orders.some((order) => hasFullSize(order.items))) {
      return json(req, { eligible: false, reason: "FULL_SIZE_PURCHASE_EXISTS" }, 200);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let promo: any = null;
    for (let attempt = 0; attempt < 4 && !promo; attempt += 1) {
      const code = `WELCOME-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
      const { data, error } = await admin.from("promo_codes").insert({
        code,
        name: "Welcome Credit після Personal Scent Profile",
        discount_type: "fixed",
        discount_value: 100,
        min_order_amount: 799,
        applies_to: "fragrances",
        product_ids: [],
        starts_at: now.toISOString(),
        ends_at: expires.toISOString(),
        usage_limit: 1,
        usage_count: 0,
        active: true,
        customer_email: email,
        campaign_type: "welcome_scent_profile"
      }).select("id,code,usage_count,active,ends_at").single();
      if (!error) promo = data;
      else if (error.code !== "23505") throw error;
    }
    if (!promo) throw new Error("WELCOME_CODE_COLLISION");

    const { data: credit, error: creditError } = await admin.from("welcome_credits").insert({
      user_id: user.id,
      customer_email: email,
      promo_code_id: promo.id,
      amount: 100,
      status: "active",
      issued_at: now.toISOString(),
      expires_at: expires.toISOString()
    }).select(existingSelect).single();

    if (creditError) {
      await admin.from("promo_codes").delete().eq("id", promo.id).eq("usage_count", 0);
      if (creditError.code === "23505") {
        const { data: raced, error: racedError } = await admin
          .from("welcome_credits")
          .select(existingSelect)
          .eq("user_id", user.id)
          .maybeSingle();
        if (racedError) throw racedError;
        if (raced) return json(req, { eligible: true, created: false, credit: creditPayload(raced) });
      }
      throw creditError;
    }

    return json(req, { eligible: true, created: true, credit: creditPayload(credit) }, 201);
  } catch (error) {
    console.error("issue-welcome-credit", error);
    return json(req, { error: error instanceof Error ? error.message : "WELCOME_CREDIT_FAILED" }, 500);
  }
});
