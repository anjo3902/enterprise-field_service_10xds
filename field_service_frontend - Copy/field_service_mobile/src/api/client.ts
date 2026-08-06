/* ────────────────────────────────────────────────────────────
 * Axios HTTP client — shared instance for all API calls.
 *
 * Mirrors the web app's api.js Axios configuration:
 *   - Base URL from env
 *   - 10 s default timeout, 60 s for LLM endpoints
 *   - Bearer token injected via request interceptor (sync read)
 *   - 401 response interceptor → clear auth → navigate to login
 *
 * Replaces: the Axios instance + interceptors from
 *           frontend_react/src/services/api.js
 * ──────────────────────────────────────────────────────────── */

import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { getToken, clearAll, getHadActiveSession, markSessionExpired } from '../auth/tokenStorage';
import { navigateToLogin } from '../auth/navigationRef';

const TIMEOUT_MS = 10_000;
const LLM_TIMEOUT_MS = 60_000;

/** Endpoints that hit an LLM and need a longer timeout. */
const LLM_PATHS = ['/reports/previsit', '/reports/full', '/reports/improve'];

const client = axios.create({
  baseURL: env.API_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Bearer token ────────────────

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Sync read from in-memory cache — no await needed.
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Apply longer timeout for LLM-backed endpoints.
  const url = config.url ?? '';
  if (LLM_PATHS.some((p) => url.includes(p))) {
    config.timeout = LLM_TIMEOUT_MS;
  }

  return config;
});

// ── Response interceptor: handle 401 globally ───────────────

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const hadSession = getHadActiveSession();
      await clearAll();
      if (hadSession) {
        await markSessionExpired();
      }
      navigateToLogin();
    }
    return Promise.reject(error);
  },
);

export default client;
