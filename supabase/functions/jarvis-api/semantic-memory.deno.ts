import {
  normalizeSemanticMemoryQuery,
  normalizeSemanticMemoryLimit,
  parseSemanticMemorySearch,
  parseSemanticMemoryCandidate,
  parseSemanticMemoryDecision,
  isSemanticMemoryId,
  isSafeAutoMemoryContent,
  isSafeAutoMemorySource,
  parseAutoMemoryCandidates,
  mergeSemanticMemoryPreferences,
} from './semantic-memory.ts'

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
}

Deno.test('normalizes search text and rejects too-short input', () => {
  equal(normalizeSemanticMemoryQuery('  long   term\n'), 'long term', 'whitespace normalization')
  equal(normalizeSemanticMemoryQuery('x'), null, 'short query')
  equal(normalizeSemanticMemoryQuery(null), null, 'missing query')
  equal(normalizeSemanticMemoryQuery('a'.repeat(200))?.length, 160, 'query bound')
})

Deno.test('clamps search limits and parses URL input', () => {
  equal(normalizeSemanticMemoryLimit(null), 8, 'default limit')
  equal(normalizeSemanticMemoryLimit('0'), 1, 'minimum limit')
  equal(normalizeSemanticMemoryLimit('99'), 20, 'maximum limit')
  equal(normalizeSemanticMemoryLimit('invalid'), 8, 'invalid limit fallback')
  const parsed = parseSemanticMemorySearch(new URL('https://jarvis.test/search?q=project+notes&limit=4'))
  equal(parsed?.query, 'project notes', 'search query')
  equal(parsed?.limit, 4, 'search limit')
})

Deno.test('accepts a valid pending candidate with provenance', () => {
  const candidate = parseSemanticMemoryCandidate({
    version: 1,
    factType: 'preference',
    content: 'Prefers concise project updates',
    sourceConversationId: '123e4567-e89b-42d3-a456-426614174000',
    sourceMessageIds: ['123e4567-e89b-42d3-a456-426614174001'],
  })
  equal(candidate?.factType, 'preference', 'fact type')
  equal(candidate?.sourceMessageIds.length, 1, 'provenance message count')
})

Deno.test('rejects unsupported, oversized, or unlinked candidate input', () => {
  equal(parseSemanticMemoryCandidate({ version: 1, factType: 'credential', content: 'secret' }), null, 'unsupported type')
  equal(parseSemanticMemoryCandidate({ version: 1, factType: 'fact', content: 'x'.repeat(4001) }), null, 'oversized content')
  equal(parseSemanticMemoryCandidate({
    version: 1, factType: 'fact', content: 'A fact',
    sourceMessageIds: ['123e4567-e89b-42d3-a456-426614174001'],
  }), null, 'message provenance without conversation')
})

Deno.test('parses only explicit approve or reject decisions and validates IDs', () => {
  equal(parseSemanticMemoryDecision({ decision: 'approved' }), 'approved', 'approval')
  equal(parseSemanticMemoryDecision({ decision: 'rejected' }), 'rejected', 'rejection')
  equal(parseSemanticMemoryDecision({ decision: 'pending' }), null, 'invalid decision')
  equal(isSemanticMemoryId('123e4567-e89b-42d3-a456-426614174000'), true, 'valid UUID')
  equal(isSemanticMemoryId('not-a-uuid'), false, 'invalid UUID')
})

