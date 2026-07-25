import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const MP_BASE = "https://api.mercadopago.com";

export function getMPAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago não configurado");
  return token;
}

export function getWebhookSecret(): string {
  return process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? "";
}

export function getPublishableSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function fetchMP(endpoint: string, options: RequestInit = {}) {
  const token = getMPAccessToken();
  const url = `${MP_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? text;
    throw new Error(`Mercado Pago erro ${res.status}: ${msg}`);
  }
  return data;
}

export function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "QAP-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getPlanDuration(plan: "monthly" | "yearly"): number {
  return plan === "yearly" ? 12 : 1;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function verifyWebhookSignature(body: string, signatureHeader: string | null): Promise<boolean> {
  const secret = getWebhookSecret();
  if (!secret || !signatureHeader) return true;
  try {
    const parts = signatureHeader.split(",");
    let ts = "";
    let hash = "";
    for (const part of parts) {
      const [k, v] = part.split("=");
      if (k.trim() === "ts") ts = v.trim();
      if (k.trim() === "v1") hash = v.trim();
    }
    if (!ts || !hash) return false;
    const payload = `${ts}.${body}`;
    const expected = await cryptoHmacHex(payload, secret);
    return timingSafeEqual(expected, hash);
  } catch {
    return false;
  }
}

async function cryptoHmacHex(payload: string, secret: string): Promise<string> {
  if (typeof crypto !== "undefined" && "subtle" in crypto) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return "";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function computeProratedCredit(
  plan: "monthly" | "yearly",
  paidAmount: number,
  periodStart: Date,
  periodEnd: Date,
  now: Date,
): number {
  if (now >= periodEnd) return 0;
  const totalMs = periodEnd.getTime() - periodStart.getTime();
  const remainingMs = periodEnd.getTime() - now.getTime();
  if (totalMs <= 0) return 0;
  return Math.round((paidAmount * (remainingMs / totalMs)) * 100) / 100;
}
