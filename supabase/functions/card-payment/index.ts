import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://vahome.com.ua",
  "https://www.vahome.com.ua",
  "http://localhost",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const MONO_API_BASE = Deno.env.get("MONO_API_BASE") || "https://api.monobank.ua";
const MONO_TOKEN = Deno.env.get("MONO_ACQUIRING_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://vahome.com.ua",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}
function json(origin: string, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}
function text(value: unknown, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}
function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}
function safeEqual(left: string, right: string) {
  if (!left || !right || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}
function newToken() {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}
function publicStatus(status: string) {
  if (["paid", "failed", "expired", "refunded"].includes(status)) return status;
  return "pending";
}
function bearerToken(request: Request) {
  const value = request.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function monoStatus(invoiceId: string) {
  const response = await fetch(`${MONO_API_BASE}/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`, {
    headers: { "X-Token": MONO_TOKEN },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`MONO_STATUS_${response.status}`);
  return data as Record<string, unknown>;
}

async function createInvoice(order: Record<string, unknown>, returnToken: string, validity: number) {
  const orderNumber = text(order.client_order_id, 80);
  const amountMinor = Math.round(Number(order.total_amount || 0) * 100);
  const reference = `${orderNumber}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
  const redirect = new URL("https://vahome.com.ua/thank-you.html");
  redirect.searchParams.set("payment", "return");
  redirect.searchParams.set("order", orderNumber);
  redirect.searchParams.set("token", returnToken);

  const response = await fetch(`${MONO_API_BASE}/api/merchant/invoice/create`, {
    method: "POST",
    headers: { "X-Token": MONO_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: amountMinor,
      ccy: 980,
      merchantPaymInfo: {
        reference,
        destination: `Замовлення VA HOME ${orderNumber}`,
        comment: `Оплата замовлення ${orderNumber}`,
        customerEmails: order.customer_email ? [String(order.customer_email)] : [],
      },
      redirectUrl: redirect.toString(),
      webHookUrl: `${SUPABASE_URL}/functions/v1/mono-webhook`,
      validity,
      paymentType: "debit",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.invoiceId || !data?.pageUrl) {
    throw new Error(`MONO_CREATE_${response.status}`);
  }
  return {
    invoiceId: text(data.invoiceId, 120),
    pageUrl: text(data.pageUrl, 500),
    reference,
    amountMinor,
  };
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") || "";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== "POST") return json(origin, { error: "METHOD_NOT_ALLOWED" }, 405);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(origin, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (!MONO_TOKEN || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(origin, { error: "PAYMENT_SERVICE_NOT_CONFIGURED" }, 503);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = text(body.action, 20) || "status";
    const orderNumber = text(body.order_number, 80);
    const returnToken = text(body.token, 180);
    if (!orderNumber || !["status", "retry"].includes(action)) {
      return json(origin, { error: "INVALID_REQUEST" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,client_order_id,customer_email,customer_user_id,payment_method,payment_status,payment_invoice_id,payment_page_url,payment_return_token_hash,total_amount,items,status,payment_failure_reason,payment_error_code")
      .eq("client_order_id", orderNumber)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.payment_method !== "card_online") {
      return json(origin, { error: "ORDER_NOT_FOUND" }, 404);
    }

    let authorizedByReturnToken = false;
    if (returnToken && order.payment_return_token_hash) {
      authorizedByReturnToken = safeEqual(await sha256(returnToken), String(order.payment_return_token_hash));
    }

    let authorizedByAccount = false;
    const jwt = bearerToken(request);
    if (jwt && jwt !== SERVICE_ROLE_KEY) {
      const { data: authData } = await admin.auth.getUser(jwt);
      const user = authData?.user;
      if (user) {
        authorizedByAccount = Boolean(
          (order.customer_user_id && order.customer_user_id === user.id)
          || (user.email && String(order.customer_email || "").toLowerCase() === user.email.toLowerCase())
        );
      }
    }

    if (!authorizedByReturnToken && !authorizedByAccount) {
      return json(origin, { error: returnToken ? "INVALID_RETURN_TOKEN" : "AUTH_REQUIRED" }, 403);
    }

    if (action === "status") {
      if (order.payment_invoice_id && !["paid", "refunded"].includes(String(order.payment_status || ""))) {
        try {
          const providerPayload = await monoStatus(String(order.payment_invoice_id));
          const { error: applyError } = await admin.rpc("apply_monobank_payment_status", {
            p_invoice_id: text(providerPayload.invoiceId, 120),
            p_status: text(providerPayload.status, 40).toLowerCase(),
            p_amount_minor: Number(providerPayload.amount),
            p_currency: Number(providerPayload.ccy),
            p_reference: text(providerPayload.reference, 120),
            p_created_at: providerPayload.createdDate || null,
            p_modified_at: providerPayload.modifiedDate || providerPayload.createdDate || new Date().toISOString(),
            p_failure_reason: text(providerPayload.failureReason, 300) || null,
            p_error_code: text(providerPayload.errCode, 40) || null,
            p_payload: providerPayload,
          });
          if (applyError) throw applyError;
        } catch (error) {
          console.error("card-payment status sync", error instanceof Error ? error.message : String(error));
        }
      }

      const { data: fresh, error: freshError } = await admin
        .from("orders")
        .select("payment_status,payment_failure_reason,payment_error_code,status")
        .eq("id", order.id)
        .single();
      if (freshError) throw freshError;
      return json(origin, {
        ok: true,
        order_number: orderNumber,
        payment_status: publicStatus(String(fresh.payment_status || order.payment_status || "pending")),
        order_status: fresh.status || order.status,
        retryable: !["paid", "refunded"].includes(String(fresh.payment_status || order.payment_status || "")),
        failure_reason: fresh.payment_failure_reason || order.payment_failure_reason || null,
        error_code: fresh.payment_error_code || order.payment_error_code || null,
      });
    }

    if (order.payment_status === "paid") {
      return json(origin, { ok: true, order_number: orderNumber, payment_status: "paid", retryable: false });
    }

    const { data: settings, error: settingsError } = await admin
      .from("payment_settings")
      .select("enabled,invoice_validity_seconds")
      .eq("id", "card_online")
      .maybeSingle();
    if (settingsError) throw settingsError;
    if (!settings?.enabled) return json(origin, { error: "CARD_PAYMENT_DISABLED" }, 503);

    const { data: latestAttempt, error: attemptLookupError } = await admin
      .from("payment_attempts")
      .select("invoice_id,page_url,status,created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (attemptLookupError) throw attemptLookupError;

    const validity = Math.max(300, Math.min(2592000, Number(settings.invoice_validity_seconds || 3600)));
    const stillValid = latestAttempt?.page_url
      && !["success", "failure", "failed", "expired", "reversed", "refunded"].includes(String(latestAttempt.status || ""))
      && (Date.now() - new Date(latestAttempt.created_at).getTime()) < validity * 1000;
    if (stillValid) {
      return json(origin, {
        ok: true,
        order_number: orderNumber,
        payment_status: "pending",
        payment_url: latestAttempt.page_url,
      });
    }

    const rotatedToken = newToken();
    const invoice = await createInvoice(order, rotatedToken, validity);
    const rotatedHash = await sha256(rotatedToken);
    const now = new Date().toISOString();
    const { error: attemptError } = await admin.from("payment_attempts").insert({
      order_id: order.id,
      provider: "monobank",
      invoice_id: invoice.invoiceId,
      page_url: invoice.pageUrl,
      reference: invoice.reference,
      amount_minor: invoice.amountMinor,
      currency: 980,
      status: "created",
      provider_created_at: now,
      provider_modified_at: now,
    });
    if (attemptError) throw attemptError;

    const { error: updateError } = await admin.from("orders").update({
      payment_provider: "monobank",
      payment_invoice_id: invoice.invoiceId,
      payment_page_url: invoice.pageUrl,
      payment_amount_minor: invoice.amountMinor,
      payment_currency: 980,
      payment_created_at: now,
      payment_modified_at: now,
      payment_status: "pending",
      payment_return_token_hash: rotatedHash,
      payment_failure_reason: null,
      payment_error_code: null,
      status: "awaiting_payment",
    }).eq("id", order.id);
    if (updateError) throw updateError;

    return json(origin, {
      ok: true,
      order_number: orderNumber,
      payment_status: "pending",
      payment_url: invoice.pageUrl,
      return_token: rotatedToken,
    });
  } catch (error) {
    console.error("card-payment", error instanceof Error ? error.message : String(error));
    return json(origin, { error: "CARD_PAYMENT_FAILED" }, 500);
  }
});
