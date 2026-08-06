/**
 * Environment configuration.
 *
 * Reads values from Expo's Constants (app.config.js → extra).
 * Falls back to process.env for local dev / EAS Build env injection.
 */
import Constants from 'expo-constants';

interface Env {
  API_URL: string;
  GOOGLE_MAPS_KEY: string;
}

const extra = Constants.expoConfig?.extra ?? {};

export const env: Env = {
  API_URL: (extra.API_URL as string) ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
  GOOGLE_MAPS_KEY: (extra.GOOGLE_MAPS_KEY as string) ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '',
};
