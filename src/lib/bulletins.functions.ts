import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM_PROMPT = `Você é um assistente especializado em redação de boletins policiais brasileiros.

REGRAS FUNDAMENTAIS (obrigatórias, nunca as viole):
1. Use linguagem formal, impessoal, técnica, jurídica e policial.
2. NUNCA invente fatos, nomes, horários, locais, modelos de veículos, marcas ou qualquer dado circunstancial. Restrinja-se rigorosamente ao que foi informado nos campos estruturados, palavras-chave e no contexto.
3. Se faltarem dados essenciais, encerre o texto e, em uma seção "PERGUNTAS COMPLEMENTARES:", liste as informações que faltam.
4. Comece SEMPRE o Histórico com: composição da guarnição, prefixo da viatura, data e hora, endereço da guarnição no momento do despacho e endereço do local da ocorrência — usando somente o que foi informado. Se algum dado não foi fornecido, use um marcador entre chaves como {COMPOSIÇÃO DA GUARNIÇÃO} — nunca invente.
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
  crewComposition: z.string().optional(),
  vehiclePrefix: z.string().optional(),
  occurrenceAt: z.string().optional(),
  crewAddress: z.string().optional(),
  occurrenceAddress: z.string().optional(),
});

async function callGateway(messages: { role: string; content: string }[]) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: "openai/gpt-5.4-mini", messages }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    if (res.status >= 500) throw new Error("Serviço de IA indisponível no momento. Tente novamente em instantes.");
    throw new Error("Não foi possível gerar o texto. Verifique os dados e tente novamente.");
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? "";
}

export const generateBulletin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => genInput.parse(data))
  .handler(async ({ data }) => {
    const fmtDate = data.occurrenceAt
      ? new Date(data.occurrenceAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
      : undefined;

    // Nomenclatura padronizada (Requisito 04). Estes rótulos DEVEM aparecer
    // literalmente no documento final para alimentar corretamente a base de
    // conhecimento e a exportação em PDF.
    const structured = [
      `- Título do Boletim: ${data.category ? `${data.category}` : "{TÍTULO}"}`,
      data.category && `- Categoria: ${data.category}`,
      data.crewComposition && `- Composição da Guarnição: ${data.crewComposition}`,
      data.vehiclePrefix && `- Prefixo da viatura: ${data.vehiclePrefix}`,
      `- Data e Hora: ${fmtDate ?? "{DATA E HORA}"}`,
      data.crewAddress && `- LOCALIZAÇÃO DA GUARNIÇÃO: ${data.crewAddress}`,
      data.occurrenceAddress && `- Localização da Ocorrência: ${data.occurrenceAddress}`,
    ]
      .filter(Boolean)
      .join("\n");

    const userMsg = `Tipo do boletim: ${data.bulletinType}${
      data.category ? ` (${data.category})` : ""
    }

Campos padronizados do boletim (use EXATAMENTE estes rótulos no cabeçalho do documento gerado):
${structured}

Palavras-chave:
${data.keywords}
${data.context ? `\nContexto adicional:\n${data.context}` : ""}

Produza o boletim seguindo rigorosamente as regras. O documento final deve iniciar com um cabeçalho contendo, nesta ordem: Título do Boletim, Categoria, Composição da Guarnição, LOCALIZAÇÃO DA GUARNIÇÃO, Localização da Ocorrência, Data e Hora. Em seguida, o HISTÓRICO/VERSÃO POLICIAL. Para dados ausentes, use marcadores entre chaves como {DADO AUSENTE} — jamais invente informação.`;

    const content = await callGateway([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ]);
    return { content };
  });

// ---- Chat de dúvidas jurídico-policiais (efêmero) ----
const askInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20),
});

const CHAT_SYSTEM = `Você é um assistente jurídico especializado em direito penal, processual penal e legislação policial brasileira.
Responda dúvidas de policiais militares e civis sobre:
- Qual documento (BA, BO-COP, BO-TC, BOAT) é indicado para cada situação.
- Enquadramento legal (artigos, leis, incisos) e penas previstas.
- Procedimentos operacionais (Súmula Vinculante 11 do STF, direitos do preso, etc.).
Seja objetivo, cite artigos e leis quando possível. Se não tiver certeza, diga que a orientação depende do caso concreto e recomende consultar a autoridade policial competente.
Use português formal. Nunca invente dispositivos legais.`;

export const askAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => askInput.parse(data))
  .handler(async ({ data }) => {
    const content = await callGateway([
      { role: "system", content: CHAT_SYSTEM },
      ...data.messages,
    ]);
    return { content };
  });

// ---- Geocodificação reversa via Google Maps ----
const geoInput = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => geoInput.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) throw new Error("Google Maps não configurado");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=pt-BR`,
        {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": mapsKey,
          },
          signal: controller.signal,
        },
      );
      if (!res.ok) {
        throw new Error(`Falha ao consultar endereço (código ${res.status}).`);
      }
      const json = (await res.json()) as { results?: { formatted_address?: string }[] };
      return { address: json.results?.[0]?.formatted_address ?? "" };
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") {
        throw new Error("Tempo esgotado ao consultar endereço. Tente novamente.");
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  });

