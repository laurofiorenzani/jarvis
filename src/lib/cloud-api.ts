/**
 * Authenticated, provider-neutral HTTP client for the Jarvis Cloud API.
 *
 * CloudAccess composes this client into the active cloud runtime after sign-in.
 * A caller must inject both the API origin and a short-lived access-token provider;
 * there is no default host, token persistence, or browser-direct model access.
 */
import {
  CLOUD_API_VERSION,
  type ApiError,
  type CancelTurnRequest,
  type CloudHealth,
  type CreateConversationResponse,
  type GetConversationResponse,
  type ListConversationsResponse,
  type ListMemoriesResponse,
  type CreateMemoryResponse,
  type MemoryPreferenceResponse,
  type SemanticMemoryCandidateListResponse,
  type SemanticMemoryCandidateDecisionResponse,
  type MemoryCategory,
  type SendTurnRequest,
} from './backend-contract'

export type CloudFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const API_ERROR_CODES = ['unauthenticated', 'forbidden', 'invalid_request', 'rate_limited', 'quota_exhausted', 'service_unavailable', 'internal_error'] as const

function portugueseApiMessage(message: string, code: string): string {
  if (code === 'service_unavailable') return 'O serviço de IA está temporariamente indisponível. Vou tentar novamente em instantes.'
  if (code === 'rate_limited') return 'O Jarvis recebeu muitos pedidos em pouco tempo. Aguarda um instante e tenta novamente.'
  if (code === 'quota_exhausted') return 'A quota gratuita diária de IA foi atingida. Ela reinicia à meia-noite UTC.'
  if (code === 'unauthenticated') return 'A tua sessão expirou. Inicia sessão novamente.'
  if (code === 'forbidden') return 'Não tens autorização para esta operação.'
  if (code === 'invalid_request') return 'Não consegui processar esta mensagem. Verifica o conteúdo e tenta novamente.'
  return message
}

export type CloudApiOptions = {
  baseUrl: string
  publishableKey: string
  getAccessToken: () => Promise<string | null>
  fetchImpl?: CloudFetch
}

export class CloudApiError extends Error {
  readonly status: number
  readonly code: ApiError['error']['code'] | 'network_error' | 'invalid_response'
  readonly requestId?: string
  readonly retryable: boolean
  readonly retryAfterMs?: number

  constructor(
    message: string,
    status: number,
    code: ApiError['error']['code'] | 'network_error' | 'invalid_response',
    requestId?: string,
    retryable = false,
    retryAfterMs?: number,
  ) {
    super(message)
    this.name = 'CloudApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.retryable = retryable
    this.retryAfterMs = retryAfterMs
  }
}

function normaliseBaseUrl(value: string): string {
  const url = new URL(value)
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('Cloud API must use HTTPS (HTTP is allowed only on localhost).')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Cloud API origin must not contain credentials, query, or fragment.')
  }
  return url.toString().replace(/\/$/, '')
}

function requireText(value: string, field: string, maxLength = 200): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) {
    throw new CloudApiError(`Invalid ${field}.`, 400, 'invalid_request')
  }
  return trimmed
}

