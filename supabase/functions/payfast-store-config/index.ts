import { allowedOrigin, corsHeaders, getShopConfig, publicShopConfig } from "../_shared/shop.ts";

Deno.serve((request: Request) => {
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin") ?? "null";
    if (!allowedOrigin(request)) return new Response(null, { status: 403 });
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (request.method !== "POST" || !allowedOrigin(request)) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: request.method === "POST" ? 403 : 404,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  const origin = request.headers.get("origin")!;
  return new Response(JSON.stringify(publicShopConfig(getShopConfig())), {
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
