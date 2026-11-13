import {
  assertConsistentProviderPrivacy,
  assertZdrProviderConfig,
  assertEeaProviderEligibility,
  assertProviderPrivacyMode,
  classifyProviderFailure,
  freeLlmApiTaskHeaders,
  isFreeLlmApiModel,
  redactProviderDiagnostic,
  rotateProviderOrder,
  ProviderUnavailableError,
  providerRoutingOptions,
  toChatCompletionsUrl,
} from './model-router.ts'

Deno.test('default provider routing does not add privacy overrides', () => {
  const options = providerRoutingOptions()
  if ('provider' in options) throw new Error('default routing unexpectedly changed provider selection')
})

Deno.test('ZDR mode requires zero-retention and no-data-collection endpoints', () => {
  const options = providerRoutingOptions('zdr', 'openrouter.ai')
  const provider = options.provider as { zdr?: boolean; data_collection?: string } | undefined
  if (provider?.zdr !== true || provider.data_collection !== 'deny') {
    throw new Error('strict ZDR routing was not enforced')
  }
})

Deno.test('ZDR provider requires official OpenRouter host and server-side key', () => {
  assertZdrProviderConfig('openrouter.ai', 'OPENROUTER_API_KEY', 'test-key')
  for (const invalid of [
    ['api.groq.com', 'OPENROUTER_API_KEY', 'test-key'],
    ['openrouter.ai', undefined, 'test-key'],
    ['openrouter.ai', 'OPENROUTER_API_KEY', undefined],
  ] as const) {
    let caught: unknown
    try {
      assertZdrProviderConfig(invalid[0], invalid[1], invalid[2])
    } catch (error) {
      caught = error
    }
    if (!(caught instanceof ProviderUnavailableError)) {
      throw new Error('invalid ZDR provider configuration was not rejected')
    }
  }
})

Deno.test('provider failover cannot mix ZDR and standard privacy tiers', () => {
  let caught: unknown
  try {
    assertConsistentProviderPrivacy([{ privacyMode: 'zdr' }, {}])
  } catch (error) {
    caught = error
  }
  if (!(caught instanceof ProviderUnavailableError)) {
    throw new Error('mixed privacy configuration was not rejected')
  }
})

Deno.test('provider failover allows multiple endpoints with the same privacy tier', () => {
  assertConsistentProviderPrivacy([{ privacyMode: 'zdr' }, { privacyMode: 'zdr' }])
  assertConsistentProviderPrivacy([{}, {}])
})

Deno.test('Gemini OpenAI-compatible endpoint appends chat completions without an extra v1 segment', () => {
  const actual = toChatCompletionsUrl('https://generativelanguage.googleapis.com/v1beta/openai')
  const expected = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
  if (actual !== expected) throw new Error('unexpected Gemini endpoint: ' + actual)
})

Deno.test('provider errors distinguish missing model from quota exhaustion', () => {
  const cases: Array<[number, string]> = [
    [404, 'model_or_endpoint_not_found'],
    [401, 'authentication_or_access'],
    [403, 'authentication_or_access'],
    [429, 'rate_limit_or_quota'],
    [503, 'temporary_provider_failure'],
    [400, 'provider_request_rejected'],
  ]
  for (const [status, expected] of cases) {
    if (classifyProviderFailure(status) !== expected) {
      throw new Error(`HTTP ${status} was not classified as ${expected}`)
    }
  }
})

Deno.test('provider diagnostics redact common API key and bearer token patterns', () => {
  const input = 'key=AIza' + 'A'.repeat(30) + ' secret=sk-' + 'B'.repeat(24) + ' Authorization: Bearer private-token'
  const result = redactProviderDiagnostic(input)
  if (result.includes('AIza') || result.includes('sk-B') || result.includes('private-token')) {
    throw new Error('provider diagnostic leaked a credential pattern')
  }
  if (!result.includes('[REDACTED_KEY]') || !result.includes('Bearer [REDACTED]')) {
    throw new Error('provider diagnostic did not mark redacted credentials')
  }
  if (redactProviderDiagnostic('x'.repeat(1_300)).length !== 1_200) {
    throw new Error('provider diagnostic exceeded its length bound')
  }
})

Deno.test('free model routing rotates its starting provider fairly', () => {
  const providers = ['gemini-fast', 'gemini-pro', 'gemma']
  const expected = [
    ['gemini-fast', 'gemini-pro', 'gemma'],
    ['gemini-pro', 'gemma', 'gemini-fast'],
    ['gemma', 'gemini-fast', 'gemini-pro'],
    ['gemini-fast', 'gemini-pro', 'gemma'],
  ]
  expected.forEach((order, cursor) => {
    if (JSON.stringify(rotateProviderOrder(providers, cursor)) !== JSON.stringify(order)) {
      throw new Error(`unexpected provider order at cursor ${cursor}`)
    }
  })
  if (rotateProviderOrder([], 0).length !== 0) throw new Error('empty provider list should remain empty')
})


