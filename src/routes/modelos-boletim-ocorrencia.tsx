import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  FileText,
  Copy,
  CheckCircle,
  Shield,
  Scale,
  ChevronRight,
  AlertTriangle,
  Car,
  User,
  Briefcase,
  Download,
} from "lucide-react";
import logoAsset from "@/assets/qap-report-logo.webp.asset.json";
import { useState } from "react";

export const Route = createFileRoute("/modelos-boletim-ocorrencia")({
  head: () => ({
    meta: [
      {
        title: "Modelos de Boletim de Ocorrência Prontos | QAP Report",
      },
      {
        name: "description",
        content:
          "Modelos prontos de boletim de ocorrência (BA, BO-COP, BO-TC, BOAT) para roubo, furto, acidente e dano. Textos técnicos para copiar e usar.",
      },
      {
        property: "og:title",
        content: "Modelos de Boletim de Ocorrência Prontos | QAP Report",
      },
      {
        property: "og:description",
        content:
          "Modelos prontos de boletim de ocorrência (BA, BO-COP, BO-TC, BOAT) para roubo, furto, acidente e dano. Textos técnicos para copiar e usar.",
      },
      { property: "og:type", content: "article" },
      {
        property: "og:url",
        content: "https://qap-report.lovable.app/modelos-boletim-ocorrencia",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Modelos de Boletim de Ocorrência Prontos — BA, BO-COP, BO-TC, BOAT",
      },
      {
        name: "twitter:description",
        content:
          "Modelos de boletim de ocorrência prontos para roubo, furto, perda de documentos, acidente de trânsito, lesão corporal e dano.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://qap-report.lovable.app/modelos-boletim-ocorrencia",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Modelos de Boletim de Ocorrência Prontos",
          description:
            "Modelos de boletim de ocorrência prontos para roubo, furto, perda de documentos, acidente de trânsito, lesão corporal e dano.",
          author: { "@type": "Organization", name: "QAP Report" },
          publisher: { "@type": "Organization", name: "QAP Report" },
          inLanguage: "pt-BR",
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": "https://qap-report.lovable.app/modelos-boletim-ocorrencia",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "O que é um boletim de ocorrência?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O boletim de ocorrência é o registro oficial de um fato apresentado à autoridade policial, com dados objetivos, cronológicos e técnicos sobre a ocorrência.",
              },
            },
            {
              "@type": "Question",
              name: "Como fazer um boletim de ocorrência online?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Em muitos estados brasileiros é possível registrar ocorrências de menor potencial ofensivo, extravio ou perda de documentos pela Delegacia Virtual ou Delegacia Eletrônica da Polícia Civil local. Para ocorrências mais complexas, a lavratura presencial pode ser necessária.",
              },
            },
            {
              "@type": "Question",
              name: "Roubo e furto são a mesma coisa?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Não. No roubo, a subtração ocorre mediante grave ameaça ou violência contra a pessoa. No furto, a subtração é feita sem violência ou ameaça, geralmente de forma sorrateira.",
              },
            },
            {
              "@type": "Question",
              name: "Posso registrar perda de documentos online?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Sim. A maioria das Polícias Civis permite o registro de extravio ou perda de documentos e objetos pessoais pela internet, desde que não haja indícios de furto ou roubo.",
              },
            },
            {
              "@type": "Question",
              name: "Preciso de advogado para fazer um boletim de ocorrência?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Não. A vítima pode registrar a ocorrência diretamente na autoridade policial. O advogado pode ser consultado posteriormente para acompanhamento processual.",
              },
            },
            {
              "@type": "Question",
              name: "Quanto tempo leva para fazer um BO online?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O preenchimento digital costuma levar de 10 a 30 minutos, dependendo da quantidade de informações e documentos necessários.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: ModelsPage,
});

