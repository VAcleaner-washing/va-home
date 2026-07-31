import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set(["https://vahome.com.ua", "https://www.vahome.com.ua", "http://localhost", "http://localhost:4173", "http://127.0.0.1:4173"]);
function headers(origin: string) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://vahome.com.ua",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}
function json(origin: string, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}
Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") || "";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (!["GET", "POST"].includes(request.method)) return json(origin, { error: "METHOD_NOT_ALLOWED" }, 405);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(origin, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const tokenReady = Boolean(Deno.env.get("MONO_ACQUIRING_TOKEN"));
    if (!url || !service) return json(origin, { enabled: false, configured: false });
    const admin = createClient(url, service);
    const { data } = await admin.from("payment_settings").select("enabled,provider,test_mode").eq("id", "card_online").maybeSingle();
    return json(origin, {
      enabled: Boolean(data?.enabled && tokenReady),
      configured: tokenReady,
      provider: data?.provider || "monobank",
      test_mode: Boolean(data?.test_mode),
      label: "Оплата карткою онлайн",
    });
  } catch (_) {
    return json(origin, { enabled: false, configured: false });
  }
});
