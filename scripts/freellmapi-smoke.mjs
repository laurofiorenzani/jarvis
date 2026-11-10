import process from 'node:process'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const baseUrl = process.env.FREELLMAPI_BASE_URL?.trim() || 'http://127.0.0.1:3001'
const apiKey = process.env.FREELLMAPI_API_KEY?.trim()
const model = process.env.FREELLMAPI_MODEL?.trim() || 'auto'

if (!apiKey) {
  console.error('Missing FREELLMAPI_API_KEY. Set it only in your local shell; do not commit it.')
  process.exit(2)
}

let url
try {
  url = new URL(baseUrl)
} catch {
  console.error('FREELLMAPI_BASE_URL must be a valid loopback URL.')
  process.exit(2)
}

if (
  !['http:', 'https:'].includes(url.protocol) ||
  !LOOPBACK_HOSTS.has(url.hostname.toLowerCase()) ||
  url.username || url.password || url.search || url.hash ||
  (url.pathname !== '/' && url.pathname !== '')
) {
  console.error('Refusing to send the FreeLLMAPI key: endpoint must be a plain loopback URL.')
  process.exit(2)
}

const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 30_000)

try {
  const response = await fetch(new URL('/v1/messages', url.origin), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model,
      max_tokens: 64,
      stream: true,
      messages: [{ role: 'user', content: 'Reply with exactly: JARVIS_STREAM_OK' }],
    }),
    signal: controller.signal,
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500)
    throw new Error(`FreeLLMAPI returned HTTP ${response.status}: ${detail}`)
  }
  if (!response.body) throw new Error('FreeLLMAPI returned no response stream.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let messageStopped = false

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let event
      try {
        event = JSON.parse(payload)
      } catch {
        throw new Error('FreeLLMAPI emitted malformed server-sent event data.')
      }
      if (event.type === 'error') {
        throw new Error(event.error?.message || 'FreeLLMAPI emitted a stream error.')
      }
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        text += event.delta.text || ''
      }
      if (event.type === 'message_stop') messageStopped = true
    }
  }

  buffer += decoder.decode()
  if (buffer.startsWith('data:')) {
    const payload = buffer.slice(5).trim()
    if (payload && payload !== '[DONE]') {
      let event
      try {
        event = JSON.parse(payload)
      } catch {
        throw new Error('FreeLLMAPI emitted malformed final server-sent event data.')
      }
      if (event.type === 'error') throw new Error(event.error?.message || 'FreeLLMAPI emitted a stream error.')
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') text += event.delta.text || ''
      if (event.type === 'message_stop') messageStopped = true
    }
  }
  if (!text.trim()) throw new Error('The stream completed without any assistant text.')
  if (!text.includes('JARVIS_STREAM_OK')) {
    throw new Error('The model response did not contain the expected smoke-test token.')
  }
  if (!messageStopped) throw new Error('The stream ended without a message_stop event.')
  console.log(`FreeLLMAPI live streaming check passed (model: ${model}; received ${text.length} text characters).`)
} catch (error) {
  console.error(`FreeLLMAPI live check failed: ${error?.message || String(error)}`)
  process.exitCode = 1
} finally {
  clearTimeout(timeout)
}
