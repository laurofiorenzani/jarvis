import { digestApprovalArguments } from '../../../src/lib/action-approval.ts'
import {
  ACTION_APPROVAL_POLICY_VERSION,
  ActionApprovalServiceError,
  cancelActionApprovalRecord,
  createActionApprovalRecord,
  resolveActionApprovalRecord,
  type ActionApprovalRpcClient,
} from './action-approval-api.ts'

function assertEquals(actual: unknown, expected: unknown, message = 'unexpected value'): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
}

class FakeRpc implements ActionApprovalRpcClient {
  calls: Array<{ name: string; params: Record<string, unknown> }> = []
  result: unknown
  failure: { message?: string } | null = null

  constructor(result: unknown = null) { this.result = result }

  async rpc(name: string, params: Record<string, unknown>) {
    this.calls.push({ name, params })
    return { data: this.result, error: this.failure }
  }
}

const validInput = {
  sessionId: 'session-a',
  conversationId: 'conversation-a',
  invocationId: 'invocation-a',
  capabilityId: 'bmw.climate.start',
  arguments: { temperature: 21, mode: 'auto' },
  title: 'Start cabin climate',
  target: 'BMW iX1',
  impact: 'Starts cabin climate',
  reversibility: 'Can be stopped from the vehicle',
}

Deno.test('creates a server-bound approval and persists only the argument digest', async () => {
  const rpc = new FakeRpc('10000000-0000-4000-8000-000000000041')
  const now = new Date('2026-11-13T12:00:00.000Z')
  const envelope = await createActionApprovalRecord(
    rpc,
    '00000000-0000-4000-8000-000000000041',
    validInput,
    now,
    '10000000-0000-4000-8000-000000000041',
  )
  assertEquals(envelope.userId, '00000000-0000-4000-8000-000000000041')
  assertEquals(envelope.policyVersion, ACTION_APPROVAL_POLICY_VERSION)
  assertEquals(envelope.expiresAt, '2026-11-13T12:05:00.000Z')
  assertEquals(envelope.argumentDigest, await digestApprovalArguments(validInput.arguments))
  assertEquals(rpc.calls.length, 1)
  assertEquals(rpc.calls[0].name, 'jarvis_create_action_approval')
  assertEquals(rpc.calls[0].params.p_user_id, '00000000-0000-4000-8000-000000000041')
  assertEquals(rpc.calls[0].params.p_argument_digest, envelope.argumentDigest)
  assertEquals('p_arguments' in rpc.calls[0].params, false)
  assertEquals('arguments' in rpc.calls[0].params, false)
})

Deno.test('rejects malformed approval input before persistence', async () => {
  const rpc = new FakeRpc('10000000-0000-4000-8000-000000000042')
  let caught: unknown
  try {
    await createActionApprovalRecord(rpc, 'user-a', { ...validInput, arguments: undefined })
  } catch (error) { caught = error }
  if (!(caught instanceof ActionApprovalServiceError) || caught.code !== 'invalid_request') {
    throw new Error('invalid approval input was not rejected')
  }
  assertEquals(rpc.calls.length, 0)
})

Deno.test('resolves a decision using the verified owner and current policy version', async () => {
  const rpc = new FakeRpc([{ valid: true, reason: 'resolved', status: 'approved', decided_at: '2026-11-13T12:01:00.000Z' }])
  const result = await resolveActionApprovalRecord(
    rpc,
    'user-a',
    '10000000-0000-4000-8000-000000000041',
    {
      sessionId: 'session-a',
      invocationId: 'invocation-a',
      capabilityId: 'bmw.climate.start',
      argumentDigest: 'a'.repeat(64),
      decision: 'approved',
    },
  )
  assertEquals(rpc.calls[0].name, 'jarvis_resolve_action_approval')
  assertEquals(rpc.calls[0].params.p_user_id, 'user-a')
  assertEquals(rpc.calls[0].params.p_policy_version, ACTION_APPROVAL_POLICY_VERSION)
  assertEquals(rpc.calls[0].params.p_decision, 'approved')
  assertEquals(result.valid, true)
  assertEquals(result.status, 'approved')
})

Deno.test('rejects invalid decisions and malformed digests before calling the RPC', async () => {
  const rpc = new FakeRpc([])
  for (const input of [
    { sessionId: 's', invocationId: 'i', capabilityId: 'c', argumentDigest: 'a'.repeat(64), decision: 'execute' },
    { sessionId: 's', invocationId: 'i', capabilityId: 'c', argumentDigest: 'bad', decision: 'approved' },
  ]) {
    let caught: unknown
    try {
      await resolveActionApprovalRecord(rpc, 'user-a', '10000000-0000-4000-8000-000000000041', input)
    } catch (error) { caught = error }
    if (!(caught instanceof ActionApprovalServiceError) || caught.code !== 'invalid_request') {
      throw new Error('invalid decision payload was not rejected')
    }
  }
  assertEquals(rpc.calls.length, 0)
})

Deno.test('cancels only through the server RPC and returns its atomic result', async () => {
  const rpc = new FakeRpc(true)
  const result = await cancelActionApprovalRecord(
    rpc,
    'user-a',
    '10000000-0000-4000-8000-000000000041',
    { sessionId: 'session-a', invocationId: 'invocation-a', argumentDigest: 'b'.repeat(64) },
  )
  assertEquals(result, true)
  assertEquals(rpc.calls[0].name, 'jarvis_cancel_action_approval')
  assertEquals(rpc.calls[0].params.p_user_id, 'user-a')
})

Deno.test('maps persistence failures to safe service errors', async () => {
  const rpc = new FakeRpc(null)
  rpc.failure = { message: 'database internal detail must not escape' }
  let caught: unknown
  try {
    await createActionApprovalRecord(
      rpc,
      'user-a',
      validInput,
      new Date('2026-11-13T12:00:00.000Z'),
      '10000000-0000-4000-8000-000000000041',
    )
  } catch (error) { caught = error }
  if (!(caught instanceof ActionApprovalServiceError) || caught.code !== 'approval_persistence_unavailable') {
    throw new Error('database failure was not mapped to a safe service error')
  }
})
