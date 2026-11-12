/**
 * Authenticated JARVIS cloud API client.
 *
 * The browser only receives the public Supabase key and a short-lived user
 * access token. Service-role credentials and provider keys remain server-side.
 * Every request is scoped by the bearer token; the API resolves the user ID
 * from that token and enforces ownership in the database.
 */
import { takeSseFrames, sseFrameData } from './sse-frames.js'

const VERSION = 1

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, '')
const SUPABASE_PUBLIC_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
const FUNCTION_NAME = ((import.meta.env.VITE_SUPABASE_FUNCTION_NAME as string | undefined)?.trim() || 'jarvis-api')

export type CloudMemoryPreference = { version: 1; contextEnabled: boolean }
export type CloudConversation = { id: string; title: string | null; createdAt: string; updatedAt: string }
export type CloudMessage = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }
export type CloudTurnEvent =
  | { type: 'turn.started'; conversationId: string; turnId: string }
  | { type: 'text.delta'; delta: string; conversationId: string; turnId: string }
  | { type: 'turn.completed'; assistantMessage: CloudMessage; conversationId: string; turnId: string }
  | { type: 'turn.cancelled'; conversationId: string; turnId: string }
  | { type: 'turn.failed'; code: string; message: string; retryable: boolean; conversationId: string; turnId: string }
export type CloudMemoryCandidate = {
  id: string
  fact_type: string
  content: string
  status: 'pending' | 'approved' | 'rejected'
  source_conversation_id: string | null
  source_message_ids: string[]
  created_at: string
}
export type CloudMemorySearchResult = {
  id: string
  type: string
  content: string
  confidence: number
  createdAt: string
  topic?: string
}
export type CloudApiError = Error & { status?: number; code?: string; retryable?: boolean }

export function cloudApiConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY && FUNCTION_NAME)
}

function endpoint(path: string): string {
  if (!SUPABASE_URL) throw new Error('Cloud API is not configured.')
  return `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}${path.startsWith('/') ? path : `/${path}`}`
}

async function request<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  if (!cloudApiConfigured()) throw new Error('Cloud API is not configured for this deployment.')
  if (!accessToken.trim()) throw new Error('Sign in to use JARVIS Cloud.')
  const response = await fetch(endpoint(path), {
    ...init,
    headers: {
      apikey: SUPABASE_PUBLIC_KEY!,
      Authorization: `Bearer ${accessToken}`,
      'x-jarvis-api-version': String(VERSION),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const envelope = payload && typeof payload === 'object' && 'error' in payload
      ? (payload as { error?: { code?: string; message?: string; retryable?: boolean } }).error
      : undefined
    const error = new Error(envelope?.message || `Cloud request failed (${response.status}).`) as CloudApiError
    error.status = response.status
    error.code = envelope?.code
    error.retryable = envelope?.retryable
    throw error
  }
  return payload as T
}

async function streamTurn(
  token: string,
  conversationId: string,
  text: string,
  onEvent: (event: CloudTurnEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!cloudApiConfigured()) throw new Error('Cloud API is not configured for this deployment.')
  const turnId = globalThis.crypto?.randomUUID?.()
  if (!turnId) throw new Error('A secure browser context is required for cloud conversations.')
  const response = await fetch(endpoint('/turns'), {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLIC_KEY!,
      Authorization: `Bearer ${token}`,
      'x-jarvis-api-version': String(VERSION),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ version: VERSION, conversationId, turnId, text }),
    cache: 'no-store',
    signal,
  })
  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(payload?.error?.message || `Cloud turn failed (${response.status}).`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const dispatch = (frame: string) => {
    const data = sseFrameData(frame)
    if (!data) return
    const event = JSON.parse(data) as CloudTurnEvent
    onEvent(event)
    if (event.type === 'turn.failed') throw new Error(event.message || 'Cloud turn failed.')
  }
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parsed = takeSseFrames(buffer)
      buffer = parsed.remainder
      for (const frame of parsed.frames) dispatch(frame)
    }
    buffer += decoder.decode()
    const final = takeSseFrames(buffer, true)
    for (const frame of final.frames) dispatch(frame)
  } finally {
    reader.releaseLock()
  }
}

export const cloudApi = {
  createConversation: (token: string) => request<{ version: 1; conversation: CloudConversation }>('/conversations', token, { method: 'POST' }),
  listConversations: (token: string) => request<{ version: 1; conversations: CloudConversation[] }>('/conversations', token),
  getConversation: (token: string, id: string) => request<{ version: 1; conversation: CloudConversation; messages: CloudMessage[] }>(
    `/conversations/${encodeURIComponent(id)}`, token,
  ),
  deleteConversation: (token: string, id: string) => request<{ version: 1; deleted: boolean }>(
    `/conversations/${encodeURIComponent(id)}`, token, { method: 'DELETE' },
  ),
  streamTurn,
  cancelTurn: (token: string, conversationId: string, turnId: string) => request<{ version: 1; cancelled: boolean }>('/turns/cancel', token, {
    method: 'POST', body: JSON.stringify({ version: VERSION, conversationId, turnId }),
  }),
  providerStatus: (token: string) => request<{ version: 1; configured: boolean; providers: { name: string; model: string }[] }>('/provider-status', token),
  getMemoryPreference: (token: string) => request<CloudMemoryPreference>('/memory-preferences', token),
  setMemoryPreference: (token: string, contextEnabled: boolean) => request<CloudMemoryPreference>('/memory-preferences', token, {
    method: 'PUT', body: JSON.stringify({ version: VERSION, contextEnabled }),
  }),
  listMemoryCandidates: (token: string) => request<{ version: 1; candidates: CloudMemoryCandidate[] }>('/semantic-memory/candidates', token),
  decideMemoryCandidate: (token: string, id: string, decision: 'approved' | 'rejected') => request<{ version: 1; candidate: CloudMemoryCandidate }>(
    `/semantic-memory/candidates/${encodeURIComponent(id)}`, token,
    { method: 'PUT', body: JSON.stringify({ version: VERSION, decision }) },
  ),
  searchApprovedMemory: (token: string, query: string, limit = 8) => {
    const params = new URLSearchParams({ q: query, limit: String(Math.max(1, Math.min(8, Math.floor(limit)))) })
    return request<{ version: 1; contextEnabled: boolean; results: CloudMemorySearchResult[] }>(
      `/semantic-memory/search?${params.toString()}`, token,
    )
  },
  createMemoryCandidate: (token: string, candidate: { factType: string; content: string; sourceConversationId?: string; sourceMessageIds?: string[] }) => request<{ version: 1; candidate: CloudMemoryCandidate }>(
    '/semantic-memory/candidates', token,
    { method: 'POST', body: JSON.stringify({ version: VERSION, ...candidate }) },
  ),
}
