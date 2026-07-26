import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CODE_REGEX = /^[A-Z0-9-]{4,32}$/;

function generateCode(prefix = "QAP"): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}-${s.slice(0, 5)}-${s.slice(5)}`;
}

async function assertFounder(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "fundador" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito ao criador do aplicativo.");
}

// ---------- Founder: create a lifetime code ----------
const createInput = z.object({
  note: z.string().trim().max(120).optional().or(z.literal("")),
  maxUses: z.number().int().min(1).max(1000).default(1),
  expiresInDays: z.number().int().min(1).max(3650).optional().nullable(),
  customCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CODE_REGEX, "Use 4-32 caracteres A-Z, 0-9 ou -")
    .optional()
    .or(z.literal("")),
});

export const createLifetimeCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertFounder(supabase, userId);

    const code = data.customCode && data.customCode.length > 0 ? data.customCode : generateCode();
    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400_000).toISOString()
      : null;

    const { data: row, error } = await supabase
      .from("coupons")
      .insert({
        code,
        duration_months: 1, // placeholder; ignored when grants_lifetime = true
        grants_lifetime: true,
        max_uses: data.maxUses,
        expires_at: expiresAt,
        note: data.note || null,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Founder: list generated codes ----------
export const listMyCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertFounder(supabase, userId);
    const { data, error } = await supabase
      .from("coupons")
      .select("id, code, note, grants_lifetime, duration_months, max_uses, used_count, expires_at, active, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Founder: toggle / delete ----------
const toggleInput = z.object({ id: z.string().uuid(), active: z.boolean() });
export const setCouponActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertFounder(supabase, userId);
    const { error } = await supabase
      .from("coupons")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const deleteInput = z.object({ id: z.string().uuid() });
export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertFounder(supabase, userId);
    const { error } = await supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Any user: redeem ----------
const redeemInput = z.object({
  code: z.string().trim().min(3).max(40),
});
export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => redeemInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("redeem_coupon", { _code: data.code });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; grants_lifetime: boolean; duration_months: number };
  });

// ---------- Check if current user is founder (for UI gating) ----------
export const amIFounder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "fundador" });
    if (error) return false;
    return Boolean(data);
  });
