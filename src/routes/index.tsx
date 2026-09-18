import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Feather, Search, Moon, Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/qap-report-logo.webp.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { consumeOAuthRedirect } from "@/lib/oauth-redirect";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QAP Report — Assistente de Redação Policial com IA" },
      {
        name: "description",
        content:
          "Plataforma QAP Report: redija boletins BA, BO-COP e BO-TC com terminologia técnica, base de conhecimento jurídica e apoio de IA em segundos.",
      },
      { property: "og:title", content: "QAP Report — Assistente de Redação Policial com IA" },
      {
        property: "og:description",
        content:
          "Redija boletins BA, BO-COP e BO-TC com apoio de IA e terminologia técnica policial.",
      },
      { property: "og:url", content: "https://qap-report.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://qap-report.lovable.app/" },
      {
        rel: "preload",
        as: "image",
        href: logoAsset.url,
        type: "image/webp",
        fetchPriority: "high",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "QAP Report",
          url: "https://qap-report.lovable.app/",
          description:
            "Assistente de redação policial com IA para boletins BA, BO-COP e BO-TC.",
          inLanguage: "pt-BR",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "QAP Report",
          url: "https://qap-report.lovable.app/",
          logo: "https://qap-report.lovable.app/favicon.ico",
        }),
      },
    ],
  }),
  component: Landing,
});

/**
 * Célula do Bento Grid.
 * `span` controla a assimetria do mosaico (2 colunas em desktop para os dois
 * recursos-âncora), `delay` alimenta a entrada escalonada via `--d`.
 * O ícone vive numa placa com gradiente da marca — é o único ponto de cor
 * saturada do cartão, o que mantém a leitura sóbria.
 */
function Feature({
  icon: Icon,
  title,
  desc,
  span = "",
  delay = 0,
}: {
  icon: typeof ShieldCheck;
  title: string;
  desc: string;
  span?: string;
  delay?: number;
}) {
  return (
    <article
      className={`reveal lift surface-card group flex flex-col rounded-2xl p-6 ${span}`}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-md)] transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-110">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-fluid-sm text-muted-foreground">{desc}</p>
    </article>
  );
}

