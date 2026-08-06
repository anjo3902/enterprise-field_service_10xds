import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import {
  authApi,
  getAuthToken,
  setAuthToken,
  getStoredUser,
  setStoredUser,
  clearAuth,
  setHadActiveSession,
  getHadActiveSession,
  markSessionExpired,
} from '../services/api'
import { setMonitoringUser } from '../lib/monitoring'
import { broadcastLogin, broadcastLogout, onAuthMessage } from '../lib/authChannel'

export const AuthContext = createContext(null)

/**
 * Decode the payload from a JWT without a library.
 * Returns null if the token is not a valid JWT structure.
 */
function decodeTokenPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

/**
 * Returns true if the token is a JWT with a valid `exp` claim
 * that has not yet expired (with a 60-second buffer).
 * Non-JWT tokens (opaque strings) are treated as valid — the
 * server will reject them and the 401 interceptor handles it.
 */
function isTokenExpired(token) {
  if (!token) return true
  const payload = decodeTokenPayload(token)
  if (!payload?.exp) return false // opaque token — let server decide
  return Date.now() >= (payload.exp - 60) * 1000
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = getAuthToken()
    if (stored && isTokenExpired(stored)) {
      // Initial load: silently clean stale token to avoid confusing login-page messaging.
      clearAuth()
      setHadActiveSession(false)
      return ''
    }
    return stored || ''
  })

  const [user, setUser] = useState(() => {
    if (!token) return null
    return getStoredUser()
  })

  const [loading, setLoading] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [hadActiveSession, setHadActiveSessionState] = useState(() => getHadActiveSession())

  const logout = useCallback(() => {
    broadcastLogout()
    setToken('')
    setUser(null)
    setHadActiveSession(false)
    setHadActiveSessionState(false)
    clearAuth()
    setMonitoringUser(null)
  }, [])

  // Sync token to secure storage whenever it changes
  useEffect(() => {
    setAuthToken(token)
  }, [token])

  // Hydrate from session storage before the app renders protected content.
  useEffect(() => {
    const storedToken = getAuthToken()
    const storedUser = getStoredUser()

    if (storedToken && !token) {
      setToken(storedToken)
    }

    if (storedToken && storedUser && !user) {
      setUser(storedUser)
      setMonitoringUser(storedUser)
    }

    setAuthReady(true)
  }, [])

  // Periodically check token expiry (every 60 seconds)
  useEffect(() => {
    if (!token) return
    const id = setInterval(() => {
      if (isTokenExpired(token)) {
        if (hadActiveSession) {
          markSessionExpired()
        }
        logout()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [token, hadActiveSession, logout])

  const login = async (payload) => {
    setLoading(true)
    try {
      const data = await authApi.login(payload)
      const nextToken = String(data?.token || '').trim()
      const nextUser = data?.user || null

      if (!nextToken) {
        throw new Error('Login response missing token')
      }

      if (!nextUser || typeof nextUser !== 'object') {
        throw new Error('Login response missing user')
      }

      // Persist auth payload immediately so protected routes can read it after redirect.
      setAuthToken(nextToken)
      setStoredUser(nextUser)

      setToken(nextToken)
      setUser(nextUser)
      setHadActiveSession(true)
      setHadActiveSessionState(true)
      setMonitoringUser(nextUser)
      broadcastLogin(nextToken, nextUser)
      return nextUser
    } finally {
      setLoading(false)
    }
  }

  const loginWithToken = async ({ token: incomingToken, jobId }) => {
    setLoading(true)
    try {
      const data = await authApi.exchangeWorkspaceToken({
        token: String(incomingToken || '').trim(),
        job_id: String(jobId || '').trim(),
      })
      const nextToken = String(data?.token || '').trim()
      const nextUser = data?.user || null

      if (!nextToken) {
        throw new Error('Token exchange response missing token')
      }

      if (!nextUser || typeof nextUser !== 'object') {
        throw new Error('Token exchange response missing user')
      }

      setAuthToken(nextToken)
      setStoredUser(nextUser)

      setToken(nextToken)
      setUser(nextUser)
      setHadActiveSession(true)
      setHadActiveSessionState(true)
      setMonitoringUser(nextUser)
      broadcastLogin(nextToken, nextUser)
      return nextUser
    } finally {
      setLoading(false)
    }
  }

  const signup = async (payload) => {
    setLoading(true)
    try {
      const data = await authApi.signup(payload)
      return data
    } finally {
      setLoading(false)
    }
  }

  // Listen for login/logout events from other tabs
  useEffect(() => {
    return onAuthMessage({
      onLogin: (incomingToken, incomingUser) => {
        setToken(incomingToken)
        setAuthToken(incomingToken)
        setUser(incomingUser)
        setHadActiveSession(true)
        setHadActiveSessionState(true)
        setStoredUser(incomingUser)
        setMonitoringUser(incomingUser)
      },
      onLogout: () => {
        setToken('')
        setUser(null)
        setHadActiveSession(false)
        setHadActiveSessionState(false)
        clearAuth()
        setMonitoringUser(null)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?reason=logged-out-elsewhere'
        }
      },
    })
  }, [])

  // Derive role from JWT if available (tamper-proof signed payload),
  // otherwise fall back to the server-provided user object.
  // For opaque tokens (this backend), the role comes from the login response
  // which is stored in secure sessionStorage, not editable localStorage.
  const role = useMemo(() => {
    if (!token) return null
    // Try JWT first (if backend ever migrates to JWTs)
    const jwtPayload = decodeTokenPayload(token)
    if (jwtPayload?.role) return jwtPayload.role
    // Fallback: role from server-provided user object
    return user?.role || null
  }, [token, user])

  const value = useMemo(
    () => ({
      token,
      user,
      role,
      isAuthenticated: Boolean(token && user && !isTokenExpired(token)),
      loading,
      login,
      loginWithToken,
      signup,
      logout,
    }),
    [token, user, role, loading, login, loginWithToken, signup, logout]
  )

  if (!authReady) {
    return (
      <div className='min-h-screen flex items-center justify-center text-sm text-secondary'>
        Loading…
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
