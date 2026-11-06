import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { formatAgo } from '../services/format'
import type { FeedItem } from '../services/providerApi'

/** Foto de capa só quando a API devolveu uma URL (pode vir um caminho de storage, que não dá para exibir). */
const coverUrl = (url?: string) => url && /^https?:\/\//i.test(url) ? url : undefined

export function OrderCard({ order }: { order: FeedItem }) {
  const cover = coverUrl(order.coverPhotoUrl)
  return (
    <article className="panel order-card">
      {cover && <img className="order-card-cover" src={cover} alt="" loading="lazy" />}
      <div className="order-card-body">
        <div className="badges">
          {order.compatible && <span className="badge badge-match"><Icon name="check" size={12} /> Compatível com seu perfil</span>}
          {order.myProposalId && <span className="badge badge-sent">Proposta enviada</span>}
          {order.urgency && <span className="badge">{order.urgency}</span>}
        </div>
        <h3><Link to={`/pedidos/${order.id}`}>{order.title}</Link></h3>
        <p className="muted"><Icon name="pin" size={14} /> {order.location ?? 'Localização não informada'}{order.category ? ` · ${order.category}` : ''}</p>
        <p className="muted small">
          {formatAgo(order.createdAt)} · {order.proposalsCount} {order.proposalsCount === 1 ? 'proposta' : 'propostas'} · Cliente: {order.customerFirstName}
        </p>
        <Link className={`button button-sm ${order.myProposalId ? 'button-secondary' : 'button-primary'}`} to={`/pedidos/${order.id}`}
          aria-label={`Ver pedido ${order.title}`}>
          {order.myProposalId ? 'Ver minha proposta' : 'Ver pedido'} <Icon name="arrow" size={15} />
        </Link>
      </div>
    </article>
  )
}
