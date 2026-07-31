import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Feather, Search, Moon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/qap-report-logo.webp.asset.json";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QAP Report — Assistente de Redação Policial com IA" },
      {
        name: "description",
        content:
          "Plataforma QAP Report: redija boletins BA, BO-COP, BO-TC e BOAT com terminologia técnica, base de conhecimento jurídica e apoio de IA em segundos.",
      },
      { property: "og:title", content: "QAP Report — Assistente de Redação Policial com IA" },
      {
        property: "og:description",
        content:
          "Redija boletins BA, BO-COP, BO-TC e BOAT com apoio de IA e terminologia técnica policial.",
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
            "Assistente de redação policial com IA para boletins BA, BO-COP, BO-TC e BOAT.",
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

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof ShieldCheck;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
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
    // Após retorno de OAuth (Google/Apple), o Supabase processa os tokens do hash da URL
    // e dispara SIGNED_IN. Nesse momento, redirecionamos automaticamente para o dashboard.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && !data.session) setRedirecting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setRedirecting(true);
        navigate({ to: "/dashboard", replace: true });
      }
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
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header da landing: marca elástica + navegação que quebra para a linha
          de baixo em telas muito estreitas, em vez de comprimir os links. */}
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-fluid py-4 sm:py-5">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src={logoAsset.url}
            alt="QAP Report"
            width={40}
            height={40}
            fetchPriority="high"
            decoding="async"
            // aspect-square reserva a caixa antes do byte chegar → sem CLS.
            className="aspect-square h-10 w-10 shrink-0 object-contain"
          />
          <span className="truncate text-fluid-lg font-semibold tracking-tight">QAP Report</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-2">

          <Link
            to="/guia-redacao-tecnica"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Guia
          </Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-fluid">
        {/*
         * HERO — coluna única até md (o cartão de prévia embaixo funciona como
         * prova social após a chamada). A partir de md as duas colunas ficam
         * lado a lado e centradas verticalmente. O padding vertical é fluido,
         * então não há salto de 16 para 24 unidades no breakpoint.
         */}
        <section className="grid gap-8 py-fluid-section md:grid-cols-2 md:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-fluid-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0" /> Assistente de redação policial
            </div>
            {/* text-fluid-hero: 28px no relógio → 60px no ultrawide, contínuo. */}
            <h1 className="mt-4 text-fluid-hero font-bold">
              Boletins policiais bem redigidos, em segundos.
            </h1>
            {/* measure trava a linha em ~68 caracteres: legibilidade preservada
                tanto no celular quanto num monitor de 32". */}
            <p className="measure mt-4 text-fluid-base text-muted-foreground">
              Informe o tipo de ocorrência (BA, BO-COP, BO-TC ou BOAT) e as palavras-chave. O QAP
              Report produz um texto formal, técnico e fiel aos fatos — pronto para revisão.
            </p>

            {/* CTAs: largura total no mobile (alvo de toque generoso e polegar
                confortável), auto a partir de 480px. */}
            <div className="mt-6 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Começar agora
              </Link>
              <Link
                to="/auth"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border px-5 text-sm font-medium hover:bg-accent"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
          <div className="relative min-w-0">
            <div className="rounded-3xl border bg-card p-4 shadow-lg sm:p-6">
              <div className="text-fluid-xs font-medium text-muted-foreground">Prévia · BO-COP</div>
              <h2 className="mt-2 text-fluid-base font-semibold">
                Comunicação de Ocorrência Policial
              </h2>
              <p className="mt-3 text-fluid-sm text-muted-foreground">
                Aos vinte e três dias do mês corrente, esta guarnição composta pelos policiais
                militares acima identificados, em patrulhamento pela viatura de prefixo indicado,
                foi acionada via COPOM para atender ocorrência...
              </p>
              {/* flex-wrap evita que as duas tags de fundamentação legal estourem
                  o cartão em telas estreitas. */}
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-accent px-2 py-1 text-accent-foreground">
                  Súm. Vinc. 11
                </span>
                <span className="rounded-md bg-accent px-2 py-1 text-accent-foreground">
                  Art. 5º, LXIII CF
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Recursos: 1 → 2 (tablet retrato) → 3 (desktop). */}
        <section className="grid grid-cols-1 gap-4 pb-16 sm:grid-cols-2 md:grid-cols-3 md:pb-20">

          <h2 className="sr-only">Recursos do QAP Report</h2>
          <Feature
            icon={Feather}
            title="Linguagem técnica"
            desc="Terminologia jurídica e policial adequada, sem inventar fatos ou dados."
          />
          <Feature
            icon={Search}
            title="Pesquisa e histórico"
            desc="Rascunhos, favoritos e busca por palavra-chave ou data."
          />
          <Feature
            icon={Sparkles}
            title="Agilidade no plantão"
            desc="Modelos prontos e sugestões da IA para acelerar a redação do boletim."
          />
          <Feature
            icon={ShieldCheck}
            title="Seguro"
            desc="Autenticação protegida e dados isolados por usuário."
          />
          <Feature
            icon={Moon}
            title="Claro & escuro"
            desc="Interface responsiva com tema adaptável ao seu ambiente."
          />
          <Feature
            icon={Sparkles}
            title="Assistente IA"
            desc="Sugestões de preenchimento com base nas palavras-chave informadas."
          />
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} QAP Report · Ferramenta de apoio à redação policial
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/guia-redacao-tecnica" className="hover:text-foreground">
              Guia de redação técnica
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
