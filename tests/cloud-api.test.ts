import test from 'node:test'
import assert from 'node:assert/strict'
import { CloudApiError, createCloudApiClient, portugueseApiMessage } from '../src/lib/cloud-api.ts'

test('cloud client sends bearer auth and version without storing credentials', async () => {
  let captured: RequestInit | undefined
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'short-lived-token',
    fetchImpl: async (_input, init) => {
      captured = init
      return new Response(JSON.stringify({ version: 1, conversation: { id: 'c-1', title: 'Test', createdAt: '2026-11-09T00:00:00Z', updatedAt: '2026-11-09T00:00:00Z' } }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    },
  })
  const result = await client.createConversation()
  assert.equal(result.conversation.id, 'c-1')
  const headers = new Headers(captured?.headers)
  assert.equal(headers.get('Authorization'), 'Bearer short-lived-token')
  assert.equal(headers.get('apikey'), 'test-publishable-key')
  assert.equal(headers.get('X-Jarvis-Api-Version'), '1')
  assert.equal(captured?.credentials, 'omit')
  assert.equal(captured?.redirect, 'error')
})

test('cloud client fails closed when no access token is available', async () => {
  let called = false
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => null,
    fetchImpl: async () => { called = true; return new Response('{}') },
  })
  await assert.rejects(client.createConversation(), (error: unknown) =>
    error instanceof CloudApiError && error.code === 'unauthenticated')
  assert.equal(called, false)
})

test('cloud client rejects insecure non-local API origins', () => {
  assert.throws(() => createCloudApiClient({
    baseUrl: 'http://api.example.test',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'token',
  }), /HTTPS/)
})

test('cloud client preserves structured server errors', async () => {
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    publishableKey: 'test-publishable-key',
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
        'data: {"version":1,"type":"turn.started","conversationId":"c-1","turnId":"t-1"}\n\n',
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
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'token',
    fetchImpl: async () => { called = true; return new Response('{}') },
  })
  await assert.rejects(
    client.streamTurn({ conversationId: 'c-1', turnId: 't-1', text: '   ' }),
    (error: unknown) => error instanceof CloudApiError && error.code === 'invalid_request',
  )
  assert.equal(called, false)
})

test('cloud client opens an authenticated SSE stream and supports abort signals', async () => {
  let captured: RequestInit | undefined
  const stream = new ReadableStream<Uint8Array>()
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    publishableKey: 'test-publishable-key',
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
  assert.equal(headers.get('apikey'), 'test-publishable-key')
  assert.equal(headers.get('Accept'), 'text/event-stream')
  assert.equal(captured?.signal, controller.signal)
  assert.equal(captured?.credentials, 'omit')
})

test('cloud client rejects successful responses that are not SSE', async () => {
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    publishableKey: 'test-publishable-key',
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
    publishableKey: 'test-publishable-key',
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
    publishableKey: 'test-publishable-key',
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
  assert.equal(new Headers(captured?.headers).get('apikey'), 'test-publishable-key')
})

test('cloud client sends versioned cancellation only for valid turn IDs', async () => {
  let captured: { input: RequestInfo | URL; init?: RequestInit } | undefined
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test/functions/v1/jarvis-api',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'token',
    fetchImpl: async (input, init) => {
      captured = { input, init }
      return new Response(JSON.stringify({ version: 1, cancelled: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    },
  })
  const result = await client.cancelTurn({ conversationId: 'c-1', turnId: 't-1' })
  assert.equal(result.cancelled, true)
  assert.equal(String(captured?.input), 'https://api.example.test/functions/v1/jarvis-api/v1/turns/cancel')
  assert.equal(JSON.parse(String(captured?.init?.body)).version, 1)
})

test('cloud event parser accepts explicit turn cancellation events', () => {
  assert.deepEqual(parseCloudAssistantEvent({
    version: 1, type: 'turn.cancelled', conversationId: 'c-1', turnId: 't-1',
  }), {
    version: 1, type: 'turn.cancelled', conversationId: 'c-1', turnId: 't-1',
  })
})

import { createSupabaseAuth, type SecureTokenStore } from '../src/lib/cloud-auth.ts'

function memoryTokenStore(): SecureTokenStore & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    async get(key) { return values.get(key) ?? null },
    async set(key, value) { values.set(key, value) },
    async remove(key) { values.delete(key) },
  }
}

