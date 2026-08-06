/**
 * vendor/efn-vendor-contracts/schema.ts
 */

import { z }          from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString, dateOnlySchema } from "../../shared/validation/common-validators.ts";

const SERVICE_DOMAIN_VALUES = [
  "HVAC", "ELECTRICAL", "PLUMBING", "FIRE_SAFETY", "MECHANICAL",
  "IT_SYSTEMS", "SECURITY_SYSTEMS", "CIVIL_WORKS", "ELEVATORS",
] as const;

const CreateContractSchema = z.object({
  action:              z.literal("create"),
  org_id:              uuidSchema,
  vendor_id:           uuidSchema,
  title:               nonEmptyString.max(200),
  scope_domains:       z.array(z.enum(SERVICE_DOMAIN_VALUES)).min(1),
  start_date:          dateOnlySchema,
  end_date:            dateOnlySchema,
  sla_policy_id:       uuidSchema.optional(),
  contract_reference:  z.string().max(100).optional(),
  monthly_value:       z.number().min(0).optional(),
  annual_value:        z.number().min(0).optional(),
  currency:            z.string().length(3).default("USD"),
  compliance_target:   z.number().min(0).max(100).default(90.0),
  penalty_note:        z.string().max(2000).optional(),
}).refine(
  (d) => new Date(d.end_date) > new Date(d.start_date),
  { message: "end_date must be after start_date", path: ["end_date"] },
);

const RenewContractSchema = z.object({
  action:         z.literal("renew"),
  contract_id:    uuidSchema,
  new_end_date:   dateOnlySchema,
  new_start_date: dateOnlySchema.optional(),
  annual_value:   z.number().min(0).optional(),
  monthly_value:  z.number().min(0).optional(),
});

const TerminateContractSchema = z.object({
  action:             z.literal("terminate"),
  contract_id:        uuidSchema,
  termination_reason: nonEmptyString.max(500),
});

export const ContractActionSchema = z.discriminatedUnion("action", [
  CreateContractSchema,
  RenewContractSchema,
  TerminateContractSchema,
]);

export type ContractActionInput = z.infer<typeof ContractActionSchema>;
