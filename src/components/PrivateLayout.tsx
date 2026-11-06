import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import { Sidebar } from './Sidebar'
import { OnboardingModal } from './OnboardingModal'
import { ProfileModal } from './ProfileModal'
import { ProposalModal } from './ProposalModal'
import { ProviderContext, type ProviderContextValue } from './providerContext'
import { useApi } from '../services/useApi'
import { useModalRoute } from '../services/modalRoute'
import { useProviderSession } from '../services/useProviderSession'
import { providerSession } from '../services/session'
import { getCategories, getProfile } from '../services/providerApi'
import { getCurrentUser } from '../services/userApi'

const modals = ['perfil', 'proposta'] as const

/**
 * Casca das telas privadas: exige sessão e papel de prestador, carrega perfil e catálogo, bloqueia o app
 * até o cadastro estar completo e hospeda os modais (perfil e proposta) e os avisos.
 */
export function PrivateLayout() {
  const location = useLocation()
  const session = useProviderSession()
  const token = session.accessToken
  const modal = useModalRoute(modals)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [revision, setRevision] = useState(0)
  const [notice, setNotice] = useState('')

  const me = useApi(`me:${token}`, (signal) => getCurrentUser(token!, signal), !!token)
  const profile = useApi(`profile:${token}`, (signal) => getProfile(token!, signal), !!token)
  const categories = useApi(`categories:${token}`, (signal) => getCategories(token!, signal), !!token)

  const bump = useCallback(() => setRevision((value) => value + 1), [])
  const notify = useCallback((message: string) => setNotice(message), [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  const value: ProviderContextValue | null = useMemo(() => (token && session.providerId && me.data && profile.data && categories.data) ? {
    token, userId: session.providerId, userName: me.data.name, profile: profile.data, categories: categories.data,
    revision, bump, reloadProfile: profile.retry, notify,
  } : null, [token, session.providerId, me.data, profile.data, categories.data, revision, bump, profile.retry, notify])

  const authFailure = [me.error, profile.error, categories.error].find((error) => error?.status === 401)
  // Sessão recusada pela API: limpa e volta ao login (fora da renderização).
  useEffect(() => { if (authFailure) providerSession.clear() }, [authFailure])

  const loginRedirect = <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if ((!session.loading && !session.error && !session.providerId) || authFailure) return loginRedirect

  const failure = session.error ? { message: session.error, retry: session.retry } : (me.error ?? profile.error ?? categories.error)
    ? { message: (me.error ?? profile.error ?? categories.error)!.message, retry: () => { me.retry(); profile.retry(); categories.retry() }, forbidden: [me.error, profile.error].some((e) => e?.status === 403) }
    : undefined

  const logout = () => providerSession.clear()
  const displayName = me.data?.name ?? 'Minha conta'

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Pular para o conteúdo</a>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} userName={displayName} onProfile={() => modal.open('perfil')} />
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="icon-button mobile-menu" aria-label="Abrir menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Icon name="menu" /></button>
            <span>Portal do prestador</span>
          </div>
          <div className="topbar-actions">
            <button className="avatar small-avatar" aria-label="Abrir meu perfil" onClick={() => modal.open('perfil')}>{displayName.charAt(0)}</button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {failure ? (
            <section className="panel load-error" role="alert">
              <h1>{'forbidden' in failure && failure.forbidden ? 'Esta conta não é de prestador' : 'Não foi possível carregar sua conta'}</h1>
              <p>{'forbidden' in failure && failure.forbidden
                ? 'Entre com uma conta de prestador ou crie uma em "Cadastre-se como prestador". O portal do contratante é outro endereço.'
                : failure.message}</p>
              <div className="actions-row">
                {!('forbidden' in failure && failure.forbidden) && <button className="button button-secondary" onClick={failure.retry}>Tentar novamente</button>}
                <Link className="button button-secondary" to="/login" onClick={logout}>Sair da conta</Link>
              </div>
            </section>
          ) : !value ? <p role="status">Carregando sua conta…</p>
            : !value.profile.onboardingComplete ? (
              <section className="panel load-error">
                <h1>Falta pouco para começar</h1>
                <p>Complete o cadastro para ver os pedidos compatíveis com você.</p>
              </section>
            ) : (
              <ProviderContext.Provider value={value}><Outlet /></ProviderContext.Provider>
            )}
        </main>
      </div>
      {notice && (
        <div className="toast" role="status"><span>{notice}</span>
          <button className="icon-button" onClick={() => setNotice('')} aria-label="Dispensar aviso"><Icon name="close" size={17} /></button>
        </div>
      )}
      {value && !value.profile.onboardingComplete && (
        <OnboardingModal token={value.token} userId={value.userId} userName={value.userName} profile={value.profile}
          categories={value.categories} onDone={value.reloadProfile} onLogout={logout} />
      )}
      {value && value.profile.onboardingComplete && (
        <ProviderContext.Provider value={value}>
          {modal.current === 'perfil' && <ProfileModal onClose={modal.close} />}
          {modal.current === 'proposta' && modal.order && <ProposalModal key={modal.order} orderId={modal.order} onClose={modal.close} />}
        </ProviderContext.Provider>
      )}
    </div>
  )
}
