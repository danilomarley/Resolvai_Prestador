import { useState } from 'react'
import { Modal } from './Modal'
import { AccountSettings } from './AccountSettings'
import { ActuationForm } from './ActuationForm'
import { useProvider } from './providerContext'
import { saveProfile } from '../services/providerApi'
import type { ApiError } from '../services/api'

/** Perfil do prestador: dados da conta (como no portal do contratante) e atuação (categorias e cidades). */
export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { token, userId, profile, categories, reloadProfile, bump, notify } = useProvider()
  const [tab, setTab] = useState<'conta' | 'atuacao'>('conta')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(input: { categoryIds: string[]; cities: string[] }) {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await saveProfile(token, input)
      reloadProfile()
      bump()
      notify('Áreas de atuação atualizadas.')
      onClose()
    } catch (failure) {
      setError((failure as ApiError).message ?? 'Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal size="lg" title="Meu perfil" onClose={onClose} dismissible={!saving} scrollKey={tab}
      footer={tab === 'atuacao'
        ? <button type="submit" form="perfil-atuacao" className="button button-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar áreas de atuação'}</button>
        : undefined}>
      <div className="tabs" role="tablist" aria-label="Seções do perfil">
        <button role="tab" aria-selected={tab === 'conta'} className={tab === 'conta' ? 'active' : ''} onClick={() => setTab('conta')}>Dados da conta</button>
        <button role="tab" aria-selected={tab === 'atuacao'} className={tab === 'atuacao' ? 'active' : ''} onClick={() => setTab('atuacao')}>Atuação</button>
      </div>
      {tab === 'conta'
        ? <AccountSettings token={token} providerId={userId} onCompleted={reloadProfile} />
        : <ActuationForm id="perfil-atuacao" categories={categories} initialIds={profile.categories.map((c) => c.id)}
          initialCities={profile.cities} disabled={saving} error={error} onSubmit={save} />}
    </Modal>
  )
}
