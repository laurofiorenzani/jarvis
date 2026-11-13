import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyCapabilityRisk,
  canonicalizeApprovalArguments,
  createApprovalEnvelope,
  digestApprovalArguments,
  validateApprovalDecision,
} from '../src/lib/action-approval.ts'

const base = {
  requestId: 'approval-001',
  userId: 'user-a',
  sessionId: 'session-a',
  conversationId: 'conversation-a',
  invocationId: 'invocation-a',
  capabilityId: 'bmw.climate.start',
  arguments: { vehicleId: 'vehicle-1', durationMinutes: 15 },
  title: 'Start vehicle climate',
  target: 'BMW iX1 · vehicle-1',
  impact: 'Starts cabin climate remotely',
  reversibility: 'Can be stopped from the vehicle',
  createdAt: '2026-11-13T16:00:00.000Z',
  expiresAt: '2026-11-13T16:05:00.000Z',
  policyVersion: '2026-11-13-v1',
}

test('unknown capability verbs require approval and unsupported capabilities are denied', () => {
  assert.equal(classifyCapabilityRisk(undefined), 'APPROVAL_REQUIRED')
  assert.equal(classifyCapabilityRisk({ riskClass: 'unknown' }), 'APPROVAL_REQUIRED')
  assert.equal(classifyCapabilityRisk({ riskClass: 'READ' }), 'APPROVAL_REQUIRED', 'unverified capability support must not be treated as read-safe')
  assert.equal(classifyCapabilityRisk({ supported: false, riskClass: 'READ' }), 'DENY')
  assert.equal(classifyCapabilityRisk({ supported: true, riskClass: 'READ' }), 'READ')
  assert.equal(classifyCapabilityRisk({ supported: true, riskClass: 'ROUTINE' }), 'ROUTINE')
})

test('canonical approval arguments sort object keys but preserve array order', () => {
  assert.equal(
    canonicalizeApprovalArguments({ b: 2, a: { y: 1, x: true }, list: [3, 2] }),
    canonicalizeApprovalArguments({ list: [3, 2], a: { x: true, y: 1 }, b: 2 }),
  )
  assert.notEqual(
    canonicalizeApprovalArguments({ list: [3, 2] }),
    canonicalizeApprovalArguments({ list: [2, 3] }),
  )
})

test('canonical approval arguments reject cycles, non-JSON values and prototype hazards', () => {
  const cycle: Record<string, unknown> = {}
  cycle.self = cycle
  assert.throws(() => canonicalizeApprovalArguments(cycle), /cycles/)
  assert.throws(() => canonicalizeApprovalArguments({ value: Number.NaN }), /non-finite/)
  assert.throws(() => canonicalizeApprovalArguments({ value: BigInt(1) }), /JSON values only/)
  assert.throws(() => canonicalizeApprovalArguments({ value: undefined }), /JSON values only/)
  assert.throws(() => canonicalizeApprovalArguments(JSON.parse('{"__proto__":{"admin":true}}')), /prohibited key/)
  assert.throws(() => canonicalizeApprovalArguments([, 1]), /sparse/)
  const withSymbol = { value: 1, [Symbol('hidden')]: true }
  assert.throws(() => canonicalizeApprovalArguments(withSymbol), /symbol keys/)
  assert.throws(() => canonicalizeApprovalArguments({ get secret() { throw new Error('getter executed') } }), /accessors/)
})

test('argument digest is SHA-256 and stable across object key order', async () => {
  const a = await digestApprovalArguments({ amount: '10.00', currency: 'EUR' })
  const b = await digestApprovalArguments({ currency: 'EUR', amount: '10.00' })
  assert.equal(a, b)
  assert.match(a, /^[a-f0-9]{64}$/)
})

test('approval digest enforces a bounded argument payload', async () => {
  await assert.rejects(digestApprovalArguments({ value: 'x'.repeat(65 * 1024) }), /64 KiB limit/)
})

test('approval envelope stores only the canonical argument digest, not raw arguments', async () => {
  const envelope = await createApprovalEnvelope(base)
  assert.equal(envelope.status, 'pending')
  assert.equal(envelope.argumentDigest, await digestApprovalArguments(base.arguments))
  assert.equal('arguments' in envelope, false)
  assert.equal(envelope.expiresAt, '2026-11-13T16:05:00.000Z')
})

