import { isApprovedZdrSpeechRoute } from './provider-consent.ts'

function assertEquals(actual: unknown, expected: unknown, message = 'unexpected value'): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
}

const policyVersion = '2026-11-13-v2'
const acceptedPreference = { zdr_pool_enabled: true, policy_version: policyVersion }
const approvedStatus = {
  speechProvider: 'cloudflare-whisper',
  providers: [{ pool: 'default', privacyMode: 'zdr' }],
}

Deno.test('allows Cloudflare Whisper only with current per-account ZDR consent', () => {
  assertEquals(isApprovedZdrSpeechRoute(acceptedPreference, approvedStatus, policyVersion), true)
})

Deno.test('fails closed when speech consent is absent, disabled or stale', () => {
  assertEquals(isApprovedZdrSpeechRoute(null, approvedStatus, policyVersion), false)
  assertEquals(isApprovedZdrSpeechRoute({ ...acceptedPreference, zdr_pool_enabled: false }, approvedStatus, policyVersion), false)
  assertEquals(isApprovedZdrSpeechRoute({ ...acceptedPreference, policy_version: 'old-policy' }, approvedStatus, policyVersion), false)
})

Deno.test('fails closed when Whisper or the default ZDR pool is unavailable', () => {
  assertEquals(isApprovedZdrSpeechRoute(acceptedPreference, null, policyVersion), false)
  assertEquals(isApprovedZdrSpeechRoute(acceptedPreference, { ...approvedStatus, speechProvider: 'unconfigured' }, policyVersion), false)
  assertEquals(isApprovedZdrSpeechRoute(acceptedPreference, { ...approvedStatus, providers: [] }, policyVersion), false)
  assertEquals(isApprovedZdrSpeechRoute(acceptedPreference, {
    ...approvedStatus,
    providers: [{ pool: 'standard', privacyMode: 'standard' }],
  }, policyVersion), false)
})
