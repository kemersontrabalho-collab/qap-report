import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

const TITLE = "Aviso de Privacidade — QAP Report";
const DESCRIPTION =
  "Como o QAP Report, operado por kemerson, coleta, usa, compartilha e protege dados pessoais, e quais são seus direitos como titular.";
const URL = "https://qap-report.lovable.app/privacidade";

export const Route = createFileRoute("/privacidade")({
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
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Aviso de Privacidade" updatedAt="13 de agosto de 2026">
      <p>
        Este aviso descreve como <strong>kemerson</strong>, responsável pelo QAP Report, trata dados
        pessoais. Para os fins da LGPD (Lei 13.709/18) e do GDPR, atuamos como{" "}
        <strong>controlador</strong> dos dados tratados na plataforma. Contato do encarregado:{" "}
        <a href="mailto:kemersontrabalho@gmail.com" className="underline">
          kemersontrabalho@gmail.com
        </a>
        .
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro e conta:</strong> nome, e-mail, credenciais de acesso (senha em hash) e identificadores de login social (Google/Apple), quando utilizados.</li>
        <li><strong>Conteúdo produzido:</strong> boletins, rascunhos, palavras-chave, contexto e anotações que você insere.</li>
        <li><strong>Localização:</strong> coordenadas informadas voluntariamente para preencher o endereço da ocorrência.</li>
        <li><strong>Uso e técnicos:</strong> data/hora de acesso, páginas visitadas, identificadores de dispositivo, endereço IP e registros de erro.</li>
        <li><strong>Suporte:</strong> mensagens e anexos enviados a nós.</li>
        <li><strong>Assinatura:</strong> status do plano e histórico de ativação. Dados de pagamento são coletados diretamente pelo Comerciante Registrado, não por nós.</li>
      </ul>

      <h2>2. Finalidades e bases legais</h2>
      <ul>
        <li>Criar e manter a conta e prestar o serviço — execução de contrato.</li>
        <li>Gerar textos com IA a partir do conteúdo informado — execução de contrato.</li>
        <li>Segurança, prevenção a fraudes e estabilidade — legítimo interesse e obrigação legal.</li>
        <li>Melhoria do produto e base coletiva de conhecimento, sempre com anonimização prévia — legítimo interesse.</li>
        <li>Atendimento ao suporte — execução de contrato e legítimo interesse.</li>
        <li>Comunicações de marketing, quando houver — consentimento, revogável a qualquer tempo.</li>
        <li>Geolocalização — consentimento, concedido no navegador e revogável.</li>
      </ul>

      <h2>3. Base coletiva e anonimização</h2>
      <p>
        Trechos de boletins podem alimentar a base coletiva de conhecimento usada para melhorar as
        sugestões da IA. Antes disso, aplicamos remoção automatizada de identificadores (nomes,
        CPFs, placas, endereços, telefones). O material anonimizado deixa de ser dado pessoal.
      </p>

      <h2>4. Compartilhamento</h2>
      <ul>
        <li><strong>Operadores/subprocessadores:</strong> hospedagem, banco de dados e autenticação, provedores de modelos de IA, monitoramento de erros e ferramentas de suporte.</li>
        <li><strong>Comerciante Registrado (Paddle):</strong> venda do produto, gestão de assinatura, pagamentos, conformidade fiscal e emissão de faturas.</li>
        <li><strong>Assessores profissionais:</strong> jurídicos e contábeis, quando necessário.</li>
        <li><strong>Autoridades:</strong> quando exigido por lei ou ordem judicial.</li>
      </ul>
      <p>Não vendemos dados pessoais.</p>

      <h2>5. Transferências internacionais</h2>
      <p>
        Alguns provedores operam fora do Brasil e da UE/EEE. Nesses casos, as transferências são
        amparadas por cláusulas contratuais padrão e/ou decisões de adequação, com salvaguardas
        técnicas e contratuais adequadas.
      </p>

      <h2>6. Retenção</h2>
      <p>
        Mantemos os dados enquanto a conta existir. Após o encerramento, os dados de conta e
        conteúdo são excluídos ou anonimizados em até 90 dias, salvo obrigação legal de guarda
        (por exemplo, registros fiscais e logs de acesso).
      </p>

      <h2>7. Seus direitos</h2>
      <p>
        Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade,
        eliminação, informação sobre compartilhamentos, revogação de consentimento e oposição a
        tratamentos baseados em legítimo interesse. No âmbito do GDPR, também há direito de
        restrição e de reclamação à autoridade supervisora. Respondemos em até 1 mês. A exclusão da
        conta também está disponível diretamente nas configurações do aplicativo.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais apropriadas: criptografia em trânsito, controle
        de acesso por usuário no banco de dados (RLS), segregação de credenciais, princípio do menor
        privilégio e monitoramento de erros.
      </p>

      <h2>9. Cookies e armazenamento local</h2>
      <p>
        Utilizamos cookies e armazenamento local <strong>essenciais</strong> para manter sua sessão
        autenticada, preferências de tema e estado do tutorial. Não utilizamos cookies de
        publicidade. Você pode limpar ou bloquear cookies nas configurações do navegador, ciente de
        que o login deixará de funcionar.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Podemos atualizar este aviso. Mudanças relevantes serão comunicadas no aplicativo ou por
        e-mail, com indicação da nova data de atualização.
      </p>
    </LegalLayout>
  );
}
