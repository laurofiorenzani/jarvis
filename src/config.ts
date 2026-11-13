/**
 * JARVIS configuration.
 *
 * Everything here is read from Vite env vars (.env.local) so no secrets are
 * committed. See .env.example for the full list.
 */

/**
 * Vite inlines a blank `.env` entry as an empty string, not as undefined, so
 * `??` never falls through to the default — and .env.example ships every
 * optional key blank, which is exactly the shape that used to bite. A blank
 * VITE_BACKEND silently selected the default backend, which is now cloud.
 * Treat whitespace-only as unset everywhere in this file.
 */
// Vite provides import.meta.env in the browser/build. Node-based tests import
// this module too, where the property is absent; use an empty env in that case.
const viteEnv = import.meta.env ?? {}

function str(raw: unknown): string | undefined {
  const value = typeof raw === 'string' ? raw.trim() : ''
  return value === '' ? undefined : value
}

/**
 * Fixed-choice options. An unrecognised value is nearly always a typo, and
 * quietly falling back to the default hides it until it costs you a take.
 */
function choice<T extends string>(
  name: string,
  raw: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = str(raw)
  if (value === undefined) return fallback
  if ((allowed as readonly string[]).includes(value)) return value as T
  console.warn(
    `[jarvis] ${name}="${value}" is not one of ${allowed.join(' | ')} — using "${fallback}".`,
  )
  return fallback
}

/** Same, for the on/off options. Accepts true/false and 1/0. */
function flag(name: string, raw: unknown, fallback: boolean): boolean {
  const value = str(raw)?.toLowerCase()
  if (value === undefined) return fallback
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  console.warn(`[jarvis] ${name}="${value}" is not true or false — using ${fallback}.`)
  return fallback
}

/**
 * Which brain to use. Cloud is the production default; the local bridge is an
 * explicit developer/local-tools option. Direct browser-to-provider mode is
 * retained only for isolated local demos and must never be used in production.
 *
 *   'cloud'  — require an authenticated Supabase CloudBrain. No local server or
 *              provider secret is needed in the browser bundle.
 *   'bridge' — explicit local development mode using the Node bridge.
 *   'direct' — explicit local demo mode; requires a browser-exposed API key.
 */
export const BACKEND: 'cloud' | 'bridge' = choice(
  'VITE_BACKEND',
  viteEnv.VITE_BACKEND,
  ['cloud', 'bridge'] as const,
  'cloud',
)

/**
 * Where the bridge lives. Derived once here rather than in each of the three
 * places that talk to it, so moving off the default port is a single edit.
 * `wss://` maps to `https://` on its own, which is why this is a prefix swap
 * rather than a hardcoded scheme.
 */
export const BRIDGE_WS_URL = str(viteEnv.VITE_BRIDGE_URL) ?? 'ws://localhost:8787'
export const BRIDGE_HTTP_URL = BRIDGE_WS_URL.replace(/^ws/, 'http')

/** Speech recognition locale. Brazilian Portuguese is the default; English
 * deployments can select en-GB or en-US without changing application code. */
export const SPEECH_LOCALE = choice(
  'VITE_SPEECH_LOCALE',
  viteEnv.VITE_SPEECH_LOCALE,
  ['pt-BR', 'en-GB', 'en-US'] as const,
  'pt-BR',
)

/**
 * Speech output engine.
 *
 * false (default) — the browser's own speechSynthesis. Runs on-device, so
 *   speech starts on the next frame with no request and no download. This is
 *   the fastest option that exists and it's why it's the default.
 *
 * true — ElevenLabs. Noticeably better voice, but every sentence costs a
 *   round trip plus generation, which is the difference between a conversation
 *   and a walkie-talkie. Turn it on when you want the voice more than the pace.
 */
// Paid ElevenLabs speech is disabled to preserve the €0 recurring-cost contract.
export const USE_ELEVENLABS = false

/**
 * Speech engine.
 *
 *   'system' — the browser's own speechSynthesis. Starts on the next frame,
 *     costs nothing, but is capped by whatever voices the OS ships; on macOS
 *     the British male option is compact Daniel.
 *
 *   'kokoro' — an 82M-parameter neural TTS running entirely in the browser via
 *     ONNX. Four proper British male voices and far better sound, nothing
 *     leaving the machine. MEASURED ON THIS MACHINE at q8/WebGPU it generates
 *     about 2.2x slower than realtime — "Yes, sir?" took 3.3 seconds and a
 *     thirteen-word sentence took nine. That is not a conversation, so it is
 *     not the default. Try `fp32` (see kokoro.ts) before enabling it; int8
 *     quantisation often silently falls back to CPU on WebGPU, which is the
 *     likely cause.
 */
export const TTS_ENGINE: 'kokoro' | 'system' = choice(
  'VITE_TTS_ENGINE',
  viteEnv.VITE_TTS_ENGINE,
  ['kokoro', 'system'] as const,
  'system',
)

