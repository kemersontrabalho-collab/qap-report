# QAP REPORT 

Crie um aplicativo multiplataforma (Android, iOS e navegador web via PWA) com autenticação segura e design moderno responsivo. O app deve ser escalável, otimizado para diferentes tamanhos de tela e oferecer navegação intuitiva com suporte a modo claro e escuro. O aplicativo deve funcionar também em modo offline, permitindo que o usuário crie, edite e salve boletins sem conexão, com sincronização automática quando a internet estiver disponível.

Tema do Aplicativo:

O sistema deve atuar como assistente de redação policial. Toda vez que o usuário enviar o tipo de documento e uma lista de palavras-chave, o aplicativo deve gerar automaticamente um texto em linguagem formal, impessoal, técnica e detalhada, produzindo um relatório amplo e completo com terminologia jurídica e policial adequada. Além disso, deve oferecer recursos de pesquisa interna e externa para apoiar a elaboração dos boletins.

Fluxo de Navegação:

1. Login: Tela inicial com login/senha e opção de recuperação de senha via email cadastrado. Após autenticação, redirecionar para o Dashboard.

2. Dashboard: Menu principal com opções de seleção de boletim (BA, BO-COP, BO-TC, BOAT). Deve conter:

   - Rascunhos: boletins em andamento, com opção de editar ou excluir.

   - Já Feitos: histórico de boletins concluídos, com ferramenta de busca por palavra-chave ou data.

   - Favoritos: acesso rápido a modelos ou boletins preferenciais.

   - Lixeira: itens excluídos armazenados por até 7 dias, com opção de esvaziamento manual.

3. Configurações: Alternância de tema (Claro/Escuro). Edição de dados pessoais (foto de perfil, nome completo, graduação, celular, email, identidade funcional opcional). Funções de Logout e Exclusão de Conta com confirmação explícita.

4. Logout: Encerra sessão e retorna à tela inicial.

Requisitos Técnicos:

- Frontend: Desenvolvido em Flutter ou React Native, com suporte a PWA para acesso via navegador. Interface responsiva baseada em Material Design ou Cupertino Widgets. Persistência da preferência de tema (claro/escuro).

- Backend: API REST ou GraphQL em Node.js, Django ou Spring Boot. Banco de dados PostgreSQL (relacional) ou Firebase/Supabase (NoSQL). Autenticação segura via JWT ou OAuth 2.0. Armazenamento de arquivos em nuvem (AWS S3 ou Google Cloud Storage).

- **Offline:** Implementar cache local com SQLite ou IndexedDB (para PWA). Todos os boletins criados ou editados offline devem ser armazenados localmente e sincronizados automaticamente com o servidor quando a conexão for restabelecida.

- Segurança: Criptografia AES para dados sensíveis. HTTPS obrigatório em todas as conexões. Recuperação de senha com token temporário enviado por email. Exclusão de conta com confirmação em duas etapas.

- Infraestrutura: Hospedagem em nuvem (AWS, Azure ou GCP). Balanceamento de carga para escalabilidade horizontal. Monitoramento e logs centralizados (Elastic Stack ou Datadog). Pipeline CI/CD para deploy contínuo e testes automatizados.

- Experiência do Usuário: Navegação simples e clara, feedback visual em ações (loading, confirmações, alertas), acessibilidade com suporte a leitores de tela e contraste ajustável.

- Conteúdo para Pesquisa: Base de conhecimento interna com modelos de boletins e normas. Sistema de busca inteligente com filtros avançados. Histórico de pesquisas do usuário. Integração com documentos oficiais externos. Assistente de preenchimento que sugere campos e textos com base em relatórios anteriores.

Regras Fundamentais de Tipo de Boletim:

================================================================================

• BA (Boletim de Atendimento): Utilizado SEMPRE que houver a necessidade de conduzir indivíduo à delegacia. **Inclui casos de tráfico de drogas em flagrante.**

• BO-COP (Comunicação de Ocorrência Policial): Utilizado SEMPRE que houver um indivíduo presente no local do fato. **Inclui casos de consumo de maconha constatados no local.**

