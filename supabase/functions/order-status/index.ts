import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const ALLOWED_ORIGINS = new Set([
  "https://vahome.com.ua",
  "https://www.vahome.com.ua",
  "http://localhost",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://vahome.com.ua",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function json(origin: string, status: number, body: Record<string, unknown>, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), ...extra },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function rpc(name: string, payload: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${name}:${response.status}`);
  return data;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") || "";

  if (request.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return json(origin, 403, { error: "ORIGIN_NOT_ALLOWED" });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") return json(origin, 405, { error: "METHOD_NOT_ALLOWED" });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(origin, 403, { error: "ORIGIN_NOT_ALLOWED" });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(origin, 503, { error: "SERVICE_UNAVAILABLE" });

  const body = await request.json().catch(() => ({}));
  const orderNumber = String(body?.order_number || "").trim().toUpperCase();
  const phoneLast4 = String(body?.phone_last4 || "").replace(/\D/g, "");

  if (!/^[A-Z0-9-]{6,40}$/.test(orderNumber) || !/^\d{4}$/.test(phoneLast4)) {
    return json(origin, 400, { error: "INVALID_INPUT" });
  }

  const forwarded = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const ipHash = await sha256(`${forwarded}|${userAgent}`);

  try {
    const allowed = await rpc("consume_order_status_rate_limit", { p_ip_hash: ipHash });
    if (allowed !== true) {
      return json(origin, 429, { error: "TOO_MANY_ATTEMPTS" }, { "Retry-After": "900" });
    }

    const rows = await rpc("get_public_order_status", {
      p_order_number: orderNumber,
      p_phone_last4: phoneLast4,
    });

    return json(origin, 200, { order: Array.isArray(rows) && rows.length ? rows[0] : null });
  } catch (error) {
    console.error("order-status", error instanceof Error ? error.message : "unknown");
    return json(origin, 500, { error: "STATUS_LOOKUP_FAILED" });
  }
});
