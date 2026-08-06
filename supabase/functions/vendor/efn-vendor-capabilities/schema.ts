/**
 * vendor/efn-vendor-capabilities/schema.ts
 * Discriminated union: action = "upsert" | "remove"
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

export const UpsertCapabilitySchema = z.object({
  action:               z.literal("upsert"),
  vendor_id:            uuidSchema,
  service_category_id:  uuidSchema,
  service_type_id:      uuidSchema.optional(),
  coverage_region:      nonEmptyString.max(100).optional(),
  response_tier:        z.enum(["Platinum", "Gold", "Standard"]).optional(),
  maximum_capacity:     z.number().int().min(1).max(9999).optional(),
});

export const RemoveCapabilitySchema = z.object({
  action:         z.literal("remove"),
  vendor_id:      uuidSchema,
  capability_id:  uuidSchema,
});

export const CapabilityActionSchema = z.discriminatedUnion("action", [
  UpsertCapabilitySchema,
  RemoveCapabilitySchema,
]);

export type CapabilityActionInput = z.infer<typeof CapabilityActionSchema>;
