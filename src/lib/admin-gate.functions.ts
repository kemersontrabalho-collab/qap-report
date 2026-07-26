import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type AdminSession = { unlocked?: boolean; loginAt?: number };

function sessionConfig() {
  return {
    password: process.env.ADMIN_SESSION_SECRET!,
    name: "qap-admin-session",
    maxAge: 60 * 60 * 4, // 4h
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function equalsCT(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export async function requireAdminSession() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.unlocked) {
    throw new Error("ADMIN_UNAUTHORIZED");
  }
  return session;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;
    if (!expectedUser || !expectedPass) {
      return { ok: false as const, error: "Credenciais admin não configuradas" };
    }
    const userOk = equalsCT(data.username ?? "", expectedUser);
    const passOk = equalsCT(data.password ?? "", expectedPass);
    if (!userOk || !passOk) {
      return { ok: false as const, error: "Usuário ou senha incorretos" };
    }
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ unlocked: true, loginAt: Date.now() });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const adminSessionStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { unlocked: !!session.data.unlocked, loginAt: session.data.loginAt ?? null };
});
