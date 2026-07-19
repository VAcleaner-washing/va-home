import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set(["https://vahome.com.ua", "https://www.vahome.com.ua"]);
function originAllowed(origin: string) {
  return ALLOWED_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
const PRODUCTS: Record<string, { name: string; price: number }> = {
  "signature-relax": { name: "Signature Relax", price: 799 },
  "forbidden-fruit": { name: "Forbidden Fruit", price: 799 },
  "doux-moment": { name: "DOUX Moment", price: 799 },
  "wild-berry-way": { name: "Wild Berry Way", price: 799 },
  "hotel-spring": { name: "Hotel Spring", price: 799 },
  "evening-ritual": { name: "Evening Ritual", price: 899 },
  "velvet-spa": { name: "Velvet Spa", price: 899 },
  "pure-zen": { name: "Pure Zen", price: 899 },
  "hotel-luxe": { name: "Hotel Luxe", price: 899 },
  "old-money": { name: "Old Money", price: 999 },
  "linstinct": { name: "L’INSTINCT", price: 999 },
  "mineral-salt": { name: "Mineral Salt", price: 999 },
  "pure-imagination": { name: "Pure Imagination", price: 1199 },
  "silk-molecule": { name: "Silk Molecule", price: 1199 },
  "the-archive": { name: "The Archive", price: 1199 },
  "silent-temple": { name: "Silent Temple", price: 1199 },
  "moss-and-shadow": { name: "Moss & Shadow", price: 1199 },
  "dark-bloom": { name: "Dark Bloom", price: 1199 },
  "discovery-6": { name: "Discovery Set — 6 ароматів", price: 150 },
  // Legacy ID is kept so existing carts remain valid; the complete set now contains 18 scents.
  "discovery-17": { name: "Discovery Set — 18 ароматів", price: 450 },
};
const FRAGRANCE_IDS = Object.keys(PRODUCTS).filter(id => !id.startsWith("discovery-"));

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": originAllowed(origin) ? origin : "https://vahome.com.ua",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(req: Request, body: unknown, status = 200) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const responseBody = body && typeof body === "object" && "error" in body
    ? { ...(body as Record<string, unknown>), request_id: requestId }
    : body;
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", "X-Request-ID": requestId },
  });
}

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]!));
}

function money(value: number) {
  return `${value.toLocaleString("uk-UA")} грн`;
}

async function sendEmail(apiKey: string, payload: Record<string, unknown>) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
}

