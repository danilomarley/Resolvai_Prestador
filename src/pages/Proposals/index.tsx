import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Modal } from '../../components/Modal'
import { EmptyState, LoadError, Pager, StatusBadge } from '../../components/ui'
import { useProvider } from '../../components/providerContext'
import { useApi } from '../../services/useApi'
import { formatDate, formatMoney } from '../../services/format'
import { modalLink } from '../../services/modalRoute'
import { deleteProposal, getProposals, isEditable, proposalStatusLabel, proposalStatuses, type Proposal, type ProposalCounts, type ProposalStatus } from '../../services/providerApi'
import type { ApiError } from '../../services/api'

const countOf = (counts: ProposalCounts, status?: ProposalStatus) =>
  status === undefined ? counts.total : counts[({ Sent: 'sent', Viewed: 'viewed', Chosen: 'chosen', NotChosen: 'notChosen' } as const)[status]]

function ProposalCard({ proposal, onWithdraw, here }: { proposal: Proposal; onWithdraw: (proposal: Proposal) => void; here: { pathname: string; search: string } }) {
  return (
    <article className="panel proposal-card">
      <div className="proposal-card-head">
        <h3><Link to={`/pedidos/${proposal.orderId}`}>{proposal.orderTitle}</Link></h3>
        <StatusBadge status={proposal.status} />
      </div>
      <p className="muted">{proposal.orderLocation ?? 'Localização não informada'}{proposal.orderCategory ? ` · ${proposal.orderCategory}` : ''}</p>
      <dl className="detail-list inline">
        <div><dt>Valor</dt><dd>{formatMoney(proposal.value)}</dd></div>
        <div><dt>Prazo</dt><dd>{proposal.deadline ?? (proposal.deadlineDays ? `${proposal.deadlineDays} dias` : '—')}</dd></div>
        <div><dt>Enviada em</dt><dd>{formatDate(proposal.createdAt)}</dd></div>
      </dl>
      {proposal.status === 'Chosen' && <p className="note success">O contratante escolheu sua proposta. Agora falta o pagamento para o serviço começar.</p>}
      {proposal.status === 'NotChosen' && <p className="note">O contratante escolheu outra proposta para este pedido.</p>}
      <div className="actions-row">
        <Link className="button button-secondary button-sm" to={`/pedidos/${proposal.orderId}`}>Ver pedido</Link>
        {isEditable(proposal) && <>
          <Link className="button button-secondary button-sm" {...modalLink(here.pathname, here.search, 'proposta', proposal.orderId)}>Editar</Link>
          <button className="button button-secondary button-sm danger" onClick={() => onWithdraw(proposal)}>Retirar</button>
        </>}
      </div>
    </article>
  )
}

export function Proposals() {
  const { token, revision, bump, notify } = useProvider()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const status = proposalStatuses.find((item) => item === params.get('status'))
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  const q = params.get('q') ?? ''
  const [search, setSearch] = useState(q)
  const list = useApi(`proposals:${status}:${q}:${page}:${revision}`, (signal) => getProposals(token, { status, q: q || undefined, page }, signal))
  const [withdrawing, setWithdrawing] = useState<Proposal>()
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')

  // Parte da URL atual (e não dos parâmetros da última renderização): filtros aplicados em sequência rápida não se perdem.
  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key) }
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  async function withdraw() {
    if (!withdrawing || busy) return
    setBusy(true)
    setFailure('')
    try {
      await deleteProposal(token, withdrawing.id)
      notify('Proposta retirada.')
      bump()
      setWithdrawing(undefined)
    } catch (error) {
      setFailure((error as ApiError).message ?? 'Não foi possível retirar a proposta.')
    } finally {
      setBusy(false)
    }
  }

  const counts = list.data?.counts
  return (
    <>
      <div className="page-heading">
        <h1>Minhas propostas</h1>
        <p>Acompanhe o que aconteceu com cada proposta que você enviou.</p>
      </div>

      <div className="chips" role="group" aria-label="Filtrar por status">
        {[undefined, ...proposalStatuses].map((item) => (
          <button key={item ?? 'all'} className={`chip-filter${status === item ? ' active' : ''}`} aria-pressed={status === item}
            onClick={() => update({ status: item })}>
            {item ? proposalStatusLabel[item] : 'Todas'}{counts ? ` (${countOf(counts, item)})` : ''}
          </button>
        ))}
      </div>
      <form className="search-row" role="search" onSubmit={(event) => { event.preventDefault(); update({ q: search.trim() || undefined }) }}>
        <label className="sr-only" htmlFor="proposal-search">Buscar pelo título do pedido</label>
        <input id="proposal-search" type="search" value={search} maxLength={80} placeholder="Buscar pelo título do pedido" onChange={(event) => setSearch(event.target.value)} />
        <button className="button button-secondary" type="submit">Buscar</button>
      </form>

      {list.error ? <LoadError error={list.error} onRetry={list.retry} />
        : list.loading ? <p role="status">Carregando propostas…</p>
        : list.data && list.data.items.length > 0 ? (
          <>
            <div className="proposal-list">{list.data.items.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} onWithdraw={setWithdrawing} here={location} />)}</div>
            <Pager page={list.data.page} totalPages={list.data.totalPages} onPage={(next) => update({ page: next > 1 ? String(next) : undefined })} />
          </>
        ) : (
          <EmptyState icon="file" title={status || q ? 'Nenhuma proposta para este filtro' : 'Você ainda não enviou propostas'}
            action={<Link className="button button-primary" to="/pedidos">Ver pedidos abertos</Link>}>
            {status || q ? 'Remova o filtro para ver todas as suas propostas.' : 'Encontre um pedido na sua área e envie a primeira proposta.'}
          </EmptyState>
        )}

      {withdrawing && (
        <Modal size="sm" title="Retirar proposta?" onClose={() => setWithdrawing(undefined)} dismissible={!busy}
          footer={<>
            <button type="button" className="button button-secondary" onClick={() => setWithdrawing(undefined)} disabled={busy}>Manter proposta</button>
            <button type="button" className="button button-primary" onClick={withdraw} disabled={busy}>{busy ? 'Retirando…' : 'Retirar proposta'}</button>
          </>}>
          <p>A proposta de {formatMoney(withdrawing.value)} para <strong>{withdrawing.orderTitle}</strong> deixa de aparecer para o contratante. Você poderá enviar outra enquanto o pedido estiver aberto.</p>
          {failure && <p role="alert" className="form-error">{failure}</p>}
        </Modal>
      )}
    </>
  )
}
