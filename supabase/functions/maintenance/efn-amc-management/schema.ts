/**
 * maintenance/efn-amc-management/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const CreateAmcSchema = z.object({
  action:                   z.literal("create"),
  contract_number:          nonEmptyString.max(100),
  vendor_id:                uuidSchema,
  coverage_type:            nonEmptyString.max(100),
  start_date:               z.string().date(),
  end_date:                 z.string().date(),
  contract_value:           z.number().min(0).optional(),
  currency:                 z.string().max(10).default("USD"),
  visit_frequency:          z.string().max(100).optional(),
  response_sla_policy_id:   uuidSchema.optional(),
  resolution_sla_policy_id: uuidSchema.optional(),
  assets:                   z.array(uuidSchema).optional(),
}).refine(
  (d) => new Date(d.end_date) >= new Date(d.start_date),
  { message: "end_date must be >= start_date" }
);

const UpdateAmcSchema = z.object({
  action:                   z.literal("update"),
  contract_id:              uuidSchema,
  coverage_type:            nonEmptyString.max(100).optional(),
  end_date:                 z.string().date().optional(),
  contract_value:           z.number().min(0).optional(),
  visit_frequency:          z.string().max(100).optional(),
  response_sla_policy_id:   uuidSchema.optional(),
  resolution_sla_policy_id: uuidSchema.optional(),
  status:                   z.enum(["active", "expired", "terminated"]).optional(),
});

const AssetAmcSchema = z.object({
  action:            z.enum(["add_asset", "remove_asset"]),
  contract_id:       uuidSchema,
  asset_id:          uuidSchema,
  coverage_level:    z.string().max(100).optional(),
  included_services: z.array(z.string()).optional(),
  exclusions:        z.array(z.string()).optional(),
});

export const AmcManagementSchema = z.discriminatedUnion("action", [
  CreateAmcSchema,
  UpdateAmcSchema,
  AssetAmcSchema,
]);

export type AmcManagementInput = z.infer<typeof AmcManagementSchema>;
