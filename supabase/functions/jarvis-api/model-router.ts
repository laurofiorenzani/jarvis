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
  /** Enforce OpenRouter/Cloudflare zero-retention endpoints when required. */
  privacyMode?: 'zdr'
  /** FreeLLMAPI is a self-hosted multi-provider gateway, not an individual model host. */
  gateway?: 'freellmapi'
  /** FreeLLMAPI routing hint; it still enforces its configured fallback chain and quotas. */
  taskType?: 'auto' | 'chat' | 'code'
}

type Provider = ProviderConfig & { apiKey?: string }

/** Per-isolate round robin prevents every Edge invocation favouring model zero. */
let providerCursor = 0

export function rotateProviderOrder<T>(providers: T[], cursor: number): T[] {
  if (providers.length < 2) return [...providers]
  const start = ((cursor % providers.length) + providers.length) % providers.length
  return [...providers.slice(start), ...providers.slice(0, start)]
}

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

/** ZDR providers must use an official endpoint and a configured server-side key.
 * Cloudflare Workers AI has built-in zero data retention for stateless inference;
 * OpenRouter requires its explicit ZDR and data-collection-deny request flags.
 */
export function assertEeaProviderEligibility(hostname: string): void {
  if (hostname === 'generativelanguage.googleapis.com') {
    throw new ProviderUnavailableError(
      'Gemini API is disabled for this Ireland/EEA JARVIS deployment. Google requires Paid Services for EEA API clients, and no paid provider is approved.',
    )
  }
}

export function assertProviderPrivacyMode(hostname: string, privacyMode?: 'zdr'): void {
  if (hostname === 'api.cloudflare.com' && privacyMode !== 'zdr') {
    throw new ProviderUnavailableError(
      'Cloudflare Workers AI must be configured with privacyMode set to "zdr".',
    )
  }
}

export function assertZdrProviderConfig(
  hostname: string,
  apiKeyEnv?: string,
  apiKey?: string,
  pathname?: string,
): void {
  const openRouter = hostname === 'openrouter.ai'
  const cloudflareWorkersAi = hostname === 'api.cloudflare.com' &&
    typeof pathname === 'string' &&
    /^\/client\/v4\/accounts\/[a-f0-9]{32}\/ai\/v1(?:\/chat\/completions)?$/i.test(pathname)
  if ((!openRouter && !cloudflareWorkersAi) || !apiKeyEnv || !apiKey) {
    throw new ProviderUnavailableError(
      'ZDR provider requires an approved OpenRouter or Cloudflare Workers AI endpoint and a configured server-side API key.',
    )
  }
}

export function isAllowedStandardProvider(gateway: unknown): boolean {
  return gateway === 'freellmapi'
}

function configuredProviders(secretName = 'JARVIS_MODEL_PROVIDERS'): Provider[] {
  const raw = Deno.env.get(secretName)?.trim()
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
    if (item.gateway !== undefined && item.gateway !== 'freellmapi') continue
    if (item.taskType !== undefined && !['auto', 'chat', 'code'].includes(String(item.taskType))) continue
    const gateway = item.gateway === 'freellmapi' ? 'freellmapi' : undefined
    const taskType = item.taskType === 'chat' || item.taskType === 'code' ? item.taskType : 'auto'
    // Keep the default pool strict: only explicitly ZDR providers are accepted.
    // Standard-retention gateways/providers must use the separately consented pool.
    if (secretName === 'JARVIS_MODEL_PROVIDERS' && item.privacyMode !== 'zdr') continue
    if (gateway === 'freellmapi' &&
        (secretName !== 'JARVIS_MODEL_PROVIDERS_STANDARD' || !isFreeLlmApiModel(item.model))) continue
    if (secretName === 'JARVIS_MODEL_PROVIDERS_STANDARD' && item.privacyMode === 'zdr') continue
    let url: URL
    try { url = new URL(item.baseUrl) } catch { continue }
    // Secrets are server-side only. Reject non-HTTPS endpoints and URL-embedded
    // credentials to avoid accidental credential leakage and local SSRF targets.
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.search || url.hash || !item.name.trim() || !item.model.trim() ||
        (item.privacyMode !== undefined && item.privacyMode !== 'zdr')) continue
    assertEeaProviderEligibility(url.hostname)
    assertProviderPrivacyMode(url.hostname, item.privacyMode === 'zdr' ? 'zdr' : undefined)
    const apiKeyEnv = typeof item.apiKeyEnv === 'string' ? item.apiKeyEnv : undefined
    const apiKey = apiKeyEnv ? Deno.env.get(apiKeyEnv)?.trim() : undefined
    // FreeLLMAPI can route to many independently operated providers. It must
    // stay in the standard-privacy pool unless its active chain is independently
    // proven to contain only approved ZDR providers (not assumed from its API).
    if (gateway === 'freellmapi' && (item.privacyMode === 'zdr' || !apiKeyEnv || !apiKey)) continue
    if (item.privacyMode === 'zdr') {
      // Do not skip an invalid ZDR entry and fall back to a standard provider.
      assertZdrProviderConfig(url.hostname, apiKeyEnv, apiKey, url.pathname)
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
      ...(gateway ? { gateway } : {}),
      ...(gateway ? { taskType } : {}),
    })
  }
  assertConsistentProviderPrivacy(providers)
  return providers
}

