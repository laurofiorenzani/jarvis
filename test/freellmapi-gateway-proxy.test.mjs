import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { createGatewayProxy, isAllowedRoute, isAuthorized } from '../ops/freellmapi-gateway/proxy.mjs'

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return server.address().port
}

async function close(server) {
  if (!server.listening) return
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

test('proxy route allowlist exposes only chat completions and model discovery', () => {
  assert.equal(isAllowedRoute('POST', '/v1/chat/completions'), true)
  assert.equal(isAllowedRoute('GET', '/v1/models'), true)
  assert.equal(isAllowedRoute('GET', '/'), false)
  assert.equal(isAllowedRoute('GET', '/api/keys'), false)
  assert.equal(isAllowedRoute('POST', '/v1/audio/transcriptions'), false)
})

test('proxy bearer validation is constant-time and rejects malformed tokens', () => {
  const token = 'a'.repeat(64)
  assert.equal(isAuthorized('Bearer ' + token, token), true)
  assert.equal(isAuthorized('Bearer ' + 'b'.repeat(64), token), false)
  assert.equal(isAuthorized('Basic ' + token, token), false)
  assert.equal(isAuthorized(undefined, token), false)
})

test('proxy replaces the JARVIS token with the private FreeLLMAPI key and streams the response', async (t) => {
  let observed
  const upstream = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    observed = {
      url: request.url,
      authorization: request.headers.authorization,
      taskType: request.headers['x-freellm-task-type'],
      body: Buffer.concat(chunks).toString('utf8'),
    }
    response.writeHead(200, {
      'content-type': 'text/event-stream',
      'x-routed-via': 'groq/llama-3.3-70b',
      'x-fallback-attempts': '2',
    })
    response.end('data: {"choices":[{"delta":{"content":"JARVIS_PROXY_OK"}}]}\n\n')
  })
  const upstreamPort = await listen(upstream)
  t.after(() => close(upstream))

  const proxy = createGatewayProxy({
    origin: 'http://127.0.0.1:' + upstreamPort,
    gatewayToken: 'j'.repeat(64),
    upstreamApiKey: 'freellmapi-private-unified-key',
    logger: { info() {}, warn() {} },
  })
  const proxyPort = await listen(proxy)
  t.after(() => close(proxy))

  const response = await fetch('http://127.0.0.1:' + proxyPort + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + 'j'.repeat(64),
      'content-type': 'application/json',
      accept: 'text/event-stream',
      'x-freellm-task-type': 'code',
    },
    body: JSON.stringify({ model: 'auto:smart', messages: [{ role: 'user', content: 'JARVIS_PROXY_OK' }], stream: true }),
  })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-routed-via'), 'groq/llama-3.3-70b')
  assert.equal(response.headers.get('x-fallback-attempts'), '2')
  assert.match(await response.text(), /JARVIS_PROXY_OK/)
  assert.equal(observed.authorization, 'Bearer freellmapi-private-unified-key')
  assert.equal(observed.taskType, 'code')
  assert.equal(observed.url, '/v1/chat/completions')
  assert.match(observed.body, /auto:smart/)
})

test('proxy blocks dashboard paths and requests without the JARVIS token', async (t) => {
  const upstream = createServer((_request, response) => response.end('should not be reached'))
  const upstreamPort = await listen(upstream)
  t.after(() => close(upstream))
  const proxy = createGatewayProxy({
    origin: 'http://127.0.0.1:' + upstreamPort,
    gatewayToken: 'j'.repeat(64),
    upstreamApiKey: 'freellmapi-private-unified-key',
    logger: { info() {}, warn() {} },
  })
  const proxyPort = await listen(proxy)
  t.after(() => close(proxy))

  const dashboard = await fetch('http://127.0.0.1:' + proxyPort + '/')
  assert.equal(dashboard.status, 404)
  const unauthorized = await fetch('http://127.0.0.1:' + proxyPort + '/v1/models')
  assert.equal(unauthorized.status, 401)
})

