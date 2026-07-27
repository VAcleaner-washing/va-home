import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function page(title: string, text: string, success = true) {
  return new Response(`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} · VA HOME</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#F4F1ED;color:#171513;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:24px;box-sizing:border-box"><main style="width:min(520px,100%);background:#fff;border:1px solid #E1D8CE;padding:48px 34px;text-align:center"><div style="font-family:Georgia,serif;font-size:27px;letter-spacing:5px;margin-bottom:34px">VA HOME</div><div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9B7C58;margin-bottom:14px">${success ? "Preferences updated" : "Unable to update"}</div><h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:1.25;margin:0 0 17px">${title}</h1><p style="font-size:15px;line-height:1.7;color:#625A53;margin:0 0 28px">${text}</p><a href="https://vahome.com.ua" style="display:inline-block;background:#171513;color:#fff;text-decoration:none;padding:14px 24px;font-size:13px;letter-spacing:.7px">Повернутися на VA HOME</a></main></body></html>`, {
    status: success ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

Deno.serve(async req => {
  if (!["GET", "POST"].includes(req.method)) return page("Метод не підтримується", "Спробуйте відкрити посилання з листа ще раз.", false);
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || (req.method === "POST" ? String((await req.json().catch(() => ({})))?.token || "") : "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return page("Посилання недійсне", "Не вдалося знайти налаштування розсилки. Перевірте, чи посилання скопійовано повністю.", false);
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: preference, error } = await admin.from("marketing_preferences").select("email,subscribed").eq("unsubscribe_token", token).maybeSingle();
  if (error || !preference) return page("Посилання недійсне", "Не вдалося знайти налаштування розсилки.", false);
  const now = new Date().toISOString();
  if (preference.subscribed) {
    await admin.from("marketing_preferences").update({ subscribed: false, unsubscribed_at: now, updated_at: now }).eq("unsubscribe_token", token);
    await admin.from("repeat_purchase_campaigns").update({ status: "skipped", last_error: "UNSUBSCRIBED", updated_at: now }).eq("customer_email", preference.email).in("status", ["pending", "failed"]);
  }
  return page("Ви відписалися", "Персональні пропозиції VA HOME більше не надходитимуть на цей email. Сервісні листи про ваші замовлення залишаться без змін.");
});
