## Objetivo
Reduzir o tempo de carregamento e evitar travamentos nas telas internas, preservando o comportamento atual e as regras de segurança.

## Alterações planejadas

### 1. Reduzir dados transferidos no painel
- Substituir a leitura integral dos boletins por somente os campos necessários à listagem.
- Evitar retornar o texto completo de cada boletim no carregamento inicial do painel.
- Manter busca por título, categoria e data; o conteúdo completo continuará disponível ao abrir o boletim.

### 2. Evitar verificações repetidas na navegação
- Reaproveitar por curto período a sessão autenticada e o status do plano entre páginas internas.
- Invalidar esse estado quando houver login, logout ou alteração relevante, sem enfraquecer as verificações protegidas no servidor.

### 3. Diminuir trabalho contínuo no navegador
- Reduzir atualizações desnecessárias de presença e temporizadores quando a aba estiver oculta.
- Carregar recursos secundários apenas quando forem realmente necessários.
- Corrigir a referência incorreta do manifesto PWA que hoje gera requisições 404.

### 4. Otimizar consultas do banco
- Aplicar somente índices comprovadamente úteis para filtros e ordenações frequentes.
- Evitar alterações de capacidade do Lovable Cloud sem evidência de saturação.

### 5. Validação
- Conferir erros de compilação e execução.
- Medir carregamento e navegação nas principais telas autenticadas.
- Testar painel, criação/abertura de boletim, dúvidas e configurações em navegador.

## Limites
- Nenhuma mudança visual relevante.
- Nenhuma alteração nas regras de assinatura, autenticação ou conteúdo gerado pela IA.
