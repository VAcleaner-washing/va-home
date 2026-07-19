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
        const orderIdEscaped = escapeHtml(order.client_order_id);
        const cod = paymentMethod === "cash_on_delivery";

        // Рендеринг списку товарів для листа адміністратора (Темна тема)
        const rowsForAdmin = items.map(item => `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #262626; font-size: 14px; color: #E5E5E5; line-height: 1.5;">
              <strong style="color: #FFFFFF;">${escapeHtml(item.name)}</strong> × ${item.quantity}
              ${item.selections.length ? `<br><small style="color: #A3A3A3; font-size: 12px;">Аромати: ${item.selections.map(escapeHtml).join(" · ")}</small>` : ""}
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #262626; text-align: right; font-size: 14px; color: #FFFFFF; font-weight: 500; white-space: nowrap;">
              ${money(item.line_total)}
            </td>
          </tr>
        `).join("");

        // Рендеринг списку товарів для листа клієнта (Світла преміум тема)
        const rowsForClient = items.map(item => `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #E5E5E5; font-size: 15px; color: #404040; line-height: 1.5;">
              <span style="color: #171717; font-weight: 500;">${escapeHtml(item.name)}</span>
              <span style="color: #737373; font-size: 14px; margin-left: 4px;">(×${item.quantity})</span>
              ${item.selections.length ? `<br><small style="color: #737373; font-size: 12px; display: inline-block; margin-top: 4px;">Обрані аромати: ${item.selections.map(escapeHtml).join(" · ")}</small>` : ""}
            </td>
            <td style="padding: 16px 0; border-bottom: 1px solid #E5E5E5; text-align: right; font-size: 15px; color: #171717; font-weight: 500; white-space: nowrap;">
              ${money(item.line_total)}
            </td>
          </tr>
        `).join("");

        // ДИЗАЙН 1: Лист для адміністратора (Глибокий преміальний темний)
        const adminHtml = `
          <div style="background-color: #050505; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0D0D0D; margin: 0 auto; border: 1px solid #1F1F1F; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
              <tr>
                <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #1F1F1F;">
                  <div style="font-family: 'Georgia', serif; font-size: 22px; letter-spacing: 3px; color: #FFFFFF; text-transform: uppercase;">VA HOME</div>
                  <div style="font-size: 11px; letter-spacing: 2px; color: #C8A27C; margin-top: 4px; text-transform: uppercase; font-weight: 500;">Нове замовлення</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <p style="font-size: 15px; color: #A3A3A3; margin: 0 0 24px 0;">Номер замовлення: <strong style="color: #FFFFFF; font-family: monospace; font-size: 16px;">${orderIdEscaped}</strong></p>
                  
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                    ${rowsForAdmin}
                    <tr>
                      <td style="padding: 24px 0 0 0; font-size: 16px; color: #A3A3A3;">Всього до сплати:</td>
                      <td style="padding: 24px 0 0 0; text-align: right; font-size: 20px; color: #C8A27C; font-weight: 600; font-family: 'Georgia', serif;">${money(total)}</td>
                    </tr>
                  </table>

                  <div style="background-color: #141414; border: 1px solid #262626; border-radius: 4px; padding: 20px; margin-top: 32px;">
                    <h3 style="font-family: 'Georgia', serif; font-size: 15px; color: #C8A27C; margin: 0 0 16px 0; font-weight: normal; letter-spacing: 1px; text-transform: uppercase;">Дані доставки та покупця</h3>
                    <p style="font-size: 14px; color: #E5E5E5; margin: 0 0 10px 0; line-height: 1.5;"><strong style="color: #A3A3A3;">Клієнт:</strong> ${escapeHtml(name)}</p>
                    <p style="font-size: 14px; color: #E5E5E5; margin: 0 0 10px 0; line-height: 1.5;"><strong style="color: #A3A3A3;">Телефон:</strong> <a href="tel:${phone}" style="color: #C8A27C; text-decoration: none;">${escapeHtml(phone)}</a></p>
                    <p style="font-size: 14px; color: #E5E5E5; margin: 0 0 10px 0; line-height: 1.5;"><strong style="color: #A3A3A3;">Email:</strong> ${escapeHtml(email)}</p>
                    <p style="font-size: 14px; color: #E5E5E5; margin: 0 0 10px 0; line-height: 1.5;"><strong style="color: #A3A3A3;">Адреса:</strong> м. ${escapeHtml(city)}, ${escapeHtml(deliveryDetails)}</p>
                    <p style="font-size: 14px; color: #E5E5E5; margin: 0 0 10px 0; line-height: 1.5;"><strong style="color: #A3A3A3;">Тип оплати:</strong> ${cod ? "При отриманні (накладений платіж)" : "Предоплата на рахунок ФОП"}</p>
                    <p style="font-size: 14px; color: #E5E5E5; margin: 0; line-height: 1.5;"><strong style="color: #A3A3A3;">Коментар:</strong> ${escapeHtml(comment || "Не вказано")}</p>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        `;

        // ДИЗАЙН 2: Лист для клієнта (Елегантний світлий нішевий дизайн)
        const clientPaymentBlock = cod 
          ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F5F4F0; border-radius: 3px; border: 1px solid #EAE8E2;">
              <tr>
                <td style="padding: 24px;">
                  <h2 style="font-family: 'Georgia', serif; font-size: 18px; color: #171717; margin: 0 0 12px 0; font-weight: normal; letter-spacing: 0.5px;">Оплата при отриманні</h2>
                  <p style="font-size: 14px; margin: 0 0 8px 0; color: #525252; line-height: 1.6;">Ви зможете розрахуватися за посилку у відділенні або поштоматі Нової пошти при отриманні.</p>
                  <p style="font-size: 13px; margin: 0; color: #737373; font-style: italic;">Термін відправки: протягом 1–2 робочих днів.</p>
                </td>
              </tr>
            </table>`
          : `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FBF9F6; border-radius: 3px; border: 1px solid #C8A27C;">
              <tr>
                <td style="padding: 24px;">
                  <h2 style="font-family: 'Georgia', serif; font-size: 18px; color: #171717; margin: 0 0 16px 0; font-weight: normal; letter-spacing: 0.5px;">Реквізити для оплати замовлення</h2>
                  <p style="font-size: 14px; margin: 0 0 12px 0; color: #404040; line-height: 1.5;"><strong style="color: #171717;">Отримувач:</strong><br>ФОП Невідома Анна Сергіївна</p>
                  <p style="font-size: 14px; margin: 0 0 12px 0; color: #404040; line-height: 1.5;"><strong style="color: #171717;">IBAN рахунок:</strong><br><span style="font-family: monospace; font-size: 14px; background: #EAE8E2; padding: 4px 8px; display: inline-block; margin-top: 4px; border-radius: 2px; letter-spacing: 0.5px; color: #171717;">UA523220010000026006370119233</span></p>
                  <p style="font-size: 14px; margin: 0 0 16px 0; color: #404040; line-height: 1.5;"><strong style="color: #171717;">Призначення платежу:</strong><br>Оплата замовлення ${orderIdEscaped}</p>
                  <div style="font-size: 13px; color: #737373; line-height: 1.5; border-top: 1px solid #EAE8E2; padding-top: 12px;">
                    Будь ласка, надішліть квитанцію про оплату в наш Instagram або менеджеру. Відправка здійснюється протягом 1–2 робочих днів після зарахування коштів.
                  </div>
                </td>
              </tr>
            </table>`;

        const clientHtml = `
          <div style="background-color: #F9F8F6; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #FFFFFF; margin: 0 auto; border: 1px solid #E5E5E5; border-radius: 2px;">
              <tr>
                <td align="center" style="padding: 40px 24px 32px 24px; border-bottom: 1px solid #F5F5F5;">
                  <div style="font-family: 'Georgia', serif; font-size: 26px; letter-spacing: 5px; color: #171717; font-weight: normal; text-transform: uppercase;">VA HOME</div>
                  <div style="font-size: 9px; letter-spacing: 3px; color: #C8A27C; margin-top: 6px; text-transform: uppercase; font-weight: 500;">invisible luxury atmosphere</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 32px 48px 32px;">
                  <h1 style="font-family: 'Georgia', serif; font-size: 24px; line-height: 1.4; color: #171717; margin: 0 0 16px 0; font-weight: normal;">Дякуємо за ваше замовлення</h1>
                  <p style="font-size: 15px; line-height: 1.6; color: #525252; margin: 0 0 32px 0;">Вітаємо! Ми успішно прийняли ваше замовлення <strong style="color: #171717;">${orderIdEscaped}</strong> та вже готуємо його до підтвердження.</p>
                  
                  <h3 style="font-size: 12px; letter-spacing: 1.5px; color: #737373; text-transform: uppercase; margin: 0 0 12px 0; font-weight: 600; border-bottom: 1px solid #171717; padding-bottom: 6px;">Перелік обраного</h3>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                    ${rowsForClient}
                    <tr>
                      <td style="padding: 20px 0 0 0; font-size: 15px; color: #525252; font-weight: 500;">Разом до сплати:</td>
                      <td style="padding: 20px 0 0 0; text-align: right; font-size: 18px; color: #171717; font-weight: 600; font-family: 'Georgia', serif;">${money(total)}</td>
                    </tr>
                  </table>

                  <div style="margin-top: 40px; margin-bottom: 32px;">
                    ${clientPaymentBlock}
                  </div>

                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #E5E5E5; padding-top: 24px; margin-top: 40px;">
                    <tr>
                      <td align="center" style="font-size: 13px; color: #A3A3A3; line-height: 1.5;">
                        Якщо у вас виникли запитання, зв'яжіться з нами за номером<br>
                        <a href="tel:+380953919569" style="color: #171717; text-decoration: none; font-weight: 500;">+38 (095) 391-95-69</a> або в Instagram.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `;

        await Promise.all([
          sendEmail(resendKey, { from: "VA HOME <orders@vahome.com.ua>", to: ["vahome.aroma@gmail.com"], reply_to: email, subject: `Нове замовлення ${order.client_order_id}`, html: adminHtml }),
          sendEmail(resendKey, { from: "VA HOME <orders@vahome.com.ua>", to: [email], reply_to: "vahome.aroma@gmail.com", subject: `Ваше замовлення ${order.client_order_id} прийнято`, html: clientHtml }),
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