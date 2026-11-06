# ResolvAI Prestador

App web do **prestador de serviços** do marketplace ResolvAI: encontrar pedidos abertos na sua área, enviar propostas e acompanhar o resultado. Usa o mesmo backend do portal do contratante ([Resolvai_Backend_Node](https://github.com/danilomarley/Resolvai_Backend_Node)).

O escopo, os critérios de aceite e as decisões estão em [`ESCOPO.md`](ESCOPO.md). As rotas de API usadas estão em `docs/PRESTADOR.md` do backend.

## Telas

| Rota | Tela |
| --- | --- |
| `/login`, `/cadastro` | Entrada e cadastro livre do prestador |
| (modal, primeiro acesso) | Cadastro em 2 passos: dados (CPF, endereço, contato) e categorias/cidades de atuação |
| `/` | Início: indicadores e pedidos compatíveis recentes |
| `/pedidos` | Pedidos abertos, com filtros (categoria, cidade, urgência, texto, só compatíveis) e paginação |
| `/pedidos/:id` | Detalhe do pedido, galeria de fotos e painel da sua proposta |
| `?modal=proposta&pedido=:id` | Enviar ou editar proposta (formulário e revisão) |
| `/propostas` | Minhas propostas, com filtro por status, busca, edição e retirada |
| `?modal=perfil` | Perfil: dados da conta e áreas de atuação |

Modais ficam na URL (`?modal=...`): o botão voltar fecha e o F5 reabre. Filtros e páginas também ficam na URL.

## Rodando

```bash
npm install
cp .env.example .env   # API_PROXY_TARGET aponta para o backend local (porta 5172)
npm run dev
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento; o Vite encaminha `/api` ao backend |
| `npm run lint` | ESLint |
| `npm test` | Testes das regras e dos componentes |
| `npm run build` | Verifica os tipos e gera `dist/` |

### Variáveis

| Variável | Quando | Descrição |
| --- | --- | --- |
| `API_PROXY_TARGET` | desenvolvimento | Endereço do backend para o proxy do Vite (padrão `http://localhost:5172`). |
| `VITE_API_BASE_URL` | build de produção | URL da API (ex.: `https://resolvai-api.onrender.com`), lida **no build**. Uma API em outra origem exige o endereço deste app em `CORS_ALLOWED_ORIGINS` do backend. |

## Banco de dados

O app depende dos scripts SQL `014` a `017` do backend (`db/scripts`, ou `db/aplicar-prestador.sql` para os três últimos juntos). Sem eles, as rotas do prestador respondem 500.

## Deploy

Static Site no Render, descrito em `render.yaml` (`npm ci && npm run build`, publicação de `dist`, reescrita de qualquer caminho para `index.html`). Defina `VITE_API_BASE_URL` e libere o endereço do site em `CORS_ALLOWED_ORIGINS` da API.

## Fluxo de trabalho

CI (`lint`, `test`, `build`) roda a cada push e PR. Mudanças entram por branch e PR para `main`.
