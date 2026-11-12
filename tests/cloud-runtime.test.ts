import test from 'node:test'
import assert from 'node:assert/strict'
import { createCloudRuntime } from '../src/lib/cloud-runtime.ts'

test('cloud runtime wires auth tokens into the API and brain without choosing storage', async () => {
  const values = new Map<string, string>()
  const calls: Array<{ url: string; authorization?: string }> = []
  const tokenStore = {
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string) => { values.set(key, value) },
    remove: async (key: string) => { values.delete(key) },
  }
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const headers = new Headers(init?.headers)
    calls.push({ url, authorization: headers.get('Authorization') ?? undefined })

    if (url.includes('/auth/v1/token?grant_type=password')) {
      return new Response(JSON.stringify({
        access_token: 'short-lived-access',
        refresh_token: 'rotating-refresh',
        expires_in: 3600,
        user: { id: 'user-1', email: 'test@example.com' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (url.endsWith('/v1/conversations')) {
      return new Response(JSON.stringify({
        version: 1,
        conversation: { id: 'conversation-1' },
      }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }

    throw new Error(`Unexpected request: ${url}`)
  }

  const runtime = createCloudRuntime({
    supabaseUrl: 'https://example.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
    tokenStore,
    fetchImpl,
  })

  await runtime.auth.signInWithPassword('test@example.com', 'password')
  const result = await runtime.api.createConversation()

  assert.equal(result.conversation.id, 'conversation-1')
  assert.equal(values.get('jarvis.supabase.refresh-token'), 'rotating-refresh')
  assert.equal(calls[1]?.authorization, 'Bearer short-lived-access')
  assert.equal(calls[1]?.url, 'https://example.supabase.co/functions/v1/jarvis-api/v1/conversations')
  assert.equal(typeof runtime.brain.ask, 'function')
  assert.equal(typeof runtime.brain.cancel, 'function')
})

test('cloud runtime rejects missing configuration and never silently supplies storage', () => {
  const tokenStore = {
    get: async () => null,
    set: async () => {},
    remove: async () => {},
  }

  assert.throws(() => createCloudRuntime({
    supabaseUrl: 'https://example.supabase.co',
    supabasePublishableKey: ' ',
    tokenStore,
  }), /publishable key is required/)
})
