import { createFileRoute } from "@tanstack/react-router";
import { processPaymentByExternalId, verifyWebhookSignature } from "@/lib/billing.server";

export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("x-signature") || request.headers.get("x-signature-sha256") || request.headers.get("x-hook-signature");
        const valid = await verifyWebhookSignature(body, signature);
        if (!valid) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const data = payload as { data?: { id?: string }; type?: string; action?: string };
        const paymentId = data?.data?.id;
        if (!paymentId) {
          return new Response("Missing payment id", { status: 400 });
        }

        try {
          await processPaymentByExternalId(paymentId);
          return new Response("OK", { status: 200 });
        } catch (e) {
          console.error("Webhook processing error", e);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
