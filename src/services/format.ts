const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatMoney = (value?: number) => value === undefined ? '—' : brl.format(value)

export const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'

/** "há 3 h", "há 2 dias"… para listas; datas antigas voltam ao formato completo. */
export function formatAgo(value: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60000))
  if (Number.isNaN(minutes)) return '—'
  if (minutes < 1) return 'agora há pouco'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  return days < 8 ? `há ${days} ${days === 1 ? 'dia' : 'dias'}` : formatDate(value)
}

/** Campo de valor com máscara de moeda: só dígitos, interpretados como centavos ("1234" → R$ 12,34). */
export const centsFromInput = (text: string) => text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11)
export const maskCents = (cents: string) => cents ? brl.format(Number(cents) / 100) : ''
export const centsToNumber = (cents: string) => Number(cents || '0') / 100
export const numberToCents = (value: number) => String(Math.round(value * 100))
