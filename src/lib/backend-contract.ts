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


const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const API_ERROR_CODES: readonly string[] = [
  'unauthenticated',
  'forbidden',
  'invalid_request',
  'rate_limited',
  'service_unavailable',
  'internal_error',
]

/**
 * Validate untrusted JSON before it reaches application state. This is a
 * structural guard, not an authorization check: the server remains responsible
 * for authenticating the user and binding every event to their session.
 */
export function parseCloudAssistantEvent(input: unknown): CloudAssistantEvent | null {
  if (!isRecord(input) || input.version !== CLOUD_API_VERSION ||
      !isNonEmptyString(input.conversationId) || !isNonEmptyString(input.turnId) ||
      !isNonEmptyString(input.type)) return null

  const base = {
    version: CLOUD_API_VERSION,
    conversationId: input.conversationId,
    turnId: input.turnId,
  }

  switch (input.type) {
    case 'turn.started':
    case 'turn.completed':
      if (input.type === 'turn.started') return base.type === undefined
        ? null
        : { ...base, type: 'turn.started' }
      if (!isRecord(input.assistantMessage) ||
          !isNonEmptyString(input.assistantMessage.id) ||
          input.assistantMessage.role !== 'assistant' ||
          typeof input.assistantMessage.content !== 'string' ||
          !isNonEmptyString(input.assistantMessage.createdAt)) return null
      return {
        ...base,
        type: 'turn.completed',
        assistantMessage: {
          id: input.assistantMessage.id,
          role: 'assistant',
          content: input.assistantMessage.content,
          createdAt: input.assistantMessage.createdAt,
        },
      }
    case 'text.delta':
      return typeof input.delta === 'string'
        ? { ...base, type: 'text.delta', delta: input.delta }
        : null
    case 'tool.started':
      return isNonEmptyString(input.tool)
        ? { ...base, type: 'tool.started', tool: input.tool }
        : null
    case 'tool.finished':
      return isNonEmptyString(input.tool) &&
        ['succeeded', 'failed', 'denied'].includes(String(input.outcome))
        ? {
            ...base,
            type: 'tool.finished',
            tool: input.tool,
            outcome: input.outcome as 'succeeded' | 'failed' | 'denied',
          }
        : null
    case 'memory.confirmation_required':
      return isNonEmptyString(input.challengeId) &&
        ['save', 'update', 'delete'].includes(String(input.operation)) &&
        isNonEmptyString(input.expiresAt)
        ? {
            ...base,
            type: 'memory.confirmation_required',
            challengeId: input.challengeId,
            operation: input.operation as 'save' | 'update' | 'delete',
            expiresAt: input.expiresAt,
            ...(input.preview === undefined ? {} : { preview: input.preview }),
          }
        : null
    case 'memory.confirmation_cancelled':
      return isNonEmptyString(input.challengeId)
        ? { ...base, type: 'memory.confirmation_cancelled', challengeId: input.challengeId }
        : null
    case 'turn.failed':
      return API_ERROR_CODES.includes(String(input.code)) &&
        typeof input.message === 'string' &&
        typeof input.retryable === 'boolean'
        ? {
            ...base,
            type: 'turn.failed',
            code: input.code as ApiErrorCode,
            message: input.message,
            retryable: input.retryable,
          }
        : null
    default:
      return null
  }
}
