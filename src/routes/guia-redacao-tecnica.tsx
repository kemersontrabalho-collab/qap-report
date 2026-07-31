import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Shield, FileText, Scale, ChevronRight, CheckCircle } from "lucide-react";
import logoAsset from "@/assets/qap-report-logo.webp.asset.json";

export const Route = createFileRoute("/guia-redacao-tecnica")({
  head: () => ({
    meta: [
      { title: "Guia de Redação de Boletim de Ocorrência — QAP Report" },
      {
        name: "description",
        content:
          "Guia prático de redação técnica para BA, BO-COP, BO-TC e BOAT com fundamentos legais e exemplos jurídicos.",
      },
      {
        property: "og:title",
        content: "Guia de Redação de Boletim de Ocorrência — QAP Report",
      },
      {
        property: "og:description",
        content:
          "Guia prático de redação técnica para BA, BO-COP, BO-TC e BOAT com fundamentos legais e exemplos jurídicos.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://qap-report.lovable.app/guia-redacao-tecnica" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Guia de Redação de Boletim de Ocorrência — QAP Report",
      },
      {
        name: "twitter:description",
        content:
          "Guia prático de redação técnica para BA, BO-COP, BO-TC e BOAT com fundamentos legais e exemplos jurídicos.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://qap-report.lovable.app/guia-redacao-tecnica",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Guia de Redação Técnica de Boletim de Ocorrência",
          description:
            "Aprenda a redigir boletim de ocorrência online com linguagem técnica e jurídica. Guia completo sobre BA, BO-COP, BO-TC, BOAT, Súmula Vinculante 11 e como o QAP Report automatiza a redação policial.",
          author: { "@type": "Organization", name: "QAP Report" },
          publisher: { "@type": "Organization", name: "QAP Report" },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": "https://qap-report.lovable.app/guia-redacao-tecnica",
          },
        }),
      },
    ],
  }),
  component: GuidePage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BookOpen;
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

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border-l-4 border-primary bg-accent/50 p-4">
      <p className="text-sm text-foreground">{children}</p>
    </div>
  );
}

