import { useCallback, useEffect, useRef, useState } from 'react'
import { cloudAuth, type CloudSession } from '../lib/cloud-auth'
import { cloudApi, type CloudMemoryCandidate, type CloudMemorySearchResult } from '../lib/cloud-api'

const panel: React.CSSProperties = { display: 'grid', gap: 12, padding: 14, color: '#f4d2ad', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11 }
const field: React.CSSProperties = { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '11px 12px', color: '#ffe4c7', background: 'rgba(10,8,6,.78)', border: '1px solid rgba(255,157,73,.34)', borderRadius: 5, outlineColor: '#ffad62' }
const action: React.CSSProperties = { padding: '9px 12px', color: '#ffc58e', background: 'rgba(255,145,56,.08)', border: '1px solid rgba(255,157,73,.48)', borderRadius: 4, font: 'inherit', cursor: 'pointer' }
const muted: React.CSSProperties = { color: 'rgba(255,220,188,.58)', lineHeight: 1.6 }

export function CloudMemoryPanel() {
  const [session, setSession] = useState<CloudSession | null>(() => cloudAuth.getSession())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(false)
  const [autoCaptureSupported, setAutoCaptureSupported] = useState(false)
  const [candidates, setCandidates] = useState<CloudMemoryCandidate[]>([])
  const [provider, setProvider] = useState('NOT CHECKED')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cloudInput, setCloudInput] = useState('')
  const [cloudAnswer, setCloudAnswer] = useState('')
  const [cloudQuestion, setCloudQuestion] = useState('')
  const [turnBusy, setTurnBusy] = useState(false)
  const [memoryQuery, setMemoryQuery] = useState('')
  const [memoryResults, setMemoryResults] = useState<CloudMemorySearchResult[]>([])
  const [memorySearched, setMemorySearched] = useState(false)
  const abortTurn = useRef<AbortController | null>(null)
  const accountGeneration = useRef(0)

  function isCurrentAccount(userId: string | undefined, generation: number): boolean {
    return Boolean(userId) && accountGeneration.current === generation &&
      cloudAuth.getSession()?.user.id === userId
  }

  useEffect(() => cloudAuth.subscribe(setSession), [])

  const load = useCallback(async () => {
    const userId = cloudAuth.getSession()?.user.id
    const generation = accountGeneration.current
    if (!userId) return
    setBusy(true)
    setError('')
    try {
      const token = await cloudAuth.getValidAccessToken()
      if (!isCurrentAccount(userId, generation)) return
      if (!token) throw new Error('Sign in again to access cloud memory.')
      const [preference, pending, status] = await Promise.all([
        cloudApi.getMemoryPreference(token),
        cloudApi.listMemoryCandidates(token),
        cloudApi.providerStatus(token),
      ])
      if (!isCurrentAccount(userId, generation)) return
      setEnabled(preference.contextEnabled)
      setAutoCaptureEnabled(preference.autoCaptureEnabled === true)
      setAutoCaptureSupported(typeof preference.autoCaptureEnabled === 'boolean')
      setCandidates(pending.candidates.filter((item) => item.status === 'pending'))
      const names = Array.isArray(status.providers)
        ? status.providers.map((item) => item.name).filter(Boolean).join(' / ')
        : ''
      setProvider(names ? names.toUpperCase() : status.configured === true ? 'CONFIGURED' : 'UNAVAILABLE')
    } catch (cause) {
      if (isCurrentAccount(userId, generation)) setError(cause instanceof Error ? cause.message : 'Cloud data could not be loaded.')
    } finally {
      if (isCurrentAccount(userId, generation)) setBusy(false)
    }
  }, [])

  useEffect(() => {
    // Clear account-scoped UI state whenever the authenticated identity changes.
    // This prevents results from the previous household member remaining visible
    // after sign-out or a switch between the two separate accounts.
    accountGeneration.current += 1
    abortTurn.current?.abort()
    abortTurn.current = null
    setBusy(false)
    setTurnBusy(false)
    setError('')
    setNotice('')
    setCloudInput('')
    setCandidates([])
    setMemoryResults([])
    setMemoryQuery('')
    setMemorySearched(false)
    setCloudAnswer('')
    setCloudQuestion('')
    setEnabled(false)
    setAutoCaptureEnabled(false)
    setAutoCaptureSupported(false)
    setProvider(session ? 'LOADING' : 'NOT SIGNED IN')
    if (!session) return
    void load()
  }, [session?.user.id, load])

  async function sendCloudTurn(event: React.FormEvent) {
    event.preventDefault()
    const question = cloudInput.trim()
    if (!question || !session || turnBusy) return
    setTurnBusy(true); setError(''); setCloudAnswer(''); setCloudQuestion(question)
    const userId = session.user.id
    const generation = accountGeneration.current
    const controller = new AbortController()
    abortTurn.current = controller
    try {
      const token = await cloudAuth.getValidAccessToken()
      if (!isCurrentAccount(userId, generation) || controller.signal.aborted) return
      if (!token) throw new Error('Sign in again to use the cloud model.')
      const created = await cloudApi.createConversation(token)
      if (!isCurrentAccount(userId, generation) || controller.signal.aborted) return
      await cloudApi.streamTurn(token, created.conversation.id, question, (event) => {
        if (!isCurrentAccount(userId, generation)) return
        if (event.type === 'text.delta') setCloudAnswer((current) => current + event.delta)
        if (event.type === 'turn.failed') setError(event.message)
      }, controller.signal)
      if (isCurrentAccount(userId, generation)) {
        setCloudInput('')
        setNotice('CLOUD MODEL TURN COMPLETED')
      }
    } catch (cause) {
      if (isCurrentAccount(userId, generation) && !(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'Cloud model turn failed.')
      }
    } finally {
      if (abortTurn.current === controller) abortTurn.current = null
      if (isCurrentAccount(userId, generation)) setTurnBusy(false)
    }
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await cloudAuth.signIn(email, password)
      setPassword('')
      setNotice('CLOUD SESSION ESTABLISHED')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.')
    } finally { setBusy(false) }
  }

  async function searchMemory(event: React.FormEvent) {
    event.preventDefault()
    if (!memoryQuery.trim() || !session) return
    const userId = session.user.id
    const generation = accountGeneration.current
    setBusy(true); setError('')
    try {
      const token = await cloudAuth.getValidAccessToken()
      if (!isCurrentAccount(userId, generation)) return
      if (!token) throw new Error('Sign in again to search approved memory.')
      const result = await cloudApi.searchApprovedMemory(token, memoryQuery.trim())
      if (!isCurrentAccount(userId, generation)) return
      setMemoryResults(result.results)
      setMemorySearched(true)
      if (!result.contextEnabled) setNotice('ENABLE MEMORY CONTEXT TO RETRIEVE APPROVED FACTS')
    } catch (cause) {
      if (isCurrentAccount(userId, generation)) setError(cause instanceof Error ? cause.message : 'Approved memory search failed.')
    } finally { if (isCurrentAccount(userId, generation)) setBusy(false) }
  }

  async function toggleMemory() {
    if (!session) return
    const userId = session.user.id
    const generation = accountGeneration.current
    setBusy(true); setError(''); setNotice('')
    try {
      const token = await cloudAuth.getValidAccessToken()
      if (!isCurrentAccount(userId, generation)) return
      if (!token) throw new Error('Sign in again to change memory settings.')
      const saved = await cloudApi.setMemoryPreference(token, { contextEnabled: !enabled })
      if (!isCurrentAccount(userId, generation)) return
      setEnabled(saved.contextEnabled)
      setAutoCaptureEnabled(saved.autoCaptureEnabled === true)
      setAutoCaptureSupported(typeof saved.autoCaptureEnabled === 'boolean')
      setNotice(saved.contextEnabled ? 'APPROVED-MEMORY CONTEXT ENABLED' : 'MEMORY CONTEXT DISABLED')
    } catch (cause) {
      if (isCurrentAccount(userId, generation)) setError(cause instanceof Error ? cause.message : 'Preference could not be saved.')
    } finally { if (isCurrentAccount(userId, generation)) setBusy(false) }
  }

  async function toggleAutoCapture() {
    if (!session || !enabled || !autoCaptureSupported) return
    const userId = session.user.id
    const generation = accountGeneration.current
    setBusy(true); setError(''); setNotice('')
    try {
      const token = await cloudAuth.getValidAccessToken()
      if (!isCurrentAccount(userId, generation)) return
      if (!token) throw new Error('Sign in again to change automatic memory settings.')
      const saved = await cloudApi.setMemoryPreference(token, { autoCaptureEnabled: !autoCaptureEnabled })
      if (!isCurrentAccount(userId, generation)) return
      setAutoCaptureEnabled(saved.autoCaptureEnabled === true)
      setAutoCaptureSupported(typeof saved.autoCaptureEnabled === 'boolean')
      setNotice(saved.autoCaptureEnabled === true ? 'AUTOMATIC MEMORY SUGGESTIONS ENABLED' : 'AUTOMATIC MEMORY SUGGESTIONS DISABLED')
    } catch (cause) {
      if (isCurrentAccount(userId, generation)) setError(cause instanceof Error ? cause.message : 'Automatic memory setting could not be saved.')
    } finally { if (isCurrentAccount(userId, generation)) setBusy(false) }
  }

  async function decide(candidate: CloudMemoryCandidate, decision: 'approved' | 'rejected') {
    if (!session) return
    const userId = session.user.id
    const generation = accountGeneration.current
    setBusy(true); setError(''); setNotice('')
    try {
      const token = await cloudAuth.getValidAccessToken()
      if (!isCurrentAccount(userId, generation)) return
      if (!token) throw new Error('Sign in again to review memory.')
      await cloudApi.decideMemoryCandidate(token, candidate.id, decision)
      if (!isCurrentAccount(userId, generation)) return
      setCandidates((current) => current.filter((item) => item.id !== candidate.id))
      setNotice(decision === 'approved' ? 'MEMORY FACT APPROVED' : 'MEMORY FACT REJECTED')
    } catch (cause) {
      if (isCurrentAccount(userId, generation)) setError(cause instanceof Error ? cause.message : 'Memory decision failed.')
    } finally { if (isCurrentAccount(userId, generation)) setBusy(false) }
  }

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <b style={{ letterSpacing: '.16em' }}>CLOUD MEMORY / ACCOUNT</b>
        <span style={{ color: session ? '#a7d8a1' : '#e6a36b' }}>{session ? 'AUTHENTICATED' : 'OFFLINE'}</span>
      </div>
      {!session ? (
        <form onSubmit={signIn} style={{ display: 'grid', gap: 9 }}>
          <p style={muted}>Sign in with your own JARVIS account. Your wife's account remains separate. Credentials are sent directly to Supabase Auth and are never stored by this panel.</p>
          <input style={field} type="email" autoComplete="username" required placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input style={field} type="password" autoComplete="current-password" required placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button style={action} type="submit" disabled={busy}>{busy ? 'CONNECTING…' : 'CONNECT CLOUD ACCOUNT'}</button>
        </form>
      ) : (
        <>
          <div style={muted}>{session.user.email || session.user.id}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={action} type="button" disabled={busy} onClick={() => void load()}>REFRESH CLOUD DATA</button>
            <button style={action} type="button" disabled={busy} onClick={() => void cloudAuth.signOut().catch(() => setError('Local sign-out completed, but remote session revocation could not be confirmed.'))}>SIGN OUT</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ border: '1px solid rgba(255,157,73,.22)', padding: 10 }}><small style={muted}>MODEL ROUTE</small><div style={{ marginTop: 5 }}>{provider}</div></div>
            <div style={{ border: '1px solid rgba(255,157,73,.22)', padding: 10 }}><small style={muted}>PENDING FACTS</small><div style={{ marginTop: 5 }}>{candidates.length}</div></div>
          </div>
          <div style={{ border: '1px solid rgba(255,157,73,.28)', padding: 10, display: 'grid', gap: 8 }}>
            <b>APPROVED MEMORY CONTEXT</b>
            <span style={muted}>Memory is off until you explicitly enable it. Only approved facts can be retrieved for this account.</span>
            <button style={action} type="button" disabled={busy} onClick={() => void toggleMemory()}>{enabled ? 'DISABLE MEMORY CONTEXT' : 'ENABLE MEMORY CONTEXT'}</button>
            <strong style={{ color: enabled ? '#a7d8a1' : '#e6a36b' }}>{enabled ? 'ENABLED' : 'DISABLED'}</strong>
          </div>
          <div style={{ border: '1px solid rgba(255,157,73,.28)', padding: 10, display: 'grid', gap: 8 }}>
            <b>AUTOMATIC MEMORY SUGGESTIONS</b>
            <span style={muted}>Cloud conversations only for now. When enabled, JARVIS sends the current exchange through the configured cloud model to extract stable, non-sensitive suggestions. A server-side filter blocks sensitive source turns and candidate content. Nothing enters approved memory until you review and approve it. Health, financial, legal, identity, contact details, and secrets are excluded. Local bridge voice conversations are not included yet.</span>
            <button style={action} type="button" disabled={busy || !enabled || !autoCaptureSupported} onClick={() => void toggleAutoCapture()}>{!autoCaptureSupported ? 'AUTOMATIC CAPTURE UNAVAILABLE' : autoCaptureEnabled ? 'DISABLE AUTOMATIC CAPTURE' : 'ENABLE AUTOMATIC CAPTURE'}</button>
            <strong style={{ color: autoCaptureEnabled ? '#a7d8a1' : '#e6a36b' }}>{!autoCaptureSupported ? 'NOT AVAILABLE · API CAPABILITY NOT CONFIRMED' : autoCaptureEnabled ? 'ENABLED · PENDING REVIEW ONLY' : enabled ? 'DISABLED' : 'ENABLE MEMORY CONTEXT FIRST'}</strong>
          </div>
          <div style={{ border: '1px solid rgba(255,157,73,.28)', padding: 10, display: 'grid', gap: 8 }}>
            <b>APPROVED MEMORY RETRIEVAL</b>
            <form onSubmit={searchMemory} style={{ display: 'grid', gap: 8 }}>
              <input style={field} value={memoryQuery} onChange={(event) => { setMemoryQuery(event.target.value); setMemorySearched(false); setMemoryResults([]) }} placeholder="Search approved facts…" maxLength={160} />
              <button style={action} type="submit" disabled={busy || !memoryQuery.trim()}>SEARCH APPROVED MEMORY</button>
            </form>
            {memoryResults.length === 0 && <span style={muted}>{memorySearched ? 'No matching approved facts found.' : 'Search your approved facts to retrieve account-scoped memory.'}</span>}
            {memoryResults.map((item) => <article key={item.id} style={{ borderTop: '1px solid rgba(255,157,73,.2)', paddingTop: 7, display: 'grid', gap: 4 }}><small style={muted}>{item.type.toUpperCase()} {item.topic ? `· ${item.topic}` : ''}</small><span style={{ lineHeight: 1.5 }}>{item.content}</span></article>)}
          </div>
          <div style={{ border: '1px solid rgba(255,157,73,.28)', padding: 10, display: 'grid', gap: 8 }}>
            <b>FREE MODEL CLOUD TEST</b>
            <span style={muted}>This isolated test sends a prompt through the authenticated cloud route and FreeLLMAPI. It does not replace the main voice conversation yet.</span>
            {cloudQuestion && <div style={{ color: '#ffd7ad' }}>YOU: {cloudQuestion}</div>}
            {cloudAnswer && <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{cloudAnswer}</div>}
            <form onSubmit={sendCloudTurn} style={{ display: 'grid', gap: 8 }}>
              <textarea style={{ ...field, minHeight: 76, resize: 'vertical' }} value={cloudInput} onChange={(event) => setCloudInput(event.target.value)} placeholder="Send a test message to the cloud model…" maxLength={12000} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={action} type="submit" disabled={turnBusy || !cloudInput.trim()}>{turnBusy ? 'MODEL RESPONDING…' : 'SEND CLOUD TEST'}</button>
                {turnBusy && <button style={action} type="button" onClick={() => abortTurn.current?.abort()}>CANCEL</button>}
              </div>
            </form>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <b>FACTS AWAITING YOUR APPROVAL</b>
            {candidates.length === 0 && <span style={muted}>No pending memory candidates.</span>}
            {candidates.map((candidate) => (
              <article key={candidate.id} style={{ border: '1px solid rgba(255,157,73,.24)', padding: 10, display: 'grid', gap: 7 }}>
                <small style={muted}>{candidate.fact_type.toUpperCase()}</small>
                <span style={{ lineHeight: 1.5 }}>{candidate.content}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={action} type="button" disabled={busy} onClick={() => void decide(candidate, 'approved')}>APPROVE</button>
                  <button style={action} type="button" disabled={busy} onClick={() => void decide(candidate, 'rejected')}>REJECT</button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {error && <div role="alert" style={{ color: '#ff9d91', lineHeight: 1.5 }}>{error}</div>}
      {notice && <div role="status" style={{ color: '#a7d8a1' }}>{notice}</div>}
      <small style={muted}>Cloud requests require the preview API's allowed origin and a valid account session. No personal memory is shown while signed out.</small>
    </div>
  )
}
