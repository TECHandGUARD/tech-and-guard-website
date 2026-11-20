import { createHmac, createHash } from "node:crypto";

export const siteOrigin = "https://www.techandguard.co.za";

export type ShopConfig = {
  enabled: boolean;
  mode: "sandbox" | "live";
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  serviceUrl: string;
  serviceRoleKey: string;
  termsVersion: string;
  termsUrl: string;
  returnsUrl: string;
  deliveryPolicyUrl: string;
  collectionEnabled: boolean;
  collectionLabel: string;
  collectionDetails: string;
  deliveryEnabled: boolean;
  deliveryFeeCents: number;
  currency: "ZAR";
};

function urlValue(name: string) {
  const value = Deno.env.get(name)?.trim() ?? "";
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === siteOrigin ? url.href : "";
  } catch {
    return "";
  }
}

export function getShopConfig(): ShopConfig {
  const mode = Deno.env.get("PAYFAST_MODE") === "live" ? "live" : "sandbox";
  const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID")?.trim() ?? "";
  const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY")?.trim() ?? "";
  const passphrase = Deno.env.get("PAYFAST_PASSPHRASE")?.trim() ?? "";
  const serviceUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  const abuseSecret = Deno.env.get("SHOP_ABUSE_SECRET")?.trim() ?? "";
  const termsVersion = Deno.env.get("STORE_TERMS_VERSION")?.trim() ?? "";
  const termsUrl = urlValue("STORE_TERMS_URL");
  const returnsUrl = urlValue("STORE_RETURNS_URL");
  const deliveryPolicyUrl = urlValue("STORE_DELIVERY_POLICY_URL");
  const collectionEnabled = Deno.env.get("STORE_COLLECTION_ENABLED") === "true";
  const deliveryEnabled = Deno.env.get("STORE_DELIVERY_ENABLED") === "true";
  const feeRaw = Deno.env.get("STORE_DELIVERY_FEE_CENTS") ?? "";
  const deliveryFeeCents = /^\d{1,7}$/.test(feeRaw) ? Number(feeRaw) : -1;
  const hasShippingRule = (collectionEnabled || deliveryEnabled)
    && (!deliveryEnabled || deliveryFeeCents >= 0);
  const liveExplicitlyEnabled = mode !== "live" || Deno.env.get("STORE_ALLOW_LIVE_PAYMENTS") === "true";
  const enabled = Deno.env.get("STORE_CHECKOUT_ENABLED") === "true"
    && /^\d{8}$/.test(merchantId) && merchantKey.length >= 8 && passphrase.length >= 8
    && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(serviceUrl) && serviceRoleKey.length >= 32
    && abuseSecret.length >= 32 && termsVersion.length > 0 && !!termsUrl && !!returnsUrl
    && !!deliveryPolicyUrl && hasShippingRule && liveExplicitlyEnabled;
  return {
    enabled,
    mode,
    merchantId,
    merchantKey,
    passphrase,
    serviceUrl,
    serviceRoleKey,
    termsVersion,
    termsUrl,
    returnsUrl,
    deliveryPolicyUrl,
    collectionEnabled,
    collectionLabel: Deno.env.get("STORE_COLLECTION_LABEL")?.trim() || "Collection",
    collectionDetails: Deno.env.get("STORE_COLLECTION_DETAILS")?.trim() || "",
    deliveryEnabled,
    deliveryFeeCents,
    currency: "ZAR",
  };
}

export function publicShopConfig(config: ShopConfig) {
  return {
    enabled: config.enabled,
    mode: config.mode,
    currency: config.currency,
    fulfilment: {
      collection: config.collectionEnabled ? {
        label: config.collectionLabel,
        details: config.collectionDetails,
        feeCents: 0,
      } : null,
      delivery: config.deliveryEnabled ? {
        label: "Courier delivery",
        feeCents: config.deliveryFeeCents,
      } : null,
    },
    policies: config.enabled ? {
      termsUrl: config.termsUrl,
      returnsUrl: config.returnsUrl,
      deliveryUrl: config.deliveryPolicyUrl,
      termsVersion: config.termsVersion,
    } : null,
  };
}

export function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configured = Deno.env.get("SHOP_ALLOWED_ORIGINS")?.split(",").map(x => x.trim()).filter(Boolean) ?? [];
  return !!origin && new Set([siteOrigin, ...configured]).has(origin);
}

export function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}

export function jsonResponse(value: unknown, status = 200, origin = siteOrigin) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashClientAddress(request: Request, secret: string) {
  const address = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  return createHmac("sha256", secret).update(address).digest("hex");
}

export async function serviceRpc(config: ShopConfig, name: string, body: unknown) {
  const response = await fetch(`${config.serviceUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "apikey": config.serviceRoleKey,
      "Authorization": `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let data: unknown;
  try { data = raw ? JSON.parse(raw) : null; } catch { throw new Error("Store database returned an invalid response."); }
  if (!response.ok) {
    const code = data && typeof data === "object" && "message" in data ? String(data.message) : "store_error";
    throw new Error(code);
  }
  return data;
}
