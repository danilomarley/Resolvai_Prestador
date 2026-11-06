export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

type Options = { token?: string; signal?: AbortSignal; body?: unknown; method?: string }

// Nomes de campos que a API devolve nas validações (400), traduzidos para a tela.
const campos: Record<string, string> = {
  Value: 'Valor', DeadlineDays: 'Prazo', Description: 'Descrição', Warranty: 'Garantia',
  CategoryIds: 'Categorias', Cities: 'Cidades', Name: 'Nome', Email: 'E-mail', Password: 'Senha',
}
const traduzirCampos = (mensagem: string) => mensagem.replace(/\b(Value|DeadlineDays|Description|Warranty|CategoryIds|Cities|Name|Email|Password)\b/g, (nome) => campos[nome] ?? nome)

const mensagens: Record<number, string> = {
  400: 'Confira os dados informados.',
  401: 'Sua sessão não foi aceita pela API. Entre novamente.',
  403: 'Sua conta não tem permissão para esta ação.',
  404: 'Não encontrado ou indisponível para sua conta.',
  409: 'Esta ação não é possível no estado atual.',
  429: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',
  503: 'A API está indisponível. Tente novamente em instantes.',
}

async function lerProblema(response: Response): Promise<string | undefined> {
  try {
    const corpo: unknown = await response.json()
    if (typeof corpo !== 'object' || corpo === null) return undefined
    const { detail, errors } = corpo as { detail?: unknown; errors?: unknown }
    // Validação (400): primeira mensagem de campo, já em português.
    if (errors && typeof errors === 'object') {
      const primeira = Object.values(errors as Record<string, unknown>).flat().find((item) => typeof item === 'string')
      if (typeof primeira === 'string') return traduzirCampos(primeira)
    }
    return typeof detail === 'string' && detail ? detail : undefined
  } catch { return undefined }
}

export function createApiClient(baseUrl: string, fetcher: typeof fetch = fetch) {
  const base = baseUrl.replace(/\/$/, '')
  return async (path: string, { token, signal, body, method = 'GET' }: Options = {}): Promise<unknown> => {
    let response: Response
    try {
      response = await fetcher(`${base}${path}`, {
        method, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000), cache: 'no-store',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new ApiError(0, 'Não foi possível conectar à API. Verifique a conexão e tente novamente.')
    }
    if (!response.ok) {
      if (path === '/api/v1/auth/reset-password' && [400, 401, 403, 422].includes(response.status)) {
        throw new ApiError(response.status, 'Código inválido, expirado ou já utilizado, ou senha fora das regras. Solicite outro código e tente novamente.')
      }
      if (response.status === 401 && path === '/api/v1/auth/login') {
        const detail = await lerProblema(response)
        throw new ApiError(401, detail === 'Usuário inativo.'
          ? 'Sua conta está inativa. Entre em contato com o suporte.'
          : 'Não foi possível autenticar. Confira o e-mail, a senha e se o e-mail da conta foi confirmado.')
      }
      if (response.status === 409 && path === '/api/v1/users/me/complete-registration') {
        const detail = await lerProblema(response)
        throw new ApiError(409, detail === 'Cadastro já finalizado.' ? 'Seu cadastro já foi finalizado.'
          : detail?.startsWith('Já existe um usuário com o CPF') ? 'Este CPF já está em uso por outra conta.'
          : 'Não foi possível finalizar o cadastro com os dados informados.')
      }
      // As mensagens da API nestes casos são escritas para quem usa o app.
      if ([400, 409, 429, 503].includes(response.status)) {
        const detail = await lerProblema(response)
        if (detail) throw new ApiError(response.status, detail)
      }
      throw new ApiError(response.status, mensagens[response.status] ?? 'Não foi possível concluir. Tente novamente.')
    }
    if (response.status === 204) return undefined
    try { return await response.json() }
    catch { throw new ApiError(502, 'A API retornou uma resposta inválida.') }
  }
}

// Requisições relativas usam o proxy do Vite (desenvolvimento) ou VITE_API_BASE_URL (produção).
export const apiRequest = createApiClient(import.meta.env?.VITE_API_BASE_URL ?? '')
