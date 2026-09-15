import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import {
  Loader2,
  Moon,
  Sun,
  LogOut,
  Trash2,
  Smartphone,
  Apple,
  Share2,
  RefreshCw,
  Link2,
  BookOpen,
  LifeBuoy,
  BellRing,
  Send,
  Crown,
  Library,
  Save,
  Users,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InstallAppButton } from "@/components/InstallAppButton";
import { tutorialStore } from "@/lib/tutorial-store";
import { useServerFn } from "@tanstack/react-start";
import { sendSupportMessage } from "@/lib/support.functions";
import { deleteMyAccount } from "@/lib/account.functions";
import { saveExistingBulletin } from "@/lib/library.functions";
import { CATEGORIES_BY_TYPE } from "@/lib/bulletin-categories";
import { CategorySearch } from "@/components/CategorySearch";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações · QAP Report" }] }),
  component: SettingsPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  rank: string | null;
  phone: string | null;
  email: string | null;
  functional_id: string | null;
  avatar_url: string | null;
};

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const [supportSubject, setSupportSubject] = useState<
    "duvida" | "reclamacao" | "sugestao" | "outro"
  >("duvida");
  const [supportMsg, setSupportMsg] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const sendSupportFn = useServerFn(sendSupportMessage);
  const deleteAccountFn = useServerFn(deleteMyAccount);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function requestNotifications() {
    if (!("Notification" in window)) {
      toast.error("Este dispositivo/navegador não suporta notificações.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm === "granted") {
        toast.success("Notificações ativadas neste dispositivo.");
        try {
          new Notification("QAP Report", {
            body: "Notificações ativadas com sucesso.",
            icon: "/icon-192.png",
          });
        } catch {
          /* alguns navegadores exigem SW para exibir */
        }
      } else if (perm === "denied") {
        toast.error("Permissão negada. Ative manualmente nas configurações do navegador.");
      } else {
        toast.info("Permissão não concedida.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao solicitar permissão");
    }
  }

  async function submitSupport(e: React.FormEvent) {
    e.preventDefault();
    if (supportMsg.trim().length < 5) {
      toast.error("Escreva uma mensagem com pelo menos 5 caracteres.");
      return;
    }
    setSendingSupport(true);
    try {
      await sendSupportFn({ data: { subject: supportSubject, message: supportMsg.trim() } });
      toast.success("Mensagem enviada ao administrador. Obrigado!");
      setSupportMsg("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar");
    } finally {
      setSendingSupport(false);
    }
  }

  // Perfil via React Query: aproveita cache/SWR e evita refetch a cada visita.
  const { data: profileData, isLoading: loading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, rank, phone, email, functional_id, avatar_url")
        .eq("id", userData.user.id)
        .maybeSingle();
      return (
        (data as Profile) ?? {
          id: userData.user.id,
          full_name: "",
          rank: "",
          phone: "",
          email: userData.user.email ?? "",
          functional_id: "",
          avatar_url: null,
        }
      );
    },
  });

  useEffect(() => {
    if (profileData) setProfile((prev) => prev ?? profileData);
  }, [profileData]);

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: profile.id,
      full_name: profile.full_name,
      rank: profile.rank,
      phone: profile.phone,
      email: profile.email,
      functional_id: profile.functional_id,
      avatar_url: profile.avatar_url,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Dados atualizados");
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function deleteAccount() {
    if (!confirm("Tem certeza que deseja excluir sua conta? Esta ação é irreversível.")) return;
    if (!confirm("Confirme novamente: todos os seus dados serão apagados.")) return;
    setDeletingAccount(true);
    try {
      await deleteAccountFn();
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      toast.success("Conta e dados removidos.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error((err as Error).message ?? "Não foi possível excluir a conta.");
    } finally {
      setDeletingAccount(false);
    }
  }

  if (loading || !profile) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="aurora relative">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-line)] bg-card/60 px-3 py-1 text-fluid-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-bright)]" />
              Sua conta
            </span>
            <h1 className="mt-3 text-fluid-2xl font-bold tracking-tight">
              Configurações do <span className="text-gradient-brand">app</span>
            </h1>
            <p className="measure mt-1.5 text-fluid-sm text-muted-foreground">
              Personalize sua experiência, seus dados de perfil e sua assinatura.
            </p>
          </div>
        </div>


        <section className="reveal rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-[var(--shadow-sm)]">
          <h2 className="flex items-center gap-2 font-semibold">
            <Crown className="h-4 w-4 text-primary" /> Assinatura
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ative seu plano mensal, resgate um código promocional ou envie comprovante de Pix.
          </p>
          <Link
            to="/assinar"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Crown className="h-4 w-4" /> Gerenciar assinatura
          </Link>
        </section>

        <SavedBulletinsSection />

        <section className="surface-card reveal rounded-2xl p-5">
          <h2 className="font-semibold">Aparência</h2>

          <p className="mt-1 text-sm text-muted-foreground">Alterne entre tema claro e escuro.</p>
          <div className="mt-4 grid grid-cols-1 gap-2 xs:grid-cols-2">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                theme === "light" ? "border-primary bg-primary/5" : "hover:bg-accent"
              }`}
            >
              <Sun className="h-4 w-4" /> Claro
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                theme === "dark" ? "border-primary bg-primary/5" : "hover:bg-accent"
              }`}
            >
              <Moon className="h-4 w-4" /> Escuro
            </button>
          </div>
        </section>

        <section className="surface-card reveal rounded-2xl p-5">
          <h2 className="font-semibold">Dados pessoais</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo">
              <input
                value={profile.full_name ?? ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Graduação">
              <input
                value={profile.rank ?? ""}
                onChange={(e) => setProfile({ ...profile, rank: e.target.value })}
                className="input"
                placeholder="Ex.: Soldado, Cabo, Sargento"
              />
            </Field>
            <Field label="Celular">
              <input
                value={profile.phone ?? ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Email">
              <input
                value={profile.email ?? ""}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="input"
                type="email"
              />
            </Field>
            <Field label="Identidade funcional (opcional)">
              <input
                value={profile.functional_id ?? ""}
                onChange={(e) => setProfile({ ...profile, functional_id: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alterações
          </button>
        </section>

        <section className="surface-card reveal rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-4 w-4" /> Tutorial do aplicativo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Um guia passo a passo mostrando como usar cada parte do QAP Report: painel, criação de
            boletins, IA, casos semelhantes, PDF e mais.
          </p>
          <button
            onClick={() => tutorialStore.open()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent"
          >
            <BookOpen className="h-4 w-4" /> Iniciar tutorial
          </button>
        </section>

        <section className="surface-card reveal rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <BellRing className="h-4 w-4" /> Notificações do dispositivo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ative para receber alertas do administrador e atualizações do app diretamente no seu
            dispositivo, mesmo com o QAP Report fechado.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={requestNotifications}
              disabled={notifPerm === "granted" || notifPerm === "unsupported"}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <BellRing className="h-4 w-4" />
              {notifPerm === "granted" ? "Notificações ativadas" : "Ativar notificações"}
            </button>
            <span className="text-xs text-muted-foreground">
              {notifPerm === "granted" && "Permissão concedida."}
              {notifPerm === "denied" && "Permissão negada. Altere nas configurações do navegador."}
              {notifPerm === "default" && "Aguardando sua permissão."}
              {notifPerm === "unsupported" && "Não suportado neste dispositivo."}
            </span>
          </div>
        </section>

        <section className="surface-card reveal rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <LifeBuoy className="h-4 w-4" /> Suporte
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie dúvidas, reclamações ou sugestões. Sua mensagem chega diretamente à caixa de
            notificações do administrador.
          </p>
          <form onSubmit={submitSupport} className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Assunto</label>
              <select
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value as typeof supportSubject)}
                className="input"
              >
                <option value="duvida">Dúvida</option>
                <option value="reclamacao">Reclamação</option>
                <option value="sugestao">Sugestão</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Mensagem</label>
              <textarea
                value={supportMsg}
                onChange={(e) => setSupportMsg(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Descreva sua dúvida, reclamação ou sugestão..."
                className="input resize-y"
              />
              <div className="mt-1 text-right text-[11px] text-muted-foreground">
                {supportMsg.length}/2000
              </div>
            </div>
            <button
              type="submit"
              disabled={sendingSupport}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {sendingSupport ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar ao administrador
            </button>
          </form>
        </section>

        <section className="surface-card reveal rounded-2xl p-5">
          <h2 className="font-semibold">Instalar o aplicativo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O QAP Report funciona como app instalável (PWA). Sem download em loja — usa o próprio
            navegador do celular.
          </p>
          <div className="mt-4">
            <InstallAppButton />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() =>
                alert(
                  "iOS (iPhone/iPad):\n1. Abra o site no Safari.\n2. Toque no botão Compartilhar (quadrado com seta).\n3. Escolha 'Adicionar à Tela de Início'.\n4. Confirme em 'Adicionar'.",
                )
              }
              className="flex items-start gap-3 rounded-lg border p-3 text-left text-sm hover:bg-accent"
            >
              <Apple className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-medium">Instalar no iOS</div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Share2 className="h-3 w-3" /> Safari → Compartilhar → Adicionar à Tela de Início
                </div>
              </div>
            </button>
            <button
              onClick={() =>
                alert(
                  "Android:\n1. Abra o site no Chrome.\n2. Toque no menu (três pontos) no canto superior direito.\n3. Escolha 'Instalar aplicativo' ou 'Adicionar à tela inicial'.\n4. Confirme em 'Instalar'.",
                )
              }
              className="flex items-start gap-3 rounded-lg border p-3 text-left text-sm hover:bg-accent"
            >
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-medium">Instalar no Android</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Chrome → Menu → Instalar aplicativo
                </div>
              </div>
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Após instalado, o QAP Report abre como um app nativo, com atalho na tela inicial e
            experiência em tela cheia.
          </p>
        </section>

        <section className="surface-card reveal rounded-2xl p-5">
          <h2 className="font-semibold">Atualizações e link oficial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique novas versões do QAP Report e compartilhe o link oficial com colegas de
            guarnição. Não instale APKs de terceiros.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={async () => {
                try {
                  if ("serviceWorker" in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map((r) => r.update()));
                    toast.success("Verificação concluída. Se houver nova versão, será aplicada.");
                  } else {
                    toast.info("Este navegador não suporta atualizações em segundo plano.");
                  }
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Falha ao verificar atualizações");
                }
              }}
              className="flex items-start gap-3 rounded-lg border p-3 text-left text-sm hover:bg-accent"
            >
              <RefreshCw className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-medium">Verificar atualizações</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Busca a versão mais recente e reinstala em segundo plano.
                </div>
              </div>
            </button>
            <button
              onClick={async () => {
                const url = "https://qap-report.lovable.app/";
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: "QAP Report",
                      text: "Assistente de redação policial",
                      url,
                    });
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast.success("Link copiado");
                  }
                } catch {
                  /* usuário cancelou */
                }
              }}
              className="flex items-start gap-3 rounded-lg border p-3 text-left text-sm hover:bg-accent"
            >
              <Link2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-medium">Compartilhar link oficial</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Envie a URL segura para colegas de guarnição instalarem em seus aparelhos.
                </div>
              </div>
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            O QAP Report é distribuído como Progressive Web App (PWA). Não há APK avulso: instalar
            direto do navegador garante origem verificada e atualização automática.
          </p>
        </section>

        <section className="surface-card reveal rounded-2xl p-5">
          <h2 className="font-semibold">Sessão</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="font-semibold text-destructive">Excluir conta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Remove seu perfil e todos os seus boletins. Esta ação não pode ser desfeita.
          </p>
          <button
            onClick={deleteAccount}
            disabled={deletingAccount}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60"
          >
            {deletingAccount ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deletingAccount ? "Excluindo..." : "Excluir minha conta"}
          </button>
        </section>

        <style>{`.input{margin-top:.25rem;width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-background);padding:.5rem .75rem;font-size:.875rem;outline:none}
        .input:focus{box-shadow:0 0 0 2px var(--color-ring)}`}</style>
      </div>
    </AppShell>
  );
}

