import { lazy, Suspense, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, ClipboardCopy, Loader2, Wrench, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { copyWithFeedback } from "@/lib/clipboard";
import {
  adminDiagnoseErrorLog,
  adminSetGlobalBanner,
  adminRepairBulletin,
} from "@/lib/monitoring.functions";

const MarkdownRenderer = lazy(() => import("@/components/MarkdownRenderer"));

export type LogRow = {
  id: string;
  created_at: string;
  category: string;
  severity: string;
  message: string;
  stack: string | null;
  route: string | null;
  metadata: unknown;
  user_agent: string | null;
};

export function buildLovablePrompt(row: LogRow, analysis?: string) {
  return [
    "Corrija este erro do QAP Report encontrado no Monitoramento. Encontre a causa raiz, corrija e teste.",
    "",
    `- Categoria: ${row.category}`,
    `- Severidade: ${row.severity}`,
    `- Quando: ${new Date(row.created_at).toLocaleString("pt-BR")}`,
    `- Rota: ${row.route ?? "-"}`,
    `- Navegador: ${row.user_agent ?? "-"}`,
    `- Mensagem: ${row.message}`,
    "",
    "Stack:",
    "```",
    (row.stack ?? "(sem stack)").slice(0, 3000),
    "```",
    `Metadados: ${JSON.stringify(row.metadata ?? {}).slice(0, 1000)}`,
    ...(analysis ? ["", "Diagnóstico prévio da IA:", analysis] : []),
  ].join("\n");
}

/** Botões por registro: diagnóstico com IA + cópia de relatório. */
export function LogActions({ row }: { row: LogRow }) {
  const diagnoseFn = useServerFn(adminDiagnoseErrorLog);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const diag = useMutation({
    mutationFn: () => diagnoseFn({ data: { id: row.id } }),
    onSuccess: (r) => setAnalysis(r.analysis),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => diag.mutate()} disabled={diag.isPending}>
          {diag.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Bot className="mr-2 h-4 w-4" />
          )}
          Analisar com IA
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            copyWithFeedback(
              buildLovablePrompt(row, analysis ?? undefined),
              "Relatório copiado — cole no chat do Lovable",
            )
          }
        >
          <ClipboardCopy className="mr-2 h-4 w-4" />
          Copiar para correção
        </Button>
      </div>
      {analysis && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <Suspense fallback={<p className="whitespace-pre-wrap">{analysis}</p>}>
            <MarkdownRenderer content={analysis} />
          </Suspense>
        </div>
      )}
    </div>
  );
}

/** Ferramentas de autocura: aviso global + reparo de boletim. */
export function SelfHealingTools() {
  const qc = useQueryClient();
  const bannerFn = useServerFn(adminSetGlobalBanner);
  const repairFn = useServerFn(adminRepairBulletin);
  const [text, setText] = useState("");
  const [level, setLevel] = useState<"info" | "warning" | "critical">("warning");
  const [bulletinId, setBulletinId] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof repairFn>> | null>(null);

  const banner = useMutation({
    mutationFn: (active: boolean) => bannerFn({ data: { text, level, active } }),
    onSuccess: (_r, active) => {
      toast.success(active ? "Aviso publicado para todos" : "Aviso removido");
      qc.invalidateQueries({ queryKey: ["global-banner"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const repair = useMutation({
    mutationFn: (action: "inspect" | "unlock" | "restore" | "fix_json") =>
      repairFn({ data: { bulletinId: extractId(bulletinId), action } }),
    onSuccess: (r) => {
      setResult(r);
      if (r.changed) toast.success("Boletim reparado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validId = /^[0-9a-f-]{36}$/i.test(extractId(bulletinId));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4" /> Autocura e reparo
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Aviso global de emergência
          </Label>
          <Textarea
            value={text}
            maxLength={300}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: A geração por IA está instável. Seus rascunhos continuam salvos."
            rows={3}
          />
          <div className="flex flex-wrap items-center gap-2">
            {(["info", "warning", "critical"] as const).map((l) => (
              <Button
                key={l}
                size="sm"
                variant={level === l ? "default" : "outline"}
                onClick={() => setLevel(l)}
              >
                {l === "info" ? "Informação" : l === "warning" ? "Alerta" : "Crítico"}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => banner.mutate(true)}
              disabled={banner.isPending || !text.trim()}
            >
              Publicar aviso
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => banner.mutate(false)}
              disabled={banner.isPending}
            >
              Remover aviso
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="repair-id">Destravar boletim de um usuário</Label>
          <Input
            id="repair-id"
            value={bulletinId}
            onChange={(e) => setBulletinId(e.target.value)}
            placeholder="ID ou link do boletim (/bulletins/...)"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!validId || repair.isPending}
              onClick={() => repair.mutate("inspect")}
            >
              Verificar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!validId || repair.isPending}
              onClick={() => repair.mutate("fix_json")}
            >
              Corrigir dados corrompidos
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!validId || repair.isPending}
              onClick={() => repair.mutate("unlock")}
            >
              Voltar a rascunho
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!validId || repair.isPending}
              onClick={() => repair.mutate("restore")}
            >
              Tirar da lixeira
            </Button>
          </div>
          {result && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <p className="font-medium">{result.title || "(sem título)"}</p>
              <p className="text-muted-foreground">
                {result.type} · {result.status === "done" ? "Concluído" : "Rascunho"}
                {result.inTrash ? " · Na lixeira" : ""}
              </p>
              {result.problems.length ? (
                <ul className="mt-1 list-disc pl-4">
                  {result.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1">Nenhum problema encontrado.</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked disabled /> Todas as ações ficam restritas ao administrador.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function extractId(v: string) {
  const m = v.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : v.trim();
}
