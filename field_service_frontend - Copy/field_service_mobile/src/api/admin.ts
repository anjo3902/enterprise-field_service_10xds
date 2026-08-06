/* ────────────────────────────────────────────────────────────
 * Admin API — mirrors adminApi from
 * frontend_react/src/services/api.js
 *
 * Updated for Phase 2 — Operations Dashboard + Activity Feed.
 * ──────────────────────────────────────────────────────────── */

import client from './client';

// ─── Types ──────────────────────────────────────────────────

export interface AdminTicket {
  id: number;
  priority: string;
  severity: string;
  final_severity?: string;
  technician_name?: string;
  assigned_technician?: number;
  assigned_technician_name?: string;
  created_at: string;
  status: string;
  // Detail fields (present in single-ticket fetch)
  customer_name?: string;
  fault_type?: string;
  image_severity?: string;
  description_severity?: string;
  final_reasoning?: string;
  diagnosis_reason?: string;
  final_fault_type?: string;
  issue_description?: string;
  confidence?: number | null;
  diagnosis_confidence?: number | null;
  safety_escalation?: boolean;
  technician_source?: string;
  assigned_technician_source?: string;
  review_decision?: string;
  ai_review_status?: string;
  hitl_triggers?: HitlTrigger[];
  diagnosis_payload?: { hitl_trigger_details?: HitlTrigger[] };
}

export interface HitlTrigger {
  reason?: string;
  trigger?: string;
  label?: string;
  description?: string;
  detail?: string;
  type?: string;
}

export interface ReassignmentSlaImpact {
  approval_delay_minutes?: number;
  processing_duration_minutes?: number;
  reassignment_duration_minutes?: number;
  time_to_reassignment_minutes?: number;
}

export interface ReassignmentEvent {
  id?: number;
  request_id?: number;
  status?: string;
  status_display?: string;
  event_type?: string;
  previous_technician_name?: string;
  previous_technician_id?: number;
  previous_technician?: number;
  new_technician_name?: string;
  new_technician_id?: number;
  new_technician?: number;
  reason?: string;
  reassignment_reason?: string;
  notes?: string;
  reassignment_notes?: string;
  sla_impact?: ReassignmentSlaImpact;
  timestamp?: string;
  request?: {
    customer_name?: string;
    assigned_technician_name?: string;
    assigned_technician?: number;
    reassignment_requested?: boolean;
    reassignment_reason?: string;
    reassignment_notes?: string;
  };
}

export interface ReassignmentSummary {
  total_events?: number;
  by_status?: {
    requested?: number;
    processing?: number;
    completed?: number;
    rejected?: number;
    failed?: number;
  };
  by_type?: {
    reassignment_requested?: number;
    reassignment_processing?: number;
    reassignment_completed?: number;
    reassignment_rejected?: number;
    reassignment_failed?: number;
  };
}

export interface ReviewPayload {
  decision: 'approve' | 'modify_approve' | 'reject';
  final_severity?: string;
  final_fault_type?: string;
  notes?: string;
}

export interface ReviewResult {
  message?: string;
}

export interface AdminKpis {
  total: number;
  pending_hitl: number;
  approved?: number;
  rejected?: number;
}

export interface AdminTicketsPage {
  data: AdminTicket[];
  last_id: number | null;
  has_more: boolean;
  total_visible: number;
}

// ─── Helpers ────────────────────────────────────────────────

function safeArray(data: unknown): AdminTicket[] {
  if (Array.isArray(data)) return data as AdminTicket[];
  const keys = ['items', 'results', 'jobs', 'requests', 'data'] as const;
  for (const k of keys) {
    const val = (data as Record<string, unknown>)?.[k];
    if (Array.isArray(val)) return val as AdminTicket[];
  }
  return [];
}

// ─── API ────────────────────────────────────────────────────

