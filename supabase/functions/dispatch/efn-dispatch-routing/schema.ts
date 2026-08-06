/**
 * dispatch/efn-dispatch-routing/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const DispatchRoutingSchema = z.object({
  work_order_id:     uuidSchema,
  technician_id:     uuidSchema.optional(),  // If omitted → find nearest available
  destination_lat:   z.number().min(-90).max(90).optional(),
  destination_lng:   z.number().min(-180).max(180).optional(),
  scheduled_start_at: z.string().datetime({ offset: true }).optional(),
  find_nearest:      z.boolean().default(false),
  vendor_id:         uuidSchema.optional(),  // Scope nearest search to vendor
});

export type DispatchRoutingInput = z.infer<typeof DispatchRoutingSchema>;
