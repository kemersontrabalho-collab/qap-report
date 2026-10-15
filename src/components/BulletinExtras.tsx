import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Camera,
  ChevronDown,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  auditBulletin,
  extractDocument,
  fixBulletin,
  type AuditIssue,
} from "@/lib/bulletins.functions";
import {
  localLegalChecks,
  newId,
  ROLE_LABEL,
  SEIZED_LABEL,
  type InvolvedParty,
  type PartyRole,
  type SeizedItem,
  type SeizedKind,
} from "@/lib/bulletin-extras";

const input =
  "w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function Collapsible({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(count > 0);
  return (
    <div className="surface-card reveal rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="text-sm font-semibold">
          {title}
          {count > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {count}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

const SEIZED_HINT: Record<SeizedKind, { desc: string; details: string; serial?: string }> = {
  arma: { desc: "Tipo (pistola, revólver, munição)", details: "Calibre, marca", serial: "Numeração" },
  entorpecente: { desc: "Substância (maconha, cocaína...)", details: "Formato e peso (ex.: 35 pinos, 42 g)" },
  dinheiro: { desc: "Ex.: R$ 420,00 em espécie", details: "Cédulas fracionadas" },
  eletronico: { desc: "Ex.: celular", details: "Marca/modelo", serial: "IMEI" },
  outro: { desc: "Descrição", details: "Características" },
};

export function SeizedItemsSection({
  items,
  onChange,
}: {
  items: SeizedItem[];
  onChange: (v: SeizedItem[]) => void;
}) {
  const set = (id: string, patch: Partial<SeizedItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  return (
    <Collapsible title="Materiais apreendidos" count={items.length}>
      {items.map((i) => {
        const h = SEIZED_HINT[i.kind];
        return (
          <div key={i.id} className="space-y-2 rounded-xl border p-3">
            <div className="flex gap-2">
              <select
                value={i.kind}
                onChange={(e) => set(i.id, { kind: e.target.value as SeizedKind })}
                className={input}
                aria-label="Tipo de material"
              >
                {(Object.keys(SEIZED_LABEL) as SeizedKind[]).map((k) => (
                  <option key={k} value={k}>
                    {SEIZED_LABEL[k]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x.id !== i.id))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-destructive hover:bg-destructive/10"
                aria-label="Remover item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <input value={i.description} onChange={(e) => set(i.id, { description: e.target.value })} placeholder={h.desc} className={input} />
            <div className="grid grid-cols-2 gap-2">
              <input value={i.quantity ?? ""} onChange={(e) => set(i.id, { quantity: e.target.value })} placeholder="Quantidade" className={input} />
              <input value={i.details ?? ""} onChange={(e) => set(i.id, { details: e.target.value })} placeholder={h.details} className={input} />
            </div>
            {h.serial && (
              <input value={i.serial ?? ""} onChange={(e) => set(i.id, { serial: e.target.value })} placeholder={h.serial} className={input} />
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...items, { id: newId(), kind: "entorpecente", description: "" }])}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar item
      </button>
    </Collapsible>
  );
}

async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = url;
    });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function InvolvedPartiesSection({
  parties,
  onChange,
  online,
}: {
  parties: InvolvedParty[];
  onChange: (v: InvolvedParty[]) => void;
  online: boolean;
}) {
  const extractFn = useServerFn(extractDocument);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const set = (id: string, patch: Partial<InvolvedParty>) =>
    onChange(parties.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function onFile(file: File | undefined) {
    const id = targetRef.current;
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !id) return;
    setReading(id);
    try {
      const image = await compressImage(file);
      const r = await extractFn({ data: { image } });
      const p = parties.find((x) => x.id === id);
      set(id, {
        name: r.name || p?.name || "",
        rg: r.rg || p?.rg,
        cpf: r.cpf || p?.cpf,
        birthDate: r.birthDate || p?.birthDate,
        motherName: r.motherName || p?.motherName,
      });
      toast.success("Dados lidos. Confira antes de seguir — a foto foi descartada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler documento");
    } finally {
      setReading(null);
    }
  }

  return (
    <Collapsible title="Envolvidos" count={parties.length}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">
        Use a câmera para ler RG/CNH. A foto não é salva; os envolvidos nunca vão para a base
        coletiva.
      </p>
      {parties.map((p) => (
        <div key={p.id} className="space-y-2 rounded-xl border p-3">
          <div className="flex gap-2">
            <select value={p.role} onChange={(e) => set(p.id, { role: e.target.value as PartyRole })} className={input} aria-label="Papel">
              {(Object.keys(ROLE_LABEL) as PartyRole[]).map((k) => (
                <option key={k} value={k}>
                  {ROLE_LABEL[k]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!online || reading === p.id}
              onClick={() => {
                targetRef.current = p.id;
                fileRef.current?.click();
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border hover:bg-accent disabled:opacity-50"
              aria-label="Ler documento pela câmera"
              title={online ? "Ler documento pela câmera" : "Indisponível sem internet"}
            >
              {reading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => onChange(parties.filter((x) => x.id !== p.id))}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-destructive hover:bg-destructive/10"
              aria-label="Remover envolvido"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input value={p.name} onChange={(e) => set(p.id, { name: e.target.value })} placeholder="Nome completo" className={input} />
          <div className="grid grid-cols-2 gap-2">
            <input value={p.rg ?? ""} onChange={(e) => set(p.id, { rg: e.target.value })} placeholder="RG" className={input} />
            <input value={p.cpf ?? ""} onChange={(e) => set(p.id, { cpf: e.target.value })} placeholder="CPF" className={input} />
            <input value={p.birthDate ?? ""} onChange={(e) => set(p.id, { birthDate: e.target.value })} placeholder="Nascimento" className={input} />
            <input value={p.motherName ?? ""} onChange={(e) => set(p.id, { motherName: e.target.value })} placeholder="Nome da mãe" className={input} />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...parties, { id: newId(), role: "vitima", name: "" }])}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar envolvido
      </button>
    </Collapsible>
  );
}

export function AuditPanel({
  content,
  bulletinType,
  online,
  onApply,
}: {
  content: string;
  bulletinType: string;
  online: boolean;
  onApply: (text: string) => void;
}) {
  const auditFn = useServerFn(auditBulletin);
  const fixFn = useServerFn(fixBulletin);
  const [issues, setIssues] = useState<AuditIssue[] | null>(null);
  const [busy, setBusy] = useState<"audit" | "fix" | null>(null);
  const [proposal, setProposal] = useState<string | null>(null);
  const local = localLegalChecks(content);

  if (!content || content.trim().length < 50) return null;

  async function runAudit() {
    setBusy("audit");
    try {
      const r = await auditFn({ data: { content, bulletinType } });
      setIssues(r.issues);
      if (r.issues.length === 0) toast.success("Nenhuma vulnerabilidade encontrada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na auditoria");
    } finally {
      setBusy(null);
    }
  }

  async function runFix() {
    const list = [
      ...(issues ?? []).map((i) => `${i.title}: ${i.suggestion}${i.excerpt ? ` (trecho: "${i.excerpt}")` : ""}`),
      ...(issues ? [] : local.map((l) => `${l.title}: ${l.suggestion}`)),
    ].slice(0, 12);
    if (!list.length) return;
    setBusy("fix");
    try {
      const r = await fixFn({ data: { content, issues: list } });
      setProposal(r.content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao corrigir");
    } finally {
      setBusy(null);
    }
  }

  const shown = issues ?? local.map((l) => ({ severity: "media" as const, title: l.title, excerpt: "", suggestion: l.suggestion }));

  return (
    <div className="border-b p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4 text-primary" /> Auditoria Jurídica
          <span className="text-xs font-normal text-muted-foreground">
            {issues ? "análise completa" : "verificação rápida"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={runAudit}
            disabled={!online || busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-60"
          >
            {busy === "audit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Analisar com IA
          </button>
          {shown.length > 0 && (
            <button
              type="button"
              onClick={runFix}
              disabled={!online || busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy === "fix" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Corrigir com IA
            </button>
          )}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Nenhum alerta na verificação rápida. Use “Analisar com IA” para uma revisão completa.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {shown.map((i, n) => (
            <li key={n} className="flex gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs">
              <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${i.severity === "alta" ? "text-destructive" : "text-warning"}`} />
              <span>
                <strong>{i.title}.</strong> {i.suggestion}
                {i.excerpt && <em className="block text-muted-foreground">“{i.excerpt}”</em>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {proposal && (
        <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs font-semibold">Texto corrigido — revise antes de aceitar</div>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs">{proposal}</pre>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onApply(proposal);
                setProposal(null);
                setIssues(null);
                toast.success("Correção aplicada");
              }}
              className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-success-foreground"
            >
              Aceitar
            </button>
            <button type="button" onClick={() => setProposal(null)} className="rounded-lg border px-3 py-1.5 text-xs">
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
