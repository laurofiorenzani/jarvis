/** Extract a transcript from the provider response without trusting its shape. */
export function extractSpeechTranscript(payload: unknown): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ''
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
