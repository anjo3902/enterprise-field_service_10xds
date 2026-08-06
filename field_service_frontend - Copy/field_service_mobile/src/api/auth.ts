/* ────────────────────────────────────────────────────────────
 * Auth API service.
 *
 * Endpoints:
 *   POST /auth/login
 *   POST /auth/signup
 *   POST /auth/telegram/claim
 *
 * Replaces: authApi from frontend_react/src/services/api.js
 * ──────────────────────────────────────────────────────────── */

import client from './client';
import type {
  LoginRequest,
  SignupRequest,
  TelegramClaimRequest,
  AuthResponse,
} from '../types/api';

export const authApi = {
  /**
   * Authenticate with email + password.
   * Returns an access token and user object.
   */
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const { data } = await client.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  /**
   * Register a new account.
   * On success the user should be redirected to the login screen.
   */
  async signup(payload: SignupRequest): Promise<AuthResponse> {
    const { data } = await client.post<AuthResponse>('/auth/signup', payload);
    return data;
  },

  /**
   * Exchange a Telegram workspace token for a standard JWT.
   * Used for deep-link authentication from Telegram bot.
   */
  async telegramClaim(payload: TelegramClaimRequest): Promise<AuthResponse> {
    const { data } = await client.post<AuthResponse>('/auth/telegram/claim', payload);
    return data;
  },
};
