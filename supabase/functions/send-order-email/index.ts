const corsHeaders = {
  "Access-Control-Allow-Origin": "https://vahome.com.ua",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char] as string));
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString("uk-UA")} грн`;
}

async function sendEmail(apiKey: string, payload: Record<string, unknown>) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is missing");
    const order = await req.json();
    if (!order.client_order_id || !order.customer_email || !Array.isArray(order.items)) {
      return new Response(JSON.stringify({ error: "Invalid order" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rows = order.items.map((item: Record<string, unknown>) =>
      `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.name)} × ${escapeHtml(item.quantity)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(Number(item.line_total))}</td></tr>`
    ).join("");
    const purpose = `Оплата замовлення ${escapeHtml(order.client_order_id)}`;
    const isCod = order.payment_method === "cash_on_delivery";
    const paymentLabel = isCod ? "Оплата при отриманні" : "Оплата на рахунок";
    const common = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#171717"><h1 style="font-family:Georgia,serif;font-weight:400">VA HOME</h1><p>Замовлення <strong>${escapeHtml(order.client_order_id)}</strong></p><table style="width:100%;border-collapse:collapse">${rows}</table><p style="font-size:18px"><strong>Разом: ${money(Number(order.total_amount))}</strong></p>`;

    await Promise.all([
      sendEmail(resendKey, {
        from: "VA HOME <orders@vahome.com.ua>",
        to: ["vahome.aroma@gmail.com"],
        reply_to: order.customer_email,
        subject: `Нове замовлення ${order.client_order_id}`,
        html: `${common}<hr><p><strong>Клієнт:</strong> ${escapeHtml(order.customer_name)}</p><p>${escapeHtml(order.customer_phone)} · ${escapeHtml(order.customer_email)}</p><p>${escapeHtml(order.customer_city)}, ${escapeHtml(order.delivery_details)}</p><p><strong>Оплата:</strong> ${paymentLabel}</p><p>${escapeHtml(order.customer_comment || "Без коментаря")}</p></div>`,
      }),
      sendEmail(resendKey, {
        from: "VA HOME <orders@vahome.com.ua>",
        to: [order.customer_email],
        subject: `Ваше замовлення ${order.client_order_id} прийнято`,
        html: isCod ? `${common}<hr><h2 style="font-family:Georgia,serif;font-weight:400">Оплата при отриманні</h2><p>Ви сплатите замовлення у відділенні або поштоматі Нової пошти під час отримання.</p><p>Відправка протягом 1–2 робочих днів.</p></div>` : `${common}<hr><h2 style="font-family:Georgia,serif;font-weight:400">Реквізити для оплати</h2><p>Отримувач: ФОП Невідома Анна Сергіївна</p><p>IBAN: <strong>UA523220010000026006370119233</strong></p><p>Призначення: ${purpose}</p><p>Відправка Новою поштою протягом 1–2 робочих днів після підтвердження оплати.</p></div>`,
      }),
    ]);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Email delivery failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
