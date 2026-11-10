import {
  assertConsistentProviderPrivacy,
  assertZdrProviderConfig,
  ProviderUnavailableError,
  providerRoutingOptions,
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