/**
 * Which Kokoro voice. All four are British male:
 *   bm_george — measured RP baritone, closest to the character
 *   bm_fable  — warmer
 *   bm_lewis  — lower
 *   bm_daniel — brighter
 */
export const KOKORO_VOICE = choice(
  'VITE_KOKORO_VOICE',
  viteEnv.VITE_KOKORO_VOICE,
  ['bm_george', 'bm_fable', 'bm_lewis', 'bm_daniel'] as const,
  'bm_george',
)

export const env = {
  // Paid provider keys are never read into the browser bundle.
  anthropicKey: '',
  elevenKey: '',
  elevenVoiceId:
    str(viteEnv.VITE_ELEVENLABS_VOICE_ID) ?? 'JBFqnCBsd6RMkjVDRZzb',
  porcupineKey: str(viteEnv.VITE_PICOVOICE_ACCESS_KEY) ?? '',
  // These are public client settings (never service-role credentials). Environment
  // values can override them for another Supabase project or deployment.
  supabaseUrl: str(viteEnv.VITE_SUPABASE_URL) ?? 'https://undmhmdwhxvjgvezvucy.supabase.co',
  // Production defaults to the stable API. Preview branches can opt into an isolated function.
  supabaseFunctionName: str(viteEnv.VITE_SUPABASE_FUNCTION_NAME) ?? 'jarvis-api',
  supabasePublishableKey: str(viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY) ?? 'sb_publishable_oJvnF8wB4y1mrFWzlzSZOQ_kFy-jzVx',
}

/** `claude-opus-5` is the strongest model; `claude-sonnet-5` trades a little
 *  quality for lower latency if you find responses feel slow on camera. */
export const MODEL = 'claude-opus-5'

/**
 * Fast mode runs the same Opus 5 at up to 2.5x output speed. It is a research
 * preview on the Claude API and costs $10/$50 per Mtok instead of $5/$25.
 * For a recorded demo the snappiness is worth it; flip to false to save money.
 */
export const FAST_MODE = true

/**
 * Wake-word engine.
 *   'speech'    — zero setup, uses the browser's SpeechRecognition to listen for
 *                 "hey jarvis". Chrome/Edge only, audio goes to Google.
 *   'porcupine' — recommended. Runs offline in WASM, "Jarvis" is a built-in
 *                 keyword, far fewer false triggers. Needs a free AccessKey
 *                 from console.picovoice.ai.
 */
export const WAKE_ENGINE: 'speech' | 'porcupine' = env.porcupineKey
  ? 'porcupine'
  : 'speech'

// ---------------------------------------------------------------------------
// MCP servers
// ---------------------------------------------------------------------------

export type McpServer = {
  /** Stable id used as the tool namespace. Lowercase, no spaces. */
  name: string
  /** Human label for the HUD. */
  label: string
  /** Remote MCP endpoint. Must be reachable from Anthropic's servers, not yours. */
  url: string
  /** Bearer token, if the server wants one. Many put the secret in the URL instead. */
  token?: string
  enabled: boolean
}

/**
 * Demo-only remote MCP servers for the explicit browser-direct backend.
 * They are never configured in the cloud or bridge backends. The cloud runtime
 * has its own server-side API boundary; it does not read this list.
 *
 * Only remote HTTP MCP servers work here. Local stdio servers (filesystem,
 * Blender, Playwright) need a machine to run on and are outside this demo path.
 *
 * SECURITY: every value configured here is exposed in the browser bundle.
 * In direct mode Vite inlines tokens and private endpoint URLs into JavaScript.
 * Anyone who can load that build can inspect and reuse those credentials.
 * Never populate these values for a public deployment. Use this mode only for
 * isolated local demos with disposable, least-privilege credentials. For the
 * production cloud backend, add integrations behind authenticated server-side
 * adapters instead of putting vendor credentials in VITE_* variables.
 */
