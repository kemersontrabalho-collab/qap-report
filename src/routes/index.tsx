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
        content: "Redija boletins BA, BO-COP, BO-TC e BOAT com apoio de IA e terminologia técnica policial.",
      },
      { property: "og:url", content: "https://qap-report.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://qap-report.lovable.app/" },
      { rel: "preload", as: "image", href: logoAsset.url, type: "image/webp", fetchPriority: "high" },
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <img
            src={logoAsset.url}
            alt="QAP Report"
            width={40}
            height={40}
            fetchPriority="high"
            decoding="async"
            className="h-10 w-10 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight">QAP Report</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            to="/guia-redacao-tecnica"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Guia
          </Link>
          <Link
            to="/auth"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
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

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid gap-8 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Assistente de redação policial
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Boletins policiais bem redigidos, em segundos.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Informe o tipo de ocorrência (BA, BO-COP, BO-TC ou BOAT) e as palavras-chave.
              O QAP Report produz um texto formal, técnico e fiel aos fatos — pronto para revisão.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Começar agora
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-accent"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl border bg-card p-6 shadow-lg">
              <div className="text-xs font-medium text-muted-foreground">Prévia · BO-COP</div>
              <h2 className="mt-2 font-semibold">Comunicação de Ocorrência Policial</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Aos vinte e três dias do mês corrente, esta guarnição composta pelos policiais
                militares acima identificados, em patrulhamento pela viatura de prefixo indicado,
                foi acionada via COPOM para atender ocorrência...
              </p>
              <div className="mt-4 flex gap-2 text-xs">
                <span className="rounded-md bg-accent px-2 py-1 text-accent-foreground">Súm. Vinc. 11</span>
                <span className="rounded-md bg-accent px-2 py-1 text-accent-foreground">Art. 5º, LXIII CF</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-20 md:grid-cols-3">
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
