import { amountToCents, itnValidationBody, parseItnBody, payfastHost, verifyPayFastItn } from "../_shared/payfast.ts";
import { getShopConfig, serviceRpc } from "../_shared/shop.ts";

function value(fields: Array<[string, string]>, key: string) {
  return fields.find(([name]) => name === key)?.[1] ?? "";
}

function plain(message: string, status = 200) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return plain("Method not allowed", 405);
  const config = getShopConfig();
  if (!/^\d{8}$/.test(config.merchantId) || config.passphrase.length < 8
      || !config.serviceUrl || !config.serviceRoleKey) return plain("Payment notification service is not configured", 503);
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/x-www-form-urlencoded")) return plain("Invalid notification", 400);

  let fields: Array<[string, string]>;
  try {
    const raw = await request.text();
    if (raw.length > 20000) return plain("Notification too large", 413);
    fields = parseItnBody(raw);
  } catch {
    return plain("Invalid notification", 400);
  }
  if (!verifyPayFastItn(fields, config.passphrase)) return plain("Invalid signature", 400);
  const expectedHost = payfastHost(config.mode);
  if (value(fields, "merchant_id") !== config.merchantId || value(fields, "custom_str1") !== config.mode) {
    return plain("Merchant mismatch", 400);
  }
  const orderId = value(fields, "m_payment_id");
  const paymentId = value(fields, "pf_payment_id");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return plain("Invalid order reference", 400);

  let verification: Response;
  try {
    verification = await fetch(`https://${expectedHost}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: itnValidationBody(fields),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return plain("Payment validation temporarily unavailable", 503);
  }
  if (!verification.ok || (await verification.text()).trim() !== "VALID") return plain("PayFast did not validate notification", 400);

  const status = value(fields, "payment_status");
  if (status === "CANCELLED") {
    try {
      await serviceRpc(config, "corporate_fail_shop_payment", {
        p_order_id: orderId, p_provider_payment_id: paymentId || null, p_reason: "PayFast reported cancelled",
      });
      return plain("OK");
    } catch {
      return plain("Could not record cancellation", 503);
    }
  }
  if (status !== "COMPLETE" || !paymentId) return plain("Unsupported payment status", 400);
  const amountCents = amountToCents(value(fields, "amount_gross"));
  if (amountCents === null) return plain("Invalid payment amount", 400);
  try {
    await serviceRpc(config, "corporate_confirm_shop_payment", {
      p_order_id: orderId,
      p_provider_payment_id: paymentId,
      p_amount_cents: amountCents,
    });
    return plain("OK");
  } catch {
    // A verified payment can need manual inventory/refund review. Retry only database failures.
    return plain("Could not record verified payment", 503);
  }
});
