import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeObservation,
  observationFingerprint,
  triageObservations,
} from '../src/lib/system-observer.ts'

test('normalizes only allowlisted operational metadata', () => {
  const result = normalizeObservation({
    source: 'api',
    status: 'healthy',
    observedAt: '2026-11-12T12:00:00.000Z',
    httpStatus: 200,
    durationMs: 120,
    message: 'private user prompt must never be retained',
    authorization: 'Bearer secret',
  })
  assert.deepEqual(result, {
    source: 'api',
    status: 'healthy',
    severity: 'info',
    signalCode: 'api_healthy',
    observedAt: '2026-11-12T12:00:00.000Z',
    httpStatus: 200,
    durationMs: 120,
  })
  assert.equal(JSON.stringify(result).includes('private user prompt'), false)
  assert.equal(JSON.stringify(result).includes('Bearer secret'), false)
})

test('rejects unknown sources, invalid timestamps and inconsistent HTTP status', () => {
  assert.equal(normalizeObservation({ source: 'email', status: 'failed', observedAt: '2026-11-12T12:00:00Z' }), null)
  assert.equal(normalizeObservation({ source: 'api', status: 'healthy', observedAt: 'not-a-date', httpStatus: 200 }), null)
  assert.equal(normalizeObservation({ source: 'api', status: 'healthy', observedAt: '2026-11-12T12:00:00Z', httpStatus: 503 }), null)
  assert.equal(normalizeObservation({ source: 'api', status: 'unavailable', observedAt: '2026-11-12T12:00:00Z', httpStatus: 200 }), null)
})

test('bounds optional numeric metadata', () => {
  const result = normalizeObservation({
    source: 'pwa', status: 'degraded', observedAt: '2026-11-12T12:00:00Z',
    httpStatus: 700, durationMs: 999999,
  })
  assert.equal(result?.httpStatus, undefined)
  assert.equal(result?.durationMs, undefined)
  assert.equal(result?.severity, 'warning')
})

test('fingerprints group repeated low-cardinality signals', () => {
  const observation = normalizeObservation({
    source: 'ci', status: 'failed', observedAt: '2026-11-12T12:00:00Z',
  })
  assert.ok(observation)
  assert.equal(observationFingerprint(observation), 'ci:ci_failed:na')
})

test('triage deduplicates, prioritizes and never auto-approves remediation', () => {
  const healthy = normalizeObservation({ source: 'api', status: 'healthy', observedAt: '2026-11-12T12:00:00Z', httpStatus: 200 })!
  const warning = normalizeObservation({ source: 'pwa', status: 'degraded', observedAt: '2026-11-12T12:01:00Z', httpStatus: 503 })!
  const critical = normalizeObservation({ source: 'api', status: 'unavailable', observedAt: '2026-11-12T12:02:00Z', httpStatus: 503 })!
  const duplicate = { ...critical, observedAt: '2026-11-12T12:03:00Z' }
  const proposals = triageObservations([healthy, warning, critical, duplicate])
  assert.equal(proposals.length, 2)
  assert.equal(proposals[0].severity, 'critical')
  assert.equal(proposals[0].evidence[0], 'api_unavailable at 2026-11-12T12:03:00.000Z')
  assert.equal(proposals.every((proposal) => proposal.requiresHumanApproval), true)
})
