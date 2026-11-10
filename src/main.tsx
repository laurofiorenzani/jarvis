import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EmailLinkGate } from './ui/EmailLinkGate'

// Keep email verification on a tiny, explicit-click screen. Automated mail
// scanners may prefetch email links, so this route must never auto-redirect.
const root = createRoot(document.getElementById('root')!)
root.render(
  window.location.pathname === '/auth/email-link'
    ? <EmailLinkGate />
    : <App />,
)

// The web release is installable as a PWA. The worker caches only the app
// shell and hashed same-origin assets; authenticated API responses are never
// intercepted or stored by the service worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[jarvis] service worker unavailable:', error)
    })
  })
}
