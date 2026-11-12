/**
 * Validate the Supabase confirmation URL carried by the email interstitial.
 *
 * Email security scanners may prefetch one-time Supabase verification links.
 * The interstitial must never auto-navigate: it only releases a validated
 * confirmation URL after an explicit user click.
 */
export const SUPABASE_AUTH_ORIGIN = 'https://undmhmdwhxvjgvezvucy.supabase.co'
export const JARVIS_AUTH_REDIRECT_ORIGIN = 'https://jarvis-lauro-fiorenzani.vercel.app'
// Exact allowlist: production plus the stable preview URL for the integration branch.
// Arbitrary Vercel preview deployments and lookalike subdomains remain rejected.
export const JARVIS_AUTH_REDIRECT_ORIGINS = new Set([
  JARVIS_AUTH_REDIRECT_ORIGIN,
  'https://jarvis-git-work-memory-integration-ready-lauro-fiorenzani.vercel.app',
])

export function getSafeConfirmationUrl(raw: string | null): string | null {
  if (!raw?.trim()) return null

  let confirmation: URL
  try {
    confirmation = new URL(raw)
  } catch {
    return null
  }

  if (confirmation.origin !== SUPABASE_AUTH_ORIGIN ||
      confirmation.pathname !== '/auth/v1/verify') return null

  const type = confirmation.searchParams.get('type')
  if (!['invite', 'recovery', 'signup'].includes(type ?? '')) return null

  const token = confirmation.searchParams.get('token')
  if (!token?.trim()) return null

  const redirectTo = confirmation.searchParams.get('redirect_to')
  if (!redirectTo) return null

  try {
    const target = new URL(redirectTo)
    if (!JARVIS_AUTH_REDIRECT_ORIGINS.has(target.origin)) return null
  } catch {
    return null
  }

  return confirmation.toString()
}
