import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listAdminActivity, markAdminActivityRead } from "@/lib/admin-activity.functions";

export function AdminActivityBell() {
  const [open, setOpen] = useState(false);
  const list = useServerFn(listAdminActivity);
  const mark = useServerFn(markAdminActivityRead);
  const qc = useQueryClient();
  const seen = useRef<Set<string> | null>(null);
  const { data, isPending, isError } = useQuery({ queryKey: ["admin-activity"], queryFn: () => list(), refetchInterval: 15_000 });
  useEffect(() => {
    if (!data) return;
    if (seen.current) {
      for (const item of data.items) {
        if (!item.read_at && !seen.current.has(item.id)) {
          if (!open) toast.info(item.title, { description: item.body });
          void qc.invalidateQueries({ queryKey: [item.event_type === "signup" ? "admin-users" : "admin-pix"] });
          void qc.invalidateQueries({ queryKey: ["admin-stats"] });
        }
      }
    }
    seen.current = new Set(data.items.map((item) => item.id));
  }, [data, qc, open]);
  const read = useMutation({ mutationFn: (id?: string) => mark({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-activity"] }), onError: () => toast.error("Não foi possível marcar o aviso como lido.") });
  return (
    <>
      <Button variant="outline" size="icon" className="relative shrink-0" aria-label={`Avisos do administrador, ${data?.unread ?? 0} não lidos`} onClick={() => { toast.dismiss(); setOpen(true); }}>
        <Bell className="h-4 w-4" />
        {!!data?.unread && <span className="absolute -right-1 -top-1 rounded-full bg-destructive px-1 text-xs text-destructive-foreground">{data.unread > 99 ? "99+" : data.unread}</span>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 [&>button]:hidden" aria-describedby={undefined}>
          <DialogHeader className="flex-row items-center justify-between gap-2 border-b p-4">
            <DialogTitle className="text-base">Avisos do administrador</DialogTitle>
            <Button variant="ghost" size="icon" aria-label="Fechar avisos" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
          </DialogHeader>
          <div className="flex items-center justify-between border-b p-3 text-sm">
            <span>{data?.unread ?? 0} não lidos</span>
            <Button variant="ghost" size="sm" disabled={!data?.unread || read.isPending} onClick={() => read.mutate(undefined)}><CheckCheck className="mr-2 h-4 w-4" />Marcar todos</Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isPending && <Loader2 className="m-6 h-5 w-5 animate-spin" />}
            {isError && <p className="p-4 text-sm text-destructive">Não foi possível carregar os avisos.</p>}
            {!isPending && !isError && !data?.items.length && <p className="p-6 text-sm text-muted-foreground">Nenhum aviso no momento.</p>}
            {data?.items.map((item) => <article key={item.id} className={`border-b p-4 ${item.read_at ? "" : "bg-accent/30"}`}>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 break-words text-sm text-muted-foreground">{item.body}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</time>
                {!item.read_at && <Button variant="ghost" size="sm" disabled={read.isPending} onClick={() => read.mutate(item.id)}>Marcar lido</Button>}
              </div>
            </article>)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}