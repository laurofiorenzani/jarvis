import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { CloudMemory, MemoryCategory, ConversationSummary, ConversationMessage } from '../lib/backend-contract'
import { env } from '../config'
import { createCloudRuntime } from '../lib/cloud-runtime'
import type { CloudRuntimeOptions } from '../lib/cloud-runtime'
import { selectCloudBrain, selectConfiguredBrain } from '../lib/brain'

function createVolatileTokenStore() {
  const values = new Map<string, string>()
  return {
    async get(key: string) { return values.get(key) ?? null },
    async set(key: string, value: string) { values.set(key, value) },
    async remove(key: string) { values.delete(key) },
  }
}

function createTabTokenStore() {
  return {
    async get(key: string) { return window.sessionStorage.getItem(key) },
    async set(key: string, value: string) { window.sessionStorage.setItem(key, value) },
    async remove(key: string) { window.sessionStorage.removeItem(key) },
  }
}

function readPasswordSetupToken(): string | null {
  try {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const type = params.get('type')
    return type === 'invite' || type === 'recovery' ? params.get('access_token') : null
  } catch {
    return null
  }
}

const TAB_SESSION_CHOICE = 'jarvis.cloud.keep-session-in-tab'
const REFRESH_TOKEN_KEY = 'jarvis.supabase.refresh-token'

function hasRestorableTabSession() {
  try {
    return window.sessionStorage.getItem(TAB_SESSION_CHOICE) === '1' &&
      Boolean(window.sessionStorage.getItem(REFRESH_TOKEN_KEY))
  } catch {
    return false
  }
}

