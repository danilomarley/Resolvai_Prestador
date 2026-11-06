import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import ts from 'typescript'

process.env.NODE_ENV = 'production'
const { default: React } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { StaticRouter } = await import('react-router-dom')

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL)
      for (const extension of ['.ts', '.tsx']) {
        if (existsSync(fileURLToPath(url) + extension)) return { url: url.href + extension, shortCircuit: true }
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true }
    if (url.endsWith('.svg')) return { format: 'module', source: 'export default "/logo.svg"', shortCircuit: true }
    if (/\.tsx?$/.test(url)) return { format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
      }).outputText }
    return nextLoad(url, context)
  },
})

const { createApiClient, ApiError } = await import('../src/services/api.ts')
const { formatMoney, formatAgo, centsFromInput, maskCents, centsToNumber, numberToCents } = await import('../src/services/format.ts')
const { validateProposal } = await import('../src/services/proposalForm.ts')
const { safeReturnPath } = await import('../src/services/returnPath.ts')
const { readModal, readOrder, searchWithModal, modalLink } = await import('../src/services/modalRoute.ts')
const { parseFeed, parseProposalPage, parseProfile, parseSummary, parseOrder, isEditable, queryString } = await import('../src/services/providerApi.ts')
const { Sidebar } = await import('../src/components/Sidebar.tsx')
const { OrderCard } = await import('../src/components/OrderCard.tsx')
const { ActuationForm } = await import('../src/components/ActuationForm.tsx')
const { StatusBadge, Pager, EmptyState } = await import('../src/components/ui.tsx')
const { Login } = await import('../src/pages/Login/index.tsx')
const { Cadastro } = await import('../src/pages/Cadastro/index.tsx')
const { NotFound } = await import('../src/pages/NotFound/index.tsx')

const router = (element, location = '/') => renderToStaticMarkup(React.createElement(StaticRouter, { location }, element))
const response = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const api = (status, body) => createApiClient('https://api.exemplo.test', async () => response(status, body))
const feedItem = (extra = {}) => ({ id: randomUUID(), title: 'Tomada sem energia', createdAt: new Date().toISOString(), proposalsCount: 0, customerFirstName: 'Maria', compatible: false, ...extra })
const proposal = (extra = {}) => ({ id: randomUUID(), orderId: randomUUID(), orderTitle: 'Pedido', orderStatus: 'Pending', status: 'Sent', value: 100, createdAt: new Date().toISOString(), ...extra })

test('API errors show the message written by the API, with field names translated', async () => {
  await assert.rejects(api(400, { errors: { Value: ['O campo Value deve ser maior que zero.'] } })('/api/v1/provider/proposals', { method: 'POST', body: {} }),
    (error) => error instanceof ApiError && error.status === 400 && error.message === 'O campo Valor deve ser maior que zero.')
  await assert.rejects(api(409, { detail: 'Você já enviou uma proposta para este pedido. Edite a proposta existente.' })('/x', { method: 'POST' }),
    (error) => error.status === 409 && error.message.startsWith('Você já enviou'))
  await assert.rejects(api(404, { detail: "Pedido 'x' não foi encontrado." })('/x'), (error) => error.status === 404 && /indisponível/.test(error.message))
  await assert.rejects(api(500, {})('/x'), (error) => error.status === 500 && /Não foi possível concluir/.test(error.message))
})

test('login failures are generic, inactive accounts are explained, and network failures report status 0', async () => {
  await assert.rejects(api(401, { detail: 'Credenciais inválidas.' })('/api/v1/auth/login', { method: 'POST' }), (error) => /Confira o e-mail/.test(error.message))
  await assert.rejects(api(401, { detail: 'Usuário inativo.' })('/api/v1/auth/login', { method: 'POST' }), (error) => /inativa/.test(error.message))
  const offline = createApiClient('https://api.exemplo.test', async () => { throw new TypeError('fetch failed') })
  await assert.rejects(offline('/x'), (error) => error.status === 0 && /conectar/.test(error.message))
})

