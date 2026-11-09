/**
 * Compose the optional FreeLLMAPI backend from the existing JARVIS primitives.
 *
 * This runtime is intentionally opt-in and is not imported by server.mjs.
 * MCP server definitions and the server-name allowlist must be supplied by
 * the caller; this module never discovers or starts every configured server.
 */
import { createFreeLlmApiClient } from './freellmapi-client.mjs'
import { connectOfficialMcpServers } from './freellmapi-mcp-session.mjs'
import { createFreeLlmMcpAuthorizer } from './freellmapi-policy.mjs'
import { runFreeLlmToolLoop } from './freellmapi-tool-loop.mjs'

export async function createFreeLlmRuntime({
  env = process.env,
  workspace,
  roots,
  allowWrites = false,
  mcpConfigs = {},
  allowedServerNames = [],
  fetchImpl,
  createClient = createFreeLlmApiClient,
  connectMcp = connectOfficialMcpServers,
  createAuthorizer = createFreeLlmMcpAuthorizer,
  runToolLoop = runFreeLlmToolLoop,
} = {}) {
  const apiKey = typeof env.FREELLMAPI_API_KEY === 'string'
    ? env.FREELLMAPI_API_KEY.trim()
    : ''
  if (!apiKey) throw new Error('FREELLMAPI_API_KEY is required to start the optional FreeLLMAPI runtime.')
  if (typeof workspace !== 'string' || !workspace || !Array.isArray(roots)) {
    throw new TypeError('FreeLLMAPI runtime requires the JARVIS workspace and file roots.')
  }
  if (!mcpConfigs || typeof mcpConfigs !== 'object' || Array.isArray(mcpConfigs)) {
    throw new TypeError('mcpConfigs must be an object of explicitly selected stdio MCP servers.')
  }
  if (!Array.isArray(allowedServerNames) ||
      allowedServerNames.some(name => typeof name !== 'string') ||
      new Set(allowedServerNames).size !== allowedServerNames.length) {
    throw new TypeError('allowedServerNames must be a unique list of MCP server names.')
  }
  for (const name of allowedServerNames) {
    if (!Object.hasOwn(mcpConfigs, name)) {
      throw new Error(`Allowed MCP server "${name}" has no supplied configuration.`)
    }
  }

  const client = createClient({
    apiKey,
    baseURL: env.FREELLMAPI_BASE_URL || 'http://127.0.0.1:3001/v1',
    model: env.FREELLMAPI_MODEL || 'gemini-3.5-flash',
    fetchImpl,
  })
  const authorize = createAuthorizer({ allowWrites, cwd: workspace, roots })
  const selectedConfigs = Object.fromEntries(
    allowedServerNames.map(name => [name, mcpConfigs[name]]),
  )
  const mcp = await connectMcp({
    configs: selectedConfigs,
    authorize,
    allowedServerNames,
  })

  let closed = false
  return {
    async chat({ messages, signal, onText } = {}) {
      if (closed) throw new Error('FreeLLMAPI runtime is closed.')
      return runToolLoop({ client, mcp, messages, signal, onText })
    },
    async close() {
      if (closed) return
      closed = true
      await mcp.close()
    },
  }
}