/** Safe provider diagnostics; never returns secret values or environment variable names. */
/** Exposes only safe provider identity metadata for the client-side fail-closed activation check. */
export function getFreeProviderStatus(): {
  configured: boolean
  providers: { name: string; model: string; providerType: string; privacyMode: 'zdr' | 'standard'; pool: 'default' | 'standard' }[]
  speechProvider: 'cloudflare-whisper' | 'unconfigured'
} {
  const defaultProviders = configuredProviders('JARVIS_MODEL_PROVIDERS')
  const standardProviders = configuredProviders('JARVIS_MODEL_PROVIDERS_STANDARD')
  const providers = [
    ...defaultProviders.map((provider) => ({ ...provider, pool: 'default' as const })),
    ...standardProviders.map((provider) => ({ ...provider, pool: 'standard' as const })),
  ]
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')?.trim()
  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')?.trim()
  const speechProvider = /^[a-f0-9]{32}$/i.test(accountId ?? '') && apiToken
    ? 'cloudflare-whisper'
    : 'unconfigured'
  return {
    configured: providers.length > 0,
    providers: providers.map(({ name, model, baseUrl, privacyMode, gateway, pool }) => ({
      name,
      model,
      providerType: gateway === 'freellmapi'
        ? 'freellmapi'
        : new URL(baseUrl).hostname === 'api.cloudflare.com' ? 'cloudflare-workers-ai' : 'other',
      privacyMode: privacyMode ?? 'standard',
      pool,
    })),
    speechProvider,
  }
}

/** Request-level privacy controls for providers with explicit routing flags. */
export function providerRoutingOptions(privacyMode?: 'zdr', hostname?: string): Record<string, unknown> {
  if (privacyMode !== 'zdr') return {}
  // Cloudflare Workers AI's direct inference endpoint applies ZDR by default.
  // Do not send OpenRouter-specific fields to Cloudflare.
  return hostname === 'openrouter.ai'
    ? { provider: { zdr: true, data_collection: 'deny' } }
    : {}
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 ||
    status === 429 || status >= 500
}

/** Classify upstream failures without conflating missing models with exhausted quota. */
export function classifyProviderFailure(status: number): string {
  if (status === 404) return 'model_or_endpoint_not_found'
  if (status === 401 || status === 403) return 'authentication_or_access'
  if (status === 429) return 'rate_limit_or_quota'
  if (status === 408 || status === 409 || status === 425 || status >= 500) return 'temporary_provider_failure'
  return 'provider_request_rejected'
}

/** Redact common credential formats before writing bounded provider error details to logs. */
export function redactProviderDiagnostic(value: string): string {
  return value.slice(0, 1_200)
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_KEY]')
    .replace(/sk-[0-9A-Za-z_-]{16,}/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
}

