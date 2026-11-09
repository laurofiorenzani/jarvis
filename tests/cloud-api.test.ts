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

import { parseCloudAssistantEvent } from '../src/lib/backend-contract.ts'

test('cloud event parser accepts a valid text delta and rejects malformed frames', () => {
  const valid = {
    version: 1,
    type: 'text.delta',
    conversationId: 'conversation-1',
    turnId: 'turn-1',
    delta: 'Hello',
  }
  assert.deepEqual(parseCloudAssistantEvent(valid), valid)
  assert.equal(parseCloudAssistantEvent({ ...valid, version: 2 }), null)
  assert.equal(parseCloudAssistantEvent({ ...valid, turnId: '' }), null)
  assert.equal(parseCloudAssistantEvent({ ...valid, type: 'unknown.event' }), null)
})

test('cloud event parser validates tool outcomes and memory approval challenges', () => {
  const base = { version: 1, conversationId: 'c-1', turnId: 't-1' }
  assert.equal(parseCloudAssistantEvent({
    ...base, type: 'tool.finished', tool: 'web_search', outcome: 'maybe',
  }), null)
  assert.equal(parseCloudAssistantEvent({
    ...base, type: 'memory.confirmation_required',
    challengeId: 'challenge-1', operation: 'write', expiresAt: 'soon',
  }), null)
  assert.equal(parseCloudAssistantEvent({
    ...base, type: 'memory.confirmation_required',
    challengeId: 'challenge-1', operation: 'save', expiresAt: '2030-01-01T00:00:00Z',
  })?.type, 'memory.confirmation_required')
})

import { readCloudAssistantEvents } from '../src/lib/cloud-event-stream.ts'

test('cloud event stream handles chunk boundaries and ignores invalid frames', async () => {
  const source = [
    'data: {"version":1,"type":"turn.started","conversationId":"c-1","turnId":"t-1"}\n\n',
    'data: not-json\n\n',
    'data: {"version":1,"type":"text.delta","conversationId":"c-1","turnId":"t-1","delta":"Olá"}\n\n',
  ].join('')
  const bytes = new TextEncoder().encode(source)
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, 41))
      controller.enqueue(bytes.slice(41, 97))
      controller.enqueue(bytes.slice(97))
      controller.close()
    },
  })
  const events = []
  for await (const event of readCloudAssistantEvents(body)) events.push(event)
  assert.equal(events.length, 2)
  assert.equal(events[0].type, 'turn.started')
  assert.equal(events[1].type, 'text.delta')
  if (events[1].type === 'text.delta') assert.equal(events[1].delta, 'Olá')
})

test('cloud event stream cancels its reader when the consumer stops early', async () => {
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(
        'data: {"version":1,"type":"turn.started","conversationId":"c-1","turnId":"t-1"}\\n\\n',
      ))
    },
    cancel() { cancelled = true },
  })
  for await (const event of readCloudAssistantEvents(body)) {
    assert.equal(event.type, 'turn.started')
    break
  }
  assert.equal(cancelled, true)
})

test('cloud event stream rejects an oversized unterminated frame', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(1_000_001).fill(65))
      controller.close()
    },
  })
  await assert.rejects(async () => {
    for await (const _event of readCloudAssistantEvents(body)) { /* consume */ }
  }, /size limit/)
})

test('cloud client validates turn inputs before making network requests', async () => {
  let called = false
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    getAccessToken: async () => 'token',
    fetchImpl: async () => { called = true; return new Response('{}') },
  })
  await assert.rejects(
    client.sendTurn({ conversationId: 'c-1', turnId: 't-1', text: '   ' }),
    (error: unknown) => error instanceof CloudApiError && error.code === 'invalid_request',
  )
  assert.equal(called, false)
})

test('cloud client opens an authenticated SSE stream and supports abort signals', async () => {
  let captured: RequestInit | undefined
  const stream = new ReadableStream<Uint8Array>()
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    getAccessToken: async () => 'stream-token',
    fetchImpl: async (_input, init) => {
      captured = init
      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      })
    },
  })
  const controller = new AbortController()
  const body = await client.streamTurn({
    conversationId: 'c-1', turnId: 't-1', text: 'Hello',
  }, controller.signal)
  assert.equal(body, stream)
  const headers = new Headers(captured?.headers)
  assert.equal(headers.get('Authorization'), 'Bearer stream-token')
  assert.equal(headers.get('Accept'), 'text/event-stream')
  assert.equal(captured?.signal, controller.signal)
  assert.equal(captured?.credentials, 'omit')
})

test('cloud client rejects successful responses that are not SSE', async () => {
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    getAccessToken: async () => 'token',
    fetchImpl: async () => new Response('{}', {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }),
  })
  await assert.rejects(
    client.streamTurn({ conversationId: 'c-1', turnId: 't-1', text: 'Hello' }),
    (error: unknown) => error instanceof CloudApiError && error.code === 'invalid_response',
  )
})

test('cloud client rejects unversioned successful JSON responses', async () => {
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    getAccessToken: async () => 'token',
    fetchImpl: async () => new Response(JSON.stringify({ status: 'ok' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }),
  })
  await assert.rejects(
    client.health(),
    (error: unknown) => error instanceof CloudApiError && error.code === 'invalid_response',
  )
})

test('cloud health check is public and does not request an access token', async () => {
  let tokenRequested = false
  let captured: RequestInit | undefined
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    getAccessToken: async () => { tokenRequested = true; return null },
    fetchImpl: async (_input, init) => {
      captured = init
      return new Response(JSON.stringify({ version: 1, status: 'ok' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    },
  })
  const result = await client.health()
  assert.equal(result.status, 'ok')
  assert.equal(tokenRequested, false)
  assert.equal(new Headers(captured?.headers).has('Authorization'), false)
})
