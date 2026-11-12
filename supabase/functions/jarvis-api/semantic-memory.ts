export type SemanticMemorySearchInput = {
  query: string
  limit: number
}

export function normalizeSemanticMemoryQuery(value: string | null): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  if (normalized.length < 2) return null
  return normalized.slice(0, 160)
}

export function normalizeSemanticMemoryLimit(value: string | null): number {
  if (!value) return 8
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 8
  return Math.max(1, Math.min(20, parsed))
}

export function parseSemanticMemorySearch(url: URL): SemanticMemorySearchInput | null {
  const query = normalizeSemanticMemoryQuery(url.searchParams.get('q'))
  if (!query) return null
  return { query, limit: normalizeSemanticMemoryLimit(url.searchParams.get('limit')) }
}


export type SemanticMemoryCandidateInput = {
  factType: 'preference' | 'fact' | 'decision' | 'goal' | 'workflow' | 'constraint'
  content: string
  sourceConversationId?: string
  sourceMessageIds: string[]
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FACT_TYPES = new Set(['preference', 'fact', 'decision', 'goal', 'workflow', 'constraint'])

export function parseSemanticMemoryCandidate(value: unknown): SemanticMemoryCandidateInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (body.version !== 1 || typeof body.factType !== 'string' || !FACT_TYPES.has(body.factType)) return null
  if (typeof body.content !== 'string') return null
  const content = body.content.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').trim()
  if (content.length < 1 || content.length > 4000) return null
  const sourceConversationId = body.sourceConversationId
  if (sourceConversationId !== undefined &&
      (typeof sourceConversationId !== 'string' || !UUID_PATTERN.test(sourceConversationId))) return null
  const rawMessageIds = body.sourceMessageIds === undefined ? [] : body.sourceMessageIds
  if (!Array.isArray(rawMessageIds) || rawMessageIds.length > 20 ||
      rawMessageIds.some((id) => typeof id !== 'string' || !UUID_PATTERN.test(id))) return null
  if (rawMessageIds.length > 0 && !sourceConversationId) return null
  return {
    factType: body.factType as SemanticMemoryCandidateInput['factType'],
    content,
    ...(sourceConversationId ? { sourceConversationId } : {}),
    sourceMessageIds: rawMessageIds as string[],
  }
}

export function parseSemanticMemoryDecision(value: unknown): 'approved' | 'rejected' | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const decision = (value as Record<string, unknown>).decision
  return decision === 'approved' || decision === 'rejected' ? decision : null
}

export function isSemanticMemoryId(value: string): boolean {
  return UUID_PATTERN.test(value)
}


const AUTO_MEMORY_SENSITIVE = /\b(?:password|passphrase|passcode|pin code|api[\s_-]?key|access token|refresh token|credential|secret|private key|health|medical|diagnos|medication|prescription|hormone|therapy|sexual|intimate|religion|politic|ethnic|race|bank|iban|swift|credit card|debit card|account number|salary|income|mortgage|loan|investment|portfolio|financial|finance|tax return|tax id|passport|national id|social security|date of birth|birth date|\\bdob\\b|home address|street address|postcode|eircode|postal code|criminal|lawsuit|home address|street address|postal code|postcode|eircode|gps|coordinates|date of birth|birthdate|dob|nationality|immigration|visa|work permit|identity|contact details|phone number|email address)\b/i
const AUTO_MEMORY_EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const AUTO_MEMORY_PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/

/** Conservative post-model filter: memory suggestions must never contain secrets or sensitive personal data. */
export function isSafeAutoMemorySource(value: string): boolean {
  const source = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  if (!source || source.length > 12_000) return false
  return !AUTO_MEMORY_SENSITIVE.test(source) && !AUTO_MEMORY_EMAIL.test(source) && !AUTO_MEMORY_PHONE.test(source)
}

export function isSafeAutoMemoryContent(value: string): boolean {
  const content = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  if (content.length < 12 || content.length > 1_000) return false
  if (AUTO_MEMORY_SENSITIVE.test(content) || AUTO_MEMORY_EMAIL.test(content) || AUTO_MEMORY_PHONE.test(content)) return false
  return true
}

/** Convert model suggestions into bounded, provenance-linked pending candidates. */
export function parseAutoMemoryCandidates(
  value: unknown,
  sourceConversationId: string,
  sourceMessageIds: string[],
): SemanticMemoryCandidateInput[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const candidates = (value as Record<string, unknown>).candidates
  if (!Array.isArray(candidates)) return []
  const output: SemanticMemoryCandidateInput[] = []
  const seen = new Set<string>()
  for (const raw of candidates.slice(0, 5)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const item = raw as Record<string, unknown>
    const candidate = parseSemanticMemoryCandidate({
      version: 1,
      factType: item.factType,
      content: item.content,
      sourceConversationId,
      sourceMessageIds,
    })
    if (!candidate || !isSafeAutoMemoryContent(candidate.content)) continue
    const key = candidate.content.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(candidate)
  }
  return output
}


export type SemanticMemoryPreferences = {
  contextEnabled: boolean
  autoCaptureEnabled: boolean
}

/** Merge a partial preference update while making auto-capture subordinate to retrieval consent. */
export function mergeSemanticMemoryPreferences(
  current: SemanticMemoryPreferences,
  patch: Partial<SemanticMemoryPreferences>,
): SemanticMemoryPreferences {
  const contextEnabled = typeof patch.contextEnabled === 'boolean'
    ? patch.contextEnabled
    : current.contextEnabled
  const autoCaptureEnabled = contextEnabled && (typeof patch.autoCaptureEnabled === 'boolean'
    ? patch.autoCaptureEnabled
    : current.autoCaptureEnabled)
  return { contextEnabled, autoCaptureEnabled }
}
