/* ────────────────────────────────────────────────────────────
 * Notification provider — wraps react-native-toast-message.
 *
 * Exposes useNotification() with success/error/warning/info
 * methods and a deduplicate guard (same as web app's
 * NotificationContext).
 *
 * Replaces: frontend_react/src/context/NotificationContext.jsx
 * ──────────────────────────────────────────────────────────── */

import React, { createContext, useCallback, useContext, useRef } from 'react';
import Toast from 'react-native-toast-message';

interface ShowOptions {
  title?: string;
  message: string;
  dedupeKey?: string;
}

interface NotificationContextValue {
  success: (opts: ShowOptions) => void;
  error: (opts: ShowOptions) => void;
  warning: (opts: ShowOptions) => void;
  info: (opts: ShowOptions) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const DEDUPE_WINDOW_MS = 3_000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const activeKeys = useRef<Map<string, number>>(new Map());

  const show = useCallback(
    (type: 'success' | 'error' | 'info', opts: ShowOptions) => {
      // Deduplicate within a 3 s window (same as web).
      if (opts.dedupeKey) {
        const now = Date.now();
        const lastShown = activeKeys.current.get(opts.dedupeKey);
        if (lastShown && now - lastShown < DEDUPE_WINDOW_MS) return;
        activeKeys.current.set(opts.dedupeKey, now);
      }

      Toast.show({
        type,
        text1: opts.title ?? '',
        text2: opts.message,
        position: 'top',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 50,
      });
    },
    [],
  );

  const value: NotificationContextValue = {
    success: (opts) => show('success', opts),
    error: (opts) => show('error', opts),
    warning: (opts) => show('info', { ...opts, title: opts.title ?? 'Warning' }),
    info: (opts) => show('info', opts),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toast />
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return ctx;
}
