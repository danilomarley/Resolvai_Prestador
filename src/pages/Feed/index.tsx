import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { OrderCard } from '../../components/OrderCard'
import { EmptyState, LoadError, Pager } from '../../components/ui'
import { useProvider } from '../../components/providerContext'
import { useApi } from '../../services/useApi'
import { getFeed, queryString, urgencyOptions, type FeedQuery } from '../../services/providerApi'

const FILTERS = ['category', 'city', 'urgency', 'q', 'compatible'] as const

export function Feed() {
  const { token, categories, revision } = useProvider()
  const [params, setParams] = useSearchParams()
  const query: FeedQuery = {
    category: params.get('category') ?? undefined, city: params.get('city') ?? undefined, urgency: params.get('urgency') ?? undefined,
    q: params.get('q') ?? undefined, compatible: params.get('compatible') === 'true',
    page: Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1),
  }
  const feed = useApi(`feed:${queryString({ ...query })}:${revision}`, (signal) => getFeed(token, query, signal))

  // Campos de texto aplicam ao enviar (Enter ou botão); selects e caixa aplicam na hora.
  // Cada campo só é reescrito quando o valor dele na URL muda (voltar, limpar filtros): mudar outro filtro não apaga o que foi digitado.
  const urlQ = params.get('q') ?? ''
  const urlCity = params.get('city') ?? ''
  const [text, setText] = useState({ q: urlQ, city: urlCity })
  const [seen, setSeen] = useState({ q: urlQ, city: urlCity })
  if (seen.q !== urlQ || seen.city !== urlCity) {
    if (seen.q !== urlQ) setText((current) => ({ ...current, q: urlQ }))
    if (seen.city !== urlCity) setText((current) => ({ ...current, city: urlCity }))
    setSeen({ q: urlQ, city: urlCity })
  }

  // Parte da URL atual (e não dos parâmetros da última renderização): dois filtros aplicados em sequência rápida não se perdem.
  function apply(changes: Partial<Record<(typeof FILTERS)[number], string | undefined>>) {
    const next = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key) }
    next.delete('page')
    setParams(next)
  }
  const onSelect = (key: (typeof FILTERS)[number]) => (event: ChangeEvent<HTMLSelectElement>) => apply({ [key]: event.target.value || undefined })
  const onSubmit = (event: FormEvent) => { event.preventDefault(); apply({ q: text.q.trim() || undefined, city: text.city.trim() || undefined }) }
  const filtered = FILTERS.some((key) => params.has(key))

  return (
    <>
      <div className="page-heading">
        <h1>Pedidos abertos</h1>
        <p>Pedidos que ainda recebem propostas. Os compatíveis com o seu perfil aparecem primeiro.</p>
      </div>

      <form className="panel filters" onSubmit={onSubmit} role="search" aria-label="Filtrar pedidos">
        <label>Buscar
          <input type="search" value={text.q} maxLength={80} placeholder="Título, categoria ou descrição" onChange={(event) => setText({ ...text, q: event.target.value })} />
        </label>
        <label>Categoria
          <select value={query.category ?? ''} onChange={onSelect('category')}>
            <option value="">Todas</option>
            {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
          </select>
        </label>
        <label>Cidade
          <input value={text.city} maxLength={80} placeholder="Ex.: Fortaleza" onChange={(event) => setText({ ...text, city: event.target.value })} />
        </label>
        <label>Urgência
          <select value={query.urgency ?? ''} onChange={onSelect('urgency')}>
            <option value="">Qualquer</option>
            {urgencyOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="check-option inline">
          <input type="checkbox" checked={!!query.compatible} onChange={(event) => apply({ compatible: event.target.checked ? 'true' : undefined })} />
          <span>Só compatíveis comigo</span>
        </label>
        <div className="filters-actions">
          <button className="button button-primary" type="submit">Filtrar</button>
          {filtered && <button className="button button-secondary" type="button" onClick={() => setParams(new URLSearchParams())}>Limpar filtros</button>}
        </div>
      </form>

      {feed.error ? <LoadError error={feed.error} onRetry={feed.retry} />
        : feed.loading ? <p role="status">Carregando pedidos…</p>
        : feed.data && feed.data.items.length > 0 ? (
          <>
            <p className="muted" role="status">{feed.data.totalItems} {feed.data.totalItems === 1 ? 'pedido encontrado' : 'pedidos encontrados'}</p>
            <div className="order-grid">{feed.data.items.map((order) => <OrderCard key={order.id} order={order} />)}</div>
            <Pager page={feed.data.page} totalPages={feed.data.totalPages}
              onPage={(page) => { const next = new URLSearchParams(window.location.search); if (page > 1) next.set('page', String(page)); else next.delete('page'); setParams(next) }} />
          </>
        ) : (
          <EmptyState icon="search" title={filtered ? 'Nenhum pedido para estes filtros' : 'Nenhum pedido aberto no momento'}>
            {filtered ? 'Tente remover algum filtro ou buscar por outro termo.' : 'Volte em instantes: novos pedidos chegam durante o dia.'}
          </EmptyState>
        )}
    </>
  )
}
