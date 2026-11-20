import { allowedOrigin, corsHeaders, hashClientAddress, jsonResponse } from "../_shared/shop.ts";

const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const inbox = "info@techandguard.co.za";

function failure(origin: string, status: number, code: string) {
  return jsonResponse({ sent: false, configured: status !== 503, code }, status, origin);
}

async function rpc(serviceUrl: string, key: string, name: string, body: unknown) {
  const response = await fetch(`${serviceUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : null; } catch { throw new Error("database_response_invalid"); }
  if (!response.ok) throw new Error("database_request_failed");
  return data;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  if (request.method === "OPTIONS") {
    if (!allowedOrigin(request)) return new Response(null, { status: 403 });
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (!allowedOrigin(request)) return jsonResponse({ sent: false, configured: true, code: "origin_not_allowed" }, 403);
  if (request.method !== "POST") return failure(origin, 405, "method_not_allowed");
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") ?? "")) {
    return failure(origin, 415, "json_required");
  }

  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim() ?? "";
  const serviceUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!resendKey || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(serviceUrl) || serviceRoleKey.length < 32) {
    return jsonResponse({ sent: false, configured: false, code: "notification_not_configured" }, 503, origin);
  }
  let raw: string;
  try { raw = await request.text(); } catch { return failure(origin, 400, "invalid_json"); }
  if (new TextEncoder().encode(raw).byteLength > 2048) return failure(origin, 413, "request_too_large");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return failure(origin, 400, "invalid_json"); }
  if (!input || typeof input !== "object" || !("id" in input) || !("email" in input)) {
    return failure(origin, 400, "invalid_request");
  }
  const { id, email } = input as { id: unknown; email: unknown };
  if (typeof id !== "string" || !validId.test(id) || typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return failure(origin, 400, "invalid_request");
  }

  const ipHash = await hashClientAddress(request, serviceRoleKey);
  let claim: Record<string, unknown>;
  try {
    const result = await rpc(serviceUrl, serviceRoleKey, "corporate_claim_enquiry_notification", {
      p_id: id,
      p_email: email.trim().toLowerCase(),
      p_ip_hash: ipHash,
    });
    if (!result || typeof result !== "object") throw new Error("claim_invalid");
    claim = result as Record<string, unknown>;
  } catch {
    return failure(origin, 404, "enquiry_not_available");
  }

  if (claim.status === "sent") return jsonResponse({ sent: true, configured: true, alreadySent: true }, 200, origin);
  if (claim.status !== "sending" || claim.already_sending === true || claim.rate_limited === true || claim.attempt_limit === true) {
    return jsonResponse({ sent: false, configured: true, status: claim.status ?? "unavailable" }, 200, origin);
  }

  const items = Array.isArray(claim.items) ? claim.items.map((item) => {
    if (!item || typeof item !== "object") return "";
    const row = item as Record<string, unknown>;
    return `${String(row.quantity ?? 1)} × ${String(row.title ?? row.sku ?? "Product")}`;
  }).filter(Boolean) : [];
  const text = [
    "A new customer enquiry was submitted on techandguard.co.za.",
    "",
    `Reference: ${id}`,
    `Type: ${String(claim.kind ?? "enquiry")}`,
    `Name: ${String(claim.customer_name ?? "")}`,
    `Email: ${String(claim.email ?? "")}`,
    `Topic: ${String(claim.topic ?? "")}`,
    "",
    "Message:",
    String(claim.message ?? ""),
    ...(items.length ? ["", "Products:", ...items] : []),
  ].join("\n");

  let sent = false;
  let errorCode = "provider_unavailable";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `enquiry-notification/${id}`,
      },
      body: JSON.stringify({
        from: "Tech & GUARD Enquiries <enquiries@auth.techandguard.co.za>",
        to: [inbox],
        reply_to: String(claim.email ?? ""),
        subject: `New ${claim.kind === "product" ? "product" : "service"} enquiry · ${id.slice(0, 8)}`,
        text,
      }),
    });
    if (response.ok) {
      const result = await response.json().catch(() => null);
      sent = !!result && typeof result === "object" && typeof result.id === "string";
    } else if (response.status === 403 || response.status === 422) {
      errorCode = "sender_configuration_error";
    } else if (response.status === 429) {
      errorCode = "provider_rate_limited";
    }
  } catch {
    errorCode = "provider_unavailable";
  }

  try {
    await rpc(serviceUrl, serviceRoleKey, "corporate_complete_enquiry_notification", {
      p_id: id,
      p_sent: sent,
      p_error_code: sent ? null : errorCode,
    });
  } catch {
    // A provider idempotency key protects the next retry if the database update fails.
  }
  return sent
    ? jsonResponse({ sent: true, configured: true }, 200, origin)
    : jsonResponse({ sent: false, configured: true, code: "notification_send_failed" }, 200, origin);
});