function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="QAP Report" className="h-10 w-10 object-contain" />
          <span className="text-lg font-semibold tracking-tight">QAP Report</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/guia-redacao-tecnica" className="text-sm font-medium text-foreground">
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
              <BookOpen className="h-3.5 w-3.5" /> Guia técnico
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Guia de redação técnica de boletim de ocorrência
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Aprenda a redigir boletim de ocorrência online com linguagem técnica, jurídica e
              objetiva. Entenda os tipos de boletins, os fundamentos legais e como a ferramenta QAP
              Report automatiza a complexidade da redação policial.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Section icon={BookOpen} title="O que é um boletim de ocorrência?">
                <p>
                  O <strong>boletim de ocorrência</strong> é o documento oficial que registra, de
                  forma técnica e cronológica, os fatos observados por uma equipe policial. Ele
                  serve como registro de atividade, suporte a investigações e base para eventuais
                  procedimentos judiciais. Um boletim bem redigido deve ser:
                </p>
                <ul>
                  <li>
                    <strong>Objetivo</strong> — relatar apenas fatos, sem opinião pessoal;
                  </li>
                  <li>
                    <strong>Cronológico</strong> — apresentar os acontecimentos na ordem em que
                    ocorreram;
                  </li>
                  <li>
                    <strong>Técnico</strong> — usar terminologia policial e jurídica adequada;
                  </li>
                  <li>
                    <strong>Completo</strong> — conter quem, quando, onde, o que e como os fatos
                    aconteceram.
                  </li>
                </ul>
              </Section>

              <Section icon={FileText} title="Tipos de boletim: BA, BO-COP, BO-TC e BOAT">
                <p>
                  Cada sigla representa um documento com finalidade específica. Conhecer a diferença
                  é essencial para escolher a linguagem e o encaminhamento correto.
                </p>
                <h3>BA — Boletim de Atendimento</h3>
                <p>
                  Utilizado para conduta de pessoas à delegacia, incluindo situações de flagrante
                  delito, como tráfico de drogas. Deve descrever a composição da guarnição, o local,
                  o motivo da abordagem e as circunstâncias do flagrante.
                </p>
                <h3>BO-COP — Comunicação de Ocorrência Policial</h3>
                <p>
                  Registra ocorrências em que um indivíduo está presente no local, como ocorrências
                  de menor potencial ofensivo, consumo de entorpecentes ou situações que não
                  demandam prisão em flagrante. Costuma ser elaborado em conjunto com o Termo
                  Circunstanciado.
                </p>
                <h3>BO-TC — Termo Circunstanciado</h3>
                <p>
                  Aplica-se às infrações de menor potencial ofensivo (Lei 9.099/1995), como pequenos
                  furtos, lesões corporais leves e perturbação da ordem. O texto deve ser conciso,
                  indicar os elementos do crime, o valor envolvido e as condições do infrator.
                </p>
                <h3>BOAT — Boletim de Acidente de Trânsito</h3>
                <p>
                  Documento específico para ocorrências de trânsito, com foco em veículos,
                  condutores, testemunhas, condições da via e sinais de trânsito. A clareza é
                  fundamental para perícias e seguradoras.
                </p>
              </Section>

              <Section icon={Scale} title="Fundamentos legais: Súmula Vinculante 11">
                <p>
                  A <strong>Súmula Vinculante 11</strong> do Supremo Tribunal Federal estabelece que{" "}
                  <em>
                    a falta de flagrante não impede a lavratura do Termo Circunstanciado de
                    Ocorrência
                  </em>
                  . Ela é uma referência constante na redação de BO-COP e BO-TC, sobretudo quando a
                  conduta é atipicamente punível com pena mínima inferior a um ano.
                </p>
                <p>Além dela, outros dispositivos aparecem com frequência nos boletins:</p>
                <ul>
                  <li>
                    <strong>Art. 5º, LXIII, CF</strong> — direito do preso a identificação dos
                    responsáveis pela prisão ou abordagem;
                  </li>
                  <li>
                    <strong>Lei 9.099/1995</strong> — regula as infrações de menor potencial
                    ofensivo e a transação penal;
                  </li>
                  <li>
                    <strong>Lei 11.343/2006</strong> — define as condutas e penas relacionadas a
                    drogas;
                  </li>
                  <li>
                    <strong>Código de Trânsito Brasileiro</strong> — base para BOAT e ocorrências de
                    trânsito.
                  </li>
                </ul>
                <Tip>
                  <strong>Dica:</strong> cite a norma aplicável sem exagerar. A citação correta
                  demonstra técnica, mas o foco do boletim deve permanecer no fato narrado.
                </Tip>
              </Section>

              <Section icon={Shield} title="Como a QAP Report automatiza a redação">
                <p>
                  A QAP Report é um assistente de redação policial que transforma palavras-chave em
                  textos técnicos prontos para revisão. O usuário informa o tipo de boletim (BA,
                  BO-COP, BO-TC ou BOAT) e os dados da ocorrência, e a ferramenta gera:
                </p>
                <ul>
                  <li>
                    <strong>Histórico narrativo</strong> — em ordem cronológica, com início, meio e
                    fim;
                  </li>
                  <li>
                    <strong>Fundamento legal</strong> — normas adequadas ao tipo de ocorrência;
                  </li>
                  <li>
                    <strong>Previsão de procedimentos</strong> — encaminhamentos sugeridos com base
                    no caso;
                  </li>
                  <li>
                    <strong>Sugestões de melhoria</strong> — perguntas complementares que ajudam a
                    completar o boletim.
                  </li>
                </ul>
                <p>
                  Todo texto segue os padrões da redação técnica policial: sem inventar dados, sem
                  linguagem subjetiva e pronto para ser copiado, revisado e assinado.
                </p>
              </Section>
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">Checklist do boletim</h3>
                <ul className="mt-4 space-y-3">
                  {[
                    "Título identificador",
                    "Categoria da ocorrência",
                    "Composição da guarnição",
                    "Localização da guarnição",
                    "Localização da ocorrência",
                    "Data e hora exatas",
                    "Histórico claro e cronológico",
                    "Fundamento legal aplicável",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">Modelos prontos para usar</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Baixe ou copie textos-modelo para roubo, furto, perda, acidente de trânsito, lesão
                  corporal e dano.
                </p>
                <Link
                  to="/modelos-boletim-ocorrencia"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Ver modelos <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-2xl border bg-primary p-5 text-primary-foreground shadow-sm">
                <h3 className="font-semibold">Experimente a QAP Report</h3>
                <p className="mt-2 text-sm opacity-90">
                  Crie boletins BA, BO-COP, BO-TC e BOAT com linguagem técnica e apoio de IA. Menos
                  erros, mais agilidade no plantão.
                </p>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-foreground px-4 py-2 text-sm font-medium text-primary hover:opacity-90"
                >
                  Criar conta gratuita <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">Termos mais buscados</h3>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>boletim de ocorrência</strong> — o documento oficial de registro
                    policial.
                  </p>
                  <p>
                    <strong>boletim online</strong> — a tendência de registrar ocorrências por meio
                    digital.
                  </p>
                  <p>
                    <strong>redação técnica policial</strong> — a linguagem objetiva usada em
                    documentos oficiais.
                  </p>
                  <p>
                    <strong>terminologia jurídica</strong> — termos como flagrante, autoria,
                    materialidade, infração e procedimento.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </article>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} QAP Report · Ferramenta de apoio à redação policial
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Início
            </Link>
            <Link to="/guia-redacao-tecnica" className="hover:text-foreground">
              Guia de redação
            </Link>
            <Link to="/modelos-boletim-ocorrencia" className="hover:text-foreground">
              Modelos de boletim
            </Link>
            <Link to="/auth" className="hover:text-foreground">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
