## Objetivo
Implementar as novidades 1, 2, 3, 4, 5, 6 e 8. A ideia 7 (pagamentos) fica de fora; as regras de assinatura não mudam.

## 1. Auditoria Jurídica Preventiva
- Caixa "Auditoria Jurídica" no editor, que aparece após gerar ou editar o histórico.
- Faz uma verificação rápida no próprio aparelho (termos vagos como "atitude suspeita", entrada em domicílio sem autorização, algemas sem justificativa, apreensão sem lacre/destino) e uma análise mais completa com IA sob demanda.
- Cada alerta explica o problema e sugere como redigir. Botão "Corrigir com IA" reescreve o texto mantendo apenas os fatos informados (sem inventar nada) e o usuário revisa antes de aceitar.
- Recurso exclusivo para assinantes/teste ativo, como a geração.

## 2. Materiais e Objetos Apreendidos
- Seção recolhível no editor com itens por tipo: Arma/Munição (tipo, calibre, marca, numeração, quantidade), Entorpecente (tipo, formato, quantidade, peso), Dinheiro (valor), Celular/Eletrônico (marca, IMEI), Outros (descrição).
- Salva junto com o boletim (inclusive no salvamento automático).
- Enviada à IA para ser redigida no histórico e exibida em quadro próprio no PDF.
- Na base coletiva, os números de série/IMEI são removidos.

## 3. Copiar para WhatsApp
- Botão "Copiar p/ WhatsApp" ao lado de PDF/Copiar.
- Gera resumo em negrito no padrão tático: ocorrência, data/hora, local, guarnição, apoio, apreensões e síntese (primeiro parágrafo do histórico).
- Somente dados informados; campos vazios são omitidos.

## 4. Meus Modelos
- Botão "Salvar como modelo" no editor (nome do modelo; guarda tipo, categoria, guarnição, viatura, apoio, palavras-chave base e contexto — sem histórico, endereços nem data).
- Em "Novo boletim", opção "Começar de um modelo salvo".
- Lista em Configurações para renomear e excluir. Cada usuário vê apenas os próprios modelos.

## 5. Leitura de documento por foto
- Nova seção "Envolvidos" no editor (nome, papel: vítima/autor/testemunha/condutor, RG, CPF, nascimento, mãe), enviada à IA e ao PDF.
- Ícone de câmera: a foto do documento é lida pela IA para preencher os campos; a imagem não é salva em lugar nenhum (nem no aparelho nem no servidor) e é descartada após a leitura.
- O usuário confere os dados antes de confirmar. Envolvidos nunca vão para a base coletiva.
- Exclusivo para assinantes/teste ativo.

## 6. Modo Tático Noturno
- Terceira opção de tema (Claro / Escuro / Tático) em Configurações e no menu.
- Fundo preto absoluto, textos e destaques em vermelho/âmbar suave, brilho reduzido; preferência lembrada no aparelho.

## 8. Rascunho resiliente sem sinal
- Se a internet cair, as alterações do boletim aberto e novos rascunhos são guardados no aparelho, com o aviso "Salvo localmente (sem sinal)".
- Ao voltar o sinal, sincroniza automaticamente com a nuvem; botões de IA ficam desativados enquanto offline, com aviso.
- Limitação: o app precisa já estar aberto no celular; abrir o app do zero sem internet não é incluído (exigiria o modo offline completo que foi removido anteriormente).

## Validação
- Testar no navegador: criar boletim com apreensões e envolvidos, gerar, auditar, corrigir, copiar para WhatsApp, PDF, salvar/usar modelo, tema tático e simulação sem internet.
- Conferir que nada de envolvidos/IMEI chega à base coletiva.

## Detalhes técnicos
- Banco: colunas `seized_items jsonb` e `involved_parties jsonb` em `bulletins`; nova tabela `bulletin_presets` (user_id, name, campos) com RLS por dono e GRANTs; atualizar `anonymize_bulletin_text`/trigger de sincronização para não levar envolvidos e remover IMEI/série.
- Servidor (`bulletins.functions.ts`): `auditBulletin` e `fixBulletin` (assertPremium), `extractDocument` (imagem base64 em memória, modelo com visão, saída JSON estrita, sem persistência). Novas chamadas seguem o padrão do gateway já usado no arquivo.
- `generateBulletin` recebe apreensões e envolvidos; prompt instrui redigir sem inventar.
- `print-bulletin.ts`: quadros de apreensões e envolvidos. Novo util de formatação WhatsApp.
- Tema: novo conjunto de variáveis `.tactical` em `styles.css` e `theme.ts`.
- Offline: fila no IndexedDB por boletim, eventos `online/offline`, sincronização respeitando a versão do salvamento automático; sem service worker.
