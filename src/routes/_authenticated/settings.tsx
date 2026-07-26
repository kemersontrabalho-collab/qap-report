import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { Loader2, Moon, Sun, LogOut, Trash2, Smartphone, Apple, Share2, RefreshCw, Link2, BookOpen, LifeBuoy, BellRing, Send, Ticket, KeyRound, Copy, Power, Crown } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { InstallAppButton } from "@/components/InstallAppButton";
import { tutorialStore } from "@/lib/tutorial-store";
import { useServerFn } from "@tanstack/react-start";
import { sendSupportMessage } from "@/lib/support.functions";
import {
  amIFounder,
  createLifetimeCode,
  deleteCoupon,
  listMyCoupons,
  redeemCoupon,
  setCouponActive,
} from "@/lib/coupons.functions";


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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const [supportSubject, setSupportSubject] = useState<"duvida" | "reclamacao" | "sugestao" | "outro">("duvida");
  const [supportMsg, setSupportMsg] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const sendSupportFn = useServerFn(sendSupportMessage);

  // ----- Códigos de assinatura -----
  const amIFounderFn = useServerFn(amIFounder);
  const listCouponsFn = useServerFn(listMyCoupons);
  const createCodeFn = useServerFn(createLifetimeCode);
  const toggleCouponFn = useServerFn(setCouponActive);
  const deleteCouponFn = useServerFn(deleteCoupon);
  const redeemFn = useServerFn(redeemCoupon);

  const founderQ = useQuery({ queryKey: ["me", "founder"], queryFn: () => amIFounderFn() });
  const isFounder = founderQ.data === true;
  const couponsQ = useQuery({
    queryKey: ["coupons", "mine"],
    queryFn: () => listCouponsFn(),
    enabled: isFounder,
  });

  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  async function submitRedeem(e: React.FormEvent) {
    e.preventDefault();
    const code = redeemCode.trim();
    if (code.length < 3) {
      toast.error("Informe um código válido.");
      return;
    }
    setRedeeming(true);
    try {
      const res = await redeemFn({ data: { code } });
      toast.success(
        res.grants_lifetime
          ? "Código resgatado! Assinatura vitalícia ativada."
          : `Código resgatado! Assinatura estendida em ${res.duration_months} mês(es).`,
      );
      setRedeemCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível resgatar o código.");
    } finally {
      setRedeeming(false);
    }
  }

  const [newCodeNote, setNewCodeNote] = useState("");
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(1);
  const [newCodeExpiresDays, setNewCodeExpiresDays] = useState<number | "">("");
  const [newCodeCustom, setNewCodeCustom] = useState("");
  const [creatingCode, setCreatingCode] = useState(false);

  async function submitCreateCode(e: React.FormEvent) {
    e.preventDefault();
    setCreatingCode(true);
    try {
      await createCodeFn({
        data: {
          note: newCodeNote.trim(),
          maxUses: Math.max(1, Number(newCodeMaxUses) || 1),
          expiresInDays: newCodeExpiresDays === "" ? null : Number(newCodeExpiresDays),
          customCode: newCodeCustom.trim().toUpperCase(),
        },
      });
      toast.success("Código vitalício criado.");
      setNewCodeNote("");
      setNewCodeMaxUses(1);
      setNewCodeExpiresDays("");
      setNewCodeCustom("");
      couponsQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o código.");
    } finally {
      setCreatingCode(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function toggleCoupon(id: string, active: boolean) {
    try {
      await toggleCouponFn({ data: { id, active } });
      couponsQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar código.");
    }
  }

  async function removeCoupon(id: string) {
    if (!confirm("Excluir este código definitivamente? Resgates anteriores serão perdidos.")) return;
    try {
      await deleteCouponFn({ data: { id } });
      couponsQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao excluir.");
    }
  }



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

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();
      setProfile(
        (data as Profile) ?? {
          id: userData.user.id,
          full_name: "",
          rank: "",
          phone: "",
          email: userData.user.email ?? "",
          functional_id: "",
          avatar_url: null,
        },
      );
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    // remove bulletins first (RLS + cascade also handles auth removal on server-side manually)
    await supabase.from("bulletins").delete().eq("user_id", userData.user.id);
    await supabase.from("profiles").delete().eq("id", userData.user.id);
    await supabase.auth.signOut();
    toast.success("Conta e dados removidos.");
    navigate({ to: "/", replace: true });
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
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personalize sua experiência e seus dados de perfil.
          </p>
        </div>




        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Aparência</h2>

          <p className="mt-1 text-sm text-muted-foreground">Alterne entre tema claro e escuro.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
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

        <section className="rounded-2xl border bg-card p-5">
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

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4" /> Tutorial do aplicativo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Um guia passo a passo mostrando como usar cada parte do QAP Report: painel, criação de boletins, IA, casos semelhantes, PDF e mais.
          </p>
          <button
            onClick={() => tutorialStore.open()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent"
          >
            <BookOpen className="h-4 w-4" /> Iniciar tutorial
          </button>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><BellRing className="h-4 w-4" /> Notificações do dispositivo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ative para receber alertas do administrador e atualizações do app diretamente no seu dispositivo, mesmo com o QAP Report fechado.
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

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><LifeBuoy className="h-4 w-4" /> Suporte</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie dúvidas, reclamações ou sugestões. Sua mensagem chega diretamente à caixa de notificações do administrador.
          </p>
          <form onSubmit={submitSupport} className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Assunto</label>
              <select
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value as any)}
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
              {sendingSupport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar ao administrador
            </button>
          </form>
        </section>

        {/* ============ RESGATE DE CÓDIGO (apenas usuários comuns) ============ */}
        {founderQ.isSuccess && !isFounder && (
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold"><Ticket className="h-4 w-4" /> Resgatar código de assinatura</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recebeu um código do criador do QAP Report? Insira abaixo para ativar sua assinatura.
            </p>
            <form onSubmit={submitRedeem} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="Ex.: QAP-XXXXX-XXXXX"
                className="input flex-1 font-mono uppercase tracking-wider"
                maxLength={40}
              />
              <button
                type="submit"
                disabled={redeeming}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Resgatar
              </button>
            </form>
          </section>
        )}

        {/* ============ SÓ CRIADOR: gerar códigos vitalícios ============ */}
        {isFounder && (
          <section className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Crown className="h-4 w-4 text-primary" /> Códigos vitalícios (Criador)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gere códigos para conceder assinatura vitalícia a usuários específicos. Cada código pode ser usado uma vez por usuário, até o limite total definido.
            </p>

            <form onSubmit={submitCreateCode} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Anotação (opcional)">
                <input
                  value={newCodeNote}
                  onChange={(e) => setNewCodeNote(e.target.value)}
                  className="input"
                  placeholder="Ex.: Cap. Silva, 3º BPM"
                  maxLength={120}
                />
              </Field>
              <Field label="Código personalizado (opcional)">
                <input
                  value={newCodeCustom}
                  onChange={(e) => setNewCodeCustom(e.target.value.toUpperCase())}
                  className="input font-mono uppercase"
                  placeholder="Deixe em branco para gerar automaticamente"
                  maxLength={32}
                />
              </Field>
              <Field label="Nº máximo de usos">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={newCodeMaxUses}
                  onChange={(e) => setNewCodeMaxUses(Number(e.target.value))}
                  className="input"
                />
              </Field>
              <Field label="Expira em (dias, opcional)">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={newCodeExpiresDays}
                  onChange={(e) => setNewCodeExpiresDays(e.target.value === "" ? "" : Number(e.target.value))}
                  className="input"
                  placeholder="Sem expiração"
                />
              </Field>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={creatingCode}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {creatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  Gerar código vitalício
                </button>
              </div>
            </form>

            <div className="mt-6">
              <h3 className="text-sm font-semibold">Códigos gerados</h3>
              {couponsQ.isLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : !couponsQ.data || couponsQ.data.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nenhum código gerado ainda.</p>
              ) : (
                <ul className="mt-3 divide-y rounded-lg border bg-background">
                  {couponsQ.data.map((c: any) => {
                    const expired = c.expires_at && new Date(c.expires_at) <= new Date();
                    const exhausted = c.used_count >= c.max_uses;
                    return (
                      <li key={c.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">{c.code}</code>
                            {c.grants_lifetime && (
                              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                VITALÍCIO
                              </span>
                            )}
                            {!c.active && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                DESATIVADO
                              </span>
                            )}
                            {expired && (
                              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                                EXPIRADO
                              </span>
                            )}
                            {exhausted && (
                              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                                ESGOTADO
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {c.note ? <span>{c.note} · </span> : null}
                            {c.used_count}/{c.max_uses} usos
                            {c.expires_at
                              ? ` · expira ${new Date(c.expires_at).toLocaleDateString("pt-BR")}`
                              : " · sem expiração"}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copyCode(c.code)}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                            title="Copiar código"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copiar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCoupon(c.id, !c.active)}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                            title={c.active ? "Desativar" : "Reativar"}
                          >
                            <Power className="h-3.5 w-3.5" /> {c.active ? "Desativar" : "Reativar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCoupon(c.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}





        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Instalar o aplicativo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O QAP Report funciona como app instalável (PWA). Sem download em loja — usa o próprio navegador do celular.
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
            Após instalado, o QAP Report abre como um app nativo, com atalho na tela inicial e experiência em tela cheia.
          </p>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Atualizações e link oficial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique novas versões do QAP Report e compartilhe o link oficial com colegas de guarnição. Não instale APKs de terceiros.
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
                    await navigator.share({ title: "QAP Report", text: "Assistente de redação policial", url });
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
            O QAP Report é distribuído como Progressive Web App (PWA). Não há APK avulso: instalar direto do navegador garante origem verificada e atualização automática.
          </p>
        </section>

        <section className="rounded-2xl border bg-card p-5">
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
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
          >
            <Trash2 className="h-4 w-4" /> Excluir minha conta
          </button>
        </section>

        <style>{`.input{margin-top:.25rem;width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-background);padding:.5rem .75rem;font-size:.875rem;outline:none}
        .input:focus{box-shadow:0 0 0 2px var(--color-ring)}`}</style>
      </div>
      
    </AppShell>
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
