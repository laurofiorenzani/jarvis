import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { connectOfficialMcpServers } from '../bridge/freellmapi-mcp-session.mjs'

const fixture = fileURLToPath(new URL('./fixtures/mcp-stdio-server.mjs', import.meta.url))

test('official stdio transport starts fixture, discovers and calls a tool, then closes', async () => {
  const mcp = await connectOfficialMcpServers({
    configs: {
      fixture: {
        command: process.execPath,
        args: [fixture],
        env: { NODE_ENV: 'test' },
      },
    },
    allowedServerNames: ['fixture'],
    authorize: async () => ({ allow: true }),
  })

  try {
    assert.equal(mcp.tools.length, 1)
    assert.equal(mcp.tools[0].function.name, 'mcp__fixture__echo')
    const result = await mcp.execute({
      type: 'function',
      function: {
        name: 'mcp__fixture__echo',
        arguments: { message: 'stdio integration works' },
      },
    })
    assert.match(JSON.stringify(result), /stdio integration works/)
  } finally {
    await mcp.close()
  }
})
