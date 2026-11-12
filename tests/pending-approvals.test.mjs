import test from 'node:test'
import assert from 'node:assert/strict'
import { PendingApprovalRegistry } from '../bridge/pending-approvals.mjs'

const create = (registry, overrides = {}) => registry.create({
  sessionId: 'session-a', toolUseId: 'tool-1', toolName: 'mcp__mail__send_message',
  arguments: { to: 'person@example.com', body: 'Hello' },
  title: 'Send email', target: 'person@example.com', impact: 'Send one email',
  ...overrides,
})
const decisionFor = (request, overrides = {}) => ({
  version: 1, id: request.id, sessionId: request.sessionId,
  toolUseId: request.toolUseId, argumentsDigest: request.argumentsDigest,
  approve: true, ...overrides,
})

test('a matching approval settles exactly one invocation', async () => {
  const registry = new PendingApprovalRegistry()
  const pending = create(registry)
  assert.equal(registry.resolve(decisionFor(pending.request)), true)
  assert.equal(await pending.result, true)
  assert.equal(registry.resolve(decisionFor(pending.request)), false)
  assert.equal(registry.size, 0)
  registry.close()
})

test('wrong session, tool-use ID or argument digest cannot approve', async () => {
  const registry = new PendingApprovalRegistry()
  const pending = create(registry)
  assert.equal(registry.resolve(decisionFor(pending.request, { sessionId: 'session-b' })), false)
  assert.equal(registry.resolve(decisionFor(pending.request, { toolUseId: 'tool-2' })), false)
  assert.equal(registry.resolve(decisionFor(pending.request, { argumentsDigest: '0'.repeat(64) })), false)
  assert.equal(registry.size, 1)
  registry.resolve(decisionFor(pending.request, { approve: false }))
  assert.equal(await pending.result, false)
  registry.close()
})

test('reject, session cancellation and close all settle as denied', async () => {
  const registry = new PendingApprovalRegistry()
  const rejected = create(registry)
  registry.resolve(decisionFor(rejected.request, { approve: false }))
  assert.equal(await rejected.result, false)

  const sameSession = create(registry, { toolUseId: 'tool-2' })
  const otherSession = create(registry, { sessionId: 'session-b', toolUseId: 'tool-3' })
  registry.cancelSession('session-a')
  assert.equal(await sameSession.result, false)
  assert.equal(registry.size, 1)
  registry.close()
  assert.equal(await otherSession.result, false)
  assert.throws(() => create(registry), /closed/)
})

test('expiry denies and removes pending approval', async () => {
  const registry = new PendingApprovalRegistry({ ttlMs: 10 })
  const pending = create(registry)
  assert.equal(await pending.result, false)
  assert.equal(registry.size, 0)
  assert.equal(registry.resolve(decisionFor(pending.request)), false)
  registry.close()
})

test('invalid TTL and malformed requests fail closed', () => {
  assert.throws(() => new PendingApprovalRegistry({ ttlMs: 0 }), RangeError)
  const registry = new PendingApprovalRegistry()
  assert.throws(() => registry.create({ sessionId: '', toolUseId: 't', toolName: 'x', arguments: {} }), TypeError)
  registry.close()
})

test('duplicate invocation IDs, excessive pending requests and extra decision fields are rejected', async () => {
  const registry = new PendingApprovalRegistry({ ttlMs: 120_000 })
  const first = create(registry)
  assert.throws(() => create(registry), /already exists/)
  assert.equal(registry.resolve(decisionFor(first.request, { admin: true })), false)
  const pending = [first]
  for (let i = 1; i < 32; i++) pending.push(create(registry, { toolUseId: 'tool-' + (i + 1) }))
  assert.equal(registry.size, 32)
  assert.throws(() => create(registry, { toolUseId: 'tool-overflow' }), /Too many/)
  registry.close()
  for (const item of pending) assert.equal(await item.result, false)
})
