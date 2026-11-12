import { useCallback, useEffect, useState } from 'react'
import { cloudAuth, type CloudSession } from '../lib/cloud-auth'
import { cloudApi, type CloudMemoryCandidate } from '../lib/cloud-api'

const panel: React.CSSProperties = { display: 'grid', gap: 12, padding: 14, color: '#f4d2ad', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11 }
const field: React.CSSProperties = { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '11px 12px', color: '#ffe4c7', background: 'rgba(10,8,6,.78)', border: '1px solid rgba(255,157,73,.34)', borderRadius: 5, outlineColor: '#ffad62' }
const action: React.CSSProperties = { padding: '9px 12px', color: '#ffc58e', background: 'rgba(255,145,56,.08)', border: '1px solid rgba(255,157,73,.48)', borderRadius: 4, font: 'inherit', cursor: 'pointer' }
const muted: React.CSSProperties = { color: 'rgba(255,220,188,.58)', lineHeight: 1.6 }

export function CloudMemoryPanel() {
  const [session, setSession] = useState<CloudSession | null>(() => cloudAuth.getSession())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [candidates, setCandidates] = useState<CloudMemoryCandidate[]>([])
  const [provider, setProvider] = useState('NOT CHECKED')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => cloudAuth.subscribe(setSession), [])

  const load = useCallback(async (token: string) => {
    setBusy(true)
    setError('')
    try {
      const [preference, pending, status] = await Promise.all([
        cloudApi.getMemoryPreference(token),
        cloudApi.listMemoryCandidates(token),
        cloudApi.providerStatus(token),
      ])
      setEnabled(preference.contextEnabled)
      setCandidates(pending.candidates.filter((item) => item.status === 'pending'))
      const info = status.provider
      const name = typeof info.name === 'string' ? info.name : typeof info.provider === 'string' ? info.provider : 'CONFIGURED'
      setProvider(name.toUpperCase())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Cloud data could not be loaded.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setCandidates([])
      setEnabled(false)
      setProvider('NOT SIGNED IN')
      return
    }
    void cloudAuth.getValidAccessToken().then((token) => {
      if (token) return load(token)
      setError('Cloud session expired. Sign in again.')
    }).catch((cause: Error) => setError(cause.message))
  }, [session?.user.id, load])

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

  async function toggleMemory() {
    if (!session) return
    setBusy(true); setError(''); setNotice('')
    try {
      const token = await cloudAuth.getValidAccessToken()
      if (!token) throw new Error('Sign in again to change memory settings.')
      const saved = await cloudApi.setMemoryPreference(token, !enabled)
      setEnabled(saved.contextEnabled)
      setNotice(saved.contextEnabled ? 'APPROVED-MEMORY CONTEXT ENABLED' : 'MEMORY CONTEXT DISABLED')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Preference could not be saved.')
    } finally { setBusy(false) }
  }

  async function decide(candidate: CloudMemoryCandidate, decision: 'approved' | 'rejected') {
    setBusy(true); setError(''); setNotice('')
    try {
      const token = await cloudAuth.getValidAccessToken()
      if (!token) throw new Error('Sign in again to review memory.')
      await cloudApi.decideMemoryCandidate(token, candidate.id, decision)
      setCandidates((current) => current.filter((item) => item.id !== candidate.id))
      setNotice(decision === 'approved' ? 'MEMORY FACT APPROVED' : 'MEMORY FACT REJECTED')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Memory decision failed.')
    } finally { setBusy(false) }
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
            <button style={action} type="button" disabled={busy} onClick={() => void load(session.access_token)}>REFRESH CLOUD DATA</button>
            <button style={action} type="button" disabled={busy} onClick={() => void cloudAuth.signOut()}>SIGN OUT</button>
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
