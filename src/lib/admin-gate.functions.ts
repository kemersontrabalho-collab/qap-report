import { createServerFn } from "@tanstack/react-start";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { getAdminSession, equalsCT } = await import("./admin-gate.server");
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
    const session = await getAdminSession();
    await session.update({ unlocked: true, loginAt: Date.now() });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAdminSession } = await import("./admin-gate.server");
  const session = await getAdminSession();
  await session.clear();
  return { ok: true as const };
});

export const adminSessionStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminSession } = await import("./admin-gate.server");
  const session = await getAdminSession();
  return { unlocked: !!session.data.unlocked, loginAt: session.data.loginAt ?? null };
});
