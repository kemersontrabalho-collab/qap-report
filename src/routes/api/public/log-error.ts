import { createFileRoute } from "@tanstack/react-router";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { logError } from "@/lib/monitoring.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const bodySchema = z.object({
  category: z.enum(["frontend", "performance"]).default("frontend"),
  severity: z.enum(["info", "warning", "error", "critical"]).default("error"),
  message: z.string().min(1).max(4000),
  stack: z.string().max(8000).optional(),
  route: z.string().max(512).optional(),
  userId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/log-error")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parsed = bodySchema.safeParse(raw);
          if (!parsed.success) {
            return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          await logError({
            category: parsed.data.category,
            severity: parsed.data.severity,
            message: parsed.data.message,
            stack: parsed.data.stack ?? null,
            route: parsed.data.route ?? null,
            userId: parsed.data.userId ?? null,
            metadata: parsed.data.metadata ?? {},
            userAgent: getRequestHeader("user-agent") ?? null,
            ip: getRequestIP({ xForwardedFor: true }) ?? null,
          });
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch {
          return new Response(JSON.stringify({ ok: false }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
