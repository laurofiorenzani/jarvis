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
