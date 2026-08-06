/* ────────────────────────────────────────────────────────────
 * App.tsx — Root entry point.
 *
 * Provider tree (matches the architecture plan):
 *   SafeAreaProvider
 *     QueryProvider
 *       AuthProvider
 *         NotificationProvider
 *           NavigationContainer (ref: navigationRef)
 *             RootNavigator
 *
 * Replaces: frontend_react/src/main.jsx + App.jsx
 * ──────────────────────────────────────────────────────────── */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from './src/providers/QueryProvider';
import { AuthProvider } from './src/auth/AuthContext';
import { NotificationProvider } from './src/providers/NotificationProvider';
import { navigationRef } from './src/auth/navigationRef';
import { linking } from './src/navigation/linking';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <NotificationProvider>
            <NavigationContainer ref={navigationRef} linking={linking}>
              <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
              <RootNavigator />
            </NavigationContainer>
          </NotificationProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
