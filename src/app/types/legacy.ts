export interface AdminOrganization {
  id: string;
  name: string;
  status: "Active" | "Suspended" | "Pending Setup" | "Trial";
  plan: "Enterprise" | "Professional" | "Trial";
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  region: string;
  city: string;
  country: string;
  createdAt: string;
  licenseSeats: { users: number; vendors: number; technicians: number };
  assignedVendorIds: string[];
  ticketCount: number;
  assetCount: number;
  slaRate: number;
  lastActivity: string;
  subscriptionRenewal: string;
}

export interface AdminVendor {
  id: string;
  name: string;
  status: "Active" | "Pending Approval" | "Suspended";
  managerId: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  serviceTypes: string[];
  serviceRegions: string[];
  technicianCount: number;
  assignedOrgIds: string[];
  contractId: string;
  slaTarget: number;
  slaCompliance: number;
  starRating: number;
  certifications: { name: string; expiry: string }[];
  revenue: number;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "system_admin" | "org_admin" | "vendor_manager" | "technician";
  assignedEntityId: string | null;
  assignedEntityType: "org" | "vendor" | null;
  status: "Active" | "Inactive" | "Locked";
  lastLogin: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  sessions: { device: string; ip: string; loginTime: string; location: string }[];
}

export interface AdminSLAPolicy {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Archived";
  priorityMatrix: {
    critical: { responseHrs: number; resolutionHrs: number; escalationAfterHrs: number };
    high: { responseHrs: number; resolutionHrs: number; escalationAfterHrs: number };
    medium: { responseHrs: number; resolutionHrs: number; escalationAfterHrs: number };
    low: { responseHrs: number; resolutionHrs: number; escalationAfterHrs: number };
  };
  businessHoursMode: "24/7" | "business_hours";
  timezone: string;
  holidayDates: string[];
  escalationRole: "org_admin" | "vendor_manager" | "system_admin";
  escalationChannels: ("email" | "push" | "sms")[];
  notificationThresholdPct: number;
  assignedVendorIds: string[];
  createdAt: string;
  lastModified: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actionCategory: "auth" | "operational" | "configuration" | "security";
  actionDescription: string;
  entityType: "org" | "vendor" | "user" | "sla_policy" | "ai_model" | "platform";
  entityId: string;
  ipAddress: string;
  device: string;
  sessionId: string;
  beforeState?: string;
  afterState?: string;
  severity: "info" | "warning" | "critical";
}

export interface AdminAIModel {
  id: string;
  name: string;
  purpose: string;
  status: "Healthy" | "Degraded" | "Offline";
  accuracy: number;
  avgConfidence: number;
  hitlRate: number;
  falsePositiveRate: number;
  confidenceThreshold: number;
  hitlTriggerRules: {
    low_confidence: boolean;
    safety_flag: boolean;
    unlisted_fault: boolean;
    critical_requires_verification: boolean;
    repeated_failure_asset: boolean;
  };
  fallbackBehavior: "auto_assign_default_sla" | "notify_admin" | "reject";
  safetyRules: string[];
  lastUpdated: string;
  accuracyTrend: number[];
}

export interface AdminAIInsight {
  id: string;
  modelId: string;
  ticketId: string;
  decision: string;
  confidence: number;
  hitlTriggered: boolean;
  outcome: "correct" | "incorrect" | "pending";
  timestamp: string;
}

export interface AdminSecurityAlert {
  id: string;
  type: "failed_login" | "suspicious_session" | "permission_change" | "data_export" | "brute_force";
  title: string;
  description: string;
  severity: "warning" | "critical";
  sourceIp: string;
  sourceUserId?: string;
  timestamp: string;
  status: "active" | "investigating" | "resolved";
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AdminActiveSession {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  orgOrVendorName: string;
  loginTime: string;
  lastActivity: string;
  device: string;
  os: string;
  browser: string;
  ip: string;
  location: string;
  durationMinutes: number;
}

export interface AdminFailedLogin {
  id: string;
  attemptedEmail: string;
  ip: string;
  geoLocation: string;
  timestamp: string;
  failureReason: "Wrong Password" | "Unknown Account" | "Account Locked";
  attemptsFromIpLast24h: number;
  isAccountLocked: boolean;
}

export interface AdminPlatformLicense {
  id?: string;

