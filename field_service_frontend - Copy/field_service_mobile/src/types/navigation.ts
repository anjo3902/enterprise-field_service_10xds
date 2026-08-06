/* ────────────────────────────────────────────────────────────
 * Navigation param type definitions.
 *
 * React Navigation requires a typed param list per navigator
 * so that screen names and their params are type-checked at
 * every navigate() / push() call.
 * ──────────────────────────────────────────────────────────── */

export type AuthStackParamList = {
  Login: { expired?: boolean } | undefined;
  Signup: undefined;
};

export type CustomerTabParamList = {
  Dashboard: {
    submitSuccess?: { requestId: number | null; at: number };
  } | undefined;
  NewRequest: undefined;
};

export type CustomerStackParamList = {
  CustomerDashboard: undefined;
  RequestDetail: { requestId: number };
  LiveTracking: { requestId: number };
};

export type TechnicianTabParamList = {
  Jobs: undefined;
  Route: undefined;
  Profile: undefined;
};

export type TechnicianJobsStackParamList = {
  JobList: undefined;
  JobDetail: { jobId: number };
  PrevisitBriefing: { jobId: number };
  ReportWorkflow: { jobId: number };
  Reassignment: { jobId: number };
};

export type AdminTabParamList = {
  Operations: undefined;
  Activity: undefined;
};

export type AdminOpsStackParamList = {
  OperationsDashboard: undefined;
  TicketDetail: { ticketId: number };
  Review: { ticketId: number };
};

export type AdminActivityStackParamList = {
  ActivityFeed: undefined;
  ActivityTicketDetail: { ticketId: number };
  ReassignmentActivity: undefined;
};

/**
 * Root-level param list consumed by RootNavigator.
 *
 * The root navigator conditionally renders either the Auth stack
 * or one of the role-based tab navigators.  We define them as
 * separate screens at the root level so that `navigationRef` can
 * reset to 'Auth' from outside the React tree (e.g. 401 interceptor).
 */
export type RootStackParamList = {
  Auth: undefined;
  CustomerRoot: undefined;
  TechnicianRoot: undefined;
  AdminRoot: undefined;
};
