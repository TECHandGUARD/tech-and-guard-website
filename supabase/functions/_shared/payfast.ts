import { createHash, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

export type PayFastField = [string, string];

const paymentFieldOrder = [
  "merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url",
  "name_first", "name_last", "email_address", "cell_number", "m_payment_id",
  "amount", "item_name", "item_description", "custom_int1", "custom_str1",
];

export function payfastHost(mode: string) {
  if (mode === "sandbox") return "sandbox.payfast.co.za";
  if (mode === "live") return "www.payfast.co.za";
  throw new Error("Invalid PayFast mode.");
}

export function encodePayFastValue(value: string, trim = true) {
  return encodeURIComponent(trim ? value.trim() : value)
    .replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");
}

function parameterString(fields: PayFastField[], passphrase: string, trim = true) {
  const values = fields.filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodePayFastValue(value, trim)}`);
  if (passphrase) values.push(`passphrase=${encodePayFastValue(passphrase)}`);
  return values.join("&");
}

export function makePayFastFields(input: Record<string, string>, passphrase: string) {
  const fields = paymentFieldOrder
    .filter(key => Object.prototype.hasOwnProperty.call(input, key))
    .map(key => [key, input[key].trim()] as PayFastField);
  const signature = createHash("md5").update(parameterString(fields, passphrase), "utf8").digest("hex");
  return [...fields, ["signature", signature] as PayFastField];
}

export function verifyPayFastItn(fields: PayFastField[], passphrase: string) {
  const signatureIndex = fields.findIndex(([key]) => key === "signature");
  if (signatureIndex < 0 || signatureIndex !== fields.length - 1 || fields.some(([key], i) => key === "signature" && i !== signatureIndex)) return false;
  const received = fields[signatureIndex][1].toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(received)) return false;
  const payload = fields.slice(0, signatureIndex);
  const expected = createHash("md5").update(parameterString(payload, passphrase, false), "utf8").digest();
  const actual = Buffer.from(received, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function amountToCents(value: string) {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) return null;
  const [rand, cents = ""] = value.split(".");
  const amount = Number(rand) * 100 + Number(cents.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function parseItnBody(raw: string) {
  const params = new URLSearchParams(raw);
  const result: PayFastField[] = [];
  const seen = new Set<string>();
  for (const [key, value] of params) {
    if (seen.has(key)) throw new Error("Duplicate payment notification field.");
    seen.add(key);
    result.push([key, value]);
  }
  return result;
}

export function itnValidationBody(fields: PayFastField[]) {
  const signatureIndex = fields.findIndex(([key]) => key === "signature");
  if (signatureIndex < 0 || signatureIndex !== fields.length - 1) throw new Error("Invalid payment notification signature position.");
  const data = fields.slice(0, signatureIndex);
  return parameterString(data, "", false);
}

export function payfastSignature(fields: PayFastField[], passphrase: string) {
  return createHash("md5").update(parameterString(fields, passphrase), "utf8").digest("hex");
}
