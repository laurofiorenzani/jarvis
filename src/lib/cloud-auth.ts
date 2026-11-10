/**
 * Supabase Auth adapter with injected secure storage.
 *
 * It never chooses localStorage or another persistence mechanism. Native
 * clients must inject Keychain-backed storage before enabling sign-in.
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
  expires_at: number
  user: { id: string; email?: string }
}

type AuthResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  expires_at?: number
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
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CloudAuthError'
    this.status = status
  }
}

const REFRESH_TOKEN_KEY = 'jarvis.supabase.refresh-token'

function validateAuthOrigin(value: string): string {
  const url = new URL(value)
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('Supabase Auth must use HTTPS (HTTP is allowed only on localhost).')
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
  let refreshAbortController: AbortController | null = null
  let signInInFlight: Promise<{ user: AuthSession['user'] }> | null = null
  let signInAbortController: AbortController | null = null
  // Invalidates refresh work that was started before an explicit sign-out.
  let authEpoch = 0

  async function authRequest(path: string, body?: Record<string, unknown>, accessToken?: string, signal?: AbortSignal) {
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
        ...(signal ? { signal } : {}),
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
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new CloudAuthError('Authentication service returned an invalid response.', response.status)
    }
    return payload as AuthResponse
  }

  function parseSession(payload: AuthResponse): AuthSession {
    if (typeof payload.access_token !== 'string' || !payload.access_token.trim() ||
        typeof payload.refresh_token !== 'string' || !payload.refresh_token.trim() ||
        typeof payload.expires_in !== 'number' || !Number.isFinite(payload.expires_in) ||
        payload.expires_in <= 0 || payload.expires_in > 31 * 24 * 60 * 60 ||
        !payload.user || typeof payload.user.id !== 'string' || !payload.user.id.trim() ||
        (payload.user.email !== undefined && typeof payload.user.email !== 'string') ||
        (payload.expires_at !== undefined &&
          (typeof payload.expires_at !== 'number' || !Number.isFinite(payload.expires_at) || payload.expires_at <= 0))) {
      throw new CloudAuthError('Authentication service returned an incomplete session.', 502)
    }
    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_in: payload.expires_in,
      expires_at: payload.expires_at ?? Math.floor(now() / 1000) + payload.expires_in,
      user: { id: payload.user.id, email: payload.user.email },
    }
  }

  async function saveSession(next: AuthSession, expectedEpoch: number) {
    await options.storage.set(REFRESH_TOKEN_KEY, next.refresh_token)
    if (expectedEpoch !== authEpoch) return false
    session = next
    return true
  }

  async function refresh(): Promise<AuthSession | null> {
    if (refreshInFlight) return refreshInFlight
    const startedAtEpoch = authEpoch
    const abortController = new AbortController()
    refreshAbortController = abortController
    refreshInFlight = (async () => {
      const refreshToken = await options.storage.get(REFRESH_TOKEN_KEY)
      if (startedAtEpoch !== authEpoch) return null
      if (!refreshToken) { session = null; return null }
      try {
        const payload = await authRequest('token?grant_type=refresh_token', { refresh_token: refreshToken }, undefined, abortController.signal)
        if (startedAtEpoch !== authEpoch) return null
        const next = parseSession(payload)
        if (!await saveSession(next, startedAtEpoch)) return null
        if (startedAtEpoch !== authEpoch) return null
        return next
      } catch (error) {
        if (startedAtEpoch !== authEpoch) return null
        if (error instanceof CloudAuthError && [400, 401, 403].includes(error.status)) {
          await options.storage.remove(REFRESH_TOKEN_KEY)
          session = null
          return null
        }
        throw error
      }
    })().finally(() => {
      if (refreshAbortController === abortController) refreshAbortController = null
      refreshInFlight = null
    })
    return refreshInFlight
  }

  const getAccessToken = async (): Promise<string | null> => {
    if (session && session.expires_at * 1000 > now() + 60_000) return session.access_token
    const next = await refresh()
    return next?.access_token ?? null
  }

  return {
    async signUpWithPassword(email: string, password: string, redirectTo?: string) {
      if (!email.trim() || password.length < 10) {
        throw new CloudAuthError('Use a valid email and a password with at least 10 characters.', 400)
      }
      const redirect = redirectTo ? new URL(redirectTo) : undefined
      if (redirect && (redirect.protocol !== 'https:' && redirect.hostname !== 'localhost' && redirect.hostname !== '127.0.0.1')) {
        throw new CloudAuthError('Account confirmation redirect must use HTTPS.', 400)
      }
      const payload = await authRequest('signup', {
        email: email.trim(),
        password,
        ...(redirect ? { options: { emailRedirectTo: redirect.toString() } } : {}),
      })
      // Supabase may require email confirmation. In that case no session is returned.
      if (!payload.access_token) return { user: payload.user ? { id: payload.user.id ?? '', email: payload.user.email } : null, needsEmailConfirmation: true }
      const next = parseSession(payload)
      const epoch = ++authEpoch
      if (!await saveSession(next, epoch)) throw new CloudAuthError('Sign-up was superseded.', 409)
      return { user: next.user, needsEmailConfirmation: false }
    },
    async sendPasswordReset(email: string, redirectTo?: string) {
      if (!email.trim()) throw new CloudAuthError('Email is required.', 400)
      const redirect = redirectTo ? new URL(redirectTo) : undefined
      if (redirect && (redirect.protocol !== 'https:' && redirect.hostname !== 'localhost' && redirect.hostname !== '127.0.0.1')) {
        throw new CloudAuthError('Password reset redirect must use HTTPS.', 400)
      }
      await authRequest('recover', {
        email: email.trim(),
        ...(redirect ? { redirect_to: redirect.toString() } : {}),
      })
    },
    async signInWithPassword(email: string, password: string) {
      if (!email.trim() || !password) throw new CloudAuthError('Email and password are required.', 400)
      const signInEpoch = ++authEpoch
      // A newer sign-in supersedes the previous request and waits for any
      // in-progress token-store write before starting its own write.
      const previousSignIn = signInInFlight
      const previousRefresh = refreshInFlight
      signInAbortController?.abort()
      refreshAbortController?.abort()
      if (previousSignIn) await previousSignIn.catch(() => null)
      if (previousRefresh) await previousRefresh.catch(() => null)
      if (signInEpoch !== authEpoch) {
        throw new CloudAuthError('Sign-in was superseded by another authentication action.', 409)
      }
      const abortController = new AbortController()
      signInAbortController = abortController
      const operation = (async () => {
        const payload = await authRequest('token?grant_type=password', {
          email: email.trim(), password,
        }, undefined, abortController.signal)
        if (signInEpoch !== authEpoch) throw new CloudAuthError('Sign-in was superseded by another authentication action.', 409)
        const next = parseSession(payload)
        if (!await saveSession(next, signInEpoch)) throw new CloudAuthError('Sign-in was superseded by another authentication action.', 409)
        if (signInEpoch !== authEpoch) throw new CloudAuthError('Sign-in was superseded by another authentication action.', 409)
        return { user: next.user }
      })()
      signInInFlight = operation
      try {
        return await operation
      } finally {
        if (signInAbortController === abortController) signInAbortController = null
        if (signInInFlight === operation) signInInFlight = null
      }
    },
    getAccessToken,
    async restoreSession() {
      const next = await refresh()
      return next ? { user: next.user } : null
    },
    async signOut() {
      // Invalidate pending refresh/sign-in work immediately. Do not refresh here:
      // a late refresh response must never recreate a session after local sign-out.
      const signOutEpoch = ++authEpoch
      const accessToken = session?.access_token
      const pendingRefresh = refreshInFlight
      const pendingSignIn = signInInFlight
      refreshAbortController?.abort()
      signInAbortController?.abort()
      session = null
      // Let an already-started storage write settle before the final removal.
      // Its epoch check prevents it from installing an in-memory session.
      if (pendingRefresh) await pendingRefresh.catch(() => null)
      if (pendingSignIn) await pendingSignIn.catch(() => null)
      if (signOutEpoch === authEpoch) await options.storage.remove(REFRESH_TOKEN_KEY)
      try {
        if (accessToken) await authRequest('logout', {}, accessToken)
      } catch { /* Local sign-out must still complete when offline. */ }
    },
  }
}