test('successful calls send the token and JSON body; 204 has no body', async () => {
  let sent
  const client = createApiClient('https://api.exemplo.test/', async (url, init) => { sent = { url, init }; return new Response(null, { status: 204 }) })
  assert.equal(await client('/api/v1/provider/proposals/1', { token: 'abc', method: 'DELETE' }), undefined)
  assert.equal(sent.url, 'https://api.exemplo.test/api/v1/provider/proposals/1')
  assert.equal(sent.init.headers.Authorization, 'Bearer abc')
  await createApiClient('https://api.exemplo.test', async (url, init) => { sent = { url, init }; return response(200, {}) })('/p', { method: 'PUT', body: { a: 1 } })
  assert.equal(sent.init.body, '{"a":1}')
  assert.equal(sent.init.headers['Content-Type'], 'application/json')
})

test('money helpers mask digits as cents and round-trip', () => {
  assert.equal(centsFromInput('R$ 12,34'), '1234')
  assert.equal(centsFromInput('000'), '')
  assert.equal(centsToNumber('1234'), 12.34)
  assert.equal(numberToCents(450.5), '45050')
  assert.match(maskCents('45050'), /450,50/)
  assert.equal(maskCents(''), '')
  assert.match(formatMoney(1234.5), /1\.234,50/)
  assert.equal(formatMoney(undefined), '—')
})

test('relative dates read naturally and old dates fall back to the full date', () => {
  const now = Date.parse('2026-11-06T12:00:00Z')
  assert.equal(formatAgo('2026-11-06T11:59:30Z', now), 'agora há pouco')
  assert.equal(formatAgo('2026-11-06T11:15:00Z', now), 'há 45 min')
  assert.equal(formatAgo('2026-11-06T09:00:00Z', now), 'há 3 h')
  assert.equal(formatAgo('2026-11-05T12:00:00Z', now), 'há 1 dia')
  assert.equal(formatAgo('2026-11-03T12:00:00Z', now), 'há 3 dias')
  assert.match(formatAgo('2026-10-01T12:00:00Z', now), /01\/10\/2026/)
})

test('proposal validation mirrors the API rules and builds the payload', () => {
  const ok = validateProposal({ cents: '45050', days: '10', description: '  Troco a tomada e testo  ', warranty: ' 90 dias ' })
  assert.deepEqual(ok.input, { value: 450.5, deadlineDays: 10, description: 'Troco a tomada e testo', warranty: '90 dias' })
  const bad = (change) => validateProposal({ cents: '45050', days: '10', description: 'Descrição válida', warranty: '90 dias', ...change }).errors
  assert.ok(bad({ cents: '' }).cents)
  assert.ok(bad({ cents: '99999999999' }).cents)
  assert.ok(bad({ days: '' }).days)
  assert.ok(bad({ days: '0' }).days)
  assert.ok(bad({ days: '366' }).days)
  assert.ok(bad({ description: 'curta' }).description)
  assert.ok(bad({ description: 'x'.repeat(2001) }).description)
  assert.match(bad({ warranty: '  ' }).warranty, /obrigatória/)
  assert.ok(bad({ warranty: 'x'.repeat(201) }).warranty)
  assert.equal(Object.keys(validateProposal({ cents: '', days: '', description: '', warranty: '' }).errors).length, 4)
})

test('login only returns to known screens with known parameters', () => {
  const id = randomUUID()
  for (const ok of ['/', '/pedidos', `/pedidos/${id}`, '/propostas', '/propostas?status=Chosen&page=2', '/pedidos?category=eletrica&city=Quixadá&compatible=true',
    `/pedidos/${id}?modal=proposta&pedido=${id}`, '/?modal=perfil']) assert.equal(safeReturnPath(ok), ok)
  for (const bad of [undefined, 7, 'https://evil.example', '//evil.example', '/login', '/pedidos/abc', '/propostas?status=Hacked', '/pedidos?redirect=//evil',
    '/pedidos?city=<script>', '/propostas#x', '/?modal=desconhecido', '/pedidos?a=1?b=2']) assert.equal(safeReturnPath(bad), '/')
})

