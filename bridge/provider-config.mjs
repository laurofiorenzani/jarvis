/**
 * Select the local inference backend without ever sending a FreeLLMAPI key
 * to a non-loopback host. Claude Code remains the default and unchanged.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function resolveBridgeProvider(env = process.env) {
  const provider = (env.JARVIS_PROVIDER ?? 'claude').trim().toLowerCase()

  if (provider === 'claude') {
    return {
      provider,
      model: env.JARVIS_MODEL?.trim() || 'claude-opus-5',
      effort: env.JARVIS_EFFORT?.trim() || 'high',
      sdkEnv: undefined,
    }
  }

  if (provider !== 'freellmapi') {
    throw new Error('JARVIS_PROVIDER must be either "claude" or "freellmapi".')
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

  return {
    provider,
    model,
    effort: undefined,
    sdkEnv: {
      ...env,
      ANTHROPIC_BASE_URL: url.origin,
      ANTHROPIC_API_KEY: apiKey,
      ANTHROPIC_MODEL: model,
    },
  }
}
