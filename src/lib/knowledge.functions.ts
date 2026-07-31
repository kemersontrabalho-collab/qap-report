import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertPremium } from "./premium.server";

const findInput = z.object({
  query: z.string().min(3).max(2000),
  bulletinType: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

export type SimilarCase = {
  id: string;
  bulletin_type: string;
  category: string | null;
  title: string;
  occurrence_address: string | null;
  content: string;
  rank: number;
  source?: "own" | "template" | "community";
};

export const findSimilarBulletins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => findInput.parse(data))
  .handler(async ({ data, context }): Promise<SimilarCase[]> => {
    await assertPremium(context.supabase, context.userId);
    const limit = data.limit ?? 3;
    const [own, tpl, community] = await Promise.all([
      context.supabase.rpc("match_bulletin_knowledge", {
        _query: data.query,
        _bulletin_type: data.bulletinType ?? undefined,
        _limit: limit,
      }),
      context.supabase.rpc("match_bulletin_templates", {
        _query: data.query,
        _bulletin_type: data.bulletinType ?? undefined,
        _limit: limit,
      }),
      context.supabase.rpc("match_community_knowledge", {
        _query: data.query,
        _bulletin_type: data.bulletinType ?? undefined,
        _limit: limit,
      }),
    ]);
    if (own.error) throw new Error(own.error.message);
    if (tpl.error) throw new Error(tpl.error.message);
    // A base coletiva é complementar: falha nela não deve quebrar as sugestões.
    const merged = [
      ...((own.data ?? []) as SimilarCase[]).map((r) => ({ ...r, source: "own" as const })),
      ...((tpl.data ?? []) as SimilarCase[]).map((r) => ({ ...r, source: "template" as const })),
      ...(community.error
        ? []
        : ((community.data ?? []) as SimilarCase[]).map((r) => ({ ...r, source: "community" as const }))),
    ] as SimilarCase[];
    merged.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
    return merged.slice(0, limit);
  });
