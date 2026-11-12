import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Keep a visible recovery surface if a renderer or UI subtree fails. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[jarvis] application render failed', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{
          minHeight: '100dvh', padding: 'max(24px, env(safe-area-inset-top)) 24px',
          display: 'grid', placeContent: 'center', gap: 16,
          background: '#01060c', color: '#ffb36b',
          fontFamily: 'system-ui, sans-serif', textAlign: 'center',
        }}>
          <div style={{ letterSpacing: '.35em', fontSize: 12 }}>J.A.R.V.I.S. · RECOVERY</div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>The interface encountered an error.</h1>
          <p style={{ maxWidth: 520, color: '#b8c7d2', fontSize: 13, lineHeight: 1.6 }}>
            The application is still available for diagnostics. Reload to try again.
          </p>
          <code style={{ maxWidth: 520, overflowWrap: 'anywhere', color: '#ffcf9c', fontSize: 11 }}>
            {this.state.error.message}
          </code>
          <button onClick={() => window.location.reload()} style={{
            justifySelf: 'center', padding: '12px 22px', border: '1px solid #ff9b3d',
            background: 'transparent', color: '#ffb36b', letterSpacing: '.15em',
          }}>RELOAD JARVIS</button>
        </main>
      )
    }
    return this.props.children
  }
}
