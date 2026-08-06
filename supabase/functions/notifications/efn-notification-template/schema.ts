/**
 * notifications/efn-notification-template/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const TemplateSchema = z.object({
  action:    z.enum(["create", "update", "delete"]),
  id:        uuidSchema.optional(),
  
  template_code: z.string().min(3).optional(),
  name:          z.string().min(3).optional(),
  channel:       z.enum(["email", "sms", "push", "in_app"]).optional(),
  
  subject:       z.string().optional(),
  body:          z.string().optional(),
  variables:     z.array(z.string()).optional(),
  language:      z.string().length(2).optional(),
});

export type TemplateInput = z.infer<typeof TemplateSchema>;
