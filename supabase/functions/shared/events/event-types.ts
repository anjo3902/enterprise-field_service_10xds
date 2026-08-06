/**
 * events/event-types.ts
 * ─────────────────────────────────────────────────────────────────
 * Typed registry of all platform event names and their payload shapes.
 * This file is the single source of truth for the EventBus contracts.
 *
 * Every publisher and subscriber must use these exact names and types.
 * Adding a new event: add the name constant + payload interface here.
 */

// ── Event Name Constants ───────────────────────────────────────────

export const EVENTS = {
  // Auth
  USER_INVITED:           "user.invited",
  USER_PROFILE_CREATED:   "user.profile_created",

  // Tickets
  TICKET_CREATED:         "ticket.created",
  TICKET_ASSIGNED:        "ticket.assigned",
  TICKET_STATUS_CHANGED:  "ticket.status_changed",
  TICKET_ESCALATED:       "ticket.escalated",
  TICKET_CLOSED:          "ticket.closed",

  // Work Orders
  WO_CREATED:             "work_order.created",
  WO_ASSIGNED:            "work_order.assigned",
  WO_COMPLETED:           "work_order.completed",
  WO_ACCEPTANCE_SIGNED:   "work_order.acceptance_signed",

  // Evidence / Storage
  EVIDENCE_UPLOADED:      "evidence.uploaded",
  PDF_GENERATED:          "pdf.generated",

  // Maintenance
  PM_DUE_TODAY:           "pm.due_today",
  AMC_EXPIRING_SOON:      "amc.expiring_soon",
  WARRANTY_EXPIRING_SOON: "warranty.expiring_soon",

  // SLA
  SLA_BREACH_WARNING:     "sla.breach_warning",
  SLA_BREACHED:           "sla.breached",

  // Dispatch
  TECHNICIAN_ASSIGNED:    "dispatch.technician_assigned",
  ROUTE_OPTIMISED:        "dispatch.route_optimised",

  // Inventory
  STOCK_RESERVED:         "inventory.stock_reserved",
  STOCK_CONSUMED:         "inventory.stock_consumed",
  LOW_STOCK_ALERT:        "inventory.low_stock",

  // AI
  AI_DIAGNOSIS_COMPLETE:  "ai.diagnosis_complete",
  AI_HITL_NEEDED:         "ai.hitl_needed",
  AI_HITL_RESOLVED:       "ai.hitl_resolved",

  // Analytics
  ANALYTICS_SNAPSHOT_TRIGGERED: "analytics.snapshot_triggered",
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

// ── Payload Interfaces ─────────────────────────────────────────────

export interface TicketCreatedPayload {
  ticket_id:     string;
  org_id:        string;
  priority:      string;
  asset_id:      string | null;
  created_by:    string;
}

export interface TicketAssignedPayload {
  ticket_id:     string;
  org_id:        string;
  vendor_id:     string;
  work_order_id: string;
}

export interface TicketEscalatedPayload {
  ticket_id:     string;
  org_id:        string;
  vendor_id:     string | null;
  sla_policy_id: string;
  escalation_level: number;
}

export interface EvidenceUploadedPayload {
  bucket:        string;
  object_path:   string;
  ticket_id:     string | null;
  work_order_id: string | null;
  org_id:        string;
  uploaded_by:   string;
}

export interface AiDiagnosisCompletePayload {
  request_id:    string;
  ticket_id:     string;
  confidence:    number;
  diagnosis:     string;
  needs_hitl:    boolean;
}

export interface PmDueTodayPayload {
  pm_plan_id:    string;
  asset_id:      string;
  org_id:        string;
  vendor_id:     string | null;
  due_date:      string;
}

// Generic fallback for untyped payloads
export type AnyEventPayload = Record<string, unknown>;
