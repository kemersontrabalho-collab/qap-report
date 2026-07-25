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
      const [{ data: roleData }, status] = await Promise.all([
        supabase.rpc("has_role", { _user_id: data.user.id, _role: "fundador" }),
        getSubscriptionStatus(),
      ]);
      if (roleData) return { user: data.user };
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
