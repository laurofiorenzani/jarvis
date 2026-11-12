/**
 * Authenticated JARVIS cloud API client.
 *
 * The browser only receives the public Supabase key and a short-lived user
 * access token. Service-role credentials and provider keys remain server-side.
 * Every request is scoped by the bearer token; the API resolves the user ID
 * from that token and enforces ownership in the database.
 */
const VERSION = 1

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, '')
const SUPABASE_PUBLIC_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
const FUNCTION_NAME = ((import.meta.env.VITE_SUPABASE_FUNCTION_NAME as string | undefined)?.trim() || 'jarvis-api')

export type CloudMemoryPreference = { version: 1; contextEnabled: boolean }
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

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
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
  const payload = await response.json().catch(() => null) as
    | { error?: { code?: string; message?: string; retryable?: boolean } }
    | T
    | null
  if (!response.ok) {
    const details = payload && 'error' in payload ? payload.error : undefined
    const error = new Error(details?.message || `Cloud request failed (${response.status}).`) as CloudApiError
    error.status = response.status
    error.code = details?.code
    error.retryable = details?.retryable
    throw error
  }
  return payload as T
}

function json(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}

export const cloudApi = {
  providerStatus: (token: string) =>
    request<{ version: 1; provider: Record<string, unknown> }>('/provider-status', token),

  getMemoryPreference: (token: string) =>
    request<CloudMemoryPreference>('/memory-preferences', token),

  setMemoryPreference: (token: string, contextEnabled: boolean) =>
    request<CloudMemoryPreference>('/memory-preferences', token, {
      method: 'PUT',
      body: JSON.stringify({ version: VERSION, contextEnabled }),
    }),

  listMemoryCandidates: (token: string) =>
    request<{ version: 1; candidates: CloudMemoryCandidate[] }>('/semantic-memory/candidates', token),

  decideMemoryCandidate: (token: string, id: string, decision: 'approved' | 'rejected') =>
    request<{ version: 1; candidate: CloudMemoryCandidate }>(
      `/semantic-memory/candidates/${encodeURIComponent(id)}`,
      token,
      { method: 'PUT', body: JSON.stringify({ version: VERSION, decision }) },
    ),

  searchApprovedMemory: (token: string, query: string, limit = 8) => {
    const params = new URLSearchParams({ q: query, limit: String(Math.max(1, Math.min(8, Math.floor(limit)))) })
    return request<{ version: 1; contextEnabled: boolean; results: CloudMemorySearchResult[] }>(
      `/semantic-memory/search?${params.toString()}`,
      token,
    )
  },

  createMemoryCandidate: (token: string, candidate: {
    factType: string
    content: string
    sourceConversationId?: string
    sourceMessageIds?: string[]
  }) =>
    request<{ version: 1; candidate: CloudMemoryCandidate }>(
      '/semantic-memory/candidates',
      token,
      { method: 'POST', body: JSON.stringify(candidate) },
    ),
}
