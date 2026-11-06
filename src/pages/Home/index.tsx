import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/Icon'
import { OrderCard } from '../../components/OrderCard'
import { EmptyState, LoadError } from '../../components/ui'
import { useProvider } from '../../components/providerContext'
import { useApi } from '../../services/useApi'
import { getFeed, getSummary } from '../../services/providerApi'

type Stat = { label: string; value: number; detail: string; icon: IconName; to: string }

export function Home() {
  const { token, userName, revision } = useProvider()
  const summary = useApi(`summary:${revision}`, (signal) => getSummary(token, signal))
  const recent = useApi(`home-feed:${revision}`, (signal) => getFeed(token, { compatible: true, pageSize: 5 }, signal))

  const stats: Stat[] | undefined = summary.data && [
    { label: 'Novos pedidos', value: summary.data.newOrdersLast24h, detail: 'abertos nas últimas 24 horas', icon: 'sparkles', to: '/pedidos' },
    { label: 'Compatíveis com você', value: summary.data.compatibleOpenOrders, detail: 'pedidos abertos na sua área', icon: 'check', to: '/pedidos?compatible=true' },
    { label: 'Propostas em disputa', value: summary.data.proposals.sent + summary.data.proposals.viewed, detail: `${summary.data.proposals.viewed} já visualizada(s)`, icon: 'file', to: '/propostas' },
    { label: 'Propostas escolhidas', value: summary.data.proposals.chosen, detail: 'aguardando pagamento do contratante', icon: 'star', to: '/propostas?status=Chosen' },
  ]

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">PORTAL DO PRESTADOR</p>
        <h1>Olá, {userName.split(' ')[0]}</h1>
        <p>Veja os pedidos abertos na sua área e acompanhe suas propostas.</p>
      </div>

      <section className="stats-grid" aria-label="Resumo da sua conta">
        {summary.error ? <LoadError error={summary.error} onRetry={summary.retry} />
          : !stats ? <p role="status">Carregando indicadores…</p>
          : stats.map((stat) => (
            <Link key={stat.label} className="stat-card" to={stat.to}>
              <span className="stat-top"><span>{stat.label}</span><span className="icon-tile blue"><Icon name={stat.icon} size={20} /></span></span>
              <strong className="stat-value">{stat.value}</strong>
              <span className="stat-detail">{stat.detail}</span>
            </Link>
          ))}
      </section>

      <section aria-labelledby="recent-title">
        <div className="section-heading">
          <h2 id="recent-title">Pedidos compatíveis recentes</h2>
          <Link className="text-button" to="/pedidos">Ver todos os pedidos <Icon name="arrow" size={15} /></Link>
        </div>
        {recent.error ? <LoadError error={recent.error} onRetry={recent.retry} />
          : recent.loading ? <p role="status">Carregando pedidos…</p>
          : recent.data && recent.data.items.length > 0
            ? <div className="order-grid">{recent.data.items.map((order) => <OrderCard key={order.id} order={order} />)}</div>
            : <EmptyState icon="bag" title="Nenhum pedido compatível agora"
              action={<Link className="button button-secondary" to="/pedidos">Ver todos os pedidos abertos</Link>}>
              Novos pedidos da sua área aparecem aqui. Você pode ajustar categorias e cidades no seu perfil.
            </EmptyState>}
      </section>
    </>
  )
}
