import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, FileText, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import logoAsset from "@/assets/qap-report-logo.webp.asset.json";

const TITLE = "BO Online: como registrar na delegacia online por estado";
const DESCRIPTION =
  "Como registrar boletim de ocorrência online (BO online) nas delegacias virtuais de SP, RJ, MG, SC e PR: requisitos, prazos e o que dá para registrar.";
const URL = "https://qap-report.lovable.app/guia-delegacia-online";

export const Route = createFileRoute("/guia-delegacia-online")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "QAP Report" },
          publisher: { "@type": "Organization", name: "QAP Report" },
          mainEntityOfPage: { "@type": "WebPage", "@id": URL },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "O que posso registrar na delegacia online?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Em geral: furto, perda ou extravio de documentos e objetos, desaparecimento de pessoas, dano e injúria/ameaça, conforme as regras de cada estado. Crimes com violência, flagrante ou vítima ferida exigem atendimento presencial ou acionamento da polícia.",
              },
            },
            {
              "@type": "Question",
              name: "O boletim de ocorrência online tem a mesma validade?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Sim. Após a análise e homologação pela autoridade policial, o registro feito na delegacia virtual tem o mesmo valor legal do presencial e pode ser usado em seguradoras, bancos e órgãos públicos.",
              },
            },
            {
              "@type": "Question",
              name: "Quanto tempo demora a homologação?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Normalmente de algumas horas até alguns dias, dependendo do estado e da qualidade das informações prestadas. Relatos confusos ou incompletos são a principal causa de recusa.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: OnlinePoliceGuide,
});

const STATES: {
  uf: string;
  name: string;
  portal: string;
  url: string;
  notes: string;
}[] = [
  {
    uf: "SP",
    name: "São Paulo",
    portal: "Delegacia Eletrônica — Polícia Civil de SP",
    url: "https://www.delegaciaeletronica.policiacivil.sp.gov.br/",
    notes:
      "Aceita furto, perda de documentos e objetos e desaparecimento. O registro passa por análise e o número do BO chega por e-mail.",
  },
  {
    uf: "RJ",
    name: "Rio de Janeiro",
    portal: "Delegacia Online — Polícia Civil do RJ",
    url: "https://www.delegaciaonline.rj.gov.br/",
    notes:
      "Permite registro e consulta do andamento. Exige e-mail válido e dados completos do fato; crimes com violência devem ser registrados presencialmente.",
  },
  {
    uf: "MG",
    name: "Minas Gerais",
    portal: "Delegacia Virtual — Polícia Civil de MG",
    url: "https://delegaciavirtual.sids.mg.gov.br/",
    notes:
      "Cadastro prévio do cidadão. Cobre furto, dano, extravio de documentos e ameaça.",
  },
  {
    uf: "SC",
    name: "Santa Catarina",
    portal: "Delegacia Virtual — Polícia Civil de SC",
    url: "https://delegaciavirtual.sc.gov.br/",
    notes:
      "Login pelo gov.br. Após o envio, o boletim é analisado por um delegado antes da homologação.",
  },
  {
    uf: "PR",
    name: "Paraná",
    portal: "Boletim de Ocorrência Unificado (BOU) — Polícia Civil do PR",
    url: "https://www.bou.pc.pr.gov.br/",
    notes:
      "Registro unificado com acompanhamento online e emissão do documento em PDF depois de aprovado.",
  },
];

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Globe;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="prose prose-neutral mt-4 max-w-none text-sm leading-relaxed text-muted-foreground dark:prose-invert">
        {children}
      </div>
    </section>
  );
}