async function validateNovaPoshtaSelection(cityRef: string, warehouseRef: string) {
  const apiKey = Deno.env.get("NOVA_POSHTA_API_KEY");
  if (!apiKey) throw new Error("NOVA_POSHTA_NOT_CONFIGURED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://api.novaposhta.ua/v2.0/json/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        modelName: "Address",
        calledMethod: "getWarehouses",
        methodProperties: { Ref: warehouseRef, CityRef: cityRef, Limit: 1, Page: 1, Language: "UA" },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("NOVA_POSHTA_UNAVAILABLE");
    const payload = await response.json();
    if (!payload?.success) throw new Error("NOVA_POSHTA_UNAVAILABLE");
    return Array.isArray(payload.data) && payload.data.some((item: Record<string, unknown>) =>
      text(item.Ref, 80) === warehouseRef && text(item.CityRef, 80) === cityRef
    );
  } catch (error) {
    console.error("Nova Poshta validation failed", error);
    throw new Error("NOVA_POSHTA_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async req => {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && !originAllowed(origin)) return json(req, { error: "Origin not allowed" }, 403);

  try {
    const body = await req.json();
    const checkoutRequestId = text(body.checkout_request_id, 80);
    const name = text(body.customer_name, 100);
    let phone = text(body.customer_phone, 30).replace(/[\s()\-]/g, "");
    if (/^0\d{9}$/.test(phone)) phone = `+38${phone}`;
    if (/^380\d{9}$/.test(phone)) phone = `+${phone}`;
    const email = text(body.customer_email, 160).toLowerCase();
    const city = text(body.customer_city, 120);
    const novaPoshtaCityRef = text(body.nova_poshta_city_ref, 80) || null;
    const novaPoshtaSettlementRef = text(body.nova_poshta_settlement_ref, 80) || null;
    const novaPoshtaWarehouseRef = text(body.nova_poshta_warehouse_ref, 80) || null;
    const deliveryMethod = text(body.delivery_method, 40);
    const deliveryDetails = text(body.delivery_details, 200);
    const paymentMethod = text(body.payment_method, 30);
    const comment = text(body.customer_comment, 1000) || null;
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (name.length < 2 || !/^\+?380\d{9}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(req, { error: "INVALID_CONTACTS" }, 400);
    }
    if (!city || !deliveryDetails || deliveryMethod !== "nova_poshta") return json(req, { error: "INVALID_DELIVERY" }, 400);
    if (Boolean(novaPoshtaCityRef) !== Boolean(novaPoshtaWarehouseRef)) return json(req, { error: "INVALID_DELIVERY" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limit: max 5 orders per phone number within a 10-minute window.
    // Uses only the existing customer_phone/created_at columns — no migration required.
    const rateLimitSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentOrders, error: rateLimitError } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", phone)
      .gte("created_at", rateLimitSince);
    if (rateLimitError) throw rateLimitError;
    if ((recentOrders || 0) >= 5) return json(req, { error: "RATE_LIMITED" }, 429);

    if (novaPoshtaCityRef && novaPoshtaWarehouseRef) {
      const validDelivery = await validateNovaPoshtaSelection(novaPoshtaCityRef, novaPoshtaWarehouseRef);
      if (!validDelivery) return json(req, { error: "INVALID_DELIVERY" }, 400);
    }
    if (!["bank_transfer", "cash_on_delivery"].includes(paymentMethod)) return json(req, { error: "INVALID_PAYMENT" }, 400);
    if (rawItems.length < 1 || rawItems.length > 30) return json(req, { error: "INVALID_ITEMS" }, 400);

    const items = rawItems.map((raw: Record<string, unknown>) => {
      const id = text(raw.id, 80);
      const product = PRODUCTS[id];
      const quantity = Math.trunc(Number(raw.quantity));
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error("INVALID_ITEM");
      const requested = Array.isArray(raw.selections) ? raw.selections.map(value => text(value, 80)) : [];
      if (id === "discovery-6") {
        if (quantity !== 1) throw new Error("INVALID_DISCOVERY_SELECTION");
        const unique = [...new Set(requested)];
        if (unique.length !== 6 || unique.some(selection => !FRAGRANCE_IDS.includes(selection))) throw new Error("INVALID_DISCOVERY_SELECTION");
        return { id, name: product.name, quantity, unit_price: product.price, line_total: product.price * quantity, selection_ids: unique, selections: unique.map(selection => PRODUCTS[selection].name) };
      }
      return { id, name: product.name, quantity, unit_price: product.price, line_total: product.price * quantity, selections: [] };
    });
    const total = items.reduce((sum, item) => sum + item.line_total, 0);
    if (total <= 0) return json(req, { error: "INVALID_TOTAL" }, 400);

    if (checkoutRequestId) {
      const { data: existing, error: existingError } = await supabase
        .from("orders")
        .select("client_order_id,customer_name,customer_email,payment_method,items,total_amount,confirmation_email_status")
        .eq("checkout_request_id", checkoutRequestId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        return json(req, {
          order: {
            client_order_id: existing.client_order_id,
            customer_name: existing.customer_name,
            customer_email: existing.customer_email,
            payment_method: existing.payment_method,
            items: existing.items,
            total_amount: existing.total_amount,
          },
          email_status: existing.confirmation_email_status || "pending",
          duplicate_prevented: true,
        }, 200);
      }
    }
    let order: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      const stamp = new Date().toISOString().slice(2, 10).replaceAll("-", "");
      const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
      const payload = {
        client_order_id: `VA-${stamp}-${suffix}`,
        checkout_request_id: checkoutRequestId || null,
        customer_name: name, customer_phone: phone, customer_email: email,
        customer_city: city, delivery_method: "Нова пошта", delivery_details: deliveryDetails,
        nova_poshta_city_ref: novaPoshtaCityRef,
        nova_poshta_settlement_ref: novaPoshtaSettlementRef,
        nova_poshta_warehouse_ref: novaPoshtaWarehouseRef,
        payment_method: paymentMethod, customer_comment: comment,
        items, total_amount: total, status: "new", payment_status: "unpaid", source: "website",
      };
      const { data, error } = await supabase.from("orders").insert(payload).select("*").single();
      if (!error) order = data;
      else if (error.code !== "23505") throw error;
    }
    if (!order) throw new Error("ORDER_ID_COLLISION");

    let emailStatus = "pending";
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        const rows = items.map(item => `<tr><td style="padding:8px 0;border-bottom:1px solid #332b20">${escapeHtml(item.name)} × ${item.quantity}${item.selections.length ? `<br><small style="color:#b9aa96">Обрано: ${item.selections.map(escapeHtml).join(" · ")}</small>` : ""}</td><td style="padding:8px 0;border-bottom:1px solid #332b20;text-align:right">${money(item.line_total)}</td></tr>`).join("");
        const common = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px;background:#0a0908;color:#eee6db"><h1 style="font-family:Georgia,serif;font-weight:400">VA HOME</h1><p>Замовлення <strong>${escapeHtml(order.client_order_id)}</strong></p><table style="width:100%;border-collapse:collapse">${rows}</table><p style="font-size:18px"><strong>Разом: ${money(total)}</strong></p>`;
        const cod = paymentMethod === "cash_on_delivery";
        await Promise.all([
          sendEmail(resendKey, { from: "VA HOME <orders@vahome.com.ua>", to: ["vahome.aroma@gmail.com"], reply_to: email, subject: `Нове замовлення ${order.client_order_id}`, html: `${common}<hr><p>${escapeHtml(name)} · ${escapeHtml(phone)} · ${escapeHtml(email)}</p><p>${escapeHtml(city)}, ${escapeHtml(deliveryDetails)}</p><p><strong>Оплата:</strong> ${cod ? "при отриманні" : "на рахунок"}</p><p>${escapeHtml(comment || "Без коментаря")}</p></div>` }),
          sendEmail(resendKey, { from: "VA HOME <orders@vahome.com.ua>", to: [email], reply_to: "vahome.aroma@gmail.com", subject: `Ваше замовлення ${order.client_order_id} прийнято`, html: cod ? `${common}<hr><h2 style="font-family:Georgia,serif;font-weight:400">Оплата при отриманні</h2><p>Ви сплатите замовлення у відділенні або поштоматі Нової пошти під час отримання.</p><p>Відправка протягом 1–2 робочих днів.</p></div>` : `${common}<hr><h2 style="font-family:Georgia,serif;font-weight:400">Реквізити для оплати</h2><p>Отримувач: ФОП Невідома Анна Сергіївна</p><p>IBAN: <strong>UA523220010000026006370119233</strong></p><p>Призначення: Оплата замовлення ${escapeHtml(order.client_order_id)}</p><p>Відправка протягом 1–2 робочих днів після підтвердження оплати.</p></div>` }),
        ]);
        emailStatus = "sent";
      } catch (emailError) {
        console.error("Email failed", emailError);
        emailStatus = "failed";
      }
    }
    await supabase.from("orders").update({ confirmation_email_status: emailStatus }).eq("id", order.id);
    return json(req, { order: { client_order_id: order.client_order_id, customer_name: name, customer_email: email, payment_method: paymentMethod, items, total_amount: total }, email_status: emailStatus }, 201);
  } catch (error) {
    console.error("create-order failed", {
      requestId,
      message: error instanceof Error ? error.message : String(error),
      code: error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code || "") : "",
    });
    const validationErrors = new Set(["INVALID_ITEM", "INVALID_DISCOVERY_SELECTION"]);
    const serviceErrors = new Set(["NOVA_POSHTA_NOT_CONFIGURED", "NOVA_POSHTA_UNAVAILABLE"]);
    const message = error instanceof Error ? error.message : "";
    const code = validationErrors.has(message) ? message : serviceErrors.has(message) ? "DELIVERY_VALIDATION_UNAVAILABLE" : "ORDER_CREATION_FAILED";
    return json(req, { error: code }, code === "DELIVERY_VALIDATION_UNAVAILABLE" ? 503 : code === "ORDER_CREATION_FAILED" ? 500 : 400);
  }
});
