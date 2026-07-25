import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Step = { title: string; body: string };

const STEPS: Step[] = [
  {
    title: "Painel",
    body: "A tela inicial após o login. Aqui você vê todos os seus boletins organizados por status (Rascunhos, Feitos, Favoritos, Lixeira) e pode filtrar ou buscar rapidamente.",
  },
  {
    title: "Botão 'Novo'",
    body: "No canto superior direito, use o botão 'Novo' para criar um boletim. Escolha o tipo (BA, BO-COP, BO-TC ou BOAT) conforme a ocorrência.",
  },
  {
    title: "Editor de boletim",
    body: "Preencha Título, Categoria, Composição da Guarnição, Prefixo da viatura, Data/Hora (automática), LOCALIZAÇÃO DA GUARNIÇÃO e Localização da Ocorrência. Use o botão de GPS ou o Google Maps para marcar o endereço.",
  },
  {
    title: "Geração por IA",
    body: "Após preencher os dados e palavras-chave, toque em 'Gerar texto' para que a IA produza o relatório em linguagem técnica e formal. Revise, edite e salve.",
  },
  {
    title: "Casos semelhantes",
    body: "Durante a redação, o app sugere boletins anteriores parecidos com a ocorrência atual para apoio à tomada de decisão.",
  },
  {
    title: "Exportar em PDF",
    body: "Concluído o boletim, use 'Exportar PDF' para baixar o documento pronto para impressão ou compartilhamento.",
  },
  {
    title: "Dúvidas com IA",
    body: "A aba 'Dúvidas IA' permite perguntar sobre leis, penas, qual documento se aplica a cada situação e tirar dúvidas técnicas em linguagem policial.",
  },
  {
    title: "Notificações",
    body: "O sino no topo mostra avisos do administrador e atualizações do app. Ative as notificações do dispositivo em Configurações para receber alertas mesmo com o app fechado.",
  },
  {
    title: "Suporte",
    body: "Em Configurações → Suporte, envie dúvidas, reclamações ou sugestões diretamente ao administrador do sistema.",
  },
  {
    title: "Modo offline",
    body: "O QAP Report funciona sem internet: crie e edite boletins offline, e a sincronização acontece automaticamente ao reconectar.",
  },
  {
    title: "Instalar como app",
    body: "Instale o QAP Report na tela inicial do celular (PWA). Em Configurações há instruções para iOS e Android e um botão de instalação direta.",
  },
];

export function TutorialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (open) setI(0);
  }, [open]);
  if (!open) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Passo {i + 1} de {STEPS.length}
          </span>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-accent">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((i + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-accent disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          {last ? (
            <button
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Concluir
            </button>
          ) : (
            <button
              onClick={() => setI((v) => Math.min(STEPS.length - 1, v + 1))}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
