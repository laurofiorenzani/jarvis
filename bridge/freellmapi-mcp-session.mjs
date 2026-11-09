/**
 * Own MCP client sessions for the optional FreeLLMAPI backend.
 *
 * This is deliberately separate from Claude Agent SDK sessions. Transport
 * constructors are injected so the lifecycle can be tested without spawning
 * processes; the runtime supplies the official MCP SDK implementations.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { createMcpToolAdapter } from './freellmapi-mcp-adapter.mjs'

function validateServerConfig(name, config) {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Invalid MCP server name.')
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(`Invalid MCP configuration for ${name}.`)
  }
  if (config.url || config.type === 'http' || config.type === 'sse') {
    throw new Error(`MCP server ${name} uses a remote transport not enabled in this stage.`)
  }
  if (typeof config.command !== 'string' || !config.command.trim()) {
    throw new Error(`MCP server ${name} must use a configured stdio command for this backend.`)
  }
  if (config.args !== undefined && (!Array.isArray(config.args) || config.args.some(x => typeof x !== 'string'))) {
    throw new Error(`MCP server ${name} has invalid arguments.`)
  }
  if (config.env !== undefined && (!config.env || typeof config.env !== 'object' ||
      Array.isArray(config.env) || Object.values(config.env).some(x => typeof x !== 'string'))) {
    throw new Error(`MCP server ${name} has invalid environment variables.`)
  }
}

export async function connectMcpServers({
  configs,
  createClient,
  createTransport,
  authorize,
  allowedServerNames,
}) {
  if (!configs || typeof configs !== 'object' || Array.isArray(configs) ||
      typeof createClient !== 'function' || typeof createTransport !== 'function' ||
      typeof authorize !== 'function') {
    throw new TypeError('MCP connection requires configs, client/transport factories and policy.')
  }
  const allow = allowedServerNames == null ? null : new Set(allowedServerNames)
  const sessions = new Map()
  const discovered = []

  try {
    for (const [name, config] of Object.entries(configs)) {
      if (allow && !allow.has(name)) continue
      validateServerConfig(name, config)
      const client = createClient({ name: 'JARVIS FreeLLMAPI', version: '1.0.0' })
      const transport = createTransport({
        command: config.command,
        args: config.args ?? [],
        env: config.env,
        cwd: config.cwd,
      })
      await client.connect(transport)
      sessions.set(name, client)
      const result = await client.listTools()
      if (!Array.isArray(result?.tools)) throw new Error(`MCP server ${name} returned an invalid tool list.`)
      discovered.push({ name, tools: result.tools })
    }

    const adapter = createMcpToolAdapter({
      servers: discovered,
      authorize,
      callTool: (server, tool, args) => {
        const client = sessions.get(server)
        if (!client) throw new Error('MCP session is not connected.')
        return client.callTool({ name: tool, arguments: args })
      },
    })

    let closed = false
    return {
      tools: adapter.tools,
      execute: adapter.execute,
      async close() {
        if (closed) return
        closed = true
        const results = await Promise.allSettled([...sessions.values()].map(client => client.close()))
        const failed = results.find(x => x.status === 'rejected')
        if (failed) throw failed.reason
      },
    }
  } catch (error) {
    await Promise.allSettled([...sessions.values()].map(client => client.close()))
    throw error
  }
}

/**
 * Build a deliberately small environment for MCP child processes.
 * Secrets from the Jarvis bridge are not inherited implicitly. A server may
 * receive additional values only through its own explicit config.env.
 */
export function buildMcpChildEnv(systemEnv = process.env, serverEnv = {}) {
  const allowedSystemKeys = [
    'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC',
    'TEMP', 'TMP', 'HOME', 'USERPROFILE',
  ]
  const result = {}
  for (const key of allowedSystemKeys) {
    if (typeof systemEnv[key] === 'string') result[key] = systemEnv[key]
  }
  for (const [key, value] of Object.entries(serverEnv ?? {})) {
    if (typeof value !== 'string') throw new TypeError('MCP environment values must be strings.')
    result[key] = value
  }
  return result
}

/**
 * Production connector using the official MCP SDK stdio client transport.
 * It remains opt-in: the existing Claude Agent SDK path is not changed.
 */
export function connectOfficialMcpServers({ configs, authorize, allowedServerNames }) {
  return connectMcpServers({
    configs,
    authorize,
    allowedServerNames,
    createClient: (info) => new Client(info, { capabilities: {} }),
    createTransport: ({ command, args, env, cwd }) => new StdioClientTransport({
      command,
      args,
      env: buildMcpChildEnv(process.env, env),
      cwd,
      stderr: 'pipe',
    }),
  })
}
