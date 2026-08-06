/**
 * maintenance/efn-pm-plan/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const PmRecurrenceSchema = z.enum(["one_time", "weekly", "monthly", "quarterly", "semi_annual", "annual", "custom"]);

const CreatePmPlanSchema = z.object({
  action:                  z.literal("create"),
  org_id:                  uuidSchema.optional(), // derived from claims if not provided
  vendor_id:               uuidSchema.optional(),
  asset_id:                uuidSchema.optional(),
  site_id:                 uuidSchema.optional(),
  building_id:             uuidSchema.optional(),
  floor_id:                uuidSchema.optional(),
  room_id:                 uuidSchema.optional(),
  service_category_id:     uuidSchema,
  service_type_id:         uuidSchema.optional(),
  frequency:               PmRecurrenceSchema,
  start_date:              z.string().date(),
  end_date:                z.string().date().optional(),
  estimated_duration_mins: z.number().int().min(1).optional(),
  checklist_template_id:   uuidSchema.optional(),
  assigned_technician_id:  uuidSchema.optional(),
  priority:                z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
}).refine(
  (d) => !d.end_date || new Date(d.end_date) >= new Date(d.start_date),
  { message: "end_date must be >= start_date" }
).refine(
  (d) => d.asset_id || d.site_id || d.building_id || d.floor_id || d.room_id,
  { message: "Must specify a target (asset, site, building, floor, or room)" }
);

const UpdatePmPlanSchema = z.object({
  action:                  z.literal("update"),
  plan_id:                 uuidSchema,
  vendor_id:               uuidSchema.optional(),
  frequency:               PmRecurrenceSchema.optional(),
  end_date:                z.string().date().optional(),
  estimated_duration_mins: z.number().int().min(1).optional(),
  checklist_template_id:   uuidSchema.optional(),
  assigned_technician_id:  uuidSchema.optional(),
  priority:                z.enum(["Low", "Medium", "High", "Critical"]).optional(),
});

const DeactivatePmPlanSchema = z.object({
  action:  z.literal("deactivate"),
  plan_id: uuidSchema,
});

export const PmPlanSchema = z.discriminatedUnion("action", [
  CreatePmPlanSchema,
  UpdatePmPlanSchema,
  DeactivatePmPlanSchema,
]);

export type PmPlanInput = z.infer<typeof PmPlanSchema>;
