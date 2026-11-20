import { allowedOrigin, getShopConfig, jsonResponse, serviceRpc, sha256 } from "../_shared/shop.ts";

function jsonBody(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    if (!allowedOrigin(request)) return new Response(null, { status: 403 });
    return new Response("ok", { status: 200, headers: {
      "Access-Control-Allow-Origin": request.headers.get("origin")!,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
    } });
  }
  if (request.method !== "POST" || !allowedOrigin(request)) return jsonResponse({ error: "not_found" }, 404);
  const origin = request.headers.get("origin")!;
  const config = getShopConfig();
  if (!config.serviceUrl || !config.serviceRoleKey) return jsonResponse({ error: "order_status_unavailable" }, 503, origin);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!(request.headers.get("content-type") ?? "").includes("application/json") || contentLength > 4000) {
    return jsonResponse({ error: "invalid_request" }, 400, origin);
  }
  let body: Record<string, unknown> | null;
  try {
    const raw = await request.text();
    if (raw.length > 4000) return jsonResponse({ error: "invalid_request" }, 413, origin);
    body = jsonBody(JSON.parse(raw));
  } catch { body = null; }
  const orderId = body && typeof body.orderId === "string" && /^[0-9a-f-]{36}$/i.test(body.orderId) ? body.orderId : "";
  const accessToken = body && typeof body.accessToken === "string" && /^[0-9a-f]{64}$/i.test(body.accessToken) ? body.accessToken.toLowerCase() : "";
  if (!orderId || !accessToken) return jsonResponse({ error: "order_not_found" }, 404, origin);
  try {
    const order = await serviceRpc(config, "corporate_get_shop_order_status", {
      p_order_id: orderId, p_token_hash: sha256(accessToken),
    });
    return jsonResponse(order, 200, origin);
  } catch {
    return jsonResponse({ error: "order_not_found" }, 404, origin);
  }
});
