/**
 * technician/efn-tech-availability/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

export const UpdateAvailabilitySchema = z.object({
  technician_id: uuidSchema,
  status:        z.enum(["available", "busy", "offline", "break", "vacation", "emergency_leave"]),
  reason:        nonEmptyString.max(200).optional(),
});

export type UpdateAvailabilityInput = z.infer<typeof UpdateAvailabilitySchema>;
