/**
 * notifications/efn-notification-preferences/types.ts
 */

export interface PreferenceResult {
  action:         "update_preferences" | "get_preferences";
  profile_id:     string;
  email_enabled:  boolean;
  sms_enabled:    boolean;
  push_enabled:   boolean;
  in_app_enabled: boolean;
  quiet_hours:    string | null;
  timezone:       string;
  status:         string;
}
