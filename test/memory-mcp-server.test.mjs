import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MemoryStore } from '../bridge/memory.mjs'
import { createMemoryMcpServer } from '../bridge/memory-mcp-server.mjs'

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

test('builds an in-process MCP server with four strict memory tools', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-memory-mcp-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const store = new MemoryStore({ filePath: join(directory, 'memory.json'), encryptionKey: KEY })
  await store.init()

  const registered = []
  const sdk = {
    tool(name, description, inputSchema, handler) {
      const definition = { name, description, inputSchema, handler }
      registered.push(definition)
      return definition
    },
    createSdkMcpServer(config) { return config },
  }

  const server = createMemoryMcpServer({
    store,
    authorize: async () => true,
    audit: async () => {},
    sdk,
    z: fakeZod(),
  })

  assert.equal(server.name, 'jarvis_memory')
  assert.equal(server.alwaysLoad, true)
  assert.deepEqual(registered.map((item) => item.name), [
    'memory_search', 'memory_save', 'memory_update', 'memory_delete',
  ])
  assert.equal(registered.every((item) => Array.isArray(item.inputSchema.strict)), true)

  const search = registered.find((item) => item.name === 'memory_search')
  const saved = await registered.find((item) => item.name === 'memory_save')
    .handler({ content: 'MCP wrapper note', source: 'test' })
  assert.equal(JSON.parse(saved.content[0].text).content, 'MCP wrapper note')
  const result = await search.handler({ query: 'MCP wrapper' })
  assert.equal(JSON.parse(result.content[0].text).length, 1)
})

test('requires the SDK and Zod dependencies explicitly', () => {
  assert.throws(() => createMemoryMcpServer({}), /Claude Agent SDK/)
})
