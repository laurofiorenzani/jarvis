/**
 * Adapter between MCP tool registries and OpenAI-compatible tool calling.
 *
 * MCP transport/session ownership remains with the caller. This module only
 * maps discovered tools and dispatches a completed call through an injected
 * policy gate before invoking the MCP session.
 */
function openAiName(server, tool) {
  return `mcp__${server}__${tool}`
}

function mcpName(openAi) {
  const match = /^mcp__([^_].*?)__(.+)$/.exec(openAi)
  if (!match) throw new Error('Unknown MCP tool name.')
  return { server: match[1], tool: match[2] }
}

export function createMcpToolAdapter({ servers, callTool, authorize }) {
  if (!Array.isArray(servers) || typeof callTool !== 'function' || typeof authorize !== 'function') {
    throw new TypeError('MCP adapter requires servers, callTool and authorize.')
  }

  const registry = new Map()
  const tools = []
  for (const server of servers) {
    if (!server || typeof server.name !== 'string' || !Array.isArray(server.tools)) {
      throw new TypeError('Each MCP server must have a name and tools array.')
    }
    for (const tool of server.tools) {
      if (!tool || typeof tool.name !== 'string' || !tool.name) {
        throw new TypeError('Each MCP tool must have a name.')
      }
      const name = openAiName(server.name, tool.name)
      if (registry.has(name)) throw new Error(`Duplicate MCP tool: ${name}`)
      const parameters = tool.inputSchema ?? { type: 'object', properties: {} }
      if (parameters.type !== 'object') {
        throw new Error(`MCP tool ${name} has a non-object input schema.`)
      }
      registry.set(name, { server: server.name, tool: tool.name })
      tools.push({
        type: 'function',
        function: {
          name,
          description: typeof tool.description === 'string' ? tool.description : '',
          parameters,
        },
      })
    }
  }

  return {
    tools,
    async execute(call) {
      const fn = call?.function
      if (call?.type !== 'function' || typeof fn?.name !== 'string' ||
          !fn.arguments || typeof fn.arguments !== 'object' || Array.isArray(fn.arguments)) {
        throw new Error('Malformed MCP tool call.')
      }
      const target = registry.get(fn.name)
      if (!target) throw new Error('MCP tool is not in the discovered allowlist.')
      const policyName = `mcp__${target.server}__${target.tool}`
      const verdict = await authorize(policyName, fn.arguments)
      if (verdict !== true && verdict?.allow !== true) {
        throw new Error(verdict?.reason || 'MCP tool call blocked by policy.')
      }
      return callTool(target.server, target.tool, fn.arguments)
    },
  }
}

export { mcpName }
