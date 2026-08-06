/**
 * maintenance/efn-warranty-management/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const CreateWarrantySchema = z.object({
  action:           z.literal("create"),
  asset_id:         uuidSchema,
  warranty_number:  nonEmptyString.max(100),
  manufacturer:     nonEmptyString.max(100),
  warranty_type:    nonEmptyString.max(100),
  start_date:       z.string().date(),
  end_date:         z.string().date(),
  coverage_details: z.string().max(2000).optional(),
  vendor_id:        uuidSchema.optional(),
}).refine(
  (d) => new Date(d.end_date) >= new Date(d.start_date),
  { message: "end_date must be >= start_date" }
);

const UpdateWarrantySchema = z.object({
  action:           z.literal("update"),
  warranty_id:      uuidSchema,
  warranty_type:    nonEmptyString.max(100).optional(),
  end_date:         z.string().date().optional(),
  coverage_details: z.string().max(2000).optional(),
  vendor_id:        uuidSchema.optional(),
  status:           z.enum(["new_request", "activated", "expired", "rejected"]).optional(),
});

export const WarrantyManagementSchema = z.discriminatedUnion("action", [
  CreateWarrantySchema,
  UpdateWarrantySchema,
]);

export type WarrantyManagementInput = z.infer<typeof WarrantyManagementSchema>;
