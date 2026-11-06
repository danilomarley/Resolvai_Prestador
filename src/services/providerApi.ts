import { ApiError, apiRequest } from './api'
import { isUuid } from './userApi'

export type OrderStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled'
export type ProposalStatus = 'Sent' | 'Viewed' | 'Chosen' | 'NotChosen'
export const proposalStatuses: ProposalStatus[] = ['Sent', 'Viewed', 'Chosen', 'NotChosen']

export type Category = { id: string; slug: string; name: string }
export type Profile = { categories: Category[]; cities: string[]; registrationComplete: boolean; onboardingComplete: boolean }
export type ProposalCounts = { total: number; sent: number; viewed: number; chosen: number; notChosen: number }
export type Summary = { newOrdersLast24h: number; compatibleOpenOrders: number; proposals: ProposalCounts }
export type Page<T> = { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number }

export type FeedItem = {
  id: string; title: string; category?: string; location?: string; urgency?: string; createdAt: string
  proposalsCount: number; coverPhotoUrl?: string; customerFirstName: string; compatible: boolean; myProposalId?: string
}
export type Photo = { id: string; url: string; description?: string }
export type Proposal = {
  id: string; orderId: string; orderTitle: string; orderCategory?: string; orderLocation?: string; orderStatus: OrderStatus
  status: ProposalStatus; value: number; deadline?: string; deadlineDays?: number; description?: string; warranty?: string; createdAt: string
}
export type OrderDetail = Omit<FeedItem, 'coverPhotoUrl'> & {
  description: string; details?: string; specifications?: string; status: OrderStatus; open: boolean; photos: Photo[]; myProposal?: Proposal
}
export type ProposalInput = { value: number; deadlineDays: number; description: string; warranty: string }

const invalid = () => new ApiError(502, 'A API retornou dados incompatíveis com o contrato esperado.')
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string'
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0
const optionalText = (value: unknown) => value === undefined || text(value)
const orderStatuses: OrderStatus[] = ['Pending', 'InProgress', 'Completed', 'Cancelled']

export function parseCategories(value: unknown): Category[] {
  if (!Array.isArray(value) || !value.every((item) => object(item) && text(item.id) && text(item.slug) && text(item.name))) throw invalid()
  return value as Category[]
}

export function parseProfile(value: unknown): Profile {
  if (!object(value) || !Array.isArray(value.categories) || !Array.isArray(value.cities) || !value.cities.every(text)
    || typeof value.registrationComplete !== 'boolean' || typeof value.onboardingComplete !== 'boolean') throw invalid()
  return { ...(value as Profile), categories: parseCategories(value.categories) }
}

function parseCounts(value: unknown): ProposalCounts {
  if (!object(value) || !['total', 'sent', 'viewed', 'chosen', 'notChosen'].every((key) => count(value[key]))) throw invalid()
  return value as ProposalCounts
}

export function parseSummary(value: unknown): Summary {
  if (!object(value) || !count(value.newOrdersLast24h) || !count(value.compatibleOpenOrders)) throw invalid()
  return { ...(value as Summary), proposals: parseCounts(value.proposals) }
}

function isFeedItem(value: unknown): value is FeedItem {
  return object(value) && text(value.id) && isUuid(value.id) && text(value.title) && text(value.createdAt) && !Number.isNaN(Date.parse(value.createdAt))
    && count(value.proposalsCount) && text(value.customerFirstName) && typeof value.compatible === 'boolean'
    && optionalText(value.category) && optionalText(value.location) && optionalText(value.urgency) && optionalText(value.coverPhotoUrl)
}

function parsePage<T>(value: unknown, isItem: (item: unknown) => item is T): Page<T> {
  if (!object(value) || !Array.isArray(value.items) || !value.items.every(isItem)
    || !['page', 'pageSize', 'totalItems', 'totalPages'].every((key) => count(value[key]))) throw invalid()
  return value as Page<T>
}

export const parseFeed = (value: unknown) => parsePage(value, isFeedItem)

