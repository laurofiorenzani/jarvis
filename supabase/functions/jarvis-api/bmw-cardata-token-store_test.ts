import {
  BMWVaultTokenStoreError,
  deleteBMWCredentials,
  getBMWRefreshToken,
  storeBMWRefreshToken,
  type BMWVaultRpcClient,
} from './bmw-cardata-token-store.ts'

function assertEquals(actual: unknown, expected: unknown, message = 'unexpected value'): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
}

class FakeRpc implements BMWVaultRpcClient {
  calls: Array<{ name: string; params: Record<string, unknown> }> = []
  data: unknown = true
  failure: { message?: string } | null = null

  constructor(data: unknown = true) { this.data = data }

  async rpc(name: string, params: Record<string, unknown>) {
    this.calls.push({ name, params })
    return { data: this.data, error: this.failure }
  }
}

const userA = '00000000-0000-4000-8000-000000000051'

Deno.test('stores only through the server-side Vault RPC', async () => {
  const rpc = new FakeRpc()
  await storeBMWRefreshToken(rpc, userA, 'bmw-client-id', 'synthetic-refresh-token-123', '2026-11-27T12:00:00.000Z')
  assertEquals(rpc.calls.length, 1)
  assertEquals(rpc.calls[0].name, 'jarvis_store_bmw_cardata_refresh_token')
  assertEquals(rpc.calls[0].params.p_user_id, userA)
  assertEquals(rpc.calls[0].params.p_client_id, 'bmw-client-id')
  assertEquals(rpc.calls[0].params.p_refresh_token, 'synthetic-refresh-token-123')
})

Deno.test('rejects invalid user and token metadata before RPC', async () => {
  const rpc = new FakeRpc()
  for (const values of [
    ['not-a-uuid', 'client', 'synthetic-refresh-token-123', '2026-11-27T12:00:00Z'],
    [userA, '', 'synthetic-refresh-token-123', '2026-11-27T12:00:00Z'],
    [userA, 'client', 'short', '2026-11-27T12:00:00Z'],
    [userA, 'client', 'synthetic-refresh-token-123', 'invalid-date'],
  ]) {
    let caught: unknown
    try {
      await storeBMWRefreshToken(rpc, values[0], values[1], values[2], values[3])
    } catch (error) { caught = error }
    if (!(caught instanceof BMWVaultTokenStoreError) || caught.code !== 'invalid_request') {
      throw new Error('invalid token metadata was not rejected')
    }
  }
  assertEquals(rpc.calls.length, 0)
})

Deno.test('retrieves the token and public client metadata for the verified owner', async () => {
  const rpc = new FakeRpc([{
    client_id: 'bmw-client-id',
    refresh_token: 'synthetic-refresh-token-123',
    refresh_expires_at: '2026-11-27T12:00:00.000Z',
  }])
  const token = await getBMWRefreshToken(rpc, userA)
  assertEquals(rpc.calls[0].name, 'jarvis_get_bmw_cardata_refresh_token')
  assertEquals(rpc.calls[0].params.p_user_id, userA)
  assertEquals(token?.clientId, 'bmw-client-id')
  assertEquals(token?.refreshToken, 'synthetic-refresh-token-123')
})

Deno.test('returns null when the owner has no connected BMW credentials', async () => {
  const rpc = new FakeRpc([])
  const token = await getBMWRefreshToken(rpc, userA)
  assertEquals(token, null)
})

Deno.test('deletes the Vault secret only through explicit server disconnect', async () => {
  const rpc = new FakeRpc(true)
  const deleted = await deleteBMWCredentials(rpc, userA)
  assertEquals(deleted, true)
  assertEquals(rpc.calls[0].name, 'jarvis_delete_bmw_cardata_credentials')
  assertEquals(rpc.calls[0].params.p_user_id, userA)
})

Deno.test('maps Vault RPC errors to safe errors without exposing secret details', async () => {
  const rpc = new FakeRpc()
  rpc.failure = { message: 'private database secret detail' }
  let caught: unknown
  try {
    await getBMWRefreshToken(rpc, userA)
  } catch (error) { caught = error }
  if (!(caught instanceof BMWVaultTokenStoreError) || caught.code !== 'token_retrieval_unavailable') {
    throw new Error('Vault error was not mapped to a safe error')
  }
})
