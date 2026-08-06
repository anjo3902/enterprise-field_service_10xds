import { Component } from 'react'
import { captureError } from '../lib/monitoring'

/**
 * ErrorBoundary — catches any unhandled render crash in the subtree and
 * shows a friendly diagnostic panel instead of a blank screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Log to console so devtools shows the exact crash chain
    console.error('[ErrorBoundary] FRONTEND RENDER CRASH:', error)
    console.error('[ErrorBoundary] Component stack:', info?.componentStack)
    // Report to Sentry (no-op when DSN not configured)
    captureError(error, { componentStack: info?.componentStack })
    this.setState({ info })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const isDev = import.meta.env.DEV
    const msg = this.state.error?.message || String(this.state.error)

    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
        }}
      >
        <div
          style={{
            maxWidth: '560px',
            width: '100%',
            background: '#fff',
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            padding: '28px 24px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#991b1b',
            }}
          >
            {isDev ? '⚠ UI Error — Something went wrong' : 'Something went wrong'}
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#374151' }}>
            {isDev
              ? <>A rendering error was caught. <strong>Open DevTools → Console</strong> (F12) to see the full crash trace.</>
              : 'An unexpected error occurred. Please try again or reload the page.'}
          </p>

          {isDev ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                color: '#991b1b',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#1d4ed8',
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }
}
