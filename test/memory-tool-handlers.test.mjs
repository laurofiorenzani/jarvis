import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MemoryStore } from '../bridge/memory.mjs'
import { createMemoryToolHandlers } from '../bridge/memory-tool-handlers.mjs'

const KEY = Buffer.from('0123456789abcdef0123456789abcdef')

async function setup(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-memory-tools-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const store = new MemoryStore({ filePath: join(directory, 'memory.json'), encryptionKey: KEY })
  await store.init()
  const auditEvents = []
  const authorizationRequests = []
  const handlers = createMemoryToolHandlers({
    store,
    authorize: async (request) => {
      authorizationRequests.push(structuredClone(request))
      return options.authorize ? options.authorize(request) : true
    },
    audit: options.audit ?? (async (event) => auditEvents.push(event)),
    clock: () => new Date('2026-11-08T22:00:00.000Z'),
  })
  return { store, handlers, auditEvents, authorizationRequests }
}

test('requires trusted authorization and audit dependencies', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-memory-tools-config-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const store = new MemoryStore({ filePath: join(directory, 'memory.json'), encryptionKey: KEY })
  await store.init()
  assert.throws(() => createMemoryToolHandlers({ store, audit: async () => {} }), /authorization callback/)
  assert.throws(() => createMemoryToolHandlers({ store, authorize: async () => true }), /audit callback/)
})

test('search is read-only and never exposes sensitive records', async (t) => {
  const { store, handlers } = await setup(t)
  await store.saveMemory({ content: 'Ordinary project note', source: 'test' })
  await store.saveMemory({ content: 'Sensitive project note', source: 'test', sensitivity: 'sensitive' })
  const result = await handlers.memory_search({ query: 'project note' })
  assert.equal(result.length, 1)
  assert.equal(result[0].content, 'Ordinary project note')
  assert.equal(Object.hasOwn(result[0], 'encryptionKey'), false)
})

test('rejects model-supplied sensitive flags and unknown search fields', async (t) => {
  const { handlers } = await setup(t)
  await assert.rejects(handlers.memory_search({ query: 'anything', includeSensitive: true }), /Unsupported search field/)
})

test('save requires explicit authorization and audits metadata without content', async (t) => {
  const denied = await setup(t, { authorize: async () => false })
  await assert.rejects(
    denied.handlers.memory_save({ content: 'private synthetic content', source: 'test' }),
    /not explicitly authorized/,
  )
  assert.equal((await denied.store.listMemories()).length, 0)

  const allowed = await setup(t)
  const saveInput = { content: 'private synthetic content', source: 'test' }
  const saved = await allowed.handlers.memory_save(saveInput)
  assert.deepEqual(allowed.authorizationRequests[0], { operation: 'save', memoryId: null, payload: saveInput })
  assert.equal(saved.content, 'private synthetic content')
  assert.deepEqual(allowed.auditEvents, [{ operation: 'save', memoryId: null, outcome: 'authorized', timestamp: '2026-11-08T22:00:00.000Z' }])
  assert.doesNotMatch(JSON.stringify(allowed.auditEvents), /private synthetic content/)
})

test('blocks sensitive saves even when the caller is authorized', async (t) => {
  const { handlers, auditEvents, store } = await setup(t)
  await assert.rejects(
    handlers.memory_save({ content: 'secret', source: 'test', sensitivity: 'sensitive' }),
    /Sensitive memories are disabled/,
  )
  assert.equal(auditEvents.length, 0)
  assert.equal((await store.listMemories({ includeSensitive: true })).length, 0)
})

test('update and delete require an existing visible record and authorization', async (t) => {
  const { store, handlers, auditEvents, authorizationRequests } = await setup(t)
  const saved = await store.saveMemory({ content: 'Initial note', source: 'test' })
  const updatePatch = { content: 'Updated note' }
  const updated = await handlers.memory_update({ memoryId: saved.id, patch: updatePatch })
  assert.deepEqual(authorizationRequests[0], { operation: 'update', memoryId: saved.id, payload: { memoryId: saved.id, patch: updatePatch } })
  assert.equal(updated.content, 'Updated note')
  assert.deepEqual(auditEvents.at(-1), { operation: 'update', memoryId: saved.id, outcome: 'authorized', timestamp: '2026-11-08T22:00:00.000Z' })
  const deleted = await handlers.memory_delete({ memoryId: saved.id })
  assert.deepEqual(authorizationRequests[1], { operation: 'delete', memoryId: saved.id, payload: { memoryId: saved.id } })
  assert.deepEqual(deleted, { memoryId: saved.id, deleted: true })
  assert.deepEqual(auditEvents.at(-1), { operation: 'delete', memoryId: saved.id, outcome: 'authorized', timestamp: '2026-11-08T22:00:00.000Z' })
})