Deno.test('automatic memory filter allows stable preferences but blocks sensitive data', () => {
  equal(isSafeAutoMemoryContent('Prefers concise project status updates'), true, 'stable preference')
  equal(isSafeAutoMemoryContent('My password is hunter2'), false, 'password')
  equal(isSafeAutoMemoryContent('My bank account balance is 5000'), false, 'financial data')
  equal(isSafeAutoMemoryContent('Contact me at person@example.com'), false, 'email')
  equal(isSafeAutoMemoryContent('Call me at +353 87 123 4567'), false, 'phone')
  equal(isSafeAutoMemoryContent('My home address is 10 Main Street'), false, 'home address')
  equal(isSafeAutoMemoryContent('My Eircode is A65 F4E2'), false, 'Eircode')
  equal(isSafeAutoMemoryContent('My date of birth is 21 August 1992'), false, 'date of birth')
  equal(isSafeAutoMemoryContent('My nationality is Brazilian'), false, 'nationality')
  equal(isSafeAutoMemoryContent('12 Main Street'), false, 'bare street address')
  equal(isSafeAutoMemoryContent('A65 F4E2'), false, 'bare Eircode')
  equal(isSafeAutoMemoryContent('21/08/1992'), false, 'numeric date')
  equal(isSafeAutoMemoryContent('21 August 1992'), false, 'written date')
  equal(isSafeAutoMemoryContent('My wife prefers a different account'), false, 'third-party family detail')
})

Deno.test('automatic extraction creates only unique, bounded, provenance-linked candidates', () => {
  const conversationId = '123e4567-e89b-42d3-a456-426614174000'
  const messageIds = [
    '123e4567-e89b-42d3-a456-426614174001',
    '123e4567-e89b-42d3-a456-426614174002',
  ]
  const candidates = parseAutoMemoryCandidates({
    candidates: [
      { factType: 'preference', content: 'Prefers concise project status updates' },
      { factType: 'preference', content: 'Prefers concise project status updates' },
      { factType: 'fact', content: 'My bank account balance is 5000' },
      { factType: 'credential', content: 'This should never be saved' },
      { factType: 'goal', content: 'Wants to finish the Jarvis integration project' },
    ],
  }, conversationId, messageIds)
  equal(candidates.length, 2, 'safe unique candidates')
  equal(candidates[0].sourceConversationId, conversationId, 'conversation provenance')
  equal(candidates[0].sourceMessageIds.length, 2, 'message provenance')
})

Deno.test('automatic extraction skips a source turn containing sensitive data', () => {
  equal(isSafeAutoMemorySource('We are planning the JARVIS interface'), true, 'ordinary source')
  equal(isSafeAutoMemorySource('My salary and bank account balance are private'), false, 'financial source')
  equal(isSafeAutoMemorySource('My medical diagnosis is private'), false, 'health source')
  equal(isSafeAutoMemorySource('Contact me at person@example.com'), false, 'contact detail')
  equal(isSafeAutoMemorySource('My home address is 10 Main Street'), false, 'home address')
  equal(isSafeAutoMemorySource('My date of birth is 21 August'), false, 'birth date')
  equal(isSafeAutoMemorySource('My nationality and visa status are private'), false, 'identity and immigration')
  equal(isSafeAutoMemorySource('12 Main Street'), false, 'bare street address')
  equal(isSafeAutoMemorySource('A65 F4E2'), false, 'bare Eircode')
  equal(isSafeAutoMemorySource('21 August 1992'), false, 'written date')
  equal(isSafeAutoMemorySource('My wife prefers a different account'), false, 'third-party family detail')
})

Deno.test('automatic capture consent is subordinate to memory retrieval consent', () => {
  const current = { contextEnabled: true, autoCaptureEnabled: true }
  const disabled = mergeSemanticMemoryPreferences(current, { contextEnabled: false })
  equal(disabled.contextEnabled, false, 'retrieval disabled')
  equal(disabled.autoCaptureEnabled, false, 'auto-capture disabled with retrieval')
  const enabled = mergeSemanticMemoryPreferences(
    { contextEnabled: true, autoCaptureEnabled: false },
    { autoCaptureEnabled: true },
  )
  equal(enabled.contextEnabled, true, 'retrieval preserved')
  equal(enabled.autoCaptureEnabled, true, 'auto-capture enabled')
  const blocked = mergeSemanticMemoryPreferences(
    { contextEnabled: false, autoCaptureEnabled: false },
    { autoCaptureEnabled: true },
  )
  equal(blocked.autoCaptureEnabled, false, 'auto-capture cannot bypass retrieval consent')
})
