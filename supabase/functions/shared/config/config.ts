/**
 * config.ts
 * ─────────────────────────────────────────────────────────────────
 * Central configuration loader for all Edge Functions.
 * Validates required environment variables at startup.
 * Throws a clear error if any required variable is missing,
 * preventing silent failures at runtime.
 *
 * Usage:
 *   import { config } from "../shared/config/config.ts";
 *   const url = config.supabaseUrl;
 */

// ── Types ─────────────────────────────────────────────────────────

export interface AppConfig {
  // Supabase
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  readonly supabaseJwtSecret: string;

  // AI
  readonly openAiApiKey: string;
  readonly googleAdkApiKey: string;

  // Maps & Dispatch
  readonly googleMapsApiKey: string;

  // Notifications
  readonly fcmServerKey: string;
  readonly sendgridApiKey: string;
  readonly twilioAuthToken: string;
  readonly twilioAccountSid: string;
  readonly twilioFromNumber: string;

  // Storage
  readonly virusTotalApiKey: string;

  // Platform
  readonly environment: "local" | "staging" | "production";
  readonly logLevel: "debug" | "info" | "warn" | "error";
}

// ── Required variables (throws if missing) ────────────────────────

const REQUIRED_VARS: Array<keyof AppConfig> = [
  "supabaseUrl",
  "supabaseAnonKey",
  "supabaseServiceRoleKey",
  "supabaseJwtSecret",
];

// ── Optional variables (warn if missing) ──────────────────────────

const OPTIONAL_VARS: Array<keyof AppConfig> = [
  "openAiApiKey",
  "googleAdkApiKey",
  "googleMapsApiKey",
  "fcmServerKey",
  "sendgridApiKey",
  "twilioAuthToken",
  "twilioAccountSid",
  "twilioFromNumber",
  "virusTotalApiKey",
];

// ── Loader ────────────────────────────────────────────────────────

function loadConfig(): AppConfig {
  const get = (key: string, fallback = ""): string =>
    Deno.env.get(key) ?? fallback;

  const cfg: AppConfig = {
    // Supabase
    supabaseUrl:            get("SUPABASE_URL"),
    supabaseAnonKey:        get("SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: get("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseJwtSecret:      get("SUPABASE_JWT_SECRET"),

    // AI
    openAiApiKey:    get("OPENAI_API_KEY"),
    googleAdkApiKey: get("GOOGLE_ADK_API_KEY"),

    // Maps
    googleMapsApiKey: get("GOOGLE_MAPS_API_KEY"),

    // Notifications
    fcmServerKey:     get("FCM_SERVER_KEY"),
    sendgridApiKey:   get("SENDGRID_API_KEY"),
    twilioAuthToken:  get("TWILIO_AUTH_TOKEN"),
    twilioAccountSid: get("TWILIO_ACCOUNT_SID"),
    twilioFromNumber: get("TWILIO_FROM_NUMBER"),

    // Storage
    virusTotalApiKey: get("VIRUSTOTAL_API_KEY"),

    // Platform
    environment: (get("ENVIRONMENT", "production") as AppConfig["environment"]),
    logLevel:    (get("LOG_LEVEL", "info") as AppConfig["logLevel"]),
  };

  // Validate required variables
  const missing: string[] = [];
  for (const key of REQUIRED_VARS) {
    if (!cfg[key]) missing.push(key);
  }
  if (missing.length > 0) {
    throw new Error(
      `[config] FATAL: Missing required environment variables: ${missing.join(", ")}. ` +
      `Ensure they are set in supabase/functions/.env or the Supabase dashboard.`
    );
  }

  return cfg;
}

// ── Singleton ─────────────────────────────────────────────────────
// Loaded once per Edge Function cold start.
export const config: AppConfig = loadConfig();
