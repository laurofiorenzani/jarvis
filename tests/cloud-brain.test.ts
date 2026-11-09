import test from 'node:test'
import assert from 'node:assert/strict'
import { createCloudBrain } from '../src/lib/cloud-brain.ts'
import { CloudApiError } from '../src/lib/cloud-api.ts'
import type { AskHandlers } from '../src/lib/anthropic.ts'

const encoder = new TextEncoder()
const streamOf = (events: unknown[]) => new ReadableStream<Uint8Array>({
  start(controller) {
    for (const event of events) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\\n\\n`))
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
  const api = {
    health: async () => ({ status: 'ok' as const }),
    createConversation: async () => {
      creates++
      return { conversation: { id: 'conversation-1' } }
    },
    streamTurn: async ({ turnId }: { conversationId: string; turnId: string; text: string }) => {
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
  const pending = new Promise<ReadableStream<Uint8Array>>((resolve) => { release = resolve })
  const api = {
    health: async () => ({ status: 'ok' as const }),
    createConversation: async () => ({ conversation: { id: 'c-1' } }),
    streamTurn: async () => pending,
    cancelTurn: async () => ({ cancelled: true }),
  }
  const brain = createCloudBrain(api)
  const first = brain.ask('First', [], handlers())
  await Promise.resolve()
  await assert.rejects(brain.ask('Second', [], handlers()), /already running/)
  brain.resetConversation // reset is deliberately blocked while active
  release(streamOf([]))
  await assert.rejects(first, /before the turn completed/)
  brain.resetConversation()
  assert.equal(brain.getConversationId(), null)
})
