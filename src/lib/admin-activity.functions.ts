import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminSession } from "./admin-gate.server";

export const listAdminActivity = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [list, count] = await Promise.all([
    supabaseAdmin.from("admin_activity_notifications").select("*").order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("admin_activity_notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  if (list.error || count.error) throw new Error("Não foi possível carregar os avisos.");
  return { items: list.data ?? [], unread: count.count ?? 0 };
});

export const markAdminActivityRead = createServerFn({ method: "POST" })
  .inputValidator((data: { id?: string }) => z.object({ id: z.string().uuid().optional() }).parse(data))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("admin_activity_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (data.id) query = query.eq("id", data.id);
    const { error } = await query;
    if (error) throw new Error("Não foi possível marcar o aviso como lido.");
    return { ok: true };
  });