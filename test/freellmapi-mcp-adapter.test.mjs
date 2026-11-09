import test from 'node:test'
import assert from 'node:assert/strict'
import { createMcpToolAdapter } from '../bridge/freellmapi-mcp-adapter.mjs'

const servers = [{
  name: 'notes',
  tools: [{ name: 'read_note', description: 'Read a note', inputSchema: {
    type: 'object', properties: { path: { type: 'string' } }, required: ['path'],
  } }],
}]

test('maps discovered MCP tools to OpenAI function schemas', () => {
  const adapter = createMcpToolAdapter({ servers, callTool() {}, authorize: () => true })
  assert.deepEqual(adapter.tools[0], {
    type: 'function',
    function: {
      name: 'mcp__notes__read_note',
      description: 'Read a note',
      parameters: servers[0].tools[0].inputSchema,
    },
  })
})

test('authorizes the exact MCP tool and arguments before dispatch', async () => {
  const events = []
  const adapter = createMcpToolAdapter({
    servers,
    authorize: (name, args) => { events.push(['authorize', name, args]); return { allow: true } },
    callTool: async (...args) => { events.push(['call', ...args]); return { content: [] } },
  })
  const result = await adapter.execute({
    type: 'function',
    function: { name: 'mcp__notes__read_note', arguments: { path: 'today.txt' } },
  })
  assert.deepEqual(result, { content: [] })
  assert.equal(events[0][0], 'authorize')
  assert.equal(events[1][0], 'call')
})

test('denied and unknown tools never reach MCP dispatch', async () => {
  let dispatched = false
  const adapter = createMcpToolAdapter({
    servers,
    authorize: () => ({ allow: false, reason: 'read-only policy' }),
    callTool: () => { dispatched = true },
  })
  await assert.rejects(adapter.execute({
    type: 'function',
    function: { name: 'mcp__notes__read_note', arguments: { path: 'x' } },
  }), /read-only policy/)
  await assert.rejects(adapter.execute({
    type: 'function',
    function: { name: 'mcp__other__delete_all', arguments: {} },
  }), /allowlist/)
  assert.equal(dispatched, false)
})

test('rejects malformed and duplicate tool definitions', async () => {
  const adapter = createMcpToolAdapter({ servers, callTool: () => {}, authorize: () => true })
  await assert.rejects(adapter.execute({ type: 'function', function: { name: 'mcp__notes__read_note', arguments: [] } }), /Malformed MCP tool call/)
  assert.throws(() => createMcpToolAdapter({
    servers: [{ name: 'notes', tools: [{ name: 'x' }, { name: 'x' }] }],
    callTool() {}, authorize: () => true,
  }), /Duplicate MCP tool/)
})