export function toChatCompletionsUrl(baseUrl: string): string {
  // OpenAI-compatible gateways use different roots; Cloudflare Workers AI
  // uses an account-scoped /ai/v1 path, which already ends in /v1.
  return baseUrl.endsWith('/chat/completions')
    ? baseUrl
    : baseUrl.endsWith('/v1') || baseUrl.endsWith('/openai')
      ? baseUrl + '/chat/completions'
      : baseUrl + '/v1/chat/completions'
}

/**
 * Returns a normalized SSE response whose data frames use the minimal
 * Anthropic-compatible content_block_delta shape consumed by jarvis-api.
 */
export type ModelProviderPool = 'default' | 'standard'
export type FreeLlmApiTaskType = 'auto' | 'chat' | 'code'

export function isFreeLlmApiModel(model: string): boolean {
  return /^auto:[a-z0-9][a-z0-9_-]{0,39}$/i.test(model.trim())
}

export function freeLlmApiTaskHeaders(taskType: FreeLlmApiTaskType = 'auto'): Record<string, string> {
  return { 'X-FreeLLM-Task-Type': taskType }
}

export function classifyFreeLlmTask(text: string): FreeLlmApiTaskType {
  if (/(?:\b(?:code|coding|program|programming|script|function|typescript|javascript|python|sql|debug|stack trace|compile|commit|pull request|repository|git|npm|api)\b|c[oó]digo|programa[cç][aã]o|depurar|reposit[oó]rio)/i.test(text)) return 'code'
  if (text.length < 500) return 'chat'
  return 'auto'
}

export async function startFreeModelStream(
  messages: ChatMessage[],
  signal: AbortSignal,
  options: { pool?: ModelProviderPool; taskType?: FreeLlmApiTaskType } = {},
): Promise<{ response: Response; provider: string }> {
  const secretName = options.pool === 'standard'
    ? 'JARVIS_MODEL_PROVIDERS_STANDARD'
    : 'JARVIS_MODEL_PROVIDERS'
  const providers = configuredProviders(secretName)
  if (!providers.length) throw new ProviderUnavailableError()

  let lastFailure: unknown
  const orderedProviders = rotateProviderOrder(providers, providerCursor++)
  for (const provider of orderedProviders) {
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
          ...(provider.gateway === 'freellmapi'
            ? freeLlmApiTaskHeaders(options.taskType ?? provider.taskType ?? 'auto')
            : {}),
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          stream: true,
          temperature: 0.4,
          ...providerRoutingOptions(provider.privacyMode, new URL(provider.baseUrl).hostname),
        }),
        // The 25-second deadline applies only to connection/response headers.
        // Keep the caller's signal attached for the full stream lifetime, but
        // disarm the connection timer as soon as headers arrive.
        signal: AbortSignal.any([signal, connectController.signal]),
      })
    } catch (cause) {
      if (signal.aborted) throw new DOMException('The request was cancelled.', 'AbortError')
      lastFailure = cause
      console.warn('[jarvis] model provider connection failed', {
        provider: provider.name,
        error: cause instanceof Error ? cause.name : 'unknown',
      })
      continue
    } finally {
      clearTimeout(connectTimeout)
    }

    if (!upstream.ok || !upstream.body) {
      // Capture a small, bounded upstream error detail for operator diagnostics.
      // Never log request headers, API keys, prompts, or response bodies wholesale.
      let upstreamDetail = ''
      try {
        const rawDetail = await upstream.text()
        upstreamDetail = redactProviderDiagnostic(rawDetail)
      } catch { /* diagnostic body is optional */ }
      lastFailure = new Error('Provider returned HTTP ' + upstream.status)
      console.warn('[jarvis] model provider returned non-success status', {
        provider: provider.name,
        model: provider.model,
        status: upstream.status,
        detail: upstreamDetail,
        classification: classifyProviderFailure(upstream.status),
      })
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
    lastFailure ? 'All configured free model providers are unavailable. Check provider diagnostics for model, endpoint, access, or quota errors.' :
      'No configured free model provider is available.',
  )
}