export const adminApi = {
  /** Paginated ticket list — mirrors adminApi.getServiceRequestsPage */
  async getServiceRequestsPage({
    lastId = null,
    limit = 20,
    mode,
    exclude_e2e,
  }: {
    lastId?: number | null;
    limit?: number;
    mode?: string;
    exclude_e2e?: boolean;
  } = {}): Promise<AdminTicketsPage> {
    const params: Record<string, unknown> = { limit };
    if (lastId) params.last_id = lastId;
    if (mode) params.mode = mode;
    if (exclude_e2e != null) params.exclude_e2e = exclude_e2e;

    const response = await client.get('/admin/service-requests', { params });
    const payload = response.data;

    if (Array.isArray(payload)) {
      return {
        data: payload as AdminTicket[],
        last_id: null,
        has_more: false,
        total_visible: payload.length,
      };
    }

    const items =
      payload.items != null
        ? safeArray(payload.items)
        : payload.data != null
        ? safeArray(payload.data)
        : safeArray(payload);

    return {
      data: items,
      last_id: payload.last_id ?? null,
      has_more: Boolean(payload.has_more),
      total_visible: payload.total_visible ?? items.length,
    };
  },

  /** KPI summary — mirrors adminApi.getKpis */
  async getKpis({ exclude_e2e }: { exclude_e2e?: boolean } = {}): Promise<AdminKpis> {
    const params: Record<string, unknown> = {};
    if (exclude_e2e != null) params.exclude_e2e = exclude_e2e;
    const response = await client.get('/admin/kpis', { params });
    return response.data as AdminKpis;
  },

  /** Single ticket — mirrors adminApi.getServiceRequestById */
  async getServiceRequestById(requestId: number): Promise<AdminTicket> {
    const response = await client.get(`/admin/service-requests/${requestId}`);
    return response.data as AdminTicket;
  },

  /** Image URL helper — mirrors adminApi.getServiceRequestImageBlob pattern */
  getServiceRequestImageUrl(requestId: number): string {
    return `${client.defaults.baseURL}/admin/service-requests/${requestId}/image`;
  },

  async getServiceRequestImageBase64(requestId: number): Promise<string | null> {
    try {
      const response = await client.get(
        `/admin/service-requests/${requestId}/image`,
        { responseType: 'arraybuffer', timeout: 15_000 },
      );
      const contentType: string = response.headers['content-type'] || 'image/jpeg';
      const bytes = new Uint8Array(response.data as ArrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      return `data:${contentType};base64,${base64}`;
    } catch {
      return null;
    }
  },

  /** Pending HITL queue — mirrors adminApi.getPendingHitl */
  async getPendingHitl(): Promise<AdminTicket[]> {
    const response = await client.get('/admin/pending-hitl');
    const data = response.data;
    if (Array.isArray(data)) return data as AdminTicket[];
    const keys = ['items', 'results', 'data'] as const;
    for (const k of keys) {
      const val = (data as Record<string, unknown>)?.[k];
      if (Array.isArray(val)) return val as AdminTicket[];
    }
    return [];
  },

  /** Reassignment activity — mirrors adminApi.getReassignmentActivity */
  async getReassignmentActivity({
    limit = 50,
    eventType,
  }: { limit?: number; eventType?: string } = {}): Promise<{
    events: ReassignmentEvent[];
    count: number;
    summary: ReassignmentSummary;
  }> {
    const params: Record<string, unknown> = { limit };
    if (eventType) params.event_type = eventType;
    const response = await client.get('/admin/reassignment-activity', { params });
    const data = response.data || {};
    return {
      events: (data.events || []) as ReassignmentEvent[],
      count: Number(data.count || 0),
      summary: (data.summary || {}) as ReassignmentSummary,
    };
  },

  /** Submit HITL review — mirrors adminApi.reviewServiceRequest */
  async reviewServiceRequest(
    requestId: number,
    payload: ReviewPayload,
  ): Promise<ReviewResult> {
    const response = await client.post(
      `/admin/service-requests/${requestId}/review`,
      payload,
    );
    return response.data as ReviewResult;
  },

  /** Reassignment approve/reject — mirrors adminApi.decideReassignment */
  async decideReassignment(
    requestId: number,
    { decision, notes }: { decision: 'approve' | 'reject'; notes?: string },
  ): Promise<{ message?: string }> {
    const response = await client.post(
      `/admin/service-requests/${requestId}/reassignment-decision`,
      { decision, notes },
    );
    return response.data as { message?: string };
  },
};
