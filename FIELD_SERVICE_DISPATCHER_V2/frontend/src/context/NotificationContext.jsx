import { createContext, useCallback, useMemo, useRef, useState } from 'react'
import NotificationViewport from '../components/NotificationViewport'

export const NotificationContext = createContext(null)

const DEFAULT_DURATIONS = {
  success: 4000,
  info: 5000,
  warning: 6500,
  error: 8000,
}

const DEFAULT_MAX_VISIBLE = 4
const DEDUPE_WINDOW_MS = 2500

let notificationSequence = 0

function nextNotificationId() {
  notificationSequence += 1
  return `notification-${Date.now()}-${notificationSequence}`
}

function normalizeType(type) {
  if (type === 'success' || type === 'warning' || type === 'error' || type === 'info') {
    return type
  }
  return 'info'
}

function buildDefaultDedupeKey({ type, title, message }) {
  return `${type}::${String(title || '').trim()}::${String(message || '').trim()}`
}

export function NotificationProvider({ children, maxVisible = DEFAULT_MAX_VISIBLE }) {
  const [notifications, setNotifications] = useState([])
  const queueRef = useRef([])
  const timersRef = useRef(new Map())
  const activeDedupeKeysRef = useRef(new Set())
  const recentDedupeKeysRef = useRef(new Map())

  const cleanupRecentDedupeKeys = useCallback(() => {
    const now = Date.now()
    for (const [key, ts] of recentDedupeKeysRef.current.entries()) {
      if (now - ts > DEDUPE_WINDOW_MS) {
        recentDedupeKeysRef.current.delete(key)
      }
    }
  }, [])

  const clearTimer = useCallback((id) => {
    const timerMeta = timersRef.current.get(id)
    if (!timerMeta) return
    clearTimeout(timerMeta.timeoutId)
    timersRef.current.delete(id)
  }, [])

  const dismiss = useCallback(
    (id) => {
      clearTimer(id)

      setNotifications((prev) => {
        const target = prev.find((item) => item.id === id)
        const next = prev.filter((item) => item.id !== id)

        if (target?.dedupeKey) {
          activeDedupeKeysRef.current.delete(target.dedupeKey)
          recentDedupeKeysRef.current.set(target.dedupeKey, Date.now())
        }

        while (next.length < maxVisible && queueRef.current.length > 0) {
          const queued = queueRef.current.shift()
          next.push(queued)
        }

        return next
      })
    },
    [clearTimer, maxVisible]
  )

  const startTimer = useCallback(
    (notification, remainingMs) => {
      const timeoutId = setTimeout(() => {
        dismiss(notification.id)
      }, remainingMs)

      timersRef.current.set(notification.id, {
        timeoutId,
        startedAt: Date.now(),
        remainingMs,
        paused: false,
      })
    },
    [dismiss]
  )

  const syncTimers = useCallback(
    (nextNotifications) => {
      const nextIds = new Set(nextNotifications.map((item) => item.id))

      for (const [id, meta] of timersRef.current.entries()) {
        if (!nextIds.has(id)) {
          clearTimeout(meta.timeoutId)
          timersRef.current.delete(id)
        }
      }

      for (const item of nextNotifications) {
        if (item.durationMs <= 0) continue
        if (!timersRef.current.has(item.id)) {
          startTimer(item, item.durationMs)
        }
      }
    },
    [startTimer]
  )

  const enqueueNotification = useCallback(
    (notification) => {
      setNotifications((prev) => {
        const next = [...prev]
        if (next.length < maxVisible) {
          next.push(notification)
        } else {
          queueRef.current.push(notification)
        }
        syncTimers(next)
        return next
      })
    },
    [maxVisible, syncTimers]
  )

  const notify = useCallback(
    ({ type = 'info', title = '', message = '', durationMs, dedupeKey }) => {
      const normalizedType = normalizeType(type)
      const key = dedupeKey || buildDefaultDedupeKey({ type: normalizedType, title, message })

      cleanupRecentDedupeKeys()

      if (activeDedupeKeysRef.current.has(key)) {
        return null
      }

      const recentSeenAt = recentDedupeKeysRef.current.get(key)
      if (recentSeenAt && Date.now() - recentSeenAt <= DEDUPE_WINDOW_MS) {
        return null
      }

      activeDedupeKeysRef.current.add(key)

      const nextNotification = {
        id: nextNotificationId(),
        type: normalizedType,
        title: String(title || '').trim(),
        message: String(message || '').trim(),
        durationMs: typeof durationMs === 'number' ? durationMs : DEFAULT_DURATIONS[normalizedType],
        dedupeKey: key,
      }

      enqueueNotification(nextNotification)
      return nextNotification.id
    },
    [cleanupRecentDedupeKeys, enqueueNotification]
  )

  const pause = useCallback((id) => {
    const timerMeta = timersRef.current.get(id)
    if (!timerMeta || timerMeta.paused) return

    clearTimeout(timerMeta.timeoutId)
    const elapsed = Date.now() - timerMeta.startedAt
    const remainingMs = Math.max(0, timerMeta.remainingMs - elapsed)

    timersRef.current.set(id, {
      ...timerMeta,
      remainingMs,
      paused: true,
    })
  }, [])

  const resume = useCallback(
    (id) => {
      const timerMeta = timersRef.current.get(id)
      if (!timerMeta || !timerMeta.paused) return

      if (timerMeta.remainingMs <= 0) {
        dismiss(id)
        return
      }

      const timeoutId = setTimeout(() => {
        dismiss(id)
      }, timerMeta.remainingMs)

      timersRef.current.set(id, {
        ...timerMeta,
        timeoutId,
        startedAt: Date.now(),
        paused: false,
      })
    },
    [dismiss]
  )

  const api = useMemo(
    () => ({
      notify,
      success: (payload) => notify({ ...payload, type: 'success' }),
      error: (payload) => notify({ ...payload, type: 'error' }),
      warning: (payload) => notify({ ...payload, type: 'warning' }),
      info: (payload) => notify({ ...payload, type: 'info' }),
      dismiss,
      pause,
      resume,
    }),
    [dismiss, notify, pause, resume]
  )

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <NotificationViewport
        notifications={notifications}
        onDismiss={dismiss}
        onPause={pause}
        onResume={resume}
      />
    </NotificationContext.Provider>
  )
}
