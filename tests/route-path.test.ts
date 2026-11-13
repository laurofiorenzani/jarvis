import assert from 'node:assert/strict'
import test from 'node:test'
import { getApiRoutePathCandidates } from '../supabase/functions/jarvis-api/route-path.ts'

test('normalizes full production and preview Supabase function mounts', () => {
  assert.equal(
    getApiRoutePathCandidates('/functions/v1/jarvis-api/memory-preferences').at(-1),
    '/memory-preferences',
  )
  assert.equal(
    getApiRoutePathCandidates('/functions/v1/jarvis-preview-api/v1/memory-preferences').at(-1),
    '/memory-preferences',
  )
})

test('normalizes shortened local Supabase function-slug paths', () => {
  assert.equal(
    getApiRoutePathCandidates('/jarvis-api/memory-preferences').at(-1),
    '/memory-preferences',
  )
  assert.equal(
    getApiRoutePathCandidates('/jarvis-preview-api/v1/memory-preferences').at(-1),
    '/memory-preferences',
  )
})

test('normalizes shortened API-version and already-relative paths', () => {
  assert.equal(getApiRoutePathCandidates('/v1/memory-preferences').at(-1), '/memory-preferences')
  assert.equal(getApiRoutePathCandidates('/memory-preferences').at(-1), '/memory-preferences')
  assert.equal(getApiRoutePathCandidates('/health').at(-1), '/health')
})

test('does not strip unrelated leading path segments', () => {
  assert.equal(getApiRoutePathCandidates('/other-service/memory-preferences').at(-1), '/other-service/memory-preferences')
})