• BO-TC (Termo Circunstanciado): Utilizado para infrações de menor potencial ofensivo. **Inclui posse de pequena quantidade de cocaína para consumo pessoal.**

• BOAT (Boletim de Acidente de Trânsito): Ocorrências de trânsito específicas.

Instrução de Fidelidade aos Fatos (NUNCA INVENTAR DADOS):

================================================================================

- Restrinja-se rigorosamente às informações fornecidas nas palavras-chave e no contexto da ocorrência.

- É EXPRESSAMENTE PROIBIDO inventar fatos, nomes, horários, locais, modelos de veículos, marcas de objetos ou qualquer elemento não citado.

- Utilize termos técnicos e linguagem jurídica/policial adequada para enriquecer a redação, mas NUNCA adicione dados circunstanciais fictícios.

- Caso as palavras-chave fornecidas sejam concisas ou faltem informações essenciais para a confecção de um texto amplo e completo, FAÇA UMA PERGUNTA AO FINAL solicitando os detalhes complementares antes de dar o texto como encerrado, ou proponha as lacunas para preenchimento.

Instruções Obrigatórias de Cabeçalho e Garantias Legais:

================================================================================

1. INÍCIO DO REGISTRO: No início do Histórico ou da Versão Policial de QUALQUER modelo, utilize os dados fornecidos (composição da guarnição, prefixo da viatura, data e hora, local/ponto de referência onde a equipe se encontrava e o local para onde foi despachada/deslocada).

2. PRISÃO E ALGEMAS (Súmula Vinculante 11 e Direitos Constitucionais): Sempre que a ocorrência envolver prisão, condução à delegacia ou uso de algemas, conste expressamente que:

   - O uso de algemas foi empregado estritamente nos termos da Súmula Vinculante nº 11 do STF (para resguardar a integridade física do preso ou da guarnição, prevenir receio de fuga ou conter resistência).

   - Foram informados ao indivíduo os seus direitos constitucionais (Art. 5º, LXIII da CF/88), em especial o direito de permanecer em silêncio, de ter assistência de advogado e de comunicar a sua prisão a um familiar ou representante legal.

Estrutura de Categorização Interna:

================================================================================

- BA (Boletim de Atendimento)

   • Abordagem com Condução

   • Trânsito com Condução

   • Violência Doméstica com Condução

   • Tráfico de Drogas (flagrante)

- BO-TC (Termo Circunstanciado)

   • Crimes de Menor Potencial Ofensivo

   • Posse de Cocaína para Consumo Pessoal

- BO-COP (Comunicação de Ocorrência Policial)

   • Crimes Patrimoniais

   • Crimes Graves & Flagrante

   • Violência Doméstica (Local)

   • Proteção a Vulneráveis

   • Homicídio / Encontro de Cadáver

   • Consumo de Maconha (indivíduo presente)

- BOAT (Boletim de Acidente de Trânsito)

   • Acidente de Trânsito

   • Infração de Trânsito

Roadmap de Desenvolvimento:

1. Planejamento e Design (2–3 semanas): definição visual, protótipos e validação de UX.

2. Desenvolvimento Frontend (4–6 semanas): implementação das telas e suporte PWA.

3. Desenvolvimento Backend (4–5 semanas): APIs, banco de dados e autenticação.

4. Integração e Testes (3–4 semanas): testes unitários, segurança e UX.

5. Publicação e Deploy (2–3 semanas): publicação na Google Play Store, Apple App Store e versão Web/PWA hospedada em nuvem.

6. Monitoramento e Manutenção (contínuo): logs, métricas, correções e atualizações.

O aplicativo deve garantir segurança, escalabilidade e experiência fluida tanto em dispositivos móveis quanto em navegadores, atuando como ferramenta de apoio à redação policial e pesquisa de documentos, mesmo em modo offline.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://qap-report.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/483e5855-54d3-4735-b11e-9a2d8b9c3665).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
