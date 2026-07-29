import { createServerFn } from "@tanstack/react-start";
import { requireAdminSession } from "./admin-gate.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const adminGetStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const sb = await admin();
  const [users, bulletins, subs, notif] = await Promise.all([
    sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("bulletins").select("id, created_at, category", { count: "exact" }),
    sb.from("subscriptions").select("status, plan", { count: "exact" }),
    sb.from("notifications").select("id", { count: "exact", head: true }),
  ]);

  const bulletinsData = bulletins.data ?? [];
  const byDay = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byHour = new Map<number, number>();
  for (const b of bulletinsData) {
    const d = new Date(b.created_at as string);
    const day = d.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const cat = (b.category as string) || "sem categoria";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
    const h = d.getHours();
    byHour.set(h, (byHour.get(h) ?? 0) + 1);
  }
  const dayArr = Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-14)
    .map(([day, count]) => ({ day: day.slice(5), count }));
  const catArr = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
  const hourArr = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}h`,
    count: byHour.get(h) ?? 0,
  }));

  const subsData = subs.data ?? [];
  const activeSubs = subsData.filter((s) => s.status === "active" || s.status === "trial").length;

  return {
    users: users.count ?? 0,
    bulletins: bulletins.count ?? 0,
    subscriptions: subsData.length,
    activeSubscriptions: activeSubs,
    notifications: notif.count ?? 0,
    byDay: dayArr,
    byCategory: catArr,
    byHour: hourArr,
  };
});

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator((d: { search?: string; filter?: "all" | "blocked" | "active" | "inactive" }) => d)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    const { data: profiles, error } = await sb
      .from("profiles")
      .select("id, email, full_name, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const { data: auth } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const authMap = new Map((auth?.users ?? []).map((u) => [u.id, u]));

    const { data: bulletinCounts } = await sb.from("bulletins").select("user_id");
    const countByUser = new Map<string, number>();
    for (const b of bulletinCounts ?? []) {
      const uid = b.user_id as string;
      countByUser.set(uid, (countByUser.get(uid) ?? 0) + 1);
    }

    const { data: subsAll } = await sb
      .from("subscriptions")
      .select("user_id, status, plan, current_period_end");
    const subByUser = new Map<string, { status: string; plan: string; end: string | null }>();
    for (const s of subsAll ?? [])
      subByUser.set(s.user_id as string, {
        status: s.status as string,
        plan: s.plan as string,
        end: (s.current_period_end as string) ?? null,
      });

    let rows = (profiles ?? []).map((p) => {
      const au = authMap.get(p.id);
      const banned = !!(au?.banned_until && new Date(au.banned_until).getTime() > Date.now());
      const sub = subByUser.get(p.id);
      const lastSignIn = au?.last_sign_in_at ?? null;
      const inactiveDays = lastSignIn
        ? Math.floor((Date.now() - new Date(lastSignIn).getTime()) / 86400000)
        : null;
      return {
        id: p.id,
        email: p.email ?? au?.email ?? "",
        full_name: p.full_name ?? "",
        created_at: p.created_at,
        last_sign_in_at: lastSignIn,
        blocked: banned,
        bulletins: countByUser.get(p.id) ?? 0,
        subscription: sub ?? null,
        inactive_days: inactiveDays,
      };
    });

    const q = (data.search ?? "").trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.email.toLowerCase().includes(q) || r.full_name.toLowerCase().includes(q));
    const f = data.filter ?? "all";
    if (f === "blocked") rows = rows.filter((r) => r.blocked);
    if (f === "active") rows = rows.filter((r) => !r.blocked && (r.inactive_days ?? 999) < 30);
    if (f === "inactive") rows = rows.filter((r) => !r.blocked && (r.inactive_days ?? 999) >= 30);

    return { users: rows };
  });

export const adminSetUserBlocked = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; blocked: boolean }) => d)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    const { error } = await sb.auth.admin.updateUserById(data.userId, {
      ban_duration: data.blocked ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    const { error } = await sb.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminSendNotification = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; body: string; type?: string }) => d)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    const { data: founder } = await sb
      .from("user_roles")
      .select("user_id")
      .eq("role", "fundador")
      .limit(1)
      .maybeSingle();
    const { error } = await sb.from("notifications").insert({
      title: data.title,
      body: data.body,
      category: data.type ?? "info",
      audience: "all",
      created_by: founder?.user_id ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminListCoupons = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const sb = await admin();
  const { data, error } = await sb
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { coupons: data ?? [] };
});

export const adminCreateCoupon = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      code: string;
      duration_months: number;
      max_uses: number;
      grants_lifetime: boolean;
      expires_at?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    const { data: founder } = await sb
      .from("user_roles")
      .select("user_id")
      .eq("role", "fundador")
      .limit(1)
      .maybeSingle();
    if (!founder?.user_id) throw new Error("Nenhum usuário fundador cadastrado para atribuir o cupom.");
    const { error } = await sb.from("coupons").insert({
      code: data.code.trim(),
      duration_months: data.duration_months,
      max_uses: data.max_uses,
      grants_lifetime: data.grants_lifetime,
      expires_at: data.expires_at || null,
      active: true,
      used_count: 0,
      created_by: founder.user_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminToggleCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; active: boolean }) => d)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    const { error } = await sb.from("coupons").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    // Remove resgates associados primeiro para não violar a FK
    const { error: redErr } = await sb.from("coupon_redemptions").delete().eq("coupon_id", data.id);
    if (redErr) throw new Error(redErr.message);
    const { error } = await sb.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminGrantSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; plan: "premium" | "vitalicio"; months?: number }) => d)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    const now = new Date();
    const end =
      data.plan === "vitalicio"
        ? new Date("2099-12-31T23:59:59Z")
        : new Date(now.getTime() + (data.months ?? 1) * 30 * 86400000);
    const { error } = await sb.from("subscriptions").upsert(
      {
        user_id: data.userId,
        status: "active",
        plan: data.plan,
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        canceled_at: null,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// =========================================================
// Pix payment requests — moderação pelo admin
// =========================================================

export const adminListPixRequests = createServerFn({ method: "POST" })
  .inputValidator((d: { status?: "aguardando_aprovacao" | "aprovado" | "rejeitado" | "cancelado" | "all" }) => d)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    const status = data.status ?? "aguardando_aprovacao";
    let q = sb
      .from("pix_payment_requests")
      .select("id, user_id, plan, amount_brl, status, user_email, created_at, decided_at, admin_note")
      .order("created_at", { ascending: false })
      .limit(500);
    if (status !== "all") q = q.eq("status", status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Enriquecer com nome do perfil
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id as string)));
    const nameMap = new Map<string, { name: string | null; email: string | null }>();
    if (ids.length > 0) {
      const { data: profs } = await sb
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      for (const p of profs ?? []) {
        nameMap.set(p.id as string, {
          name: (p.full_name as string) ?? null,
          email: (p.email as string) ?? null,
        });
      }
    }
    return {
      requests: (rows ?? []).map((r) => {
        const info = nameMap.get(r.user_id as string);
        return {
          ...r,
          full_name: info?.name ?? null,
          profile_email: info?.email ?? null,
        };
      }),
    };
  });

export const adminApprovePixRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { requestId: string }) => d)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    // Lê a solicitação para pegar plano/usuário
    const { data: req, error: readErr } = await sb
      .from("pix_payment_requests")
      .select("id, user_id, plan, status")
      .eq("id", data.requestId)
      .single();
    if (readErr) throw new Error(readErr.message);
    if (req.status !== "aguardando_aprovacao") {
      throw new Error("Esta solicitação já foi processada.");
    }
    const now = new Date();
    const days = req.plan === "mensal" ? 30 : 365;
    const end = new Date(now.getTime() + days * 86400000);

    // 1) Ativa/atualiza assinatura mantendo a maior data de validade
    const { data: existing } = await sb
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", req.user_id)
      .maybeSingle();
    const finalEnd =
      existing?.current_period_end && new Date(existing.current_period_end).getTime() > end.getTime()
        ? existing.current_period_end
        : end.toISOString();

    const { error: subErr } = await sb.from("subscriptions").upsert(
      {
        user_id: req.user_id,
        status: "active",
        plan: req.plan,
        current_period_start: now.toISOString(),
        current_period_end: finalEnd,
        payment_method: "pix",
        canceled_at: null,
      },
      { onConflict: "user_id" },
    );
    if (subErr) throw new Error(subErr.message);

    // 2) Marca a solicitação como aprovada
    const { error: updErr } = await sb
      .from("pix_payment_requests")
      .update({ status: "aprovado", decided_at: now.toISOString() })
      .eq("id", data.requestId);
    if (updErr) throw new Error(updErr.message);

    // 3) Notifica o usuário
    await sb.from("notifications").insert({
      title: "Assinatura ativada",
      body: `Seu pagamento do plano ${req.plan} foi confirmado. Bom trabalho!`,
      category: "info",
      audience: "user",
      target_user_id: req.user_id,
    });

    return { ok: true as const };
  });

export const adminRejectPixRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { requestId: string; reason?: string }) => d)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sb = await admin();
    const { data: req, error: readErr } = await sb
      .from("pix_payment_requests")
      .select("id, user_id, status")
      .eq("id", data.requestId)
      .single();
    if (readErr) throw new Error(readErr.message);
    if (req.status !== "aguardando_aprovacao") {
      throw new Error("Esta solicitação já foi processada.");
    }
    const { error } = await sb
      .from("pix_payment_requests")
      .update({
        status: "rejeitado",
        decided_at: new Date().toISOString(),
        admin_note: (data.reason ?? "").slice(0, 500) || null,
      })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);

    await sb.from("notifications").insert({
      title: "Pagamento não confirmado",
      body: `Não conseguimos confirmar seu Pix. Entre em contato pelo WhatsApp para regularizar. ${data.reason ? `Motivo: ${data.reason}` : ""}`.trim(),
      category: "warning",
      audience: "user",
      target_user_id: req.user_id,
    });
    return { ok: true as const };
  });
