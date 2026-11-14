import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
  assert.equal(normalizeObservation({ source: 'api', status: 'healthy', observedAt: '2026-11-12T12:00:00' }), null)
  assert.equal(normalizeObservation(null as never), null)
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
  assert.equal(proposals[0].evidence[0], 'api_unavailable at 2026-11-12T12:03:00Z')
  assert.equal(proposals.every((proposal) => proposal.requiresHumanApproval), true)
})


test('normalizes CI and deployment metadata without retaining upstream payloads', () => {
  const failedCi = normalizeObservation({
    source: 'ci',
    status: 'failed',
    observedAt: '2026-11-13T13:00:00Z',
    runNumber: 881,
    repository: 'private/repository',
    token: 'Bearer should-not-be-retained',
  })
  assert.deepEqual(failedCi, {
    source: 'ci',
    status: 'failed',
    severity: 'critical',
    signalCode: 'ci_failed',
    observedAt: '2026-11-13T13:00:00.000Z',
  })
  assert.equal(JSON.stringify(failedCi).includes('private/repository'), false)
  assert.equal(JSON.stringify(failedCi).includes('Bearer'), false)

  const deployment = normalizeObservation({
    source: 'deployment',
    status: 'running',
    observedAt: '2026-11-13T13:01:00Z',
    deploymentId: 'internal-deployment-id',
  })
  assert.equal(deployment?.signalCode, 'deployment_running')
  assert.equal(deployment?.severity, 'info')
  assert.equal(JSON.stringify(deployment).includes('internal-deployment-id'), false)
})

test('read-only observer workflow stays bounded, read-only and validates health payloads', () => {
  const workflow = readFileSync(new URL('../.github/workflows/jarvis-readonly-observer.yml', import.meta.url), 'utf8')
  assert.match(workflow, /permissions:\s+contents:\s+read\s+actions:\s+read/)
  assert.match(workflow, /timeout-minutes:\s+5/)
  assert.match(workflow, /AbortController/)
  assert.match(workflow, /payload\?\.status === 'ok'/)
  assert.match(workflow, /branch=\$\{canonicalBranch\}&event=push/)
  assert.match(workflow, /statuses:\s+read/)
  assert.match(workflow, /context === 'Vercel'/)
  assert.match(workflow, /signal:\s*'latest_vercel_deployment'/)
  assert.match(workflow, /commits\/\$\{sha\}\/status/)
  assert.match(workflow, /redirect:\s*'error'/)
  assert.doesNotMatch(workflow, /secrets\./)
  assert.doesNotMatch(workflow, /method:\s*'(?:POST|PUT|PATCH|DELETE)'/)
})
