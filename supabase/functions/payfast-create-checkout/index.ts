import { amountToCents, makePayFastFields, payfastHost } from "../_shared/payfast.ts";
import { allowedOrigin, corsHeaders, getShopConfig, hashClientAddress, jsonResponse, serviceRpc, sha256 } from "../_shared/shop.ts";

function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function jsonBody(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    if (!allowedOrigin(request)) return new Response(null, { status: 403 });
    return new Response("ok", { headers: { ...corsHeaders(request.headers.get("origin")!), "Content-Type": "text/plain" } });
  }
  if (request.method !== "POST" || !allowedOrigin(request)) return jsonResponse({ error: "not_found" }, 404);
  const origin = request.headers.get("origin")!;
  const config = getShopConfig();
  if (!config.enabled) return jsonResponse({ error: "checkout_not_configured" }, 503, origin);
  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!contentType.includes("application/json") || contentLength > 20000) return jsonResponse({ error: "invalid_checkout" }, 400, origin);

  let body: Record<string, unknown> | null;
  try {
    const raw = await request.text();
    if (raw.length > 20000) return jsonResponse({ error: "invalid_checkout" }, 413, origin);
    body = jsonBody(JSON.parse(raw));
  } catch { body = null; }
  if (!body || cleanText(body.website, 100) !== "") return jsonResponse({ error: "invalid_checkout" }, 400, origin);
  if (body.acceptedTerms !== true) return jsonResponse({ error: "terms_required" }, 400, origin);
  if (!validUuid(body.checkoutKey) || !/^[a-f0-9]{64}$/i.test(cleanText(body.accessToken, 64))) {
    return jsonResponse({ error: "invalid_checkout" }, 400, origin);
  }

  const name = cleanText(body.name, 120);
  const email = cleanText(body.email, 254).toLowerCase();
  const phone = cleanText(body.phone, 32);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[0-9 ()-]{7,32}$/.test(phone)) {
    return jsonResponse({ error: "invalid_customer" }, 400, origin);
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 25) return jsonResponse({ error: "invalid_checkout" }, 400, origin);
  const items = body.items.map(value => {
    const entry = jsonBody(value);
    return entry ? { sku: cleanText(entry.sku, 160), quantity: entry.quantity } : null;
  });
  if (items.some(item => !item || !item.sku || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 99)) {
    return jsonResponse({ error: "invalid_checkout" }, 400, origin);
  }
  const method = body.fulfilmentMethod;
  if (method !== "collection" && method !== "delivery") return jsonResponse({ error: "invalid_checkout" }, 400, origin);
  if (method === "collection" && !config.collectionEnabled) return jsonResponse({ error: "fulfilment_unavailable" }, 400, origin);
  if (method === "delivery" && !config.deliveryEnabled) return jsonResponse({ error: "fulfilment_unavailable" }, 400, origin);
  let address: Record<string, string> = {};
  if (method === "delivery") {
    const raw = jsonBody(body.deliveryAddress);
    if (!raw) return jsonResponse({ error: "invalid_address" }, 400, origin);
    address = {
      line1: cleanText(raw.line1, 120),
      line2: cleanText(raw.line2, 120),
      town: cleanText(raw.town, 80),
      province: cleanText(raw.province, 80),
      postal_code: cleanText(raw.postalCode, 12),
    };
    if (!address.line1 || !address.town || !address.postal_code || !/^[-A-Za-z0-9 ]{3,12}$/.test(address.postal_code)) {
      return jsonResponse({ error: "invalid_address" }, 400, origin);
    }
  }

  const accessToken = cleanText(body.accessToken, 64).toLowerCase();
  const abuseSecret = Deno.env.get("SHOP_ABUSE_SECRET")!;
  const fulfilmentCents = method === "collection" ? 0 : config.deliveryFeeCents;
  const firstLast = name.split(/\s+/);
  const firstName = firstLast.shift() ?? name;
  const lastName = firstLast.join(" ").slice(0, 100);
  try {
    const order = await serviceRpc(config, "corporate_create_shop_order", {
      p_checkout_key: body.checkoutKey,
      p_token_hash: sha256(accessToken),
      p_ip_hash: hashClientAddress(request, abuseSecret),
      p_customer_name: name,
      p_email: email,
      p_phone: phone,
      p_fulfilment_method: method,
      p_delivery_address: address,
      p_fulfilment_cents: fulfilmentCents,
      p_terms_version: config.termsVersion,
      p_items: items,
    });
    const saved = jsonBody(order);
    if (!saved || !validUuid(saved.id) || typeof saved.total_cents !== "number" || saved.payment_status !== "pending") {
      return jsonResponse({ error: "order_not_payable" }, 409, origin);
    }
    if (new Date(String(saved.reservation_expires_at)).getTime() <= Date.now()) {
      return jsonResponse({ error: "reservation_expired" }, 409, origin);
    }
    const amount = (saved.total_cents / 100).toFixed(2);
    if (amountToCents(amount) !== saved.total_cents) return jsonResponse({ error: "invalid_total" }, 500, origin);
    const site = "https://www.techandguard.co.za";
    const paymentInput: Record<string, string> = {
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: `${site}/store/?payment=return&order=${saved.id}`,
      cancel_url: `${site}/store/?payment=cancelled&order=${saved.id}`,
      notify_url: `${config.serviceUrl}/functions/v1/payfast-itn`,
      name_first: firstName,
      name_last: lastName,
      email_address: email,
      cell_number: phone.replace(/[^+0-9]/g, ""),
      m_payment_id: String(saved.id),
      amount,
      item_name: `Tech & Guard order ${String(saved.id).slice(0, 8)}`,
      item_description: `Online store order (${Array.isArray(saved.items) ? saved.items.length : 0} products)`,
      custom_str1: config.mode,
    };
    const fields = makePayFastFields(paymentInput, config.passphrase);
    return jsonResponse({
      orderId: saved.id,
      totalCents: saved.total_cents,
      action: `https://${payfastHost(config.mode)}/eng/process`,
      fields: Object.fromEntries(fields),
    }, 200, origin);
  } catch (error) {
    const code = error instanceof Error ? error.message : "checkout_failed";
    const known = ["catalogue_changed", "checkout_rate_limit", "checkout_key_conflict", "invalid_shop_order"];
    return jsonResponse({ error: known.includes(code) ? code : "checkout_failed" }, code === "checkout_rate_limit" ? 429 : 400, origin);
  }
});