Deno.test('Cloudflare Workers AI ZDR requires the official account chat endpoint and server-side key', () => {
  const accountId = 'ba87bf4587d1167de0d075972d14a05c'
  assertZdrProviderConfig('api.cloudflare.com', 'CLOUDFLARE_API_TOKEN', 'test-token', `/client/v4/accounts/${accountId}/ai/v1`)
  assertZdrProviderConfig('api.cloudflare.com', 'CLOUDFLARE_API_TOKEN', 'test-token', `/client/v4/accounts/${accountId}/ai/v1/chat/completions`)
  for (const invalid of [
    ['api.cloudflare.com', 'CLOUDFLARE_API_TOKEN', 'test-token', '/client/v4/accounts/not-an-id/ai/v1'],
    ['api.cloudflare.com', 'CLOUDFLARE_API_TOKEN', 'test-token', '/client/v4/accounts/ba87bf4587d1167de0d075972d14a05c/ai/v2'],
    ['api.groq.com', 'CLOUDFLARE_API_TOKEN', 'test-token', '/v1'],
  ] as const) {
    let caught: unknown
    try { assertZdrProviderConfig(invalid[0], invalid[1], invalid[2], invalid[3]) } catch (error) { caught = error }
    if (!(caught instanceof ProviderUnavailableError)) throw new Error('invalid Cloudflare ZDR endpoint was accepted')
  }
})

Deno.test('Cloudflare native ZDR does not receive OpenRouter-only routing flags', () => {
  const options = providerRoutingOptions('zdr', 'api.cloudflare.com')
  if ('provider' in options) throw new Error('OpenRouter privacy flags leaked into Cloudflare request')
})

Deno.test('Cloudflare Workers AI base URL appends the OpenAI-compatible chat path', () => {
  const actual = toChatCompletionsUrl('https://api.cloudflare.com/client/v4/accounts/ba87bf4587d1167de0d075972d14a05c/ai/v1')
  const expected = 'https://api.cloudflare.com/client/v4/accounts/ba87bf4587d1167de0d075972d14a05c/ai/v1/chat/completions'
  if (actual !== expected) throw new Error('unexpected Cloudflare chat endpoint: ' + actual)
})


Deno.test('Gemini API is blocked for the Ireland/EEA JARVIS runtime until paid service is explicitly approved', () => {
  let caught: unknown
  try { assertEeaProviderEligibility('generativelanguage.googleapis.com') } catch (error) { caught = error }
  if (!(caught instanceof ProviderUnavailableError)) throw new Error('Gemini API was not blocked for the EEA runtime')
  assertEeaProviderEligibility('api.cloudflare.com')
})

Deno.test('Cloudflare Workers AI must declare its native ZDR privacy mode', () => {
  assertProviderPrivacyMode('api.cloudflare.com', 'zdr')
  let caught: unknown
  try { assertProviderPrivacyMode('api.cloudflare.com', undefined) } catch (error) { caught = error }
  if (!(caught instanceof ProviderUnavailableError)) throw new Error('Cloudflare provider without ZDR was accepted')
  assertProviderPrivacyMode('api.groq.com', undefined)
})


Deno.test('FreeLLMAPI accepts only router strategies and named auto profiles', () => {
  for (const model of ['auto', 'auto:fast', 'auto:smart', 'auto:reliable', 'auto:jarvis-code', 'fusion']) {
    if (!isFreeLlmApiModel(model)) throw new Error('valid FreeLLMAPI route rejected: ' + model)
  }
  for (const model of ['gemini-2.5-flash', 'http://localhost:3001', 'auto:../admin', '', 'fusion:paid']) {
    if (isFreeLlmApiModel(model)) throw new Error('invalid FreeLLMAPI route accepted: ' + model)
  }
})

Deno.test('FreeLLMAPI task hints are explicit and OpenAI-compatible requests stay unchanged', () => {
  const headers = freeLlmApiTaskHeaders('code')
  if (headers['X-FreeLLM-Task-Type'] !== 'code') throw new Error('FreeLLMAPI code task hint missing')
  if (Object.keys(freeLlmApiTaskHeaders()).length !== 1 ||
      freeLlmApiTaskHeaders()['X-FreeLLM-Task-Type'] !== 'auto') {
    throw new Error('FreeLLMAPI default task hint must be auto')
  }
})
