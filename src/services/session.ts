import type { LoginDto } from './userApi'

export type ProviderSession = { providerId: string; accessToken: string; expiresAtUtc: string }
export const sessionKey = 'resolvai.provider-session'
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

// Only API-issued session data is stored. Passwords and refresh tokens are not persisted.
export function createSessionStore(storage: () => SessionStorage, now = Date.now) {
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())
  const valid = (value: unknown): value is ProviderSession => {
    if (typeof value !== 'object' || value === null) return false
    const session = value as Partial<ProviderSession>
    return typeof session.providerId === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(session.providerId)
      && typeof session.accessToken === 'string' && session.accessToken.trim().length > 0
      && typeof session.expiresAtUtc === 'string' && Date.parse(session.expiresAtUtc) > now()
  }
  return {
    read(): ProviderSession | null {
      const target = storage()
      const raw = target.getItem(sessionKey)
      if (!raw) return null
      let value: unknown
      try { value = JSON.parse(raw) } catch { /* Discard damaged or obsolete session data. */ }
      if (!valid(value)) { target.removeItem(sessionKey); return null }
      return { providerId: value.providerId, accessToken: value.accessToken, expiresAtUtc: value.expiresAtUtc }
    },
    save(login: LoginDto) {
      const value: ProviderSession = { providerId: login.user.id, accessToken: login.accessToken, expiresAtUtc: login.expiresAtUtc }
      if (!login.user.isActive || !valid(value)) throw new Error('A API retornou uma sessão inválida ou expirada. Entre novamente.')
      try { storage().setItem(sessionKey, JSON.stringify(value)) }
      catch { throw new Error('Não foi possível manter sua sessão. Permita o armazenamento nesta aba e tente novamente.') }
      notify()
    },
    clear() { storage().removeItem(sessionKey); notify() },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}

// Access is deferred until the browser session is used.
export const providerSession = createSessionStore(() => window.sessionStorage)
