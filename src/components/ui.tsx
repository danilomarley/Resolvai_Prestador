import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import type { ApiError } from '../services/api'
import { proposalStatusLabel, type ProposalStatus } from '../services/providerApi'

export function LoadError({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="panel load-error" role="alert">
      <p>{error.message}</p>
      {onRetry && <button className="button button-secondary" onClick={onRetry}>Tentar novamente</button>}
    </div>
  )
}

export function EmptyState({ icon = 'search', title, children, action }: {
  icon?: 'search' | 'file' | 'bag'; title: string; children?: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="empty-state" role="status">
      <Icon name={icon} size={30} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <nav className="pager" aria-label="Paginação">
      <button className="button button-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
      <span>Página {page} de {totalPages}</span>
      <button className="button button-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Próxima</button>
    </nav>
  )
}

const statusClass: Record<ProposalStatus, string> = { Sent: 'sent', Viewed: 'viewed', Chosen: 'chosen', NotChosen: 'notchosen' }

export function StatusBadge({ status }: { status: ProposalStatus }) {
  return <span className={`status-pill ${statusClass[status]}`}><i />{proposalStatusLabel[status]}</span>
}

export function BackLink({ to, children }: { to: string; children: React.ReactNode }) {
  return <Link className="text-button back-link" to={to}><Icon name="arrow" size={16} /> {children}</Link>
}
