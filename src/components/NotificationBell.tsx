import { useEffect, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationsRead } from "@/lib/notifications.functions";

export function NotificationBell() {
  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationsRead);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listFn(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const markMut = useMutation({
    mutationFn: (ids?: string[]) => markFn({ data: { ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-lg border hover:bg-accent"
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[92vw] overflow-hidden rounded-xl border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">Notificações</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markMut.mutate(undefined)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                >
                  <Check className="h-3 w-3" /> Marcar todas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="grid h-6 w-6 place-items-center rounded-md hover:bg-accent"
                aria-label="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Sem notificações no momento.
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`px-3 py-2.5 ${!n.read ? "bg-accent/30" : ""}`}
                    onClick={() => {
                      if (!n.read) markMut.mutate([n.id]);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium">{n.title}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleString("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
