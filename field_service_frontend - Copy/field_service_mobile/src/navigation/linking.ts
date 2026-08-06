/* ────────────────────────────────────────────────────────────
 * Deep link configuration for React Navigation.
 *
 * Maps URL paths to screen names so that:
 *   fieldservice://login         → AuthStack > Login
 *   fieldservice://technician/jobs/42 → TechnicianRoot > Jobs > JobDetail
 *   etc.
 *
 * Replaces: route definitions in frontend_react/src/App.jsx
 * ──────────────────────────────────────────────────────────── */

import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from '../types/navigation';

const prefix = Linking.createURL('/');

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'fieldservice://'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Signup: 'signup',
        },
      },
      CustomerRoot: {
        screens: {
          Dashboard: 'customer',
          NewRequest: 'customer/new-request',
        },
      },
      TechnicianRoot: {
        screens: {
          Jobs: 'technician',
          Route: 'technician/route',
          Profile: 'technician/profile',
        },
      },
      AdminRoot: {
        screens: {
          Operations: 'admin',
          Activity: 'admin/activity',
        },
      },
    },
  },
};
