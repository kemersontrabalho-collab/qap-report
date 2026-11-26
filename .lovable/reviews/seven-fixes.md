# Revisão: sete correções

## Resultado verificável

34 testes automatizados passaram em oito arquivos; os registros disponíveis de compilação estão sem erros. Navegador Chromium com sessão administrativa real e tela móvel de 390×844; verificações de largura também em 320 e 768 px. Sem erros de execução nos fluxos testados. Sete boletins fictícios criados nos dois testes foram removidos ao terminar. Nenhum pagamento real aprovado ou modificado.

| Falha | Caminhos revisados e regra aplicada | Verificação |
| --- | --- | --- |
| Procedimentos contraditórios | Geração e correção em `bulletins.functions.ts`; auditoria local em `bulletin-extras.ts`, auditoria assistida no servidor e proposta em `BulletinExtras.tsx`; redação confirmada pelo relato, sem copiar procedimentos de casos similares | Geração com prisão/algemas/apoio informado, prisão sem algemas, condução voluntária sem prisão e atendimento sem autor localizado; auditoria detectou contradições; proposta aceita, salva, recarregada e exportada para PDF sem o texto incompatível |
| Instalação/atualização | `vite.config.ts`, `pwa.ts`, mesmo caminho `public/sw.js`, manifesto e entrada da aplicação | Manifesto e recuperação respondem 200; prévia não cria registros novos; teste isolado de código confirma remoção seletiva, navegação e remoção do registro; **ciclo completo em navegador isolado não completou e publicação instalada não foi verificada** |
| Renovação antecipada | Aprovação administrativa chama a função transacional; assinatura e Configurações leem o período persistido; função adiciona dias restantes válidos, preserva vitalício e rejeita duplicação | PostgreSQL isolado: dez dias restantes viram quarenta; cortesia finita, trial, vitalício, aprovação duplicada, dois pagamentos e reversão atômica; regra visível na tela móvel de assinatura |
| Consentimento | Editor usa valor persistido em toda gravação; retirada permanece desmarcada após reabrir; mecanismos existentes de retirada coletiva preservados | Salvar, recarregar e concluir novamente mantiveram `false`; leitura direta confirmou e nenhum boletim de teste foi compartilhado |
| Conclusão vazia | Editor, importação em Configurações e transições do banco validam histórico; registros antigos concluídos sem edição não são reescritos | BA, BO-COP e BO-TC vazios bloqueados no móvel; testes do banco impedem criação/conclusão vazia e preservam registro antigo sem alteração |
| Lixeira | Escritas do editor invalidam consultas de lista/detalhe e removem alteração local pendente | Excluir pelo editor, voltar ao painel e abrir lixeira mostrou imediatamente o boletim, sem recarregar |
| Busca | Consulta do painel inclui histórico; filtro normaliza título, categoria, conteúdo e data | Busca por `subtracao` encontrou histórico com `subtração`, embora a palavra não estivesse no título |

Auditorias/propostas antigas são descartadas ao mudar o texto ou tipo, inclusive resultados que chegam após a edição. Importações de boletins passam pelo mesmo bloqueio de histórico vazio. Impressão lê o texto corrigido atual. Consulta de casos similares foi revisada: os exemplos são referências de estilo, não prova de atos praticados. Políticas de consentimento, acesso premium, cartões administrativos e notificações mantêm as funções anteriores.

## Limites para divulgação

- Publicar a recuperação no mesmo endereço do registro antigo; a limpeza só poderá alcançar usuários instalados depois dessa publicação. Não é necessário alterar o endereço de início do manifesto.
- Instalação continua disponível via manifesto; cache offline do aplicativo está desativado nesta etapa de recuperação. Rascunhos locais não foram removidos.
- Verificar atualização e teclado/zoom no iPhone físico; só telas móveis simuladas estiveram disponíveis.
- Estes testes reduzem contradições, mas não garantem correção jurídica de toda resposta futura; revisar o histórico antes de concluir.