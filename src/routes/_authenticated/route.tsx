import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSubscriptionStatus } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const allowedWithoutSubscription = ["/settings", "/assinatura"];
    if (allowedWithoutSubscription.some((p) => location.pathname.startsWith(p))) {
      return { user: data.user };
    }

    try {
      const status = await getSubscriptionStatus();
      if (!status.active) {
        throw redirect({ to: "/assinatura" });
      }
    } catch {
      throw redirect({ to: "/assinatura" });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
