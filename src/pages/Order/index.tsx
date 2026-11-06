import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { BackLink, EmptyState, LoadError, StatusBadge } from '../../components/ui'
import { useProvider } from '../../components/providerContext'
import { useApi } from '../../services/useApi'
import { formatAgo, formatDate, formatMoney } from '../../services/format'
import { modalLink } from '../../services/modalRoute'
import { getOrder, type OrderDetail, type Photo } from '../../services/providerApi'

const visible = (photos: Photo[]) => photos.filter((photo) => /^https?:\/\//i.test(photo.url))

function PhotoViewer({ photos, index, onChange, onClose }: { photos: Photo[]; index: number; onChange: (index: number) => void; onClose: () => void }) {
  const go = (delta: number) => onChange((index + delta + photos.length) % photos.length)
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  const photo = photos[index]
  return (
    <Modal size="lg" title={`Foto ${index + 1} de ${photos.length}`} description={photo.description} onClose={onClose}
      footer={photos.length > 1 ? <>
        <button type="button" className="button button-secondary" onClick={() => go(-1)}>Anterior</button>
        <button type="button" className="button button-secondary" onClick={() => go(1)}>Próxima</button>
      </> : undefined}>
      <img className="photo-large" src={photo.url} alt={photo.description ?? `Foto ${index + 1} do pedido`} />
    </Modal>
  )
}

function ProposalPanel({ order, here }: { order: OrderDetail; here: { pathname: string; search: string } }) {
  const mine = order.myProposal
  const editable = !!mine && ['Sent', 'Viewed'].includes(mine.status) && order.open
  const open = modalLink(here.pathname, here.search, 'proposta', order.id)
  return (
    <aside className="panel proposal-panel" aria-label="Sua proposta">
      {mine ? (
        <>
          <h2>Sua proposta</h2>
          <StatusBadge status={mine.status} />
          <p className="preview-value">{formatMoney(mine.value)}</p>
          <dl className="detail-list">
            <div><dt>Prazo</dt><dd>{mine.deadline ?? (mine.deadlineDays ? `${mine.deadlineDays} dias` : 'Não informado')}</dd></div>
            <div><dt>Garantia</dt><dd>{mine.warranty ?? 'Não informada'}</dd></div>
            <div><dt>Enviada em</dt><dd>{formatDate(mine.createdAt)}</dd></div>
          </dl>
          {mine.status === 'Chosen' && <p className="note success">O contratante escolheu a sua proposta. Agora falta o pagamento para o serviço começar.</p>}
          {mine.status === 'NotChosen' && <p className="note">O contratante escolheu outra proposta para este pedido.</p>}
          {editable && <Link className="button button-secondary" {...open}>Editar proposta</Link>}
          <Link className="text-button" to="/propostas">Ver em Minhas propostas</Link>
        </>
      ) : order.open ? (
        <>
          <h2>Interessou?</h2>
          <p className="muted">Envie valor, prazo, descrição e garantia. Você pode editar enquanto o contratante não escolher uma proposta.</p>
          <Link className="button button-primary" {...open}>Enviar proposta</Link>
        </>
      ) : (
        <>
          <h2>Pedido encerrado para propostas</h2>
          <p className="muted">Este pedido já tem uma proposta escolhida ou foi encerrado, e não recebe novas propostas.</p>
        </>
      )}
    </aside>
  )
}

export function OrderPage() {
  const { orderId = '' } = useParams()
  const { token, revision } = useProvider()
  const location = useLocation()
  const order = useApi(`order:${orderId}:${revision}`, (signal) => getOrder(token, orderId, signal))
  const [photo, setPhoto] = useState<number>()

  if (order.error?.status === 404) {
    return (<><BackLink to="/pedidos">Voltar aos pedidos</BackLink>
      <EmptyState title="Pedido não encontrado">Este pedido não existe ou não está mais disponível para você.</EmptyState></>)
  }
  if (order.error) return (<><BackLink to="/pedidos">Voltar aos pedidos</BackLink><LoadError error={order.error} onRetry={order.retry} /></>)
  if (!order.data) return <p role="status">Carregando pedido…</p>

  const data = order.data
  const photos = visible(data.photos)
  return (
    <>
      <BackLink to="/pedidos">Voltar aos pedidos</BackLink>
      <div className="page-heading">
        <div className="badges">
          {data.compatible && <span className="badge badge-match"><Icon name="check" size={12} /> Compatível com seu perfil</span>}
          {data.urgency && <span className="badge">{data.urgency}</span>}
          {!data.open && <span className="badge">Fechado para propostas</span>}
        </div>
        <h1>{data.title}</h1>
        <p><Icon name="pin" size={14} /> {data.location ?? 'Localização não informada'}{data.category ? ` · ${data.category}` : ''}</p>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel">
            <h2>Descrição</h2>
            <p className="pre-wrap">{data.description || 'Sem descrição.'}</p>
            {data.details && <><h3>Detalhes do ambiente</h3><p className="pre-wrap">{data.details}</p></>}
            {data.specifications && <><h3>Serviço solicitado</h3><p className="pre-wrap">{data.specifications}</p></>}
          </section>
          {photos.length > 0 && (
            <section className="panel" aria-labelledby="photos-title">
              <h2 id="photos-title">Fotos do local ({photos.length})</h2>
              <ul className="gallery">
                {photos.map((item, index) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => setPhoto(index)} aria-label={`Ampliar foto ${index + 1}`}>
                      <img src={item.url} alt={item.description ?? `Foto ${index + 1} do pedido`} loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="panel">
            <h2>Sobre o pedido</h2>
            <dl className="detail-list">
              <div><dt>Publicado</dt><dd>{formatAgo(data.createdAt)}</dd></div>
              <div><dt>Propostas recebidas</dt><dd>{data.proposalsCount}</dd></div>
              <div><dt>Contratante</dt><dd>{data.customerFirstName}</dd></div>
            </dl>
            <p className="muted small">O endereço completo e os contatos do contratante só são compartilhados depois da contratação.</p>
          </section>
        </div>
        <ProposalPanel order={data} here={location} />
      </div>

      {photo !== undefined && photos[photo] && <PhotoViewer photos={photos} index={photo} onChange={setPhoto} onClose={() => setPhoto(undefined)} />}
    </>
  )
}
