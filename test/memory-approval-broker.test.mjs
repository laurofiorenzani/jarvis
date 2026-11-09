import test from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryApprovalBroker } from '../bridge/memory-approval-broker.mjs'
import { createMemoryConfirmationTransport } from '../bridge/memory-confirmation-transport.mjs'

const details = {
  operation: 'update',
  memoryId: 'mem-42',
  payload: { title: 'Memory item', content: 'Exact approved content' },
  turnId: 'turn-9',
}

test('approves only an exact, correlated, one-shot UI response', async () => {
  let challenge
  const broker = createMemoryApprovalBroker({
    createId: () => 'challenge-1',
    requestConfirmation: async (request) => {
      challenge = request
      return { ...request, approved: true }
    },
  })
  assert.equal(await broker.authorize(details), true)
  assert.equal(challenge.operation, 'update')
  assert.equal(broker.pendingCount(), 0)
})

test('denies a user rejection', async () => {
  const broker = createMemoryApprovalBroker({
    createId: () => 'challenge-2',
    requestConfirmation: async (request) => ({ ...request, approved: false }),
  })
  assert.equal(await broker.authorize(details), false)
})

test('denies mismatched challenge, operation, target, payload or turn', async (t) => {
  for (const [name, change] of [
    ['challenge', { id: 'other' }],
    ['operation', { operation: 'delete' }],
    ['target', { memoryId: 'mem-other' }],
    ['payload', { payloadDigest: 'sha256:changed' }],
    ['turn', { turnId: 'turn-old' }],
  ]) {
    await t.test(name, async () => {
      const broker = createMemoryApprovalBroker({
        createId: () => 'challenge-3',
        requestConfirmation: async (request) => ({
          ...request, ...change, approved: true,
        }),
      })
      assert.equal(await broker.authorize(details), false)
    })
  }
})

test('denies an expired approval', async () => {
  let clock = 100
  const broker = createMemoryApprovalBroker({
    now: () => clock,
    createId: () => 'challenge-4',
    ttlMs: 30,
    requestConfirmation: async (request) => {
      clock = 130
      return { ...request, approved: true }
    },
  })
  assert.equal(await broker.authorize(details), false)
})

test('denies missing, malformed and failed UI responses', async (t) => {
  for (const response of [null, {}, { approved: true }]) {
    await t.test(String(response), async () => {
      const broker = createMemoryApprovalBroker({
        createId: () => 'challenge-5',
        requestConfirmation: async () => response,
      })
      assert.equal(await broker.authorize(details), false)
    })
  }
  const broker = createMemoryApprovalBroker({
    createId: () => 'challenge-6',
    requestConfirmation: async () => { throw new Error('socket closed') },
  })
  await assert.rejects(broker.authorize(details), /socket closed/)
  assert.equal(broker.pendingCount(), 0)
})

test('allows a new request after a prior challenge has been consumed', async () => {
  const broker = createMemoryApprovalBroker({
    createId: () => 'same-id',
    requestConfirmation: async (request) => ({ ...request, approved: true }),
  })
  assert.equal(await broker.authorize(details), true)
  assert.equal(await broker.authorize(details), true)
})

test('validates operation and required binding fields', async () => {
  const broker = createMemoryApprovalBroker({
    requestConfirmation: async () => ({ approved: true }),
  })
  await assert.rejects(broker.authorize({ ...details, operation: 'read' }), /unsupported/)
  await assert.rejects(broker.authorize({ ...details, payload: undefined }), /JSON values/)
})


test('rejects a duplicate challenge id while the first request is pending', async () => {
  let release
  const broker = createMemoryApprovalBroker({
    createId: () => 'concurrent-id',
    requestConfirmation: (request) => new Promise((resolve) => {
      release = () => resolve({ ...request, approved: true })
    }),
  })
  const first = broker.authorize(details)
  await new Promise((resolve) => setImmediate(resolve))
  await assert.rejects(broker.authorize(details), /duplicate approval challenge/)
  release()
  assert.equal(await first, true)
})

test('cancelAll invalidates an outstanding approval response', async () => {
  let release
  const broker = createMemoryApprovalBroker({
    createId: () => 'cancel-me',
    requestConfirmation: (request) => new Promise((resolve) => {
      release = () => resolve({ ...request, approved: true })
    }),
  })
  const pending = broker.authorize(details)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(broker.pendingCount(), 1)
  broker.cancelAll()
  release()
  assert.equal(await pending, false)
  assert.equal(broker.pendingCount(), 0)
})


test('integrates broker and UI transport for an exact approval round trip', async () => {
  let uiFrame
  let transport
  transport = createMemoryConfirmationTransport({
    send: (frame) => { uiFrame = frame },
    timeoutMs: 1000,
  })
  const broker = createMemoryApprovalBroker({
    createId: () => 'integrated-challenge',
    requestConfirmation: (challenge) => transport.requestConfirmation(challenge),
  })
  const pending = broker.authorize(details)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(uiFrame.type, 'memory_confirmation')
  assert.equal(uiFrame.id, 'integrated-challenge')
  assert.equal(transport.receive({
    type: 'reply',
    id: uiFrame.id,
    operation: uiFrame.operation,
    memoryId: uiFrame.memoryId,
    payloadDigest: uiFrame.payloadDigest,
    turnId: uiFrame.turnId,
    approved: true,
  }), true)
  assert.equal(await pending, true)
  assert.equal(broker.pendingCount(), 0)
  assert.equal(transport.pendingCount(), 0)
})

test('integrated transport ignores a spoofed digest and accepts the exact UI approval', async () => {
  let uiFrame
  const transport = createMemoryConfirmationTransport({
    send: (frame) => { uiFrame = frame },
    timeoutMs: 1000,
  })
  const broker = createMemoryApprovalBroker({
    createId: () => 'mismatch-challenge',
    requestConfirmation: (challenge) => transport.requestConfirmation(challenge),
  })
  const pending = broker.authorize(details)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(transport.receive({
    type: 'reply',
    id: uiFrame.id,
    operation: uiFrame.operation,
    memoryId: uiFrame.memoryId,
    payloadDigest: 'sha256:' + '0'.repeat(64),
    turnId: uiFrame.turnId,
    approved: true,
  }), false)
  assert.equal(transport.pendingCount(), 1)
  assert.equal(transport.receive({
    type: 'reply',
    id: uiFrame.id,
    operation: uiFrame.operation,
    memoryId: uiFrame.memoryId,
    payloadDigest: uiFrame.payloadDigest,
    turnId: uiFrame.turnId,
    approved: true,
  }), true)
  assert.equal(await pending, true)
  assert.equal(broker.pendingCount(), 0)
  assert.equal(transport.pendingCount(), 0)
})
