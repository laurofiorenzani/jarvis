/** Extract a transcript from Cloudflare Workers AI or compatible provider responses. */
export function extractSpeechTranscript(payload: unknown): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ''
  const envelope = payload as { result?: unknown; text?: unknown }
  const result = envelope.result && typeof envelope.result === 'object' && !Array.isArray(envelope.result)
    ? envelope.result as { text?: unknown }
    : null
  const directText = typeof result?.text === 'string' ? result.text : envelope.text
  if (typeof directText === 'string') return directText.trim()
  const candidates = (payload as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates) || candidates.length === 0) return ''
  const first = candidates[0]
  if (!first || typeof first !== 'object' || Array.isArray(first)) return ''
  const content = (first as { content?: unknown }).content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return ''
  const parts = (content as { parts?: unknown }).parts
  if (!Array.isArray(parts)) return ''
  return parts.map((part) => {
    if (!part || typeof part !== 'object' || Array.isArray(part)) return ''
    const text = (part as { text?: unknown }).text
    return typeof text === 'string' ? text : ''
  }).join('').trim()
}

export function countSpeechCandidates(payload: unknown): number {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 0
  const candidates = (payload as { candidates?: unknown }).candidates
  return Array.isArray(candidates) ? candidates.length : 0
}

/** Detect Cloudflare Workers AI's explicit daily free-allocation exhaustion error. */
export function isCloudflareDailyQuotaExhausted(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  const errors = (payload as { errors?: unknown }).errors
  if (!Array.isArray(errors)) return false
  return errors.some((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false
    return String((item as { code?: unknown }).code) === '3036'
  })
}
