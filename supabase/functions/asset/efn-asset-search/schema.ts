/**
 * asset/efn-asset-search/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const AssetSearchSchema = z.object({
  org_id:      uuidSchema.optional(), // Required for platform_admin, otherwise overridden by claims
  search_term: z.string().max(100).optional(),
  category:    z.string().max(100).optional(),
  status:      z.string().max(50).optional(),
  vendor_id:   uuidSchema.optional(),
  site_id:     uuidSchema.optional(),
  limit:       z.number().int().min(1).max(100).default(50),
  offset:      z.number().int().min(0).default(0),
});

export type AssetSearchInput = z.infer<typeof AssetSearchSchema>;
