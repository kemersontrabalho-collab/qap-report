import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
};

export const findSimilarBulletins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => findInput.parse(data))
  .handler(async ({ data, context }): Promise<SimilarCase[]> => {
    const { data: rows, error } = await context.supabase.rpc("match_bulletin_knowledge", {
      _query: data.query,
      _bulletin_type: data.bulletinType ?? undefined,
      _limit: data.limit ?? 3,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as SimilarCase[];
  });
