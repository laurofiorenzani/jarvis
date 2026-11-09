/**
 * Versioned, client-safe contract for the cloud-first JARVIS backend.
 *
 * This file contains types only. It deliberately contains no provider SDK,
 * secret, local filesystem API, Windows bridge URL, or deployment assumption.
 * Runtime validation belongs at the server boundary before accepting payloads.
 */

export const CLOUD_API_VERSION = 1 as const

/** Only capabilities approved for the ordinary cloud/mobile session. */
export const CORE_CLOUD_CAPABILITIES = [
  'conversation',
  'web_search',
  'memory_read',
  'memory_write_with_confirmation',
] as const

export type CoreCloudCapability = (typeof CORE_CLOUD_CAPABILITIES)[number]

export type ApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'invalid_request'
  | 'rate_limited'
  | 'service_unavailable'
  | 'internal_error'

export type ApiError = {
  version: typeof CLOUD_API_VERSION
  error: {
    code: ApiErrorCode
    message: string
    requestId: string
    retryable: boolean
  }
}

export type ConversationRole = 'user' | 'assistant'

export type ConversationMessage = {
  id: string
  role: ConversationRole
  content: string
  createdAt: string
}

export type ConversationSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type CreateConversationRequest = {
  version: typeof CLOUD_API_VERSION
}

export type CreateConversationResponse = {
  version: typeof CLOUD_API_VERSION
  conversation: ConversationSummary
}

export type SendTurnRequest = {
  version: typeof CLOUD_API_VERSION
  conversationId: string
  /** Client-generated idempotency key; server binds it to the authenticated user. */
  turnId: string
  text: string
}

export type CancelTurnRequest = {
  version: typeof CLOUD_API_VERSION
  conversationId: string
  turnId: string
}

/**
 * Events streamed by the authenticated cloud service. Every event is scoped to
 * a user, conversation and turn on the server; the client must still verify
 * that IDs match the active view before rendering.
 */
export type CloudAssistantEvent =
  | {
      version: typeof CLOUD_API_VERSION
      type: 'turn.started'
      conversationId: string
      turnId: string
    }
  | {
      version: typeof CLOUD_API_VERSION
      type: 'text.delta'
      conversationId: string
      turnId: string
      delta: string
    }
  | {
      version: typeof CLOUD_API_VERSION
      type: 'tool.started'
      conversationId: string
      turnId: string
      tool: string
    }
  | {
      version: typeof CLOUD_API_VERSION
      type: 'tool.finished'
      conversationId: string
      turnId: string
      tool: string
      outcome: 'succeeded' | 'failed' | 'denied'
    }
  | {
      version: typeof CLOUD_API_VERSION
      type: 'memory.confirmation_required'
      conversationId: string
      turnId: string
      challengeId: string
      operation: 'save' | 'update' | 'delete'
      expiresAt: string
      /** Display-only, server-redacted preview; never authority for approval. */
      preview?: unknown
    }
  | {
      version: typeof CLOUD_API_VERSION
      type: 'memory.confirmation_cancelled'
      conversationId: string
      turnId: string
      challengeId: string
    }
  | {
      version: typeof CLOUD_API_VERSION
      type: 'turn.completed'
      conversationId: string
      turnId: string
      assistantMessage: ConversationMessage
    }
  | {
      version: typeof CLOUD_API_VERSION
      type: 'turn.failed'
      conversationId: string
      turnId: string
      code: ApiErrorCode
      message: string
      retryable: boolean
    }

export type MemoryApprovalRequest = {
  version: typeof CLOUD_API_VERSION
  conversationId: string
  turnId: string
  challengeId: string
  approved: boolean
}

/**
 * Device credentials are intentionally absent from persistent client data
 * contracts. Access and refresh tokens are handled by a platform-specific
 * secure credential adapter and are never written to ordinary web storage.
 */
export type AuthenticatedDevice = {
  userId: string
  deviceId: string
  accessTokenExpiresAt: string
  capabilities: readonly CoreCloudCapability[]
}

export type CloudHealth = {
  version: typeof CLOUD_API_VERSION
  status: 'ok' | 'degraded'
  region?: string
}
