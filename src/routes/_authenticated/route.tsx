import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TutorialModal } from "@/components/TutorialModal";
import { tutorialStore, useTutorialOpen } from "@/lib/tutorial-store";

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
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

