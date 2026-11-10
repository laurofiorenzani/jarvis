/**
 * Server-side model provider rotation for JARVIS.
 *
 * Providers are configured by an operator through Supabase Edge Function
 * secrets. Each provider must explicitly declare tier=free and
 * billingMode=free_quota_only or it is rejected. This module only speaks the
 * OpenAI-compatible Chat Completions streaming protocol.
 *
 * The router retries another provider only before any answer bytes have been
 * delivered. It never silently falls back to a paid provider: every configured
 * endpoint is an explicit operator choice. Configuration labels are not proof
 * of provider billing settings; account-side paid billing must also be disabled.
 */
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type ProviderConfig = {
  name: string
  baseUrl: string
  model: string
  /** Explicit operator assertion that this endpoint is free-tier only. */
  tier: 'free'
  billingMode: 'free_quota_only'
  apiKeyEnv?: string
  /** Enforce OpenRouter Zero Data Retention endpoints when privacy matters. */
  privacyMode?: 'zdr'
}

type Provider = ProviderConfig & { apiKey?: string }

export class ProviderUnavailableError extends Error {
  constructor(message = 'No free model provider is currently available.') {
    super(message)
    this.name = 'ProviderUnavailableError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Prevent failover from silently downgrading a request's privacy tier. */
export function assertConsistentProviderPrivacy(
  providers: Array<{ privacyMode?: 'zdr' }>,
): void {
  const tiers = new Set(providers.map((provider) => provider.privacyMode === 'zdr' ? 'zdr' : 'standard'))
  if (tiers.size > 1) {
    throw new ProviderUnavailableError('Provider failover cannot mix ZDR and standard privacy modes.')
  }
}

/** ZDR is only meaningful on OpenRouter and must be authenticated server-side. */
export function assertZdrProviderConfig(
  hostname: string,
  apiKeyEnv?: string,
  apiKey?: string,
): void {
  if (hostname !== 'openrouter.ai' || !apiKeyEnv || !apiKey) {
    throw new ProviderUnavailableError(
      'ZDR provider requires the official OpenRouter host and a configured server-side API key.',
    )
  }
}

function configuredProviders(): Provider[] {
  const raw = Deno.env.get('JARVIS_MODEL_PROVIDERS')?.trim()
  if (!raw) return []
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch {
    throw new ProviderUnavailableError('Model provider configuration is invalid.')
  }
  if (!Array.isArray(parsed) || parsed.length > 20) {
    throw new ProviderUnavailableError('Model provider configuration must be an array of at most 20 entries.')
  }
  const providers: Provider[] = []
  for (const item of parsed) {
    if (!isRecord(item) || typeof item.name !== 'string' ||
        typeof item.baseUrl !== 'string' || typeof item.model !== 'string' ||
        item.tier !== 'free' || item.billingMode !== 'free_quota_only') continue
    let url: URL
    try { url = new URL(item.baseUrl) } catch { continue }
    // Secrets are server-side only. Reject non-HTTPS endpoints and URL-embedded
    // credentials to avoid accidental credential leakage and local SSRF targets.
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.search || url.hash || !item.name.trim() || !item.model.trim() ||
        (item.privacyMode !== undefined && item.privacyMode !== 'zdr')) continue
    const apiKeyEnv = typeof item.apiKeyEnv === 'string' ? item.apiKeyEnv : undefined
    const apiKey = apiKeyEnv ? Deno.env.get(apiKeyEnv)?.trim() : undefined
    if (item.privacyMode === 'zdr') {
      // Do not skip an invalid ZDR entry and fall back to a standard provider.
      assertZdrProviderConfig(url.hostname, apiKeyEnv, apiKey)
    }
    if (apiKeyEnv && !apiKey) continue
    providers.push({
      name: item.name.trim().slice(0, 60),
      baseUrl: url.toString().replace(/\/$/, ''),
      model: item.model.trim().slice(0, 160),
      tier: 'free',
      billingMode: 'free_quota_only',
      ...(apiKeyEnv ? { apiKeyEnv } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...(item.privacyMode === 'zdr' ? { privacyMode: 'zdr' as const } : {}),
    })
  }
  assertConsistentProviderPrivacy(providers)
  return providers
}

/** Safe provider diagnostics; never returns secret values or environment variable names. */
export function getFreeProviderStatus(): {
  configured: boolean
  providers: { name: string; model: string }[]
} {
  const providers = configuredProviders()
  return {
    configured: providers.length > 0,
    providers: providers.map(({ name, model }) => ({ name, model })),
  }
}

/** Request-level privacy controls for OpenRouter-compatible endpoints. */
export function providerRoutingOptions(privacyMode?: 'zdr'): Record<string, unknown> {
  return privacyMode === 'zdr'
    ? { provider: { zdr: true, data_collection: 'deny' } }
    : {}
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 ||
    status === 429 || status >= 500
}

function toChatCompletionsUrl(baseUrl: string): string {
  return baseUrl.endsWith('/chat/completions')
    ? baseUrl
    : baseUrl.endsWith('/v1')
      ? baseUrl + '/chat/completions'
      : baseUrl + '/v1/chat/completions'
}

/**
 * Returns a normalized SSE response whose data frames use the minimal
 * Anthropic-compatible content_block_delta shape consumed by jarvis-api.
 */
export async function startFreeModelStream(
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<{ response: Response; provider: string }> {
  const providers = configuredProviders()
  if (!providers.length) throw new ProviderUnavailableError()

  let lastFailure: unknown
  for (const provider of providers) {
    if (signal.aborted) throw new DOMException('The request was cancelled.', 'AbortError')
    let upstream: Response
    const connectController = new AbortController()
    const connectTimeout = setTimeout(() => connectController.abort(), 25_000)
    try {
      upstream = await fetch(toChatCompletionsUrl(provider.baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(provider.apiKey ? { Authorization: 'Bearer ' + provider.apiKey } : {}),
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          stream: true,
          temperature: 0.4,
          ...providerRoutingOptions(provider.privacyMode),
        }),
        // The 25-second deadline applies only to connection/response headers.
        // Keep the caller's signal attached for the full stream lifetime, but
        // disarm the connection timer as soon as headers arrive.
        signal: AbortSignal.any([signal, connectController.signal]),
      })
    } catch (cause) {
      if (signal.aborted) throw new DOMException('The request was cancelled.', 'AbortError')
      lastFailure = cause
      continue
    } finally {
      clearTimeout(connectTimeout)
    }

    if (!upstream.ok || !upstream.body) {
      lastFailure = new Error('Provider returned HTTP ' + upstream.status)
      try { await upstream.body?.cancel() } catch { /* ignore */ }
      if (retryableStatus(upstream.status)) continue
      // Configuration/auth errors are isolated to this provider; try the next
      // configured free endpoint rather than exposing provider details.
      continue
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const reader = upstream.body.getReader()
    const normalized = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = ''
        let delivered = false
        const emit = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify(event) + '\n\n'))
        }
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            if (buffer.length > 1_000_000 && !/\r?\n\r?\n/.test(buffer)) {
              throw new Error('provider_frame_too_large')
            }
            let separator: RegExpExecArray | null
            while ((separator = /\r?\n\r?\n/.exec(buffer)) !== null) {
              const frame = buffer.slice(0, separator.index)
              buffer = buffer.slice(separator.index + separator[0].length)
              const dataLine = frame.split(/\r?\n/).find((line) => line.startsWith('data:'))
              if (!dataLine) continue
              const raw = dataLine.slice(5).trim()
              if (!raw || raw === '[DONE]') continue
              let parsed: unknown
              try { parsed = JSON.parse(raw) } catch { continue }
              if (!isRecord(parsed)) continue
              if (isRecord(parsed.error)) throw new Error('provider_stream_error')
              const choices = Array.isArray(parsed.choices) ? parsed.choices : []
              const choice = choices[0]
              if (!isRecord(choice) || !isRecord(choice.delta)) continue
              const text = choice.delta.content
              if (typeof text === 'string' && text.length) {
                delivered = true
                emit({ type: 'content_block_delta', delta: { type: 'text_delta', text } })
              } else if (Array.isArray(text)) {
                for (const part of text) {
                  if (isRecord(part) && typeof part.text === 'string' && part.text.length) {
                    delivered = true
                    emit({ type: 'content_block_delta', delta: { type: 'text_delta', text: part.text } })
                  }
                }
              }
            }
          }
          buffer += decoder.decode()
          // Some compatible providers close the stream without the final blank
          // line. Parse that trailing SSE frame instead of silently dropping it.
          if (buffer.trim()) {
            const dataLine = buffer.split(/\r?\n/).find((line) => line.startsWith('data:'))
            if (dataLine) {
              const raw = dataLine.slice(5).trim()
              if (raw && raw !== '[DONE]') {
                let parsed: unknown
                try { parsed = JSON.parse(raw) } catch { throw new Error('provider_stream_malformed') }
                if (isRecord(parsed)) {
                  if (isRecord(parsed.error)) throw new Error('provider_stream_error')
                  const choices = Array.isArray(parsed.choices) ? parsed.choices : []
                  const choice = choices[0]
                  if (isRecord(choice) && isRecord(choice.delta)) {
                    const text = choice.delta.content
                    if (typeof text === 'string' && text.length) {
                      delivered = true
                      emit({ type: 'content_block_delta', delta: { type: 'text_delta', text } })
                    } else if (Array.isArray(text)) {
                      for (const part of text) {
                        if (isRecord(part) && typeof part.text === 'string' && part.text.length) {
                          delivered = true
                          emit({ type: 'content_block_delta', delta: { type: 'text_delta', text: part.text } })
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          emit({ type: 'message_stop' })
          controller.close()
        } catch {
          // Once text has reached the client, switching models would duplicate
          // or contradict the partial answer. Fail this turn cleanly instead.
          controller.error(new Error(delivered ? 'provider_stream_interrupted' : 'provider_stream_failed'))
        } finally {
          reader.releaseLock()
        }
      },
      async cancel() {
        await reader.cancel()
      },
    })
    return {
      provider: provider.name,
      response: new Response(normalized, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' },
      }),
    }
  }
  throw new ProviderUnavailableError(
    lastFailure ? 'All configured free model providers failed or exhausted their quota.' :
      'No configured free model provider is available.',
  )
}
