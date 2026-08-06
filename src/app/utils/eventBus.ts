export type AppEvent =
  | { type: 'TICKET_CREATED'; payload: any }
  | { type: 'TICKET_ASSIGNED'; payload: { ticketId: string, vendorId: string, status: string, techId?: string, techName?: string } }
  | { type: 'TICKET_STATUS_CHANGED'; payload: { ticketId: string, status: string, by?: string } }
  | { type: 'SLA_WARNING'; payload: { ticketId: string, urgency: string, timeRemaining: string } }
  | { type: 'WORK_ORDER_CREATED'; payload: any }
  | { type: 'WORK_ORDER_COMPLETED'; payload: { ticketId: string, workOrderId?: string, assetId: string, resolution?: string, title?: string, category?: string, status?: string } }
  | { type: 'AMC_RENEWAL_REQUESTED'; payload: { assetId: string, assetName: string, requestedBy: string } }
  | { type: 'AMC_QUOTATION_SUBMITTED'; payload: { assetId: string, amount: number, vendorId: string } }
  | { type: 'AMC_RENEWED'; payload: { assetId: string, newStartDate: string, newEndDate: string } }
  | { type: 'WARRANTY_EXTENSION_REQUESTED'; payload: { assetId: string, assetName: string } }
  | { type: 'WARRANTY_EXTENDED'; payload: { assetId: string, newEndDate: string } }
  | { type: 'PM_SCHEDULED'; payload: { assetId: string, taskDetails: any } }
  | { type: 'REPEATED_BREAKDOWN_DETECTED'; payload: { assetId: string, assetName: string } }
  | { type: 'TECH_LOCATION_UPDATED'; payload: { ticketId: string; eta: string; distance: string; phase: 'en_route' | 'on_site' | 'completed' } }
  | { type: 'CONSUMABLE_DEPLETED'; payload: { assetId: string, consumable: string } }
  // ── Admin Events ──
  | { type: 'ADMIN_ORG_CREATED'; payload: { orgId: string; orgName: string; adminName: string } }
  | { type: 'ADMIN_ORG_SUSPENDED'; payload: { orgId: string; orgName: string; suspendedBy: string } }
  | { type: 'ADMIN_ORG_ACTIVATED'; payload: { orgId: string; orgName: string } }
  | { type: 'ADMIN_VENDOR_ONBOARDED'; payload: { vendorId: string; vendorName: string } }
  | { type: 'ADMIN_VENDOR_SUSPENDED'; payload: { vendorId: string; vendorName: string; suspendedBy: string } }
  | { type: 'ADMIN_VENDOR_APPROVED'; payload: { vendorId: string; vendorName: string } }
  | { type: 'ADMIN_USER_CREATED'; payload: { userId: string; userName: string; role: string } }
  | { type: 'ADMIN_USER_DEACTIVATED'; payload: { userId: string; userName: string; deactivatedBy: string } }
  | { type: 'ADMIN_SLA_POLICY_UPDATED'; payload: { policyId: string; policyName: string; changedBy: string } }
  | { type: 'ADMIN_AI_CONFIG_CHANGED'; payload: { modelId: string; modelName: string; param: string; newValue: string } }
  | { type: 'ADMIN_SECURITY_ALERT'; payload: { type: 'failed_login' | 'suspicious_session' | 'permission_change'; severity: 'warning' | 'critical'; description: string } }
  | { type: 'ADMIN_LICENSE_THRESHOLD'; payload: { resource: string; used: number; total: number; pct: number } };

export const publishEvent = (event: AppEvent) => {
  window.dispatchEvent(new CustomEvent('app_sync', { detail: event }));
};

export const subscribeToEvent = (handler: (event: AppEvent) => void) => {
  const listener = (e: any) => handler(e.detail);
  window.addEventListener('app_sync', listener);
  return () => window.removeEventListener('app_sync', listener);
};
