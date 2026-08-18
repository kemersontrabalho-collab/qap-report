import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const saveInput = z.object({
  bulletinType: z.enum(["BA", "BO-COP", "BO-TC", "BOAT"]),
  category: z.string().trim().max(160).optional(),
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(100).max(20000),
  /** Consentimento explícito do autor para alimentar a base coletiva anônima. */
  shareToCommunity: z.boolean().optional(),
});

export type SavedBulletin = {
  id: string;
  bulletin_type: string;
  category: string | null;
  title: string;
  created_at: string;
};

/**
 * Salva um boletim já redigido pelo policial na biblioteca pessoal. Ele só é
 * anonimizado e enviado para a base coletiva (ainda sujeita a revisão manual)
 * quando o autor marca explicitamente o compartilhamento.
 */
export const saveExistingBulletin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("bulletins")
      .insert({
        user_id: context.userId,
        bulletin_type: data.bulletinType,
        category: data.category || null,
        title: data.title,
        content: data.content,
        status: "done",
        share_to_community: data.shareToCommunity === true,
        context: "Boletim salvo pelo usuário na biblioteca pessoal.",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as { id: string }).id };
  });


export const listSavedBulletins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedBulletin[]> => {
    const { data, error } = await context.supabase
      .from("bulletins")
      .select("id, bulletin_type, category, title, created_at")
      .eq("user_id", context.userId)
      .eq("status", "done")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []) as SavedBulletin[];
  });
