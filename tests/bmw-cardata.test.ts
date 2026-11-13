import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BMWCarDataClient,
  BMWCarDataError,
  BMW_CARDATA_API_BASE_URL,
  BMW_CARDATA_DAILY_REQUEST_LIMIT,
  BMW_CARDATA_OAUTH_BASE_URL,
  createBMWPKCE,
  exchangeBMWDeviceCode,
  refreshBMWAccessToken,
  startBMWDeviceAuthorization,
  type BMWDailyRequestBudget,
} from '../src/lib/integrations/bmw-cardata.ts'

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test('creates a valid PKCE S256 verifier and challenge', async () => {
  const first = await createBMWPKCE()
  const second = await createBMWPKCE()
  assert.match(first.codeVerifier, /^[A-Za-z0-9_-]{40,60}$/)
  assert.match(first.codeChallenge, /^[A-Za-z0-9_-]{40,60}$/)
  assert.notEqual(first.codeVerifier, first.codeChallenge)
  assert.notEqual(first.codeVerifier, second.codeVerifier)
})

test('starts the BMW device flow with explicit personal read-only scopes', async () => {
  let requestedUrl = ''
  let requestBody = ''
  const fakeFetch: typeof fetch = async (input, init) => {
    requestedUrl = String(input)
    requestBody = String(init?.body ?? '')
    return jsonResponse({
      device_code: 'device-test',
      user_code: 'ABCD-EFGH',
      verification_uri: 'https://customer.bmwgroup.com/verify',
      expires_in: 600,
      interval: 5,
    })
  }

  const result = await startBMWDeviceAuthorization('client-test', 'pkce-challenge', fakeFetch)
  const form = new URLSearchParams(requestBody)
  assert.equal(requestedUrl, `${BMW_CARDATA_OAUTH_BASE_URL}/device/code`)
  assert.equal(form.get('client_id'), 'client-test')
  assert.equal(form.get('response_type'), 'device_code')
  assert.equal(form.get('code_challenge'), 'pkce-challenge')
  assert.equal(form.get('code_challenge_method'), 'S256')
  assert.equal(form.get('scope'), 'openid authenticate_user cardata:api:read')
  assert.equal(result.device_code, 'device-test')
  assert.equal(result.interval, 5)
})

test('exchanges a device code and refreshes tokens without persisting them', async () => {
  const requests: Array<{ url: string; body: string }> = []
  const fakeFetch: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), body: String(init?.body ?? '') })
    return jsonResponse({
      access_token: 'access-test',
      refresh_token: 'refresh-test',
      id_token: 'id-test',
      token_type: 'Bearer',
      expires_in: 3600,
    })
  }

  const exchanged = await exchangeBMWDeviceCode('client-test', 'device-test', 'verifier-test', fakeFetch)
  const refreshed = await refreshBMWAccessToken('client-test', 'refresh-test', fakeFetch)
  assert.equal(exchanged.access_token, 'access-test')
  assert.equal(refreshed.refresh_token, 'refresh-test')
  assert.equal(requests.length, 2)
  assert.equal(new URLSearchParams(requests[0].body).get('grant_type'), 'urn:ietf:params:oauth:grant-type:device_code')
  assert.equal(new URLSearchParams(requests[0].body).get('code_verifier'), 'verifier-test')
  assert.equal(new URLSearchParams(requests[1].body).get('grant_type'), 'refresh_token')
  assert.equal(new URLSearchParams(requests[1].body).get('refresh_token'), 'refresh-test')
})

test('reads only official BMW CarData GET endpoints with a daily budget', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const budgetCalls: Array<{ ownerId: string; date: string; limit: number }> = []
  const budget: BMWDailyRequestBudget = {
    async consume(ownerId, utcDate, limit) {
      budgetCalls.push({ ownerId, date: utcDate, limit })
      return true
    },
  }
  const fakeFetch: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), init })
    return jsonResponse({ ok: true })
  }
  const client = new BMWCarDataClient(
    'owner-a',
    budget,
    fakeFetch,
    () => new Date('2026-11-13T12:00:00.000Z'),
  )

  await client.getVehicleMappings('access-token')
  await client.getBasicVehicleData('WBY71HH090CW09664', 'access-token')
  await client.getTelematicData('WBY71HH090CW09664', 'container-a', 'access-token')

  assert.equal(requests.length, 3)
  assert.equal(requests[0].url, `${BMW_CARDATA_API_BASE_URL}/customers/vehicles/mappings`)
  assert.equal(requests[1].url, `${BMW_CARDATA_API_BASE_URL}/customers/vehicles/WBY71HH090CW09664/basicData`)
  assert.equal(requests[2].url, `${BMW_CARDATA_API_BASE_URL}/customers/vehicles/WBY71HH090CW09664/telematicData?containerId=container-a`)
  for (const request of requests) {
    assert.equal(request.init?.method, 'GET')
    const headers = new Headers(request.init?.headers)
    assert.equal(headers.get('authorization'), 'Bearer access-token')
    assert.equal(headers.get('x-version'), 'v1')
  }
  assert.equal(budgetCalls.length, 3)
  assert.ok(budgetCalls.every((call) => call.ownerId === 'owner-a' && call.date === '2026-11-13'))
  assert.ok(budgetCalls.every((call) => call.limit === BMW_CARDATA_DAILY_REQUEST_LIMIT))
})

test('fails closed before network access when the 50-request daily budget is exhausted', async () => {
  let networkCalled = false
  const budget: BMWDailyRequestBudget = {
    async consume() { return false },
  }
  const fakeFetch: typeof fetch = async () => {
    networkCalled = true
    return jsonResponse({ ok: true })
  }
  const client = new BMWCarDataClient('owner-a', budget, fakeFetch)

  await assert.rejects(
    client.getVehicleMappings('access-token'),
    (error: unknown) => error instanceof BMWCarDataError && error.code === 'daily_limit' && error.status === 429,
  )
  assert.equal(networkCalled, false)
})

test('surfaces BMW OAuth and API errors without logging credentials', async () => {
  const fakeFetch: typeof fetch = async () => jsonResponse({
    error: 'invalid_token',
    error_description: 'Access token expired.',
  }, 401)
  const client = new BMWCarDataClient(
    'owner-a',
    { async consume() { return true } },
    fakeFetch,
  )
  await assert.rejects(
    client.getVehicleMappings('expired-token'),
    (error: unknown) => error instanceof BMWCarDataError && error.status === 401 && error.code === 'invalid_token',
  )
})

test('rejects missing owner, access token, VIN and container ID', async () => {
  const budget: BMWDailyRequestBudget = { async consume() { return true } }
  assert.throws(() => new BMWCarDataClient('', budget), /owner ID/)
  const client = new BMWCarDataClient('owner-a', budget)
  await assert.rejects(client.getVehicleMappings(''), /access token/)
  assert.throws(() => client.getBasicVehicleData('', 'token'), /VIN/)
  assert.throws(() => client.getTelematicData('VIN', '', 'token'), /VIN and CarData container/)
})
