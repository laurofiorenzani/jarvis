export type BMWVaultToken = {
  clientId: string
  refreshToken: string
  refreshExpiresAt: string
}

type RpcResult = { data: unknown; error: { message?: string } | null }

export interface BMWVaultRpcClient {
  rpc(name: string, params: Record<string, unknown>): PromiseLike<RpcResult>
}

export class BMWVaultTokenStoreError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'BMWVaultTokenStoreError'
    this.code = code
  }
}

function validUserId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/** Store/rotate only the refresh token; Vault holds encrypted material. */
export async function storeBMWRefreshToken(
  client: BMWVaultRpcClient,
  verifiedUserId: string,
  clientId: string,
  refreshToken: string,
  refreshExpiresAt: string,
): Promise<void> {
  if (!validUserId(verifiedUserId) || !clientId.trim() || clientId.length > 200 ||
      refreshToken.length < 16 || refreshToken.length > 8192 ||
      !Number.isFinite(Date.parse(refreshExpiresAt))) {
    throw new BMWVaultTokenStoreError('invalid_request')
  }
  const { data, error } = await client.rpc('jarvis_store_bmw_cardata_refresh_token', {
    p_user_id: verifiedUserId,
    p_client_id: clientId,
    p_refresh_token: refreshToken,
    p_refresh_expires_at: new Date(refreshExpiresAt).toISOString(),
  })
  if (error || data !== true) throw new BMWVaultTokenStoreError('token_storage_unavailable')
}

/** Retrieve a decrypted token only inside the trusted server-side Edge Function. */
export async function getBMWRefreshToken(
  client: BMWVaultRpcClient,
  verifiedUserId: string,
): Promise<BMWVaultToken | null> {
  if (!validUserId(verifiedUserId)) throw new BMWVaultTokenStoreError('invalid_request')
  const { data, error } = await client.rpc('jarvis_get_bmw_cardata_refresh_token', {
    p_user_id: verifiedUserId,
  })
  if (error) throw new BMWVaultTokenStoreError('token_retrieval_unavailable')
  const row = Array.isArray(data) ? data[0] : data
  if (row === null || row === undefined) return null
  if (typeof row !== 'object') throw new BMWVaultTokenStoreError('token_retrieval_unavailable')
  const value = row as Record<string, unknown>
  if (
    typeof value.client_id !== 'string' ||
    typeof value.refresh_token !== 'string' ||
    typeof value.refresh_expires_at !== 'string'
  ) {
    throw new BMWVaultTokenStoreError('token_retrieval_unavailable')
  }
  return {
    clientId: value.client_id,
    refreshToken: value.refresh_token,
    refreshExpiresAt: value.refresh_expires_at,
  }
}

/** Delete the Vault secret and its owner mapping on explicit disconnect. */
export async function deleteBMWCredentials(
  client: BMWVaultRpcClient,
  verifiedUserId: string,
): Promise<boolean> {
  if (!validUserId(verifiedUserId)) throw new BMWVaultTokenStoreError('invalid_request')
  const { data, error } = await client.rpc('jarvis_delete_bmw_cardata_credentials', {
    p_user_id: verifiedUserId,
  })
  if (error || typeof data !== 'boolean') throw new BMWVaultTokenStoreError('token_deletion_unavailable')
  return data
}

export type BMWPendingAuthorization = {
  clientId: string
  deviceCode: string
  codeVerifier: string
  expiresAt: string
}

/** Persist device credentials server-side; only the opaque state ID goes to the browser. */
export async function createBMWPendingAuthorization(
  client: BMWVaultRpcClient,
  verifiedUserId: string,
  stateId: string,
  value: BMWPendingAuthorization,
): Promise<void> {
  if (!validUserId(verifiedUserId) || !validUserId(stateId) ||
      !value.clientId.trim() || value.clientId.length > 200 ||
      value.deviceCode.length < 8 || value.deviceCode.length > 2048 ||
      value.codeVerifier.length < 40 || value.codeVerifier.length > 128 ||
      !Number.isFinite(Date.parse(value.expiresAt))) {
    throw new BMWVaultTokenStoreError('invalid_request')
  }
  const { data, error } = await client.rpc('jarvis_create_bmw_cardata_pending_auth', {
    p_state_id: stateId,
    p_user_id: verifiedUserId,
    p_client_id: value.clientId,
    p_device_code: value.deviceCode,
    p_code_verifier: value.codeVerifier,
    p_expires_at: new Date(value.expiresAt).toISOString(),
  })
  if (error || data !== true) throw new BMWVaultTokenStoreError('pending_authorization_unavailable')
}

/** Atomically consume one owner-bound, short-lived authorization state. */
export async function consumeBMWPendingAuthorization(
  client: BMWVaultRpcClient,
  verifiedUserId: string,
  stateId: string,
): Promise<BMWPendingAuthorization | null> {
  if (!validUserId(verifiedUserId) || !validUserId(stateId)) {
    throw new BMWVaultTokenStoreError('invalid_request')
  }
  const { data, error } = await client.rpc('jarvis_consume_bmw_cardata_pending_auth', {
    p_state_id: stateId,
    p_user_id: verifiedUserId,
  })
  if (error) throw new BMWVaultTokenStoreError('pending_authorization_unavailable')
  const row = Array.isArray(data) ? data[0] : data
  if (row === null || row === undefined) return null
  if (typeof row !== 'object') throw new BMWVaultTokenStoreError('pending_authorization_unavailable')
  const value = row as Record<string, unknown>
  if (typeof value.client_id !== 'string' || typeof value.device_code !== 'string' ||
      typeof value.code_verifier !== 'string' || typeof value.expires_at !== 'string') {
    throw new BMWVaultTokenStoreError('pending_authorization_unavailable')
  }
  return {
    clientId: value.client_id,
    deviceCode: value.device_code,
    codeVerifier: value.code_verifier,
    expiresAt: value.expires_at,
  }
}
