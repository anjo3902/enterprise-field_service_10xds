/**
 * storage/path-builder.ts
 * ─────────────────────────────────────────────────────────────────
 * Type-safe storage path builders for every bucket.
 * These functions ensure consistent object paths across all Edge Functions.
 * Paths match the folder hierarchy defined in Phase 3.3.
 *
 * Usage:
 *   const path = storagePaths.ticketEvidence(orgId, ticketId, fileName);
 *   // → "organizations/{orgId}/tickets/{ticketId}/{fileName}"
 */

export const storagePaths = {
  // ── public-assets ──────────────────────────────────────────────
  avatar(profileId: string, ext: string): string {
    return `avatars/${profileId}.${ext}`;
  },

  orgLogo(orgId: string, ext: string): string {
    return `organizations/${orgId}/logo.${ext}`;
  },

  vendorLogo(vendorId: string, ext: string): string {
    return `vendors/${vendorId}/logo.${ext}`;
  },

  // ── asset-documents ────────────────────────────────────────────
  assetDocument(
    orgId:        string,
    assetId:      string,
    documentType: string,  // e.g. "warranty", "manual", "invoice"
    fileName:     string,
  ): string {
    return `organizations/${orgId}/assets/${assetId}/${documentType}_${fileName}`;
  },

  // ── ticket-evidence ────────────────────────────────────────────
  ticketEvidence(orgId: string, ticketId: string, fileName: string): string {
    return `organizations/${orgId}/tickets/${ticketId}/${fileName}`;
  },

  // ── work-order-evidence ────────────────────────────────────────
  workOrderBefore(vendorId: string, workOrderId: string, fileName: string): string {
    return `vendors/${vendorId}/workorders/${workOrderId}/before_${fileName}`;
  },

  workOrderAfter(vendorId: string, workOrderId: string, fileName: string): string {
    return `vendors/${vendorId}/workorders/${workOrderId}/after_${fileName}`;
  },

  // ── service-reports ────────────────────────────────────────────
  serviceReport(vendorId: string, workOrderId: string, fileName: string): string {
    return `vendors/${vendorId}/reports/${workOrderId}/${fileName}`;
  },

  technicianSignature(techId: string, workOrderId: string): string {
    return `technicians/${techId}/signatures/${workOrderId}.png`;
  },

  // ── inventory-documents ────────────────────────────────────────
  purchaseOrder(orgId: string, warehouseId: string, poNumber: string): string {
    return `organizations/${orgId}/inventory/${warehouseId}/po_${poNumber}.pdf`;
  },

  // ── ai-cache ───────────────────────────────────────────────────
  aiInput(orgId: string, requestId: string, ext: string): string {
    return `ai/${orgId}/${requestId}/input.${ext}`;
  },

  aiOutput(orgId: string, requestId: string): string {
    return `ai/${orgId}/${requestId}/output.json`;
  },

  // ── platform-exports ───────────────────────────────────────────
  analyticsExport(orgId: string, reportName: string): string {
    return `exports/organizations/${orgId}/${reportName}`;
  },

  auditExport(orgId: string, exportDate: string): string {
    return `exports/organizations/${orgId}/audit_${exportDate}.json`;
  },
} as const;

// ── Bucket Name Registry ───────────────────────────────────────────

export const BUCKETS = {
  PUBLIC_ASSETS:        "public-assets",
  ASSET_DOCUMENTS:      "asset-documents",
  TICKET_EVIDENCE:      "ticket-evidence",
  WORK_ORDER_EVIDENCE:  "work-order-evidence",
  SERVICE_REPORTS:      "service-reports",
  INVENTORY_DOCUMENTS:  "inventory-documents",
  AI_CACHE:             "ai-cache",
  PLATFORM_EXPORTS:     "platform-exports",
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

// ── MIME Type Allowlists ───────────────────────────────────────────

export const ALLOWED_MIME_TYPES: Record<BucketName, string[]> = {
  "public-assets":        ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  "asset-documents":      ["application/pdf", "image/jpeg", "image/png", "text/csv"],
  "ticket-evidence":      ["image/jpeg", "image/png", "image/webp", "application/pdf", "audio/mp4"],
  "work-order-evidence":  ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  "service-reports":      ["application/pdf", "image/png"],
  "inventory-documents":  ["application/pdf", "image/jpeg", "image/png"],
  "ai-cache":             ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  "platform-exports":     ["text/csv", "application/json", "application/zip"],
};

// ── Max File Sizes (bytes) ─────────────────────────────────────────

export const MAX_FILE_SIZES: Record<BucketName, number> = {
  "public-assets":          5  * 1024 * 1024,  //   5 MB
  "asset-documents":        20 * 1024 * 1024,  //  20 MB
  "ticket-evidence":        25 * 1024 * 1024,  //  25 MB
  "work-order-evidence":    25 * 1024 * 1024,  //  25 MB
  "service-reports":        10 * 1024 * 1024,  //  10 MB
  "inventory-documents":    15 * 1024 * 1024,  //  15 MB
  "ai-cache":               50 * 1024 * 1024,  //  50 MB
  "platform-exports":      500 * 1024 * 1024,  // 500 MB
};
