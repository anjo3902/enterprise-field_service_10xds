/**
 * maintenance/efn-inspection/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const ChecklistItemSchema = z.object({
  item_label:    nonEmptyString.max(255),
  response_type: z.enum(["text", "boolean", "number", "select", "photo"]).default("text"),
  is_required:   z.boolean().default(true),
  sequence:      z.number().int().min(0).default(0),
});

const CreateTemplateSchema = z.object({
  action:          z.literal("create_template"),
  name:            nonEmptyString.max(255),
  description:     z.string().max(1000).optional(),
  service_type_id: uuidSchema.optional(),
  items:           z.array(ChecklistItemSchema).min(1),
});

const ChecklistResponseSchema = z.object({
  checklist_item_id: uuidSchema,
  value:             z.string().max(1000).optional(),
  remarks:           z.string().max(1000).optional(),
});

const SubmitResponsesSchema = z.object({
  action:        z.literal("submit_responses"),
  work_order_id: uuidSchema,
  responses:     z.array(ChecklistResponseSchema).min(1),
});

export const InspectionSchema = z.discriminatedUnion("action", [
  CreateTemplateSchema,
  SubmitResponsesSchema,
]);

export type InspectionInput = z.infer<typeof InspectionSchema>;
