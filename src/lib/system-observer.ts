/**
 * Pure, read-only operational signal normalizer and triage helpers.
 *
 * Accepts only allowlisted metadata. Free-form logs, request bodies, prompts,
 * tokens, URLs with query strings and personal identifiers are intentionally
 * excluded from the observation contract.
 */

export type ObservationSource = 'api' | 'pwa' | 'ci' | 'deployment'
export type ObservationSeverity = 'info' | 'warning' | 'critical'
export type ObservationStatus =
  | 'healthy'
  | 'degraded'
  | 'unavailable'
  | 'failed'
  | 'running'
  | 'unknown'

export type SystemObservation = {
  source: ObservationSource
  status: ObservationStatus
  severity: ObservationSeverity
  signalCode: string
  observedAt: string
  httpStatus?: number
  durationMs?: number
}

export type ObservationInput = {
  source: unknown
  status: unknown
  observedAt: unknown
  httpStatus?: unknown
  durationMs?: unknown
}

const SOURCES = new Set<ObservationSource>(['api', 'pwa', 'ci', 'deployment'])
const STATUSES = new Set<ObservationStatus>([
  'healthy', 'degraded', 'unavailable', 'failed', 'running', 'unknown',
])

function boundedInteger(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return undefined
  return value
}

function severityFor(status: ObservationStatus): ObservationSeverity {
  if (status === 'unavailable' || status === 'failed') return 'critical'
  if (status === 'degraded' || status === 'unknown') return 'warning'
  return 'info'
}

/** Copies only allowlisted fields; unknown fields are ignored and never persisted. */
export function normalizeObservation(input: ObservationInput): SystemObservation | null {
  if (!input || typeof input !== 'object') return null
  if (typeof input.source !== 'string' || !SOURCES.has(input.source as ObservationSource)) return null
  if (typeof input.status !== 'string' || !STATUSES.has(input.status as ObservationStatus)) return null
  if (typeof input.observedAt !== 'string' || input.observedAt.length > 40) return null
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(input.observedAt)) return null

  const timestamp = Date.parse(input.observedAt)
  if (!Number.isFinite(timestamp)) return null

  const source = input.source as ObservationSource
  const status = input.status as ObservationStatus
  const httpStatus = boundedInteger(input.httpStatus, 100, 599)
  const durationMs = boundedInteger(input.durationMs, 0, 120_000)

  // HTTP signals are internally consistent: a successful status cannot be
  // labelled unavailable, and non-success responses cannot be healthy.
  if ((source === 'api' || source === 'pwa') && httpStatus !== undefined) {
    if (httpStatus >= 200 && httpStatus < 400 && status === 'unavailable') return null
    if ((httpStatus < 200 || httpStatus >= 400) && status === 'healthy') return null
  }

  const observation: SystemObservation = {
    source,
    status,
    severity: severityFor(status),
    signalCode: `${source}_${status}`,
    observedAt: new Date(timestamp).toISOString(),
  }
  if (httpStatus !== undefined) observation.httpStatus = httpStatus
  if (durationMs !== undefined) observation.durationMs = durationMs
  return observation
}

/** Stable, low-cardinality key for grouping repeated signals. */
export function observationFingerprint(observation: SystemObservation): string {
  return [observation.source, observation.signalCode, observation.httpStatus ?? 'na'].join(':')
}

export type ImprovementProposal = {
  title: string
  severity: ObservationSeverity
  confidence: 'high' | 'medium'
  evidence: string[]
  recommendedAction: string
  requiresHumanApproval: true
}

/** Produces bounded proposals from normalized observations; never executes fixes. */
export function triageObservations(
  observations: readonly SystemObservation[],
): ImprovementProposal[] {
  const latestByFingerprint = new Map<string, SystemObservation>()
  for (const observation of observations) {
    const key = observationFingerprint(observation)
    const previous = latestByFingerprint.get(key)
    if (!previous || Date.parse(observation.observedAt) > Date.parse(previous.observedAt)) {
      latestByFingerprint.set(key, observation)
    }
  }

  return [...latestByFingerprint.values()]
    .filter((item) => item.severity !== 'info')
    .sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2 }
      return rank[a.severity] - rank[b.severity] ||
        Date.parse(b.observedAt) - Date.parse(a.observedAt)
    })
    .slice(0, 10)
    .map((item) => ({
      title: `${item.source.toUpperCase()} service reports ${item.status}`,
      severity: item.severity,
      confidence: item.status === 'unavailable' || item.status === 'failed' ? 'high' : 'medium',
      evidence: [`${item.signalCode} at ${new Date(Date.parse(item.observedAt)).toISOString()}`],
      recommendedAction: 'Inspect sanitized service health and recent deployment or CI metadata before proposing a change.',
      requiresHumanApproval: true,
    }))
}
