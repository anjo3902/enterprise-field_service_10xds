/* ────────────────────────────────────────────────────────────
 * RootNavigator — the top-level auth gate.
 *
 * Replaces: the ProtectedRoute + role-based routing logic in
 *           frontend_react/src/App.jsx
 *
 * Decision tree:
 *   1. !isReady           → Splash / loading screen
 *   2. !isAuthenticated   → AuthStack (Login, Signup)
 *   3. role === 'customer'    → CustomerNavigator
 *   4. role === 'technician'  → TechnicianNavigator
 *   5. role === 'admin'       → AdminNavigator
 *   6. else                   → logout + AuthStack
 *
 * There is no ProtectedRoute component. The navigation tree
 * itself IS the auth guard — unauthorized screens simply do
 * not exist in the tree.
 * ──────────────────────────────────────────────────────────── */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/useAuth';
import AuthStack from './AuthStack';
import CustomerNavigator from './CustomerNavigator';
import TechnicianNavigator from './TechnicianNavigator';
import AdminNavigator from './AdminNavigator';
import type { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isReady, isAuthenticated, role, logout } = useAuth();

  // ── 1. Bootstrap in progress ─────────────────────────────

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashBrand}>⚡</Text>
        <Text style={styles.splashTitle}>Field Service</Text>
        <ActivityIndicator
          color="#818cf8"
          size="large"
          style={styles.splashSpinner}
        />
      </View>
    );
  }

  // ── 2. Not authenticated → Auth screens ───────────────────

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthStack} />
      </Stack.Navigator>
    );
  }

  // ── 3–5. Role-based navigator ─────────────────────────────

  // Determine which navigator to show based on role.
  // If the role is unexpected, force logout (safety net).
  let RoleNavigator: React.ComponentType;
  let rootName: keyof RootStackParamList;

  switch (role) {
    case 'customer':
      RoleNavigator = CustomerNavigator;
      rootName = 'CustomerRoot';
      break;
    case 'technician':
      RoleNavigator = TechnicianNavigator;
      rootName = 'TechnicianRoot';
      break;
    case 'admin':
      RoleNavigator = AdminNavigator;
      rootName = 'AdminRoot';
      break;
    default:
      // Unknown role — force logout.
      logout();
      return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={rootName} component={RoleNavigator} />
    </Stack.Navigator>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashBrand: {
    fontSize: 64,
    marginBottom: 12,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  splashSpinner: {
    marginTop: 32,
  },
});