const BULLETIN_TYPES = ["BA", "BO-COP", "BO-TC", "BOAT"] as const;

function SavedBulletinsSection() {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveExistingBulletin);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof BULLETIN_TYPES)[number]>("BA");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [share, setShare] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Informe um título com pelo menos 3 caracteres.");
      return;
    }
    if (content.trim().length < 100) {
      toast.error("Cole o boletim completo (mínimo de 100 caracteres).");
      return;
    }
    setSaving(true);
    try {
      await saveFn({
        data: {
          bulletinType: type,
          category: category || undefined,
          title: title.trim(),
          content: content.trim(),
          shareToCommunity: share,
        },
      });
      toast.success(
        share
          ? "Boletim salvo e enviado para revisão da base coletiva."
          : "Boletim salvo na sua biblioteca pessoal.",
      );
      setTitle("");
      setContent("");
      setCategory("");
      setShare(false);
      setOpen(false);

      qc.invalidateQueries({ queryKey: ["saved-bulletins"] });
      qc.invalidateQueries({ queryKey: ["bulletins"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface-card reveal relative z-30 rounded-2xl p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Library className="h-4 w-4" /> Meus boletins salvos
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Guarde boletins que você já redigiu. Eles ficam na sua biblioteca pessoal, visível apenas
        para você, e só vão para a base coletiva se você autorizar no formulário.
      </p>


      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <Save className="h-4 w-4" /> {open ? "Fechar formulário" : "Salvar um boletim"}
      </button>

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo de boletim">
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as typeof type);
                  setCategory("");
                }}
                className="input"
              >
                {BULLETIN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoria (opcional)">
              <CategorySearch
                categories={CATEGORIES_BY_TYPE[type] ?? []}
                value={category || null}
                bulletinType={type}
                onChange={(v) => setCategory(v ?? "")}
                placeholder="Pesquisar categoria..."
              />
            </Field>
          </div>
          <Field label="Título">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              maxLength={160}
              placeholder="Ex.: Tráfico de drogas — flagrante em via pública"
            />
          </Field>
          <Field label="Texto do boletim">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              maxLength={20000}
              placeholder="Cole aqui o histórico/versão policial já redigido..."
              className="input resize-y"
            />
          </Field>
          <label className="flex items-start gap-2 rounded-lg border border-[var(--surface-line)] p-3 text-xs">
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-muted-foreground">
              Autorizo compartilhar este boletim, de forma anonimizada, com a base coletiva. Revise o
              texto e remova nomes, endereços e demais dados pessoais antes de marcar — a
              anonimização automática é apenas um apoio e o envio ainda passa por revisão manual.
            </span>
          </label>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" /> Sem essa autorização, o boletim fica somente na sua
              biblioteca pessoal.
            </span>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar boletim
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
