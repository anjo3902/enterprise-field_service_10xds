/**
 * workorder/efn-wo-checklist/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

/** Seed: applies a checklist_template to a work order */
const SeedChecklistSchema = z.object({
  action:       z.literal("seed"),
  work_order_id:    uuidSchema,
  template_id:  uuidSchema,
});

/** Respond: capture a value for one checklist item */
const RespondChecklistSchema = z.object({
  action:             z.literal("respond"),
  work_order_id:      uuidSchema,
  checklist_item_id:  uuidSchema,
  value:              z.string().max(2000),
  remarks:            z.string().max(500).optional(),
});

/** Complete a work_order_task (discrete sub-task) */
const CompleteItemSchema = z.object({
  action:        z.literal("complete_item"),
  work_order_id: uuidSchema,
  task_id:       uuidSchema,
});

export const ChecklistActionSchema = z.discriminatedUnion("action", [
  SeedChecklistSchema,
  RespondChecklistSchema,
  CompleteItemSchema,
]);

export type ChecklistActionInput = z.infer<typeof ChecklistActionSchema>;