  planName: "Enterprise";
  licenseId: string;
  renewalDate: string;
  accountManagerName: string;
  accountManagerEmail: string;
  usage: {
    organizations: { used: number; total: number };
    vendors: { used: number; total: number };
    users: { used: number; total: number };
    orgAdmins: { used: number; total: number };
    vendorManagers: { used: number; total: number };
    technicians: { used: number; total: number };
    storageGb: { used: number; total: number };
    apiCallsMonthly: { used: number; total: number };
  };
}

export interface AdminNotification {
  id: string;
  eventType: string;
  title: string;
  description: string;
  category: "Security" | "Platform" | "Tenants" | "AI";
  severity: "info" | "warning" | "critical";
  isAlert: boolean;
  isRead: boolean;
  timestamp: string;
  navigationTarget?: string;
}

export interface AdminIntegration {
  id: string;
  name: string;
  type: "erp" | "cmms" | "iot" | "email" | "sms" | "webhook";
  status: "connected" | "disconnected" | "error";
  lastSync: string;
  configuredBy: string;
  description: string;
  testEndpoint?: string;
}

export interface Ticket {
  id: string;
  title: string;
  category?: string;
  location: string;
  reportedTime: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Pending" | "Resolved" | "Closed";
  
  // Foreign Keys
  assetId: string;
  technicianId: string;
  slaId: string;
  aiId: string;
  timelineId: string;
}

export interface Asset {
  id: string;
  name: string;
}

export interface Technician {
  id: string;
  name: string;
  role: string;
  status: string;
  eta: string;
  workload: number;
}

export interface SLA {
  id: string;
  remaining: string;
  responseTimeTarget: string;
  resolutionTarget: string;
  complianceStatus: string;
  urgency: "critical" | "warning" | "ok" | "breached";
  progress: number;
}

export interface AIAnalysis {
  id: string;
  equipment: string;
  domain: string;
  faultCategory: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  confidence: number;
  suggestedResolution: string;
  estimatedHours?: number;
}

export interface TimelineEvent {
  id: string;
  status: string;
  time: string;
  desc: string;
  iconName: string;
  color: string;
  tint: string;
  state: "completed" | "current" | "pending";
}

export interface TechProfile {
  avatarUrl?: string;
  status?: string;
  vendorId?: string;
  vendorName?: string;

  id: string;
  name: string;
  role: string;
  code: string;
  phone: string;
  email: string;
  zone: string;
  domain: string;
  experience: string;
  joinedDate: string;
  rating: number;
  avatarColor: string;
  initials: string;
  availability: "available" | "on_job" | "unavailable" | "off";
  activeJobCount: number;
  maxJobs: number;
  shift: string;
  workingDays: string[];
  skills: string[];
  certifiedSkills: string[];
  certifications: string[];
}

export interface TechPerformanceData {
  avgResolutionTime?: number;
  firstTimeFixRate?: number;

  jobsCompleted: number;
  slaCompliance: number;
  firstTimeFix: number;
  avgCompletionHrs: number;
  customerRating: number;
  monthlyHistory: { month: string; jobs: number; completed: number; sla: number; avgTime: number; rating: number }[];
}




export interface AdminAIInsight {
  id: string;
  modelId: string;
  ticketId: string;
  decision: string;
  confidence: number;
  hitlTriggered: boolean;
  outcome: "correct" | "incorrect" | "pending";
  timestamp: string;
}

export interface AdminSecurityAlert {
  id: string;
  type: "failed_login" | "suspicious_session" | "permission_change" | "data_export" | "brute_force";
  title: string;
  description: string;
  severity: "warning" | "critical";
  sourceIp: string;
  sourceUserId?: string;
  timestamp: string;
  status: "active" | "investigating" | "resolved";
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AdminActiveSession {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  orgOrVendorName: string;
  loginTime: string;
  lastActivity: string;
  device: string;
  os: string;
  browser: string;
  ip: string;
  location: string;
  durationMinutes: number;
}

export interface AdminFailedLogin {
  id: string;
  attemptedEmail: string;
  ip: string;
  geoLocation: string;
  timestamp: string;
  failureReason: "Wrong Password" | "Unknown Account" | "Account Locked";
  attemptsFromIpLast24h: number;
  isAccountLocked: boolean;
}

export interface AdminPlatformLicense {
  id?: string;

