# Remover o boletim de acidente de trânsito

## Objetivo
Retirar o BOAT (Boletim de Acidente de Trânsito) das opções e referências do QAP Report, sem apagar boletins antigos dos usuários.

## Alterações
- Remover o cartão BOAT do painel, da criação de boletins e do formulário de boletins antigos.
- Retirar BOAT das validações, filtros, busca de casos, instruções da IA e tutorial.
- Remover o modelo público específico de acidente de trânsito e atualizar textos, metadados, guias, termos e manifestos que anunciam esse tipo de boletim.
- Remover da base os modelos prontos classificados como BOAT, preservando boletins pessoais e conhecimento histórico já existente.
- Manter categorias gerais de ocorrências de trânsito nos tipos restantes somente quando não representarem a opção BOAT.

## Compatibilidade
- Boletins BOAT já criados permanecerão armazenados e poderão ser consultados no histórico; apenas novas criações deixarão de ser oferecidas.
- A estrutura atual do banco será mantida para não invalidar registros históricos.

## Validação
- Confirmar que BOAT não aparece mais nas telas públicas, login, painel, configurações, tutorial ou editor.
- Testar criação dos três tipos restantes: BA, BO-COP e BO-TC.
- Executar verificação de tipos, compilação e navegação nas páginas afetadas.
