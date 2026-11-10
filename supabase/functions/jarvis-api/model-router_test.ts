import {
  assertConsistentProviderPrivacy,
  assertZdrProviderConfig,
  classifyProviderFailure,
  redactProviderDiagnostic,
  ProviderUnavailableError,
  providerRoutingOptions,
  toChatCompletionsUrl,
} from './model-router.ts'

Deno.test('default provider routing does not add privacy overrides', () => {
  const options = providerRoutingOptions()
  if ('provider' in options) throw new Error('default routing unexpectedly changed provider selection')
})

Deno.test('ZDR mode requires zero-retention and no-data-collection endpoints', () => {
  const options = providerRoutingOptions('zdr')
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
