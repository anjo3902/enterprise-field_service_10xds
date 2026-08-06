/* ────────────────────────────────────────────────────────────
 * app.config.js — Dynamic Expo configuration.
 *
 * Reads environment variables and injects them into the
 * `extra` object, which is accessed at runtime via
 * expo-constants in src/config/env.ts.
 *
 * Environment variables:
 *   EXPO_PUBLIC_API_URL       — Backend API base URL
 *   EXPO_PUBLIC_GOOGLE_MAPS_KEY — Google Maps API key
 * ──────────────────────────────────────────────────────────── */

export default ({ config }) => ({
  ...config,
  name: 'Field Service',
  slug: 'field-service-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  // splash: {
  //   image: './assets/splash-icon.png',
  //   resizeMode: 'contain',
  //   backgroundColor: '#0f172a',
  // },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fieldservice.mobile',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: '#0f172a',
    },
    package: 'com.fieldservice.mobile',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
    GOOGLE_MAPS_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '',
  },
  scheme: 'fieldservice',
});
