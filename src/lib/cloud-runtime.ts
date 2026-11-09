/**
 * Explicit cloud-runtime composition root.
 *
 * Nothing in the existing HUD selects this runtime yet. The caller must
 * provide Supabase configuration and a secure token store (for example,
 * native Keychain); this module never chooses browser persistence or a
 * provider fallback.
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

  const api = createCloudApiClient({
    baseUrl: options.supabaseUrl,
    getAccessToken: auth.getAccessToken,
    fetchImpl: options.fetchImpl,
  })

  const brain = createCloudBrain(api)

  return { auth, api, brain }
}
