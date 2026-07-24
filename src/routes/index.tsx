import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Feather, Search, WifiOff, Moon, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QAP REPORT" },
      {
        name: "description",
        content:
          "Gere boletins BA, BO-COP, BO-TC e BOAT com linguagem técnica, offline e sincronização automática.",
      },
      { property: "og:title", content: "QAP REPORT" },
      {
        property: "og:description",
        content: "Gere boletins BA, BO-COP, BO-TC e BOAT com linguagem técnica, offline e sincronização automática.",
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

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">RedaPol</span>
        </div>
        <nav className="flex items-center gap-3">
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
              O RedaPol produz um texto formal, técnico e fiel aos fatos — pronto para revisão.
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
              <h4 className="mt-2 font-semibold">Comunicação de Ocorrência Policial</h4>
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
            icon={WifiOff}
            title="Funciona offline"
            desc="Crie e edite sem conexão. Sincroniza automaticamente ao voltar online."
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
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} RedaPol · Ferramenta de apoio à redação policial
        </div>
      </footer>
    </div>
  );
}
