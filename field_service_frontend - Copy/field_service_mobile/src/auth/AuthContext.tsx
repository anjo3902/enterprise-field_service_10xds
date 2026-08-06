/* ────────────────────────────────────────────────────────────
 * AuthContext — app-wide authentication state.
 *
 * Provides: token, user, role, isAuthenticated, isReady,
 *           login(), signup(), logout(), loginWithToken()
 *
 * Replaces: frontend_react/src/context/AuthContext.jsx
 *
 * Key differences from the web version:
 *   1. Bootstrap is async (reads SecureStore / AsyncStorage)
 *   2. No BroadcastChannel (RN is single-process)
 *   3. No window.location — uses navigationRef for redirects
 *   4. Token expiry polling + AppState re-check on foreground
 * ──────────────────────────────────────────────────────────── */

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as tokenStorage from './tokenStorage';
import { authApi } from '../api/auth';
import { navigateToLogin } from './navigationRef';
import type { User, UserRole, LoginRequest, SignupRequest } from '../types/api';

// ── JWT helpers (ported from web AuthContext) ───────────────

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    // Opaque token — server decides validity via 401.
    return false;
  }
  // 60 s buffer (same as web).
  return Date.now() >= (payload.exp - 60) * 1000;
}

// ── Context type ────────────────────────────────────────────

interface AuthContextValue {
  token: string | null;
  user: User | null;
  role: UserRole | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<User>;
  signup: (payload: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  loginWithToken: (workspaceToken: string) => Promise<User>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── Bootstrap: load persisted auth into state + cache ─────

  useEffect(() => {
    (async () => {
      await tokenStorage.bootstrap();
      const storedToken = tokenStorage.getToken();
      const storedUserJson = tokenStorage.getUser();

      if (storedToken && !isTokenExpired(storedToken)) {
        setToken(storedToken);
        if (storedUserJson) {
          try {
            setUser(JSON.parse(storedUserJson));
          } catch {
            // Corrupted user data — clear it.
            await tokenStorage.clearAll();
          }
        }
      } else if (storedToken) {
        // Token exists but is expired — clean up.
        const hadSession = tokenStorage.getHadActiveSession();
        await tokenStorage.clearAll();
        if (hadSession) {
          await tokenStorage.markSessionExpired();
        }
      }

      setIsReady(true);
    })();
  }, []);

  // ── Token expiry polling (every 60 s, same as web) ────────

  useEffect(() => {
    if (!token) return;
    const id = setInterval(async () => {
      if (isTokenExpired(token)) {
        const hadSession = tokenStorage.getHadActiveSession();
        await tokenStorage.clearAll();
        if (hadSession) {
          await tokenStorage.markSessionExpired();
        }
        setToken(null);
        setUser(null);
        navigateToLogin();
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [token]);

  // ── AppState: re-check token when returning to foreground ─

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        token
      ) {
        if (isTokenExpired(token)) {
          const hadSession = tokenStorage.getHadActiveSession();
          await tokenStorage.clearAll();
          if (hadSession) {
            await tokenStorage.markSessionExpired();
          }
          setToken(null);
          setUser(null);
          navigateToLogin();
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [token]);

  // ── login ─────────────────────────────────────────────────

  const login = useCallback(async (payload: LoginRequest): Promise<User> => {
    const res = await authApi.login(payload);
    const accessToken = res.access_token || res.token || '';
    const resUser = res.user;

    await tokenStorage.setToken(accessToken);
    await tokenStorage.setUser(JSON.stringify(resUser));
    await tokenStorage.setHadActiveSession(true);

    setToken(accessToken);
    setUser(resUser);
    return resUser;
  }, []);

  // ── signup ────────────────────────────────────────────────

  const signup = useCallback(async (payload: SignupRequest): Promise<void> => {
    await authApi.signup(payload);
    // Web behaviour: signup does NOT auto-login.
    // User is redirected to login screen by the caller.
  }, []);

  // ── logout ────────────────────────────────────────────────

  const logout = useCallback(async (): Promise<void> => {
    await tokenStorage.clearAll();
    setToken(null);
    setUser(null);
    navigateToLogin();
  }, []);

  // ── loginWithToken (Telegram deep-link exchange) ──────────

  const loginWithToken = useCallback(
    async (workspaceToken: string): Promise<User> => {
      const res = await authApi.telegramClaim({ token: workspaceToken });
      const accessToken = res.access_token || res.token || '';
      const resUser = res.user;

      await tokenStorage.setToken(accessToken);
      await tokenStorage.setUser(JSON.stringify(resUser));
      await tokenStorage.setHadActiveSession(true);

      setToken(accessToken);
      setUser(resUser);
      return resUser;
    },
    [],
  );

  // ── Derived state ─────────────────────────────────────────

  const role: UserRole | null = user?.role ?? null;
  const isAuthenticated = Boolean(token && user && !isTokenExpired(token));

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      role,
      isReady,
      isAuthenticated,
      login,
      signup,
      logout,
      loginWithToken,
    }),
    [token, user, role, isReady, isAuthenticated, login, signup, logout, loginWithToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