function isProposal(value: unknown): value is Proposal {
  return object(value) && text(value.id) && isUuid(value.id) && text(value.orderId) && text(value.orderTitle)
    && orderStatuses.includes(value.orderStatus as OrderStatus) && proposalStatuses.includes(value.status as ProposalStatus)
    && typeof value.value === 'number' && text(value.createdAt) && optionalText(value.deadline) && optionalText(value.description) && optionalText(value.warranty)
}

export function parseProposal(value: unknown): Proposal {
  if (!isProposal(value)) throw invalid()
  return value
}

export function parseProposalPage(value: unknown): Page<Proposal> & { counts: ProposalCounts } {
  const page = parsePage(value, isProposal)
  return { ...page, counts: parseCounts((value as Record<string, unknown>).counts) }
}

export function parseOrder(value: unknown): OrderDetail {
  if (!isFeedItem(value) && !(object(value) && text(value.id) && isUuid(value.id) && text(value.title))) throw invalid()
  const order = value as Record<string, unknown>
  if (!text(order.description) || !orderStatuses.includes(order.status as OrderStatus) || typeof order.open !== 'boolean'
    || !Array.isArray(order.photos) || !order.photos.every((photo) => object(photo) && text(photo.id) && text(photo.url))
    || order.myProposal !== undefined && !isProposal(order.myProposal)) throw invalid()
  return order as unknown as OrderDetail
}

// --- chamadas ---------------------------------------------------------------------------------

export const getProfile = async (token: string, signal?: AbortSignal) => parseProfile(await apiRequest('/api/v1/provider/profile', { token, signal }))
export const saveProfile = async (token: string, input: { categoryIds: string[]; cities: string[] }) =>
  parseProfile(await apiRequest('/api/v1/provider/profile', { token, method: 'PUT', body: input }))
export const getCategories = async (token: string, signal?: AbortSignal) => parseCategories(await apiRequest('/api/v1/catalog/categories', { token, signal }))
export const getSummary = async (token: string, signal?: AbortSignal) => parseSummary(await apiRequest('/api/v1/provider/summary', { token, signal }))

export type FeedQuery = { category?: string; city?: string; urgency?: string; q?: string; compatible?: boolean; page?: number; pageSize?: number }

export function queryString(query: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '' && value !== false) params.set(key, String(value))
  const result = params.toString()
  return result ? `?${result}` : ''
}

export const getFeed = async (token: string, query: FeedQuery, signal?: AbortSignal) =>
  parseFeed(await apiRequest(`/api/v1/provider/orders${queryString(query)}`, { token, signal }))

export const getOrder = async (token: string, id: string, signal?: AbortSignal) => {
  if (!isUuid(id)) throw new ApiError(404, 'Pedido não encontrado ou indisponível para sua conta.')
  return parseOrder(await apiRequest(`/api/v1/provider/orders/${id}`, { token, signal }))
}

export type ProposalQuery = { status?: ProposalStatus; q?: string; page?: number; pageSize?: number }
export const getProposals = async (token: string, query: ProposalQuery, signal?: AbortSignal) =>
  parseProposalPage(await apiRequest(`/api/v1/provider/proposals${queryString(query)}`, { token, signal }))

export const createProposal = async (token: string, orderId: string, input: ProposalInput) =>
  parseProposal(await apiRequest(`/api/v1/provider/orders/${orderId}/proposals`, { token, method: 'POST', body: input }))
export const updateProposal = async (token: string, id: string, input: Partial<ProposalInput>) =>
  parseProposal(await apiRequest(`/api/v1/provider/proposals/${id}`, { token, method: 'PATCH', body: input }))
export const deleteProposal = async (token: string, id: string) => { await apiRequest(`/api/v1/provider/proposals/${id}`, { token, method: 'DELETE' }) }

export const proposalStatusLabel: Record<ProposalStatus, string> = {
  Sent: 'Enviada', Viewed: 'Visualizada', Chosen: 'Escolhida', NotChosen: 'Não selecionada',
}
export const urgencyOptions = ['Urgente', 'Nos próximos dias', 'Pode esperar']

/** A proposta ainda pode ser editada ou retirada: não foi decidida e o pedido segue aberto. */
export const isEditable = (proposal: Proposal) => ['Sent', 'Viewed'].includes(proposal.status) && proposal.orderStatus === 'Pending'