test('cannot update or delete hidden sensitive records by guessing their IDs', async (t) => {
  const { store, handlers } = await setup(t)
  const hidden = await store.saveMemory({ content: 'Hidden note', source: 'test', sensitivity: 'sensitive' })
  await assert.rejects(
    handlers.memory_update({ memoryId: hidden.id, patch: { content: 'Expose me' } }),
    /not available/,
  )
  await assert.rejects(handlers.memory_delete({ memoryId: hidden.id }), /not available/)
})

test('updates and deletes records beyond the listing page limit', async (t) => {
  const { store, handlers } = await setup(t)
  const records = await Promise.all(Array.from({ length: 501 }, (_, index) =>
    store.saveMemory({ content: `Record ${index}`, source: 'test' }),
  ))
  const listedIds = new Set((await store.listMemories({ limit: 500 })).map((record) => record.id))
  const outsidePage = records.find((record) => !listedIds.has(record.id))
  assert.ok(outsidePage, 'one record should be outside the first listing page')
  const updated = await handlers.memory_update({ memoryId: outsidePage.id, patch: { content: 'Updated record outside page' } })
  assert.equal(updated.content, 'Updated record outside page')
  const deleted = await handlers.memory_delete({ memoryId: outsidePage.id })
  assert.equal(deleted.deleted, true)
})

test('audit failure prevents the write from being executed', async (t) => {
  const { store } = await setup(t)
  const handlers = createMemoryToolHandlers({
    store,
    authorize: async () => true,
    audit: async () => { throw new Error('audit unavailable') },
  })
  await assert.rejects(handlers.memory_save({ content: 'Should not persist', source: 'test' }), /audit unavailable/)
  assert.equal((await store.listMemories()).length, 0)
})

test('rejects unknown write fields and malformed identifiers', async (t) => {
  const { handlers } = await setup(t)
  await assert.rejects(handlers.memory_save({ content: 'x', source: 'test', includeSensitive: true }), /Unsupported save field/)
  await assert.rejects(handlers.memory_update({ memoryId: '', patch: {} }), /memoryId/)
  await assert.rejects(handlers.memory_delete({ memoryId: 'x', all: true }), /Unsupported delete field/)
})


test('invalid audit timestamps fail closed before a memory write', async (t) => {
  const { store } = await setup(t)
  const handlers = createMemoryToolHandlers({
    store,
    authorize: async () => true,
    audit: async () => assert.fail('audit must not run with an invalid timestamp'),
    clock: () => new Date('invalid'),
  })
  await assert.rejects(
    handlers.memory_save({ content: 'Must not persist', source: 'test' }),
    /valid Date/,
  )
  assert.equal((await store.listMemories()).length, 0)
})


test('runs a save through the real handler, approval broker and correlated UI transport', async (t) => {
  const { store, auditEvents } = await setup(t)
  const { createMemoryApprovalBroker } = await import('../bridge/memory-approval-broker.mjs')
  const { createMemoryConfirmationTransport } = await import('../bridge/memory-confirmation-transport.mjs')
  let confirmationFrame
  const transport = createMemoryConfirmationTransport({
    send: (frame) => { confirmationFrame = frame },
    timeoutMs: 1000,
  })
  const broker = createMemoryApprovalBroker({
    createId: () => 'handler-integration-challenge',
    requestConfirmation: (challenge) => transport.requestConfirmation(challenge),
  })
  const handlers = createMemoryToolHandlers({
    store,
    authorize: ({ operation, memoryId, payload }) => broker.authorize({
      operation,
      memoryId,
      payload,
      turnId: 'trusted-current-turn',
    }),
    audit: async (event) => auditEvents.push(event),
    clock: () => new Date('2026-11-08T22:00:00.000Z'),
  })
  const input = { content: 'Exact approved memory', source: 'integration test' }
  const pendingSave = handlers.memory_save(input)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(confirmationFrame.type, 'memory_confirmation')
  assert.equal(confirmationFrame.operation, 'save')
  assert.equal(confirmationFrame.memoryId, null)
  assert.deepEqual(confirmationFrame.payloadPreview, input)
  assert.equal(transport.receive({
    type: 'reply',
    id: confirmationFrame.id,
    operation: confirmationFrame.operation,
    memoryId: confirmationFrame.memoryId,
    payloadDigest: confirmationFrame.payloadDigest,
    turnId: confirmationFrame.turnId,
    approved: true,
  }), true)
  const saved = await pendingSave
  assert.equal(saved.content, input.content)
  assert.equal((await store.getMemory(saved.id)).content, input.content)
  assert.equal(auditEvents.length, 1)
})
