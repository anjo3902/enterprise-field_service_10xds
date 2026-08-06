/**
 * Cross-tab auth synchronization via BroadcastChannel API.
 *
 * Security model:
 *   - BroadcastChannel is same-origin only (no cross-domain leakage)
 *   - Token stays in memory + sessionStorage per-tab (not reverted to localStorage)
 *   - This channel ONLY syncs login/logout events between tabs
 *   - Each tab stores received credentials in its own sessionStorage
 */

const CHANNEL_NAME = 'fsm_auth_sync'

let channel = null

function getChannel() {
  if (channel) return channel
  // BroadcastChannel is supported in all modern browsers
  // Gracefully no-op in environments that don't support it (e.g., some test runners)
  if (typeof BroadcastChannel === 'undefined') return null
  channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

/**
 * Broadcast a login event to all other tabs.
 * Called after successful login in AuthContext.
 */
export function broadcastLogin(token, user) {
  const ch = getChannel()
  if (!ch) return
  ch.postMessage({ type: 'LOGIN', token, user })
}

/**
 * Broadcast a logout event to all other tabs.
 * Called on logout in AuthContext.
 */
export function broadcastLogout() {
  const ch = getChannel()
  if (!ch) return
  ch.postMessage({ type: 'LOGOUT' })
}

/**
 * Listen for auth events from other tabs.
 * Returns a cleanup function to remove the listener.
 *
 * @param {object} handlers
 * @param {(token: string, user: object) => void} handlers.onLogin
 * @param {() => void} handlers.onLogout
 * @returns {() => void} cleanup
 */
export function onAuthMessage({ onLogin, onLogout }) {
  const ch = getChannel()
  if (!ch) return () => {}

  const handler = (event) => {
    const { type, token, user } = event.data || {}
    if (type === 'LOGIN' && token && user) {
      onLogin(token, user)
    } else if (type === 'LOGOUT') {
      onLogout()
    }
  }

  ch.addEventListener('message', handler)
  return () => ch.removeEventListener('message', handler)
}