test('modal state lives in the URL and carries only a valid order id', () => {
  const id = randomUUID()
  assert.equal(readModal('?modal=proposta', ['perfil', 'proposta']), 'proposta')
  assert.equal(readModal('?modal=outro', ['perfil', 'proposta']), null)
  assert.equal(readOrder(`?pedido=${id.toUpperCase()}`), id)
  assert.equal(readOrder('?pedido=../x'), null)
  assert.equal(searchWithModal('?status=Sent', 'proposta', id), `?status=Sent&modal=proposta&pedido=${id}`)
  assert.equal(searchWithModal(`?modal=proposta&pedido=${id}&status=Sent`, null), '?status=Sent')
  const link = modalLink('/pedidos/x', '', 'proposta', id)
  assert.deepEqual(link.to, { pathname: '/pedidos/x', search: `?modal=proposta&pedido=${id}` })
  assert.equal(link.state.modalOpened, true)
})

test('API payloads are validated before they reach the screens', () => {
  const page = (items) => ({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 })
  assert.equal(parseFeed(page([feedItem({ compatible: true, myProposalId: randomUUID() })])).items.length, 1)
  assert.throws(() => parseFeed(page([{ ...feedItem(), compatible: 'sim' }])), ApiError)
  assert.throws(() => parseFeed({ items: [], page: 1 }), ApiError)
  const counts = { total: 1, sent: 1, viewed: 0, chosen: 0, notChosen: 0 }
  assert.equal(parseProposalPage({ ...page([proposal()]), counts }).counts.sent, 1)
  assert.throws(() => parseProposalPage(page([proposal()])), ApiError)
  assert.throws(() => parseProposalPage({ ...page([proposal({ status: 'Desconhecido' })]), counts }), ApiError)
  assert.equal(parseProfile({ categories: [], cities: ['Fortaleza'], registrationComplete: true, onboardingComplete: false }).cities[0], 'Fortaleza')
  assert.throws(() => parseProfile({ categories: [], cities: [1], registrationComplete: true, onboardingComplete: true }), ApiError)
  assert.equal(parseSummary({ newOrdersLast24h: 1, compatibleOpenOrders: 2, proposals: counts }).compatibleOpenOrders, 2)
  assert.throws(() => parseSummary({ newOrdersLast24h: -1, compatibleOpenOrders: 2, proposals: counts }), ApiError)
  const order = { ...feedItem(), description: 'Descrição', status: 'Pending', open: true, photos: [] }
  assert.equal(parseOrder(order).open, true)
  assert.throws(() => parseOrder({ ...order, photos: [{ id: 1 }] }), ApiError)
})

test('a proposal is editable only while undecided on an open order', () => {
  assert.equal(isEditable(proposal({ status: 'Sent' })), true)
  assert.equal(isEditable(proposal({ status: 'Viewed' })), true)
  assert.equal(isEditable(proposal({ status: 'Chosen' })), false)
  assert.equal(isEditable(proposal({ status: 'NotChosen' })), false)
  assert.equal(isEditable(proposal({ orderStatus: 'Cancelled' })), false)
})

test('query strings drop empty filters', () => {
  assert.equal(queryString({ q: '', city: 'Fortaleza', compatible: true, page: 2, urgency: undefined, category: undefined }), '?city=Fortaleza&compatible=true&page=2')
  assert.equal(queryString({ compatible: false }), '')
})

test('sidebar offers only working screens, marks the current one and opens the profile', () => {
  const props = { mobileOpen: false, setMobileOpen() {}, userName: 'Paulo Eletricista', onProfile() {} }
  const html = router(React.createElement(Sidebar, props), '/propostas')
  for (const label of ['Início', 'Pedidos abertos', 'Minhas propostas']) assert.match(html, new RegExp(`<span>${label}</span>`))
  for (const removed of ['Chat', 'Mensagens', 'Contratos', 'Pagamentos']) assert.doesNotMatch(html, new RegExp(removed))
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1)
  assert.match(html, /aria-current="page"[^>]*>(?:(?!<\/a>)[\s\S])*Minhas propostas/)
  assert.match(html, /aria-label="Abrir perfil de Paulo Eletricista"/)
  assert.match(html, /<small>Prestador<\/small>/)
  assert.match(router(React.createElement(Sidebar, props), '/pedidos/' + randomUUID()), /aria-current="page"[^>]*>(?:(?!<\/a>)[\s\S])*Pedidos abertos/)
})

