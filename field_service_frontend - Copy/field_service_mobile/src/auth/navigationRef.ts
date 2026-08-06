/* ────────────────────────────────────────────────────────────
 * Navigation reference for use outside React components.
 *
 * The primary consumer is the Axios 401 interceptor in
 * api/client.ts — it must redirect to the Login screen when
 * a token is rejected, but it runs outside the React tree.
 *
 * Replaces: window.location.href = '/login' from the web app.
 * ──────────────────────────────────────────────────────────── */

import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Reset the navigation tree to the Auth stack.
 *
 * Safe to call at any time — if the navigator hasn't mounted
 * yet the call is silently ignored.
 */
export function navigateToLogin(): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      }),
    );
  }
}