const modelos = [
  {
    id: "roubo",
    tipo: "BA / BO-COP",
    titulo: "Roubo",
    icone: AlertTriangle,
    quando: [
      "Subtração de bem mediante grave ameaça ou violência contra a pessoa.",
      "A vítima foi abordada, rendida ou coagida.",
      "Houve uso de arma ou ameaça de lesão.",
    ],
    dados: [
      "Data, hora e local exatos da abordagem.",
      "Quantidade e características dos autores.",
      "Descrição dos objetos subtraídos (marca, modelo, valor, numeração de série/IMEI).",
      "Características da via e testemunhas, se houver.",
      "Dano físico ou psicológico sofrido pela vítima.",
    ],
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em patrulhamento pela [LOCALIZAÇÃO DA GUARNIÇÃO], foi acionada via COPOM para atender ocorrência de roubo na [LOCALIZAÇÃO DA OCORRÊNCIA], envolvendo a vítima [NOME COMPLETO DA VÍTIMA], [QUALIFICAÇÃO DA VÍTIMA].

A vítima relatou que, durante o deslocamento pela via pública, foi abordada por [NÚMERO] indivíduo(s), que mediante [graves ameaças / uso de violência / exibição de arma de fogo], subtraiu(s) [DESCREVER OBJETOS], avaliados em [VALOR APROXIMADO].

Após a subtração, o(s) autor(es) evadiu-se em direção [DIREÇÃO DE FUGA], não sendo localizado(s) no momento. Foram realizadas buscas pelo perímetro, sem êxito.

A vítima apresentava [ESTADO FÍSICO/PSICOLÓGICO] e foi orientada quanto aos procedimentos de acompanhamento investigativo. Os objetos subtraídos foram inseridos no sistema de busca e apreensão, com os respectivos números de série, quando informados.

Diante do exposto, lavrou-se o presente boletim para registro e encaminhamentos de praxe.`,
    dicas: [
      "Distinga claramente roubo (violência/ameaça) de furto (subtração sem violência).",
      "Registre o valor estimado dos bens, mas evite suposições sobre a identidade dos autores.",
      "Mencione a presença de câmeras de segurança ou testemunhas apenas se constatada no local.",
    ],
  },
  {
    id: "furto",
    tipo: "BO-COP / BO-TC",
    titulo: "Furto",
    icone: Briefcase,
    quando: [
      "Subtração de bem sem violência ou ameaça contra a pessoa.",
      "A vítima percebeu a falta do objeto após deixá-lo desatendido.",
      "Houve arrombamento ou descuido que facilitou a subtração.",
    ],
    dados: [
      "Data e horário em que a vítima percebeu a falta.",
      "Última vez que o objeto foi visto e local exato.",
      "Descrição do bem subtraído (marca, cor, modelo, numeração, valor).",
      "Indícios de arrombamento, corte ou violação.",
      "Testemunhas ou câmeras disponíveis.",
    ],
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em patrulhamento na [LOCALIZAÇÃO DA GUARNIÇÃO], foi acionada para atender ocorrência de furto na [LOCALIZAÇÃO DA OCORRÊNCIA], envolvendo a vítima [NOME COMPLETO DA VÍTIMA], [QUALIFICAÇÃO DA VÍTIMA].

A vítima relatou que, por volta de [HORÁRIO APROXIMADO], deixou [OBJETO/LOCAL] sob sua responsabilidade e, ao retornar, constatou a subtração de [DESCREVER OBJETOS], avaliados em [VALOR APROXIMADO]. Não houve confronto físico, ameaça ou violência contra a pessoa durante a subtração.

Foram verificados [indícios de arrombamento / ausência de indícios de violação], sendo registrado o estado do local por meio de [fotografias / croqui / constatação visual]. Não foram localizados autores no momento da chegada da guarnição.

A vítima foi orientada sobre a importância de informações adicionais (nota fiscal, IMEI, número de série) e sobre o encaminhamento do caso para as investigações competentes.

Diante do exposto, lavrou-se o presente boletim para registro dos fatos e encaminhamentos de praxe.`,
    dicas: [
      "Evite atribuir autoria sem identificação concreta.",
      "Informe se a subtração ocorreu em local público ou privado.",
      "Se houver indícios de arrombamento, descreva o dano com precisão.",
    ],
  },
  {
    id: "perda-documentos",
    tipo: "BO-TC / Extravio",
    titulo: "Perda / Extravio de documentos e objetos",
    icone: FileText,
    quando: [
      "Documentos ou objetos pessoais desapareceram sem indícios de furto ou roubo.",
      "A vítima não sabe informar onde perdeu o item.",
      "Necessidade de registro para segunda via de documentos ou comunicação a bancos.",
    ],
    dados: [
      "Descrição do documento ou objeto perdido.",
      "Número do documento, quando aplicável.",
      "Última vez que o documento foi visto.",
      "Data e horário aproximados da perda.",
      "Circunstâncias do extravio (viagem, mudança, esquecimento em local público).",
    ],
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em atendimento na [LOCALIZAÇÃO DA OCORRÊNCIA], registrou o extravio/perda de documentos e/ou objetos pessoais comunicado por [NOME COMPLETO], [QUALIFICAÇÃO], residente em [ENDEREÇO].

O declarante informou que, por volta de [DATA/HORA APROXIMADA], perdeu o(s) seguinte(s) item(ns): [DESCREVER DOCUMENTOS/OBJETOS], número(s) [NÚMEROS], não possuindo informações sobre o local exato da perda nem indícios de subtração por terceiros.

O extravio foi comunicado para fins de registro, obtenção de segunda via de documentos e eventuais comunicações a instituições financeiras. O declarante foi cientificado de que, caso surjam indícios de furto ou roubo, deverá comparecer à delegacia para registro específico.

Diante do exposto, lavrou-se o presente boletim para registro do extravio.`,
    dicas: [
      "Deixe claro que não há indícios de crime, apenas extravio.",
      "Inclua os números dos documentos para facilitar a identificação futura.",
      "Oriente a vítima sobre a necessidade de comunicação a bancos e cartórios, se for o caso.",
    ],
  },
  {
    id: "acidente-transito",
    tipo: "BOAT",
    titulo: "Acidente de trânsito",
    icone: Car,
    quando: [
      "Colisão envolvendo veículos, motocicletas, ciclistas ou pedestres.",
      "Ocorrência com vítimas ou danos materiais.",
      "Necessidade de registro para seguradora ou perícia.",
    ],
    dados: [
      "Data, hora e local precisos do acidente.",
      "Descrição dos veículos envolvidos (placa, marca, modelo, cor).",
      "Identificação dos condutores e respectivas CNHs.",
      "Relato de como ocorreu a colisão (direção, sinalização, velocidade aproximada).",
      "Vítimas, testemunhas e estado da via.",
      "Danos materiais e envolvimento de terceiros.",
    ],
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em patrulhamento na [LOCALIZAÇÃO DA GUARNIÇÃO], foi acionada para atender acidente de trânsito na [LOCALIZAÇÃO DA OCORRÊNCIA].

No local, constatou-se o envolvimento de [DESCREVER VEÍCULOS: placa, marca, modelo, cor], conduzidos por [NOME DOS CONDUTORES], portadores das CNHs [NÚMEROS].

Segundo relato dos envolvidos, o acidente ocorreu da seguinte forma: [DESCRIÇÃO DO FATO — direção, sinalização, condições da via, velocidade aproximada].

Houve [danos materiais / vítimas com lesões de natureza leve/grave]. Foram tomadas as providências de [isolamento do local, acionamento de socorro médico, registro fotográfico, testemunho]. A via apresentava [ESTADO DA VIA] e a sinalização era [DESCREVER].

Os condutores foram orientados quanto aos procedimentos de troca de informações e eventual perícia. O trânsito foi [liberado / desviado / interditado] até a regularização do local.

Diante do exposto, lavrou-se o presente Boletim de Acidente de Trânsito (BOAT) para registro dos fatos.`,
    dicas: [
      "Descreva a dinâmica do acidente sem atribuir culpa antecipadamente.",
      "Mencione sinais de embriaguez ou teste de bafômetro apenas se constatados.",
      "Registre se houve vítimas e as providências de socorro.",
    ],
  },
  {
    id: "lesao-corporal",
    tipo: "BO-COP / BO-TC",
    titulo: "Lesão corporal",
    icone: User,
    quando: [
      "Vítima apresenta lesões físicas resultantes de agressão, acidente ou outra conduta.",
      "Necessidade de registro para atestado médico ou acompanhamento legal.",
      "Ocorrência de violência doméstica, briga ou acidente de trabalho fora da empresa.",
    ],
    dados: [
      "Identificação da vítima e do suposto autor, quando conhecido.",
      "Descrição das lesões e parte do corpo atingida.",
      "Circunstâncias da agressão ou acidente.",
      "Uso de arma branca ou arma de fogo, se houver.",
      "Testemunhas e estado mental da vítima.",
      "Encaminhamento médico realizado.",
    ],
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em patrulhamento na [LOCALIZAÇÃO DA GUARNIÇÃO], foi acionada para atender ocorrência de lesão corporal na [LOCALIZAÇÃO DA OCORRÊNCIA], envolvendo a vítima [NOME COMPLETO], [QUALIFICAÇÃO].

A vítima relatou que sofreu agressão/lesão nas seguintes circunstâncias: [DESCREVER O FATO — motivo aparente, ação do autor, local e momento]. Apresentava lesões visíveis em [PARTE DO CORPO], com [CARACTERÍSTICAS DAS LESÕES].

O suposto autor, [NOME, SE CONHECIDO], [QUALIFICAÇÃO], [esteve no local / evadiu-se / não foi identificado]. A vítima [recebeu / recusou] atendimento médico e foi [encaminhada / orientada a procurar] atendimento na unidade de saúde [NOME DA UNIDADE].

Foram colhidas as declarações da vítima e de [testemunhas], sendo registradas as providências iniciais. A vítima foi orientada sobre seus direitos e sobre a necessidade de atestado médico-legal para subsidiar a investigação.

Diante do exposto, lavrou-se o presente boletim para registro dos fatos e encaminhamentos competentes.`,
    dicas: [
      "Registre as lesões de forma objetiva, sem diagnosticar gravidade médica.",
      "Se houver violência doméstica, mencione as medidas protetivas e encaminhamentos.",
      "Evite reproduzir ofensas ou discutir culpa no corpo do boletim.",
    ],
  },
  {
    id: "dano",
    tipo: "BO-COP / BO-TC",
    titulo: "Dano",
    icone: Shield,
    quando: [
      "Dano a patrimônio público ou particular (muros, veículos, mobiliário urbano).",
      "Depredação, pichação ou vandalismo.",
      "Dano causado em desordem ou durante eventos públicos.",
    ],
    dados: [
      "Descrição do bem danificado e localização exata.",
      "Estimativa do valor do prejuízo, se possível.",
      "Indícios de autoria (testemunhas, câmeras, vestígios).",
      "Data e hora aproximadas do dano.",
      "Proprietário ou responsável pelo bem.",
    ],
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em patrulhamento na [LOCALIZAÇÃO DA GUARNIÇÃO], foi acionada para atender ocorrência de dano na [LOCALIZAÇÃO DA OCORRÊNCIA].

No local, constatou-se dano(s) em [DESCREVER BEM DANIFICADO — muro, veículo, mobiliário urbano, equipamento público], de propriedade de [NOME DO PROPRIETÁRIO / ÓRGÃO PÚBLICO], com prejuízo estimado em [VALOR APROXIMADO], quando informado.

O dano apresenta as seguintes características: [TIPO DE DANO — riscos, pichação, quebra, amassados, corte]. A suspeita de autoria recai sobre [NOME, SE CONHECIDO / indivíduos não identificados], tendo em vista [FUNDAMENTO — testemunha, câmera, vestígio].

Foram realizadas [buscas no local / isolamento / registro fotográfico / contato com a autoridade responsável pelo patrimônio]. O responsável foi orientado sobre a lavratura de termo de ressarcimento ou acompanhamento investigativo.

Diante do exposto, lavrou-se o presente boletim para registro do dano e encaminhamentos de praxe.`,
    dicas: [
      "Descreva o dano sem supor intenção, salvo quando houver indícios claros.",
      "Identifique a titularidade do bem (particular, municipal, estadual, federal).",
      "Registre o valor estimado apenas se houver base para o cálculo.",
    ],
  },
];

