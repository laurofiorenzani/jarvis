/**
 * Explicit cloud-runtime composition root.
 *
 * The CloudAccess HUD selects this runtime after an explicit user sign-in.
 * The caller must provide Supabase configuration and a token store (for
 * example, ephemeral web storage or native Keychain); this module never
 * chooses persistence or a provider fallback.
 */
import { createCloudApiClient, type CloudFetch } from './cloud-api'
import { createCloudBrain } from './cloud-brain'
import { createSupabaseAuth, type SecureTokenStore } from './cloud-auth'

export type CloudRuntimeOptions = {
  supabaseUrl: string
  supabasePublishableKey: string
  tokenStore: SecureTokenStore
  fetchImpl?: CloudFetch
}

export function createCloudRuntime(options: CloudRuntimeOptions) {
  if (!options.supabasePublishableKey.trim()) {
    throw new Error('Supabase publishable key is required.')
  }

  const auth = createSupabaseAuth({
    url: options.supabaseUrl,
    anonKey: options.supabasePublishableKey,
    storage: options.tokenStore,
    fetchImpl: options.fetchImpl,
  })

  // Supabase Edge Functions are mounted below /functions/v1/<function>.
  // The project origin itself is used only for Supabase Auth.
  const functionUrl = new URL('/functions/v1/jarvis-preview-api', options.supabaseUrl).toString().replace(/\/$/, '')
  const api = createCloudApiClient({
    baseUrl: functionUrl,
    publishableKey: options.supabasePublishableKey,
    getAccessToken: auth.getAccessToken,
    fetchImpl: options.fetchImpl,
  })

  const brain = createCloudBrain(api)

  return { auth, api, brain }
}
