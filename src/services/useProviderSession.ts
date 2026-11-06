import { useEffect, useState } from 'react'
import { providerSession, sessionKey, type ProviderSession } from './session'

export function useProviderSession() {
  const [session, setSession] = useState<ProviderSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function sync() {
      clearTimeout(timeout)
      try {
        const current = providerSession.read()
        setSession(current)
        setError('')
        if (current) {
          // Recheck after expiration, browser sleep or a long-lived session.
          timeout = setTimeout(sync, Math.min(Date.parse(current.expiresAtUtc) - Date.now() + 1, 2147483647))
        }
      } catch {
        setSession(null)
        setError('Não foi possível consultar sua sessão. Permita o armazenamento nesta aba e tente novamente.')
      }
      setLoading(false)
    }
    function onStorage(event: StorageEvent) { if (event.key === sessionKey || event.key === null) sync() }
    const unsubscribe = providerSession.subscribe(sync)
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      clearTimeout(timeout)
      unsubscribe()
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [attempt])

  return { providerId: session?.providerId ?? null, accessToken: session?.accessToken ?? null,
    loading, error, retry: () => setAttempt((current) => current + 1) }
}
