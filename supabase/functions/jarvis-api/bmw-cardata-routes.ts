import {
  BMWCarDataClient,
  BMWCarDataError,
  BMW_CARDATA_DEFAULT_SCOPES,
  createBMWPKCE,
  exchangeBMWDeviceCode,
  refreshBMWAccessToken,
  startBMWDeviceAuthorization,
} from '../../../src/lib/integrations/bmw-cardata.ts'
import {
  consumeBMWPendingAuthorization,
  createBMWPendingAuthorization,
  deleteBMWCredentials,
  getBMWRefreshToken,
  storeBMWRefreshToken,
  type BMWVaultRpcClient,
} from './bmw-cardata-token-store.ts'
import { createBMWCardataDailyBudget, type ConsumeRateLimit } from './bmw-cardata-budget.ts'

type Json = Record<string, unknown>
type Dependencies = {
  userId: string
  db: BMWVaultRpcClient
  consumeLimit: ConsumeRateLimit
  fetchImpl?: typeof fetch
  now?: () => Date
}

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function readBody(request: Request): Promise<unknown> {
  if (!request.body) throw new TypeError('missing_body')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 4_096) {
        await reader.cancel()
        throw new TypeError('body_too_large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

function validClientId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 200
}

function validVin(value: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(value)
}

function failure(code: string, message: string, status: number, retryable = false): Response {
  return json({ version: 1, error: { code, message, retryable } }, status)
}

async function loadAccessToken(deps: Dependencies): Promise<string | Response> {
  const saved = await getBMWRefreshToken(deps.db, deps.userId)
  if (!saved) return failure('bmw_not_connected', 'BMW CarData is not connected for this account.', 404)
  if (Date.parse(saved.refreshExpiresAt) <= (deps.now?.() ?? new Date()).getTime()) {
    return failure('bmw_reauthorization_required', 'BMW authorization expired. Reconnect BMW CarData from JARVIS.', 401)
  }
  const token = await refreshBMWAccessToken(saved.clientId, saved.refreshToken, deps.fetchImpl)
  if (!token.access_token || !token.refresh_token) {
    return failure('bmw_token_refresh_failed', 'BMW authorization could not be refreshed.', 502, true)
  }
  const now = deps.now?.() ?? new Date()
  const refreshExpiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1_000).toISOString()
  // Persist a rotated refresh token only through the server-side Vault RPC.
  await storeBMWRefreshToken(deps.db, deps.userId, saved.clientId, token.refresh_token, refreshExpiresAt)
  return token.access_token
}

function mapBMWError(cause: unknown): Response {
  if (cause instanceof BMWCarDataError) {
    if (cause.code === 'daily_limit') return failure('rate_limited', 'BMW CarData reached its 50-request rolling 24-hour limit.', 429, true)
    if (cause.status === 401 || cause.status === 403) return failure('bmw_reauthorization_required', 'BMW authorization is no longer valid. Reconnect BMW CarData from JARVIS.', 401)
    if (cause.status === 429) return failure('bmw_provider_rate_limited', 'BMW CarData is temporarily rate limited.', 429, true)
    return failure('bmw_provider_error', 'BMW CarData could not return the requested data.', 502, cause.status >= 500)
  }
  return failure('bmw_service_unavailable', 'BMW CarData is temporarily unavailable.', 503, true)
}

/**
 * Handles authenticated, owner-scoped BMW CarData routes.
 * This function must be called only after the parent API has verified the
 * Supabase bearer token and derived userId from auth.getUser().
 */
