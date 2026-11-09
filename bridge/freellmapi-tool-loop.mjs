/**
 * OpenAI-compatible FreeLLMAPI tool loop.
 *
 * MCP tools are executed sequentially through the session adapter, which
 * applies the JARVIS authorization policy. This module never enables writes.
 */
import { createToolCallAccumulator } from './freellmapi-tool-calls.mjs'

function toolResultText(result) {
  if (typeof result === 'string') return result
  if (result && Array.isArray(result.content)) {
    return result.content.map(item => {
      if (item?.type === 'text' && typeof item.text === 'string') return item.text
      return JSON.stringify(item)
    }).join('\n').slice(0, 64 * 1024)
  }
  return JSON.stringify(result ?? null).slice(0, 64 * 1024)
}

export async function runFreeLlmToolLoop({
  client,
  mcp,
  messages,
  signal,
  onText = () => {},
  maxRounds = 6,
}) {
  if (!client || typeof client.streamChat !== 'function' ||
      !mcp || !Array.isArray(mcp.tools) || typeof mcp.execute !== 'function' ||
      !Array.isArray(messages) || !messages.length) {
    throw new TypeError('FreeLLMAPI tool loop requires a client, MCP session and messages.')
  }
  const history = messages.map(message => ({ ...message }))
  let rounds = 0
  const executed = []

  while (!signal?.aborted) {
    const accumulator = createToolCallAccumulator()
    let assistantText = ''
    const stream = await client.streamChat({
      messages: history,
      tools: mcp.tools,
      signal,
      onText: chunk => { assistantText += chunk; onText(chunk) },
      onToolCallDelta: delta => accumulator.add(delta),
    })
    if (stream.aborted || signal?.aborted) return { aborted: true, rounds, executed, messages: history }
    if (!accumulator.size()) {
      if (assistantText) history.push({ role: 'assistant', content: assistantText })
      return { aborted: false, rounds, executed, messages: history }
    }
    if (rounds >= maxRounds) throw new Error('FreeLLMAPI exceeded the maximum tool-call rounds.')
    const calls = accumulator.finish()
    history.push({
      role: 'assistant',
      content: assistantText || null,
      tool_calls: calls.map(call => ({
        id: call.id,
        type: 'function',
        function: { name: call.function.name, arguments: JSON.stringify(call.function.arguments) },
      })),
    })
    rounds += 1
    for (const call of calls) {
      if (signal?.aborted) return { aborted: true, rounds, executed, messages: history }
      try {
        const result = await mcp.execute(call)
        executed.push({ name: call.function.name, ok: true })
        history.push({ role: 'tool', tool_call_id: call.id, content: toolResultText(result) })
      } catch (error) {
        executed.push({ name: call.function.name, ok: false })
        history.push({
          role: 'tool',
          tool_call_id: call.id,
          content: `Tool execution blocked or failed: ${String(error?.message ?? error).slice(0, 300)}`,
        })
      }
    }
  }
  return { aborted: true, rounds, executed, messages: history }
}
