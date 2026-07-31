import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Valida no servidor se o usuário tem acesso premium (trial ativo,
 * assinatura ativa/vitalícia ou papel de fundador).
 *
 * Causa raiz do problema corrigido: o bloqueio de trial existia apenas no
 * `beforeLoad` da rota autenticada (cliente). Qualquer chamada direta às
 * funções de servidor continuava funcionando com o trial vencido.
 */
export async function assertPremium(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("is_premium_user", { _user_id: userId });
  if (error) throw new Error("Não foi possível validar sua assinatura. Tente novamente.");
  if (!data) {
    throw new Error(
      "Seu período de teste acabou. Assine um plano ou resgate um cupom em Configurações para continuar.",
    );
  }
}