export async function handleBMWCarDataRoute(
  request: Request,
  url: URL,
  pathCandidates: string[],
  deps: Dependencies,
): Promise<Response | null> {
  const path = pathCandidates[pathCandidates.length - 1]
  const matches = (expected: string) => pathCandidates.includes(expected)
  const fetchImpl = deps.fetchImpl ?? fetch

  if (request.method === 'POST' && matches('/bmw/connect/start')) {
    const allowed = await deps.consumeLimit('bmw_oauth_start_hour', 3, 3600)
    if (allowed !== true) return failure('rate_limited', 'BMW connection start limit reached.', allowed === null ? 503 : 429, true)
    let body: unknown
    try { body = await readBody(request) } catch { return failure('invalid_request', 'A valid BMW client ID is required.', 400) }
    if (!isRecord(body) || !validClientId(body.clientId)) return failure('invalid_request', 'A valid BMW client ID is required.', 400)
    try {
      const pkce = await createBMWPKCE()
      const device = await startBMWDeviceAuthorization(
        body.clientId, pkce.codeChallenge, fetchImpl, BMW_CARDATA_DEFAULT_SCOPES,
      )
      if (!device.device_code || !device.user_code || !device.verification_uri ||
          !Number.isInteger(device.expires_in) || device.expires_in < 1 || device.expires_in > 900) {
        return failure('bmw_authorization_unavailable', 'BMW returned an invalid device authorization response.', 502, true)
      }
      const stateId = crypto.randomUUID()
      const now = deps.now?.() ?? new Date()
      const expiresAt = new Date(now.getTime() + device.expires_in * 1_000).toISOString()
      await createBMWPendingAuthorization(deps.db, deps.userId, stateId, {
        clientId: body.clientId,
        deviceCode: device.device_code,
        codeVerifier: pkce.codeVerifier,
        expiresAt,
      })
      return json({
        version: 1,
        stateId,
        verificationUri: device.verification_uri,
        verificationUriComplete: device.verification_uri_complete ?? null,
        userCode: device.user_code,
        expiresIn: device.expires_in,
        interval: device.interval,
        scopes: BMW_CARDATA_DEFAULT_SCOPES,
      }, 200)
    } catch {
      return failure('bmw_authorization_unavailable', 'BMW authorization could not be started.', 502, true)
    }
  }

  if (request.method === 'POST' && matches('/bmw/connect/complete')) {
    const allowed = await deps.consumeLimit('bmw_oauth_complete_hour', 5, 3600)
    if (allowed !== true) return failure('rate_limited', 'BMW authorization completion limit reached.', allowed === null ? 503 : 429, true)
    let body: unknown
    try { body = await readBody(request) } catch { return failure('invalid_request', 'A valid BMW authorization response is required.', 400) }
    if (!isRecord(body) || typeof body.stateId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.stateId)) {
      return failure('invalid_request', 'A valid BMW authorization state is required.', 400)
    }
    try {
      // State is owner-bound, short-lived and atomically consumed before token exchange.
      // A failed exchange requires a fresh device authorization rather than replay.
      const pending = await consumeBMWPendingAuthorization(deps.db, deps.userId, body.stateId)
      if (!pending || Date.parse(pending.expiresAt) <= (deps.now?.() ?? new Date()).getTime()) {
        return failure('bmw_authorization_expired', 'BMW authorization expired or was already used. Start a new connection.', 410)
      }
      const token = await exchangeBMWDeviceCode(
        pending.clientId, pending.deviceCode, pending.codeVerifier, fetchImpl,
      )
      if (!token.refresh_token) return failure('bmw_token_missing', 'BMW did not return a refresh token.', 502)
      const now = deps.now?.() ?? new Date()
      const refreshExpiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1_000).toISOString()
      await storeBMWRefreshToken(deps.db, deps.userId, pending.clientId, token.refresh_token, refreshExpiresAt)
      return json({ version: 1, connected: true, scopes: token.scope ?? BMW_CARDATA_DEFAULT_SCOPES.join(' '), refreshExpiresAt }, 200)
    } catch {
      return failure('bmw_authorization_failed', 'BMW authorization was not completed. Check the BMW approval and try again.', 401)
    }
  }

  if (request.method === 'DELETE' && matches('/bmw/connection')) {
    const allowed = await deps.consumeLimit('bmw_disconnect_hour', 3, 3600)
    if (allowed !== true) return failure('rate_limited', 'BMW disconnect limit reached.', allowed === null ? 503 : 429, true)
    try {
      const disconnected = await deleteBMWCredentials(deps.db, deps.userId)
      return json({ version: 1, disconnected }, 200)
    } catch {
      return failure('bmw_disconnect_failed', 'BMW connection could not be removed.', 503, true)
    }
  }

  const vehicleMatch = path.match(/^\/bmw\/vehicles\/([A-HJ-NPR-Z0-9]{17})\/(basic|telematics|charging-history)$/i)
  if ((request.method === 'GET' && matches('/bmw/vehicles')) ||
      (request.method === 'GET' && vehicleMatch)) {
    let accessToken: string | Response
    try { accessToken = await loadAccessToken(deps) }
    catch { return failure('bmw_token_refresh_failed', 'BMW authorization could not be refreshed. Reconnect BMW CarData from JARVIS.', 401) }
    if (accessToken instanceof Response) return accessToken
    const budget = createBMWCardataDailyBudget(deps.userId, deps.consumeLimit)
    const client = new BMWCarDataClient(deps.userId, budget, fetchImpl, deps.now)
    try {
      if (matches('/bmw/vehicles')) {
        const data = await client.getVehicleMappings(accessToken)
        return json({ version: 1, data }, 200)
      }
      const vin = vehicleMatch![1]
      if (!validVin(vin)) return failure('invalid_request', 'Invalid BMW vehicle identifier.', 400)
      if (vehicleMatch![2] === 'basic') {
        return json({ version: 1, data: await client.getBasicVehicleData(vin, accessToken) }, 200)
      }
      if (vehicleMatch![2] === 'telematics') {
        const containerId = url.searchParams.get('containerId') ?? ''
        if (!containerId || containerId.length > 200) return failure('invalid_request', 'A valid BMW CarData containerId is required.', 400)
        return json({ version: 1, data: await client.getTelematicData(vin, containerId, accessToken) }, 200)
      }
      const from = url.searchParams.get('from') ?? ''
      const to = url.searchParams.get('to') ?? ''
      const nextToken = url.searchParams.get('nextToken') ?? undefined
      if (nextToken && nextToken.length > 2_048) return failure('invalid_request', 'Invalid charging history page token.', 400)
      return json({ version: 1, data: await client.getChargingHistory(vin, from, to, accessToken, nextToken) }, 200)
    } catch (cause) {
      return mapBMWError(cause)
    }
  }

  return null
}