function useCopy() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return { copiedId, copy };
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="prose prose-neutral mt-4 max-w-none text-sm leading-relaxed text-muted-foreground dark:prose-invert">
        {children}
      </div>
    </section>
  );
}

function ModelCard({
  modelo,
  copiedId,
  onCopy,
}: {
  modelo: (typeof modelos)[number];
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}) {
  const Icon = modelo.icone;

  return (
    <section id={modelo.id} className="scroll-mt-24 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{modelo.tipo}</p>
          <h2 className="text-xl font-semibold tracking-tight">{modelo.titulo}</h2>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Quando usar</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {modelo.quando.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Dados necessários</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {modelo.dados.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Texto-modelo</h3>
            <button
              onClick={() => onCopy(modelo.id, modelo.texto)}
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
              aria-label={`Copiar modelo ${modelo.titulo}`}
            >
              {copiedId === modelo.id ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
          <div className="mt-2 overflow-x-auto rounded-xl bg-accent/50 p-4">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {modelo.texto}
            </pre>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Dicas técnicas</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {modelo.dicas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ModelsPage() {
  const { copiedId, copy } = useCopy();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="QAP Report" className="h-10 w-10 object-contain" />
          <span className="text-lg font-semibold tracking-tight">QAP Report</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            to="/guia-redacao-tecnica"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Guia
          </Link>
          <Link to="/modelos-boletim-ocorrencia" className="text-sm font-medium text-foreground">
            Modelos
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Começar
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <article>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Modelos prontos
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Modelos de boletim de ocorrência para incidentes comuns
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Textos técnicos e jurídicos prontos para copiar, preencher e usar em ocorrências de
              roubo, furto, perda de documentos, acidente de trânsito, lesão corporal e dano. Edite
              com a QAP Report em segundos.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Criar boletim com IA <ChevronRight className="h-4 w-4" />
              </Link>
              <a
                href="/modelos-boletim-ocorrencia.docx"
                download
                className="inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-accent"
              >
                <Download className="h-4 w-4" />
                Baixar modelos em DOCX
              </a>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {modelos.map((modelo) => (
                <ModelCard key={modelo.id} modelo={modelo} copiedId={copiedId} onCopy={copy} />
              ))}

              <Section icon={Scale} title="Como usar os modelos com segurança">
                <p>
                  Os modelos acima são estruturas de redação. Antes de enviar o boletim, substitua
                  todos os placeholders entre colchetes (ex: <code>[HORA]</code>,{" "}
                  <code>[LOCALIZAÇÃO DA OCORRÊNCIA]</code>) por dados reais, verificados e
                  objetivos. Nunca invente testemunhas, valores ou circunstâncias que não constem na
                  ocorrência.
                </p>
                <p>
                  A redação técnica policial exige: fidelidade aos fatos, cronologia clara,
                  terminologia jurídica adequada e ausência de opinião pessoal. Use a QAP Report
                  para acelerar o preenchimento, mas revise sempre o resultado final antes de
                  assinar.
                </p>
              </Section>
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">Índice de modelos</h3>
                <nav className="mt-4 space-y-2">
                  {modelos.map((modelo) => {
                    const Icon = modelo.icone;
                    return (
                      <a
                        key={modelo.id}
                        href={`#${modelo.id}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Icon className="h-4 w-4" />
                        {modelo.titulo}
                      </a>
                    );
                  })}
                </nav>
              </div>

              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">Checklist antes de enviar</h3>
                <ul className="mt-4 space-y-3">
                  {[
                    "Todos os placeholders foram substituídos.",
                    "Data e hora estão no formato correto.",
                    "Não há opinião pessoal no texto.",
                    "Roubo e furto foram diferenciados corretamente.",
                    "Testemunhas e câmeras só constam se confirmadas.",
                    "Fundamento legal foi citado com moderação.",
                    "Texto foi revisado por um superior, quando exigido.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border bg-primary p-5 text-primary-foreground shadow-sm">
                <h3 className="font-semibold">Gere boletins em segundos</h3>
                <p className="mt-2 text-sm opacity-90">
                  A QAP Report transforma palavras-chave em boletins BA, BO-COP, BO-TC e BOAT com
                  linguagem técnica e fundamento jurídico.
                </p>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-foreground px-4 py-2 text-sm font-medium text-primary hover:opacity-90"
                >
                  Criar conta gratuita <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">Leia também</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <Link
                    to="/guia-redacao-tecnica"
                    className="block text-muted-foreground hover:text-foreground"
                  >
                    Guia de redação técnica de BO
                  </Link>
                  <p className="text-muted-foreground">
                    <strong>Tipos de boletim:</strong> BA, BO-COP, BO-TC e BOAT.
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Súmula Vinculante 11:</strong> ausência de flagrante não impede o Termo
                    Circunstanciado.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </article>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} QAP Report · Ferramenta de apoio à redação policial
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/guia-redacao-tecnica" className="hover:text-foreground">
              Guia de redação técnica
            </Link>
            <Link to="/modelos-boletim-ocorrencia" className="hover:text-foreground">
              Modelos de BO
            </Link>
            <Link to="/auth" className="hover:text-foreground">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
