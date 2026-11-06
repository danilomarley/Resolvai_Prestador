import { ApiError, apiRequest } from './api'

export type UserDto = { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; cpf?: string | null }
export type LoginDto = { accessToken: string; refreshToken?: string | null; tokenType: string; expiresAtUtc: string; user: UserDto }

const invalid = () => new ApiError(502, 'A API retornou dados incompatíveis com o contrato esperado.')
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const date = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))

export function parseUser(value: unknown): UserDto {
  if (!object(value) || typeof value.id !== 'string' || !isUuid(value.id)
    || typeof value.name !== 'string' || typeof value.email !== 'string' || typeof value.role !== 'string'
    || typeof value.isActive !== 'boolean' || !date(value.createdAt)
    || value.cpf !== undefined && value.cpf !== null && (typeof value.cpf !== 'string' || !/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(value.cpf))) throw invalid()
  return value as UserDto
}

export function parseLogin(value: unknown): LoginDto {
  if (!object(value) || typeof value.accessToken !== 'string' || !value.accessToken
    || value.refreshToken !== undefined && value.refreshToken !== null && typeof value.refreshToken !== 'string'
    || value.tokenType !== 'bearer' && value.tokenType !== 'Bearer' || !date(value.expiresAtUtc)) throw invalid()
  parseUser(value.user)
  return value as LoginDto
}

export const login = async (email: string, password: string) =>
  parseLogin(await apiRequest('/api/v1/auth/login', { method: 'POST', body: { email, password } }))

/** Cadastro público do prestador: a conta nasce com o papel Prestador. */
export const registerProvider = async (name: string, email: string, password: string) =>
  parseUser(await apiRequest('/api/v1/auth/register-provider', { method: 'POST', body: { name, email, password } }))

export const getCurrentUser = async (token: string, signal?: AbortSignal) => parseUser(await apiRequest('/api/v1/users/me', { token, signal }))
