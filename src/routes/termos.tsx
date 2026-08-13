import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

const TITLE = "Termos e Condições de Uso — QAP Report";
const DESCRIPTION =
  "Termos e condições de uso do QAP Report, assistente de redação policial com IA operado por kemerson.";
const URL = "https://qap-report.lovable.app/termos";

export const Route = createFileRoute("/termos")({
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
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Termos e Condições de Uso" updatedAt="13 de agosto de 2026">
      <p>
        Estes Termos regulam o uso do QAP Report, serviço fornecido por <strong>kemerson</strong>{" "}
        ("nós", "vendedor"). Ao criar uma conta ou continuar utilizando o serviço, você declara que
        leu, compreendeu e concorda com estes Termos. Contato:{" "}
        <a href="mailto:kemersontrabalho@gmail.com" className="underline">
          kemersontrabalho@gmail.com
        </a>
        .
      </p>

      <h2>1. Descrição do serviço</h2>
      <p>
        O QAP Report é uma ferramenta de apoio à redação de documentos policiais (BA, BO-COP, BO-TC
        e BOAT) com auxílio de inteligência artificial, modelos padronizados e base de conhecimento
        jurídica. O serviço é acessível por navegador e como aplicativo instalável (PWA).
      </p>

      <h2>2. Capacidade e conta</h2>
      <ul>
        <li>Você declara ser maior de idade e, se contratar em nome de uma instituição, ter poderes para vinculá-la.</li>
        <li>Você deve fornecer informações verdadeiras e mantê-las atualizadas.</li>
        <li>Você é responsável por manter suas credenciais em sigilo e por toda atividade realizada na sua conta.</li>
      </ul>

      <h2>3. Licença de uso e restrições</h2>
      <p>
        Concedemos a você um direito limitado, não exclusivo, intransferível e revogável de usar o
        serviço dentro do plano contratado. É vedado: engenharia reversa, revenda ou redistribuição,
        contorno de limites técnicos e uso automatizado não autorizado.
      </p>

      <h2>4. Uso indevido</h2>
      <ul>
        <li>Uso ilegal, fraudulento ou para spam.</li>
        <li>Violação de direitos de propriedade intelectual ou de privacidade de terceiros.</li>
        <li>Interferência na segurança do serviço: malware, varreduras, testes de intrusão não autorizados, raspagem de dados.</li>
        <li>Inserção de dados sensíveis de terceiros sem base legal para tanto.</li>
      </ul>

      <h2>5. Inteligência artificial: uso aceitável e responsabilidade</h2>
      <ul>
        <li>É proibido usar a IA para produzir conteúdo ilícito, discriminatório, difamatório, deepfakes, desinformação, malware ou para tentar burlar as salvaguardas do sistema.</li>
        <li>Você é responsável pelos textos que insere (palavras-chave, relatos, contexto), por ter o direito de utilizá-los e pela conferência do resultado antes de qualquer uso oficial.</li>
        <li>
          <strong>Os textos gerados podem conter imprecisões.</strong> O QAP Report é ferramenta de
          apoio à redação e não substitui a avaliação do agente público responsável, nem constitui
          consultoria jurídica. Toda revisão, tipificação e assinatura permanecem sob
          responsabilidade do usuário e da autoridade competente.
        </li>
        <li>Você mantém os direitos sobre o conteúdo que envia; concede-nos licença limitada para hospedar e processar esse conteúdo apenas para prestar o serviço. Trechos podem ser reaproveitados na base coletiva somente após anonimização.</li>
        <li>Podemos moderar conteúdo: filtrar ou recusar saídas, remover conteúdo e suspender contas em caso de violação. Titulares de direitos podem solicitar remoção pelo e-mail de contato; violações reiteradas levam ao encerramento da conta.</li>
      </ul>

      <h2>6. Propriedade intelectual</h2>
      <p>
        O software, a marca, a documentação, os modelos e a interface do QAP Report permanecem de
        titularidade de kemerson. Nada nestes Termos transfere tal propriedade a você.
      </p>

      <h2>7. Disponibilidade e garantias</h2>
      <p>
        O serviço é prestado "no estado em que se encontra". Não garantimos funcionamento
        ininterrupto ou livre de erros e, na máxima extensão permitida em lei, afastamos garantias
        implícitas de adequação a uma finalidade específica.
      </p>

      <h2>8. Pagamento, assinatura e impostos</h2>
      <p>
        O plano é mensal, no valor de R$ 1,99 por mês, com renovação a cada ciclo até o cancelamento.
        Novos usuários têm 24 horas de teste gratuito. Condições de cobrança, faturamento, impostos,
        cancelamento e reembolso são conduzidas pelo nosso revendedor: consulte os{" "}
        <a
          href="https://www.paddle.com/legal/checkout-buyer-terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Termos do Comprador da Paddle
        </a>{" "}
        e nossa Política de Reembolso.
      </p>
      <p>
        <strong>
          Nosso processo de pedidos é conduzido pelo nosso revendedor online Paddle.com. A
          Paddle.com é o Comerciante Registrado (Merchant of Record) de todos os nossos pedidos. A
          Paddle atende a todas as solicitações de suporte ao cliente e cuida das devoluções.
        </strong>
      </p>

      <h2>9. Suspensão e encerramento</h2>
      <p>
        Podemos suspender ou encerrar o acesso em caso de violação material destes Termos,
        inadimplência, risco de segurança ou fraude, ou violações graves/reiteradas das nossas
        políticas. Você pode encerrar sua conta a qualquer momento nas configurações. Após o
        encerramento, seus dados são excluídos conforme a Política de Privacidade; solicite
        exportação antes do encerramento, se desejar.
      </p>

      <h2>10. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida em lei, nossa responsabilidade agregada limita-se ao valor pago
        por você nos 12 meses anteriores ao fato. Não respondemos por danos indiretos, lucros
        cessantes, perda de dados ou de reputação. Nada exclui responsabilidade por dolo, fraude,
        morte ou dano pessoal quando a lei não permitir tal exclusão.
      </p>

      <h2>11. Indenização</h2>
      <p>
        Você nos indeniza por reclamações decorrentes do conteúdo que inserir, do uso ilícito do
        serviço ou da violação destes Termos.
      </p>

      <h2>12. Cessão, força maior e alterações</h2>
      <p>
        Você não pode ceder estes Termos sem nosso consentimento; podemos cedê-los em caso de
        reorganização societária. Não respondemos por falhas decorrentes de eventos fora do nosso
        controle razoável. Alterações relevantes serão comunicadas no aplicativo ou por e-mail.
      </p>

      <h2>13. Lei aplicável e foro</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil, elegendo-se o foro do
        domicílio do consumidor para dirimir controvérsias.
      </p>
    </LegalLayout>
  );
}
