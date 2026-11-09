/**
 * Authenticated, provider-neutral HTTP client for the future cloud API.
 *
 * This module is deliberately not selected by the running app yet. A caller
 * must inject both the API origin and a short-lived access-token provider;
 * there is no default host, token persistence, or browser-direct model access.
 */
import {
  CLOUD_API_VERSION,
  type ApiError,
  type CancelTurnRequest,
  type CloudHealth,
  type CreateConversationResponse,
  type SendTurnRequest,
} from './backend-contract'

export type CloudFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type CloudApiOptions = {
  baseUrl: string
  getAccessToken: () => Promise<string | null>
  fetchImpl?: CloudFetch
}

export class CloudApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: ApiError['error']['code'] | 'network_error' | 'invalid_response',
    readonly requestId?: string,
    readonly retryable = false,
  ) {
    super(message)
    this.name = 'CloudApiError'
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
  const fetcher = options.fetchImpl ?? fetch

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await options.getAccessToken()
    if (!token?.trim()) {
      throw new CloudApiError('Sign-in is required.', 401, 'unauthenticated')
    }

    let response: Response
    try {
      const headers = new Headers(init.headers)
      headers.set('Accept', 'application/json')
      headers.set('Authorization', `Bearer ${token}`)
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
            body.error.message,
            response.status,
            body.error.code,
            body.error.requestId,
            body.error.retryable,
          )
        }
      }
      throw new CloudApiError('Cloud service returned an unexpected error.', response.status, 'invalid_response')
    }
    if (payload === null) {
      throw new CloudApiError('Cloud service returned an empty or invalid response.', response.status, 'invalid_response')
    }
    return payload as T
  }

  return {
    health: async () => {
      const result = await request<CloudHealth>('/v1/health')
      if (result.version !== CLOUD_API_VERSION || !['ok', 'degraded'].includes(result.status)) {
        throw new CloudApiError('Cloud service returned an invalid health response.', 200, 'invalid_response')
      }
      return result
    },
    createConversation: () => request<CreateConversationResponse>('/v1/conversations', {
      method: 'POST',
      body: JSON.stringify({ version: CLOUD_API_VERSION }),
    }),
    sendTurn: (input: Omit<SendTurnRequest, 'version'>) => {
      const safeInput = {
        conversationId: requireText(input.conversationId, 'conversation ID'),
        turnId: requireText(input.turnId, 'turn ID'),
        text: requireText(input.text, 'message', 100_000),
      }
      return request<{ version: typeof CLOUD_API_VERSION; accepted: true }>('/v1/turns', {
        method: 'POST',
        body: JSON.stringify({ version: CLOUD_API_VERSION, ...safeInput }),
      })
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
