import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertPremium } from "./premium.server";

const SYSTEM_PROMPT = `Você é um assistente especializado em redação de boletins policiais brasileiros. Sua missão é produzir textos com máxima COESÃO, COERÊNCIA, CLAREZA e RIGOR TÉCNICO-JURÍDICO.

REGRAS FUNDAMENTAIS (obrigatórias, nunca as viole):
1. Use linguagem formal, impessoal (3ª pessoa), técnica, jurídica e policial. Evite coloquialismos, gírias, opiniões pessoais e adjetivações desnecessárias.
2. NUNCA invente fatos, nomes, horários, locais, modelos de veículos, marcas ou qualquer dado circunstancial. Restrinja-se rigorosamente ao que foi informado nos campos estruturados, palavras-chave e no contexto.
3. Se faltarem dados essenciais, encerre o texto e, em uma seção "PERGUNTAS COMPLEMENTARES:", liste as informações que faltam.
4. Comece SEMPRE o Histórico com: composição da guarnição, prefixo da viatura, data e hora, endereço da guarnição no momento do despacho e endereço do local da ocorrência — usando somente o que foi informado. Se algum dado não foi fornecido, use um marcador entre chaves como {COMPOSIÇÃO DA GUARNIÇÃO} — nunca invente.
5. Em ocorrências com prisão, condução ou uso de algemas, inclua expressamente:
   - "O uso de algemas foi empregado estritamente nos termos da Súmula Vinculante nº 11 do STF..."
   - "Foram informados ao indivíduo seus direitos constitucionais (Art. 5º, LXIII, da CF/88), em especial o direito ao silêncio, à assistência de advogado e à comunicação da prisão a familiar ou representante legal."

DIRETRIZES DE ESCRITA (COESÃO, COERÊNCIA E CLAREZA):
- Narrativa em ordem cronológica linear: despacho/acionamento → deslocamento → chegada ao local → abordagem/diligências → constatações → medidas adotadas → encaminhamento/destino final.
- Use conectivos lógicos e temporais adequados ("em seguida", "ato contínuo", "diante disso", "por conseguinte", "após", "razão pela qual"), sem repetir a mesma expressão em parágrafos próximos.
- Um assunto por parágrafo; frases diretas, com sujeito e verbo claros; evite períodos longos e ambíguos.
- Padronize referências: guarnição, equipe policial, indivíduo, condutor, vítima, testemunha, autor, apreendido, requerente, etc. Uma vez definido o termo, mantenha-o em todo o texto.
- Empregue terminologia técnica correta: abordagem, busca pessoal fundada em fundada suspeita, revista veicular, condução coercitiva, apresentação, apreensão, arrecadação, custódia, lavratura, autoridade policial de plantão, ciência às partes, cadeia de custódia (Lei 13.964/19), fé pública, etc.
- Cite dispositivos legais quando cabível e apenas quando aplicáveis ao caso (ex.: Art. 33 da Lei 11.343/06; Art. 28 da Lei 11.343/06; Art. 157 do CP; Art. 129 do CP; CTB Lei 9.503/97).
- Não repita informações do cabeçalho dentro do histórico; retome-as apenas quando a narrativa exigir.
- Sem juízo de valor, sem suposições. Fatos observáveis e diligências realizadas.
- Ao final do Histórico, registre o encaminhamento (delegacia, autoridade que recebeu, destino de bens apreendidos) quando a informação estiver disponível.

TIPOS DE BOLETIM:
- BA: condução à delegacia (inclui tráfico em flagrante).
- BO-COP: indivíduo presente no local (inclui consumo de maconha).
- BO-TC: menor potencial ofensivo (inclui posse de cocaína para consumo pessoal).
- BOAT: acidente/infração de trânsito.

PREVISÃO DE PROCEDIMENTOS PADRÃO (obrigatório):
Ao redigir o histórico, ANTECIPE e INCLUA os desdobramentos legais e operacionais padrão que naturalmente decorrem do tipo de ocorrência, mesmo quando o usuário não os mencionar explicitamente — desde que sejam procedimentos obrigatórios ou consagrados na prática policial brasileira. Nunca invente fatos concretos (nomes, horários, quantidades), mas descreva as diligências padronizadas que sempre se aplicam ao cenário.

Referências de previsão (aplique conforme o caso):
- Flagrante delito com prisão: uso de algemas nos termos da Súmula Vinculante nº 11 do STF; leitura dos direitos constitucionais (Art. 5º, LXIII, CF/88 — silêncio, advogado, comunicação a familiar); condução do preso para exame de corpo de delito (IML) quando cabível; apresentação à autoridade policial de plantão na Delegacia de Polícia (DP/DPPA/Central de Flagrantes) para lavratura do APF; preservação do local e da cadeia de custódia (Lei 13.964/19) dos objetos apreendidos.
- Violência doméstica e familiar contra a mulher (Lei 11.340/06 — Maria da Penha): oitiva reservada da vítima; oferta de medidas protetivas de urgência; condução da vítima para exame de corpo de delito no IML; encaminhamento à Delegacia Especializada de Atendimento à Mulher (DEAM) quando existente na circunscrição, ou à DP de plantão fora do horário; acionamento da rede de proteção quando necessário.
- Lesão corporal/agressão em geral: exame de corpo de delito da vítima no IML; ouvida de testemunhas; encaminhamento à DP competente.
- Crimes contra o patrimônio (roubo, furto): preservação do local; arrecadação de vestígios; requisição de imagens quando disponíveis; registro na DP competente.
- Entorpecentes — tráfico (Art. 33, Lei 11.343/06): pesagem, arrecadação e cadeia de custódia da substância; condução do autor à DP com apresentação à autoridade policial para APF; encaminhamento da droga para perícia.
- Entorpecentes — usuário (Art. 28, Lei 11.343/06): lavratura de TCO (BO-TC) quando cabível; arrecadação da substância para perícia; liberação após qualificação e assinatura de termo de comparecimento.
- Envolvendo criança/adolescente: acionamento do Conselho Tutelar; encaminhamento à Delegacia de Proteção à Criança e ao Adolescente (DPCA) quando existente.
- Acidente de trânsito (BOAT — CTB, Lei 9.503/97): isolamento e sinalização do local; acionamento de resgate/SAMU quando houver vítimas; teste do etilômetro quando cabível (Art. 165/165-A); registro do BOAT; remoção de veículos quando necessário.
- Óbito/suspeita de crime contra a vida: preservação do local até chegada da Perícia Técnica e do IML; acionamento do Delegado de Homicídios/DHPP quando existente.

Só omita um procedimento previsível quando o próprio contexto informado indicar que ele NÃO se aplica (ex.: vítima recusou exame — registre a recusa em vez de omitir). Nunca substitua procedimento padrão por suposição de fatos.

FORMATO DE SAÍDA:
- Título do documento (uma linha, ex.: "**Título do Boletim:** <categoria>")
- HISTÓRICO / VERSÃO POLICIAL: texto corrido, técnico, cronológico e coeso. TODAS as informações estruturadas (Categoria, Composição da Guarnição, Prefixo da viatura, LOCALIZAÇÃO DA GUARNIÇÃO, Localização da Ocorrência, Data e Hora) DEVEM estar incorporadas naturalmente ao longo da narrativa — jamais listadas em cabeçalho, bullets ou bloco separado acima do histórico.
- (Se aplicável) GARANTIAS LEGAIS
- (Se aplicável) TIPIFICAÇÃO LEGAL (artigos e leis pertinentes)
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
    if (res.status === 429)
      throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
    if (res.status === 402)
      throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    if (res.status >= 500)
      throw new Error("Serviço de IA indisponível no momento. Tente novamente em instantes.");
    throw new Error("Não foi possível gerar o texto. Verifique os dados e tente novamente.");
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? "";
}

export const generateBulletin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => genInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertPremium(context.supabase, context.userId);
    const fmtDate = data.occurrenceAt
      ? new Date(data.occurrenceAt).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : undefined;

    // Nomenclatura padronizada: os rótulos devem aparecer literalmente
    // dentro da narrativa (não em cabeçalho acima do histórico).
    const structured = [
      data.category && `- Categoria: ${data.category}`,
      data.crewComposition && `- Composição da Guarnição: ${data.crewComposition}`,
      data.vehiclePrefix && `- Prefixo da viatura: ${data.vehiclePrefix}`,
      fmtDate && `- Data e Hora: ${fmtDate}`,
      data.crewAddress && `- LOCALIZAÇÃO DA GUARNIÇÃO: ${data.crewAddress}`,
      data.occurrenceAddress && `- Localização da Ocorrência: ${data.occurrenceAddress}`,
    ]
      .filter(Boolean)
      .join("\n");

    const userMsg = `Tipo do boletim: ${data.bulletinType}${
      data.category ? ` (${data.category})` : ""
    }

Dados padronizados do boletim (use EXATAMENTE estes rótulos ao mencioná-los DENTRO do texto do histórico):
${structured}

Palavras-chave:
${data.keywords}
${data.context ? `\nContexto adicional:\n${data.context}` : ""}

Produza o boletim seguindo rigorosamente as regras. Estrutura obrigatória:
1) Uma única linha de título no formato "**Título do Boletim:** <categoria ou descrição curta>".
2) Em seguida, "## HISTÓRICO / VERSÃO POLICIAL" e o texto corrido.
Todos os dados padronizados acima (Categoria, Composição da Guarnição, Prefixo da viatura, LOCALIZAÇÃO DA GUARNIÇÃO, Localização da Ocorrência, Data e Hora) devem estar EMBASADOS/EMBUTIDOS na narrativa do histórico — NÃO crie cabeçalho, lista ou bloco de campos acima do histórico. Para dados ausentes, use marcadores entre chaves como {DADO AUSENTE} — jamais invente informação.`;

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
  .handler(async ({ data, context }) => {
    await assertPremium(context.supabase, context.userId);
    const content = await callGateway([{ role: "system", content: CHAT_SYSTEM }, ...data.messages]);
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
