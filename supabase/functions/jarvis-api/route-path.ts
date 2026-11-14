/**
 * Normalize the pathname exposed by Supabase Edge Runtime before API route
 * matching. Depending on runtime/proxy, the function mount can be full,
 * version-prefixed, or shortened to the function slug.
 */
export function getApiRoutePathCandidates(pathname: string): string[] {
  const rawPath = pathname.replace(/\/$/, '') || '/'
  const functionMount = rawPath.match(/\/functions\/v1\/[a-z0-9-]+(?=\/|$)/i)
  let suffixPath = functionMount
    ? rawPath.slice(functionMount.index! + functionMount[0].length) || '/'
    : rawPath

  // Local Supabase may expose only /<function-slug>/<route>, without the
  // /functions/v1 mount. Strip only the two known JARVIS function slugs.
  suffixPath = suffixPath.replace(/^\/(?:jarvis-api|jarvis-preview-api)(?=\/|$)/i, '') || '/'

  const stripVersion = (value: string) =>
    value.replace(/^\/v1(?=\/|$)/, '').replace(/\/$/, '') || '/'
  const apiRoutePath = stripVersion(suffixPath)

  return [...new Set([
    rawPath,
    suffixPath,
    stripVersion(rawPath),
    stripVersion(suffixPath),
    apiRoutePath,
  ])]
}
