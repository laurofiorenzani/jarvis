/**
 * Supabase Auth adapter with injected secure storage.
 *
 * The adapter never chooses localStorage or another persistence mechanism.
 * Native clients must inject Keychain-backed storage; browser clients must
 * make an explicit storage decision before enabling sign-in.
 */
export type SecureTokenStore = {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

type AuthSession = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  token_type: string
  user: { id: string; email?: string }
}

type AuthResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  expires_at?: number
  token_type?: string
  user?: { id?: string; email?: string }
  msg?: string
  message?: string
  error_description?: string
}

export type SupabaseAuthOptions = {
  url: string
  anonKey: string
  storage: SecureTokenStore
  fetchImpl?: typeof fetch
  now?: () => number
}

export class CloudAuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'CloudAuthError'
  }
}

const REFRESH_TOKEN_KEY = 'jarvis.supabase.refresh-token'

function validateAuthOrigin(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('Supabase Auth must use HTTPS.')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Supabase Auth URL must not contain credentials, query, or fragment.')
  }
  return url.toString().replace(/\/$/, '')
}

export function createSupabaseAuth(options: SupabaseAuthOptions) {
  const baseUrl = validateAuthOrigin(options.url)
  const fetcher = options.fetchImpl ?? fetch
  const now = options.now ?? Date.now
  let session: AuthSession | null = null
  let refreshInFlight: Promise<AuthSession | null> | null = null

  async function authRequest(path: string, body?: Record<string, unknown>, accessToken?: string) {
    let response: Response
    try {
      response = await fetcher(`${baseUrl}/auth/v1/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          apikey: options.anonKey,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        credentials: 'omit',
        redirect: 'error',
      })
    } catch {
      throw new CloudAuthError('Authentication service could not be reached.', 0)
    }
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const message = payload && typeof payload === 'object'
        ? (payload as AuthResponse).error_description ?? (payload as AuthResponse).msg ?? (payload as AuthResponse).message
        : undefined
      throw new CloudAuthError(typeof message === 'string' ? message : 'Authentication request failed.', response.status)
    }
    if (!payload || typeof payload !== 'object') {
      throw new CloudAuthError('Authentication service returned an invalid response.', response.status)
    }
    return payload as AuthResponse
  }

  function parseSession(payload: AuthResponse): AuthSession {
    if (typeof payload.access_token !== 'string' || !payload.access_token ||
        typeof payload.refresh_token !== 'string' || !payload.refresh_token ||
        typeof payload.expires_in !== 'number' || !payload.user ||
        typeof payload.user.id !== 'string' || !payload.user.id) {
      throw new CloudAuthError('Authentication service returned an incomplete session.', 502)
    }
    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_in: payload.expires_in,
      expires_at: payload.expires_at ?? Math.floor(now() / 1000) + payload.expires_in,
      token_type: payload.token_type ?? 'bearer',
      user: { id: payload.user.id, email: payload.user.email },
    }
  }

  async function saveSession(next: AuthSession) {
    session = next
    await options.storage.set(REFRESH_TOKEN_KEY, next.refresh_token)
  }

  async function refresh(): Promise<AuthSession | null> {
    if (refreshInFlight) return refreshInFlight
    refreshInFlight = (async () => {
      const refreshToken = await options.storage.get(REFRESH_TOKEN_KEY)
      if (!refreshToken) { session = null; return null }
      try {
        const payload = await authRequest('token?grant_type=refresh_token', { refresh_token: refreshToken })
        const next = parseSession(payload)
        await saveSession(next)
        return next
      } catch (error) {
        if (error instanceof CloudAuthError && [400, 401, 403].includes(error.status)) {
          await options.storage.remove(REFRESH_TOKEN_KEY)
          session = null
          return null
        }
        throw error
      }
    })().finally(() => { refreshInFlight = null })
    return refreshInFlight
  }

  return {
    async signInWithPassword(email: string, password: string) {
      if (!email.trim() || !password) throw new CloudAuthError('Email and password are required.', 400)
      const payload = await authRequest('token?grant_type=password', {
        email: email.trim(), password,
      })
      const next = parseSession(payload)
      await saveSession(next)
      return { user: next.user }
    },
    async getAccessToken(): Promise<string | null> {
      if (session && (session.expires_at ?? 0) * 1000 > now() + 60_000) return session.access_token
      const next = await refresh()
      return next?.access_token ?? null
    },
    async restoreSession() {
      const next = await refresh()
      return next ? { user: next.user } : null
    },
    async signOut() {
      const accessToken = await getAccessToken()
      if (accessToken) {
        try { await authRequest('logout', {}, accessToken) } catch { /* Local sign-out must still complete. */ }
      }
      session = null
      await options.storage.remove(REFRESH_TOKEN_KEY)
    },
  }
}
