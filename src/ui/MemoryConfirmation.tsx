import { useEffect, useState } from 'react'
import type { MemoryConfirmationChallenge } from '../lib/bridge'

type Props = {
  challenge: MemoryConfirmationChallenge | null
  queued?: number
  onDecision: (challenge: MemoryConfirmationChallenge, approved: boolean) => void
}

const operationLabel = (operation: MemoryConfirmationChallenge['operation']) =>
  operation === 'save' ? 'SAVE MEMORY' : operation === 'update' ? 'UPDATE MEMORY' : 'DELETE MEMORY'

export function MemoryConfirmation({ challenge, queued = 0, onDecision }: Props) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!challenge) return
    const tick = window.setInterval(() => setNow(Date.now()), 200)
    const timeout = window.setTimeout(
      () => onDecision(challenge, false),
      Math.max(0, challenge.expiresAt - Date.now()),
    )
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(timeout)
    }
  }, [challenge?.id, challenge?.expiresAt, onDecision])

  if (!challenge) return null

  const remaining = Math.max(0, challenge.expiresAt - now)
  const expired = remaining <= 0
  let preview = 'No payload preview was supplied.'
  try {
    preview = JSON.stringify(challenge.payloadPreview ?? null, null, 2) ?? 'null'
  } catch {
    preview = 'The payload preview could not be displayed.'
  }

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-confirmation-title"
        aria-describedby="memory-confirmation-description"
        style={{
          width: 'min(680px, 100%)',
          maxHeight: 'min(82vh, 760px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: 24,
          color: '#e8edf2',
          background: 'linear-gradient(145deg, #111b24, #080d12)',
          border: '1px solid rgba(116, 190, 220, .45)',
          borderRadius: 14,
          boxShadow: '0 24px 90px rgba(0,0,0,.65)',
          fontFamily: 'inherit',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ color: '#7ec8e3', fontSize: 11, letterSpacing: '.2em' }}>
              J.A.R.V.I.S. · EXPLICIT APPROVAL
            </div>
            <h2 id="memory-confirmation-title" style={{ margin: '8px 0 0', fontSize: 20, letterSpacing: '.08em' }}>
              {operationLabel(challenge.operation)}
            </h2>
          </div>
          <div style={{ textAlign: 'right', color: expired ? '#ff7777' : '#a7d9ea', fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ fontSize: 11, letterSpacing: '.12em' }}>EXPIRES IN</div>
            <strong style={{ fontSize: 20 }}>{(remaining / 1000).toFixed(1)}s</strong>
          </div>
        </header>

        <p id="memory-confirmation-description" style={{ margin: 0, color: '#b9c7d1', fontSize: 13, lineHeight: 1.5 }}>
          Review the exact operation and data below. JARVIS will not save, change, or delete this memory unless you approve it.
          {queued > 0 ? ` ${queued} other request(s) are waiting.` : ''}
        </p>

        {challenge.memoryId && (
          <div style={{ fontSize: 12, color: '#8ea3b2', overflowWrap: 'anywhere' }}>
            MEMORY ID · {challenge.memoryId}
          </div>
        )}

        <pre
          style={{
            margin: 0,
            padding: 16,
            overflow: 'auto',
            minHeight: 120,
            maxHeight: '42vh',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            color: '#d8e5ec',
            background: 'rgba(0,0,0,.35)',
            border: '1px solid rgba(150,180,195,.18)',
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          {preview}
        </pre>

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={() => onDecision(challenge, false)}
            style={{
              padding: '11px 18px',
              color: '#d8e5ec',
              background: 'transparent',
              border: '1px solid rgba(190,210,220,.35)',
              borderRadius: 7,
              cursor: 'pointer',
            }}
          >
            DENY
          </button>
          <button
            type="button"
            disabled={expired}
            onClick={() => onDecision(challenge, true)}
            style={{
              padding: '11px 18px',
              color: '#061018',
              background: expired ? '#5c6870' : '#83d0e8',
              border: 0,
              borderRadius: 7,
              cursor: expired ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            APPROVE
          </button>
        </footer>
      </section>
    </div>
  )
}
