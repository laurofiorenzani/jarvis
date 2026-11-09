import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({ name: 'jarvis-test-fixture', version: '1.0.0' })
server.tool(
  'echo',
  'Return the supplied message unchanged.',
  { message: z.string() },
  async ({ message }) => ({
    content: [{ type: 'text', text: message }],
  }),
)
await server.connect(new StdioServerTransport())
