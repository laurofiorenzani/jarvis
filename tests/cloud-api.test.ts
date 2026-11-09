import test from 'node:test'
import assert from 'node:assert/strict'
import { CloudApiError, createCloudApiClient } from '../src/lib/cloud-api.ts'

test('cloud client sends bearer auth and version without storing credentials', async () => {
  let captured: RequestInit | undefined
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    getAccessToken: async () => 'short-lived-token',
    fetchImpl: async (_input, init) => {
      captured = init
      return new Response(JSON.stringify({ version: 1, status: 'ok' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    },
  })
  const result = await client.health()
  assert.equal(result.status, 'ok')
  const headers = new Headers(captured?.headers)
  assert.equal(headers.get('Authorization'), 'Bearer short-lived-token')
  assert.equal(headers.get('X-Jarvis-Api-Version'), '1')
  assert.equal(captured?.credentials, 'omit')
  assert.equal(captured?.redirect, 'error')
})

test('cloud client fails closed when no access token is available', async () => {
  let called = false
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    getAccessToken: async () => null,
    fetchImpl: async () => { called = true; return new Response('{}') },
  })
  await assert.rejects(client.health(), (error: unknown) =>
    error instanceof CloudApiError && error.code === 'unauthenticated')
  assert.equal(called, false)
})

test('cloud client rejects insecure non-local API origins', () => {
  assert.throws(() => createCloudApiClient({
    baseUrl: 'http://api.example.test',
    getAccessToken: async () => 'token',
  }), /HTTPS/)
})

test('cloud client preserves structured server errors', async () => {
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    getAccessToken: async () => 'token',
    fetchImpl: async () => new Response(JSON.stringify({
      version: 1,
      error: { code: 'rate_limited', message: 'Slow down', requestId: 'req-1', retryable: true },
    }), { status: 429 }),
  })
  await assert.rejects(client.health(), (error: unknown) =>
    error instanceof CloudApiError &&
    error.code === 'rate_limited' &&
    error.requestId === 'req-1' &&
    error.retryable)
})