function OnlinePoliceGuide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="QAP Report" className="h-10 w-10 object-contain" />
          <span className="text-lg font-semibold tracking-tight">QAP Report</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            to="/guia-redacao-tecnica"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Guia
          </Link>
          <Link
            to="/modelos-boletim-ocorrencia"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Modelos
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Começar
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <article>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" /> Delegacia online
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              BO online: como registrar na delegacia virtual do seu estado
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Passo a passo do registro de boletim de ocorrência pela internet, o que cada estado
              aceita e como escrever o relato para que ele seja homologado sem recusa.
            </p>
          </div>

          <div className="mt-10 space-y-6">
            <Section icon={FileText} title="O que dá (e o que não dá) para registrar online">
              <p>
                A delegacia virtual foi criada para ocorrências sem flagrante e sem violência
                imediata. Na maioria dos estados é possível registrar:
              </p>
              <ul>
                <li>furto (sem violência ou grave ameaça);</li>
                <li>perda ou extravio de documentos e objetos;</li>
                <li>dano ao patrimônio;</li>
                <li>desaparecimento de pessoa;</li>
                <li>ameaça, injúria, calúnia e difamação (varia por estado).</li>
              </ul>
              <p>
                <strong>Não</strong> use o canal online para roubo, lesão corporal, violência
                doméstica, crimes em andamento ou situações de flagrante: nesses casos acione o 190
                e procure atendimento presencial.
              </p>
            </Section>

            <Section icon={Globe} title="Portais oficiais por estado">
              <p>
                Os endereços abaixo são os canais oficiais das polícias civis. Desconfie de sites
                que cobram taxa para registrar BO — o serviço é gratuito.
              </p>
              <div className="not-prose mt-4 grid gap-3 sm:grid-cols-2">
                {STATES.map((s) => (
                  <div key={s.uf} className="rounded-xl border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                        {s.uf}
                      </span>
                      <h3 className="text-sm font-semibold">{s.name}</h3>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{s.notes}</p>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      {s.portal}
                    </a>
                  </div>
                ))}
              </div>
              <p className="mt-4">
                Outros estados seguem o mesmo modelo: procure por “delegacia virtual” somado à sigla
                do estado no domínio oficial <code>.gov.br</code>.
              </p>
            </Section>

            <Section icon={CheckCircle} title="Passo a passo do registro">
              <ol>
                <li>
                  Reúna documentos pessoais, comprovante de endereço e dados do fato (data, hora e
                  endereço exatos).
                </li>
                <li>Acesse o portal do estado e faça login (muitos usam a conta gov.br).</li>
                <li>Escolha a natureza da ocorrência mais próxima do fato.</li>
                <li>
                  Descreva o ocorrido em ordem cronológica, com linguagem objetiva e sem opinião
                  pessoal.
                </li>
                <li>Anexe fotos, notas fiscais e números de série quando houver.</li>
                <li>
                  Envie e aguarde a homologação; o número do BO e o PDF chegam por e-mail ou ficam
                  disponíveis para consulta no portal.
                </li>
              </ol>
            </Section>

            <Section icon={AlertTriangle} title="Por que um BO online é recusado">
              <p>A causa mais comum é o relato, não o formulário:</p>
              <ul>
                <li>narrativa confusa ou fora de ordem cronológica;</li>
                <li>ausência de local exato, data e horário;</li>
                <li>
                  descrição genérica dos bens (“um celular”) em vez de marca, modelo, cor e IMEI;
                </li>
                <li>
                  mistura de fato e suposição (“acho que foi o vizinho”), que fragiliza o registro;
                </li>
                <li>natureza escolhida incompatível com o fato descrito.</li>
              </ul>
            </Section>

            <Section icon={Shield} title="Como o QAP Report ajuda antes do envio">
              <p>
                O QAP Report é um assistente de redação policial: a partir de palavras-chave, ele
                estrutura o texto em linguagem técnica, cronológica e juridicamente coerente.
                Escreva o rascunho no app, revise o resultado e cole no formulário da delegacia
                virtual — o relato chega claro à autoridade que vai homologar.
              </p>
              <p className="not-prose mt-4 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Testar gratuitamente
                </Link>
                <Link
                  to="/modelos-boletim-ocorrencia"
                  className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Ver modelos prontos
                </Link>
                <Link
                  to="/guia-redacao-tecnica"
                  className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Guia de redação técnica
                </Link>
              </p>
            </Section>
          </div>
        </article>
      </main>
    </div>
  );
}
