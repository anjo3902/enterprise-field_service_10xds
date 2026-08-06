/**
 * Secure token storage module.
 *
 * Uses in-memory Map as the primary store with sessionStorage
 * as a fallback for page-reload persistence.
 *
 * Why NOT localStorage:
 *  - Persists indefinitely (stolen tokens remain valid after browser close)
 *  - Shared across all tabs (larger XSS attack surface)
 *  - sessionStorage scopes to the current tab and clears on close
 *
 * On first access, migrates any leftover localStorage tokens into
 * sessionStorage and wipes the localStorage copies.
 */

const memory = new Map()
const MIGRATE_KEYS = ['fsm_token', 'fsm_user']

let migrated = false

function migrateFromLocalStorage() {
  if (migrated) return
  migrated = true
  try {
    for (const key of MIGRATE_KEYS) {
      const legacy = localStorage.getItem(key)
      if (legacy && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, legacy)
      }
      localStorage.removeItem(key)
    }
  } catch {
    // storage access may fail in sandboxed iframes / incognito
  }
}

export const secureStorage = {
  get(key) {
    migrateFromLocalStorage()
    if (memory.has(key)) return memory.get(key)
    try {
      const val = sessionStorage.getItem(key)
      if (val) memory.set(key, val)
      return val
    } catch {
      return null
    }
  },

  set(key, value) {
    migrateFromLocalStorage()
    if (value) {
      memory.set(key, value)
      try { sessionStorage.setItem(key, value) } catch {}
    } else {
      this.remove(key)
    }
  },

  remove(key) {
    memory.delete(key)
    try { sessionStorage.removeItem(key) } catch {}
    try { localStorage.removeItem(key) } catch {} // clean up legacy
  },

  clear() {
    memory.clear()
    try { sessionStorage.clear() } catch {}
  },
}