function hasStoredSession() {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function Landing() {
  const navigate = useNavigate();
  // Evita o "flash" da landing para quem já está logado: se houver sessão
  // persistida no dispositivo, mostramos um estado de transição enquanto o
  // redirecionamento acontece. No SSR/visitante anônimo nada muda (SEO intacto).
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (hasStoredSession()) setRedirecting(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let navigated = false;
    // Após retorno de OAuth (Google/Apple), o Supabase processa os tokens da URL
    // e dispara SIGNED_IN. Redirecionamos para o destino pretendido (ou dashboard).
    const go = () => {
      if (cancelled || navigated) return;
      navigated = true;
      setRedirecting(true);
      navigate({ to: consumeOAuthRedirect(), replace: true });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) go();
      else setRedirecting(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) go();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (redirecting) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Entrando...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background text-foreground">
      {/* Campo de grade técnica de fundo (32px = 8pt × 4), esmaecido por mask.
          `fixed` + `-z-10` mantém o custo de pintura fora do fluxo do scroll. */}
      <div aria-hidden className="grid-field pointer-events-none fixed inset-0 -z-10" />

      {/*
       * HEADER — barra de vidro fixa. O véu translúcido só aparece sobre
       * conteúdo, então o topo da página continua limpo; a borda inferior de
       * 1px em cor semitransparente evita a "linha dura" típica de UI comum.
       */}
      <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-fluid py-3">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5">
            <img
              src={logoAsset.url}
              alt="QAP Report"
              width={40}
              height={40}
              fetchPriority="high"
              decoding="async"
              className="aspect-square h-9 w-9 shrink-0 object-contain transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-105"
            />
            <span className="truncate text-fluid-lg font-semibold tracking-[-0.02em]">
              QAP Report
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-x-1 gap-y-2 sm:gap-x-2">
            <Link
              to="/guia-redacao-tecnica"
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:bg-accent hover:text-foreground"
            >
              Guia
            </Link>
            <Link
              to="/auth"
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:bg-accent hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="btn-brand inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-medium"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-fluid">
        {/*
         * HERO — assimetria 55/45 no desktop (grid 11 colunas: 6 + 5). O texto
         * recebe mais peso que a prévia, mantendo o equilíbrio óptico sem cair
         * no 50/50 previsível. `aurora` injeta o halo de luz da marca.
         */}
        <section className="aurora grid items-center gap-10 py-fluid-section lg:grid-cols-11 lg:gap-16">
          <div className="min-w-0 lg:col-span-6">
            <div
              className="reveal glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-fluid-xs font-medium text-muted-foreground"
              style={{ "--d": "0ms" } as React.CSSProperties}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-bright opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-bright" />
              </span>
              Assistente de redação policial com IA
            </div>

            <h1
              className="reveal mt-6 text-fluid-hero font-bold"
              style={{ "--d": "90ms" } as React.CSSProperties}
            >
              Boletins policiais bem redigidos,{" "}
              {/* Acento cromático em duas palavras apenas — mais que isso vira ruído. */}
              <span className="text-gradient-brand">em segundos.</span>
            </h1>

            <p
              className="reveal measure mt-6 text-fluid-base text-muted-foreground"
              style={{ "--d": "170ms" } as React.CSSProperties}
            >
              Informe o tipo de ocorrência (BA, BO-COP ou BO-TC) e as palavras-chave. O QAP
              Report produz um texto formal, técnico e fiel aos fatos — pronto para revisão.
            </p>

            <div
              className="reveal mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap"
              style={{ "--d": "250ms" } as React.CSSProperties}
            >
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="btn-brand group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold"
              >
                Começar agora
                <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
              </Link>
              <Link
                to="/auth"
                className="btn-ghost-line inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-sm font-medium"
              >
                Já tenho conta
              </Link>
            </div>

            {/* Prova de escopo: 3 colunas fixas separadas por hairline vertical.
                O grid (em vez de flex-wrap) impede que o terceiro item caia
                sozinho para a linha de baixo em larguras intermediárias. */}
            <dl
              className="reveal mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[var(--surface-line)] bg-[var(--surface-line)]"
              style={{ "--d": "330ms" } as React.CSSProperties}
            >
              {[
                ["4", "tipos de boletim"],
                ["24h", "de teste"],
                ["100%", "dados isolados"],
              ].map(([value, label]) => (
                <div key={label} className="stack-8 bg-card px-4 py-4 sm:px-5">
                  <dt className="text-fluid-xl font-bold tracking-tight">{value}</dt>
                  <dd className="text-[0.625rem] uppercase leading-tight tracking-[0.14em] text-muted-foreground sm:text-[0.6875rem]">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Prévia: cartão flutuante levemente rotacionado no desktop para
              sugerir profundidade física, alinhado reto no mobile. */}
          <div
            className="reveal relative min-w-0 lg:col-span-5"
            style={{ "--d": "200ms" } as React.CSSProperties}
          >
            <div className="surface-card rounded-3xl p-5 shadow-[var(--shadow-xl)] transition-transform duration-700 ease-[var(--ease-out-expo)] sm:p-7 lg:rotate-[0.6deg] lg:hover:rotate-0">
              <div className="flex items-center justify-between gap-3">
                <span className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Prévia
                </span>
                <span className="rounded-full bg-[image:var(--gradient-brand)] px-2.5 py-1 text-[0.6875rem] font-semibold text-primary-foreground">
                  BO-COP
                </span>
              </div>

              <h2 className="mt-4 text-fluid-lg font-semibold tracking-tight">
                Comunicação de Ocorrência Policial
              </h2>

              <p className="mt-4 border-l-2 border-brand-bright/40 pl-4 text-fluid-sm italic text-muted-foreground">
                Aos vinte e três dias do mês corrente, esta guarnição composta pelos policiais
                militares acima identificados, em patrulhamento pela viatura de prefixo indicado,
                foi acionada via COPOM para atender ocorrência...
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-xs">
                {["Súm. Vinc. 11", "Art. 5º, LXIII CF"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg border border-[var(--surface-line)] bg-accent/60 px-2.5 py-1 font-medium text-accent-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/*
         * BENTO GRID — 6 colunas no desktop: duas células-âncora ocupam 2
         * colunas cada e as demais 2, criando ritmo assimétrico dentro de uma
         * grade rígida. Colapsa para 2 colunas no tablet e 1 no celular.
         */}
        <section className="pb-fluid-section">
          <div className="measure">
            <h2 className="text-fluid-2xl font-bold">Tudo o que o plantão exige.</h2>
            <p className="mt-3 text-fluid-base text-muted-foreground">
              Ferramentas construídas em torno do vocabulário técnico policial — não um editor de
              texto genérico com IA colada por cima.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Feature
              icon={Feather}
              title="Linguagem técnica"
              desc="Terminologia jurídica e policial adequada, sem inventar fatos ou dados."
              span="lg:col-span-2"
              delay={0}
            />
            <Feature
              icon={Sparkles}
              title="Assistente IA"
              desc="Sugestões de preenchimento a partir das palavras-chave informadas, com fundamentação legal pertinente."
              span="lg:col-span-4"
              delay={70}
            />
            <Feature
              icon={Search}
              title="Pesquisa e histórico"
              desc="Rascunhos, favoritos, concluídos e lixeira, com busca por palavra-chave ou data."
              span="lg:col-span-3"
              delay={140}
            />
            <Feature
              icon={ShieldCheck}
              title="Seguro por padrão"
              desc="Autenticação protegida e dados isolados por usuário."
              span="lg:col-span-3"
              delay={210}
            />
            <Feature
              icon={Sparkles}
              title="Agilidade no plantão"
              desc="Modelos prontos para BA, BO-COP e BO-TC."
              span="lg:col-span-4"
              delay={280}
            />
            <Feature
              icon={Moon}
              title="Claro & escuro"
              desc="Interface adaptável ao ambiente do turno."
              span="lg:col-span-2"
              delay={350}
            />
          </div>
        </section>

        {/* PREÇO — visível publicamente, sem exigir login. */}
        <section id="precos" className="pb-fluid-section">
          <div className="measure">
            <h2 className="text-fluid-2xl font-bold">Preço simples e transparente.</h2>
            <p className="mt-3 text-fluid-base text-muted-foreground">
              24 horas de teste gratuito ao criar a conta. Depois, um único plano.
            </p>
          </div>

          <div className="mt-8 max-w-md rounded-2xl border border-[var(--surface-line)] p-7 shadow-[var(--shadow-lg)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plano Mensal
            </p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold">R$ 1,99</span>
              <span className="text-sm text-muted-foreground">por mês</span>
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>Geração ilimitada de boletins BA, BO-COP e BO-TC</li>
              <li>Aba de dúvidas jurídicas com IA</li>
              <li>Rascunhos, favoritos, histórico e exportação em PDF</li>
              <li>Cancele quando quiser · garantia de reembolso de 30 dias</li>
            </ul>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
            >
              Começar teste de 24h
            </Link>
            <p className="mt-4 text-xs text-muted-foreground">
              Valores em reais (BRL), com impostos aplicáveis calculados no checkout. Assinatura
              renovada mensalmente até o cancelamento. Consulte os{" "}
              <Link to="/termos" className="underline">
                Termos
              </Link>{" "}
              e a{" "}
              <Link to="/reembolso" className="underline">
                Política de Reembolso
              </Link>
              .
            </p>
          </div>
        </section>


        {/* CTA de fechamento: bloco de marca em largura total, o único momento
            da página com fundo saturado — por isso funciona como clímax. */}
        <section className="pb-fluid-section">
          <div className="relative overflow-hidden rounded-3xl bg-[image:var(--gradient-brand)] px-6 py-12 text-center shadow-[var(--shadow-xl)] sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(30rem_18rem_at_80%_0%,white,transparent_70%)]"
            />
            <h2 className="relative text-fluid-2xl font-bold text-primary-foreground">
              Comece o turno com o relatório pronto.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-fluid-base text-primary-foreground/80">
              Crie sua conta e tenha 24 horas de acesso completo para testar em ocorrências reais.
            </p>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="relative mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-background px-7 text-sm font-semibold text-foreground shadow-[var(--shadow-lg)] transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985]"
            >
              Criar conta gratuita
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--surface-line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-fluid py-8 sm:flex-row">
          <p className="text-fluid-xs text-muted-foreground">
            © {new Date().getFullYear()} kemerson · QAP Report · Ferramenta de apoio à redação
            policial
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-fluid-xs text-muted-foreground">
            <Link
              to="/guia-redacao-tecnica"
              className="transition-colors duration-300 hover:text-foreground"
            >
              Guia de redação técnica
            </Link>
            <Link
              to="/modelos-boletim-ocorrencia"
              className="transition-colors duration-300 hover:text-foreground"
            >
              Modelos de boletim
            </Link>
            <Link to="/termos" className="transition-colors duration-300 hover:text-foreground">
              Termos
            </Link>
            <Link
              to="/privacidade"
              className="transition-colors duration-300 hover:text-foreground"
            >
              Privacidade
            </Link>
            <Link to="/reembolso" className="transition-colors duration-300 hover:text-foreground">
              Reembolso
            </Link>
            <Link to="/auth" className="transition-colors duration-300 hover:text-foreground">
              Entrar
            </Link>

          </div>
        </div>
      </footer>
    </div>
  );
}
