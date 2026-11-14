export type SpeechProviderPreference = {
  zdr_pool_enabled?: unknown
  policy_version?: unknown
} | null

export type SpeechProviderStatus = {
  speechProvider?: unknown
  providers?: readonly {
    pool?: unknown
    privacyMode?: unknown
  }[]
} | null

/**
 * Cloud STT may send account audio to Cloudflare Workers AI. Require the same
 * current-policy, per-account ZDR opt-in as the UI and require an available
 * Cloudflare Whisper route plus at least one approved default ZDR chat provider.
 */
export function isApprovedZdrSpeechRoute(
  preference: SpeechProviderPreference,
  status: SpeechProviderStatus,
  policyVersion: string,
): boolean {
  return preference?.zdr_pool_enabled === true &&
    preference.policy_version === policyVersion &&
    status?.speechProvider === 'cloudflare-whisper' &&
    Array.isArray(status.providers) &&
    status.providers.some((provider) =>
      provider.pool === 'default' && provider.privacyMode === 'zdr'
    )
}
