/**
 * technician/efn-tech-location/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const UpdateLocationSchema = z.object({
  technician_id: uuidSchema,
  latitude:      z.number().min(-90).max(90),
  longitude:     z.number().min(-180).max(180),
});

export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
