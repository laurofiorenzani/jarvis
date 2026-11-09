import { createClient } from 'npm:@supabase/supabase-js@2'

const VERSION = 1
const MAX_TEXT = 100_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Json = Record<string, unknown>

function response(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}

function error(code: string, message: string, status: number, retryable = false, headers: HeadersInit = {}) {
  return response({
    version: VERSION,
    error: { code, message, requestId: crypto.randomUUID(), retryable },
  }, status, headers)
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = Deno.env.get('JARVIS_ALLOWED_ORIGIN')
  if (!allowed || !origin || origin !== allowed) return { Vary: 'Origin' }
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, content-type, x-jarvis-api-version',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  const cors = corsHeaders(origin)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/functions\/v1\/jarvis-api/, '').replace(/^\/v1(?=\/|$)/, '').replace(/\/$/, '') || '/'
  if (request.method === 'GET' && path === '/health') {
    return response({ version: VERSION, status: 'ok' }, 200, cors)
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return error('unauthenticated', 'Sign-in is required.', 401, false, cors)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return error('service_unavailable', 'Cloud service is not configured.', 503, true, cors)
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(match[1])
  if (authError || !authData.user) return error('unauthenticated', 'Session is invalid or expired.', 401, false, cors)

  const userId = authData.user.id
  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const consumeLimit = async (bucket: string, limit: number, windowSeconds: number) => {
    const { data, error: limitError } = await db.rpc('jarvis_consume_rate_limit', {
      p_user_id: userId, p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds,
    })
    return limitError ? null : data === true
  }

  if (request.method === 'POST' && path === '/conversations') {
    const allowed = await consumeLimit('conversation_create_hour', 30, 3600)
    if (allowed === null) return error('service_unavailable', 'Rate limiter is unavailable.', 503, true, cors)
    if (!allowed) return error('rate_limited', 'Too many conversations created. Try again later.', 429, true, cors)
    const { data, error: dbError } = await db
      .from('jarvis_conversations')
      .insert({ user_id: userId })
      .select('id,title,created_at,updated_at')
      .single()
    if (dbError || !data) return error('service_unavailable', 'Conversation could not be created.', 503, true, cors)
    return response({
      version: VERSION,
      conversation: {
        id: data.id, title: data.title,
        createdAt: data.created_at, updatedAt: data.updated_at,
      },
    }, 201, cors)
  }

  if (request.method === 'GET' && path === '/conversations') {
    const { data, error: dbError } = await db
      .from('jarvis_conversations')
      .select('id,title,created_at,updated_at')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (dbError) return error('service_unavailable', 'Conversations could not be loaded.', 503, true, cors)
    return response({
      version: VERSION,
      conversations: (data ?? []).map((item) => ({
        id: item.id, title: item.title,
        createdAt: item.created_at, updatedAt: item.updated_at,
      })),
    }, 200, cors)
  }

  const conversationMatch = path.match(/^\/conversations\/([0-9a-f-]+)$/i)
  if (request.method === 'DELETE' && conversationMatch) {
    const conversationId = conversationMatch[1]
    if (!UUID.test(conversationId)) return error('invalid_request', 'Invalid conversation ID.', 400, false, cors)
    const { data: deleted, error: deleteError } = await db.from('jarvis_conversations')
      .delete().eq('id', conversationId).eq('user_id', userId).select('id').maybeSingle()
    if (deleteError) return error('service_unavailable', 'Conversation could not be deleted.', 503, true, cors)
    if (!deleted) return error('forbidden', 'Conversation not found.', 404, false, cors)
    return response({ version: VERSION, deleted: true }, 200, cors)
  }

  if (request.method === 'GET' && conversationMatch) {
    const conversationId = conversationMatch[1]
    if (!UUID.test(conversationId)) return error('invalid_request', 'Invalid conversation ID.', 400, false, cors)
    const { data: conversation, error: conversationError } = await db
      .from('jarvis_conversations')
      .select('id,title,created_at,updated_at')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle()
    if (conversationError || !conversation) return error('forbidden', 'Conversation not found.', 404, false, cors)
    const { data: messages, error: messagesError } = await db
      .from('jarvis_messages')
      .select('id,role,content,created_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(500)
    if (messagesError) return error('service_unavailable', 'Messages could not be loaded.', 503, true, cors)
    return response({
      version: VERSION,
      conversation: {
        id: conversation.id, title: conversation.title,
        createdAt: conversation.created_at, updatedAt: conversation.updated_at,
      },
      messages: (messages ?? []).map((item) => ({
        id: item.id, role: item.role, content: item.content, createdAt: item.created_at,
      })),
    }, 200, cors)
  }

  if (request.method === 'POST' && path === '/turns/cancel') {
    let body: unknown
    try { body = await request.json() } catch { return error('invalid_request', 'Request body must be JSON.', 400, false, cors) }
    if (!isRecord(body) || body.version !== VERSION ||
        typeof body.conversationId !== 'string' || !UUID.test(body.conversationId) ||
        typeof body.turnId !== 'string' || !UUID.test(body.turnId)) {
      return error('invalid_request', 'Invalid cancellation payload.', 400, false, cors)
    }
    const { data: turn, error: cancelError } = await db.from('jarvis_turns')
      .update({ cancel_requested_at: new Date().toISOString(), status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', body.turnId).eq('conversation_id', body.conversationId).eq('user_id', userId)
      .in('status', ['accepted', 'running']).select('id').maybeSingle()
    if (cancelError) return error('service_unavailable', 'Turn could not be cancelled.', 503, true, cors)
    return response({ version: VERSION, cancelled: Boolean(turn) }, 200, cors)
  }

  if (request.method === 'POST' && path === '/turns') {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return error('service_unavailable', 'Model provider is not configured.', 503, true, cors)

    let body: unknown
    try { body = await request.json() } catch { return error('invalid_request', 'Request body must be JSON.', 400, false, cors) }
    if (!isRecord(body) || body.version !== VERSION ||
        typeof body.conversationId !== 'string' || !UUID.test(body.conversationId) ||
        typeof body.turnId !== 'string' || !UUID.test(body.turnId) ||
        typeof body.text !== 'string' || !body.text.trim() || body.text.length > MAX_TEXT) {
      return error('invalid_request', 'Invalid turn payload.', 400, false, cors)
    }
    const hourlyAllowed = await consumeLimit('turn_hour', 60, 3600)
    if (hourlyAllowed === null) return error('service_unavailable', 'Rate limiter is unavailable.', 503, true, cors)
    if (!hourlyAllowed) return error('rate_limited', 'Hourly turn limit reached.', 429, true, cors)
    const burstAllowed = await consumeLimit('turn_burst', 10, 300)
    if (burstAllowed === null) return error('service_unavailable', 'Rate limiter is unavailable.', 503, true, cors)
    if (!burstAllowed) return error('rate_limited', 'Too many recent turns. Try again shortly.', 429, true, cors)

    const conversationId = body.conversationId
    const turnId = body.turnId
    const text = body.text.trim()
    const { data: ownedConversation } = await db
      .from('jarvis_conversations').select('id')
      .eq('id', conversationId).eq('user_id', userId).maybeSingle()
    if (!ownedConversation) return error('forbidden', 'Conversation not found.', 404, false, cors)

    const { error: turnInsertError } = await db.from('jarvis_turns').insert({
      id: turnId, conversation_id: conversationId, user_id: userId,
      status: 'running', request_text: text,
    })
    if (turnInsertError) {
      const { data: existing } = await db.from('jarvis_turns').select('status')
        .eq('id', turnId).eq('user_id', userId).maybeSingle()
      if (existing) return error('invalid_request', 'This turn ID has already been used.', 409, false, cors)
      return error('service_unavailable', 'Turn could not be reserved.', 503, true, cors)
    }

    const { error: messageError } = await db.from('jarvis_messages').insert({
      conversation_id: conversationId, user_id: userId, role: 'user', content: text,
    })
    if (messageError) {
      await db.from('jarvis_turns').update({ status: 'failed', error_code: 'internal_error' })
        .eq('id', turnId).eq('user_id', userId)
      return error('service_unavailable', 'Message could not be saved.', 503, true, cors)
    }

    const { data: history } = await db.from('jarvis_messages')
      .select('role,content').eq('conversation_id', conversationId)
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(40)

    const upstreamAbort = new AbortController()
    let upstream: Response
    try {
      upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      signal: upstreamAbort.signal,
      body: JSON.stringify({
        model: Deno.env.get('JARVIS_MODEL') ?? 'claude-sonnet-4-5',
        max_tokens: 2048,
        stream: true,
        system: 'You are JARVIS, a precise and helpful personal assistant. Never claim to have performed an action unless a connected tool confirms it.',
        messages: (history ?? []).reverse().map((item) => ({ role: item.role, content: item.content })),
      }),
      })
    } catch {
      await db.from('jarvis_turns').update({ status: 'failed', error_code: 'service_unavailable' })
        .eq('id', turnId).eq('user_id', userId)
      return error('service_unavailable', 'Model provider could not be reached.', 503, true, cors)
    }
    if (!upstream.ok || !upstream.body) {
      await db.from('jarvis_turns').update({ status: 'failed', error_code: 'service_unavailable' })
        .eq('id', turnId).eq('user_id', userId)
      return error('service_unavailable', 'Model provider could not start the response.', 503, true, cors)
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = ''
        let answer = ''
        let cancelled = false
        const emit = (event: Json) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        emit({ version: VERSION, type: 'turn.started', conversationId, turnId })
        const reader = upstream.body!.getReader()
        try {
          while (true) {
            const { data: currentTurn } = await db.from('jarvis_turns')
              .select('cancel_requested_at')
              .eq('id', turnId).eq('user_id', userId).maybeSingle()
            if (currentTurn?.cancel_requested_at) {
              cancelled = true
              await reader.cancel()
              break
            }
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            if (buffer.length > 1_000_000 && !/\r?\n\r?\n/.test(buffer)) {
              throw new Error('upstream_frame_too_large')
            }
            let separator: RegExpExecArray | null
            while ((separator = /\r?\n\r?\n/.exec(buffer)) !== null) {
              const frame = buffer.slice(0, separator.index)
              buffer = buffer.slice(separator.index + separator[0].length)
              const dataLine = frame.split(/\r?\n/).find((line) => line.startsWith('data:'))
              if (!dataLine) continue
              const raw = dataLine.slice(5).trim()
              if (raw === '[DONE]') continue
              let event: Json
              try {
                const parsed = JSON.parse(raw)
                if (!isRecord(parsed)) continue
                event = parsed
              } catch { continue }
              if (event.type === 'error') throw new Error('upstream_model_error')
              if (event.type === 'content_block_delta' && isRecord(event.delta) &&
                  event.delta.type === 'text_delta' && typeof event.delta.text === 'string') {
                answer += event.delta.text
                emit({ version: VERSION, type: 'text.delta', conversationId, turnId, delta: event.delta.text })
              }
            }
          }
          if (cancelled) {
            await db.from('jarvis_turns').update({
              status: 'cancelled', completed_at: new Date().toISOString(),
            }).eq('id', turnId).eq('user_id', userId)
            emit({ version: VERSION, type: 'turn.cancelled', conversationId, turnId })
            controller.close()
            return
          }
          buffer += decoder.decode()
          if (!answer.trim()) throw new Error('empty_model_response')
          const { data: assistantMessage, error: saveError } = await db.from('jarvis_messages')
            .insert({ conversation_id: conversationId, user_id: userId, role: 'assistant', content: answer })
            .select('id,role,content,created_at').single()
          if (saveError || !assistantMessage) throw new Error('assistant_persist_failed')
          await db.from('jarvis_turns').update({
            status: 'completed', response_text: answer, completed_at: new Date().toISOString(),
          }).eq('id', turnId).eq('user_id', userId)
          await db.from('jarvis_conversations').update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId).eq('user_id', userId)
          emit({
            version: VERSION, type: 'turn.completed', conversationId, turnId,
            assistantMessage: {
              id: assistantMessage.id, role: 'assistant',
              content: assistantMessage.content, createdAt: assistantMessage.created_at,
            },
          })
          controller.close()
        } catch {
          const { data: state } = await db.from('jarvis_turns')
            .select('cancel_requested_at')
            .eq('id', turnId).eq('user_id', userId).maybeSingle()
          const wasCancelled = Boolean(state?.cancel_requested_at)
          await db.from('jarvis_turns').update({
            status: wasCancelled ? 'cancelled' : 'failed',
            error_code: wasCancelled ? null : 'internal_error',
            completed_at: new Date().toISOString(),
          }).eq('id', turnId).eq('user_id', userId)
          if (!wasCancelled) try {
            emit({
              version: VERSION, type: 'turn.failed', conversationId, turnId,
              code: 'internal_error', message: 'The response could not be completed.',
              retryable: true,
            })
            controller.close()
          } catch { /* Client disconnected; durable state was still updated. */ }
        } finally {
          reader.releaseLock()
        }
      },
      async cancel() {
        await db.from('jarvis_turns').update({
          status: 'cancelled', cancel_requested_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }).eq('id', turnId).eq('user_id', userId).in('status', ['accepted', 'running'])
        upstreamAbort.abort()
      },
    })
    return new Response(stream, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  return error('invalid_request', 'Route not found.', 404, false, cors)
})
