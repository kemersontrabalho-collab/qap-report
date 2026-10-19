import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { createUnexpectedErrorResponse } from "./lib/error-response";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return createUnexpectedErrorResponse(getRequest());
  }
});

const serverFnErrorLogger = createMiddleware({ type: "function" }).server(
  async ({ next, context }) => {
    try {
      return await next();
    } catch (error) {
      try {
        const { getRequestIP, getRequestHeader, getRequestUrl } =
          await import("@tanstack/react-start/server");
        const { logError } = await import("./lib/monitoring.server");
        const msg = error instanceof Error ? error.message : String(error);
        // Skip expected auth-gate rejections to reduce noise
        const skip = /ADMIN_UNAUTHORIZED|Unauthorized|Forbidden/i.test(msg);
        if (!skip) {
          const url = getRequestUrl();
          const ctx = context as { userId?: string } | undefined;
          await logError({
            category: "server_function",
            severity: "error",
            message: msg.slice(0, 4000),
            stack: error instanceof Error ? (error.stack ?? null) : null,
            route: url?.pathname ?? null,
            userId: ctx?.userId ?? null,
            metadata: { search: url?.search ?? "" },
            userAgent: getRequestHeader("user-agent") ?? null,
            ip: getRequestIP({ xForwardedFor: true }) ?? null,
          });
        }
      } catch {
        /* swallow log failures */
      }
      throw error;
    }
  },
);

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, serverFnErrorLogger],
  requestMiddleware: [errorMiddleware],
}));
