import test from 'node:test'
import assert from 'node:assert/strict'
import { connectMcpServers } from '../bridge/freellmapi-mcp-session.mjs'

function harness({ deny = false } = {}) {
  const events = []
  const clients = []
  const createClient = meta => {
    const client = {
      async connect(transport) { events.push(['connect', meta, transport]) },
      async listTools() { return { tools: [{ name: 'list_items', inputSchema: { type: 'object', properties: {} } }] } },
      async callTool(args) { events.push(['call', args]); return { content: [] } },
      async close() { events.push(['close']) },
    }
    clients.push(client)
    return client
  }
  return {
    events, clients, createClient,
    createTransport: config => ({ ...config, fake: true }),
    authorize: () => deny ? { allow: false, reason: 'denied by test policy' } : { allow: true },
  }
}

test('connects configured stdio servers, discovers tools and closes sessions', async () => {
  const h = harness()
  const mcp = await connectMcpServers({
    configs: { notes: { command: 'node', args: ['server.js'], env: { MODE: 'test' } } },
    ...h,
  })
  assert.equal(mcp.tools[0].function.name, 'mcp__notes__list_items')
  await mcp.execute({ type: 'function', function: { name: 'mcp__notes__list_items', arguments: {} } })
  assert.equal(h.events.some(e => e[0] === 'call'), true)
  await mcp.close()
  assert.equal(h.events.filter(e => e[0] === 'close').length, 1)
})

test('honours server allowlist without connecting excluded servers', async () => {
  const h = harness()
  const mcp = await connectMcpServers({
    configs: { notes: { command: 'node' }, mail: { command: 'node' } },
    allowedServerNames: ['notes'],
    ...h,
  })
  assert.equal(h.clients.length, 1)
  await mcp.close()
})

test('policy denial blocks calls before the MCP client is invoked', async () => {
  const h = harness({ deny: true })
  const mcp = await connectMcpServers({
    configs: { notes: { command: 'node' } }, ...h,
  })
  await assert.rejects(mcp.execute({
    type: 'function', function: { name: 'mcp__notes__list_items', arguments: {} },
  }), /denied by test policy/)
  assert.equal(h.events.some(e => e[0] === 'call'), false)
  await mcp.close()
})

test('rejects remote transports until explicitly implemented', async () => {
  const h = harness()
  await assert.rejects(connectMcpServers({
    configs: { remote: { url: 'https://example.com/mcp' } }, ...h,
  }), /remote transport not enabled/)
  assert.equal(h.clients.length, 0)
})

test('closes already-connected sessions if a later server fails', async () => {
  const h = harness()
  let count = 0
  const createClient = meta => {
    const client = h.createClient(meta)
    count++
    if (count === 2) client.listTools = async () => { throw new Error('discovery failed') }
    return client
  }
  await assert.rejects(connectMcpServers({
    configs: { first: { command: 'node' }, second: { command: 'node' } },
    ...h, createClient,
  }), /discovery failed/)
  assert.equal(h.events.filter(e => e[0] === 'close').length, 2)
})

import { buildMcpChildEnv } from '../bridge/freellmapi-mcp-session.mjs'

test('MCP child environment excludes bridge secrets unless explicitly assigned', () => {
  const childEnv = buildMcpChildEnv({
    PATH: '/bin',
    HOME: '/home/jarvis',
    FREELLMAPI_API_KEY: 'bridge-secret',
    ANTHROPIC_API_KEY: 'claude-secret',
  }, { NOTES_TOKEN: 'notes-only' })
  assert.deepEqual(childEnv, {
    PATH: '/bin',
    HOME: '/home/jarvis',
    NOTES_TOKEN: 'notes-only',
  })
  assert.equal(Object.hasOwn(childEnv, 'FREELLMAPI_API_KEY'), false)
  assert.equal(Object.hasOwn(childEnv, 'ANTHROPIC_API_KEY'), false)
})

test('explicit MCP environment values must be strings', () => {
  assert.throws(() => buildMcpChildEnv({}, { TOKEN: 123 }), /must be strings/)
})