test('order cards show compatibility, sent proposals and never a cover that is not a URL', () => {
  const base = feedItem({ id: '11111111-1111-4111-8111-111111111111', category: 'Elétrica', location: 'Centro, Quixadá', urgency: 'Urgente', proposalsCount: 2 })
  const html = router(React.createElement(OrderCard, { order: { ...base, compatible: true, coverPhotoUrl: 'https://exemplo.com/a.jpg' } }))
  assert.match(html, /Compatível com seu perfil/)
  assert.match(html, /<img[^>]+src="https:\/\/exemplo\.com\/a\.jpg"/)
  assert.match(html, /Urgente/)
  assert.match(html, /2 propostas/)
  assert.match(html, /Cliente: Maria/)
  assert.match(html, /href="\/pedidos\/11111111-1111-4111-8111-111111111111"/)
  assert.match(html, /Ver pedido <svg/)
  const sent = router(React.createElement(OrderCard, { order: { ...base, myProposalId: randomUUID(), coverPhotoUrl: 'pedidos/caminho-no-storage.jpg' } }))
  assert.doesNotMatch(sent, /<img/)
  assert.doesNotMatch(sent, /Compatível com seu perfil/)
  assert.match(sent, /Proposta enviada/)
  assert.match(sent, /Ver minha proposta/)
  assert.match(router(React.createElement(OrderCard, { order: { ...base, proposalsCount: 1 } })), /1 proposta(?!s)/)
})

test('actuation form lists categories as checkboxes, shows cities and explains compatibility', () => {
  const categories = [{ id: randomUUID(), slug: 'eletrica', name: 'Elétrica' }, { id: randomUUID(), slug: 'pintura', name: 'Pintura' }]
  const render = (props) => renderToStaticMarkup(React.createElement(ActuationForm, { id: 'f', categories, initialIds: [categories[0].id], initialCities: ['Fortaleza'], disabled: false, onSubmit() {}, ...props }))
  const html = render({})
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2)
  assert.match(html, /checked=""[^>]*\/><span>Elétrica/)
  assert.match(html, /Fortaleza/)
  assert.match(html, /aria-label="Remover Fortaleza"/)
  assert.match(html, /categoria e a cidade dele batem/)
  assert.match(render({ disabled: true }), /<fieldset disabled=""/)
  assert.match(render({ error: 'Escolha apenas categorias disponíveis no catálogo.' }), /role="alert"[^>]*>Escolha apenas/)
})

test('status badges, pager and empty state render accessibly', () => {
  for (const [status, label] of [['Sent', 'Enviada'], ['Viewed', 'Visualizada'], ['Chosen', 'Escolhida'], ['NotChosen', 'Não selecionada']]) {
    assert.match(renderToStaticMarkup(React.createElement(StatusBadge, { status })), new RegExp(label))
  }
  assert.equal(renderToStaticMarkup(React.createElement(Pager, { page: 1, totalPages: 1, onPage() {} })), '')
  const pager = renderToStaticMarkup(React.createElement(Pager, { page: 1, totalPages: 3, onPage() {} }))
  assert.match(pager, /aria-label="Paginação"/)
  assert.match(pager, /disabled=""[^>]*>Anterior/)
  assert.match(pager, /Página 1 de 3/)
  assert.match(renderToStaticMarkup(React.createElement(EmptyState, { title: 'Nada aqui' }, 'Explicação')), /role="status"[\s\S]*Nada aqui[\s\S]*Explicação/)
})

test('public pages speak to providers', () => {
  const login = router(React.createElement(Login), '/login')
  assert.match(login, /Prestador/)
  assert.match(login, /Cadastre-se como prestador/)
  assert.match(login, /href="\/cadastro"/)
  const cadastro = router(React.createElement(Cadastro), '/cadastro')
  assert.match(cadastro, /conta de prestador/)
  assert.match(cadastro, /Criar conta/)
  assert.match(router(React.createElement(NotFound)), /Página não encontrada/)
})
