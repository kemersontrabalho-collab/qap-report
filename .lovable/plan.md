## Objetivo
Criar conteúdo indexável de alto valor — modelos de texto prontos para boletins de ocorrência (BO) dos incidentes mais comuns — para capturar o volume de busca por "modelo de boletim de ocorrência", "boletim de ocorrência online" e termos relacionados (perda de documentos, extravio, furto, roubo, acidente de trânsito, lesão corporal, dano).

## O que será entregue

### 1. Nova rota pública: `/modelos-boletim-ocorrencia`
- Página em português com layout consistente ao guia existente (`/guia-redacao-tecnica`).
- Título e meta description otimizados para SEO.
- Structured data: `Article` + `FAQPage` (schema.org) para capturar rich snippets.
- Canonical self-referencing e tags `og`/`twitter`.

### 2. Modelos de texto específicos (prontos para copiar e usar)
Cada modelo conterá:
- Quando usar.
- Dados obrigatórios (composição, local, data/hora, envolvidos, descrição do fato, etc.).
- Texto-modelo completo com placeholders `[...]` para preenchimento.
- Dicas jurídicas/técnicas.

Incidentes cobertos:
- Roubo (subtração mediante grave ameaça ou violência).
- Furto (subtração sem violência).
- Perda / extravio de documentos e objetos pessoais.
- Acidente de trânsito (BOAT).
- Lesão corporal (BO-COP / BO-TC).
- Dano (patrimônio público ou particular).

### 3. SEO interno e navegação
- Link para `/modelos-boletim-ocorrencia` no guia existente (`/guia-redacao-tecnica`) e no footer/header.
- CTA claro para criar conta em `/auth` com texto persuasivo.
- Sitemap atualizado para incluir a nova rota pública.

### 4. Documento para download (DOCX)
- Gerar `modelos-boletim-ocorrencia.docx` com todos os modelos formatados, salvo em `/mnt/documents`.
- Incluir botão de download na página.
- Validar e converter para imagens para QA antes de entregar.

## Detalhes técnicos
- Tecnologia: TanStack Start + React + Tailwind v4 + shadcn/ui (mesmo padrão do projeto).
- Criar arquivo `src/routes/modelos-boletim-ocorrencia.tsx`.
- Atualizar `src/routes/sitemap[.]xml.ts` para incluir a nova URL com prioridade e changefreq.
- Não alterar lógica de autenticação, banco de dados ou funções de segurança.
- Não usar emojis na página (somente ícones do Lucide).

## Resultado esperado
- Nova página otimizada para tráfego orgânico de pessoas procurando modelos de boletim de ocorrência.
- Rich snippets de FAQ nas SERPs.
- Oferta de download de documento útil para conversão de visitantes em usuários.
