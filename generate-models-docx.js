const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, PageBreak } = require("docx");
const fs = require("fs");

const modelos = [
  {
    id: "roubo",
    tipo: "BA / BO-COP",
    titulo: "Roubo",
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
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em patrulhamento pela [LOCALIZAÇÃO DA GUARNIÇÃO], foi acionada via COPOM para atender ocorrência de roubo na [LOCALIZAÇÃO DA OCORRÊNCIA], envolvendo a vítima [NOME COMPLETO DA VÍTIMA], [QUALIFICAÇÃO DA VÍTIMA].\n\nA vítima relatou que, durante o deslocamento pela via pública, foi abordada por [NÚMERO] indivíduo(s), que mediante [graves ameaças / uso de violência / exibição de arma de fogo], subtraiu(s) [DESCREVER OBJETOS], avaliados em [VALOR APROXIMADO].\n\nApós a subtração, o(s) autor(es) evadiu-se em direção [DIREÇÃO DE FUGA], não sendo localizado(s) no momento. Foram realizadas buscas pelo perímetro, sem êxito.\n\nA vítima apresentava [ESTADO FÍSICO/PSICOLÓGICO] e foi orientada quanto aos procedimentos de acompanhamento investigativo. Os objetos subtraídos foram inseridos no sistema de busca e apreensão, com os respectivos números de série, quando informados.\n\nDiante do exposto, lavrou-se o presente boletim para registro e encaminhamentos de praxe.`,
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
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em patrulhamento na [LOCALIZAÇÃO DA GUARNIÇÃO], foi acionada para atender ocorrência de furto na [LOCALIZAÇÃO DA OCORRÊNCIA], envolvendo a vítima [NOME COMPLETO DA VÍTIMA], [QUALIFICAÇÃO DA VÍTIMA].\n\nA vítima relatou que, por volta de [HORÁRIO APROXIMADO], deixou [OBJETO/LOCAL] sob sua responsabilidade e, ao retornar, constatou a subtração de [DESCREVER OBJETOS], avaliados em [VALOR APROXIMADO]. Não houve confronto físico, ameaça ou violência contra a pessoa durante a subtração.\n\nForam verificados [indícios de arrombamento / ausência de indícios de violação], sendo registrado o estado do local por meio de [fotografias / croqui / constatação visual]. Não foram localizados autores no momento da chegada da guarnição.\n\nA vítima foi orientada sobre a importância de informações adicionais (nota fiscal, IMEI, número de série) e sobre o encaminhamento do caso para as investigações competentes.\n\nDiante do exposto, lavrou-se o presente boletim para registro dos fatos e encaminhamentos de praxe.`,
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
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em atendimento na [LOCALIZAÇÃO DA OCORRÊNCIA], registrou o extravio/perda de documentos e/ou objetos pessoais comunicado por [NOME COMPLETO], [QUALIFICAÇÃO], residente em [ENDEREÇO].\n\nO declarante informou que, por volta de [DATA/HORA APROXIMADA], perdeu o(s) seguinte(s) item(ns): [DESCREVER DOCUMENTOS/OBJETOS], número(s) [NÚMEROS], não possuindo informações sobre o local exato da perda nem indícios de subtração por terceiros.\n\nO extravio foi comunicado para fins de registro, obtenção de segunda via de documentos e eventuais comunicações a instituições financeiras. O declarante foi cientificado de que, caso surjam indícios de furto ou roubo, deverá comparecer à delegacia para registro específico.\n\nDiante do exposto, lavrou-se o presente boletim para registro do extravio.`,
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
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em patrulhamento na [LOCALIZAÇÃO DA GUARNIÇÃO], foi acionada para atender acidente de trânsito na [LOCALIZAÇÃO DA OCORRÊNCIA].\n\nNo local, constatou-se o envolvimento de [DESCREVER VEÍCULOS: placa, marca, modelo, cor], conduzidos por [NOME DOS CONDUTORES], portadores das CNHs [NÚMEROS].\n\nSegundo relato dos envolvidos, o acidente ocorreu da seguinte forma: [DESCRIÇÃO DO FATO — direção, sinalização, condições da via, velocidade aproximada].\n\nHouve [danos materiais / vítimas com lesões de natureza leve/grave]. Foram tomadas as providências de [isolamento do local, acionamento de socorro médico, registro fotográfico, testemunho]. A via apresentava [ESTADO DA VIA] e a sinalização era [DESCREVER].\n\nOs condutores foram orientados quanto aos procedimentos de troca de informações e eventual perícia. O trânsito foi [liberado / desviado / interditado] até a regularização do local.\n\nDiante do exposto, lavrou-se o presente Boletim de Acidente de Trânsito (BOAT) para registro dos fatos.`,
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
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em patrulhamento na [LOCALIZAÇÃO DA GUARNIÇÃO], foi acionada para atender ocorrência de lesão corporal na [LOCALIZAÇÃO DA OCORRÊNCIA], envolvendo a vítima [NOME COMPLETO], [QUALIFICAÇÃO].\n\nA vítima relatou que sofreu agressão/lesão nas seguintes circunstâncias: [DESCREVER O FATO — motivo aparente, ação do autor, local e momento]. Apresentava lesões visíveis em [PARTE DO CORPO], com [CARACTERÍSTICAS DAS LESÕES].\n\nO suposto autor, [NOME, SE CONHECIDO], [QUALIFICAÇÃO], [esteve no local / evadiu-se / não foi identificado]. A vítima [recebeu / recusou] atendimento médico e foi [encaminhada / orientada a procurar] atendimento na unidade de saúde [NOME DA UNIDADE].\n\nForam colhidas as declarações da vítima e de [testemunhas], sendo registradas as providências iniciais. A vítima foi orientada sobre seus direitos e sobre a necessidade de atestado médico-legal para subsidiar a investigação.\n\nDiante do exposto, lavrou-se o presente boletim para registro dos fatos e encaminhamentos competentes.`,
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
    texto: `Às [HORA] do dia [DATA], a guarnição [COMPOSIÇÃO DA GUARNIÇÃO], em patrulhamento na [LOCALIZAÇÃO DA GUARNIÇÃO], foi acionada para atender ocorrência de dano na [LOCALIZAÇÃO DA OCORRÊNCIA].\n\nNo local, constatou-se dano(s) em [DESCREVER BEM DANIFICADO — muro, veículo, mobiliário urbano, equipamento público], de propriedade de [NOME DO PROPRIETÁRIO / ÓRGÃO PÚBLICO], com prejuízo estimado em [VALOR APROXIMADO], quando informado.\n\nO dano apresenta as seguintes características: [TIPO DE DANO — riscos, pichação, quebra, amassados, corte]. A suspeita de autoria recai sobre [NOME, SE CONHECIDO / indivíduos não identificados], tendo em vista [FUNDAMENTO — testemunha, câmera, vestígio].\n\nForam realizadas [buscas no local / isolamento / registro fotográfico / contato com a autoridade responsável pelo patrimônio]. O responsável foi orientado sobre a lavratura de termo de ressarcimento ou acompanhamento investigativo.\n\nDiante do exposto, lavrou-se o presente boletim para registro do dano e encaminhamentos de praxe.`,
    dicas: [
      "Descreva o dano sem supor intenção, salvo quando houver indícios claros.",
      "Identifique a titularidade do bem (particular, municipal, estadual, federal).",
      "Registre o valor estimado apenas se houver base para o cálculo.",
    ],
  },
];

function title(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun(t)],
  });
}

function h2(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun(t)],
  });
}

function h3(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun(t)],
  });
}

function p(children) {
  return new Paragraph({
    spacing: { after: 120 },
    children: Array.isArray(children) ? children : [new TextRun(children)],
  });
}

function bullet(items, numbering) {
  return items.map((item) =>
    new Paragraph({
      numbering,
      spacing: { after: 80 },
      children: [new TextRun(item)],
    }),
  );
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 24 },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1F2937" },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "1F2937" },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "374151" },
        paragraph: { spacing: { before: 160, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 720, hanging: 360 } },
            },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        title("Modelos de Boletim de Ocorrência — QAP Report"),
        p(
          "Este documento reúne modelos de texto para boletins de ocorrência dos incidentes mais comuns: roubo, furto, perda/extravio de documentos, acidente de trânsito, lesão corporal e dano. Substitua os campos entre colchetes pelos dados reais da ocorrência antes de lavrar o documento oficial.",
        ),
        p(
          "A redação técnica policial exige objetividade, cronologia e fidelidade aos fatos. Estes modelos são uma base; o texto final deve ser revisado conforme a realidade de cada caso.",
        ),
        ...modelos.flatMap((modelo) => [
          new Paragraph({ children: [new PageBreak()] }),
          h2(`${modelo.titulo} (${modelo.tipo})`),
          h3("Quando usar"),
          ...bullet(modelo.quando, { reference: "bullets", level: 0 }),
          h3("Dados necessários"),
          ...bullet(modelo.dados, { reference: "bullets", level: 0 }),
          h3("Texto-modelo"),
          new Paragraph({
            shading: { fill: "F3F4F6" },
            spacing: { after: 160 },
            border: {
              left: { style: "single", size: 24, color: "D1D5DB", space: 8 },
            },
            children: [
              new TextRun({
                text: modelo.texto,
                font: "Arial",
                size: 22,
              }),
            ],
          }),
          h3("Dicas técnicas"),
          ...bullet(modelo.dicas, { reference: "bullets", level: 0 }),
        ]),
        new Paragraph({ children: [new PageBreak()] }),
        h2("Checklist final antes de enviar"),
        ...bullet(
          [
            "Todos os placeholders foram substituídos por dados reais.",
            "Data e hora estão no formato correto.",
            "Não há opinião pessoal ou suposições no texto.",
            "Roubo e furto foram diferenciados corretamente.",
            "Testemunhas e câmeras só constam se confirmadas.",
            "Fundamento legal foi citado com moderação.",
            "Texto foi revisado por um superior, quando exigido.",
          ],
          { reference: "bullets", level: 0 },
        ),
        p(""),
        p(
          "Gere boletins técnicos em segundos com a QAP Report: https://qap-report.lovable.app",
        ),
      ],
    },
  ],
});

const outputDir = "/mnt/documents";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = `${outputDir}/modelos-boletim-ocorrencia.docx`;

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Documento salvo em: ${outputPath}`);
});
