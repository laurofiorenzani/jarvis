import { useState } from 'react'
import { getSafeConfirmationUrl } from '../lib/email-confirmation-url'

/**
 * Human-click interstitial for Supabase one-time email links.
 *
 * Email security scanners can prefetch links. This page deliberately does not
 * auto-redirect or verify tokens during render; only the explicit button click
 * opens the validated Supabase confirmation URL.
 */
export function EmailLinkGate() {
  const [confirmationUrl] = useState(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return getSafeConfirmationUrl(params.get('confirmation'))
  })

  return (
    <main style={{
      minHeight: '100svh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      boxSizing: 'border-box',
      background: 'radial-gradient(ellipse at 50% 35%, #102a38 0%, #030a11 58%, #010408 100%)',
      color: '#d9f8ff',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    }}>
      <section style={{
        width: 'min(100%, 460px)',
        boxSizing: 'border-box',
        padding: 28,
        border: '1px solid #286174',
        borderRadius: 12,
        background: 'rgba(3, 17, 27, .94)',
        boxShadow: '0 18px 70px rgba(0,0,0,.45)',
        textAlign: 'center',
      }}>
        <div style={{ color: '#67d8ee', fontSize: 12, letterSpacing: '.24em' }}>J.A.R.V.I.S.</div>
        <h1 style={{ margin: '18px 0 10px', fontSize: 22, fontWeight: 600 }}>
          {confirmationUrl ? 'Confirm your email' : 'Link unavailable'}
        </h1>
        <p style={{ color: '#a7c5cf', fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
          {confirmationUrl
            ? 'Your secure sign-in link is ready. Continue only when you are ready to confirm this email address or set your password.'
            : 'This email link is invalid, incomplete, or has expired. Request a fresh link from the JARVIS sign-in screen.'}
        </p>
        {confirmationUrl && (
          <button
            type="button"
            onClick={() => window.location.assign(confirmationUrl)}
            style={{
              width: '100%',
              padding: '14px 18px',
              border: '1px solid #49bfd6',
              borderRadius: 7,
              background: 'linear-gradient(135deg, #0b5268, #103446)',
              color: '#e8fcff',
              font: 'inherit',
              fontSize: 13,
              letterSpacing: '.08em',
              cursor: 'pointer',
            }}
          >
            CONTINUE TO JARVIS
          </button>
        )}
        <p style={{ color: '#668894', fontSize: 11, lineHeight: 1.6, margin: '20px 0 0' }}>
          For security, this page will not open or consume your one-time link until you press the button.
        </p>
      </section>
    </main>
  )
}