  planName: "Enterprise";
  licenseId: string;
  renewalDate: string;
  accountManagerName: string;
  accountManagerEmail: string;
  usage: {
    organizations: { used: number; total: number };
    vendors: { used: number; total: number };
    users: { used: number; total: number };
    orgAdmins: { used: number; total: number };
    vendorManagers: { used: number; total: number };
    technicians: { used: number; total: number };
    storageGb: { used: number; total: number };
    apiCallsMonthly: { used: number; total: number };
  };
}

export interface AdminNotification {
  id: string;
  eventType: string;
  title: string;
  description: string;
  category: "Security" | "Platform" | "Tenants" | "AI";
  severity: "info" | "warning" | "critical";
  isAlert: boolean;
  isRead: boolean;
  timestamp: string;
  navigationTarget?: string;
}

export interface AdminIntegration {
  id: string;
  name: string;
  type: "erp" | "cmms" | "iot" | "email" | "sms" | "webhook";
  status: "connected" | "disconnected" | "error";
  lastSync: string;
  configuredBy: string;
  description: string;
  testEndpoint?: string;
}

export interface Ticket {
  id: string;
  title: string;
  category?: string;
  location: string;
  reportedTime: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Pending" | "Resolved" | "Closed";
  
  // Foreign Keys
  assetId: string;
  technicianId: string;
  slaId: string;
  aiId: string;
  timelineId: string;
}

export interface Asset {
  id: string;
  name: string;
}

export interface Technician {
  id: string;
  name: string;
  role: string;
  status: string;
  eta: string;
  workload: number;
}

export interface SLA {
  id: string;
  remaining: string;
  responseTimeTarget: string;
  resolutionTarget: string;
  complianceStatus: string;
  urgency: "critical" | "warning" | "ok" | "breached";
  progress: number;
}

export interface AIAnalysis {
  id: string;
  equipment: string;
  domain: string;
  faultCategory: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  confidence: number;
  suggestedResolution: string;
}

export interface TimelineEvent {
  id: string;
  status: string;
  time: string;
  desc: string;
  iconName: string;
  color: string;
  tint: string;
  state: "completed" | "current" | "pending";
}

export interface TechProfile {
  avatarUrl?: string;
  status?: string;
  vendorId?: string;
  vendorName?: string;

  id: string;
  name: string;
  role: string;
  code: string;
  phone: string;
  email: string;
  zone: string;
  domain: string;
  experience: string;
  joinedDate: string;
  rating: number;
  avatarColor: string;
  initials: string;
  availability: "available" | "on_job" | "unavailable" | "off";
  activeJobCount: number;
  maxJobs: number;
  shift: string;
  workingDays: string[];
  skills: string[];
  certifiedSkills: string[];
  certifications: string[];
}

export interface TechPerformanceData {
  avgResolutionTime?: number;
  firstTimeFixRate?: number;

