import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

const TITLE = "Política de Reembolso — QAP Report";
const DESCRIPTION =
  "Cancelamento do plano mensal Pix do QAP Report, manutenção do período pago e direitos legais de reembolso.";
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
    <LegalLayout title="Política de Cancelamento e Reembolso" updatedAt="28 de novembro de 2026">
      <p>
        O QAP Report, operado por <strong>kemerson</strong>, oferece um plano mensal de R$ 10,00
        pago via Pix, com liberação após aprovação administrativa e sem cobrança automática.
      </p>

      <h2>1. Desistência e período de acesso</h2>
      <p>
        Após a liberação, a simples decisão de não utilizar ou não renovar o plano não gera devolução
        total ou proporcional, fora dos casos previstos em lei. Seu acesso permanece até a data final
        exibida no aplicativo. Cada pagamento aprovado acrescenta 30 dias, preservando o saldo existente.
      </p>
      <p>
        Essa regra não afasta o direito de arrependimento de 7 dias previsto no art. 49 do Código
        de Defesa do Consumidor, quando aplicável, nem reembolsos devidos por cobrança indevida,
        falha na prestação do serviço ou outros direitos legalmente assegurados.
      </p>

      <h2>2. Como solicitar</h2>
      <ul>
        <li>
          Escreva para{" "}
          <a href="mailto:kemersontrabalho@gmail.com" className="underline">
            kemersontrabalho@gmail.com
          </a>{" "}
          informando o e-mail da conta, a data do Pix e o motivo do pedido. Não envie dados de boletins ou de terceiros.
        </li>
      </ul>

      <h2>3. Processamento</h2>
      <p>
        Os pedidos serão avaliados conforme a legislação aplicável. Quando o reembolso for devido,
        informaremos a forma de devolução e os dados necessários para realizá-la com segurança,
        respeitando os prazos legais.
      </p>

      <h2>4. Cancelamento da assinatura</h2>
      <p>
        Basta não realizar um novo Pix para não renovar. O acesso permanece ativo até o fim do
        período já pago, sem cobranças posteriores. Para dúvidas ou solicitações, use nosso e-mail
        de contato. A exclusão da conta é uma ação distinta e pode ser feita nas Configurações.
      </p>
    </LegalLayout>
  );
}
