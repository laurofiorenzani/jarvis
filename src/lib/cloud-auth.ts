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
const refreshInFlight = new Map<string, Promise<CloudSession | null>>()
// Invalidates in-flight sign-in/refresh/sign-out completions after an identity
// transition. A late response must never overwrite a newer household session.
let authRevision = 0

// Keep separate browser tabs in sync when either household member signs in,
// signs out, or rotates a refresh token. Identity changes invalidate stale work.
let storageSyncAttached = false
function handleStorage(event: StorageEvent) {
  if (event.key !== storageKey && event.key !== null) return
  authRevision++
  emit(readSession())
}

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
    if (!storageSyncAttached && typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage)
      storageSyncAttached = true
    }
    listener(readSession())
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0 && storageSyncAttached && typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage)
        storageSyncAttached = false
      }
    }
  },

  async signIn(email: string, password: string): Promise<CloudSession> {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) throw new Error('Enter your email and password.')
    const revision = ++authRevision
    const payload = await authRequest('token?grant_type=password', { email: cleanEmail, password })
    if (revision !== authRevision) throw new Error('Sign-in was superseded by a newer account action.')
    return saveSession(payload)
  },

  async refresh(): Promise<CloudSession | null> {
    const current = readSession()
    if (!current?.refresh_token) return null
    const revision = authRevision
    const key = String(revision) + ':' + current.user.id + ':' + current.refresh_token
    const existing = refreshInFlight.get(key)
    if (existing) return existing

    const pending = (async () => {
      try {
        const payload = await authRequest('token?grant_type=refresh_token', { refresh_token: current.refresh_token })
        const latest = readSession()
        if (revision !== authRevision || latest?.user.id !== current.user.id ||
            latest.refresh_token !== current.refresh_token) return null
        return saveSession(payload)
      } catch (error) {
        // A transient network/provider error must not destroy a still-useful
        // refresh token. Only clear on explicit invalid/expired credentials.
        // Also never clear a newer session created while this refresh was pending.
        const latest = readSession()
        if (revision === authRevision && latest?.user.id === current.user.id &&
            latest.refresh_token === current.refresh_token) {
          const message = error instanceof Error ? error.message : ''
          if (/refresh token|invalid grant|session.*not found/i.test(message)) {
            localStorage.removeItem(storageKey)
            emit(null)
          }
        }
        throw error
      } finally {
        // An older account's completion must never clear a newer refresh entry.
        refreshInFlight.delete(key)
      }
    })()
    refreshInFlight.set(key, pending)
    return pending
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
    const revision = ++authRevision
    // Clear local identity immediately; a delayed network logout must not leave
    // the old account visible or delete a newly signed-in account's session.
    if (session) {
      localStorage.removeItem(storageKey)
      emit(null)
    }
    try {
      if (session?.access_token && projectUrl && publicKey) {
        await fetch(`${projectUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: { apikey: publicKey, Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        })
      }
    } finally {
      const latest = readSession()
      if (session && revision === authRevision && latest?.user.id === session.user.id &&
          latest.refresh_token === session.refresh_token) {
        localStorage.removeItem(storageKey)
        emit(null)
      }
    }
  },
}
