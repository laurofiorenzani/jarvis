import { cloudApiConfigured } from './cloud-api'

const projectUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, '')
const publicKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
const storageKey = (() => {
  try {
    const ref = projectUrl ? new URL(projectUrl).hostname.split('.')[0] : 'jarvis'
    return `sb-${ref}-auth-token`
  } catch {
    return 'jarvis-auth-token'
  }
})()

export type CloudSession = {
  access_token: string
  refresh_token: string
  expires_at: number
  token_type: string
  user: { id: string; email?: string; [key: string]: unknown }
}

type AuthPayload = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  expires_at?: number
  token_type?: string
  user?: CloudSession['user']
  error_description?: string
  msg?: string
  message?: string
}

const listeners = new Set<(session: CloudSession | null) => void>()
let refreshInFlight: Promise<CloudSession | null> | null = null

function readSession(): CloudSession | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CloudSession
    if (!parsed.access_token || !parsed.refresh_token || !parsed.user?.id) return null
    return parsed
  } catch {
    return null
  }
}

function emit(session: CloudSession | null) {
  for (const listener of listeners) listener(session)
}

function saveSession(payload: AuthPayload): CloudSession {
  if (!payload.access_token || !payload.refresh_token || !payload.user?.id) {
    throw new Error('Cloud sign-in returned an incomplete session.')
  }
  const session: CloudSession = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at ?? Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600),
    token_type: payload.token_type ?? 'bearer',
    user: payload.user,
  }
  localStorage.setItem(storageKey, JSON.stringify(session))
  emit(session)
  return session
}

async function authRequest(path: string, body: Record<string, unknown>): Promise<AuthPayload> {
  if (!cloudApiConfigured() || !projectUrl || !publicKey) {
    throw new Error('Cloud authentication is not configured for this deployment.')
  }
  const response = await fetch(`${projectUrl}/auth/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: publicKey },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({})) as AuthPayload
  if (!response.ok) {
    throw new Error(payload.msg || payload.message || payload.error_description || `Cloud authentication failed (${response.status}).`)
  }
  return payload
}

export const cloudAuth = {
  getSession(): CloudSession | null {
    return readSession()
  },

  subscribe(listener: (session: CloudSession | null) => void): () => void {
    listeners.add(listener)
    listener(readSession())
    return () => listeners.delete(listener)
  },

  async signIn(email: string, password: string): Promise<CloudSession> {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) throw new Error('Enter your email and password.')
    const payload = await authRequest('token?grant_type=password', { email: cleanEmail, password })
    return saveSession(payload)
  },

  async refresh(): Promise<CloudSession | null> {
    if (refreshInFlight) return refreshInFlight
    refreshInFlight = (async () => {
      const current = readSession()
      if (!current?.refresh_token) return null
      try {
        const payload = await authRequest('token?grant_type=refresh_token', { refresh_token: current.refresh_token })
        return saveSession(payload)
      } catch (error) {
        // A transient network/provider error must not destroy a still-useful
        // refresh token. Only clear on explicit invalid/expired credentials.
        const message = error instanceof Error ? error.message : ''
        if (/refresh token|invalid grant|session.*not found/i.test(message)) {
          localStorage.removeItem(storageKey)
          emit(null)
        }
        throw error
      } finally {
        refreshInFlight = null
      }
    })()
    return refreshInFlight
  },

  async getValidAccessToken(): Promise<string | null> {
    const session = readSession()
    if (!session) return null
    if (session.expires_at * 1000 > Date.now() + 60_000) return session.access_token
    const refreshed = await this.refresh()
    return refreshed?.access_token ?? null
  },

  async signOut(): Promise<void> {
    const session = readSession()
    try {
      if (session?.access_token && projectUrl && publicKey) {
        await fetch(`${projectUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: { apikey: publicKey, Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        })
      }
    } finally {
      localStorage.removeItem(storageKey)
      emit(null)
    }
  },
}
