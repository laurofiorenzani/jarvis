import test from 'node:test'
import assert from 'node:assert/strict'
import { createFreeLlmApiClient, readChatStream } from '../bridge/freellmapi-client.mjs'

function streamResponse(chunks, status = 200) {
  const bytes = chunks.map((chunk) => new TextEncoder().encode(chunk))
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of bytes) controller.enqueue(chunk)
      controller.close()
    },
  })
  return { ok: status >= 200 && status < 300, status, body,
    async json() { return { error: { message: 'provider unavailable\ntry later' } } } }
}

test('streams OpenAI-compatible text deltas across chunk boundaries', async () => {
  const seen = []
  const response = streamResponse([
    'data: {"choices":[{"delta":{"content":"Hello "}}]}\n',
    'data: {"choices":[{"delta":{"content":"sir."},"finish_reason":"stop"}]}\n',
    'data: [DONE]\n',
  ])
  const result = await readChatStream(response, { onText: (part) => seen.push(part) })
  assert.deepEqual(seen, ['Hello ', 'sir.'])
  assert.equal(result.complete, true)
  assert.equal(result.done, true)
  assert.equal(result.aborted, false)
})

test('surfaces fragmented tool-call deltas without executing them', async () => {
  const deltas = []
  const response = streamResponse([
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"jarvis_read","arguments":"{\\"path\\""}}]}}]}\n',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":\\"notes.txt\\"}"}}]},"finish_reason":"tool_calls"}]}\n',
    'data: [DONE]\n',
  ])
  const result = await readChatStream(response, { onToolCallDelta: (part) => deltas.push(part) })
  assert.equal(deltas.length, 2)
  assert.equal(deltas[0].id, 'call_1')
  assert.equal(deltas[0].function.name, 'jarvis_read')
  assert.equal(deltas[1].function.arguments, ':"notes.txt"}')
  assert.equal(result.complete, true)
})

test('sends the key only in the server-side Authorization header and forwards tool schemas', async () => {
  let request
  const client = createFreeLlmApiClient({
    apiKey: 'test-secret',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return streamResponse(['data: [DONE]\n'])
    },
  })
  const tools = [{ type: 'function', function: { name: 'jarvis_read', parameters: { type: 'object' } } }]
  await client.streamChat({ messages: [{ role: 'user', content: 'Hello' }], tools })
  assert.equal(request.url, 'http://127.0.0.1:3001/v1/chat/completions')
  assert.equal(request.options.headers.Authorization, 'Bearer test-secret')
  const body = JSON.parse(request.options.body)
  assert.equal(body.stream, true)
  assert.deepEqual(body.tools, tools)
  assert.equal(body.parallel_tool_calls, false)
  assert.equal(JSON.stringify(body).includes('test-secret'), false)
})

test('requires a key and at least one message', async () => {
  const noKey = createFreeLlmApiClient({ apiKey: '' })
  await assert.rejects(noKey.streamChat({ messages: [{ role: 'user', content: 'Hi' }] }), /API_KEY/)
  const client = createFreeLlmApiClient({ apiKey: 'x' })
  await assert.rejects(client.streamChat({ messages: [] }), /At least one/)
})

test('rejects insecure non-local endpoints and malformed URLs', () => {
  assert.throws(() => createFreeLlmApiClient({ apiKey: 'x', baseURL: 'http://example.com/v1' }), /HTTPS/)
  assert.throws(() => createFreeLlmApiClient({ apiKey: 'x', baseURL: 'not a url' }), /valid HTTP/)
  assert.throws(() => createFreeLlmApiClient({ apiKey: 'x', baseURL: 'https://user:pass@example.com/v1' }), /credentials/)
})

test('reports provider errors without exposing request credentials', async () => {
  const client = createFreeLlmApiClient({
    apiKey: 'top-secret',
    fetchImpl: async () => streamResponse([], 503),
  })
  await assert.rejects(
    client.streamChat({ messages: [{ role: 'user', content: 'Hi' }] }),
    /HTTP 503: provider unavailable try later/,
  )
})
