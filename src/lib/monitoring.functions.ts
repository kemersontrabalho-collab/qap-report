import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminSession } from "./admin-gate.server";

const listInputSchema = z
  .object({
    category: z.enum(["frontend", "server_function", "security", "performance", "all"]).default("all"),
    severity: z.enum(["info", "warning", "error", "critical", "all"]).default("all"),
    onlyUnresolved: z.boolean().default(false),
    limit: z.number().int().min(1).max(200).default(100),
  })
  .default({});

export const adminListErrorLogs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listInputSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("error_logs")
      .select("id, created_at, category, severity, message, stack, route, user_id, metadata, user_agent, resolved")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.category !== "all") q = q.eq("category", data.category);
    if (data.severity !== "all") q = q.eq("severity", data.severity);
    if (data.onlyUnresolved) q = q.eq("resolved", false);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminGetErrorStats = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("error_logs")
    .select("category, severity, resolved, created_at")
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const total = rows.length;
  const critical = rows.filter((r) => r.severity === "critical" && !r.resolved).length;
  const unresolved = rows.filter((r) => !r.resolved).length;
  const byCategory: Record<string, number> = {};
  for (const r of rows) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  return { total, critical, unresolved, byCategory };
});

export const adminResolveErrorLog = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), resolved: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("error_logs")
      .update({ resolved: data.resolved })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminClearResolvedLogs = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("error_logs").delete().eq("resolved", true);
  if (error) throw new Error(error.message);
  return { ok: true };
});