export const MCP_SERVERS: McpServer[] = [
  // The single highest-leverage integration: one URL, ~8,000 apps, managed
  // OAuth. Wire up Gmail, Google Calendar, Spotify, Slack, Notion and Sheets in
  // the Zapier dashboard and they all arrive through this one endpoint.
  // Get yours at https://mcp.zapier.com -> New MCP Server.
  {
    name: 'zapier',
    label: 'Zapier',
    url: str(BACKEND === 'direct' ? viteEnv.VITE_ZAPIER_MCP_URL : undefined) ?? '',
    enabled: Boolean(str(BACKEND === 'direct' ? viteEnv.VITE_ZAPIER_MCP_URL : undefined)),
  },

  // Alternative/complementary gateway: ~3,000 apps, free for personal use.
  {
    name: 'pipedream',
    label: 'Pipedream',
    url: str(BACKEND === 'direct' ? viteEnv.VITE_PIPEDREAM_MCP_URL : undefined) ?? '',
    enabled: Boolean(str(BACKEND === 'direct' ? viteEnv.VITE_PIPEDREAM_MCP_URL : undefined)),
  },

  // Official first-party servers. Each needs its own OAuth token pasted in.
  {
    name: 'notion',
    label: 'Notion',
    url: 'https://mcp.notion.com/mcp',
    token: str(BACKEND === 'direct' ? viteEnv.VITE_NOTION_TOKEN : undefined),
    enabled: Boolean(str(BACKEND === 'direct' ? viteEnv.VITE_NOTION_TOKEN : undefined)),
  },
  {
    name: 'linear',
    label: 'Linear',
    url: 'https://mcp.linear.app/mcp',
    token: str(BACKEND === 'direct' ? viteEnv.VITE_LINEAR_TOKEN : undefined),
    enabled: Boolean(str(BACKEND === 'direct' ? viteEnv.VITE_LINEAR_TOKEN : undefined)),
  },
  {
    name: 'github',
    label: 'GitHub',
    url: 'https://api.githubcopilot.com/mcp/',
    token: str(BACKEND === 'direct' ? viteEnv.VITE_GITHUB_TOKEN : undefined),
    enabled: Boolean(str(BACKEND === 'direct' ? viteEnv.VITE_GITHUB_TOKEN : undefined)),
  },
  {
    name: 'stripe',
    label: 'Stripe',
    url: 'https://mcp.stripe.com',
    token: str(BACKEND === 'direct' ? viteEnv.VITE_STRIPE_TOKEN : undefined),
    enabled: Boolean(str(BACKEND === 'direct' ? viteEnv.VITE_STRIPE_TOKEN : undefined)),
  },
  {
    name: 'sentry',
    label: 'Sentry',
    url: 'https://mcp.sentry.dev/mcp',
    token: str(BACKEND === 'direct' ? viteEnv.VITE_SENTRY_TOKEN : undefined),
    enabled: Boolean(str(BACKEND === 'direct' ? viteEnv.VITE_SENTRY_TOKEN : undefined)),
  },
  // Home Assistant is self-hosted, so this needs a publicly reachable URL
  // (Nabu Casa Cloud, or a Cloudflare tunnel). Worth the setup — "Jarvis, dim
  // the lights" with the room actually dimming is the best shot in the video.
  // Both halves are required: an instance reachable from Anthropic's servers
  // with no bearer token attached is one that answers 401 to every tool call,
  // which reads on the HUD as connected and behaves as broken.
  {
    name: 'home',
    label: 'Home',
    url: str(BACKEND === 'direct' ? viteEnv.VITE_HOMEASSISTANT_MCP_URL : undefined) ?? '',
    token: str(BACKEND === 'direct' ? viteEnv.VITE_HOMEASSISTANT_TOKEN : undefined),
    enabled: Boolean(
      str(BACKEND === 'direct' ? viteEnv.VITE_HOMEASSISTANT_MCP_URL : undefined) &&
        str(BACKEND === 'direct' ? viteEnv.VITE_HOMEASSISTANT_TOKEN : undefined),
    ),
  },
]

export const activeServers = () => MCP_SERVERS.filter((s) => s.enabled && s.url)

/**
 * The persona for the browser-direct path only. The bridge carries its own,
 * fuller version in bridge/server.mjs — that's the one that gets used by
 * default, and the one worth editing.
 */
export const SYSTEM_PROMPT = `You are JARVIS, Tony Stark's assistant. You are speaking out loud.

THE HARD RULE: your entire reply must be under 60 words. This is not a style
preference — every word is read aloud by a speech synthesiser and the user is
waiting in silence while it plays. A four-paragraph answer is a failure, however
good the content. If a question genuinely needs more, give the headline in two
sentences and offer the detail: "There's more if you want it."

Voice:
- Dry, precise, quietly amused. Understated competence, never fawning.
- Say "sir" at most once per exchange, and not in every exchange.
- Plain spoken prose only. No markdown, no bullet points, no headings, no code,
  no emoji, no asterisks, no numbered lists.
- Write numbers, dates and times the way you'd say them: "eight fifteen",
  "the first of August", not "8:15" or "2026-08-01".

Using tools:
- You have live tools. Use them rather than guessing.
- Never narrate that you're about to use one. No "Let me search for that" or
  "I'll check that now" — go silent, use it, then answer. The user sees a
  spinner; they don't need commentary.
- Never speak a URL, ID or raw JSON aloud unless asked. Summarise.
- If a tool fails or isn't connected, one plain sentence saying so.
- For anything outward-facing or destructive (sending mail, posting, paying,
  deleting) say exactly what you're about to do and wait for confirmation.
- If you don't know, say you don't know.`
