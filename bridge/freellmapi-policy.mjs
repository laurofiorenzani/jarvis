/**
 * Reuse JARVIS's existing MCP permission policy for the FreeLLMAPI dispatcher.
 * The caller supplies the same workspace and roots used by bridge/server.mjs.
 */
import { checkToolUse } from './policy.mjs'

export function createFreeLlmMcpAuthorizer({ allowWrites = false, cwd, roots }) {
  if (typeof cwd !== 'string' || !cwd || !Array.isArray(roots)) {
    throw new TypeError('MCP authorizer requires the JARVIS cwd and file roots.')
  }
  return (toolName, args) => checkToolUse(toolName, args, {
    allowWrites,
    cwd,
    roots,
  })
}
