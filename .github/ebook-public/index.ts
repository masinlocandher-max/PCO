const origins = new Set(["https://francinemariebautista.com", "https://www.francinemariebautista.com"]);
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    "Vary": "Origin",
  };
  const send = (body: unknown, code = 200) =>
    new Response(code === 204 ? null : JSON.stringify(body), {status: code, headers});
  if (!origins.has(origin)) return send({error:"forbidden"}, 403);
  headers["Access-Control-Allow-Origin"] = origin;
  headers["Access-Control-Allow-Headers"] = "content-type";
  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  if (req.method === "OPTIONS") return send(null, 204);
  if (req.method !== "POST") return send({error:"method_not_allowed"}, 405);
  if (Deno.env.get("BOOK_FREE_ONLINE") !== "on") return send({error:"unavailable"}, 503);
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return send({error:"invalid_request"}, 400);
  let input;
  try {
    const reader = req.body?.getReader();
    if (!reader) return send({error:"invalid_request"}, 400);
    const bytes = new Uint8Array(256);
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      if (part.value.length > bytes.length - length) {
        await reader.cancel();
        return send({error:"invalid_request"}, 400);
      }
      bytes.set(part.value, length);
      length += part.value.length;
    }
    input = JSON.parse(new TextDecoder().decode(bytes.subarray(0, length)));
  } catch { return send({error:"invalid_request"}, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return send({error:"invalid_request"}, 400);
  const { action, sequence } = input;
  if (!((action === "contents" && sequence === undefined) ||
    (action === "chapter" && Number.isInteger(sequence) && sequence > 0 && sequence <= 10000))) return send({error:"invalid_request"}, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return send({error:"unavailable"}, 503);
  try {
    const response = await fetch(url + "/rest/v1/rpc/book_free_online_reader", {
      method:"POST", headers:{ "Content-Type":"application/json", apikey:key, Authorization:"Bearer " + key },
      body:JSON.stringify({ p_action:action, p_sequence:sequence ?? null }), signal:AbortSignal.timeout(8000),
    });
    if (!response.ok) return send({error:"unavailable"}, 503);
    const data = await response.json();
    return data === null ? send({error:action === "chapter" ? "not_found" : "unavailable"}, action === "chapter" ? 404 : 503) : send(data);
  } catch { return send({error:"unavailable"}, 503); }
});
