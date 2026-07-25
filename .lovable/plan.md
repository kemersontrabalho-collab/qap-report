
## Escopo

Três entregas conforme solicitado. Vou destacar dois pontos que precisam de confirmação antes de codificar — abaixo, em "Decisões que preciso confirmar".

---

### 1. Base de conhecimento inteligente (aprendizado contínuo)

- Toda vez que um boletim for marcado como **Feito** (status `done`), seus dados estruturados (categoria, título, endereço da ocorrência, palavras-chave, contexto, conteúdo final) serão indexados numa nova tabela `bulletin_knowledge` — separada de `bulletins`, com RLS liberando **leitura** para qualquer usuário autenticado (para que casos anteriores possam apoiar decisões) mas **escrita apenas via trigger** do dono original. Sem dados pessoais além do que já está no boletim.
- Geração de **embedding** (Lovable AI, `google/gemini-embedding-001`) do texto "categoria + palavras-chave + contexto + endereço" no momento do salvamento. Armazenado em coluna `vector(3072)` com índice HNSW (halfvec) para busca semântica rápida.
- No editor de boletim, quando o usuário digitar palavras-chave/contexto/categoria, uma seção **"Casos semelhantes"** aparecerá com os 3 casos mais parecidos (título + categoria + trecho do histórico + botão "usar como referência"). Chamada faz debounce (600 ms) via `createServerFn` que calcula o embedding da query e roda `match_bulletin_knowledge` (função SQL de similaridade cosseno).
- Nenhum boletim em rascunho ou lixeira entra na base.

### 2. Painel administrativo do Fundador

- Nova tabela `user_roles` (enum `app_role`: `founder`, `admin`, `user`) + função `has_role(uuid, app_role)` SECURITY DEFINER — padrão recomendado, evita escalada de privilégio.
- Trigger `on_auth_user_created` concede automaticamente o papel `founder` quando `email = 'kemersontrabalho@gmail.com'` **e** o email estiver verificado. Nenhum outro caminho concede founder.
- Nova rota `/admin` sob `_authenticated/`, com `beforeLoad` que verifica `has_role(uid, 'founder')`. Item de menu "Administração" só aparece para o fundador.
- Server functions protegidas por `requireSupabaseAuth` + verificação `has_role`, usando `supabaseAdmin` (service role) apenas depois de autorizado:
  - Listagem de usuários (email, nome, criado em, último acesso via `auth.users.last_sign_in_at`, contagem de boletins, status ativo/bloqueado).
  - Estatísticas: total de usuários, ativos nos últimos 30 dias, total de boletins na base.
  - Ações: **bloquear/desbloquear** (`auth.admin.updateUserById` com `ban_duration`) e **excluir permanentemente** (`auth.admin.deleteUser` + limpeza em cascata de `bulletins`, `profiles`, `user_roles`, `bulletin_knowledge`).
- Confirmações duplas para bloqueio e exclusão. O fundador não pode se auto-excluir/bloquear.

### 3. Downloads seguros em Configurações

- Como o RedaPol é **PWA**, não existe APK ou instalador fora da loja/navegador. Vou adicionar em Configurações → "Instalar / Atualizar":
  - Botão **"Verificar atualização"** que chama `navigator.serviceWorker.getRegistration()?.update()` e recarrega quando houver nova versão (aproveita o SW já existente).
  - Botão **"Baixar o app (link seguro)"** que copia/abre a URL HTTPS pública oficial do app (`https://qap-report.lovable.app`) — o único canal seguro; instalação continua sendo pelo navegador (Chrome/Safari).
  - Botão **"Compartilhar link do app"** usando Web Share API (fallback: copiar para a área de transferência).
- Sem APK hospedado: distribuir APK fora do Play Store é um risco de segurança (usuários teriam que ativar "fontes desconhecidas") e não é compatível com PWA. Mantido o padrão web seguro.

---

## Decisões que preciso confirmar

1. **Base de conhecimento compartilhada entre todos os usuários?** Hoje cada usuário só vê os próprios boletins. A funcionalidade de "casos semelhantes" só faz sentido se qualquer policial puder ver padrões vindos de boletins concluídos de outros usuários (sem revelar identidade). Confirma que posso permitir leitura anônima entre usuários autenticados? Se preferir manter isolado, a base só sugere casos do próprio usuário.
2. **APK real ou apenas links seguros de instalação PWA?** Se você realmente quer um APK instalável, isso exige gerar um wrapper (Bubblewrap / TWA) e hospedar o arquivo — fora do escopo do editor Lovable. Confirmo entrega apenas com links seguros para instalação PWA?

Assim que confirmar, executo tudo (migração, backend, frontend) numa sequência só.
