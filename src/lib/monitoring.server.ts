import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ErrorCategory = "frontend" | "server_function" | "security" | "performance";
export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export type LogErrorInput = {
  category: ErrorCategory;
  severity?: ErrorSeverity;
  message: string;
  stack?: string | null;
  route?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  userAgent?: string | null;
  ip?: string | null;
};

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function logError(input: LogErrorInput): Promise<void> {
  try {
    await supabaseAdmin.from("error_logs").insert({
      category: input.category,
      severity: input.severity ?? "error",
      message: (input.message ?? "unknown").slice(0, 4000),
      stack: input.stack ? String(input.stack).slice(0, 8000) : null,
      route: input.route ?? null,
      user_id: input.userId ?? null,
      metadata: (input.metadata ?? {}) as never,
      user_agent: input.userAgent ? String(input.userAgent).slice(0, 512) : null,
      ip_hash: hashIp(input.ip ?? null),
    });
  } catch (err) {
    console.error("[monitoring] failed to persist error log:", err);
  }
}
