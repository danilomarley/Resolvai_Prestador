import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { useProvider } from './providerContext'
import { LoadError } from './ui'
import { useApi } from '../services/useApi'
import { centsFromInput, centsToNumber, formatMoney, maskCents, numberToCents } from '../services/format'
import { createProposal, getOrder, updateProposal } from '../services/providerApi'
import { validateProposal, type ProposalFormValues } from '../services/proposalForm'
import type { ApiError } from '../services/api'

/**
 * Enviar ou editar a proposta de um pedido, em dois passos: formulário e revisão (prévia do que o contratante verá).
 * Abre por ?modal=proposta&pedido=<id>.
 */
export function ProposalModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { token, revision, bump, notify } = useProvider()
  const navigate = useNavigate()
  const order = useApi(`proposal-order:${orderId}:${revision}`, (signal) => getOrder(token, orderId, signal))
  const existing = order.data?.myProposal
  const editing = !!existing
  const editable = !existing || (['Sent', 'Viewed'].includes(existing.status) && order.data?.open === true)

  const [values, setValues] = useState<ProposalFormValues>({ cents: '', days: '', description: '', warranty: '' })
  const [step, setStep] = useState<'form' | 'review'>('form')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState('')
  const [filled, setFilled] = useState(false)

  // Edição: preenche com a proposta atual, uma única vez.
  useEffect(() => {
    if (existing && !filled) {
      setValues({ cents: numberToCents(existing.value), days: existing.deadlineDays ? String(existing.deadlineDays) : '',
        description: existing.description ?? '', warranty: existing.warranty ?? '' })
      setFilled(true)
    }
  }, [existing, filled])

  const set = (field: keyof ProposalFormValues, value: string) => setValues((current) => ({ ...current, [field]: value }))
  const result = validateProposal(values)
  const errors = 'errors' in result ? result.errors : {}

  function review(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if ('input' in result) { setFailure(''); setStep('review') }
  }

  async function send() {
    if (sending || !('input' in result)) return
    setSending(true)
    setFailure('')
    try {
      if (existing) {
        await updateProposal(token, existing.id, result.input)
        notify('Proposta atualizada.')
        bump()
        onClose()
      } else {
        await createProposal(token, orderId, result.input)
        notify('Proposta enviada. Acompanhe o status em Minhas propostas.')
        bump()
        navigate('/propostas', { replace: true })
      }
    } catch (error) {
      setFailure((error as ApiError).message ?? 'Não foi possível enviar a proposta. Tente novamente.')
      setStep('form')
      setSending(false)
    }
  }

  const title = editing ? 'Editar proposta' : 'Enviar proposta'
  if (order.loading || order.error || !order.data || !editable || (!order.data.open && !existing)) {
    return (
      <Modal size="sm" title={title} onClose={onClose}
        footer={<button type="button" className="button button-secondary" onClick={onClose}>Fechar</button>}>
        {order.loading ? <p role="status">Carregando o pedido…</p>
          : order.error ? <LoadError error={order.error} onRetry={order.retry} />
          : !editable ? <p role="alert">Esta proposta não pode mais ser alterada: ela já foi decidida ou o pedido foi encerrado.</p>
          : <p role="alert">Este pedido não recebe mais propostas.</p>}
      </Modal>
    )
  }

  const money = formatMoney(centsToNumber(values.cents))
  return (
    <Modal size="lg" title={title} description={order.data.title} onClose={onClose} dismissible={!sending} scrollKey={step}
      footer={step === 'form'
        ? <>
          <button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" form="proposta-form" className="button button-primary">Revisar proposta</button>
        </>
        : <>
          <button type="button" className="button button-secondary" onClick={() => setStep('form')} disabled={sending}>Voltar e editar</button>
          <button type="button" className="button button-primary" onClick={send} disabled={sending}>
            {sending ? 'Enviando…' : editing ? 'Salvar alterações' : 'Enviar proposta'}
          </button>
        </>}>
      {step === 'form' ? (
        <form id="proposta-form" className="form-stack" onSubmit={review} noValidate>
          {failure && <p role="alert" className="form-error">{failure}</p>}
          <fieldset className="account-fields">
            <legend>Valor e prazo</legend>
            <div className="account-fields-row">
              <label>Valor total
                <input name="value" inputMode="numeric" autoComplete="off" placeholder="R$ 0,00" value={maskCents(values.cents)}
                  onChange={(event) => set('cents', centsFromInput(event.target.value))} aria-invalid={submitted && !!errors.cents} />
                {submitted && errors.cents && <small className="field-error" role="alert">{errors.cents}</small>}
              </label>
              <label>Prazo de execução (dias)
                <input name="days" inputMode="numeric" autoComplete="off" placeholder="Ex.: 10" maxLength={3} value={values.days}
                  onChange={(event) => set('days', event.target.value.replace(/\D/g, ''))} aria-invalid={submitted && !!errors.days} />
                {submitted && errors.days && <small className="field-error" role="alert">{errors.days}</small>}
              </label>
            </div>
          </fieldset>
          <fieldset className="account-fields">
            <legend>O que você vai fazer</legend>
            <label>Descrição do serviço
              <textarea name="description" rows={5} maxLength={2000} value={values.description} aria-invalid={submitted && !!errors.description}
                placeholder="Descreva o serviço, os materiais incluídos e como você pretende executar."
                onChange={(event) => set('description', event.target.value)} />
              {submitted && errors.description && <small className="field-error" role="alert">{errors.description}</small>}
            </label>
            <label>Garantia (obrigatória)
              <input name="warranty" maxLength={200} value={values.warranty} aria-invalid={submitted && !!errors.warranty}
                placeholder="Ex.: 90 dias sobre o serviço executado" onChange={(event) => set('warranty', event.target.value)} />
              {submitted && errors.warranty && <small className="field-error" role="alert">{errors.warranty}</small>}
            </label>
          </fieldset>
        </form>
      ) : (
        <div className="proposal-preview">
          <p className="muted">É assim que o contratante verá a sua proposta:</p>
          <article className="panel">
            <p className="preview-value">{money}</p>
            <dl className="detail-list">
              <div><dt>Prazo</dt><dd>{values.days} {Number(values.days) === 1 ? 'dia' : 'dias'}</dd></div>
              <div><dt>Garantia</dt><dd>{values.warranty.trim()}</dd></div>
            </dl>
            <h3>Descrição</h3>
            <p className="pre-wrap">{values.description.trim()}</p>
          </article>
          <p className="muted small">{editing
            ? 'As alterações valem enquanto o contratante não escolher uma proposta.'
            : 'Você pode editar ou retirar a proposta enquanto o contratante não escolher uma.'}</p>
        </div>
      )}
    </Modal>
  )
}
