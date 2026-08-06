/* ────────────────────────────────────────────────────────────
 * TechnicianNavigator — bottom tabs for technician role.
 *
 * Replaces: TechnicianLayout in the web app.
 *   Tab: Jobs    → TechnicianJobsStack
 *   Tab: Route   → RouteMapScreen
 *   Tab: Profile → ProfileScreen
 *
 * Header parity with frontend_react/src/components/Navbar.jsx:
 *   • headerRight: user name + role + Logout button
 *     (mirrors web's flex items-center gap-2/3 zone)
 *   • Logout calls useAuth().logout() → AuthContext.tsx
 *     which calls tokenStorage.clearAll() + navigateToLogin()
 *
 * Header visibility on all three tabs:
 *   • Jobs tab    — tab header shown (headerRight visible).
 *                   TechnicianJobsStack suppresses its own internal
 *                   stack header for JobListScreen, so no double-header.
 *   • Route tab   — tab header shown (headerRight visible).
 *   • Profile tab — tab header shown (headerRight visible).
 * ──────────────────────────────────────────────────────────── */

import React, { useCallback } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TechnicianJobsStack from './TechnicianJobsStack';
import RouteMapScreen from '../screens/technician/RouteMapScreen';
import ProfileScreen from '../screens/technician/ProfileScreen';
import type { TechnicianTabParamList } from '../types/navigation';
import { useAuth } from '../auth/useAuth';
import { colors } from '../theme/colors';
import { LogOut, Wrench, Map, User } from 'lucide-react-native';

const Tab = createBottomTabNavigator<TechnicianTabParamList>();

// ─── Technician Header Right ─────────────────────────────────
// Mirrors: Navbar.jsx L44–56  (the header-right zone)
//   <div className='text-right hidden sm:block'>
//     <p>{user?.name || 'User'}</p>
//     <p>{user?.role || '-'}</p>
//   </div>
//   <button onClick={logout}><LogOut /> Logout</button>

function TechnicianHeaderRight() {
  const { user, logout } = useAuth();

  const handleLogout = useCallback(() => {
    // Web fires logout() directly on click.
    // On mobile we guard with a confirmation alert (platform convention).
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  }, [logout]);

  return (
    <View style={styles.headerRight}>
      {/* User profile block — mirrors web's text-right hidden sm:block */}
      <View style={styles.profileBlock}>
        <Text style={styles.userName} numberOfLines={1}>
          {user?.name || 'User'}
        </Text>
        <Text style={styles.userRole} numberOfLines={1}>
          {user?.role || '-'}
        </Text>
      </View>

      {/* Logout button — mirrors web's border rounded-lg flex gap-2 */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        accessibilityLabel="Logout"
        accessibilityRole="button"
      >
        <LogOut color={colors.primary.DEFAULT} size={14} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Navigator ───────────────────────────────────────────────

export default function TechnicianNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        // ── Header styling (mirrors web bg-card border-b border-gray-200 sticky) ──
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary.DEFAULT,
        headerTitleStyle: { fontWeight: '700' },

        // ── Inject technician profile + logout into every technician screen header ──
        headerRight: () => <TechnicianHeaderRight />,

        // ── Tab bar (bottom nav equivalent of web's NavLink pills) ──
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 56,
        },
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.secondary.DEFAULT,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Jobs"
        component={TechnicianJobsStack}
        options={{
          title: 'Assigned Jobs',
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color, size }) => <Wrench color={color} size={size || 20} />,
        }}
      />
      <Tab.Screen
        name="Route"
        component={RouteMapScreen}
        options={{
          title: 'Route Plan',
          tabBarLabel: 'Route',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size || 20} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size || 20} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Styles ──────────────────────────────────────────────────
// All values mirror the web Navbar.jsx token equivalents
// and are identical to AdminNavigator.tsx for consistency.

const styles = StyleSheet.create({
  // ── Header right zone ─────────────────────────────────────
  // web: flex items-center gap-2 sm:gap-3
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },

  // ── User profile block ────────────────────────────────────
  // web: text-right hidden sm:block
  profileBlock: {
    alignItems: 'flex-end',
  },
  // web: text-sm font-medium text-primary
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    maxWidth: 120,
  },
  // web: text-xs text-secondary capitalize
  userRole: {
    fontSize: 11,
    color: colors.secondary.DEFAULT,
    textTransform: 'capitalize',
  },

  // ── Logout button ─────────────────────────────────────────
  // web: px-3 py-2 border border-gray-300 rounded-lg text-sm
  //      text-primary hover:bg-gray-50 flex items-center gap-2
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  // web: <span className='hidden sm:inline'>Logout</span>
  logoutText: {
    fontSize: 13,
    color: colors.primary.DEFAULT,
    fontWeight: '500',
  },
});
