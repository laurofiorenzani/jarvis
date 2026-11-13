/**
 * Select the local inference backend without ever sending a FreeLLMAPI key
 * to a non-loopback host. FreeLLMAPI is the only permitted model gateway;
 * paid Claude/Anthropic account or API fallback is deliberately disabled.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function resolveBridgeProvider(env = process.env) {
  const provider = (env.JARVIS_PROVIDER ?? 'freellmapi').trim().toLowerCase()

  if (provider !== 'freellmapi') {
    throw new Error('JARVIS_PROVIDER must be "freellmapi"; paid direct providers are disabled.')
  }

  const rawBaseUrl = env.FREELLMAPI_BASE_URL?.trim() || 'http://127.0.0.1:3001'
  let url
  try {
    url = new URL(rawBaseUrl)
  } catch {
    throw new Error('FREELLMAPI_BASE_URL must be a valid loopback URL.')
  }
  if (!['http:', 'https:'].includes(url.protocol) ||
      !LOOPBACK_HOSTS.has(url.hostname.toLowerCase()) ||
      url.username || url.password || url.search || url.hash ||
      (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('FreeLLMAPI must use a loopback URL with no path, credentials, query, or fragment.')
  }

  const apiKey = env.FREELLMAPI_API_KEY?.trim()
  if (!apiKey) throw new Error('FREELLMAPI_API_KEY is required when JARVIS_PROVIDER=freellmapi.')

  const model = env.FREELLMAPI_MODEL?.trim() || 'auto'
  if (model.length > 160) throw new Error('FREELLMAPI_MODEL must be 160 characters or fewer.')

  const sdkEnv = { ...env }
  // Prevent inherited Claude account, OAuth, Bedrock or Vertex credentials from
  // overriding the explicitly selected loopback FreeLLMAPI gateway.
  for (const key of [
    'ANTHROPIC_AUTH_TOKEN',
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_BEDROCK_BASE_URL',
    'ANTHROPIC_VERTEX_PROJECT_ID',
    'CLAUDE_CODE_USE_BEDROCK',
    'CLAUDE_CODE_USE_VERTEX',
  ]) delete sdkEnv[key]
  sdkEnv.ANTHROPIC_BASE_URL = url.origin
  sdkEnv.ANTHROPIC_API_KEY = apiKey
  sdkEnv.ANTHROPIC_MODEL = model

  return {
    provider,
    model,
    effort: undefined,
    sdkEnv,
  }
}
