const uuid = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}'
const paths = new RegExp(`^/(?:pedidos(?:/${uuid})?|propostas)?$`, 'i')
const livre = /^[\p{L}\p{N} _.-]{1,80}$/u

// Só parâmetros que o próprio app grava na URL são aceitos de volta.
const queryRules: Record<string, (value: string) => boolean> = {
  status: (value) => ['Sent', 'Viewed', 'Chosen', 'NotChosen'].includes(value),
  page: (value) => /^\d{1,4}$/.test(value),
  modal: (value) => ['perfil', 'proposta'].includes(value),
  pedido: (value) => new RegExp(`^${uuid}$`, 'i').test(value),
  category: (value) => /^[a-z0-9-]{1,60}$/.test(value),
  city: (value) => livre.test(value),
  urgency: (value) => livre.test(value),
  q: (value) => livre.test(value),
  compatible: (value) => value === 'true',
}

/**
 * Valida o destino guardado antes de ir ao login (evita redirecionar para endereços arbitrários).
 * Devolve o próprio valor quando é uma tela do app com parâmetros conhecidos; senão, o início.
 */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string') return '/'
  const [path, query = '', ...rest] = value.split('?')
  if (rest.length || !paths.test(path)) return '/'
  for (const [key, entry] of new URLSearchParams(query)) {
    if (!queryRules[key]?.(entry)) return '/'
  }
  return value
}
