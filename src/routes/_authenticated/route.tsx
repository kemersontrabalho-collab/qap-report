import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TutorialModal } from "@/components/TutorialModal";
import { tutorialStore, useTutorialOpen } from "@/lib/tutorial-store";

// Rotas que NÃO exigem assinatura ativa (usuário sem plano ainda pode acessar).
const FREE_PATHS = ["/assinar", "/settings"];

function AuthenticatedLayout() {
  const open = useTutorialOpen();
  return (
    <>
      <Outlet />
      <TutorialModal open={open} onClose={tutorialStore.close} />
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
