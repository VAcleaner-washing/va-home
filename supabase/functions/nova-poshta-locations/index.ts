const ALLOWED_ORIGINS = new Set(["https://vahome.com.ua", "https://www.vahome.com.ua"]);
const API_URL = "https://api.novaposhta.ua/v2.0/json/";

function originAllowed(origin: string) {
  return ALLOWED_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": originAllowed(origin) ? origin : "https://vahome.com.ua",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "public, max-age=120" },
  });
}

function clean(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

async function novaPoshta(apiKey: string, modelName: string, calledMethod: string, methodProperties: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Nova Poshta HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload?.success) throw new Error("Nova Poshta API rejected request");
    return Array.isArray(payload.data) ? payload.data : [];
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "METHOD_NOT_ALLOWED" }, 405);
  const origin = req.headers.get("origin");
  if (origin && !originAllowed(origin)) return json(req, { error: "ORIGIN_NOT_ALLOWED" }, 403);

  const apiKey = Deno.env.get("NOVA_POSHTA_API_KEY");
  if (!apiKey) return json(req, { error: "SERVICE_NOT_CONFIGURED" }, 503);

  try {
    const body = await req.json();
    const action = clean(body.action, 20);
    const query = clean(body.query, 100);
    if (query.length < 2) return json(req, { items: [] });

    if (action === "cities") {
      const data = await novaPoshta(apiKey, "Address", "searchSettlements", { CityName: query, Limit: 20, Page: 1 });
      const addresses = data.flatMap((entry: Record<string, unknown>) => Array.isArray(entry.Addresses) ? entry.Addresses : []);
      const items = addresses.map((item: Record<string, unknown>) => ({
        ref: clean(item.DeliveryCity || item.Ref, 80),
        settlementRef: clean(item.Ref, 80),
        label: clean(item.Present, 220),
        city: clean(item.MainDescription, 120),
        area: clean(item.Area, 120),
      })).filter((item: { ref: string; label: string }) => item.ref && item.label);
      return json(req, { items });
    }

    if (action === "warehouses") {
      const cityRef = clean(body.city_ref, 80);
      if (!cityRef) return json(req, { error: "CITY_REQUIRED" }, 400);
      const data = await novaPoshta(apiKey, "Address", "getWarehouses", {
        CityRef: cityRef,
        FindByString: query,
        Limit: 30,
        Page: 1,
        Language: "UA",
      });
      const items = data.map((item: Record<string, unknown>) => ({
        ref: clean(item.Ref, 80),
        number: clean(item.Number, 30),
        label: clean(item.Description || item.ShortAddress, 240),
        shortAddress: clean(item.ShortAddress, 180),
        type: clean(item.TypeOfWarehouse, 80),
      })).filter((item: { ref: string; label: string }) => item.ref && item.label);
      return json(req, { items });
    }

    return json(req, { error: "INVALID_ACTION" }, 400);
  } catch (error) {
    console.error("Nova Poshta locations failed", error);
    return json(req, { error: "SERVICE_UNAVAILABLE" }, 502);
  }
});
