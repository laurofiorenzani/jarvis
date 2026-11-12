/**
 * Conservative, side-effect risk classification for the future approval gate.
 *
 * This module is intentionally pure and is NOT wired into the bridge yet.
 * Until the complete nonce-bound approval lifecycle is implemented and tested,
 * the existing bridge permission gate remains authoritative.
 */

const READ_ONLY_BUILTINS = new Set([
  'Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'ToolSearch',
  'ListMcpResources', 'ListMcpResourcesTool',
  'ReadMcpResource', 'ReadMcpResourceTool',
  'BashOutput', 'TaskOutput',
])

const READ_VERB = /^(get|list|read|search|find|query|fetch|check|describe|inspect|show|view|explain|screenshot)(?:_|$)/i
const EFFECTFUL_VERB = /(?:send|call|post|create|delete|remove|update|edit|write|install|launch|tap|swipe|press|type|buy|pay|charge|publish|deploy|outbound|download|transfer|trade|book|share|invite|revoke)/i
const DENY_VERB = /(?:exfiltrat|credential.?dump|steal.?secret|bypass.?auth|disable.?security|ransomware|keylog)/i

function validToolName(name) {
  return typeof name === 'string' &&
    name.length > 0 &&
    name.length <= 200 &&
    /^[a-zA-Z0-9_:-]+$/.test(name)
}

/**
 * @param {string} toolName
 * @param {{ preAuthorization?: { matched: boolean } }} [context]
 * @returns {{ risk: 'read'|'routine'|'approval_required'|'deny', reason: string }}
 */
export function classifyToolRisk(toolName, context = {}) {
  if (!validToolName(toolName)) {
    return { risk: 'deny', reason: 'Invalid or missing tool name.' }
  }

  const server = toolName.startsWith('mcp__')
    ? toolName.split('__')[1] ?? ''
    : ''
  const tool = server ? toolName.split('__').slice(2).join('__') : toolName

  if (!tool || DENY_VERB.test(tool)) {
    return { risk: 'deny', reason: 'Tool is invalid or matches a prohibited action pattern.' }
  }

  // These names are intrinsically read-only; shell and generic task tools are
  // deliberately absent because their effects depend on their arguments.
  if (READ_ONLY_BUILTINS.has(tool)) {
    return { risk: 'read', reason: 'Explicit read-only built-in tool.' }
  }

  // Only a future, separately validated and account-scoped allow-rule may
  // produce ROUTINE. A model cannot self-assert that a rule matched.
  if (context.preAuthorization?.matched === true) {
    return { risk: 'routine', reason: 'A separately validated narrow pre-authorisation matched.' }
  }

  if (EFFECTFUL_VERB.test(tool)) {
    return { risk: 'approval_required', reason: 'Tool name indicates a possible side effect.' }
  }

  if (READ_VERB.test(tool)) {
    return { risk: 'read', reason: 'Tool name uses an explicit read verb.' }
  }

  // Unknown tools are never silently trusted.
  return { risk: 'approval_required', reason: 'Unknown tool requires explicit approval.' }
}