  jobsCompleted: number;
  slaCompliance: number;
  firstTimeFix: number;
  avgCompletionHrs: number;
  customerRating: number;
  monthlyHistory: { month: string; jobs: number; completed: number; sla: number; avgTime: number; rating: number }[];
}

export type Priority = "Critical" | "High" | "Medium" | "Low";



export type TechAvailability = "available" | "on_job" | "unavailable" | "off";

export type AssetHealth = "Healthy" | "At Risk" | "Critical" | "Under Maintenance";

export type SLAStatus = "ok" | "at_risk" | "breached" | "resolved";

export type PMStatus = "Draft" | "Requested" | "Pending Review" | "Approved" | "Planning" | "Technician Assigned" | "Work Order Created" | "Accepted" | "Completed" | "Overdue";

export interface WorkOrderChecklist {
  id: string;
  label: string;
  done: boolean;
}

export type WorkOrderStatus = "open" | "in_progress" | "completed" | "closed";

export interface WorkOrder {
  id: string;
  ticketId: string;
  technicianId: string;
  technicianName: string;
  category?: string;
  customerName: string;
  location: string;
  createdAt: string;
  estimatedHours: number;
  actualHours?: number;
  status: WorkOrderStatus;
  checklist: WorkOrderChecklist[];
  resolutionNotes?: string;
  partsUsed?: string;
  completedAt?: string;
  closedAt?: string;
}

export interface VendorInfo {
  id: string;
  name: string;
  contractId: string;
  contractStart: string;
  contractEnd: string;
  serviceTypes: string[];
  complianceTarget: number;
  managerId: string;
  managerName: string;
  managerRole: string;
  primaryContact?: string;
  email?: string;
  phone?: string;
  serviceRegions?: string[];
}

export interface SLAContract {
  id: string;
  vendorId?: string;
  name: string;
  responseSLA: Record<Priority, number>;   // hours
  resolutionSLA: Record<Priority, number>; // hours
  complianceTarget: number;
  penaltyNote: string;
}

export interface VendorCustomer {
  id: string;
  name: string;
  site: string;
  city: string;
  contactPerson: string;
  contactPhone: string;
  contractedSince: string;
}

export interface VendorTechnician {
  id: string;
  vendorId?: string;
  name: string;
  initials: string;
  avatarColor: string;
  role: string;
  skills: string[];
  certifications: string[];
  availability: TechAvailability;
  currentJobId?: string;
  activeJobCount: number;
  phone: string;
  email: string;
  location: string;
  rating: number;
  slaAdherence: number;
  jobsThisMonth: number;
  avgCompletionHrs: number;
  joinedDate: string;
}

export interface VendorAsset {
  id: string;
  customerId: string;
  name: string;
  category?: string;
  model: string;
  serial: string;
  location: string;
  floor?: string;
  purchaseDate: string;
  warrantyExpiry: string;
  ageYears: number;
  health: AssetHealth;
  healthScore: number;
  lastInspection: string;
  lastPMDate?: string;
  nextPMDate?: string;
  activeTicketId?: string;
  notes?: string;
}

export interface VendorTicket {
  id: string;
  vendorId?: string;
  customerId: string;
  customerName: string;
  assetId?: string;
  assetName?: string;
  title: string;
  description: string;
  category?: string;
  priority: Priority;
  status: TicketStatus;
  // Workflow
  rejectionReason?: string;
  rejectionNotes?: string;
  modifiedPriority?: Priority;
  modifiedCategory?: string;
  modifiedNotes?: string;
  workOrderId?: string;
  // Assignment
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  // SLA
  slaResponseHrs?: number;
  slaResolutionHrs?: number;
  slaDeadline?: string;
  slaStatus?: SLAStatus;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  // Location
  location: string;
  floor?: string;
  // Misc
  notes: string[];
  // AI Analysis
  aiAnalysis?: AIAnalysis;
  // Evidence image uploaded by customer at ticket raise
  imageUrl?: string;
  // Live Tracking — populated when technician is en route or on site
  technicianEta?: string;        // e.g. "12 min"
  technicianDistance?: string;   // e.g. "2.4 km"
  technicianLastSeen?: string;   // ISO timestamp of last simulated location update
  // Workflow timestamps
  techAcceptedAt?: string;       // ISO: when technician accepted the job
  startedAt?: string;            // ISO: when technician started travelling
  arrivedAt?: string;            // ISO: when technician arrived at site
  startedWorkAt?: string;        // ISO: when technician began work on site
  completedAt?: string;          // ISO: when technician marked the job complete
}

export interface PMTask {
  id: string;
  vendorId?: string;
  assetId: string;
  assetName: string;
  customerId: string;
  customerName: string;
  type: string;
  status: PMStatus;
  dueDate: string;
  completedDate?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  recurrence: "one_time" | "monthly" | "quarterly" | "annual";
  notes?: string;
  checklist: PMChecklistItem[];
  findings?: string;
  convertedToTicketId?: string;
  category?: string;
  estimatedHrs: number;
  workOrderId?: string;
  timeline?: { status: PMStatus; timestamp: string; note?: string }[];
  aiRecommendation?: string;
  // New Fields for enterprise FSM
  location?: string;
  contract?: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  lastPM?: string;
  nextPM?: string;
  risk?: "Low" | "Medium" | "High";
  techSkillsRequired?: string[];
  sla?: string;
}

export interface PMChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface SLAMonthHistory {
  month: string;
  compliance: number;
  totalTickets: number;
  breached: number;
}

export interface MonthRevenue {
  month: string;
  revenue: number;
  jobs: number;
  parts: number;
  labor: number;
}

export interface ActivityItem {
  id: string;
  type: "ticket_created" | "ticket_assigned" | "ticket_resolved" | "sla_breach" | "pm_due" | "tech_unavailable" | "ticket_escalated" | "ticket_reviewed" | "ticket_rejected" | "work_order_created";
  message: string;
  entityId?: string;
  entityType?: "ticket" | "technician" | "asset" | "pm" | "work_order" | "amc" | "warranty";
  timestamp: string;
  read: boolean;
}


export const mockTickets: any[] = [];
export const mockAssets: any[] = [];
export const mockTechnicians: any[] = [];
export const mockSLAContract: any = { responseSLA: { Critical: 2, High: 4, Medium: 8, Low: 24 } };
export const mockAIAnalyses: any[] = [];


export type TicketStatus = 'Open' | 'Pending Review' | 'Assigned' | 'In Progress' | 'Completed' | 'Closed' | 'Rejected' | 'Approved' | 'Technician Accepted' | 'Work Order Generated' | 'Escalated' | 'Reassigned';

export interface VendorNotification { id: string; type: string; message: string; timestamp: string; isRead: boolean; actionRequired: boolean; }
export interface WarrantyRequest { id: string; assetId: string; status: string; }
export interface VendorSupportTicket { id: string; issue: string; status: string; }
