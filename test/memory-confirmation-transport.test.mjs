import test from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryConfirmationTransport } from '../bridge/memory-confirmation-transport.mjs'
import { createMemoryPayloadDigest } from '../bridge/memory-approval-digest.mjs'

const challenge = (overrides = {}) => ({
  id: 'challenge-1',
  operation: 'save',
  memoryId: null,
  payloadDigest: 'a'.repeat(64),
  turnId: 'turn-1',
  expiresAt: Date.now() + 5000,
  ...overrides,
})

test('sends a dedicated confirmation frame and resolves only its correlated reply', async () => {
  const sent = []
  const transport = createMemoryConfirmationTransport({ send: (frame) => sent.push(frame) })
  const pending = transport.requestConfirmation(challenge())
  assert.equal(sent.length, 1)
  assert.equal(sent[0].type, 'memory_confirmation')
  assert.equal(transport.receive({ type: 'reply', id: 'other', approved: true }), false)
  assert.equal(transport.pendingCount(), 1)

  const reply = {
    type: 'reply',
    id: 'challenge-1',
    approved: true,
    operation: 'save',
    memoryId: null,
    payloadDigest: 'a'.repeat(64),
    turnId: 'turn-1',
  }
  assert.equal(transport.receive(reply), true)
  assert.deepEqual(await pending, {
    id: reply.id,
    approved: reply.approved,
    operation: reply.operation,
    memoryId: reply.memoryId,
    payloadDigest: reply.payloadDigest,
    turnId: reply.turnId,
  })
  assert.equal(transport.pendingCount(), 0)
})

test('denial is returned as a denial and consumes the pending request', async () => {
  const transport = createMemoryConfirmationTransport({ send: () => {} })
  const pending = transport.requestConfirmation(challenge())
  assert.equal(transport.receive({
    type: 'reply',
    id: 'challenge-1',
    approved: false,
    operation: 'save',
    memoryId: null,
    payloadDigest: 'a'.repeat(64),
    turnId: 'turn-1',
  }), true)
  const reply = await pending
  assert.equal(reply.approved, false)
  assert.equal(transport.pendingCount(), 0)
})

test('cancellation notifies the UI and resolves every pending request as null', async () => {
  const sent = []
  const transport = createMemoryConfirmationTransport({ send: (frame) => sent.push(frame) })
  const first = transport.requestConfirmation(challenge())
  const second = transport.requestConfirmation(challenge({ id: 'challenge-2' }))
  transport.cancelAll()
  assert.equal(await first, null)
  assert.equal(await second, null)
  assert.equal(transport.pendingCount(), 0)
  assert.deepEqual(
    sent.filter((frame) => frame.type === 'memory_confirmation_cancelled').map((frame) => frame.id),
    ['challenge-1', 'challenge-2'],
  )
  assert.equal(transport.receive({ type: 'reply', id: 'challenge-1', approved: true }), false)
})

test('expired challenge is not sent to the UI', async () => {
  let sends = 0
  const transport = createMemoryConfirmationTransport({ send: () => sends++, now: () => 1000 })
  assert.equal(await transport.requestConfirmation(challenge({ expiresAt: 1000 })), null)
  assert.equal(sends, 0)
})

test('send failure rejects and cleans up the pending request', async () => {
  const transport = createMemoryConfirmationTransport({ send: () => { throw new Error('socket closed') } })
  await assert.rejects(transport.requestConfirmation(challenge()), /socket closed/)
  assert.equal(transport.pendingCount(), 0)
})

test('rejects malformed challenges before sending', () => {
  const transport = createMemoryConfirmationTransport({ send: () => assert.fail('must not send') })
  assert.throws(() => transport.requestConfirmation(challenge({ payloadDigest: 'not-a-digest' })), /SHA-256/)
  assert.throws(() => transport.requestConfirmation(challenge({ operation: 'delete', memoryId: null })), /memoryId/)
})


test('ignores a reply with mismatched metadata without consuming the challenge', async () => {
  const transport = createMemoryConfirmationTransport({ send: () => {} })
  const pending = transport.requestConfirmation(challenge())
  assert.equal(transport.receive({
    type: 'reply',
    id: 'challenge-1',
    approved: true,
    operation: 'delete',
    memoryId: null,
    payloadDigest: 'a'.repeat(64),
    turnId: 'turn-1',
  }), false)
  assert.equal(transport.pendingCount(), 1)
  assert.equal(transport.receive({
    type: 'reply',
    id: 'challenge-1',
    approved: true,
    operation: 'save',
    memoryId: null,
    payloadDigest: 'a'.repeat(64),
    turnId: 'turn-1',
  }), true)
  assert.equal((await pending).approved, true)
})

test('checks challenge expiry when a reply arrives even if the timer has not fired', async () => {
  let clock = 1000
  const transport = createMemoryConfirmationTransport({ send: () => {}, now: () => clock })
  const pending = transport.requestConfirmation(challenge({ expiresAt: 1100 }))
  clock = 1100
  assert.equal(transport.receive({
    type: 'reply',
    id: 'challenge-1',
    approved: true,
    operation: 'save',
    memoryId: null,
    payloadDigest: 'a'.repeat(64),
    turnId: 'turn-1',
  }), true)
  assert.equal(await pending, null)
  assert.equal(transport.pendingCount(), 0)
})


test('binds the request to an immutable snapshot of the original challenge', async () => {
  const sent = []
  const transport = createMemoryConfirmationTransport({ send: (frame) => sent.push(frame) })
  const original = challenge()
  const pending = transport.requestConfirmation(original)
  original.operation = 'delete'
  original.payloadDigest = 'b'.repeat(64)
  original.turnId = 'other-turn'
  assert.equal(sent[0].operation, 'save')
  assert.equal(sent[0].payloadDigest, 'a'.repeat(64))
  assert.equal(transport.receive({
    type: 'reply',
    id: 'challenge-1',
    approved: true,
    operation: 'save',
    memoryId: null,
    payloadDigest: 'a'.repeat(64),
    turnId: 'turn-1',
  }), true)
  assert.equal((await pending).approved, true)
})


test('requires a confirmation preview to match its canonical payload digest', () => {
  const transport = createMemoryConfirmationTransport({ send: () => assert.fail('must not send') })
  const payloadPreview = { content: 'Visible approved text', source: 'test' }
  const payloadDigest = createMemoryPayloadDigest(payloadPreview)
  assert.throws(() => transport.requestConfirmation(challenge({
    payloadDigest,
    payloadPreview: { content: 'Different text', source: 'test' },
  })), /does not match/)
})
