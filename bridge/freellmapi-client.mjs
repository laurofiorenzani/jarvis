/**
 * Optional FreeLLMAPI transport for the JARVIS bridge.
 *
 * This module deliberately does not start tools or change the active agent.
 * It keeps credentials in the Node process and exposes an abortable,
 * OpenAI-compatible streaming chat transport. Tool-call deltas are surfaced
 * separately so the orchestration layer can apply JARVIS policy before
 * executing any MCP capability.
 */

function normalizeBaseURL(value) {
  let url
  try {
    url = new URL(String(value ?? 'http://127.0.0.1:3001/v1').trim())
  } catch {
    throw new Error('FREELLMAPI_BASE_URL must be a valid HTTP(S) URL.')
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('FREELLMAPI_BASE_URL must use HTTP or HTTPS.')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('FREELLMAPI_BASE_URL must not contain credentials, query parameters, or a fragment.')
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !loopback) {
    throw new Error('Non-local FreeLLMAPI endpoints must use HTTPS.')
  }
  return url.toString().replace(/\/+$/, '')
}

function extractError(body) {
  const message = body?.error?.message ?? body?.message
  return typeof message === 'string' ? message.replace(/[\r\n]+/g, ' ').slice(0, 240) : ''
}

/**
 * Parse OpenAI-compatible SSE. Text and tool-call fragments are deliberately
 * separate: callers must assemble tool calls and run them through policy.
 */
export async function readChatStream(
  response,
  { signal, onText = () => {}, onToolCallDelta = () => {} } = {},
) {
  if (!response.body) throw new Error('FreeLLMAPI returned an empty response stream.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let complete = false
  let done = false

  const consume = (line) => {
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data) return
    if (data === '[DONE]') {
      done = true
      return
    }
    let frame
    try { frame = JSON.parse(data) } catch { return }
    const choice = frame?.choices?.[0]
    const delta = choice?.delta
    if (typeof delta?.content === 'string' && delta.content) onText(delta.content)
    if (Array.isArray(delta?.tool_calls)) {
      for (const toolCall of delta.tool_calls) {
        if (toolCall && Number.isInteger(toolCall.index)) onToolCallDelta(toolCall)
      }
    }
    if (choice?.finish_reason) complete = true
  }

  try {
    while (!signal?.aborted && !done) {
      const { done: ended, value } = await reader.read()
      if (ended) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) consume(line)
    }
    buffer += decoder.decode()
    if (buffer.trim() && !signal?.aborted) consume(buffer.trim())
    return { aborted: Boolean(signal?.aborted), complete, done }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Create a credential-safe FreeLLMAPI client.
 * The API key is accepted only by this server-side module; never pass it to Vite.
 */
export function createFreeLlmApiClient({
  apiKey,
  baseURL = 'http://127.0.0.1:3001/v1',
  model = 'gemini-3.5-flash',
  fetchImpl = globalThis.fetch,
}) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : ''
  const endpoint = normalizeBaseURL(baseURL)
  const selectedModel = String(model ?? '').trim()
  if (!selectedModel) throw new Error('FREELLMAPI_MODEL must not be empty.')
  if (typeof fetchImpl !== 'function') throw new Error('A Fetch-compatible implementation is required.')

  return {
    async streamChat({ messages, tools, signal, onText, onToolCallDelta } = {}) {
      if (!key) throw new Error('FreeLLMAPI_API_KEY is not configured for the JARVIS bridge.')
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('At least one chat message is required.')
      }
      const body = {
        model: selectedModel,
        messages,
        stream: true,
      }
      if (Array.isArray(tools) && tools.length) {
        body.tools = tools
        body.tool_choice = 'auto'
        body.parallel_tool_calls = false
      }
      const response = await fetchImpl(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal,
      })
      if (!response.ok) {
        let detail = ''
        try { detail = extractError(await response.json()) } catch {}
        throw new Error(`FreeLLMAPI returned HTTP ${response.status}${detail ? `: ${detail}` : '.'}`)
      }
      return readChatStream(response, { signal, onText, onToolCallDelta })
    },
  }
}
