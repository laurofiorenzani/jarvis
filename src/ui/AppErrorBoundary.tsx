import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null; componentStack: string }

/** Keep a visible recovery surface if a renderer or UI subtree fails. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '' }

  static getDerivedStateFromError(error: Error): State {
    return { error, componentStack: '' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[jarvis] application render failed', error, info.componentStack)
    this.setState({ componentStack: info.componentStack ?? '' })
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
          <details style={{ maxWidth: 560, width: '100%', textAlign: 'left', color: '#ffcf9c' }}>
            <summary style={{ cursor: 'pointer', fontSize: 11, letterSpacing: '.12em' }}>ERROR DETAILS</summary>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 10, lineHeight: 1.5 }}>
              {this.state.error.stack ?? this.state.error.message}
              {this.state.componentStack}
            </pre>
          </details>
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
