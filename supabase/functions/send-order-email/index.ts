// VA HOME v5.5: deprecated for security.
// Initial order emails are now created inside create-order from server-validated
// and saved database data. Deploy this stub once to close the legacy endpoint.
const headers = {
  "Access-Control-Allow-Origin": "https://vahome.com.ua",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  return new Response(JSON.stringify({ error: "This endpoint has been replaced by create-order" }), { status: 410, headers });
});
