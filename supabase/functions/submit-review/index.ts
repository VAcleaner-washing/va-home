import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set(["https://vahome.com.ua", "https://www.vahome.com.ua"]);
const PRODUCT_IDS = new Set([
  "signature-relax", "forbidden-fruit", "doux-moment", "wild-berry-way", "hotel-spring",
  "evening-ritual", "velvet-spa", "pure-zen", "hotel-luxe", "old-money", "linstinct",
  "mineral-salt", "pure-imagination", "silk-molecule", "the-archive", "silent-temple",
  "moss-and-shadow", "dark-bloom"
]);

function originAllowed(origin: string) {
  return ALLOWED_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": originAllowed(origin) ? origin : "https://vahome.com.ua",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}
function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max);
}
const PHOTO_TYPES: Record<string,string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "METHOD_NOT_ALLOWED" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && !originAllowed(origin)) return json(req, { error: "ORIGIN_NOT_ALLOWED" }, 403);

  try {
    const body = await req.json();
    const productSlug = clean(body.product_slug, 80);
    const customerName = clean(body.customer_name, 50);
    const reviewText = clean(body.review_text, 1000);
    const rating = Math.trunc(Number(body.rating));
    const photoData = body.photo_data ? String(body.photo_data) : "";
    const photoType = body.photo_type ? String(body.photo_type) : "";
    if (!PRODUCT_IDS.has(productSlug)) return json(req, { error: "INVALID_PRODUCT" }, 400);
    if (customerName.length < 2 || customerName.length > 50) return json(req, { error: "INVALID_NAME" }, 400);
    if (reviewText.length < 10 || reviewText.length > 1000) return json(req, { error: "INVALID_REVIEW" }, 400);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json(req, { error: "INVALID_RATING" }, 400);
    if (photoData && (!PHOTO_TYPES[photoType] || photoData.length > 2_850_000 || !/^[A-Za-z0-9+/=]+$/.test(photoData))) return json(req, { error: "INVALID_PHOTO" }, 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let user: { id: string; email?: string; emailConfirmed?: boolean } | null = null;
    if (bearer && bearer !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data } = await service.auth.getUser(bearer);
      if (data.user) user = {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: Boolean(data.user.email_confirmed_at)
      };
    }

    const forwarded = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const fingerprint = await sha256(`${Deno.env.get("REVIEW_RATE_LIMIT_SECRET") || "vahome-review"}:${forwarded}`);
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await service.from("reviews").select("id", { count: "exact", head: true })
      .eq("submission_fingerprint", fingerprint).gte("created_at", since);
    if ((count || 0) >= 2) return json(req, { error: "RATE_LIMITED" }, 429);

    let verifiedPurchase = false;
    let emailHash: string | null = null;
    if (user?.email && user.emailConfirmed) {
      const email = user.email.toLowerCase();
      emailHash = await sha256(email);
      const { count: previousReviews } = await service.from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id)
        .eq("product_slug", productSlug)
        .in("status", ["pending", "approved"]);
      if ((previousReviews || 0) > 0) return json(req, { error: "REVIEW_ALREADY_EXISTS" }, 409);

      const [linkedResult, emailResult] = await Promise.all([
        service.from("orders").select("items,status").eq("customer_user_id", user.id).in("status", ["paid", "shipped", "completed"]).limit(100),
        service.from("orders").select("items,status").ilike("customer_email", email).in("status", ["paid", "shipped", "completed"]).limit(100)
      ]);
      const orders = [...(linkedResult.data || []), ...(emailResult.data || [])];
      verifiedPurchase = orders.some(order => Array.isArray(order.items) && order.items.some((item: Record<string, unknown>) => {
        const selections = [item.selection_ids, item.selections, item.selectionIds]
          .find(value => Array.isArray(value)) as unknown[] | undefined;
        return item.id === productSlug || Boolean(selections?.includes(productSlug));
      }));
    }

    let photoUrl: string | null = null;
    let photoPath: string | null = null;
    if (photoData) {
      const bytes = Uint8Array.from(atob(photoData), c => c.charCodeAt(0));
      if (bytes.byteLength > 2 * 1024 * 1024) return json(req, { error: "PHOTO_TOO_LARGE" }, 400);
      photoPath = `${productSlug}/${crypto.randomUUID()}.${PHOTO_TYPES[photoType]}`;
      const uploaded = await service.storage.from("review-photos").upload(photoPath, bytes, { contentType: photoType, upsert: false });
      if (uploaded.error) throw uploaded.error;
      photoUrl = service.storage.from("review-photos").getPublicUrl(photoPath).data.publicUrl;
    }

    const { error } = await service.from("reviews").insert({
      product_slug: productSlug,
      customer_name: customerName,
      rating,
      review_text: reviewText,
      status: "pending",
      verified_purchase: verifiedPurchase,
      created_by: user?.id || null,
      reviewer_email_hash: emailHash,
      submission_fingerprint: fingerprint,
      photo_url: photoUrl
    });
    if (error) {
      if (photoPath) await service.storage.from("review-photos").remove([photoPath]);
      throw error;
    }
    return json(req, { ok: true, verified_purchase: verifiedPurchase }, 201);
  } catch (error) {
    console.error(error);
    return json(req, { error: "REVIEW_SUBMISSION_FAILED" }, 500);
  }
});
