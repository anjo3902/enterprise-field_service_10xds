/**
 * ticket/efn-ticket-dashboard/types.ts
 */

export interface TicketDashboardResult {
  org_id: string;
  summary: {
    open:               number;
    in_progress:        number;
    pending:            number;
    escalated:          number;
    closed_today:       number;
    total_active:       number;
  };
  sla: {
    response_breached:    number;
    resolution_breached:  number;
    at_risk:              number;
  };
  priority: {
    critical: number;
    high:     number;
    medium:   number;
    low:      number;
  };
}
