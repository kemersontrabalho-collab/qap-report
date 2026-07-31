import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  audience: "all" | "user";
  target_user_id: string | null;
  category: string;
  created_by: string | null;
  created_at: string;
  read: boolean;
};

const LIST_LIMIT = 50;

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: NotificationRow[]; unread: number }> => {
    const { supabase, userId } = context;
    // FIX crítico: filtrar por audiência (broadcast) OU destinatário específico.
    // Antes retornava as últimas 50 notificações do sistema inteiro, vazando
    // mensagens de suporte e notificações direcionadas para todos os usuários.
    const { data: notifs, error } = await supabase
      .from("notifications")
      .select("id, title, body, audience, target_user_id, category, created_by, created_at")
      .or(`audience.eq.all,target_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
    if (error) throw new Error(error.message);
    const ids = (notifs ?? []).map((n) => n.id);
    let readSet = new Set<string>();
    if (ids.length) {
      const { data: reads } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", userId)
        .in("notification_id", ids);
      readSet = new Set((reads ?? []).map((r) => r.notification_id));
    }
    const items: NotificationRow[] = (notifs ?? []).map((n) => ({
      ...n,
      audience: n.audience as NotificationRow["audience"],
      read: readSet.has(n.id),
    }));
    return { items, unread: items.filter((i) => !i.read).length };
  });

const markInput = z.object({ ids: z.array(z.string().uuid()).optional() });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => markInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let ids = data.ids;
    if (!ids || ids.length === 0) {
      // "Marcar todas" deve escopar exatamente na mesma consulta do listNotifications.
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id")
        .or(`audience.eq.all,target_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT);
      ids = (notifs ?? []).map((n) => n.id);
    }
    if (!ids.length) return { ok: true };
    const rows = ids.map((id) => ({ notification_id: id, user_id: userId }));
    const { error } = await supabase
      .from("notification_reads")
      .upsert(rows, { onConflict: "notification_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const sendInput = z.object({
  title: z.string().min(1).max(140),
  body: z.string().min(1).max(2000),
  audience: z.enum(["all", "user"]),
  target_user_id: z.string().uuid().nullable().optional(),
});

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.audience === "user" && !data.target_user_id) {
      throw new Error("Selecione um usuário-alvo.");
    }
    const { error } = await supabase.from("notifications").insert({
      title: data.title,
      body: data.body,
      audience: data.audience,
      target_user_id: data.audience === "user" ? data.target_user_id : null,
      category: "admin",
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const delInput = z.object({ id: z.string().uuid() });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => delInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notifications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
