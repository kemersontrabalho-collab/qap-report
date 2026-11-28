import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

const TITLE = "Termo de Responsabilidade e Assinatura — QAP Report";
const DESCRIPTION =
  "Responsabilidade sobre dados pessoais, revisão de boletins, sigilo e condições da assinatura mensal do QAP Report.";
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
    <LegalLayout title="Termo de Responsabilidade, Proteção de Dados e Condições de Assinatura" updatedAt="28 de novembro de 2026">
      <p>
        Estes Termos regulam o uso do QAP Report, serviço fornecido por <strong>kemerson</strong>{" "}
        ("nós", "vendedor"). Ao aceitar estes Termos na criação da conta, você declara que
        leu, compreendeu e concorda com estes Termos. Contato:{" "}
        <a href="mailto:kemersontrabalho@gmail.com" className="underline">
          kemersontrabalho@gmail.com
        </a>
        .
      </p>

      <h2>1. Descrição do serviço</h2>
      <p>
        O QAP Report é uma ferramenta de apoio à redação de documentos policiais (BA, BO-COP e
        BO-TC) com auxílio de inteligência artificial, modelos padronizados e base de conhecimento
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
      <p>
        Ao preencher um boletim, você pode inserir dados pessoais próprios e de outras pessoas,
        como vítimas, testemunhas e suspeitos. Insira somente o necessário para uma finalidade
        legítima, observando sua autorização funcional, as normas da instituição e a legislação aplicável.
        O aceite destes Termos não autoriza o uso indiscriminado de dados de terceiros.
      </p>
      <p>
        Você responde pelo conteúdo que inserir, pela guarda das suas credenciais e pelos documentos
        que exportar ou compartilhar. É proibido divulgar informações para constranger, expor,
        perseguir ou prejudicar alguém. Antes de enviar um boletim, inclusive por WhatsApp, confirme
        que o destinatário está autorizado a recebê-lo e que o canal é permitido pela sua instituição.
      </p>
      <ul>
        <li>Uso ilegal, fraudulento ou para spam.</li>
        <li>Violação de direitos de propriedade intelectual ou de privacidade de terceiros.</li>
        <li>Interferência na segurança do serviço: malware, varreduras, testes de intrusão não autorizados, raspagem de dados.</li>
        <li>Inserção de dados sensíveis de terceiros sem base legal para tanto.</li>
      </ul>

      <h3>Consequências da divulgação indevida</h3>
      <p>
        Conforme os fatos e os requisitos de cada lei, a divulgação indevida pode gerar responsabilidade
        civil, penal e administrativo-disciplinar. Não existe um crime único para toda divulgação de
        dados pessoais; o enquadramento depende da natureza da informação, da conduta e das circunstâncias.
      </p>
      <ul>
        <li><a href="https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm" target="_blank" rel="noopener noreferrer" className="underline">Código Penal, art. 325</a>: revelar ou facilitar a revelação de fato conhecido em razão do cargo e que deva permanecer em segredo pode configurar violação de sigilo funcional.</li>
        <li>Código Penal, art. 153 e § 1º-A: a divulgação sem justa causa de conteúdo confidencial ou de informações legalmente sigilosas ou reservadas pode configurar divulgação de segredo, observados os requisitos de cada hipótese.</li>
        <li><a href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13869.htm" target="_blank" rel="noopener noreferrer" className="underline">Lei nº 13.869/2019, arts. 1º e 28</a>: pode constituir abuso de autoridade divulgar gravação, ou trecho, sem relação com a prova, expondo a intimidade ou a vida privada ou ferindo a honra ou a imagem do investigado ou acusado, com a finalidade específica exigida pela lei.</li>
        <li><a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noopener noreferrer" className="underline">LGPD — Lei nº 13.709/2018</a>: quando aplicável, exige tratamento legítimo, necessário e seguro e prevê responsabilidades e sanções nas hipóteses legais. A LGPD não transforma toda divulgação de dados em crime.</li>
      </ul>
      <p>
        O tratamento realizado exclusivamente para segurança pública, investigação ou repressão
        de infrações penais possui regime específico, conforme o art. 4º, III e seus parágrafos da LGPD.
        Essa regra não autoriza o envio de dados a qualquer ferramenta privada: você deve verificar
        previamente a autorização institucional e os limites legais para utilizar o serviço.
        Estes Termos não afastam as obrigações legais de proteção de dados do próprio QAP Report.
      </p>

      <h2>5. Inteligência artificial: uso aceitável e responsabilidade</h2>
      <ul>
        <li>É proibido usar a IA para produzir conteúdo ilícito, discriminatório, difamatório, deepfakes, desinformação, malware ou para tentar burlar as salvaguardas do sistema.</li>
        <li>Você é responsável pelos textos que insere (texto corrido, relatos, contexto), por ter o direito de utilizá-los e pela conferência do resultado antes de qualquer uso oficial.</li>
        <li>
          <strong>Os textos gerados podem conter imprecisões.</strong> O QAP Report é ferramenta de
          apoio à redação e não substitui a avaliação do agente público responsável, nem constitui
          consultoria jurídica. Toda revisão, tipificação e assinatura permanecem sob
          responsabilidade do usuário e da autoridade competente.
        </li>
        <li>Você mantém os direitos sobre o conteúdo que envia; concede-nos licença limitada para hospedar e processar esse conteúdo apenas para prestar o serviço. A contribuição para a base coletiva é opcional e depende de consentimento específico no boletim, anonimização e revisão administrativa; aceitar estes Termos não significa concordar com esse compartilhamento.</li>
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

      <h2>8. Pagamento, assinatura e cancelamento</h2>
      <p>
        Todas as contas começam no plano free, com teste gratuito de 24 horas. O único plano pago
        é mensal, por R$ 10,00, via Pix com aprovação administrativa. Após o teste, informar um
        pagamento ou enviar o comprovante não libera as ferramentas: é necessário que o administrador
        aprove o pagamento, ressalvados cupons, cortesias e acesso de fundador válidos.
      </p>
      <p>
        Cada aprovação válida acrescenta 30 dias ao acesso, preservando eventual saldo de dias já
        concedidos. A data de término é apresentada no aplicativo. Não há cobrança automática:
        para renovar, é necessário realizar outro Pix e aguardar sua aprovação.
      </p>
      <p>
        Se você decidir não renovar ou deixar de usar o aplicativo, o acesso continua até o término
        do período já pago. Não há devolução total ou proporcional por simples desistência após a
        liberação, fora das hipóteses em que a lei assegure o reembolso.
        Esta condição não elimina o direito de arrependimento do art. 49 do Código de Defesa do
        Consumidor, quando aplicável, nem outros direitos obrigatórios, como os decorrentes de falha
        na prestação do serviço ou cobrança indevida. Consulte a <a href="/reembolso" className="underline">Política de Reembolso</a>.
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
