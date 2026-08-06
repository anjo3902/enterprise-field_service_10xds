/**
 * ticket/efn-ticket-comments/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const AddCommentSchema = z.object({
  action:       z.literal("add"),
  ticket_id:    uuidSchema,
  body:         nonEmptyString.max(5000),
  comment_type: z.enum(["update", "internal_note", "customer_visible", "system_event"]).default("update"),
  visibility:   z.enum(["all", "internal", "private"]).default("all"),
});

const EditCommentSchema = z.object({
  action:     z.literal("edit"),
  comment_id: uuidSchema,
  ticket_id:  uuidSchema,
  body:       nonEmptyString.max(5000),
});

const DeleteCommentSchema = z.object({
  action:     z.literal("delete"),
  comment_id: uuidSchema,
  ticket_id:  uuidSchema,
});

export const CommentActionSchema = z.discriminatedUnion("action", [
  AddCommentSchema,
  EditCommentSchema,
  DeleteCommentSchema,
]);

export type CommentActionInput = z.infer<typeof CommentActionSchema>;
