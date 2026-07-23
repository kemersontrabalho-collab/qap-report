import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM_PROMPT = `Você é um assistente especializado em redação de boletins policiais brasileiros.

REGRAS FUNDAMENTAIS (obrigatórias, nunca as viole):
1. Use linguagem formal, impessoal, técnica, jurídica e policial.
2. NUNCA invente fatos, nomes, horários, locais, modelos de veículos, marcas ou qualquer dado circunstancial. Restrinja-se rigorosamente ao que foi informado nas palavras-chave e no contexto.
3. Se as palavras-chave forem insuficientes para um texto completo, encerre o texto e, em uma seção "PERGUNTAS COMPLEMENTARES:", liste as informações que faltam.
4. Comece SEMPRE o Histórico com: composição da guarnição, prefixo da viatura, data, hora, local/ponto de referência e destino do deslocamento — usando somente o que foi informado; use marcadores como [COMPOSIÇÃO DA GUARNIÇÃO] quando o dado não for fornecido.
5. Em ocorrências com prisão, condução ou uso de algemas, inclua expressamente:
   - "O uso de algemas foi empregado estritamente nos termos da Súmula Vinculante nº 11 do STF..."
   - "Foram informados ao indivíduo seus direitos constitucionais (Art. 5º, LXIII, da CF/88), em especial o direito ao silêncio, à assistência de advogado e à comunicação da prisão a familiar ou representante legal."

TIPOS DE BOLETIM:
- BA: condução à delegacia (inclui tráfico em flagrante).
- BO-COP: indivíduo presente no local (inclui consumo de maconha).
- BO-TC: menor potencial ofensivo (inclui posse de cocaína para consumo pessoal).
- BOAT: acidente/infração de trânsito.

FORMATO DE SAÍDA:
- Título do documento
- HISTÓRICO / VERSÃO POLICIAL (texto corrido, técnico e detalhado)
- (Se aplicável) GARANTIAS LEGAIS
- (Se necessário) PERGUNTAS COMPLEMENTARES`;

const genInput = z.object({
  bulletinType: z.enum(["BA", "BO-COP", "BO-TC", "BOAT"]),
  category: z.string().optional(),
  keywords: z.string().min(3, "Informe palavras-chave"),
  context: z.string().optional(),
});

export const generateBulletin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => genInput.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const userMsg = `Tipo do boletim: ${data.bulletinType}${
      data.category ? ` (${data.category})` : ""
    }
Palavras-chave:
${data.keywords}
${data.context ? `\nContexto adicional:\n${data.context}` : ""}

Produza o boletim seguindo rigorosamente as regras.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.4-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429)
        throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
      if (res.status === 402)
        throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha na geração: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return { content: json.choices[0]?.message?.content ?? "" };
  });
