import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

const TITLE = "Política de Reembolso — QAP Report";
const DESCRIPTION =
  "Garantia de reembolso de 30 dias do QAP Report: prazos, como solicitar e como o reembolso é processado.";
const URL = "https://qap-report.lovable.app/reembolso";

export const Route = createFileRoute("/reembolso")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <LegalLayout title="Política de Reembolso" updatedAt="13 de agosto de 2026">
      <p>
        O QAP Report, operado por <strong>kemerson</strong>, oferece{" "}
        <strong>garantia de reembolso de 30 dias</strong>.
      </p>

      <h2>1. Prazo</h2>
      <p>
        Se você não ficar satisfeito com a compra, pode solicitar o reembolso integral em até{" "}
        <strong>30 dias corridos</strong> contados da data do pedido, inclusive por simples
        desistência. Também respeitamos o direito de arrependimento de 7 dias previsto no art. 49 do
        Código de Defesa do Consumidor, que corre em paralelo a esta garantia.
      </p>

      <h2>2. Como solicitar</h2>
      <ul>
        <li>
          Acesse{" "}
          <a
            href="https://paddle.net"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            paddle.net
          </a>{" "}
          com o e-mail usado na compra e abra a solicitação de reembolso; ou
        </li>
        <li>
          Escreva para{" "}
          <a href="mailto:kemersontrabalho@gmail.com" className="underline">
            kemersontrabalho@gmail.com
          </a>{" "}
          informando o e-mail da conta e a data da compra — encaminharemos o pedido.
        </li>
      </ul>

      <h2>3. Processamento</h2>
      <p>
        Os reembolsos são processados pelo nosso provedor de pagamentos e Comerciante Registrado, a
        Paddle, no mesmo meio de pagamento utilizado na compra. O prazo de crédito depende da
        instituição financeira, normalmente entre 3 e 10 dias úteis após a aprovação. Consulte
        também a{" "}
        <a
          href="https://www.paddle.com/legal/refund-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Política de Reembolso da Paddle
        </a>
        .
      </p>

      <h2>4. Cancelamento da assinatura</h2>
      <p>
        Você pode cancelar a assinatura mensal a qualquer momento; o acesso permanece ativo até o
        fim do ciclo já pago e não há cobranças posteriores. O cancelamento pode ser feito em
        paddle.net ou pelo nosso e-mail de contato.
      </p>
    </LegalLayout>
  );
}
