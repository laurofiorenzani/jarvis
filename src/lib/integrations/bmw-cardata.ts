/**
 * Read-only personal BMW CarData API client.
 *
 * This module never sends vehicle commands. It requires an injected, atomic
 * daily-budget store and never persists or logs OAuth tokens. Production
 * integration must provide a server-side budget backed by Supabase RPC and
 * encrypted token storage before this client is instantiated.
 */

export const BMW_CARDATA_API_BASE_URL = 'https://api-cardata.bmwgroup.com'
export const BMW_CARDATA_OAUTH_BASE_URL = 'https://customer.bmwgroup.com/gcdm/oauth'
export const BMW_CARDATA_API_VERSION = 'v1'
export const BMW_CARDATA_DAILY_REQUEST_LIMIT = 50
export const BMW_CARDATA_DEFAULT_SCOPES = ['openid', 'authenticate_user', 'cardata:api:read'] as const

export type BMWDeviceAuthorization = {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
  verification_uri_complete?: string
}

export type BMWTokenResponse = {
  access_token: string
  refresh_token: string
  id_token: string
  token_type: string
  expires_in: number
  scope?: string
}

export type BMWOAuthError = {
  error?: string
  error_description?: string
}

export interface BMWDailyRequestBudget {
  /**
   * Must atomically increment a per-owner UTC-day counter and return false
   * once limit requests have already been consumed. Implement with a database
   * RPC; an in-memory counter is suitable only for tests.
   */
  consume(ownerId: string, utcDate: string, limit: number): Promise<boolean>
}

export type BMWFetch = typeof fetch

export class BMWCarDataError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'BMWCarDataError'
    this.status = status
    this.code = code
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export async function createBMWPKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const random = crypto.getRandomValues(new Uint8Array(32))
  const codeVerifier = base64Url(random)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
  return { codeVerifier, codeChallenge: base64Url(new Uint8Array(digest)) }
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.text()
  let parsed: unknown
  try {
    parsed = body ? JSON.parse(body) : {}
  } catch {
    throw new BMWCarDataError('BMW CarData returned an invalid response.', response.status)
  }

  if (!response.ok) {
    const error = parsed as BMWOAuthError
    throw new BMWCarDataError(
      error.error_description || error.error || `BMW CarData request failed with HTTP ${response.status}.`,
      response.status,
      error.error,
    )
  }
  return parsed as T
}

async function postForm<T>(
  path: string,
  form: URLSearchParams,
  fetchImpl: BMWFetch,
): Promise<T> {
  const response = await fetchImpl(`${BMW_CARDATA_OAUTH_BASE_URL}${path}`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  return parseJson<T>(response)
}

export async function startBMWDeviceAuthorization(
  clientId: string,
  codeChallenge: string,
  fetchImpl: BMWFetch = fetch,
  scopes: readonly string[] = BMW_CARDATA_DEFAULT_SCOPES,
): Promise<BMWDeviceAuthorization> {
  if (!clientId.trim() || !codeChallenge.trim()) {
    throw new TypeError('BMW CarData client ID and PKCE challenge are required.')
  }
  const form = new URLSearchParams({
    client_id: clientId,
    response_type: 'device_code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: scopes.join(' '),
  })
  return postForm<BMWDeviceAuthorization>('/device/code', form, fetchImpl)
}

export async function exchangeBMWDeviceCode(
  clientId: string,
  deviceCode: string,
  codeVerifier: string,
  fetchImpl: BMWFetch = fetch,
): Promise<BMWTokenResponse> {
  if (!clientId.trim() || !deviceCode.trim() || !codeVerifier.trim()) {
    throw new TypeError('BMW CarData device code exchange requires client ID, device code and PKCE verifier.')
  }
  const form = new URLSearchParams({
    client_id: clientId,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    code_verifier: codeVerifier,
  })
  return postForm<BMWTokenResponse>('/token', form, fetchImpl)
}

export async function refreshBMWAccessToken(
  clientId: string,
  refreshToken: string,
  fetchImpl: BMWFetch = fetch,
): Promise<BMWTokenResponse> {
  if (!clientId.trim() || !refreshToken.trim()) {
    throw new TypeError('BMW CarData refresh requires client ID and refresh token.')
  }
  const form = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  return postForm<BMWTokenResponse>('/token', form, fetchImpl)
}

export class BMWCarDataClient {
  private readonly ownerId: string
  private readonly budget: BMWDailyRequestBudget
  private readonly fetchImpl: BMWFetch
  private readonly now: () => Date

  constructor(
    ownerId: string,
    budget: BMWDailyRequestBudget,
    fetchImpl: BMWFetch = fetch,
    now: () => Date = () => new Date(),
  ) {
    if (!ownerId.trim()) throw new TypeError('A verified JARVIS owner ID is required.')
    this.ownerId = ownerId
    this.budget = budget
    this.fetchImpl = fetchImpl
    this.now = now
  }

  private async get<T>(path: string, accessToken: string): Promise<T> {
    if (!accessToken.trim()) throw new TypeError('BMW CarData access token is required.')
    const utcDate = this.now().toISOString().slice(0, 10)
    const allowed = await this.budget.consume(this.ownerId, utcDate, BMW_CARDATA_DAILY_REQUEST_LIMIT)
    if (!allowed) {
      throw new BMWCarDataError('BMW CarData daily request limit reached; retry after 00:00 UTC.', 429, 'daily_limit')
    }

    const response = await this.fetchImpl(`${BMW_CARDATA_API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
        'x-version': BMW_CARDATA_API_VERSION,
      },
    })
    return parseJson<T>(response)
  }

  /** Read vehicles mapped to the authenticated BMW customer account. */
  getVehicleMappings<T = unknown>(accessToken: string): Promise<T> {
    return this.get<T>('/customers/vehicles/mappings', accessToken)
  }

  /** Read basic vehicle data. This endpoint cannot issue remote commands. */
  getBasicVehicleData<T = unknown>(vin: string, accessToken: string): Promise<T> {
    if (!vin.trim()) throw new TypeError('BMW VIN is required.')
    return this.get<T>(`/customers/vehicles/${encodeURIComponent(vin)}/basicData`, accessToken)
  }

  /** Read telematics data from a customer-configured CarData container. */
  getTelematicData<T = unknown>(vin: string, containerId: string, accessToken: string): Promise<T> {
    if (!vin.trim() || !containerId.trim()) {
      throw new TypeError('BMW VIN and CarData container ID are required.')
    }
    const query = new URLSearchParams({ containerId })
    return this.get<T>(
      `/customers/vehicles/${encodeURIComponent(vin)}/telematicData?${query.toString()}`,
      accessToken,
    )
  }

  /** Read charging sessions for a bounded ISO-8601 time window. */
  getChargingHistory<T = unknown>(
    vin: string,
    from: string,
    to: string,
    accessToken: string,
    nextToken?: string,
  ): Promise<T> {
    if (!vin.trim()) throw new TypeError('BMW VIN is required.')
    const fromTime = Date.parse(from)
    const toTime = Date.parse(to)
    if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || fromTime >= toTime) {
      throw new TypeError('BMW charging history requires a valid increasing date-time range.')
    }
    const query = new URLSearchParams({
      from: new Date(fromTime).toISOString(),
      to: new Date(toTime).toISOString(),
    })
    if (nextToken) query.set('nextToken', nextToken)
    return this.get<T>(
      `/customers/vehicles/${encodeURIComponent(vin)}/chargingHistory?${query.toString()}`,
      accessToken,
    )
  }
}
