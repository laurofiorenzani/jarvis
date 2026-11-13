import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'

const ALLOWED_ROUTES = new Map([
  ['GET /v1/models', true],
  ['POST /v1/chat/completions', true],
])

function sendJson(response, status, message) {
  if (response.headersSent) {
    response.destroy()
    return
  }
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  response.end(JSON.stringify({ error: { message } }))
}

export function isAllowedRoute(method, pathname) {
  return ALLOWED_ROUTES.has(method + ' ' + pathname)
}

export function isAuthorized(header, expectedToken) {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false
  const supplied = Buffer.from(header.slice(7))
  const expected = Buffer.from(expectedToken)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

async function readBoundedBody(request, maxBytes) {
  const declared = Number(request.headers['content-length'] ?? 0)
  if (Number.isFinite(declared) && declared > maxBytes) {
    request.resume()
    const error = new Error('request_too_large')
    error.status = 413
    throw error
  }
  const chunks = []
  let total = 0
  for await (const chunk of request) {
    total += chunk.length
    if (total > maxBytes) {
      request.resume()
      const error = new Error('request_too_large')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function safeResponseHeaders(upstream) {
  const headers = {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  }
  for (const name of ['content-type', 'retry-after', 'x-routed-via', 'x-fallback-attempts', 'x-fallback-trail']) {
    const value = upstream.headers.get(name)
    if (value && value.length <= 1_024) headers[name] = value
  }
  return headers
}

export function createGatewayProxy({
  origin,
  gatewayToken,
  upstreamApiKey,
  fetchImpl = fetch,
  maxBodyBytes = 2 * 1024 * 1024,
  maxRequestsPerMinute = 120,
  timeoutMs = 130_000,
  logger = console,
} = {}) {
  const upstreamOrigin = new URL(origin)
  if (!['http:', 'https:'].includes(upstreamOrigin.protocol) ||
      upstreamOrigin.username || upstreamOrigin.password ||
      upstreamOrigin.search || upstreamOrigin.hash ||
      (upstreamOrigin.pathname !== '/' && upstreamOrigin.pathname !== '')) {
    throw new Error('FREELLMAPI_ORIGIN must be a plain HTTP(S) origin without credentials or path')
  }
  if (typeof gatewayToken !== 'string' || gatewayToken.length < 32) {
    throw new Error('JARVIS_GATEWAY_TOKEN must contain at least 32 characters')
  }
  if (typeof upstreamApiKey !== 'string' || upstreamApiKey.length < 12) {
    throw new Error('FREELLMAPI_API_KEY is required')
  }

  let rateWindow = Math.floor(Date.now() / 60_000)
  let requestCount = 0

  return createServer((request, response) => {
    void (async () => {
      const startedAt = Date.now()
      const url = new URL(request.url ?? '/', 'http://jarvis-proxy.local')
      const route = request.method + ' ' + url.pathname

      if (!isAllowedRoute(request.method ?? 'GET', url.pathname)) {
        sendJson(response, 404, 'Route not available.')
        return
      }
      if (url.pathname === '/v1/models') {
        for (const key of url.searchParams.keys()) {
          if (key !== 'execution_status') {
            sendJson(response, 400, 'Unsupported model query parameter.')
            return
          }
        }
      } else if (url.search) {
        sendJson(response, 400, 'Query parameters are not allowed for this route.')
        return
      }
      if (!isAuthorized(request.headers.authorization, gatewayToken)) {
        sendJson(response, 401, 'Unauthorized.')
        return
      }

      const currentWindow = Math.floor(Date.now() / 60_000)
      if (currentWindow !== rateWindow) {
        rateWindow = currentWindow
        requestCount = 0
      }
      requestCount += 1
      if (requestCount > maxRequestsPerMinute) {
        sendJson(response, 429, 'Gateway request limit reached.')
        return
      }

      let body
      try {
        if (request.method !== 'GET') body = await readBoundedBody(request, maxBodyBytes)
      } catch (error) {
        sendJson(response, error?.status === 413 ? 413 : 400,
          error?.status === 413 ? 'Request body is too large.' : 'Request body could not be read.')
        return
      }

      const headers = {
        authorization: 'Bearer ' + upstreamApiKey,
        accept: request.headers.accept === 'text/event-stream' ? 'text/event-stream' : 'application/json',
      }
      const contentType = request.headers['content-type']
      if (typeof contentType === 'string' && contentType.length <= 128) headers['content-type'] = contentType
      const taskType = request.headers['x-freellm-task-type']
      if (taskType === 'auto' || taskType === 'chat' || taskType === 'code') {
        headers['x-freellm-task-type'] = taskType
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      request.on('aborted', () => controller.abort())
      response.on('close', () => {
        if (!response.writableEnded) controller.abort()
      })

      try {
        const upstreamUrl = new URL(url.pathname + url.search, upstreamOrigin)
        const upstream = await fetchImpl(upstreamUrl, {
          method: request.method,
          headers,
          ...(body?.length ? { body } : {}),
          signal: controller.signal,
        })
        response.writeHead(upstream.status, safeResponseHeaders(upstream))
        if (upstream.body) {
          await pipeline(Readable.fromWeb(upstream.body), response)
        } else {
          response.end()
        }
        const routedVia = upstream.headers.get('x-routed-via')
        const fallbackAttempts = Number(upstream.headers.get('x-fallback-attempts') ?? 0)
        logger.info?.('[jarvis-freellmapi-proxy]', {
          method: request.method,
          route,
          status: upstream.status,
          durationMs: Date.now() - startedAt,
          ...(routedVia ? { routedVia: routedVia.slice(0, 160) } : {}),
          ...(Number.isFinite(fallbackAttempts) ? { fallbackAttempts: Math.max(0, Math.min(20, fallbackAttempts)) } : {}),
        })
      } catch (error) {
        if (!response.headersSent) {
          sendJson(response, controller.signal.aborted ? 504 : 502,
            controller.signal.aborted ? 'Upstream request timed out.' : 'Upstream provider gateway unavailable.')
        } else {
          response.destroy()
        }
        logger.warn?.('[jarvis-freellmapi-proxy] upstream request failed', {
          method: request.method,
          route,
          durationMs: Date.now() - startedAt,
          name: error?.name || 'Error',
        })
      } finally {
        clearTimeout(timeout)
      }
    })().catch(() => sendJson(response, 500, 'Gateway request failed.'))
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createGatewayProxy({
    origin: process.env.FREELLMAPI_ORIGIN || 'http://freellmapi:3001',
    gatewayToken: process.env.JARVIS_GATEWAY_TOKEN,
    upstreamApiKey: process.env.FREELLMAPI_API_KEY,
  })
  const port = Number(process.env.PORT || 3002)
  server.listen(port, '0.0.0.0', () => {
    console.log('[jarvis-freellmapi-proxy] listening on internal port ' + port)
  })
}
