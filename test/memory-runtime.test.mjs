import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMemoryRuntime } from '../bridge/memory-runtime.mjs'

const KEY = Buffer.from('0123456789abcdef0123456789abcdef')

function fakeZod() {
  const schema = (kind, value) => {
    const result = { kind, value }
    for (const method of ['min', 'max', 'int', 'optional', 'nullable', 'strict']) {
      result[method] = (...args) => Object.assign({}, result, { [method]: args })
    }
    return result
  }
  return {
    string: () => schema('string'),
    number: () => schema('number'),
    enum: (values) => schema('enum', values),
    object: (shape) => schema('object', shape),
  }
}

function fakeSdk() {
  return {
    tool: (name, description, inputSchema, handler) => ({ name, description, inputSchema, handler }),
    createSdkMcpServer: (config) => config,
  }
}

function fakeVault(initial = null) {
  let key = initial ? Buffer.from(initial) : null
  return {
    async getSecret() { return key ? Buffer.from(key) : null },
    async createSecretIfAbsent(_name, candidate) {
      if (!key) key = Buffer.from(candidate)
      return Buffer.from(key)
    },
  }
}

test('boots one encrypted store and completes a real MCP-tool confirmation round trip', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-memory-runtime-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const auditEvents = []
  const runtime = await createMemoryRuntime({
    filePath: join(directory, 'memory.json'),
    vault: fakeVault(KEY),
    audit: async (event) => auditEvents.push(event),
    clock: () => new Date('2026-11-08T22:00:00.000Z'),
    now: () => Date.now(),
    createId: () => 'runtime-challenge',
  })

  let frame
  const connection = runtime.createConnection({
    send: (value) => { frame = value },
    getCurrentTurnId: () => 'trusted-turn',
    sdk: fakeSdk(),
    z: fakeZod(),
  })
  assert.equal(connection.server.name, 'jarvis_memory')
  const save = connection.server.tools.find((tool) => tool.name === 'memory_save')
  const pending = save.handler({ content: 'Runtime integration note', source: 'test' })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(frame.type, 'memory_confirmation')
  assert.deepEqual(frame.payloadPreview, { content: 'Runtime integration note', source: 'test' })
  assert.equal(connection.transport.receive({
    type: 'reply',
    id: frame.id,
    operation: frame.operation,
    memoryId: frame.memoryId,
    payloadDigest: frame.payloadDigest,
    turnId: frame.turnId,
    approved: true,
  }), true)
  const result = JSON.parse((await pending).content[0].text)
  assert.equal(result.content, 'Runtime integration note')
  assert.equal((await runtime.store.getMemory(result.id)).content, result.content)
  assert.equal(auditEvents.length, 1)
  connection.cancelAll()
})

test('fails closed when an existing encrypted store has no vault key', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-memory-runtime-key-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const filePath = join(directory, 'memory.json')
  const runtime = await createMemoryRuntime({
    filePath,
    vault: fakeVault(KEY),
    audit: async () => {},
  })
  await runtime.store.saveMemory({ content: 'Persisted record', source: 'test' })
  await assert.rejects(createMemoryRuntime({
    filePath,
    vault: fakeVault(),
    audit: async () => {},
  }), /key is missing/)
})

test('requires a trusted audit callback before opening the runtime', async () => {
  await assert.rejects(createMemoryRuntime({
    filePath: '/unused/memory.json',
    vault: fakeVault(KEY),
  }), /audit callback/)
})
