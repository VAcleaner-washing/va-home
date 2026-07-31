import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createVerify } from "node:crypto";
import { Buffer } from "node:buffer";

const API = Deno.env.get("MONO_API_BASE") || "https://api.monobank.ua";
const TOKEN = Deno.env.get("MONO_ACQUIRING_TOKEN") || "";
const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
let cachedPem = "";
function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function text(value: unknown, max = 300) { return String(value ?? "").trim().slice(0, max); }
async function publicKey(force = false) {
  if (cachedPem && !force) return cachedPem;
  const r = await fetch(`${API}/api/merchant/pubkey`, { headers: { "X-Token": TOKEN } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data?.key) throw new Error(`PUBKEY_${r.status}`);
  cachedPem = Buffer.from(String(data.key), "base64").toString("utf8");
  return cachedPem;
}
async function signatureValid(raw: string, xSign: string) {
  for (let i = 0; i < 2; i += 1) {
    const verify = createVerify("SHA256");
    verify.update(raw); verify.end();
    if (verify.verify(await publicKey(i === 1), Buffer.from(xSign, "base64"))) return true;
    cachedPem = "";
  }
  return false;
}
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!TOKEN || !URL || !SERVICE) return response({ error: "PAYMENT_SERVICE_NOT_CONFIGURED" }, 503);
  const raw = await request.text();
  const xSign = request.headers.get("x-sign") || "";
  if (!xSign) return response({ error: "SIGNATURE_REQUIRED" }, 401);
  try {
    if (!await signatureValid(raw, xSign)) return response({ error: "INVALID_SIGNATURE" }, 401);
    const payload = JSON.parse(raw);
    const invoiceId = text(payload.invoiceId, 120);
    const status = text(payload.status, 40).toLowerCase();
    const amount = Number(payload.amount), currency = Number(payload.ccy);
    const reference = text(payload.reference, 120);
    if (!invoiceId || !status || !Number.isInteger(amount) || !Number.isInteger(currency) || !reference) return response({ error: "INVALID_PAYLOAD" }, 400);
    const admin = createClient(URL, SERVICE);
    const { data, error } = await admin.rpc("apply_monobank_payment_status", {
      p_invoice_id: invoiceId, p_status: status, p_amount_minor: amount, p_currency: currency,
      p_reference: reference, p_created_at: payload.createdDate || null,
      p_modified_at: payload.modifiedDate || payload.createdDate || new Date().toISOString(),
      p_failure_reason: text(payload.failureReason, 300) || null,
      p_error_code: text(payload.errCode, 40) || null,
      p_payload: payload,
    });
    if (error) throw error;
    const result = (data || {}) as Record<string, unknown>;
    if (result.reason === "INVOICE_NOT_FOUND") return response({ error: "INVOICE_NOT_READY" }, 409);
    if (result.notify_paid === true && result.client_order_id) {
      await fetch(`${URL}/functions/v1/send-status-email`, {
        method: "POST",
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ client_order_id: result.client_order_id }),
      }).catch(() => null);
    }
    return response({ ok: true, applied: result.applied === true });
  } catch (error) {
    console.error("mono-webhook", error instanceof Error ? error.message : String(error));
    return response({ error: "WEBHOOK_PROCESSING_FAILED" }, 500);
  }
});
