import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const param = 'modal'
const orderParam = 'pedido'

/** Lê o modal da query string; nomes fora da lista permitida são ignorados. */
export function readModal<T extends string>(search: string, allowed: readonly T[]): T | null {
  const value = new URLSearchParams(search).get(param)
  return allowed.find((name) => name === value) ?? null
}

/** Pedido ao qual o modal se refere (ex.: enviar proposta); só aceita UUID. */
export function readOrder(search: string): string | null {
  const value = new URLSearchParams(search).get(orderParam)
  return value && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null
}

/** Define (ou remove, com null) o modal na query string, preservando os demais parâmetros. O `pedido` sai com o modal. */
export function searchWithModal(search: string, name: string | null, order?: string): string {
  const params = new URLSearchParams(search)
  params.delete(orderParam)
  if (name) {
    params.set(param, name)
    if (order) params.set(orderParam, order)
  } else params.delete(param)
  const text = params.toString()
  return text ? `?${text}` : ''
}

type ModalState = { modalOpened?: boolean }

/**
 * Mantém o modal aberto na URL (?modal=nome): recarregar reabre e o botão "voltar" fecha.
 * Abrir empilha uma entrada no histórico; fechar volta uma entrada quando fomos nós que a empilhamos
 * e, caso contrário (link direto), apenas remove o parâmetro.
 */
export function useModalRoute<T extends string>(allowed: readonly T[]) {
  const location = useLocation()
  const navigate = useNavigate()
  const current = readModal(location.search, allowed)
  const order = current ? readOrder(location.search) : null

  const open = useCallback((name: T, orderId?: string) => navigate(
    { pathname: location.pathname, search: searchWithModal(location.search, name, orderId) },
    { state: { ...(location.state as object | null), modalOpened: true } satisfies ModalState },
  ), [navigate, location.pathname, location.search, location.state])

  const close = useCallback(() => {
    if ((location.state as ModalState | null)?.modalOpened) navigate(-1)
    else navigate({ pathname: location.pathname, search: searchWithModal(location.search, null) }, { replace: true, state: location.state })
  }, [navigate, location.pathname, location.search, location.state])

  return { current, order, open, close }
}

/** Link que abre um modal sobre a tela atual (o botão voltar do navegador fecha o modal). */
export function modalLink(pathname: string, search: string, name: string, orderId?: string) {
  return { to: { pathname, search: searchWithModal(search, name, orderId) }, state: { modalOpened: true } satisfies ModalState }
}
