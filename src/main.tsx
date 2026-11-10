import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Deliberately no StrictMode: its double-invoked effects would open the
// microphone and arm the wake-word engine twice, and the second subscription
// steals the audio stream from the first.
createRoot(document.getElementById('root')!).render(<App />)

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
