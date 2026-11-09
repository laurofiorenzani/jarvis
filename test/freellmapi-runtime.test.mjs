import test from 'node:test'
import assert from 'node:assert/strict'
import { createFreeLlmRuntime } from '../bridge/freellmapi-runtime.mjs'

const base = {
  env: { FREELLMAPI_API_KEY: 'server-secret', FREELLMAPI_MODEL: 'test-model' },
  workspace: '/workspace/jarvis',
  roots: ['/workspace/jarvis', '/tmp'],
  mcpConfigs: {
    notes: { command: 'node', args: ['notes-server.mjs'] },
    mail: { command: 'node', args: ['mail-server.mjs'] },
  },
  allowedServerNames: ['notes'],
}

test('composes a scoped optional runtime and delegates chat to the protected tool loop', async () => {
  const calls = {}
  const runtime = await createFreeLlmRuntime({
    ...base,
    createClient(options) { calls.client = options; return { id: 'client' } },
    createAuthorizer(options) { calls.authorizer = options; return 'policy' },
    async connectMcp(options) {
      calls.mcp = options
      return { tools: [], execute() {}, async close() { calls.closed = true } }
    },
    async runToolLoop(options) { calls.loop = options; return { rounds: 0 } },
    fetchImpl: () => {},
  })

  assert.equal(calls.client.apiKey, 'server-secret')
  assert.equal(calls.client.model, 'test-model')
  assert.deepEqual(calls.authorizer, {
    allowWrites: false,
    cwd: '/workspace/jarvis',
    roots: ['/workspace/jarvis', '/tmp'],
  })
  assert.deepEqual(Object.keys(calls.mcp.configs), ['notes'])
  assert.deepEqual(calls.mcp.allowedServerNames, ['notes'])
  assert.equal(calls.mcp.authorize, 'policy')
  const messages = [{ role: 'user', content: 'hello' }]
  assert.deepEqual(await runtime.chat({ messages }), { rounds: 0 })
  assert.equal(calls.loop.client.id, 'client')
  assert.equal(calls.loop.messages, messages)
  await runtime.close()
  assert.equal(calls.closed, true)
  await assert.rejects(runtime.chat({ messages }), /runtime is closed/)
})

test('requires a server-side API key before creating resources', async () => {
  let created = false
  await assert.rejects(createFreeLlmRuntime({
    ...base,
    env: {},
    createClient() { created = true },
  }), /FREELLMAPI_API_KEY is required/)
  assert.equal(created, false)
})

test('rejects an allowlisted server without an explicit configuration', async () => {
  await assert.rejects(createFreeLlmRuntime({
    ...base,
    allowedServerNames: ['calendar'],
  }), /has no supplied configuration/)
})

test('rejects duplicate server names in the allowlist', async () => {
  await assert.rejects(createFreeLlmRuntime({
    ...base,
    allowedServerNames: ['notes', 'notes'],
  }), /unique list/)
})

test('closes MCP resources at most once', async () => {
  let closes = 0
  const runtime = await createFreeLlmRuntime({
    ...base,
    async connectMcp() { return { tools: [], execute() {}, async close() { closes += 1 } } },
  })
  await runtime.close()
  await runtime.close()
  assert.equal(closes, 1)
})