test('approval envelope rejects invalid and overlong TTLs', async () => {
  await assert.rejects(
    createApprovalEnvelope({ ...base, expiresAt: base.createdAt }),
    /no more than ten minutes/,
  )
  await assert.rejects(
    createApprovalEnvelope({ ...base, expiresAt: '2026-11-13T16:11:00.000Z' }),
    /no more than ten minutes/,
  )
})

test('approval decision is bound to one user, session, invocation, capability and argument digest', async () => {
  const envelope = await createApprovalEnvelope(base)
  const digest = envelope.argumentDigest
  const context = {
    userId: base.userId,
    sessionId: base.sessionId,
    invocationId: base.invocationId,
    capabilityId: base.capabilityId,
    argumentDigest: digest,
    now: '2026-11-13T16:02:00.000Z',
  }
  assert.deepEqual(validateApprovalDecision(envelope, context, 'approved'), {
    valid: true, decision: 'approved', decidedAt: '2026-11-13T16:02:00.000Z',
  })
  assert.deepEqual(validateApprovalDecision(envelope, { ...context, userId: 'user-b' }, 'approved'), {
    valid: false, reason: 'context_mismatch',
  })
  assert.deepEqual(validateApprovalDecision(envelope, { ...context, sessionId: 'session-b' }, 'approved'), {
    valid: false, reason: 'context_mismatch',
  })
  assert.deepEqual(validateApprovalDecision(envelope, { ...context, invocationId: 'invocation-b' }, 'approved'), {
    valid: false, reason: 'context_mismatch',
  })
  assert.deepEqual(validateApprovalDecision(envelope, { ...context, capabilityId: 'email.send' }, 'approved'), {
    valid: false, reason: 'context_mismatch',
  })
  assert.deepEqual(validateApprovalDecision(envelope, { ...context, argumentDigest: '0'.repeat(64) }, 'approved'), {
    valid: false, reason: 'argument_mismatch',
  })
  assert.deepEqual(validateApprovalDecision(envelope, { ...context, argumentDigest: 'not-a-sha256-digest' }, 'approved'), {
    valid: false, reason: 'argument_mismatch',
  })
  assert.deepEqual(validateApprovalDecision({ ...envelope, argumentDigest: 'not-a-sha256-digest' }, context, 'approved'), {
    valid: false, reason: 'argument_mismatch',
  })
  assert.deepEqual(validateApprovalDecision(envelope, context, 'rejected'), {
    valid: true, decision: 'rejected', decidedAt: '2026-11-13T16:02:00.000Z',
  })
})

test('expired, malformed-time and already-resolved approvals fail closed', async () => {
  const envelope = await createApprovalEnvelope(base)
  const context = {
    userId: base.userId,
    sessionId: base.sessionId,
    invocationId: base.invocationId,
    capabilityId: base.capabilityId,
    argumentDigest: envelope.argumentDigest,
    now: '2026-11-13T16:05:00.000Z',
  }
  assert.deepEqual(validateApprovalDecision(envelope, context, 'approved'), {
    valid: false, reason: 'expired',
  })
  assert.deepEqual(validateApprovalDecision(envelope, { ...context, now: 'not-a-date' }, 'approved'), {
    valid: false, reason: 'invalid_time',
  })
  assert.deepEqual(validateApprovalDecision(envelope, { ...context, now: '2026-11-13T15:59:00.000Z' }, 'approved'), {
    valid: false, reason: 'invalid_time',
  })
  assert.deepEqual(validateApprovalDecision(envelope, context, 'invalid' as 'approved'), {
    valid: false, reason: 'invalid_decision',
  })
  assert.deepEqual(validateApprovalDecision({ ...envelope, status: 'approved' }, context, 'approved'), {
    valid: false, reason: 'already_resolved',
  })
  assert.deepEqual(validateApprovalDecision({ ...envelope, expiresAt: '2026-11-13T16:20:00.000Z' }, {
    ...context, now: '2026-11-13T16:02:00.000Z',
  }, 'approved'), {
    valid: false, reason: 'invalid_time',
  })
  assert.deepEqual(validateApprovalDecision({ ...envelope, protocolVersion: 2 }, context, 'approved'), {
    valid: false, reason: 'invalid_envelope',
  })
})
