import { useRef, useState, type FormEvent } from 'react'
import type { CloudMemory, MemoryCategory, ConversationSummary, ConversationMessage } from '../lib/backend-contract'
import { env } from '../config'
import { createCloudRuntime } from '../lib/cloud-runtime'
import type { CloudRuntimeOptions } from '../lib/cloud-runtime'
import { selectCloudBrain, selectLocalBrain } from '../lib/brain'

function createVolatileTokenStore() {
  const values = new Map<string, string>()
  return {
    async get(key: string) { return values.get(key) ?? null },
    async set(key: string, value: string) { values.set(key, value) },
    async remove(key: string) { values.delete(key) },
  }
}

export function CloudAccess({ onConnected, onDisconnected, onResumeConversation }: { onConnected?: () => void; onDisconnected?: () => void; onResumeConversation?: (messages: ConversationMessage[]) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(false)
  const [message, setMessage] = useState('')
  const [memories, setMemories] = useState<CloudMemory[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversationBusy, setConversationBusy] = useState(false)
  const [memoryContextEnabled, setMemoryContextEnabled] = useState(false)
  const [providerStatus, setProviderStatus] = useState('MODEL STATUS NOT CHECKED')
  const [memoryContent, setMemoryContent] = useState('')
  const [memoryCategory, setMemoryCategory] = useState<MemoryCategory>('preference')
  const [memoryBusy, setMemoryBusy] = useState(false)
  const runtimeRef = useRef<ReturnType<typeof createCloudRuntime> | null>(null)

  if (!env.supabaseUrl || !env.supabasePublishableKey) return null

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage('')
    const options: CloudRuntimeOptions = {
      supabaseUrl: env.supabaseUrl,
      supabasePublishableKey: env.supabasePublishableKey,
      tokenStore: createVolatileTokenStore(),
    }
    const runtime = createCloudRuntime(options)
    runtimeRef.current = runtime
    try {
      await runtime.auth.signInWithPassword(email, password)
      await runtime.brain.warm()
      const [saved, preference, recentConversations] = await Promise.all([runtime.api.listMemories(), runtime.api.getMemoryPreference(), runtime.api.listConversations()])
      setMemories(saved.memories)
      setMemoryContextEnabled(preference.contextEnabled)
      setConversations(recentConversations.conversations)
      try {
        const providers = await runtime.api.getProviderStatus()
        setProviderStatus(providers.configured
          ? 'FREE-QUOTA CONFIG DECLARED · ' + providers.providers.map((item) => item.model).join(', ')
          : 'NO FREE-ONLY MODEL PROVIDER CONFIGURED')
      } catch {
        setProviderStatus('MODEL PROVIDER CONFIGURATION INVALID OR UNAVAILABLE')
      }
      selectCloudBrain(runtime.brain)
      setConnected(true)
      setPassword('')
      setMessage('AUTHENTICATED · CLOUD API HEALTHY · MODEL NOT YET VERIFIED · MEMORY-ONLY TOKENS')
      onConnected?.()
    } catch (error) {
      selectLocalBrain()
      await runtime.auth.signOut().catch(() => {})
      runtimeRef.current = null
      setConnected(false)
      setMessage(error instanceof Error ? error.message : 'Cloud sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const refreshConversations = async () => {
    const runtime = runtimeRef.current
    if (!runtime || conversationBusy) return
    setConversationBusy(true)
    try {
      const result = await runtime.api.listConversations()
      setConversations(result.conversations)
      setMessage(`CONVERSATIONS LOADED · ${result.conversations.length} AVAILABLE`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Conversation history could not be loaded.')
    } finally {
      setConversationBusy(false)
    }
  }

  const resumeConversation = async (id: string) => {
    const runtime = runtimeRef.current
    if (!runtime || conversationBusy) return
    setConversationBusy(true)
    try {
      const result = await runtime.brain.resumeConversation(id)
      onResumeConversation?.(result.messages)
      setMessage(`CONVERSATION RESTORED · ${result.messages.length} MESSAGES`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Conversation could not be restored.')
    } finally {
      setConversationBusy(false)
    }
  }

  const startNewConversation = () => {
    const runtime = runtimeRef.current
    if (!runtime || conversationBusy) return
    runtime.brain.resetConversation()
    onResumeConversation?.([])
    setMessage('NEW CLOUD CONVERSATION READY')
  }

  const toggleMemoryContext = async (enabled: boolean) => {
    const runtime = runtimeRef.current
    if (!runtime || memoryBusy) return
    const previous = memoryContextEnabled
    setMemoryContextEnabled(enabled)
    setMemoryBusy(true)
    try {
      await runtime.api.setMemoryContextEnabled(enabled)
      setMessage(enabled
        ? 'APPROVED MEMORY CONTEXT ENABLED · UP TO 20 RECORDS'
        : 'APPROVED MEMORY CONTEXT DISABLED')
    } catch (error) {
      setMemoryContextEnabled(previous)
      setMessage(error instanceof Error ? error.message : 'Memory preference could not be saved.')
    } finally {
      setMemoryBusy(false)
    }
  }

  const saveMemory = async (event: FormEvent) => {
    event.preventDefault()
    const runtime = runtimeRef.current
    if (!runtime || memoryBusy || !memoryContent.trim()) return
    setMemoryBusy(true)
    try {
      const result = await runtime.api.createMemory({ category: memoryCategory, content: memoryContent })
      setMemories((items) => [result.memory, ...items])
      setMemoryContent('')
      setMessage('MEMORY SAVED · EXPLICIT USER APPROVAL')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Memory could not be saved.')
    } finally {
      setMemoryBusy(false)
    }
  }

  const deleteMemory = async (id: string) => {
    const runtime = runtimeRef.current
    if (!runtime || memoryBusy) return
    setMemoryBusy(true)
    try {
      await runtime.api.deleteMemory(id)
      setMemories((items) => items.filter((item) => item.id !== id))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Memory could not be deleted.')
    } finally {
      setMemoryBusy(false)
    }
  }

  const signOut = async () => {
    if (busy) return
    setBusy(true)
    selectLocalBrain()
    try {
      await runtimeRef.current?.auth.signOut()
      setMessage('LOCAL BRAIN RESTORED · LOCAL SESSION CLEARED')
    } catch {
      setMessage('LOCAL BRAIN RESTORED · LOCAL TOKENS CLEARED')
    } finally {
      runtimeRef.current = null
      setConnected(false)
      setBusy(false)
      onDisconnected?.()
    }
  }

  return (
    <aside style={{
      position: 'fixed', zIndex: 30, top: 16, right: 16, width: 'min(290px, calc(100vw - 32px))',
      maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', padding: 14, color: '#b9f6ff', background: 'rgba(1, 12, 22, .94)',
      border: '1px solid rgba(75, 220, 255, .42)', borderRadius: 8,
      boxShadow: '0 0 24px rgba(0, 190, 255, .12)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 11, letterSpacing: '.08em',
    }}>
      <button type="button" onClick={() => setExpanded((value) => !value)}
        style={{ width: '100%', border: 0, background: 'transparent', color: 'inherit',
          textAlign: 'left', cursor: 'pointer', font: 'inherit', padding: 0 }}>
        {connected ? '● CLOUD BRAIN ACTIVE' : '＋ CONNECT CLOUD BRAIN'}
        <span style={{ float: 'right' }}>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        connected ? (
          <div style={{ paddingTop: 12 }}>
            <div style={{ marginBottom: 6, color: '#83d9e8' }}>{message}</div>
            <div style={{ marginBottom: 12, color: '#7797a2', letterSpacing: 0 }}>{providerStatus}</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, letterSpacing: 0 }}>
              <input type="checkbox" checked={memoryContextEnabled} disabled={memoryBusy}
                onChange={(event) => void toggleMemoryContext(event.target.checked)} />
              Include approved memories in JARVIS replies
            </label>
            <div style={{ color: '#7797a2', marginBottom: 10, letterSpacing: 0 }}>
              Off by default. When enabled, up to 20 non-expired saved memories may be sent to the configured AI provider with your message.
            </div>
            <form onSubmit={(event) => void saveMemory(event)} style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              <label style={labelStyle}>SAVE A MEMORY (MANUAL ONLY)
                <select value={memoryCategory} onChange={(event) => setMemoryCategory(event.target.value as MemoryCategory)} style={inputStyle}>
                  <option value="preference">Preference</option>
                  <option value="project">Project</option>
                  <option value="workflow">Workflow</option>
                  <option value="fact">Fact</option>
                </select>
              </label>
              <textarea value={memoryContent} onChange={(event) => setMemoryContent(event.target.value)}
                maxLength={2000} rows={3} placeholder="Write only what you explicitly want JARVIS to retain."
                style={{ ...inputStyle, resize: 'vertical' }} />
              <button type="submit" disabled={memoryBusy || !memoryContent.trim()} style={buttonStyle}>
                {memoryBusy ? 'SAVING…' : 'SAVE APPROVED MEMORY'}
              </button>
            </form>
            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'grid', gap: 6, marginBottom: 12 }}>
              {memories.map((item) => (
                <div key={item.id} style={{ borderTop: '1px solid #214653', paddingTop: 6, letterSpacing: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: '#83d9e8' }}>
                    <span>{item.category.toUpperCase()}</span>
                    <button type="button" disabled={memoryBusy} onClick={() => void deleteMemory(item.id)}
                      style={{ ...buttonStyle, padding: '3px 6px' }}>DELETE</button>
                  </div>
                  <div style={{ color: '#c1dce2', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.content}</div>
                </div>
              ))}
              {!memories.length && <div style={{ color: '#7797a2' }}>No saved memories.</div>}
            </div>
            <button type="button" disabled={busy} onClick={() => void signOut()} style={buttonStyle}>
              {busy ? 'DISCONNECTING…' : 'SWITCH TO LOCAL BRAIN'}
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void signIn(event)} style={{ display: 'grid', gap: 9, paddingTop: 12 }}>
            <label style={labelStyle}>SUPABASE ACCOUNT EMAIL
              <input required type="email" autoComplete="username" value={email}
                onChange={(event) => setEmail(event.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>PASSWORD
              <input required type="password" autoComplete="current-password" value={password}
                onChange={(event) => setPassword(event.target.value)} style={inputStyle} />
            </label>
            <button disabled={busy} type="submit" style={{ ...buttonStyle, opacity: busy ? .55 : 1 }}>
              {busy ? 'CONNECTING…' : 'AUTHENTICATE & ACTIVATE CLOUD'}
            </button>
            {message && <div role="status" style={{ color: '#ffbd91', lineHeight: 1.5 }}>{message}</div>}
            <div style={{ color: '#7797a2', lineHeight: 1.5, letterSpacing: 0 }}>
              Temporary web session only: refresh tokens stay in memory and are cleared when this page closes. Provider free-tier settings must also be checked in the provider account.
            </div>
          </form>
        )
      )}
    </aside>
  )
}

const labelStyle = { display: 'grid', gap: 5, color: '#83d9e8' }
const inputStyle = {
  boxSizing: 'border-box' as const, width: '100%', padding: '9px 8px',
  color: '#e3fbff', background: '#06131d', border: '1px solid #286174',
  borderRadius: 4, font: '12px ui-monospace, monospace',
}
const buttonStyle = {
  padding: '10px 8px', color: '#b9f6ff', background: '#0a2836',
  border: '1px solid #286f83', borderRadius: 4, cursor: 'pointer',
  font: '11px ui-monospace, monospace', letterSpacing: '.07em',
}
