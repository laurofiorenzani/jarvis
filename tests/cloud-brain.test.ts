import test from 'node:test'
import assert from 'node:assert/strict'
import { createCloudBrain } from '../src/lib/cloud-brain.ts'
import { CloudApiError } from '../src/lib/cloud-api.ts'
import type { AskHandlers } from '../src/lib/anthropic.ts'

const encoder = new TextEncoder()
const streamOf = (events: unknown[]) => new ReadableStream<Uint8Array>({
  start(controller) {
    for (const event of events) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
    }
    controller.close()
  },
})

const handlers = (onText: (delta: string) => void = () => {}, onTool: (name: string) => void = () => {}): AskHandlers => ({
  onText,
  onTool,
})

test('cloud brain creates one conversation and streams only events for its active turn', async () => {
  let creates = 0
  let requests = 0
  let submittedTurnId = ''
  const api = {
    health: async () => ({ status: 'ok' as const }),
    createConversation: async () => {
      creates++
      return { conversation: { id: 'conversation-1' } }
    },
    streamTurn: async ({ turnId }: { conversationId: string; turnId: string; text: string }) => {
      submittedTurnId = turnId
      requests++
      return streamOf([
        { version: 1, type: 'turn.started', conversationId: 'other', turnId },
        { version: 1, type: 'text.delta', conversationId: 'conversation-1', turnId: 'wrong-turn', delta: 'ignore' },
        { version: 1, type: 'text.delta', conversationId: 'conversation-1', turnId, delta: 'Olá ' },
        { version: 1, type: 'text.delta', conversationId: 'conversation-1', turnId, delta: 'senhor.' },
        { version: 1, type: 'turn.completed', conversationId: 'conversation-1', turnId,
          assistantMessage: { id: 'm-1', role: 'assistant', content: 'Olá senhor.', createdAt: '2026-11-09T00:00:00Z' } },
      ])
    },
    cancelTurn: async () => ({ cancelled: true }),
  }
  const brain = createCloudBrain(api)
  const spoken: string[] = []
  const first = await brain.ask('Oi', [], handlers((delta) => spoken.push(delta)))
  const second = await brain.ask('Tudo bem?', [], handlers())
  assert.equal(first.text, 'Olá senhor.')
  assert.deepEqual(spoken, ['Olá ', 'senhor.'])
  assert.equal(second.text, 'Olá senhor.')
  assert.equal(creates, 1)
  assert.equal(requests, 2)
  assert.match(submittedTurnId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.equal(brain.getConversationId(), 'conversation-1')
})

test('cloud brain rejects a turn that ends without a completion event', async () => {
  const brain = createCloudBrain({
    health: async () => ({ status: 'ok' }),
    createConversation: async () => ({ conversation: { id: 'c-1' } }),
    streamTurn: async ({ turnId }) => streamOf([
      { version: 1, type: 'text.delta', conversationId: 'c-1', turnId, delta: 'partial' },
    ]),
    cancelTurn: async () => ({ cancelled: false }),
  })
  await assert.rejects(
    brain.ask('Hello', [], handlers()),
    (error: unknown) => error instanceof CloudApiError && error.code === 'invalid_response',
  )
})

test('cloud brain surfaces structured server turn failures', async () => {
  const brain = createCloudBrain({
    health: async () => ({ status: 'ok' }),
    createConversation: async () => ({ conversation: { id: 'c-1' } }),
    streamTurn: async ({ turnId }) => streamOf([
      { version: 1, type: 'turn.failed', conversationId: 'c-1', turnId,
        code: 'service_unavailable', message: 'Provider unavailable', retryable: true },
    ]),
    cancelTurn: async () => ({ cancelled: false }),
  })
  await assert.rejects(
    brain.ask('Hello', [], handlers()),
    (error: unknown) => error instanceof CloudApiError &&
      error.message === 'Provider unavailable' && error.retryable,
  )
})

test('cloud brain prevents concurrent turns and allows an explicit conversation reset', async () => {
  let release!: (stream: ReadableStream<Uint8Array>) => void
  let markStarted!: () => void
  const started = new Promise<void>((resolve) => { markStarted = resolve })
  const pending = new Promise<ReadableStream<Uint8Array>>((resolve) => { release = resolve })
  const api = {
    health: async () => ({ status: 'ok' as const }),
    createConversation: async () => ({ conversation: { id: 'c-1' } }),
    streamTurn: async () => { markStarted(); return pending },
    cancelTurn: async () => ({ cancelled: true }),
  }
  const brain = createCloudBrain(api)
  const first = brain.ask('First', [], handlers())
  await started
  await assert.rejects(brain.ask('Second', [], handlers()), /already running/)
  release(streamOf([]))
  await assert.rejects(first, /before the turn completed/)
  brain.resetConversation()
  assert.equal(brain.getConversationId(), null)
})

test('cloud brain cancellation during conversation creation prevents model invocation', async () => {
  let release!: (value: { conversation: { id: string } }) => void
  const pending = new Promise<{ conversation: { id: string } }>((resolve) => { release = resolve })
  let modelCalled = false
  const brain = createCloudBrain({
    health: async () => ({ status: 'ok' }),
    createConversation: async () => pending,
    streamTurn: async () => { modelCalled = true; return streamOf([]) },
    cancelTurn: async () => ({ cancelled: true }),
  })
  const first = brain.ask('Cancel me', [], handlers())
  brain.cancel()
  release({ conversation: { id: 'c-1' } })
  const result = await first
  assert.equal(result.text, '')
  assert.equal(modelCalled, false)
})


test('cloud brain restores a selected conversation only after fetching its authenticated history', async () => {
  const requested: string[] = []
  const api = {
    health: async () => ({ status: 'ok' as const }),
    createConversation: async () => ({ conversation: { id: 'new-conversation' } }),
    getConversation: async (id: string) => {
      requested.push(id)
      return {
        conversation: { id },
        messages: [
          { id: 'u-1', role: 'user' as const, content: 'Earlier question', createdAt: '2026-11-10T07:00:00Z' },
          { id: 'a-1', role: 'assistant' as const, content: 'Earlier answer', createdAt: '2026-11-10T07:00:01Z' },
        ],
      }
    },
    streamTurn: async ({ conversationId, turnId }: { conversationId: string; turnId: string; text: string }) =>
      streamOf([
        { version: 1, type: 'text.delta', conversationId, turnId, delta: 'Continued.' },
        { version: 1, type: 'turn.completed', conversationId, turnId,
          assistantMessage: { id: 'a-2', role: 'assistant', content: 'Continued.', createdAt: '2026-11-10T07:01:00Z' } },
      ]),
    cancelTurn: async () => ({ cancelled: true }),
  }
  const brain = createCloudBrain(api)
  const restored = await brain.resumeConversation('conversation-existing')
  assert.equal(brain.getConversationId(), 'conversation-existing')
  assert.deepEqual(requested, ['conversation-existing'])
  assert.equal(restored.messages.length, 2)
  const next = await brain.ask('Continue from there', [], handlers())
  assert.equal(next.text, 'Continued.')
  assert.equal(brain.getConversationId(), 'conversation-existing')
})

test('cloud brain does not switch conversation when history retrieval fails', async () => {
  const brain = createCloudBrain({
    health: async () => ({ status: 'ok' }),
    createConversation: async () => ({ conversation: { id: 'new-conversation' } }),
    getConversation: async () => { throw new CloudApiError('Not found', 404, 'invalid_request') },
    streamTurn: async () => streamOf([]),
    cancelTurn: async () => ({ cancelled: false }),
  })
  await assert.rejects(brain.resumeConversation('missing'), /Not found/)
  assert.equal(brain.getConversationId(), null)
})


test('cloud brain blocks new turns while a conversation is being restored', async () => {
  let release!: (value: { conversation: { id: string }; messages: [] }) => void
  const pending = new Promise<{ conversation: { id: string }; messages: [] }>((resolve) => { release = resolve })
  const brain = createCloudBrain({
    health: async () => ({ status: 'ok' }),
    createConversation: async () => ({ conversation: { id: 'new-conversation' } }),
    getConversation: async () => pending,
    streamTurn: async () => streamOf([]),
    cancelTurn: async () => ({ cancelled: false }),
  })
  const restoring = brain.resumeConversation('existing')
  await assert.rejects(brain.ask('Do not race', [], handlers()), /already running/)
  release({ conversation: { id: 'existing' }, messages: [] })
  await restoring
  assert.equal(brain.getConversationId(), 'existing')
})


test('cloud brain treats an aborted SSE reader as a normal cancellation', async () => {
  let markStarted!: () => void
  const started = new Promise<void>((resolve) => { markStarted = resolve })
  let cancelCalls = 0
  const brain = createCloudBrain({
    health: async () => ({ status: 'ok' }),
    createConversation: async () => ({ conversation: { id: 'cancel-conversation' } }),
    streamTurn: async ({ turnId, conversationId }, signal) => new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          version: 1, type: 'text.delta', conversationId, turnId, delta: 'Partial answer',
        })}\n\n`))
        markStarted()
        signal?.addEventListener('abort', () => {
          controller.error(new DOMException('The operation was aborted.', 'AbortError'))
        }, { once: true })
      },
    }),
    cancelTurn: async () => { cancelCalls++; return { cancelled: true } },
  })

  let markTextReceived!: () => void
  const textReceived = new Promise<void>((resolve) => { markTextReceived = resolve })
  const pending = brain.ask('Stop this response', [], handlers(() => markTextReceived()))
  await started
  // Wait until the SSE parser has delivered the queued delta to the brain.
  // Enqueueing in the stream's start() callback alone does not mean the
  // asynchronous reader has consumed it yet.
  await textReceived
  brain.cancel()
  const result = await pending
  assert.equal(result.text, 'Partial answer')
  assert.equal(cancelCalls, 1)
})


test('cloud brain treats cancellation while waiting for stream headers as normal', async () => {
  let markStarted!: () => void
  const started = new Promise<void>((resolve) => { markStarted = resolve })
  let cancelCalls = 0
  const brain = createCloudBrain({
    health: async () => ({ status: 'ok' }),
    createConversation: async () => ({ conversation: { id: 'headers-cancel-conversation' } }),
    streamTurn: async (_input, signal) => new Promise<ReadableStream<Uint8Array>>((_resolve, reject) => {
      markStarted()
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted before headers', 'AbortError')), { once: true })
    }),
    cancelTurn: async () => { cancelCalls++; return { cancelled: true } },
  })

  const pending = brain.ask('Cancel before headers', [], handlers())
  await started
  brain.cancel()
  const result = await pending
  assert.equal(result.text, '')
  assert.equal(cancelCalls, 1)
})
