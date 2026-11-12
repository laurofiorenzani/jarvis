/**
 * Conservative, side-effect risk classification for the future approval gate.
 *
 * Pure groundwork only: not wired into PreToolUse. The bridge's existing
 * permission policy remains authoritative until the complete approval
 * lifecycle is implemented and tested.
 */
const READ_ONLY_BUILTINS = new Set([
  'Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'ToolSearch',
  'ListMcpResources', 'ListMcpResourcesTool',
  'ReadMcpResource', 'ReadMcpResourceTool',
  'BashOutput', 'TaskOutput',
])
const READ_VERB = /^(get|list|read|search|find|query|fetch|check|describe|inspect|show|view|explain|screenshot)_/i
const EFFECTFUL_VERB = /(?:send|call|post|create|delete|remove|update|edit|write|install|launch|tap|swipe|press|type|buy|pay|charge|publish|deploy|outbound|download|transfer|trade|book|share|invite|revoke)/i
const DENY_VERB = /(?:exfiltrat|credential.?dump|steal.?secret|bypass.?auth|disable.?security|ransomware|keylog)/i

function validToolName(name) {
  return typeof name === 'string' && name.length > 0 &&
    name.length <= 200 && /^[a-zA-Z0-9_:-]+$/.test(name)
}

/** @returns {{ risk: 'read'|'approval_required'|'deny', reason: string }} */
export function classifyToolRisk(toolName) {
  if (!validToolName(toolName)) {
    return { risk: 'deny', reason: 'Invalid or missing tool name.' }
  }
  const server = toolName.startsWith('mcp__') ? toolName.split('__')[1] ?? '' : ''
  const tool = server ? toolName.split('__').slice(2).join('__') : toolName
  if (!tool || DENY_VERB.test(tool)) {
    return { risk: 'deny', reason: 'Tool is invalid or matches a prohibited action pattern.' }
  }
  if (!server && READ_ONLY_BUILTINS.has(tool)) {
    return { risk: 'read', reason: 'Explicit read-only built-in tool.' }
  }
  if (EFFECTFUL_VERB.test(tool)) {
    return { risk: 'approval_required', reason: 'Tool name indicates a possible side effect.' }
  }
  if (READ_VERB.test(tool)) {
    return { risk: 'read', reason: 'Tool name uses an explicit read verb.' }
  }
  return { risk: 'approval_required', reason: 'Unknown tool requires explicit approval.' }
}
