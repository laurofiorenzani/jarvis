import { useState, type FormEvent } from 'react'
import { env } from '../config'
import { createCloudRuntime } from '../lib/cloud-runtime'
import { selectCloudBrain, selectLocalBrain } from '../lib/brain'

/**
 * Cloud sign-in is opt-in. Refresh tokens live only in this page's memory on
 * web builds; they are never written to localStorage. Native Keychain/Keystore
 * persistence can be injected by the native shell in a later integration.
 */
function createVolatileTokenStore() {
  const values = new Map<string, string>()
  return {
    async get(key: string) { return values.get(key) ?? null },
    async set(key: string, value: string) { values.set(key, value) },
    async remove(key: string) { values.delete(key) },
  }
}

export function CloudAccess({ onConnected, onDisconnected }: { onConnected?: () => void; onDisconnected?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(false)
  const [message, setMessage] = useState('')

  if (!env.supabaseUrl || !env.supabasePublishableKey) return null

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const runtime = createCloudRuntime({
        supabaseUrl: env.supabaseUrl,
        supabasePublishableKey: env.supabasePublishableKey,
        tokenStore: createVolatileTokenStore(),
      })
      await runtime.auth.signInWithPassword(email, password)
      await runtime.brain.warm()
      selectCloudBrain(runtime.brain)
      setConnected(true)
      setPassword('')
      setMessage('CLOUD SESSION ACTIVE · MEMORY-ONLY TOKEN STORAGE')
      onConnected?.()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cloud sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const signOut = () => {
    selectLocalBrain()
    setConnected(false)
    setMessage('LOCAL BRAIN RESTORED')
    onDisconnected?.()
  }

  return (
    <aside style={{
      position: 'fixed', zIndex: 30, top: 16, right: 16, width: 290,
      padding: 14, color: '#b9f6ff', background: 'rgba(1, 12, 22, .94)',
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
            <div style={{ marginBottom: 12, color: '#83d9e8' }}>{message}</div>
            <button type="button" onClick={signOut} style={buttonStyle}>SWITCH TO LOCAL BRAIN</button>
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
              Web session only: credentials are not persisted and will be lost on reload.
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
