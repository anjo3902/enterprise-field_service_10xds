/* ────────────────────────────────────────────────────────────
 * React Query cache key factory.
 *
 * Centralises all query keys so that invalidation, prefetching,
 * and cache reads use consistent keys.  Phase 1 only includes
 * auth-adjacent keys; remaining keys will be added per-phase.
 * ──────────────────────────────────────────────────────────── */

export const queryKeys = {
  // ── Customer ──────────────────────────────────────────────
  myRequests: () => ['customer', 'my-requests'] as const,
  myRequestDetail: (id: number) => ['customer', 'my-requests', id] as const,
  myRequestImage: (id: number) => ['customer', 'my-requests', id, 'image'] as const,

  // ── Technician ────────────────────────────────────────────
  techJobs: () => ['technician', 'jobs'] as const,
  techRoute: () => ['technician', 'route'] as const,
  techProfile: () => ['technician', 'profile'] as const,
  techJobDetail: (id: number) => ['technician', 'jobs', id] as const,
  techJobImage: (id: number) => ['technician', 'jobs', id, 'image'] as const,
  techReport: (id: number) => ['technician', 'report', id] as const,

  // ── Admin ─────────────────────────────────────────────────
  adminTickets: (params?: Record<string, unknown>) =>
    ['admin', 'service-requests', params] as const,
  adminKpis: (params?: Record<string, unknown>) =>
    ['admin', 'kpis', params] as const,
  adminPending: () => ['admin', 'pending-hitl'] as const,
  adminTicketDetail: (id: number) =>
    ['admin', 'service-requests', id] as const,
  adminTicketImage: (id: number) =>
    ['admin', 'service-requests', id, 'image'] as const,
  adminReassignment: () => ['admin', 'reassignment-activity'] as const,
};
