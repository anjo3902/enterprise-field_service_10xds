/* ────────────────────────────────────────────────────────────
 * Token storage — two-tier approach.
 *
 * Layer 1: In-memory Map (sync read for Axios interceptor)
 * Layer 2: expo-secure-store (token) + AsyncStorage (user/flags)
 *
 * Replaces: sessionStorage from the web app.
 *
 * Design rationale:
 *   The Axios request interceptor runs synchronously. If
 *   getToken() were async, every single API call would need
 *   an await before attaching the Authorization header. The
 *   in-memory cache avoids this — SecureStore/AsyncStorage
 *   are only hit during bootstrap and write-through on set().
 * ──────────────────────────────────────────────────────────── */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Storage keys ────────────────────────────────────────────

const KEY_TOKEN = 'fsm_token';
const KEY_USER = 'fsm_user';
const KEY_HAD_SESSION = 'fsm_had_active_session';
const KEY_SESSION_EXPIRED = 'fsm_session_expired';

// ── Layer 1: In-memory cache ────────────────────────────────

const cache = new Map<string, string>();

// ── Public API ──────────────────────────────────────────────

/** Sync read — always returns from the in-memory cache. */
export function getToken(): string {
  return cache.get(KEY_TOKEN) ?? '';
}

/** Write-through: updates cache immediately, persists async. */
export async function setToken(token: string): Promise<void> {
  cache.set(KEY_TOKEN, token);
  await SecureStore.setItemAsync(KEY_TOKEN, token);
}

/** Sync read from cache. */
export function getUser(): string {
  return cache.get(KEY_USER) ?? '';
}

/** Write-through for user JSON. */
export async function setUser(userJson: string): Promise<void> {
  cache.set(KEY_USER, userJson);
  await AsyncStorage.setItem(KEY_USER, userJson);
}

/** Mark that we had an active session (for expiry messaging). */
export async function setHadActiveSession(value: boolean): Promise<void> {
  if (value) {
    cache.set(KEY_HAD_SESSION, '1');
    await AsyncStorage.setItem(KEY_HAD_SESSION, '1');
  } else {
    cache.delete(KEY_HAD_SESSION);
    await AsyncStorage.removeItem(KEY_HAD_SESSION);
  }
}

export function getHadActiveSession(): boolean {
  return cache.get(KEY_HAD_SESSION) === '1';
}

/** Flag that a session expired (shown on login screen). */
export async function markSessionExpired(): Promise<void> {
  cache.set(KEY_SESSION_EXPIRED, '1');
  await AsyncStorage.setItem(KEY_SESSION_EXPIRED, '1');
}

/**
 * Read and clear the session-expired flag (consume once).
 * Returns true if a session had expired.
 */
export async function consumeSessionExpired(): Promise<boolean> {
  const was = cache.get(KEY_SESSION_EXPIRED) === '1';
  cache.delete(KEY_SESSION_EXPIRED);
  await AsyncStorage.removeItem(KEY_SESSION_EXPIRED);
  return was;
}

/** Clear all auth data — called on logout and 401. */
export async function clearAll(): Promise<void> {
  cache.delete(KEY_TOKEN);
  cache.delete(KEY_USER);
  cache.delete(KEY_HAD_SESSION);

  await Promise.all([
    SecureStore.deleteItemAsync(KEY_TOKEN),
    AsyncStorage.removeItem(KEY_USER),
    AsyncStorage.removeItem(KEY_HAD_SESSION),
  ]);
}

/**
 * Bootstrap: read persisted values into the in-memory cache.
 *
 * Must be awaited before the app renders its navigation tree
 * so that the Axios interceptor has a token (if one exists)
 * from the very first API call.
 */
export async function bootstrap(): Promise<void> {
  const [token, user, had, expired] = await Promise.all([
    SecureStore.getItemAsync(KEY_TOKEN),
    AsyncStorage.getItem(KEY_USER),
    AsyncStorage.getItem(KEY_HAD_SESSION),
    AsyncStorage.getItem(KEY_SESSION_EXPIRED),
  ]);

  if (token) cache.set(KEY_TOKEN, token);
  if (user) cache.set(KEY_USER, user);
  if (had) cache.set(KEY_HAD_SESSION, had);
  if (expired) cache.set(KEY_SESSION_EXPIRED, expired);
}
