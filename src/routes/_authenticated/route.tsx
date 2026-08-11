import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tutorialStore, useTutorialOpen } from "@/lib/tutorial-store";

// O tutorial é montado em TODA página autenticada, mas só é visto uma vez por
// usuário. Carregá-lo sob demanda tira ~10 KB do caminho crítico de cada rota
// interna sem alterar o comportamento percebido (abre em milissegundos).
const TutorialModal = lazy(() =>
  import("@/components/TutorialModal").then((m) => ({ default: m.TutorialModal })),
);

// Rotas que NÃO exigem assinatura ativa (usuário sem plano ainda pode acessar).
const FREE_PATHS = ["/assinar", "/settings"];

function AuthenticatedLayout() {
  const open = useTutorialOpen();
  const { user } = Route.useRouteContext();

  // Primeiro acesso da conta: o tour abre sozinho (uma única vez por usuário).
  useEffect(() => {
    if (!user?.id) return;
    const t = window.setTimeout(() => tutorialStore.openIfFirstTime(user.id), 600);
    return () => window.clearTimeout(t);
  }, [user?.id]);

  return (
    <>
      <Outlet />
      {open && (
        <Suspense fallback={null}>
          <TutorialModal open onClose={tutorialStore.close} />
        </Suspense>
      )}
    </>
  );
}


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }

    // Gate de assinatura: rotas premium exigem plano ativo/trial ou papel de fundador.
    const pathname = location.pathname;
    const isFree = FREE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!isFree) {
      const { data: premium } = await supabase.rpc("is_premium_user", {
        _user_id: data.user.id,
      });
      if (!premium) {
        throw redirect({ to: "/assinar" });
      }
    }

    return { user: data.user };
  },
  component: AuthenticatedLayout,
});
