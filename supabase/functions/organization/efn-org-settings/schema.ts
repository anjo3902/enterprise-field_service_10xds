/**
 * organization/efn-org-settings/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, dateOnlySchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const TimeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, "Must be HH:mm or HH:mm:ss");

const BusinessHourSchema = z.object({
  name:                   nonEmptyString.max(100).optional(),
  working_days:           z.array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])).min(1).optional(),
  start_time:             TimeStringSchema.optional(),
  end_time:               TimeStringSchema.optional(),
  break_duration_minutes: z.number().int().min(0).max(300).optional(),
  timezone:               nonEmptyString.max(100).optional(),
});

const HolidaySchema = z.object({
  id:           uuidSchema.optional(),
  holiday_name: nonEmptyString.max(200),
  holiday_date: dateOnlySchema,
  region:       nonEmptyString.max(100).optional(),
  is_recurring: z.boolean().default(false),
});

export const UpdateOrgSettingsSchema = z.object({
  org_id:         uuidSchema,
  business_hours: BusinessHourSchema.optional(),
  holidays:       z.array(HolidaySchema).optional(),
});

export type UpdateOrgSettingsInput = z.infer<typeof UpdateOrgSettingsSchema>;
