import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export type AdminSession = { unlocked?: boolean; loginAt?: number };

export function sessionConfig() {
  return {
    password: process.env.ADMIN_SESSION_SECRET!,
    name: "qap-admin-session",
    maxAge: 60 * 60 * 4,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export function equalsCT(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

// eslint-disable-next-line react-hooks/rules-of-hooks -- useSession é utilitário de servidor do TanStack, não um hook React
export async function getAdminSession() {
  return await useSession<AdminSession>(sessionConfig());
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session.data.unlocked) throw new Error("ADMIN_UNAUTHORIZED");
  return session;
}
