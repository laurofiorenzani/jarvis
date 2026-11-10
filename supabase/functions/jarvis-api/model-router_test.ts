import { providerRoutingOptions } from './model-router.ts'

Deno.test('default provider routing does not add privacy overrides', () => {
  const options = providerRoutingOptions()
  if ('provider' in options) throw new Error('default routing unexpectedly changed provider selection')
})

Deno.test('ZDR mode requires zero-retention provider endpoints', () => {
  const options = providerRoutingOptions('zdr')
  const provider = options.provider as { zdr?: boolean } | undefined
  if (provider?.zdr !== true) throw new Error('ZDR routing was not enforced')
})
