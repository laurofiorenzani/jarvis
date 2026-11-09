/**
 * Assemble OpenAI-compatible streamed tool-call fragments.
 *
 * This module never executes a tool. The bridge must validate each completed
 * call against its MCP allowlist and the existing JARVIS policy before dispatch.
 */
const MAX_ARGUMENT_BYTES = 64 * 1024

export function createToolCallAccumulator({ maxArgumentBytes = MAX_ARGUMENT_BYTES } = {}) {
  const calls = new Map()

  function add(delta) {
    if (!delta || !Number.isInteger(delta.index) || delta.index < 0) {
      throw new Error('FreeLLMAPI returned a tool call without a valid index.')
    }
    let call = calls.get(delta.index)
    if (!call) {
      call = { index: delta.index, id: '', type: 'function', name: '', argumentsText: '' }
      calls.set(delta.index, call)
    }
    if (typeof delta.id === 'string') call.id += delta.id
    if (typeof delta.type === 'string') call.type = delta.type
    const fn = delta.function
    if (fn) {
      if (typeof fn.name === 'string') call.name += fn.name
      if (typeof fn.arguments === 'string') {
        call.argumentsText += fn.arguments
        if (Buffer.byteLength(call.argumentsText, 'utf8') > maxArgumentBytes) {
          throw new Error('FreeLLMAPI tool arguments exceeded the configured size limit.')
        }
      }
    }
  }

  function finish() {
    return [...calls.values()].sort((a, b) => a.index - b.index).map((call) => {
      if (call.type !== 'function' || !call.id || !call.name) {
        throw new Error('FreeLLMAPI returned an incomplete tool call.')
      }
      let args
      try {
        args = JSON.parse(call.argumentsText || '{}')
      } catch {
        throw new Error(`FreeLLMAPI returned invalid JSON arguments for tool ${call.name}.`)
      }
      if (!args || Array.isArray(args) || typeof args !== 'object') {
        throw new Error(`FreeLLMAPI arguments for tool ${call.name} must be a JSON object.`)
      }
      return { id: call.id, type: 'function', function: { name: call.name, arguments: args } }
    })
  }

  return { add, finish, size: () => calls.size }
}
