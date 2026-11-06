import { centsToNumber } from './format'
import type { ProposalInput } from './providerApi'

export type ProposalFormValues = { cents: string; days: string; description: string; warranty: string }

/** Valida a proposta como a API (valor > 0, prazo 1–365 dias, descrição 10–2000, garantia 3–200). */
export function validateProposal(values: ProposalFormValues): { input: ProposalInput } | { errors: Partial<Record<keyof ProposalFormValues, string>> } {
  const errors: Partial<Record<keyof ProposalFormValues, string>> = {}
  const value = centsToNumber(values.cents)
  const days = Number(values.days)
  const description = values.description.trim()
  const warranty = values.warranty.trim()
  if (!(value > 0)) errors.cents = 'Informe o valor total da proposta.'
  else if (value > 10_000_000) errors.cents = 'O valor máximo é R$ 10.000.000,00.'
  if (!values.days || !Number.isInteger(days) || days < 1 || days > 365) errors.days = 'Informe o prazo em dias, de 1 a 365.'
  if (description.length < 10) errors.description = 'Descreva o serviço com ao menos 10 caracteres.'
  else if (description.length > 2000) errors.description = 'A descrição deve ter no máximo 2000 caracteres.'
  if (warranty.length < 3) errors.warranty = 'Informe a garantia (obrigatória), com ao menos 3 caracteres.'
  else if (warranty.length > 200) errors.warranty = 'A garantia deve ter no máximo 200 caracteres.'
  return Object.keys(errors).length ? { errors } : { input: { value, deadlineDays: days, description, warranty } }
}
