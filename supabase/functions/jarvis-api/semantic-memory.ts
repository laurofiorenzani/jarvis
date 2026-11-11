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
