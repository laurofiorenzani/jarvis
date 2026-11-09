import test from 'node:test'
import assert from 'node:assert/strict'
import { CloudAuthError, createSupabaseAuth } from '../src/lib/cloud-auth.ts'

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function session(access: string, refresh: string, expiresIn = 3600) {
  return {
    access_token: access,
    refresh_token: refresh,
    expires_in: expiresIn,
    user: { id: 'user-1', email: 'user@example.test' },
  }
}

test('password sign-in stores only the refresh token and exposes short-lived access in memory', async () => {
  const values = new Map<string, string>()
  const auth = createSupabaseAuth({
    url: 'https://example.supabase.co',
    anonKey: 'sb_publishable_test',
    storage: {
      get: async (key) => values.get(key) ?? null,
      set: async (key, value) => { values.set(key, value) },
      remove: async (key) => { values.delete(key) },
    },
    fetchImpl: async (_input, init) => {
      assert.equal(init?.credentials, 'omit')
      return response(session('access-1', 'refresh-1'))
    },
  })

  const result = await auth.signInWithPassword(' user@example.test ', 'password')
  assert.equal(result.user.id, 'user-1')
  assert.deepEqual([...values.entries()], [['jarvis.supabase.refresh-token', 'refresh-1']])
  assert.equal(await auth.getAccessToken(), 'access-1')
})

test('expired session refreshes once and rotates the stored refresh token', async () => {
  const values = new Map([['jarvis.supabase.refresh-token', 'refresh-old']])
  let requests = 0
  const auth = createSupabaseAuth({
    url: 'https://example.supabase.co',
    anonKey: 'sb_publishable_test',
    storage: {
      get: async (key) => values.get(key) ?? null,
      set: async (key, value) => { values.set(key, value) },
      remove: async (key) => { values.delete(key) },
    },
    now: () => 1_800_000_000_000,
    fetchImpl: async (input) => {
      requests++
      assert.match(String(input), /grant_type=refresh_token/)
      return response(session('access-new', 'refresh-new'))
    },
  })

  const [first, second] = await Promise.all([auth.getAccessToken(), auth.getAccessToken()])
  assert.equal(first, 'access-new')
  assert.equal(second, 'access-new')
  assert.equal(requests, 1)
  assert.equal(values.get('jarvis.supabase.refresh-token'), 'refresh-new')
})

test('invalid refresh token clears local session but transient failures preserve it', async () => {
  const values = new Map([['jarvis.supabase.refresh-token', 'refresh-invalid']])
  const storage = {
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string) => { values.set(key, value) },
    remove: async (key: string) => { values.delete(key) },
  }
  const invalid = createSupabaseAuth({
    url: 'https://example.supabase.co',
    anonKey: 'sb_publishable_test',
    storage,
    fetchImpl: async () => response({ message: 'invalid token' }, 401),
  })
  assert.equal(await invalid.restoreSession(), null)
  assert.equal(values.has('jarvis.supabase.refresh-token'), false)

  values.set('jarvis.supabase.refresh-token', 'refresh-temporary')
  const unavailable = createSupabaseAuth({
    url: 'https://example.supabase.co',
    anonKey: 'sb_publishable_test',
    storage,
    fetchImpl: async () => response({ message: 'unavailable' }, 503),
  })
  await assert.rejects(unavailable.restoreSession(), (error: unknown) =>
    error instanceof CloudAuthError && error.status === 503)
  assert.equal(values.get('jarvis.supabase.refresh-token'), 'refresh-temporary')
})

test('sign-out clears local refresh token even when remote logout is unavailable', async () => {
  const values = new Map([['jarvis.supabase.refresh-token', 'refresh-1']])
  const auth = createSupabaseAuth({
    url: 'https://example.supabase.co',
    anonKey: 'sb_publishable_test',
    storage: {
      get: async (key) => values.get(key) ?? null,
      set: async (key, value) => { values.set(key, value) },
      remove: async (key) => { values.delete(key) },
    },
    fetchImpl: async () => { throw new Error('offline') },
  })
  await auth.signOut()
  assert.equal(values.has('jarvis.supabase.refresh-token'), false)
  assert.equal(await auth.getAccessToken(), null)
})

test('auth rejects insecure origins and missing credentials before network access', async () => {
  const storage = { get: async () => null, set: async () => {}, remove: async () => {} }
  assert.throws(() => createSupabaseAuth({
    url: 'http://example.supabase.co',
    anonKey: 'key',
    storage,
  }), /HTTPS/)

  const auth = createSupabaseAuth({
    url: 'https://example.supabase.co',
    anonKey: 'key',
    storage,
  })
  await assert.rejects(auth.signInWithPassword(' ', 'password'), /Email and password/)
})


test('auth rejects malformed token expiry and identity payloads', async () => {
  const storage = { get: async () => null, set: async () => {}, remove: async () => {} }
  for (const malformed of [
    { ...session('access', 'refresh'), expires_in: Number.NaN },
    { ...session('access', 'refresh'), expires_in: -1 },
    { ...session('access', 'refresh'), expires_in: 32 * 24 * 60 * 60 },
    { ...session('access', 'refresh'), expires_at: Number.POSITIVE_INFINITY },
    { ...session('access', 'refresh'), user: { id: ' ' } },
  ]) {
    const auth = createSupabaseAuth({
      url: 'https://example.supabase.co',
      anonKey: 'sb_publishable_test',
      storage,
      fetchImpl: async () => response(malformed),
    })
    await assert.rejects(auth.signInWithPassword('user@example.test', 'password'),
      (error: unknown) => error instanceof CloudAuthError && error.status === 502)
  }
})
