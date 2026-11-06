import { useState } from 'react'
import { Modal } from './Modal'
import { CompleteRegistrationForm } from './CompleteRegistrationForm'
import { ActuationForm } from './ActuationForm'
import { useFinalizeRegistration } from '../services/useFinalizeRegistration'
import { saveProfile, type Category, type Profile } from '../services/providerApi'
import type { ApiError } from '../services/api'

/**
 * Primeiro acesso do prestador, em dois passos: (1) cadastro (CPF, endereço e contato) e (2) categorias e cidades.
 * Não pode ser dispensado: sem isso o app não tem o que mostrar. Quem preferir pode sair da conta.
 */
export function OnboardingModal({ token, userId, userName, profile, categories, onDone, onLogout }: {
  token: string
  userId: string
  userName: string
  profile: Profile
  categories: Category[]
  onDone: () => void
  onLogout: () => void
}) {
  const step = profile.registrationComplete ? 2 : 1
  const registration = useFinalizeRegistration(token, userId, onDone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function saveActuation(input: { categoryIds: string[]; cities: string[] }) {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await saveProfile(token, input)
      onDone()
    } catch (failure) {
      setError((failure as ApiError).message ?? 'Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const busy = step === 1 ? registration.saving : saving
  return (
    <Modal size="lg" title="Complete seu cadastro" dismissible={false} onClose={() => undefined} scrollKey={step}
      description={step === 1
        ? 'Passo 1 de 2 — Informe seu documento, endereço e contato. Você só precisa fazer isso uma vez.'
        : 'Passo 2 de 2 — Escolha as categorias e as cidades em que você atua para ver os pedidos certos.'}
      footer={<>
        <button type="button" className="button button-secondary" onClick={onLogout} disabled={busy}>Sair da conta</button>
        <button type="submit" form={step === 1 ? 'onboarding-cadastro' : 'onboarding-atuacao'} className="button button-primary" disabled={busy}>
          {busy ? 'Salvando…' : step === 1 ? 'Continuar' : 'Concluir cadastro'}
        </button>
      </>}>
      <ol className="steps" aria-label="Etapas do cadastro">
        <li className={step === 1 ? 'current' : 'done'} aria-current={step === 1 ? 'step' : undefined}><span>1</span> Seus dados</li>
        <li className={step === 2 ? 'current' : ''} aria-current={step === 2 ? 'step' : undefined}><span>2</span> Onde você atua</li>
      </ol>
      {step === 1
        ? <CompleteRegistrationForm id="onboarding-cadastro" defaultName={userName} disabled={registration.saving}
          error={registration.error} onSubmit={registration.submit} />
        : <ActuationForm id="onboarding-atuacao" categories={categories} initialIds={profile.categories.map((c) => c.id)}
          initialCities={profile.cities} disabled={saving} error={error} onSubmit={saveActuation} />}
    </Modal>
  )
}