test('Supabase Auth stores only the refresh token through injected secure storage', async () => {
  const storage = memoryTokenStore()
  let requestUrl = ''
  let requestInit: RequestInit | undefined
  const auth = createSupabaseAuth({
    url: 'https://project.supabase.co',
    anonKey: 'public-anon-key',
    storage,
    now: () => 1_800_000_000_000,
    fetchImpl: async (input, init) => {
      requestUrl = String(input)
      requestInit = init
      return new Response(JSON.stringify({
        access_token: 'access-1', refresh_token: 'refresh-1',
        expires_in: 3600, user: { id: 'user-1', email: 'user@example.test' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })
  const result = await auth.signInWithPassword(' user@example.test ', 'password')
  assert.equal(result.user.id, 'user-1')
  assert.equal(requestUrl, 'https://project.supabase.co/auth/v1/token?grant_type=password')
  assert.equal(JSON.parse(String(requestInit?.body)).email, 'user@example.test')
  assert.equal(storage.values.size, 1)
  assert.equal(storage.values.get('jarvis.supabase.refresh-token'), 'refresh-1')
  assert.equal(await auth.getAccessToken(), 'access-1')
})

test('Supabase Auth refreshes expired access tokens and rotates the stored refresh token', async () => {
  const storage = memoryTokenStore()
  storage.values.set('jarvis.supabase.refresh-token', 'refresh-old')
  let calls = 0
  const auth = createSupabaseAuth({
    url: 'https://project.supabase.co',
    anonKey: 'public-anon-key',
    storage,
    now: () => 1_800_000_000_000,
    fetchImpl: async (_input, init) => {
      calls++
      assert.equal(JSON.parse(String(init?.body)).refresh_token, 'refresh-old')
      return new Response(JSON.stringify({
        access_token: 'access-new', refresh_token: 'refresh-new',
        expires_in: 3600, user: { id: 'user-1' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })
  assert.equal(await auth.getAccessToken(), 'access-new')
  assert.equal(calls, 1)
  assert.equal(storage.values.get('jarvis.supabase.refresh-token'), 'refresh-new')
})

test('Supabase Auth clears invalid refresh credentials and never falls back to browser storage', async () => {
  const storage = memoryTokenStore()
  storage.values.set('jarvis.supabase.refresh-token', 'expired-refresh')
  const auth = createSupabaseAuth({
    url: 'https://project.supabase.co',
    anonKey: 'public-anon-key',
    storage,
    fetchImpl: async () => new Response(JSON.stringify({ message: 'expired' }), { status: 401 }),
  })
  assert.equal(await auth.getAccessToken(), null)
  assert.equal(storage.values.has('jarvis.supabase.refresh-token'), false)
  assert.equal(storage.values.size, 0)
})

test('Supabase Auth rejects insecure project URLs', () => {
  const storage = memoryTokenStore()
  assert.throws(() => createSupabaseAuth({
    url: 'http://project.example.test',
    anonKey: 'key',
    storage,
  }), /HTTPS/)
})

test('cloud client loads conversation lists and user-scoped history', async () => {
  const requests: string[] = []
  const client = createCloudApiClient({
    baseUrl: 'https://project.supabase.co/functions/v1/jarvis-api',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'token',
    fetchImpl: async (input) => {
      requests.push(String(input))
      const payload = String(input).endsWith('/conversations')
        ? { version: 1, conversations: [] }
        : {
            version: 1,
            conversation: {
              id: 'c-1', title: 'Test', createdAt: '2026-11-09T00:00:00Z',
              updatedAt: '2026-11-09T00:00:00Z',
            },
            messages: [],
          }
      return new Response(JSON.stringify(payload), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    },
  })
  assert.deepEqual((await client.listConversations()).conversations, [])
  assert.equal((await client.getConversation('c-1')).conversation.id, 'c-1')
  assert.deepEqual(requests, [
    'https://project.supabase.co/functions/v1/jarvis-api/v1/conversations',
    'https://project.supabase.co/functions/v1/jarvis-api/v1/conversations/c-1',
  ])
  assert.throws(() => client.getConversation('  '), /Invalid conversation ID/)
})

test('cloud client exposes explicit user-scoped conversation deletion', async () => {
  let captured: { input: RequestInfo | URL; init?: RequestInit } | undefined
  const client = createCloudApiClient({
    baseUrl: 'https://project.supabase.co/functions/v1/jarvis-api',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'token',
    fetchImpl: async (input, init) => {
      captured = { input, init }
      return new Response(JSON.stringify({ version: 1, deleted: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    },
  })
  const result = await client.deleteConversation('c-1')
  assert.equal(result.deleted, true)
  assert.equal(captured?.init?.method, 'DELETE')
  assert.equal(String(captured?.input), 'https://project.supabase.co/functions/v1/jarvis-api/v1/conversations/c-1')
})


test('cloud memory API supports explicit save, list and user-requested deletion', async () => {
  const calls: { url: string; init?: RequestInit }[] = []
  const memory = {
    id: 'memory-1', category: 'preference', content: 'Prefers concise answers',
    createdAt: '2026-11-09T00:00:00Z', updatedAt: '2026-11-09T00:00:00Z', expiresAt: null,
  }
  const client = createCloudApiClient({
    baseUrl: 'https://project.supabase.co/functions/v1/jarvis-api',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'token',
    fetchImpl: async (input, init) => {
      const url = String(input)
      calls.push({ url, init })
      const payload = url.endsWith('/memories')
        ? init?.method === 'POST'
          ? { version: 1, memory }
          : { version: 1, memories: [memory] }
        : { version: 1, deleted: true }
      return new Response(JSON.stringify(payload), {
        status: init?.method === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  })
  assert.deepEqual((await client.listMemories()).memories, [memory])
  assert.equal((await client.createMemory({ category: 'preference', content: 'Prefers concise answers' })).memory.id, 'memory-1')
  assert.equal((await client.deleteMemory('memory-1')).deleted, true)
  assert.equal(calls[0].url.endsWith('/v1/memories'), true)
  assert.equal(JSON.parse(String(calls[1].init?.body)).content, 'Prefers concise answers')
  assert.equal(calls[2].url.endsWith('/v1/memories/memory-1'), true)
})

test('cloud memory client rejects empty or oversized content before network access', async () => {
  let called = false
  const client = createCloudApiClient({
    baseUrl: 'https://project.supabase.co/functions/v1/jarvis-api',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'token',
    fetchImpl: async () => { called = true; return new Response('{}') },
  })
  assert.throws(() => client.createMemory({ category: 'fact', content: '  ' }), /Invalid memory content/)
  assert.throws(() => client.createMemory({ category: 'fact', content: 'x'.repeat(2_001) }), /Invalid memory content/)
  assert.equal(called, false)
})


test('memory context preference is explicitly loaded and persisted', async () => {
  const requests: { url: string; init?: RequestInit }[] = []
  const client = createCloudApiClient({
    baseUrl: 'https://project.supabase.co/functions/v1/jarvis-api',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'token',
    fetchImpl: async (input, init) => {
      requests.push({ url: String(input), init })
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
      return new Response(JSON.stringify({
        version: 1,
        contextEnabled: typeof body.contextEnabled === 'boolean' ? body.contextEnabled : false,
        autoCaptureEnabled: typeof body.autoCaptureEnabled === 'boolean' ? body.autoCaptureEnabled : false,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    },
  })
  assert.equal((await client.getMemoryPreference()).contextEnabled, false)
  assert.equal((await client.setMemoryContextEnabled(true)).contextEnabled, true)
  assert.equal((await client.setMemoryPreferences({ autoCaptureEnabled: true })).autoCaptureEnabled, true)
  assert.equal(requests[0].url.endsWith('/v1/memory-preferences'), true)
  assert.equal(requests[1].init?.method, 'PUT')
  assert.equal(JSON.parse(String(requests[1].init?.body)).contextEnabled, true)
  assert.equal(JSON.parse(String(requests[2].init?.body)).autoCaptureEnabled, true)
})


test('provider status is requested through the authenticated cloud API', async () => {
  let requested = ''
  let auth = ''
  const client = createCloudApiClient({
    baseUrl: 'https://project.supabase.co/functions/v1/jarvis-api',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'private-access-token',
    fetchImpl: async (input, init) => {
      requested = String(input)
      auth = new Headers(init?.headers).get('Authorization') ?? ''
      return new Response(JSON.stringify({
        version: 1, configured: true,
        providers: [{ name: 'groq-free', model: 'openai/gpt-oss-120b' }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })
  const status = await client.getProviderStatus()
  assert.equal(status.configured, true)
  assert.equal(status.providers[0].model, 'openai/gpt-oss-120b')
  assert.equal(requested.endsWith('/v1/provider-status'), true)
  assert.equal(auth, 'Bearer private-access-token')
})


test('semantic memory review requests are authenticated and account-scoped by the API', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const candidateId = '10000000-0000-4000-8000-000000000001'
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'account-a-token',
    fetchImpl: async (input, init) => {
      requests.push({ url: String(input), init })
      const payload = requests.length === 1
        ? { version: 1, candidates: [{
            id: candidateId, fact_type: 'preference', content: 'Prefers concise answers', status: 'pending',
            source_conversation_id: null, source_message_ids: [], created_at: '2026-11-11T00:00:00Z',
          }] }
        : { version: 1, candidate: {
            id: candidateId, fact_type: 'preference', content: 'Prefers concise answers', status: 'approved',
            source_conversation_id: null, source_message_ids: [], created_at: '2026-11-11T00:00:00Z', approved_at: '2026-11-11T00:01:00Z',
          } }
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })
  const listed = await client.listSemanticMemoryCandidates()
  assert.equal(listed.candidates[0].status, 'pending')
  const decided = await client.decideSemanticMemoryCandidate(candidateId, 'approved')
  assert.equal(decided.candidate.status, 'approved')
  assert.equal(requests[0].url, 'https://api.example.test/v1/semantic-memory/candidates')
  assert.equal(requests[1].url, `https://api.example.test/v1/semantic-memory/candidates/${candidateId}`)
  assert.equal(requests[1].init?.method, 'PUT')
  assert.deepEqual(JSON.parse(String(requests[1].init?.body)), { version: 1, decision: 'approved' })
  for (const request of requests) {
    const headers = new Headers(request.init?.headers)
    assert.equal(headers.get('Authorization'), 'Bearer account-a-token')
    assert.equal(headers.get('apikey'), 'test-publishable-key')
    assert.equal(request.init?.credentials, 'omit')
  }
})

test('semantic memory review rejects malformed IDs and decisions before network access', async () => {
  let called = false
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'token',
    fetchImpl: async () => { called = true; return new Response('{}') },
  })
  assert.throws(() => client.decideSemanticMemoryCandidate('not-a-uuid', 'approved'), /Invalid memory candidate ID/)
  assert.throws(() => client.decideSemanticMemoryCandidate('10000000-0000-4000-8000-000000000001', 'pending' as 'approved'), /Invalid memory decision/)
  assert.equal(called, false)
})

test('speech client honours provider Retry-After on transcription throttling', async () => {
  const client = createCloudApiClient({
    baseUrl: 'https://api.example.test',
    publishableKey: 'test-publishable-key',
    getAccessToken: async () => 'token',
    fetchImpl: async () => new Response(JSON.stringify({
      version: 1,
      error: {
        code: 'rate_limited',
        message: 'Speech transcription quota is temporarily unavailable.',
        requestId: 'speech-429',
        retryable: true,
      },
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    }),
  })

  await assert.rejects(
    client.transcribeAudio(new Blob(['audio'], { type: 'audio/webm' })),
    (error: unknown) => error instanceof CloudApiError &&
      error.code === 'rate_limited' &&
      error.retryable &&
      error.retryAfterMs === 60_000,
  )
})


test('cloud API user-facing errors use Brazilian Portuguese', () => {
  assert.equal(portugueseApiMessage('x', 'rate_limited'), 'O JARVIS recebeu muitas solicitações em pouco tempo. Aguarde um instante e tente novamente.')
  assert.equal(portugueseApiMessage('x', 'quota_exhausted'), 'A cota gratuita diária de IA foi atingida. Ela é renovada à meia-noite UTC.')
  assert.equal(portugueseApiMessage('x', 'unauthenticated'), 'Sua sessão expirou. Entre novamente.')
  assert.equal(portugueseApiMessage('x', 'forbidden'), 'Você não tem permissão para esta operação.')
  assert.equal(portugueseApiMessage('x', 'invalid_request'), 'Não consegui processar esta mensagem. Verifique o conteúdo e tente novamente.')
})
