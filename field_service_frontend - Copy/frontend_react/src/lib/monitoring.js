import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN || ''
const ENV = import.meta.env.MODE // 'development' | 'production'

/**
 * Initialize Sentry error monitoring.
 * No-op when DSN is not configured (safe for local dev).
 */
export function initMonitoring() {
  if (!DSN) return

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    // Only send in production to avoid noise
    enabled: ENV === 'production',
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Don't send PII
    sendDefaultPii: false,
    // Filter noisy errors
    ignoreErrors: [
      'ResizeObserver loop',
      'Network Error',
      'AbortError',
      'CanceledError',
      'Load failed',
      'Failed to fetch',
    ],
    beforeSend(event) {
      // Strip sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => {
          if (b.category === 'xhr' || b.category === 'fetch') {
            // Remove auth headers from network breadcrumbs
            if (b.data?.headers) delete b.data.headers
          }
          return b
        })
      }
      return event
    },
  })
}

/**
 * Report an error to Sentry manually.
 * Safe to call even when Sentry is not initialized.
 */
export function captureError(error, context = {}) {
  if (!DSN) return
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value)
    })
    Sentry.captureException(error)
  })
}

/**
 * Set user context for Sentry (call after login).
 */
export function setMonitoringUser(user) {
  if (!DSN) return
  Sentry.setUser(user ? { id: String(user.id), role: user.role } : null)
}

export { Sentry }
