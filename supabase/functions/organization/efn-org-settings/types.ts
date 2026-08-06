/**
 * organization/efn-org-settings/types.ts
 */

export interface BusinessHourInput {
  name?:                   string;
  working_days?:           string[];
  start_time?:             string;
  end_time?:               string;
  break_duration_minutes?: number;
  timezone?:               string;
}

export interface HolidayInput {
  id?:           string; // If provided, updates existing; otherwise inserts
  holiday_name:  string;
  holiday_date:  string;
  region?:       string;
  is_recurring?: boolean;
}

export interface UpdateSettingsResult {
  org_id:     string;
  updated_at: string;
}
