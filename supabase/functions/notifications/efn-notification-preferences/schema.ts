/**
 * notifications/efn-notification-preferences/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";

export const PreferenceSchema = z.object({
  action:         z.enum(["update_preferences", "get_preferences"]),
  email_enabled:  z.boolean().optional(),
  sms_enabled:    z.boolean().optional(),
  push_enabled:   z.boolean().optional(),
  in_app_enabled: z.boolean().optional(),
  quiet_hours:    z.string().optional().nullable(),
  timezone:       z.string().optional(),
});

export type PreferenceInput = z.infer<typeof PreferenceSchema>;
