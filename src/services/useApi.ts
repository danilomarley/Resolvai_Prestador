import { useEffect, useRef, useState } from 'react'
import { ApiError } from './api'

const toApiError = (error: unknown) => error instanceof ApiError ? error : new ApiError(0, 'Não foi possível carregar os dados. Tente novamente.')

/**
 * Carrega um recurso. Quando `key` muda, o dado anterior é descartado e a consulta anterior é cancelada;
 * `retry` repete a consulta (por exemplo, depois de uma alteração).
 */
export function useApi<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [state, setState] = useState<{ key: string; data?: T; error?: ApiError }>({ key: '' })
  const [attempt, setAttempt] = useState(0)
  const latest = useRef(fetcher)
  latest.current = fetcher

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    setState({ key })
    latest.current(controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ key, data })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, error: toApiError(error) })
    })
    return () => controller.abort()
  }, [key, enabled, attempt])

  const current = state.key === key ? state : undefined
  return {
    data: current?.data, error: current?.error,
    loading: enabled && !current?.data && !current?.error,
    retry: () => setAttempt((value) => value + 1),
  }
}
