import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";
import type { Database } from "@/integrations/supabase/types";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}


// Mapeia priceId externo → plano interno usado no app
function planFromPriceId(priceId?: string): "mensal" | "anual" | null {
  if (priceId === "qap_mensal") return "mensal";
  if (priceId === "qap_anual") return "anual";
  return null;
}

async function handleSubscriptionCreatedOrUpdated(data: any, env: PaddleEnv) {
  const {
    id,
    customerId,
    items,
    status,
    currentBillingPeriod,
    scheduledChange,
    customData,
  } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.error("[paddle webhook] missing customData.userId", { id });
    return;
  }
  const item = items?.[0];
  const priceExt = item?.price?.importMeta?.externalId as string | undefined;
  const plan = planFromPriceId(priceExt);
  if (!plan) {
    console.warn("[paddle webhook] unknown price external_id", {
      priceExt,
      id,
    });
    return;
  }

  // upsert por user_id (assinatura única por usuário no schema atual)
  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        status: status,
        plan,
        current_period_start: currentBillingPeriod?.startsAt,
        current_period_end: currentBillingPeriod?.endsAt,
        canceled_at:
          scheduledChange?.action === "cancel" ? new Date().toISOString() : null,
        payment_method: "card",
        external_id: id,
        paddle_subscription_id: id,
        paddle_customer_id: customerId,
        environment: env,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id" },
    );
}


async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  // mantém current_period_end para grace period; is_premium_user cobre status='canceled'
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
      await handleSubscriptionCreatedOrUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    default:
      console.log("[paddle webhook] unhandled event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[paddle webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
