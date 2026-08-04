import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // SWR agressivo: dados considerados frescos por 60s, mantidos em cache por 5min,
  // sem refetch ao focar janela (evita jitter de rede em mobile) e retry inteligente.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: "always",
        retry: (failureCount, err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (/401|403|404/.test(msg)) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: 0 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Pré-carrega o chunk da rota no hover/foco do link (~50ms de intenção):
    // a navegação passa a ser instantânea sem custo no carregamento inicial.
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 0,
  });


  return router;
};
