# ResolvAI Prestador — Escopo e critérios de aceite

Aplicação web do **prestador de serviços** (fornecedor) do marketplace ResolvAI. Ela usa **o mesmo backend** do app do contratante ([Resolvai_Backend_Node](https://github.com/danilomarley/Resolvai_Backend_Node)) e é a contraparte do [Resolvai_Cliente](https://github.com/danilomarley/Resolvai_Cliente): o contratante publica pedidos e escolhe propostas; o prestador encontra pedidos, envia propostas e acompanha o resultado.

Este documento diz **o que construir** e **como saber que está pronto**. Cada épico tem uma história, critérios de aceite numerados e testáveis, as dependências de backend e a estimativa. As decisões tomadas estão na seção [Decisões](#decisões); o que ainda está em aberto fica marcado como bloqueado.

> **Situação:** a fase 1 (E0 a E6) está implementada neste repositório, sobre o backend [Resolvai_Backend_Node](https://github.com/danilomarley/Resolvai_Backend_Node) (rotas em `docs/PRESTADOR.md` de lá). A fase 2 segue bloqueada pelas definições da seção 6. As decisões D1 a D6 foram tomadas (seção [Decisões](#decisões)); onde elas mudaram um critério de aceite, o texto abaixo já está ajustado.

## Sumário

1. [Fontes e requisitos de origem](#1-fontes-e-requisitos-de-origem)
2. [Estado atual do backend](#2-estado-atual-do-backend)
3. [Stack e convenções](#3-stack-e-convenções)
4. [Requisitos transversais](#4-requisitos-transversais)
5. [Fase 1 — ciclo mínimo (P1 a P5)](#5-fase-1--ciclo-mínimo-p1-a-p5)
6. [Fase 2 — após definições (P6 a P9 e extras)](#6-fase-2--após-definições-p6-a-p9-e-extras)
7. [Contrato de API proposto](#7-contrato-de-api-proposto)
8. [Estimativa e ordem de entrega](#8-estimativa-e-ordem-de-entrega)
9. [Definição de pronto](#9-definição-de-pronto)
10. [Decisões](#decisões)

---

## 1. Fontes e requisitos de origem

Repositório [Resolvai_Documentacao](https://github.com/danilomarley/Resolvai_Documentacao):

| Fonte | O que traz |
|---|---|
| `VisualizacaoPrototipo/fornecedor-web.html` e `fornecedor.html` | Protótipo estático web e mobile do prestador, telas **P1 a P9**. Tema laranja `#FF5C1A`. É referência de fluxo e conteúdo, **não** é contrato de API. |
| `VisualizacaoPrototipo/documentação.md` | Descrição das telas P1–P9 e do fluxo P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9. |
| `PRODUCT_BACKLOG.md` | US-034 (P1–P5 web), US-035 (P6–P9 web), US-044/US-045 (mobile). Requisitos RF-01, RF-03, RF-04, RF-06, RF-07, RF-08, RF-09, RF-12. |
| `Correções_Prototipo.txt` | Defeitos do protótipo que **não** devem ser repetidos (ver abaixo). |

Regras de navegação do prestador, extraídas das correções do protótipo:

- **Home / Feed:** pedidos em que ele **pode enviar uma proposta**.
- **Pedidos:** pedidos **em andamento** ou já aceitos.
- **Propostas:** o **status das propostas que ele enviou**; os filtros (Todas, Enviada, Visualizada, Escolhida, Não selecionada) **precisam funcionar**.
- **Chat:** lista de pedidos em andamento e, ao abrir um, a conversa com o cliente.

Telas do protótipo e épicos deste documento:

| Tela | Nome | Épico |
|---|---|---|
| P1 | Onboarding / Cadastro (3 passos) | E1 |
| P2 | Feed de pedidos | E2 |
| P3 | Detalhe do pedido | E3 |
| P4 | Enviar proposta | E4 |
| P5 | Minhas propostas | E5 |
| — | Perfil e configurações da conta | E6 |
| P6 | Chat com cliente | E7 (fase 2) |
| P7 | Smart contract | E8 (fase 2) |
| P8 | Serviço em andamento | E9 (fase 2) |
| P9 | Recebimento + avaliação do cliente | E10 (fase 2) |

## 2. Estado atual do backend

O app do prestador **depende de rotas que ainda não existem**. Hoje o backend tem:

| Existe | Observação |
|---|---|
| `POST /api/v1/auth/login`, `register`, `check-email`, `reset-password` | O `register` público cria **apenas `Cliente`**. O login serve a qualquer papel. |
| `GET /api/v1/users/me`, `GET/PATCH /api/v1/users/me/profile`, `POST /api/v1/users/me/complete-registration` | Perfil, endereço e contato principais. O papel `Prestador` existe no banco (`users.role`). |
| `POST /api/v1/orders/photos` | Upload de foto (JPG/PNG/WEBP, até 5 MB), hoje exige papel Cliente. |
| `GET /api/v1/orders`, `GET /api/v1/orders/{id}` e demais rotas de pedidos | **Todas filtram por `id_cliente`.** Um prestador não enxerga nenhum pedido. |
| `GET /api/v1/orders/{id}/proposals[/{proposalId}]` | Lado do **contratante** (PR [Resolvai_Backend_Node#6](https://github.com/danilomarley/Resolvai_Backend_Node/pull/6)). |
| Tabela `propostas` | Colunas `valor`, `prazo` (texto), `prazo_dias` (numérico, migração 014 do PR #6), `descricao`, `garantia`, `status`, `data_criacao`. |

**Não existe:** cadastro de prestador, perfil profissional (categorias, regiões, documentos), feed de pedidos abertos, **criação/edição/retirada de proposta**, chat, contrato, andamento do serviço, **conclusão de pedido** (nada muda um pedido para `concluido` hoje), pagamento/repasse, avaliação do cliente pelo prestador (a tabela `avaliacoes` é só contratante → prestador).

> Consequência: cada épico abaixo traz o trabalho de backend necessário. O front **não deve usar dados simulados** para tapar essas lacunas (ver [requisitos transversais](#4-requisitos-transversais)).

Estados de um pedido e de uma proposta que o prestador precisa entender:

| Pedido | Significado para o prestador |
|---|---|
| `Pending` (aberto) | Recebendo propostas. É o que aparece no feed. |
| `InProgress` | **Só após o pagamento** do contratante: o prestador está atendendo o pedido. Aceitar uma proposta **não** muda o pedido para este estado. |
| `Completed` / `Cancelled` | Encerrado. |

| Proposta | Significado |
|---|---|
| `Sent` | Enviada, o contratante ainda não abriu. |
| `Viewed` | O contratante abriu o detalhe da proposta. |
| `Chosen` | O contratante escolheu esta proposta (pedido segue `Pending` até o pagamento). |
| `NotChosen` | Outra proposta foi escolhida. *(status previsto para a #84 do cliente)* |

## 3. Stack e convenções

Seguir o mesmo padrão do [Resolvai_Cliente](https://github.com/danilomarley/Resolvai_Cliente), para a equipe trabalhar nos dois sem trocar de contexto:

- **React 18 + TypeScript + Vite + React Router**. Estilo em CSS com variáveis (`variables.css`), tema laranja do prestador.
- **API:** variável `VITE_API_BASE_URL`; cliente único (`apiRequest`) que trata `ProblemDetails` (usar o campo `detail` ao exibir erros) e timeout de 15 s.
- **Sessão:** guardar só o que a API devolve (`customerId`/`userId`, `accessToken`, `expiresAtUtc`) em `sessionStorage`; nunca senha nem refresh token.
- **Modais:** tudo que é ação curta ou confirmação abre como **modal**, não como página. O estado do modal fica na URL (`?modal=nome`), de modo que **voltar fecha e F5 reabre**. Modal bloqueia o fechamento durante um envio.
- **Listas e filtros** (status, página) ficam na **URL** (`?status=...&page=...`).
- **Retorno após login:** só voltar a telas conhecidas do próprio app, com parâmetros conhecidos (nunca a endereços arbitrários).
- **Rota 404** com link para o início.
- **Testes:** `node --test` para regras e componentes (renderização estática) + verificações no navegador (Playwright) com a API simulada; lint e build no CI.
- **Fluxo de trabalho:** uma branch por épico, PR para `main`, commits pequenos. (Este documento foi o único commit direto na `main`.)

Código do Resolvai_Cliente que deve ser reaproveitado (copiar na base e extrair para um pacote comum depois): `Modal`, `useModalRoute`, cliente de API, sessão, máscaras e validações de CPF/CEP/telefone, busca de CEP, layout (sidebar, topbar, menu móvel) e a infraestrutura de testes.

## 4. Requisitos transversais

Valem para **todos** os épicos e fazem parte dos critérios de aceite de cada um.

| # | Requisito |
|---|---|
| T1 | **Sem mocks nem dados inventados.** Todo dado vem da API. Valor sem fonte aparece como "—" ou "Não informado" (nada de nota, percentual de IA ou métrica fictícia). |
| T2 | **Estados completos:** carregando, vazio, erro (com "Tentar novamente") e sessão expirada (401 → login, voltando depois ao mesmo endereço). |
| T3 | **Erros da API** mostram o `detail` em português ao usuário; erros de rede mostram mensagem própria. |
| T4 | **Responsivo** de 360 px a 1440 px, sem rolagem horizontal da página. Menu lateral vira gaveta no celular. |
| T5 | **Acessibilidade:** tudo operável por teclado, foco visível, foco preso e devolvido nos modais, `aria-*` nos componentes interativos, contraste AA (atenção ao laranja `#FF5C1A` sobre branco). |
| T6 | **Privacidade (LGPD):** antes de uma contratação, o prestador vê do cliente **só o primeiro nome e bairro/cidade** do pedido. Endereço completo, telefone e documento do cliente nunca aparecem no feed nem no detalhe do pedido aberto. |
| T7 | **Papéis:** só `Prestador` acessa o app. Contratante ou administrador que entrar recebe mensagem clara e é desconectado. |
| T8 | **Envios protegidos:** botão desabilitado e estado "Enviando…" durante o POST; envio duplo (duplo clique, Enter repetido) gera uma única requisição. |
| T9 | **Testes:** cada épico entrega testes das regras e verificação no navegador do fluxo principal, inclusive em 390×700. |
| T10 | **Sem segredos no código ou no log** (token, e-mail e documentos não vão para `console`). |

---

## 5. Fase 1 — ciclo mínimo (P1 a P5)

Objetivo: **um prestador cadastrado consegue encontrar um pedido, enviar uma proposta e acompanhar o que aconteceu com ela.** É o que permite exercitar de ponta a ponta as telas do contratante (#83, #84, #86, #87, #89 do Resolvai_Cliente), que hoje só são testáveis com propostas inseridas à mão no banco.

### E0 — Base do projeto

**Estimativa:** front 3–4 dias.

**Como** equipe, **queremos** o esqueleto do app com layout, autenticação e CI, **para** construir os demais épicos sobre uma base única.

**Critérios de aceite**
1. Projeto Vite + React + TS criado, com `npm run dev`, `lint`, `build` e `test` funcionando.
2. Layout com **sidebar** (Home, Pedidos, Propostas, Chat, Perfil, nesta ordem) e topbar; no celular a sidebar vira gaveta com foco preso.
3. Itens do menu **sem tela pronta não aparecem** (Chat só entra na fase 2). Nenhum botão que apenas exibe "em breve".
4. Tema laranja do prestador com variáveis CSS; tela de login (e-mail/senha) reaproveitada do cliente, com recuperação de senha por código.
5. Guarda por papel (T7): rotas privadas redirecionam ao login e voltam ao endereço de origem; papel diferente de `Prestador` é recusado com mensagem.
6. Rota `*` com página 404.
7. Workflow de CI rodando lint, build e testes em cada PR.
8. README mínimo com como rodar e a variável `VITE_API_BASE_URL`.

### E1 — Cadastro e onboarding do prestador (P1)

**Estimativa:** front 5–7 dias · backend 5–7 dias. **Implementado** com as decisões D1 (cadastro livre, sem análise) e D2 (nenhum documento nesta etapa): o onboarding tem **2 passos**.

**Como** prestador, **quero** me cadastrar informando meus dados, as categorias e regiões em que atuo e meus documentos, **para** começar a receber pedidos compatíveis com o meu perfil.

**Critérios de aceite**
1. O cadastro tem **2 passos** com indicador de progresso: (1) dados pessoais (CPF, endereço e contato, o mesmo formulário do contratante) e (2) categorias e cidades de atuação. O onboarding é um **modal que não pode ser dispensado** até ser concluído; quem preferir pode sair da conta.
2. **Passo 1:** nome completo, CPF (ou CNPJ, ver D2), telefone/WhatsApp com DDD, endereço com busca automática de CEP. Máscaras e validações iguais às do app do contratante; mensagens de erro por campo.
3. **Passo 2:** o prestador escolhe **uma ou mais categorias** de uma lista vinda da API (não digitada livremente) e **uma ou mais regiões** (cidade e, opcionalmente, bairros). Exige ao menos uma categoria e uma região.
4. *(Sem documentos nesta etapa, decisão D2.)*
5. Ao concluir, o perfil fica **ativo** na hora: não há análise nem aprovação (decisão D1).
6. **Cadastro incompleto é retomado:** quem sai no meio volta ao passo em que parou ao entrar de novo; quem já finalizou nunca vê o onboarding.
7. Quem tem sessão de prestador com cadastro incompleto e tenta abrir qualquer tela privada é levado ao onboarding (e volta à tela pedida ao terminar).
8. Envio bloqueado durante o POST (T8); erros da API (ex.: CPF já em uso) aparecem no passo correspondente.
9. Testes: validações e máscaras; navegação entre passos preservando dados; retomada; arquivo inválido; fluxo completo no navegador (desktop e 390×700).

**Backend:** papel `Prestador` no cadastro público (`POST /api/v1/auth/register-provider`), perfil profissional (categorias e cidades) e catálogo de categorias (script SQL `015`). Documentos e CNPJ ficam para uma etapa futura.

### E2 — Feed de pedidos (P2)

**Estimativa:** front 5–6 dias · backend 4–6 dias.

**Como** prestador, **quero** ver os pedidos abertos compatíveis com o meu perfil, com filtros, **para** escolher onde enviar proposta.

**Critérios de aceite**
1. O feed lista **apenas pedidos `Pending`** que ainda **não têm proposta escolhida**, do mais recente para o mais antigo, com **paginação** (10 por página, na URL).
2. Cada card mostra título, categoria, bairro/cidade, urgência, data de criação, quantidade de propostas já recebidas e uma foto de capa quando houver. **Não mostra** dados pessoais do cliente (T6).
3. **Filtros funcionais** por categoria, cidade e urgência, e busca por texto; combinam entre si, ficam na URL e têm botão "Limpar filtros". Estado vazio distingue "nenhum pedido compatível" de "nenhum resultado para os filtros".
4. **Compatibilidade:** o card mostra o selo "Compatível com seu perfil" quando a categoria **e** a região do pedido batem com as do prestador. A regra é determinística e descrita na tela; **não** se exibe percentual de "IA" sem fonte (T1). Por padrão o feed prioriza compatíveis (D4).
5. **Faixa de indicadores (KPIs)** no topo da Home, todos vindos da API: pedidos novos hoje, pedidos compatíveis abertos, propostas enviadas e propostas escolhidas. Sem dado, mostra "—".
6. Pedido que já enviou proposta mostra o selo "Proposta enviada" e o atalho para ela.
7. *(Sem estado "em análise" nesta etapa, decisão D1.)*
8. Clicar no card abre o detalhe do pedido (E3).
9. Testes: filtros combinados e URL; paginação; estado vazio; selo de compatibilidade; verificação no navegador em 390×700.

**Backend necessário:** `GET` do feed com filtros e paginação, ocultando dados pessoais; indicadores do prestador; regra de compatibilidade.

### E3 — Detalhe do pedido (P3)

**Estimativa:** front 2–3 dias · backend 1–2 dias.

**Como** prestador, **quero** ver o escopo completo do pedido, **para** decidir e montar uma proposta adequada.

**Critérios de aceite**
1. Mostra título, categoria, descrição, detalhes do ambiente, especificações, urgência, localização (**bairro e cidade**) e data de criação.
2. **Galeria de fotos** do pedido; clicar numa foto abre **modal** com a imagem ampliada, navegável por teclado (setas e Esc).
3. Mostra o cliente de forma limitada (T6): primeiro nome e cidade.
4. Mostra quantas propostas o pedido já recebeu (sem revelar valores de outros prestadores).
5. Botão **Enviar proposta** abre o formulário (E4). Se o prestador já enviou uma proposta ao pedido, o botão vira **Ver minha proposta**.
6. Se o pedido deixou de estar aberto (cancelado, com proposta escolhida ou em andamento) a tela avisa o motivo e **não** oferece envio.
7. Pedido inexistente, ou que o prestador não pode ver, mostra "Pedido não encontrado" (404).
8. Testes: pedido aberto, já com proposta enviada, encerrado e inexistente; galeria por teclado.

**Backend necessário:** detalhe de pedido para prestador (sem dados pessoais), indicando se o prestador já propôs.

### E4 — Enviar proposta (P4)

**Estimativa:** front 3–4 dias · backend 2–3 dias.

**Como** prestador, **quero** enviar uma proposta padronizada com valor, prazo, descrição e garantia, **para** concorrer ao pedido.

Campos do protótipo: *Valor total*, *Prazo de execução*, *Data de início disponível*, *O que você vai fazer*, *Materiais incluídos*, *Prazo/Tipo/Condições da garantia*, aceite dos termos. O banco hoje guarda `valor`, `prazo` (texto), `prazo_dias`, `descricao` e `garantia`; os campos extras estão em **D5**.

**Critérios de aceite**
1. O formulário abre a partir do detalhe do pedido (E3) e coleta: **valor total** (R$, maior que zero, duas casas), **prazo de execução em dias** (inteiro de 1 a 365), **descrição do serviço** (obrigatória, 10 a 2000 caracteres) e **garantia** (**obrigatória**; texto de 3 a 200 caracteres informando prazo e condições).
2. O prazo em dias alimenta `prazo_dias`; o texto `prazo` exibido ao contratante é gerado a partir dele (ex.: "10 dias").
3. Validação por campo, em português, antes do envio, e também no backend (400 com `errors`).
4. Botão **Prévia** abre um **modal** mostrando como o contratante verá a proposta (valor, prazo, garantia, descrição e o próprio nome/avaliação do prestador).
5. Enviar exige uma **confirmação em modal** ("Enviar proposta de R$ X, prazo de N dias?"). Durante o envio, o modal não fecha (T8).
6. **Uma proposta ativa por pedido e por prestador:** tentar propor de novo mostra a mensagem da API (409) e leva à proposta existente.
7. Só é possível propor a pedido **aberto e sem proposta escolhida**; caso contrário a API recusa (409) e a tela explica por quê.
8. Prestador sem cadastro finalizado não envia (a API recusa com "Finalize o cadastro antes de enviar uma proposta."; o app só libera o acesso depois do onboarding).
9. Ao enviar com sucesso, o prestador é levado a **Minhas propostas** (E5) com a nova proposta destacada e o aviso "Proposta enviada".
10. **Editar** (enquanto `Sent` ou `Viewed` e o pedido aberto) reutiliza o mesmo formulário preenchido; **retirar** pede confirmação em modal e a proposta deixa de aparecer ao contratante. Proposta `Chosen` **não** pode ser editada nem retirada pelo app (mensagem explica).
11. Valores monetários usam formato brasileiro (R$ 1.234,56) na tela e ponto decimal na API.
12. Testes: validações de cada campo; envio duplo gera uma requisição; edição e retirada; recusa por pedido encerrado; fluxo no navegador em 390×700.

**Backend necessário:** criar, editar e retirar proposta com as regras acima; gravação de `prazo_dias`; garantia obrigatória; exclusividade por pedido/prestador.

### E5 — Minhas propostas (P5)

**Estimativa:** front 3–4 dias · backend 1–2 dias.

**Como** prestador, **quero** acompanhar o status das propostas que enviei, **para** saber quais foram vistas, escolhidas ou perdidas.

**Critérios de aceite**
1. Lista paginada das propostas do prestador, da mais recente para a mais antiga, mostrando pedido (título e categoria), valor, prazo, data de envio e **status**.
2. **Filtros por status funcionam** — Todas, Enviada, Visualizada, Escolhida, Não selecionada — ficam na URL e refletem a contagem real (defeito corrigido do protótipo).
3. Faixa de indicadores com totais por status, vindos da API.
4. **Enviada**: contratante ainda não abriu. **Visualizada**: já abriu o detalhe. **Escolhida**: mostra "Contratante escolheu sua proposta — aguardando o pagamento" (o pedido só entra em andamento depois do pagamento). **Não selecionada**: outra proposta foi escolhida; sem ações.
5. Ações por card: **Ver pedido**, **Editar** e **Retirar** (conforme regras do E4) e, em `Escolhida`, o atalho para o andamento quando existir (fase 2).
6. Busca por título do pedido.
7. Estado vazio com chamada para o feed ("Ver pedidos abertos").
8. Testes: cada filtro e contagem; cada status com seus textos e ações; paginação; vazio.

**Backend necessário:** listagem das propostas do prestador com filtro de status e totais por status.

### E6 — Perfil e configurações da conta

**Estimativa:** front 3–4 dias · backend 1–2 dias.

**Como** prestador, **quero** ver e editar meus dados, categorias e regiões, **para** manter o perfil atualizado e continuar recebendo pedidos compatíveis.

**Critérios de aceite**
1. A tela de perfil abre como **modal grande** (padrão do app do contratante) a partir da sidebar/topbar e por `?modal=perfil`.
2. Mostra dados da conta (e-mail de acesso, situação do cadastro/aprovação, data de criação) e permite editar nome, telefone, endereço, categorias e regiões. O CPF/CNPJ não é editável.
3. Mostra a **situação dos documentos** enviados (recebido, aprovado, recusado com motivo, quando houver) e permite reenviar um recusado.
4. Alterar categorias/regiões muda imediatamente o que o feed considera "compatível".
5. Botão **Sair da conta** limpa a sessão e leva ao login.
6. Testes: edição válida e inválida; categorias refletindo no feed; sair da conta.

---

## 6. Fase 2 — após definições (P6 a P9 e extras)

> **Não iniciar** antes de existirem as definições de produto e de API listadas em cada épico. Os critérios abaixo são **preliminares** e serão refinados (com estimativa) quando as dependências forem resolvidas. Hoje essas telas existem só como protótipo estático.

| Épico | Tela | Bloqueado por | Critérios preliminares |
|---|---|---|---|
| **E7 — Chat com cliente** | P6 | Especificação de mensagens (tempo real ou *polling*, anexos, notificação) e rotas de chat. | Lista de **pedidos em andamento**; ao abrir um, a conversa com o cliente; checklist de alinhamento; botão "Prosseguir para contrato"; mensagens não lidas; envio bloqueado durante o POST. |
| **E8 — Contrato** | P7 | Issue [Resolvai_Cliente#95](https://github.com/danilomarley/Resolvai_Cliente/issues/95) (modelo de contrato e assinatura do contratante). | Contrato gerado a partir da proposta e do escopo; obrigações do prestador em destaque; garantia; **assinatura** com registro de data e identificação; botões de assinar e de seguir separados (defeito corrigido do protótipo). |
| **E9 — Serviço em andamento** | P8 | Definição de marcos/progresso, upload de evidências e do **fluxo de conclusão** (hoje nada muda um pedido para `Completed`). | Linha do tempo de marcos; envio de fotos de progresso; prestador marca "serviço concluído" e o contratante confirma; pedido passa a `Completed`. |
| **E10 — Recebimento e avaliação do cliente** | P9 | Issues [Resolvai_Cliente#96](https://github.com/danilomarley/Resolvai_Cliente/issues/96) e [#97](https://github.com/danilomarley/Resolvai_Cliente/issues/97): **pagamento não está definido** (gateway, regras de escrow, taxa, estados). | Resumo financeiro (bruto, taxa, líquido) com valores vindos da API; avaliação do cliente pelo prestador (tabela nova); histórico de serviços (RF-12). |
| **E11 — Notificações** | RF-10 | Canal e eventos de notificação. | Alertas de novos pedidos compatíveis, proposta visualizada/escolhida e mensagens. |
| **E12 — Portfólio e perfil público** | RF-09 | Regras de curadoria e de exibição pública; consumo pelo contratante ([Resolvai_Cliente#93](https://github.com/danilomarley/Resolvai_Cliente/issues/93)). | Portfólio de fotos, descrição profissional, avaliações recebidas e serviços concluídos, exibidos ao contratante. |

## 7. Contrato de API proposto

> **Proposta** para alinhar com o backend antes de implementar. Nomes seguem a convenção atual (`/api/v1/...`, campos em inglês, `ProblemDetails` nos erros, `Cache-Control: no-store`). Nada abaixo existe ainda.

| Método e rota | Épico | Finalidade |
|---|---|---|
| `POST /api/v1/auth/register-provider` | E1 | Cria usuário com papel `Prestador` (cadastro livre, D1). |
| `GET /api/v1/catalog/categories` | E1, E2 | Categorias de serviço aceitas. |
| `GET` · `PUT /api/v1/provider/profile` | E1, E6 | Perfil profissional: categorias, regiões, status de aprovação. |
| `POST /api/v1/provider/documents` (multipart) · `GET /api/v1/provider/documents` | E1, E6 | Envio e situação dos documentos (armazenamento privado). |
| `GET /api/v1/provider/summary` | E2 | Indicadores da Home. |
| `GET /api/v1/provider/orders?category=&city=&urgency=&q=&page=&pageSize=` | E2 | Feed de pedidos abertos, sem dados pessoais do cliente. |
| `GET /api/v1/provider/orders/{id}` | E3 | Detalhe do pedido para o prestador; indica se ele já propôs. |
| `POST /api/v1/provider/orders/{id}/proposals` | E4 | Cria proposta: `value`, `deadlineDays`, `description`, `warranty`. |
| `GET /api/v1/provider/proposals?status=&q=&page=&pageSize=` | E5 | Minhas propostas, com totais por status. |
| `GET` · `PATCH` · `DELETE /api/v1/provider/proposals/{id}` | E4, E5 | Detalhe, edição e retirada. |

Regras de servidor que os critérios de aceite assumem: só `Prestador` ativo e aprovado propõe; pedido precisa estar `Pending` sem proposta escolhida; **uma proposta ativa por pedido e prestador**; `warranty` obrigatória; `deadlineDays` inteiro positivo; cliente nunca é exposto além de primeiro nome e cidade.

## 8. Estimativa e ordem de entrega

Dias de **uma pessoa** que já conhece o código do Resolvai_Cliente. Faixa de erro de ±30%.

| Épico | Front | Backend |
|---|---|---|
| E0 Base do projeto | 3–4 | — |
| E1 Cadastro e onboarding | 5–7 | 5–7 |
| E2 Feed de pedidos | 5–6 | 4–6 |
| E3 Detalhe do pedido | 2–3 | 1–2 |
| E4 Enviar proposta | 3–4 | 2–3 |
| E5 Minhas propostas | 3–4 | 1–2 |
| E6 Perfil e configurações | 3–4 | 1–2 |
| **Fase 1 (E0–E6)** | **24–32** | **14–22** |
| Fase 2 (E7–E12) | 25–33 | 25–30 + pagamento *(não estimável)* |

Ordem sugerida, um PR por bloco (cada um com testes e verificação no navegador):

1. **E0** base e CI.
2. **E1** cadastro/onboarding (com o backend de papel e perfil).
3. **E2 + E3** feed e detalhe (com a rota de feed).
4. **E4** enviar, editar e retirar proposta — **a partir daqui o ciclo do contratante pode ser testado com dados reais**.
5. **E5** minhas propostas.
6. **E6** perfil e configurações.

Fase 2 só após as definições da seção 6.

## 9. Definição de pronto

Um épico só está pronto quando **todos** os itens valem:

- [ ] Todos os critérios de aceite do épico e os requisitos transversais T1–T10 foram atendidos.
- [ ] Rotas de backend usadas existem, estão documentadas e tiveram o contrato validado (sem dados simulados no app).
- [ ] Testes automatizados passam (`lint`, `build`, `test`) e o fluxo principal foi exercitado no navegador, em desktop e 390×700.
- [ ] Revisão de acessibilidade básica: teclado, foco, rótulos e contraste.
- [ ] README ou este documento atualizados quando o comportamento mudou.
- [ ] Mudança entregue por commit ou PR na `main`, com resumo e o que ficou de fora.

---

## Decisões

### Já tomadas

| Tema | Decisão |
|---|---|
| Acesso a pedido de outro usuário | A API responde **404** (não 403), como nas demais rotas de pedidos. |
| Prazo da proposta | **`prazo_dias` numérico** (além do texto), usado na ordenação do contratante. |
| Proposta visualizada | Marcada quando o contratante **abre o detalhe** da proposta; a listagem não marca. |
| Aceite da proposta | Marca a proposta como `Chosen` e as demais como `NotChosen`. **Não** coloca o pedido em andamento: isso só acontece **após o pagamento**. |
| Pagamento e repasse | **Nada definido** (gateway, escrow, taxa, estados). Bloqueia o E10. |
| D1 — Como o prestador entra | **Cadastro livre**, igual ao do contratante (`/cadastro`). Sem convite, sem aprovação. |
| D2 — Documentos | **Nenhum** nesta etapa. |
| D3 — Plataforma | **Só web responsivo.** |
| D4 — Compatibilidade do feed | Pedido **compatível** = a categoria do pedido está entre as do prestador **e** a cidade do pedido está entre as dele (sem diferenciar acentos e maiúsculas). Pedidos não compatíveis continuam visíveis, sem o selo. |
| D5 — Campos extras da proposta | Fase 1 usa o que o banco já tem: **valor, prazo em dias, descrição e garantia** (obrigatória). Materiais incluídos entram na descrição; "data de início" e "tipo de garantia" ficam para uma etapa futura, com migração. |
| D6 — Categorias | Catálogo fixo servido pela API (`GET /api/v1/catalog/categories`), com a **primeira lista em SQL** (`db/scripts/015_create_categorias_servico.sql` no backend), editável direto na tabela. |

Novas decisões entram na tabela acima, e os critérios dos épicos afetados são ajustados.