export function createCloudApiClient(options: CloudApiOptions) {
  const baseUrl = normaliseBaseUrl(options.baseUrl)
  if (!options.publishableKey.trim()) throw new Error('Supabase publishable key is required.')
  const fetcher = options.fetchImpl ?? fetch

  async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
    const token = authenticated ? await options.getAccessToken() : null
    if (authenticated && !token?.trim()) {
      throw new CloudApiError('Sign-in is required.', 401, 'unauthenticated')
    }

    let response: Response
    try {
      const headers = new Headers(init.headers)
      headers.set('Accept', 'application/json')
      headers.set('apikey', options.publishableKey)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      headers.set('X-Jarvis-Api-Version', String(CLOUD_API_VERSION))
      if (init.body) headers.set('Content-Type', 'application/json')
      response = await fetcher(`${baseUrl}${path}`, {
        ...init,
        headers,
        credentials: 'omit',
        redirect: 'error',
      })
    } catch {
      throw new CloudApiError('Cloud service could not be reached.', 0, 'network_error', undefined, true)
    }

    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      if (payload && typeof payload === 'object' && 'error' in payload) {
        const body = payload as ApiError
        if (body.version === CLOUD_API_VERSION && body.error &&
            typeof body.error.message === 'string' && typeof body.error.code === 'string') {
          throw new CloudApiError(
            portugueseApiMessage(body.error.message, body.error.code),
            response.status,
            body.error.code,
            body.error.requestId,
            body.error.retryable,
          )
        }
      }
      throw new CloudApiError('Cloud service returned an unexpected error.', response.status, 'invalid_response')
    }
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload) ||
        (payload as Record<string, unknown>).version !== CLOUD_API_VERSION) {
      throw new CloudApiError('Cloud service returned an empty or invalid response.', response.status, 'invalid_response')
    }
    return payload as T
  }

  return {
    transcribeAudio: async (audio: Blob): Promise<string> => {
      if (!(audio instanceof Blob) || audio.size < 1 || audio.size > 8 * 1024 * 1024) throw new CloudApiError('Audio segment is empty or too large.', 413, 'invalid_request')
      const token = await options.getAccessToken()
      if (!token?.trim()) throw new CloudApiError('Sign-in is required.', 401, 'unauthenticated')
      let response: Response
      try {
        response = await fetcher(`${baseUrl}/v1/stt`, {
          method: 'POST',
          headers: { apikey: options.publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': audio.type || 'audio/mp4', 'X-Jarvis-Api-Version': String(CLOUD_API_VERSION) },
          body: audio, credentials: 'omit', redirect: 'error',
        })
      } catch { throw new CloudApiError('Speech service could not be reached.', 0, 'network_error', undefined, true) }
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const body = payload as ApiError | null
        const rawCode = body?.error?.code
        const code = (API_ERROR_CODES as readonly string[]).includes(String(rawCode))
          ? rawCode as ApiError['error']['code']
          : response.status === 429 ? 'rate_limited' : 'service_unavailable'
        const retryHeader = response.headers.get('Retry-After')
        const retrySeconds = retryHeader && /^\d{1,5}$/.test(retryHeader)
          ? Math.min(code === 'quota_exhausted' ? 86_400 : 300, Math.max(1, Number(retryHeader)))
          : undefined
        throw new CloudApiError(
          body?.error?.message || 'Speech transcription failed.',
          response.status,
          code,
          body?.error?.requestId,
          true,
          retrySeconds === undefined ? undefined : retrySeconds * 1000,
        )
      }
      if (!payload || typeof payload !== 'object' || typeof (payload as { text?: unknown }).text !== 'string') throw new CloudApiError('Speech service returned an invalid transcript.', response.status, 'invalid_response')
      return (payload as { text: string }).text.trim()
    },
    synthesizeSpeech: async (text: string): Promise<Blob> => {
      const spokenText = requireText(text, 'speech text', 2_000)
      const token = await options.getAccessToken()
      if (!token?.trim()) throw new CloudApiError('Sign-in is required.', 401, 'unauthenticated')
      let response: Response
      try {
        response = await fetcher(`${baseUrl}/v1/tts`, {
          method: 'POST',
          headers: { apikey: options.publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'audio/wav', 'X-Jarvis-Api-Version': String(CLOUD_API_VERSION) },
          body: JSON.stringify({ version: CLOUD_API_VERSION, text: spokenText }),
          credentials: 'omit', redirect: 'error',
        })
      } catch { throw new CloudApiError('Speech service could not be reached.', 0, 'network_error', undefined, true) }
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null)
        const body = payload as ApiError | null
        throw new CloudApiError(body?.error?.message || 'Speech synthesis failed.', response.status, body?.error?.code || 'service_unavailable', body?.error?.requestId, true)
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.toLowerCase().includes('audio/wav')) throw new CloudApiError('Speech service returned an invalid audio format.', response.status, 'invalid_response')
      const audio = await response.blob()
      if (audio.size < 44 || audio.size > 4 * 1024 * 1024) throw new CloudApiError('Speech service returned an invalid audio payload.', response.status, 'invalid_response')
      return audio
    },
    health: async () => {
      const result = await request<CloudHealth>('/v1/health', {}, false)
      if (result.version !== CLOUD_API_VERSION || !['ok', 'degraded'].includes(result.status)) {
        throw new CloudApiError('Cloud service returned an invalid health response.', 200, 'invalid_response')
      }
      return result
    },
    createConversation: () => request<CreateConversationResponse>('/v1/conversations', {
      method: 'POST',
      body: JSON.stringify({ version: CLOUD_API_VERSION }),
    }),
    listConversations: () => request<ListConversationsResponse>('/v1/conversations'),
    getConversation: (conversationId: string) =>
      request<GetConversationResponse>(`/v1/conversations/${encodeURIComponent(requireText(conversationId, 'conversation ID'))}`),
    deleteConversation: (conversationId: string) =>
      request<{ version: typeof CLOUD_API_VERSION; deleted: true }>(
        `/v1/conversations/${encodeURIComponent(requireText(conversationId, 'conversation ID'))}`,
        { method: 'DELETE' },
      ),
    getProviderStatus: () => request<{
      version: typeof CLOUD_API_VERSION
      configured: boolean
      providers: { name: string; model: string; providerType?: string; privacyMode?: 'zdr' | 'standard' }[]
      speechProvider?: 'cloudflare-whisper' | 'unconfigured'
    }>('/v1/provider-status'),
    getMemoryPreference: () => request<MemoryPreferenceResponse>('/v1/memory-preferences'),
    setMemoryPreferences: (patch: Partial<Pick<MemoryPreferenceResponse, 'contextEnabled' | 'autoCaptureEnabled'>>) =>
      request<MemoryPreferenceResponse>('/v1/memory-preferences', {
        method: 'PUT',
        body: JSON.stringify({ version: CLOUD_API_VERSION, ...patch }),
      }),
    setMemoryContextEnabled: (contextEnabled: boolean) =>
      request<MemoryPreferenceResponse>('/v1/memory-preferences', {
        method: 'PUT',
        body: JSON.stringify({ version: CLOUD_API_VERSION, contextEnabled }),
      }),
    listMemories: () => request<ListMemoriesResponse>('/v1/memories'),
    listSemanticMemoryCandidates: () =>
      request<SemanticMemoryCandidateListResponse>('/v1/semantic-memory/candidates'),
    decideSemanticMemoryCandidate: (candidateId: string, decision: 'approved' | 'rejected') => {
      const id = requireText(candidateId, 'memory candidate ID', 64)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        throw new CloudApiError('Invalid memory candidate ID.', 400, 'invalid_request')
      }
      if (decision !== 'approved' && decision !== 'rejected') {
        throw new CloudApiError('Invalid memory decision.', 400, 'invalid_request')
      }
      return request<SemanticMemoryCandidateDecisionResponse>(
        `/v1/semantic-memory/candidates/${encodeURIComponent(id)}`,
        { method: 'PUT', body: JSON.stringify({ version: CLOUD_API_VERSION, decision }) },
      )
    },
    createMemory: (input: { category: MemoryCategory; content: string; expiresAt?: string | null }) => {
      const content = requireText(input.content, 'memory content', 2_000)
      if (!['preference', 'project', 'workflow', 'fact'].includes(input.category)) {
        throw new CloudApiError('Invalid memory category.', 400, 'invalid_request')
      }
      return request<CreateMemoryResponse>('/v1/memories', {
        method: 'POST',
        body: JSON.stringify({
          version: CLOUD_API_VERSION,
          category: input.category,
          content,
          ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
        }),
      })
    },
    deleteMemory: (memoryId: string) =>
      request<{ version: typeof CLOUD_API_VERSION; deleted: true }>(
        `/v1/memories/${encodeURIComponent(requireText(memoryId, 'memory ID'))}`,
        { method: 'DELETE' },
      ),
    streamTurn: async (
      input: Omit<SendTurnRequest, 'version'>,
      signal?: AbortSignal,
    ): Promise<ReadableStream<Uint8Array>> => {
      const safeInput = {
        conversationId: requireText(input.conversationId, 'conversation ID'),
        turnId: requireText(input.turnId, 'turn ID'),
        text: requireText(input.text, 'message', 20_000),
      }
      const token = await options.getAccessToken()
      if (!token?.trim()) {
        throw new CloudApiError('Sign-in is required.', 401, 'unauthenticated')
      }
      let response: Response
      try {
        response = await fetcher(`${baseUrl}/v1/turns`, {
          method: 'POST',
          headers: {
            Accept: 'text/event-stream',
            apikey: options.publishableKey,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Jarvis-Api-Version': String(CLOUD_API_VERSION),
          },
          body: JSON.stringify({ version: CLOUD_API_VERSION, ...safeInput }),
          credentials: 'omit',
          redirect: 'error',
          signal,
        })
      } catch {
        if (signal?.aborted) throw new DOMException('The turn was cancelled.', 'AbortError')
        throw new CloudApiError('Cloud service could not be reached.', 0, 'network_error', undefined, true)
      }
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null)
        if (payload && typeof payload === 'object' && 'error' in payload) {
          const body = payload as ApiError
          if (body.version === CLOUD_API_VERSION && body.error &&
              typeof body.error.message === 'string' && (API_ERROR_CODES as readonly string[]).includes(body.error.code)) {
            throw new CloudApiError(
              portugueseApiMessage(body.error.message, body.error.code), response.status, body.error.code,
              body.error.requestId, body.error.retryable,
            )
          }
        }
        throw new CloudApiError('Cloud service returned an unexpected error.', response.status, 'invalid_response')
      }
      if (!response.headers.get('content-type')?.toLowerCase().includes('text/event-stream') || !response.body) {
        throw new CloudApiError('Cloud service did not return an event stream.', response.status, 'invalid_response')
      }
      return response.body
    },
    cancelTurn: (input: Omit<CancelTurnRequest, 'version'>) => {
      const safeInput = {
        conversationId: requireText(input.conversationId, 'conversation ID'),
        turnId: requireText(input.turnId, 'turn ID'),
      }
      return request<{ version: typeof CLOUD_API_VERSION; cancelled: boolean }>('/v1/turns/cancel', {
        method: 'POST',
        body: JSON.stringify({ version: CLOUD_API_VERSION, ...safeInput }),
      })
    },
  }
}
