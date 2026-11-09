/**
 * Cloud-backed brain adapter.
 *
 * This is the seam between the existing HUD's ask/cancel contract and the
 * authenticated cloud API. It keeps conversation state server-side and never
 * falls back to the browser-direct Anthropic SDK or the Windows bridge.
 */
import { CloudApiError } from './cloud-api'
import { readCloudAssistantEvents } from './cloud-event-stream'
import type { AskHandlers } from './anthropic'

type CloudApi = {
  health: () => Promise<{ status: 'ok' | 'degraded' }>
  createConversation: () => Promise<{ conversation: { id: string } }>
  streamTurn: (
    input: { conversationId: string; turnId: string; text: string },
    signal?: AbortSignal,
  ) => Promise<ReadableStream<Uint8Array>>
  cancelTurn: (input: { conversationId: string; turnId: string }) => Promise<{ cancelled: boolean }>
}

export type CloudBrain = ReturnType<typeof createCloudBrain>

const makeId = () => globalThis.crypto?.randomUUID?.() ??
  `turn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export function createCloudBrain(api: CloudApi) {
  let conversationId: string | null = null
  let active: { conversationId: string | null; turnId: string; controller: AbortController; started: boolean } | null = null
  let busy = false

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId
    const result = await api.createConversation()
    if (!result.conversation?.id) throw new CloudApiError('Cloud did not create a conversation.', 502, 'invalid_response')
    conversationId = result.conversation.id
    return conversationId
  }

  return {
    async warm() {
      const result = await api.health()
      if (result.status !== 'ok' && result.status !== 'degraded') {
        throw new CloudApiError('Cloud service is unavailable.', 503, 'service_unavailable', undefined, true)
      }
    },

    async ask(prompt: string, _history: unknown[], handlers: AskHandlers): Promise<{ text: string; tools: string[] }> {
      if (!prompt.trim()) throw new CloudApiError('Message cannot be empty.', 400, 'invalid_request')
      if (busy) throw new CloudApiError('A cloud turn is already running.', 409, 'invalid_request')
      busy = true
      const turnId = makeId()
      const controller = new AbortController()
      active = { conversationId: null, turnId, controller, started: false }
      let text = ''
      let completed = false
      try {
        const id = await ensureConversation()
        if (controller.signal.aborted) return { text: '', tools: [] }
        active = { conversationId: id, turnId, controller, started: true }
        const body = await api.streamTurn({ conversationId: id, turnId, text: prompt.trim() }, controller.signal)
        for await (const event of readCloudAssistantEvents(body)) {
          if (event.conversationId !== id || event.turnId !== turnId) continue
          if (event.type === 'text.delta') {
            text += event.delta
            handlers.onText(event.delta)
          } else if (event.type === 'tool.started') {
            handlers.onTool(event.tool)
          } else if (event.type === 'turn.completed') {
            completed = true
            // The streamed deltas are authoritative for live speech. The
            // persisted final message is only used to detect truncation.
            if (event.assistantMessage.content !== text) {
              throw new CloudApiError('Cloud response did not match its streamed text.', 502, 'invalid_response')
            }
          } else if (event.type === 'turn.failed') {
            throw new CloudApiError(event.message, 503, event.code, undefined, event.retryable)
          } else if (event.type === 'turn.cancelled') {
            completed = true
            break
          }
        }
        if (controller.signal.aborted) return { text: text.trim(), tools: [] }
        if (!completed) throw new CloudApiError('Cloud stream ended before the turn completed.', 502, 'invalid_response', undefined, true)
        return { text: text.trim(), tools: [] }
      } finally {
        if (active?.turnId === turnId) active = null
        busy = false
      }
    },

    cancel() {
      const current = active
      if (!current) return
      current.controller.abort()
      if (current.conversationId && current.started) {
        void api.cancelTurn({
          conversationId: current.conversationId,
          turnId: current.turnId,
        }).catch(() => {})
      }
    },

    getConversationId() {
      return conversationId
    },

    resetConversation() {
      if (busy) throw new CloudApiError('Cannot switch conversations during an active turn.', 409, 'invalid_request')
      conversationId = null
    },
  }
}
