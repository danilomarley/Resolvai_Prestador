import { createContext, useContext } from 'react'
import type { Category, Profile } from '../services/providerApi'

export type ProviderContextValue = {
  token: string
  userId: string
  userName: string
  profile: Profile
  categories: Category[]
  /** Muda a cada alteração (proposta enviada, perfil salvo…): as telas incluem no `key` das consultas. */
  revision: number
  bump: () => void
  reloadProfile: () => void
  notify: (message: string) => void
}

export const ProviderContext = createContext<ProviderContextValue | null>(null)

export function useProvider(): ProviderContextValue {
  const value = useContext(ProviderContext)
  if (!value) throw new Error('useProvider deve ser usado dentro do layout do prestador.')
  return value
}
