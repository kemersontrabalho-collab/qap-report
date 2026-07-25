import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertFounder(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "fundador",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito ao Fundador.");
}

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  bulletin_count: number;
  is_founder: boolean;
};

export const isFounder = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const auth = req.headers.get("authorization");
    if (!auth) return { founder: false };
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return { founder: false };
    const { data } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "fundador" });
    return { founder: Boolean(data) };
  } catch {
    return { founder: false };
  }
});

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ users: AdminUserRow[]; stats: { totalUsers: number; activeUsers30d: number; totalBulletins: number } }> => {
    await assertFounder(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // list all users (paginate up to a reasonable amount)
    const allUsers: any[] = [];
    let page = 1;
    const perPage = 200;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      allUsers.push(...(data.users ?? []));
      if (!data.users || data.users.length < perPage) break;
      page++;
      if (page > 25) break;
    }

    const ids = allUsers.map((u) => u.id);
    const [{ data: profiles }, { data: counts }, { data: founders }, { count: totalBulletins }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name").in("id", ids),
      supabaseAdmin
        .from("bulletins")
        .select("user_id")
        .in("user_id", ids)
        .is("deleted_at", null),
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "fundador"),
      supabaseAdmin.from("bulletins").select("*", { count: "exact", head: true }),
    ]);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name as string | null]));
    const founderSet = new Set((founders ?? []).map((f: any) => f.user_id as string));
    const countMap = new Map<string, number>();
    (counts ?? []).forEach((r: any) => {
      countMap.set(r.user_id, (countMap.get(r.user_id) ?? 0) + 1);
    });

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let activeUsers30d = 0;

    const users: AdminUserRow[] = allUsers.map((u) => {
      const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
      if (last >= cutoff) activeUsers30d++;
      return {
        id: u.id,
        email: u.email ?? null,
        full_name: profileMap.get(u.id) ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        banned_until: (u as any).banned_until ?? null,
        bulletin_count: countMap.get(u.id) ?? 0,
        is_founder: founderSet.has(u.id),
      };
    });

    users.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

    return {
      users,
      stats: {
        totalUsers: allUsers.length,
        activeUsers30d,
        totalBulletins: totalBulletins ?? 0,
      },
    };
  });

const banInput = z.object({ userId: z.string().uuid(), block: z.boolean() });

export const adminSetUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => banInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertFounder(context);
    if (data.userId === context.userId) throw new Error("O Fundador não pode alterar o próprio status.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.block ? "876000h" : "none",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const delInput = z.object({ userId: z.string().uuid() });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => delInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertFounder(context);
    if (data.userId === context.userId) throw new Error("O Fundador não pode excluir a própria conta aqui.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Atômico: apagar auth.users primeiro (dispara cascades por FK). Se falhar,
    // nenhum dado de app é perdido. Depois faz limpeza best-effort para FKs
    // que porventura não estejam com ON DELETE CASCADE.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("bulletins").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    return { ok: true };
  });

