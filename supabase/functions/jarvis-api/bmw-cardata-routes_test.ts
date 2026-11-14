import { handleBMWCarDataRoute } from './bmw-cardata-routes.ts'
import type { BMWVaultRpcClient } from './bmw-cardata-token-store.ts'
import type { ConsumeRateLimit } from './bmw-cardata-budget.ts'

function assertEquals(actual: unknown, expected: unknown, message = 'unexpected value') {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
}

const owner = '00000000-0000-4000-8000-000000000051'
const token = {
  access_token: 'synthetic-access-token-123',
  refresh_token: 'synthetic-refresh-token-123',
  id_token: 'synthetic-id-token-123',
  token_type: 'Bearer',
  expires_in: 3600,
}

class FakeRpc implements BMWVaultRpcClient {
  calls: Array<{ name: string; params: Record<string, unknown> }> = []
  async rpc(name: string, params: Record<string, unknown>) {
    this.calls.push({ name, params })
    if (name === 'jarvis_get_bmw_cardata_refresh_token') {
      return { data: [{ client_id: 'bmw-client-test', refresh_token: 'synthetic-refresh-token-123', refresh_expires_at: '2026-11-28T00:00:00.000Z' }], error: null }
    }
    if (name === 'jarvis_consume_bmw_cardata_pending_auth') {
      return { data: [{ client_id: 'bmw-client-test', device_code: 'synthetic-device-code', code_verifier: 'a'.repeat(48), expires_at: '2026-11-14T09:10:00.000Z' }], error: null }
    }
    return { data: true, error: null }
  }
}

function request(method: string, path: string, body?: unknown): Request {
  return new Request(`https://jarvis.example/functions/v1/jarvis-api/v1${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

Deno.test('BMW connect start returns short-lived device-flow data and PKCE verifier only to the authenticated caller', async () => {
  const db = new FakeRpc()
  const response = await handleBMWCarDataRoute(
    request('POST', '/bmw/connect/start', { clientId: 'bmw-client-test' }),
    new URL('https://jarvis.example/v1/bmw/connect/start'),
    ['/bmw/connect/start'],
    {
      userId: owner, db, consumeLimit: async () => true,
      fetchImpl: async () => new Response(JSON.stringify({
        device_code: 'synthetic-device-code',
        user_code: 'ABCD-EFGH',
        verification_uri: 'https://customer.bmwgroup.com/verify',
        expires_in: 600,
        interval: 5,
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    },
  )
  assertEquals(response?.status, 200)
  const payload = await response!.json()
  assertEquals(payload.userCode, 'ABCD-EFGH')
  assertEquals(typeof payload.stateId, 'string')
  assertEquals(payload.deviceCode, undefined)
  assertEquals(payload.codeVerifier, undefined)
  assertEquals(db.calls[0].name, 'jarvis_create_bmw_cardata_pending_auth')
  assertEquals(db.calls[0].params.p_user_id, owner)
  assertEquals(db.calls[0].params.p_device_code, 'synthetic-device-code')
})

Deno.test('BMW connect completion stores refresh token only through owner-scoped Vault RPC', async () => {
  const db = new FakeRpc()
  const response = await handleBMWCarDataRoute(
    request('POST', '/bmw/connect/complete', {
      stateId: '10000000-0000-4000-8000-000000000051',
    }),
    new URL('https://jarvis.example/v1/bmw/connect/complete'),
    ['/bmw/connect/complete'],
    {
      userId: owner, db, consumeLimit: async () => true,
      now: () => new Date('2026-11-14T09:00:00.000Z'),
      fetchImpl: async () => new Response(JSON.stringify(token), { status: 200, headers: { 'content-type': 'application/json' } }),
    },
  )
  assertEquals(response?.status, 200)
  const payload = await response!.json()
  assertEquals(payload.connected, true)
  assertEquals(db.calls[0].name, 'jarvis_consume_bmw_cardata_pending_auth')
  assertEquals(db.calls[0].params.p_user_id, owner)
  assertEquals(db.calls[0].params.p_state_id, '10000000-0000-4000-8000-000000000051')
  assertEquals(db.calls[1].name, 'jarvis_store_bmw_cardata_refresh_token')
  assertEquals(db.calls[1].params.p_user_id, owner)
  assertEquals(db.calls[1].params.p_refresh_token, token.refresh_token)
})

Deno.test('BMW vehicle mappings refreshes credentials server-side and uses the atomic per-user REST budget', async () => {
  const db = new FakeRpc()
  const calls: string[] = []
  const budgetCalls: Array<{ bucket: string; limit: number; window: number }> = []
  const response = await handleBMWCarDataRoute(
    request('GET', '/bmw/vehicles'),
    new URL('https://jarvis.example/v1/bmw/vehicles'),
    ['/bmw/vehicles'],
    {
      userId: owner, db,
      consumeLimit: async (bucket, limit, window) => {
        if (bucket === 'bmw_cardata_rest_daily') budgetCalls.push({ bucket, limit, window })
        return true
      },
      now: () => new Date('2026-11-14T09:00:00.000Z'),
      fetchImpl: async (input) => {
        const url = String(input)
        calls.push(url)
        if (url.includes('/oauth/token')) return new Response(JSON.stringify(token), { status: 200 })
        return new Response(JSON.stringify({ vehicles: [{ vin: 'WBY71HH090CW09664' }] }), { status: 200 })
      },
    },
  )
  assertEquals(response?.status, 200)
  const payload = await response!.json()
  assertEquals(payload.data.vehicles.length, 1)
  assertEquals(calls.length, 2)
  assertEquals(budgetCalls.length, 1)
  assertEquals(budgetCalls[0].limit, 50)
  assertEquals(budgetCalls[0].window, 86400)
  assertEquals(db.calls[0].params.p_user_id, owner)
})

Deno.test('BMW data route rejects invalid VIN before making a vehicle request', async () => {
  const db = new FakeRpc()
  const response = await handleBMWCarDataRoute(
    request('GET', '/bmw/vehicles/not-a-vin/basic'),
    new URL('https://jarvis.example/v1/bmw/vehicles/not-a-vin/basic'),
    ['/bmw/vehicles/not-a-vin/basic'],
    { userId: owner, db, consumeLimit: async () => true, fetchImpl: async () => { throw new Error('must not fetch') } },
  )
  assertEquals(response, null)
})

Deno.test('BMW disconnect deletes only the authenticated owner credential mapping', async () => {
  const db = new FakeRpc()
  const response = await handleBMWCarDataRoute(
    request('DELETE', '/bmw/connection'),
    new URL('https://jarvis.example/v1/bmw/connection'),
    ['/bmw/connection'],
    { userId: owner, db, consumeLimit: async () => true },
  )
  assertEquals(response?.status, 200)
  assertEquals(db.calls[0].name, 'jarvis_delete_bmw_cardata_credentials')
  assertEquals(db.calls[0].params.p_user_id, owner)
})
