import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Layout comum às páginas legais (privacidade, termos, reembolso). */
export function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-[var(--surface-line)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-fluid py-5">
          <Link to="/" className="text-sm font-semibold">
            QAP Report
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <Link to="/termos" className="hover:text-foreground">
              Termos
            </Link>
            <Link to="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
            <Link to="/reembolso" className="hover:text-foreground">
              Reembolso
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-fluid py-12">
        <h1 className="text-fluid-2xl font-bold">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Última atualização: {updatedAt}</p>
        <div className="legal-prose mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
          {children}
        </div>
      </main>

      <footer className="border-t border-[var(--surface-line)]">
        <div className="mx-auto max-w-3xl px-fluid py-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} kemerson · QAP Report
        </div>
      </footer>
    </div>
  );
}