test('proxy enforces request body size limits', async (t) => {
  const upstream = createServer((_request, response) => response.end('should not be reached'))
  const upstreamPort = await listen(upstream)
  t.after(() => close(upstream))
  const proxy = createGatewayProxy({
    origin: 'http://127.0.0.1:' + upstreamPort,
    gatewayToken: 'j'.repeat(64),
    upstreamApiKey: 'freellmapi-private-unified-key',
    maxBodyBytes: 8,
    logger: { info() {}, warn() {} },
  })
  const proxyPort = await listen(proxy)
  t.after(() => close(proxy))

  const response = await fetch('http://127.0.0.1:' + proxyPort + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + 'j'.repeat(64),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ message: 'too large' }),
  })
  assert.equal(response.status, 413)
})

test('proxy refuses weak gateway credentials and non-origin upstream URLs', () => {
  assert.throws(() => createGatewayProxy({
    origin: 'http://127.0.0.1:3001',
    gatewayToken: 'short',
    upstreamApiKey: 'freellmapi-private-unified-key',
  }), /at least 32 characters/)
  assert.throws(() => createGatewayProxy({
    origin: 'http://user:pass@127.0.0.1:3001/v1',
    gatewayToken: 'j'.repeat(64),
    upstreamApiKey: 'freellmapi-private-unified-key',
  }), /plain HTTP\(S\) origin/)
})


test('proxy enforces the per-minute request budget and model query allowlist', async (t) => {
  let upstreamCalls = 0
  const upstream = createServer((_request, response) => {
    upstreamCalls += 1
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end('{"data":[]}')
  })
  const upstreamPort = await listen(upstream)
  t.after(() => close(upstream))
  const proxy = createGatewayProxy({
    origin: 'http://127.0.0.1:' + upstreamPort,
    gatewayToken: 'j'.repeat(64),
    upstreamApiKey: 'freellmapi-private-unified-key',
    maxRequestsPerMinute: 1,
    logger: { info() {}, warn() {} },
  })
  const proxyPort = await listen(proxy)
  t.after(() => close(proxy))
  const base = 'http://127.0.0.1:' + proxyPort
  const headers = { authorization: 'Bearer ' + 'j'.repeat(64) }

  const allowed = await fetch(base + '/v1/models?execution_status=ready', { headers })
  assert.equal(allowed.status, 200)
  const unsupportedQuery = await fetch(base + '/v1/models?include_keys=true', { headers })
  assert.equal(unsupportedQuery.status, 400)
  const secondAllowed = await fetch(base + '/v1/models', { headers })
  assert.equal(secondAllowed.status, 429)
  assert.equal(upstreamCalls, 1)
})

test('proxy logs only bounded routing metadata and never request content or credentials', async (t) => {
  const entries = []
  const upstream = createServer(async (request, response) => {
    for await (const _chunk of request) { /* consume synthetic body */ }
    response.writeHead(200, { 'content-type': 'application/json', 'x-routed-via': 'synthetic/model' })
    response.end('{"ok":true}')
  })
  const upstreamPort = await listen(upstream)
  t.after(() => close(upstream))
  const proxy = createGatewayProxy({
    origin: 'http://127.0.0.1:' + upstreamPort,
    gatewayToken: 'j'.repeat(64),
    upstreamApiKey: 'freellmapi-private-unified-key',
    logger: {
      info: (_message, metadata) => entries.push(metadata),
      warn: (_message, metadata) => entries.push(metadata),
    },
  })
  const proxyPort = await listen(proxy)
  t.after(() => close(proxy))
  const response = await fetch('http://127.0.0.1:' + proxyPort + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + 'j'.repeat(64),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'SYNTHETIC_PRIVATE_PROMPT_MARKER' }] }),
  })
  assert.equal(response.status, 200)
  const serialized = JSON.stringify(entries)
  assert.equal(serialized.includes('SYNTHETIC_PRIVATE_PROMPT_MARKER'), false)
  assert.equal(serialized.includes('freellmapi-private-unified-key'), false)
  assert.equal(serialized.includes('jjjjjjjj'), false)
  assert.equal(entries[0].route, '/v1/chat/completions')
  assert.equal(entries[0].status, 200)
})
