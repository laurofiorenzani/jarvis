import assert from 'node:assert/strict'

const baseUrl = process.env.JARVIS_TEST_SUPABASE_URL
const anonKey = process.env.JARVIS_TEST_ANON_KEY
const serviceKey = process.env.JARVIS_TEST_SERVICE_ROLE_KEY
if (!baseUrl || !anonKey || !serviceKey) {
  throw new Error('Local Supabase URL, anon key and service-role key are required.')
}

const api = `${baseUrl.replace(/\/$/, '')}/functions/v1/jarvis-api`
const rest = `${baseUrl.replace(/\/$/, '')}/rest/v1`
const suffix = crypto.randomUUID()
const users = []

async function request(url, { method = 'GET', token = anonKey, body, headers = {} } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = text }
  return { response, payload }
}

async function createUser(label) {
  const email = `jarvis-memory-${label}-${suffix}@example.invalid`
  const password = `Test-${crypto.randomUUID()}-Aa9!`
  const created = await request(`${baseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    token: serviceKey,
    body: { email, password, email_confirm: true },
  })
  assert.equal(created.response.status, 200, `create ${label} fixture user: ${JSON.stringify(created.payload)}`)
  const userId = created.payload?.id
  assert.ok(userId, 'Auth admin must return the fixture user ID')
  users.push(userId)

  const signedIn = await request(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    body: { email, password },
  })
  assert.equal(signedIn.response.status, 200, `sign in ${label}: ${JSON.stringify(signedIn.payload)}`)
  assert.ok(signedIn.payload?.access_token, 'Password sign-in must return an access token')
  return { id: userId, token: signedIn.payload.access_token }
}

async function setPreference(userId, enabled) {
  const result = await request(`${rest}/jarvis_memory_preferences?on_conflict=user_id`, {
    method: 'POST',
    token: serviceKey,
    body: { user_id: userId, context_enabled: enabled },
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  })
  assert.ok(result.response.ok, `set memory preference: ${JSON.stringify(result.payload)}`)
}

async function insertFact(userId, fields) {
  const result = await request(`${rest}/jarvis_memory_facts`, {
    method: 'POST',
    token: serviceKey,
    body: {
      user_id: userId,
      fact_type: 'fact',
      content: 'Family CFO integration retrieval fixture',
      sensitivity: 'normal',
      status: 'approved',
      approved_at: new Date().toISOString(),
      ...fields,
    },
    headers: { Prefer: 'return=representation' },
  })
  assert.ok(result.response.ok, `insert retrieval fixture: ${JSON.stringify(result.payload)}`)
}

async function cleanup() {
  for (const userId of users) {
    await request(`${baseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      token: serviceKey,
    }).catch(() => undefined)
  }
}

try {
  const unauthenticated = await fetch(`${api}/semantic-memory/candidates`)
  assert.equal(unauthenticated.status, 401, 'semantic-memory routes must require authentication')

  const userA = await createUser('a')
  const userB = await createUser('b')
  await setPreference(userA.id, true)
  await setPreference(userB.id, false)

  const disabledCreate = await request(`${api}/semantic-memory/candidates`, {
    method: 'POST',
    token: userB.token,
    body: { version: 1, factType: 'fact', content: 'Should not be saved while memory is disabled' },
  })
  assert.equal(disabledCreate.response.status, 403, 'disabled memory must block candidate creation')

  const createdA = await request(`${api}/semantic-memory/candidates`, {
    method: 'POST',
    token: userA.token,
    body: { version: 1, factType: 'fact', content: 'Family CFO integration retrieval fixture' },
  })
  assert.equal(createdA.response.status, 201, `user A candidate creation: ${JSON.stringify(createdA.payload)}`)
  const candidateId = createdA.payload?.candidate?.id
  assert.ok(candidateId, 'candidate creation must return its ID')
  assert.equal(createdA.payload.candidate.status, 'pending')

  const listA = await request(`${api}/semantic-memory/candidates`, { token: userA.token })
  assert.equal(listA.response.status, 200)
  assert.ok(listA.payload.candidates.some((item) => item.id === candidateId), 'user A must see their own pending candidate')

  const listB = await request(`${api}/semantic-memory/candidates`, { token: userB.token })
  assert.equal(listB.response.status, 200)
  assert.equal(listB.payload.candidates.length, 0, 'user B must not see user A candidates')

  const crossAccountDecision = await request(`${api}/semantic-memory/candidates/${candidateId}`, {
    method: 'PUT',
    token: userB.token,
    body: { decision: 'approved' },
  })
  assert.equal(crossAccountDecision.response.status, 404, 'user B must not approve user A candidate')

  const approved = await request(`${api}/semantic-memory/candidates/${candidateId}`, {
    method: 'PUT',
    token: userA.token,
    body: { decision: 'approved' },
  })
  assert.equal(approved.response.status, 200, `user A approval: ${JSON.stringify(approved.payload)}`)
  assert.equal(approved.payload.candidate.status, 'approved')

  await setPreference(userB.id, true)
  const createdB = await request(`${api}/semantic-memory/candidates`, {
    method: 'POST',
    token: userB.token,
    body: { version: 1, factType: 'fact', content: 'User B private semantic memory fixture' },
  })
  assert.equal(createdB.response.status, 201)
  const rejected = await request(`${api}/semantic-memory/candidates/${createdB.payload.candidate.id}`, {
    method: 'PUT',
    token: userB.token,
    body: { decision: 'rejected' },
  })
  assert.equal(rejected.response.status, 200)
  assert.equal(rejected.payload.candidate.status, 'rejected', 'user B can reject their own candidate')

  const query = encodeURIComponent('Family CFO integration')
  const searchA = await request(`${api}/semantic-memory/search?q=${query}`, { token: userA.token })
  assert.equal(searchA.response.status, 200, `user A semantic search: ${JSON.stringify(searchA.payload)}`)
  assert.ok(searchA.payload.results.some((item) => item.id === candidateId), 'approved normal fact must be retrievable')

  const now = Date.now()
  await insertFact(userA.id, { sensitivity: 'sensitive', valid_from: new Date(now - 60_000).toISOString() })
  await insertFact(userA.id, { valid_from: new Date(now + 60_000).toISOString() })
  await insertFact(userA.id, {
    valid_from: new Date(now - 120_000).toISOString(),
    valid_until: new Date(now - 60_000).toISOString(),
  })
  const filteredSearch = await request(`${api}/semantic-memory/search?q=${query}`, { token: userA.token })
  assert.equal(filteredSearch.response.status, 200)
  assert.deepEqual(
    filteredSearch.payload.results.map((item) => item.content),
    ['Family CFO integration retrieval fixture'],
    'retrieval must exclude sensitive, future-dated and expired facts',
  )

  const disabledSearch = await request(`${api}/semantic-memory/search?q=${query}`, { token: userB.token })
  assert.equal(disabledSearch.response.status, 200)
  assert.equal(disabledSearch.payload.contextEnabled, true, 'user B preference is enabled after explicit opt-in')
  assert.equal(disabledSearch.payload.results.length, 0, 'user B must not retrieve user A facts')

  console.log('Semantic-memory authenticated integration tests passed for two isolated users.')
} finally {
  await cleanup()
}