export function CloudAccess({ onConnected, onDisconnected, onResumeConversation, onSpeechApiReady }: { onConnected?: () => void; onDisconnected?: () => void; onResumeConversation?: (messages: ConversationMessage[]) => void; onSpeechApiReady?: (transcribe: ((audio: Blob) => Promise<string>) | null) => void }) {
  const [expanded, setExpanded] = useState(() => !hasRestorableTabSession())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordSetupToken, setPasswordSetupToken] = useState<string | null>(readPasswordSetupToken)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset' | 'set-password'>(() =>
    readPasswordSetupToken() ? 'set-password' : 'signin')
  const [keepSessionInTab, setKeepSessionInTab] = useState(false)
  const [canRestoreTabSession, setCanRestoreTabSession] = useState(() => hasRestorableTabSession())
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
  const autoRestorePending = useRef(hasRestorableTabSession())
  const autoRestoreStarted = useRef(false)
  const restoreSessionRef = useRef<(() => Promise<void>) | null>(null)

  const activateRuntime = async (runtime: ReturnType<typeof createCloudRuntime>) => {
    await runtime.brain.warm()
    const [saved, preference, recentConversations] = await Promise.all([
      runtime.api.listMemories(),
      runtime.api.getMemoryPreference(),
      runtime.api.listConversations(),
    ])
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
    onSpeechApiReady?.(runtime.api.transcribeAudio)
    setConnected(true)
    onConnected?.()
  }

  const restoreTabSession = async () => {
    if (busy || !canRestoreTabSession) return
    setBusy(true)
    setMessage('')
    const runtime = createCloudRuntime({
      supabaseUrl: env.supabaseUrl,
      supabasePublishableKey: env.supabasePublishableKey,
      tokenStore: createTabTokenStore(),
    })
    runtimeRef.current = runtime
    try {
      const restored = await runtime.auth.restoreSession()
      if (!restored) throw new Error('The saved tab session has expired. Sign in again.')
      await activateRuntime(runtime)
      setMessage('TAB SESSION RESTORED · CLOUD API HEALTHY')
    } catch (error) {
      selectConfiguredBrain()
      await runtime.auth.signOut().catch(() => {})
      runtimeRef.current = null
      onSpeechApiReady?.(null)
      setConnected(false)
      setCanRestoreTabSession(false)
      setMessage(error instanceof Error ? error.message : 'Cloud session could not be restored.')
    } finally {
      setBusy(false)
    }
  }

  restoreSessionRef.current = restoreTabSession

  useEffect(() => {
    if (passwordSetupToken) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [passwordSetupToken])

  useEffect(() => {
    if (!env.supabaseUrl || !env.supabasePublishableKey || !autoRestorePending.current || !canRestoreTabSession || autoRestoreStarted.current) return
    autoRestoreStarted.current = true
    void restoreSessionRef.current?.()
  }, [canRestoreTabSession])

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage('')
    const options: CloudRuntimeOptions = {
      supabaseUrl: env.supabaseUrl,
      supabasePublishableKey: env.supabasePublishableKey,
      tokenStore: keepSessionInTab ? createTabTokenStore() : createVolatileTokenStore(),
    }
    if (keepSessionInTab) {
      try { window.sessionStorage.setItem(TAB_SESSION_CHOICE, '1') } catch {
        setMessage('TAB STORAGE IS UNAVAILABLE · SIGN IN WITHOUT SESSION RESTORE')
        setKeepSessionInTab(false)
        setBusy(false)
        return
      }
    } else {
      try {
        window.sessionStorage.removeItem(TAB_SESSION_CHOICE)
        window.sessionStorage.removeItem(REFRESH_TOKEN_KEY)
      } catch { /* Volatile sign-in remains available when storage is blocked. */ }
    }
    const runtime = createCloudRuntime(options)
    runtimeRef.current = runtime
    try {
      await runtime.auth.signInWithPassword(email, password)
      await activateRuntime(runtime)
      setPassword('')
      setCanRestoreTabSession(hasRestorableTabSession())
      setMessage(keepSessionInTab
        ? 'AUTHENTICATED · TAB SESSION RESTORE ENABLED · CLEARED WHEN TAB CLOSES'
        : 'AUTHENTICATED · VOLATILE TOKENS · SIGN IN AGAIN AFTER PAGE RELOAD')
    } catch (error) {
      selectConfiguredBrain()
      await runtime.auth.signOut().catch(() => {})
      runtimeRef.current = null
      setConnected(false)
      setMessage(error instanceof Error ? error.message : 'Cloud sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const registerAccount = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage('')
    const runtime = createCloudRuntime({
      supabaseUrl: env.supabaseUrl,
      supabasePublishableKey: env.supabasePublishableKey,
      tokenStore: keepSessionInTab ? createTabTokenStore() : createVolatileTokenStore(),
    })
    runtimeRef.current = runtime
    try {
      const result = await runtime.auth.signUpWithPassword(email, password, window.location.origin)
      setPassword('')
      if (result.needsEmailConfirmation || !result.user?.id) {
        runtimeRef.current = null
        setMessage('ACCOUNT REQUEST RECEIVED · CHECK YOUR EMAIL TO CONFIRM, THEN SIGN IN')
      } else {
        await activateRuntime(runtime)
        setMessage('ACCOUNT CREATED · CLOUD ACTIVE')
      }
      setAuthMode('signin')
    } catch (error) {
      runtimeRef.current = null
      setMessage(error instanceof Error ? error.message : 'Account registration failed.')
    } finally {
      setBusy(false)
    }
  }

  const resendConfirmation = async () => {
    if (busy || !email.trim()) {
      setMessage('ENTER THE ACCOUNT EMAIL FIRST')
      return
    }
    setBusy(true)
    setMessage('')
    const runtime = createCloudRuntime({
      supabaseUrl: env.supabaseUrl,
      supabasePublishableKey: env.supabasePublishableKey,
      tokenStore: createVolatileTokenStore(),
    })
    try {
      await runtime.auth.resendSignupConfirmation(email, window.location.origin)
      setMessage('IF THIS ACCOUNT NEEDS CONFIRMATION, A NEW EMAIL HAS BEEN SENT. CHECK INBOX AND SPAM.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Confirmation email could not be requested.')
    } finally {
      setBusy(false)
    }
  }
  const requestPasswordReset = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage('')
    const runtime = createCloudRuntime({
      supabaseUrl: env.supabaseUrl,
      supabasePublishableKey: env.supabasePublishableKey,
      tokenStore: createVolatileTokenStore(),
    })
    try {
      await runtime.auth.sendPasswordReset(email, window.location.origin)
      setMessage('IF THE ACCOUNT EXISTS, A PASSWORD RESET EMAIL HAS BEEN SENT.')
      setAuthMode('signin')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Password reset request failed.')
    } finally {
      setBusy(false)
    }
  }

  const completePasswordSetup = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !passwordSetupToken) return
    if (newPassword.length < 12) {
      setMessage('USE A PASSWORD WITH AT LEAST 12 CHARACTERS')
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage('PASSWORDS DO NOT MATCH')
      return
    }
    setBusy(true)
    setMessage('')
    const runtime = createCloudRuntime({
      supabaseUrl: env.supabaseUrl,
      supabasePublishableKey: env.supabasePublishableKey,
      tokenStore: createVolatileTokenStore(),
    })
    try {
      await runtime.auth.updatePasswordWithToken(passwordSetupToken, newPassword)
      setPasswordSetupToken(null)
      setNewPassword('')
      setConfirmPassword('')
      setPassword('')
      setAuthMode('signin')
      setMessage('PASSWORD SET SUCCESSFULLY · SIGN IN WITH YOUR EMAIL AND NEW PASSWORD')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Password could not be updated. Request a new link.')
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
    selectConfiguredBrain()
    try {
      await runtimeRef.current?.auth.signOut()
      setMessage('CLOUD SIGNED OUT · SIGN IN AGAIN TO CONTINUE')
    } catch {
      setMessage('CLOUD SIGNED OUT · LOCAL TOKENS CLEARED')
    } finally {
      runtimeRef.current = null
      onSpeechApiReady?.(null)
      setConnected(false)
      setCanRestoreTabSession(false)
      try { window.sessionStorage.removeItem(TAB_SESSION_CHOICE) } catch { /* Sign-out remains complete if storage is unavailable. */ }
      setBusy(false)
      onDisconnected?.()
    }
  }

  if (!env.supabaseUrl || !env.supabasePublishableKey) return null

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
            <section aria-label="Saved cloud conversations" style={{ borderTop: '1px solid #214653', borderBottom: '1px solid #214653', padding: '10px 0', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <strong style={{ color: '#83d9e8' }}>SAVED CONVERSATIONS · {conversations.length}</strong>
                <button type="button" disabled={conversationBusy} onClick={() => void refreshConversations()} style={{ ...buttonStyle, padding: '5px 7px' }}>
                  {conversationBusy ? 'LOADING…' : 'REFRESH'}
                </button>
              </div>
              <button type="button" disabled={conversationBusy} onClick={startNewConversation}
                style={{ ...buttonStyle, width: '100%', marginBottom: 8 }}>
                + NEW CLOUD CONVERSATION
              </button>
              <div style={{ display: 'grid', gap: 6, maxHeight: 190, overflowY: 'auto' }}>
                {conversations.map((conversation) => (
                  <button key={conversation.id} type="button" disabled={conversationBusy}
                    onClick={() => void resumeConversation(conversation.id)}
                    style={{ ...buttonStyle, textAlign: 'left', letterSpacing: 0, opacity: conversationBusy ? .6 : 1 }}>
                    <span style={{ display: 'block', color: '#c1dce2', overflowWrap: 'anywhere' }}>
                      {conversation.title || 'Untitled conversation'}
                    </span>
                    <span style={{ display: 'block', color: '#7797a2', fontSize: 9, marginTop: 4 }}>
                      UPDATED {new Date(conversation.updatedAt).toLocaleString()}
                    </span>
                  </button>
                ))}
                {!conversations.length && <div style={{ color: '#7797a2', letterSpacing: 0 }}>No saved cloud conversations yet.</div>}
              </div>
            </section>
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
              {busy ? 'SIGNING OUT…' : 'SIGN OUT OF CLOUD'}
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void (authMode === 'set-password' ? completePasswordSetup(event) : authMode === 'signup' ? registerAccount(event) : authMode === 'reset' ? requestPasswordReset(event) : signIn(event))} style={{ display: 'grid', gap: 9, paddingTop: 12 }}>
            {authMode !== 'set-password' && <label style={labelStyle}>ACCOUNT EMAIL
              <input required type="email" autoComplete="username" value={email}
                onChange={(event) => setEmail(event.target.value)} style={inputStyle} />
            </label>}
            {authMode !== 'reset' && authMode !== 'set-password' && <label style={labelStyle}>PASSWORD {authMode === 'signup' ? '(MINIMUM 10 CHARACTERS)' : ''}
              <input required minLength={authMode === 'signup' ? 10 : undefined} type="password"
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} value={password}
                onChange={(event) => setPassword(event.target.value)} style={inputStyle} />
            </label>}
            {authMode === 'signin' && <>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#83d9e8', letterSpacing: 0, lineHeight: 1.5 }}>
                <input type="checkbox" checked={keepSessionInTab} onChange={(event) => setKeepSessionInTab(event.target.checked)} />
                Keep me signed in across page reloads in this tab only
              </label>
              <button disabled={busy} type="submit" style={{ ...buttonStyle, opacity: busy ? .55 : 1 }}>
                {busy ? 'CONNECTING…' : 'AUTHENTICATE & ACTIVATE CLOUD'}
              </button>
              <button type="button" disabled={busy || !email.trim()} onClick={() => void resendConfirmation()} style={buttonStyle}>RESEND CONFIRMATION EMAIL</button>
              {canRestoreTabSession && <button type="button" disabled={busy} onClick={() => void restoreTabSession()} style={buttonStyle}>RESTORE CLOUD SESSION</button>}
            </>}
            {authMode === 'signup' && <button disabled={busy || password.length < 10} type="submit" style={buttonStyle}>
              {busy ? 'CREATING ACCOUNT…' : 'CREATE JARVIS ACCOUNT'}
            </button>}
            {authMode === 'reset' && <button disabled={busy} type="submit" style={buttonStyle}>
              {busy ? 'SENDING…' : 'SEND PASSWORD RESET EMAIL'}
            </button>}
            {authMode === 'set-password' && <>
              <label style={labelStyle}>NEW PASSWORD (MINIMUM 12 CHARACTERS)
                <input required minLength={12} type="password" autoComplete="new-password"
                  value={newPassword} onChange={(event) => setNewPassword(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>CONFIRM NEW PASSWORD
                <input required minLength={12} type="password" autoComplete="new-password"
                  value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} style={inputStyle} />
              </label>
              <button disabled={busy || newPassword.length < 12 || newPassword !== confirmPassword} type="submit" style={buttonStyle}>
                {busy ? 'UPDATING…' : 'SET PASSWORD & CONTINUE'}
              </button>
            </>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {authMode !== 'signin' && authMode !== 'set-password' && <button type="button" onClick={() => setAuthMode('signin')} style={buttonStyle}>BACK TO SIGN IN</button>}
              {authMode === 'signin' && <>
                <button type="button" onClick={() => setAuthMode('signup')} style={buttonStyle}>CREATE ACCOUNT</button>
                <button type="button" onClick={() => setAuthMode('reset')} style={buttonStyle}>FORGOT PASSWORD?</button>
              </>}
            </div>
            {message && <div role="status" style={{ color: '#ffbd91', lineHeight: 1.5 }}>{message}</div>}
            <div style={{ color: '#7797a2', lineHeight: 1.5, letterSpacing: 0 }}>
              {authMode === 'set-password' ? 'Your secure invitation or recovery link is ready. Choose a password to activate this account.' : 'Each family member signs in with a separate email and password. Conversations and personal memories remain private to that account.'}
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
