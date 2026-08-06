import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { subscribeToEvent, publishEvent } from "../utils/eventBus";
import {
  VendorInfo, VendorCustomer, VendorTechnician, VendorTicket, VendorAsset,
  PMTask, SLAContract, SLAMonthHistory, MonthRevenue, ActivityItem,
  WorkOrder, WorkOrderStatus, AIAnalysis,
  Priority, TicketStatus, TechAvailability,
} from "../types/legacy";
import { supabase } from "../lib/supabase";

// ─── Reassignment Event ───────────────────────────────────────────────────────
export interface ReassignmentEvent {
  id: string;
  requestId: string;          // ticket ID
  status: "requested" | "processing" | "completed" | "rejected" | "failed";
  previousTechnicianId: string;
  previousTechnicianName: string;
  newTechnicianId?: string;
  newTechnicianName?: string;
  reason: string;
  notes?: string;
  slaImpact?: {
    approvalDelayMinutes: number;
    processingDurationMinutes: number;
    reassignmentDurationMinutes: number;
  };
  timestamp: string;
}

// ─── Mock reassignment events ─────────────────────────────────────────────────
const mockReassignmentEvents: ReassignmentEvent[] = [
  {
    id: "RE-001", requestId: "TKT-0012", status: "completed",
    previousTechnicianId: "TECH-003", previousTechnicianName: "Fatima Al-Zahra",
    newTechnicianId: "TECH-007", newTechnicianName: "Omar Khalid",
    reason: "route_overload", notes: "Tech had 4 active jobs in same zone",
    slaImpact: { approvalDelayMinutes: 12, processingDurationMinutes: 8, reassignmentDurationMinutes: 20 },
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "RE-002", requestId: "TKT-0015", status: "requested",
    previousTechnicianId: "TECH-005", previousTechnicianName: "Khalid Hassan",
    reason: "vehicle_issue", notes: "Company van breakdown, unable to reach site",
    slaImpact: { approvalDelayMinutes: 0, processingDurationMinutes: 0, reassignmentDurationMinutes: 0 },
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: "RE-003", requestId: "TKT-0008", status: "rejected",
    previousTechnicianId: "TECH-002", previousTechnicianName: "Rania Mostafa",
    reason: "customer_reschedule", notes: "Reason was invalid, original tech retained",
    slaImpact: { approvalDelayMinutes: 5, processingDurationMinutes: 3, reassignmentDurationMinutes: 8 },
    timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
];

export const mockNotifications: VendorNotification[] = [
  { id: "NOT-1", category: "operational", priority: "high", title: "New ticket assigned for review", description: "Ticket TKT-0021 requires your approval.", relatedEntityId: "TKT-0021", timestamp: new Date(Date.now() - 3600000).toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false },
  { id: "NOT-2", category: "business", priority: "medium", title: "AMC renewal due", description: "AMC for AST-10024 expires in 30 days.", relatedEntityId: "AST-10024", timestamp: new Date(Date.now() - 86400000).toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false },
  { id: "NOT-3", category: "ai", priority: "high", title: "AI predicts SLA breach", description: "Ticket TKT-0014 is at risk of breaching resolution SLA.", relatedEntityId: "TKT-0014", timestamp: new Date(Date.now() - 7200000).toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false },
  { id: "NOT-4", category: "assets", priority: "high", title: "Asset health critical", description: "Repeated breakdown detected for AST-10045.", relatedEntityId: "AST-10045", timestamp: new Date(Date.now() - 172800000).toISOString(), read: true, dismissed: false, archived: false, actionCompleted: false },
  { id: "NOT-5", category: "technician", priority: "medium", title: "Technician checked in", description: "Michael T. arrived at TKT-0015.", relatedEntityId: "TKT-0015", timestamp: new Date(Date.now() - 1800000).toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false }
];

// ─── Context shape ────────────────────────────────────────────────────────────

export type NotificationCategory = "operational" | "business" | "technician" | "assets" | "ai";
export type NotificationPriority = "high" | "medium" | "low";


export type WorkflowStatus = "Request Received" | "Review" | "Quote Generated" | "Waiting Approval" | "Approved" | "Schedule Technician" | "Activate Contract" | "Generate Invoice" | "Completed";

export type WarrantyWorkflowStatus = 
  | "New Request" 
  | "Under Review" 
  | "Inspection Required" 
  | "Inspection Scheduled" 
  | "Inspection Completed" 
  | "Quotation Generated" 
  | "Quotation Sent" 
  | "Customer Approved" 
  | "Rejected" 
  | "Activated"
  | "Expired";

export interface WarrantyQuotation {
  durationYears: number;
  cost: number;
  discount?: number;
  coverage: string;
  exclusions: string;
  notes?: string;
  validUntil: string;
}

export interface WarrantyInspection {
  required: boolean;
  technicianId?: string;
  technicianName?: string;
  scheduledDate?: string;
  completed: boolean;
  notes?: string;
}

export interface WarrantyRequest {
  id: string;
  assetId: string;
  currentExpiryDate: string;
  status: WarrantyWorkflowStatus;
  timeline: { status: WarrantyWorkflowStatus; timestamp: string }[];
  aiRecommendation?: {
    text: string;
    suggestedDurationYears: number;
    inspectionRecommended: boolean;
  };
  quotation?: WarrantyQuotation;
  inspection?: WarrantyInspection;
}

export interface VendorSupportTicket {
  id: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: "Open" | "In Progress" | "Closed";
  timestamp: string;
}

export interface VendorNotification {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  description: string;
  relatedEntityId?: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
  archived: boolean;
  actionCompleted: boolean;
}

export interface VendorContextType {
  // Identity
  vendor: VendorInfo;
  slaContract: SLAContract;
  updateVendorProfile: (updates: Partial<VendorInfo>) => void;

  // Support Tickets
  supportTickets: VendorSupportTicket[];
  createSupportTicket: (ticket: Omit<VendorSupportTicket, 'id' | 'status' | 'timestamp'>) => void;


  // Customers
  customers: VendorCustomer[];

  // Technicians
  technicians: VendorTechnician[];
  updateTechnicianAvailability: (id: string, availability: TechAvailability) => void;

  // Tickets
  tickets: VendorTicket[];
  openTickets: VendorTicket[];
  breachedTickets: VendorTicket[];
  atRiskTickets: VendorTicket[];
  unassignedTickets: VendorTicket[];
  pendingReviewTickets: VendorTicket[];
  operationalTickets: VendorTicket[];    // non-pending-review tickets for Operations Dashboard
  finalizedTickets: VendorTicket[];      // completed/closed/rejected tickets
  assignTicket: (ticketId: string, techId: string, techName: string) => void;
  reassignTicket: (ticketId: string, newTechId: string, newTechName: string, reason: string, notes: string) => void;
  resolveTicket: (ticketId: string) => void;
  addTicketNote: (ticketId: string, note: string) => void;
  getTicketById: (id: string) => VendorTicket | undefined;
  advanceTicketWorkflow: (id: string, newStatus: string) => void;

  // Workflow Actions
  approveForAssignment: (ticketId: string) => void;
  modifyAndApprove: (ticketId: string, priority: Priority, category: string, notes: string) => void;
  rejectTicket: (ticketId: string, reason: string, notes: string) => void;
  technicianAcceptTicket: (ticketId: string) => void;
  startWork: (ticketId: string) => void;
  createWorkOrder: (ticketId: string, techId: string, techName: string) => string;
  completeWorkOrder: (workOrderId: string, notes: string) => void;
  closeTicket: (ticketId: string, resolutionNotes: string) => void;
  escalateTicket: (ticketId: string, reason: string) => void;

  // Reassignment Activity (System Admin equivalent)
  reassignmentEvents: ReassignmentEvent[];
  reassignmentSummary: {
    totalEvents: number;
    byStatus: { requested: number; processing: number; completed: number; rejected: number; failed: number; };
  };
  approveReassignment: (eventId: string) => void;
  rejectReassignment: (eventId: string) => void;

  // Work Orders
  workOrders: WorkOrder[];
  getWorkOrderById: (id: string) => WorkOrder | undefined;

  // Assets
  assets: VendorAsset[];
  getAssetById: (id: string) => VendorAsset | undefined;
  getAssetsByCustomer: (customerId: string) => VendorAsset[];

  // PM Tasks
  pmTasks: PMTask[];
  overduePMTasks: PMTask[];
  upcomingPMTasks: PMTask[];
  assignPMTask: (pmId: string, techId: string, techName: string) => void;
  completePMTask: (pmId: string) => void;
  togglePMChecklistItem: (pmId: string, itemId: string) => void;
  advancePMWorkflow: (id: string, newStatus: string, extraPayload?: Partial<PMTask>) => void;

  // Contracts
  amcRenewals: { id: string; assetId: string; expiryDate: string; status: WorkflowStatus; requiresPhysicalService?: boolean }[];
  warrantyRenewals: WarrantyRequest[];
  advanceAMCWorkflow: (id: string, newStatus: WorkflowStatus) => void;
  updateAMCPhysicalService: (id: string, requiresPhysicalService: boolean) => void;
  advanceWarrantyWorkflow: (id: string, newStatus: WarrantyWorkflowStatus, updates?: Partial<WarrantyRequest>) => void;
  activateWarrantyContract: (id: string) => void;

  // SLA
  slaHistory: SLAMonthHistory[];
  currentMonthCompliance: number;
  breachCount: number;
  atRiskCount: number;

  // Revenue
  revenueHistory: MonthRevenue[];
  currentMonthRevenue: MonthRevenue;

  // Activity
  activity: ActivityItem[];
  unreadActivityCount: number;
  markActivityRead: (id: string) => void;
  markAllActivityRead: () => void;

  // Notifications
  notifications: VendorNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  archiveNotification: (id: string) => void;
  markNotificationActionCompleted: (id: string) => void;

  // Operations KPIs (mirrors AdminDashboard)
  kpis: {
    activeTickets: number;
    pendingHitl: number;          // tickets awaiting vendor HITL decision
    operationalQueue: number;     // dispatched/assigned/in-progress
    assignedTickets: number;
    slaCompliance: number;
    activeTechnicians: number;
    availableTechnicians: number;
    unavailableTechnicians: number;
    monthRevenue: number;
    slaBreached: number;
    slaAtRisk: number;
  };
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function VendorProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<VendorInfo>({} as VendorInfo);
  const [supportTickets, setSupportTickets] = useState<VendorSupportTicket[]>([]);
  const [customers, setCustomers] = useState<VendorCustomer[]>([]);
  const [technicians, setTechnicians] = useState<VendorTechnician[]>([]);
  const [tickets, setTickets] = useState<VendorTicket[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<VendorAsset[]>([]);
  const [pmTasks, setPMTasks] = useState<PMTask[]>([]);
  const [slaHistory, setSlaHistory] = useState<SLAMonthHistory[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<MonthRevenue[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<VendorNotification[]>([]);
  
  const [amcRenewals, setAmcRenewals] = useState<any[]>([]);
  const [warrantyRenewals, setWarrantyRenewals] = useState<WarrantyRequest[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: vendorData } = await supabase.from('vendors').select('*').limit(1).single();
        if (vendorData) {
          setVendor({
             id: vendorData.id,
             name: vendorData.name,
             email: vendorData.email,
             phone: vendorData.phone,
             rating: 5,
             totalTechnicians: 0,
             activeContracts: 0,
             slaPerformance: 100
          });
        }

        const { data: ticketsData } = await supabase.from('tickets').select('*');
        if (ticketsData) {
           setTickets(ticketsData.map(t => ({
              id: t.id,
              title: t.title,
              description: t.description || "",
              status: t.status as any,
              priority: t.priority as any,
              customerId: t.org_id,
              customerName: "Customer",
              location: "Location",
              assetId: t.asset_id,
              assetName: "Asset",
              reportedAt: t.created_at,
              slaDeadline: t.created_at,
              tags: [],
              timeline: [],
              createdAt: t.created_at,
              updatedAt: t.created_at,
              notes: []
           })));
        }
      } catch (err) {
        console.error("Failed to fetch VendorContext data", err);
      }
    };
    fetchData();
  }, []);


  const advanceAMCWorkflow = useCallback((id: string, newStatus: WorkflowStatus) => {
    setAmcRenewals(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_reviewed", message: `AMC ${id} moved to ${newStatus}`,
      entityId: id, entityType: "amc", timestamp: new Date().toISOString(), read: false
    }, ...prev]);
  }, []);

  const updateAMCPhysicalService = useCallback((id: string, requiresPhysicalService: boolean) => {
    setAmcRenewals(prev => prev.map(a => a.id === id ? { ...a, requiresPhysicalService } : a));
  }, []);

  const advanceWarrantyWorkflow = useCallback((id: string, newStatus: WarrantyWorkflowStatus, updates?: Partial<WarrantyRequest>) => {
    setWarrantyRenewals(prev => prev.map(w => {
      if (w.id === id) {
        const timeline = [...w.timeline, { status: newStatus, timestamp: new Date().toISOString() }];
        return { ...w, status: newStatus, timeline, ...updates };
      }
      return w;
    }));
    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_reviewed", message: `Warranty ${id} moved to ${newStatus}`,
      entityId: id, entityType: "warranty", timestamp: new Date().toISOString(), read: false
    }, ...prev]);
    
    // Notifications for FSM states
    if (newStatus === "Quotation Sent" || newStatus === "Inspection Scheduled" || newStatus === "Activated") {
      setNotifications(prev => [{
        id: `NOT-${Date.now()}-WAR`,
        category: "business",
        priority: "medium",
        title: `Warranty ${newStatus}`,
        description: `Warranty request ${id} is now ${newStatus}.`,
        relatedEntityId: id,
        timestamp: new Date().toISOString(),
        read: false, dismissed: false, archived: false, actionCompleted: false
      }, ...prev]);
    }
  }, []);

  const activateWarrantyContract = useCallback((id: string) => {
    setWarrantyRenewals(prev => prev.map(w => {
      if (w.id === id && w.quotation) {
        // Update the asset's expiry date globally
        setAssets(assetsPrev => assetsPrev.map(a => {
          if (a.id === w.assetId) {
            const currentExpiry = new Date(a.warrantyExpiry);
            currentExpiry.setFullYear(currentExpiry.getFullYear() + (w.quotation?.durationYears || 1));
            return { ...a, warrantyExpiry: currentExpiry.toISOString() };
          }
          return a;
        }));
        const timeline = [...w.timeline, { status: "Activated" as WarrantyWorkflowStatus, timestamp: new Date().toISOString() }];
        return { ...w, status: "Activated" as WarrantyWorkflowStatus, timeline };
      }
      return w;
    }));
    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_reviewed", message: `Warranty Contract ${id} Activated`,
      entityId: id, entityType: "warranty", timestamp: new Date().toISOString(), read: false
    }, ...prev]);
  }, []);


  const advancePMWorkflow = useCallback((id: string, newStatus: string, extraPayload?: Partial<PMTask>) => {
    setPMTasks(prev => prev.map(p => {
      if (p.id === id) {
        const timeline = [...(p.timeline || []), { status: newStatus as any, timestamp: new Date().toISOString() }];
        return { ...p, status: newStatus as any, timeline, ...extraPayload };
      }
      return p;
    }));
    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_reviewed", message: `PM ${id} moved to ${newStatus}`,
      entityId: id, entityType: "pm", timestamp: new Date().toISOString(), read: false
    }, ...prev]);
    setNotifications(prev => [
      {
        id: `NOT-${Date.now()}-PM`,
        category: "operational",
        priority: "medium",
        title: `PM ${newStatus}`,
        description: `PM task ${id} status updated to ${newStatus}.`,
        relatedEntityId: id,
        timestamp: new Date().toISOString(),
        read: false,
        dismissed: false,
        archived: false,
        actionCompleted: false
      },
      ...prev
    ]);
  }, []);

  const advanceTicketWorkflow = useCallback((id: string, newStatus: string) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => {
      if (t.id !== id) return t;
      const patch: Partial<typeof t> = { status: newStatus as any, updatedAt: now };
      if (newStatus === 'Technician Accepted') patch.techAcceptedAt = now;
      if (newStatus === 'Travelling')          { patch.startedAt = now; patch.technicianEta = "En route"; patch.technicianDistance = "—"; patch.technicianLastSeen = now; }
      if (newStatus === 'Arrived')             { patch.arrivedAt = now; patch.technicianEta = "Arrived"; patch.technicianDistance = "0 km"; patch.technicianLastSeen = now; }
      if (newStatus === 'Checked In' || newStatus === 'On Site' || newStatus === 'In Progress' || newStatus === 'Work Order Generated')
                                               { if (!t.startedWorkAt) patch.startedWorkAt = now; patch.technicianEta = "On Site"; patch.technicianLastSeen = now; }
      if (newStatus === 'Completed')           patch.completedAt = now;
      return { ...t, ...patch };
    }));
    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_reviewed", message: `Ticket ${id} moved to ${newStatus}`,
      entityId: id, entityType: "ticket", timestamp: now, read: false
    }, ...prev]);
    publishEvent({ type: 'TICKET_STATUS_CHANGED', payload: { ticketId: id, status: newStatus, by: "Technician" } });
    if (newStatus === 'Travelling') {
      publishEvent({ type: 'TECH_LOCATION_UPDATED', payload: { ticketId: id, eta: "En route", distance: "—", phase: 'en_route' } });
    }
    if (newStatus === 'Arrived' || newStatus === 'Checked In' || newStatus === 'On Site') {
      publishEvent({ type: 'TECH_LOCATION_UPDATED', payload: { ticketId: id, eta: "On Site", distance: "0 km", phase: 'on_site' } });
    }
    if (newStatus === 'Completed') {
      publishEvent({ type: 'TECH_LOCATION_UPDATED', payload: { ticketId: id, eta: "—", distance: "—", phase: 'completed' } });
    }
  }, []);

  useEffect(() => {
    return subscribeToEvent((event) => {
      switch (event.type) {
        case 'AMC_RENEWAL_REQUESTED':
          setAmcRenewals(prev => {
            if (prev.find(a => a.assetId === event.payload.assetId)) return prev;
            return [{
              id: `AMC-R-${Date.now().toString().slice(-4)}`,
              assetId: event.payload.assetId,
              expiryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
              status: "Request Received"
            }, ...prev];
          });
          setActivity(prev => [{
            id: `ACT-${Date.now()}`, type: "ticket_created", message: `AMC Renewal Requested for ${event.payload.assetName}`,
            entityId: event.payload.assetId, entityType: "amc", timestamp: new Date().toISOString(), read: false
          }, ...prev]);
          setNotifications(prev => [
            {
              id: `NOT-${Date.now()}`,
              category: "business",
              priority: "high",
              title: "AMC Renewal Requested",
              description: `Organization requested AMC renewal quote for ${event.payload.assetName}.`,
              relatedEntityId: event.payload.assetId,
              timestamp: new Date().toISOString(),
              read: false,
              dismissed: false,
              archived: false,
              actionCompleted: false
            },
            ...prev
          ]);
          break;
        case 'WARRANTY_EXTENSION_REQUESTED':
          setWarrantyRenewals(prev => {
            if (prev.find(w => w.assetId === event.payload.assetId)) return prev;
            return [{
              id: `WAR-E-${Date.now().toString().slice(-4)}`,
              assetId: event.payload.assetId,
              currentExpiryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
              status: "New Request",
              timeline: [{ status: "New Request", timestamp: new Date().toISOString() }]
            }, ...prev];
          });
          setActivity(prev => [{
            id: `ACT-${Date.now()}`, type: "ticket_created", message: `Warranty Extension Requested for ${event.payload.assetName}`,
            entityId: event.payload.assetId, entityType: "warranty", timestamp: new Date().toISOString(), read: false
          }, ...prev]);
          setNotifications(prev => [
            {
              id: `NOT-${Date.now()}`,
              category: "business",
              priority: "high",
              title: "Warranty Extension Requested",
              description: `Organization requested warranty extension quote for ${event.payload.assetName}.`,
              relatedEntityId: event.payload.assetId,
              timestamp: new Date().toISOString(),
              read: false,
              dismissed: false,
              archived: false,
              actionCompleted: false
            },
            ...prev
          ]);
          break;
        case 'PM_SCHEDULED':
          setPMTasks(prev => [{
            id: `PM-${Date.now().toString().slice(-4)}`,
            vendorId: "VEN-01",
            assetId: event.payload.assetId,
            assetName: "Air Conditioning Unit A",
            customerId: "CUST-1",
            customerName: "Organization",
            type: event.payload.taskDetails?.type || "Maintenance",
            status: "Requested",
            dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
            recurrence: "one_time",
            category: "Mechanical",
            estimatedHrs: 2,
            checklist: [],
            timeline: [{ status: "Requested", timestamp: new Date().toISOString() }]
          }, ...prev]);
          setActivity(prev => [{
            id: `ACT-${Date.now()}`, type: "ticket_created", message: `New PM Requested for ${event.payload.assetId}`,
            entityId: event.payload.assetId, entityType: "pm", timestamp: new Date().toISOString(), read: false
          }, ...prev]);
          setNotifications(prev => [
            {
              id: `NOT-${Date.now()}-PM`,
              category: "business",
              priority: "high",
              title: "New Preventive Maintenance Request",
              description: `Organization requested PM for asset ${event.payload.assetId}.`,
              relatedEntityId: event.payload.assetId,
              timestamp: new Date().toISOString(),
              read: false,
              dismissed: false,
              archived: false,
              actionCompleted: false
            },
            ...prev
          ]);
          break;
        case 'TICKET_CREATED':
          const tkt = event.payload.ticket || event.payload;
          setTickets(prev => [{
             id: tkt.id,
             vendorId: "VEN-01",
             title: tkt.title,
             category: tkt.category,
             priority: tkt.priority,
             status: "Pending Review",
             slaStatus: "ok",
             slaResponseHrs: 4,
             slaResolutionHrs: 24,
             slaDeadline: new Date(Date.now() + 4 * 3600000).toISOString(),
             createdAt: new Date().toISOString(),
             updatedAt: new Date().toISOString(),
             description: "Ticket generated from Organization.",
             location: tkt.location,
             customerId: "CUST-1",
             customerName: "Organization",
             assetId: tkt.assetId,
             notes: []
          }, ...prev]);
          setNotifications(prev => [
            {
              id: `NOT-${Date.now()}-TKT`,
              category: "operational",
              priority: tkt.priority === 'Critical' ? 'high' : 'medium',
              title: "New Ticket Received",
              description: `New ticket ${tkt.id} created by Organization.`,
              relatedEntityId: tkt.id,
              timestamp: new Date().toISOString(),
              read: false,
              dismissed: false,
              archived: false,
              actionCompleted: false
            },
            ...prev
          ]);
          break;
        case 'TICKET_STATUS_CHANGED': {
          const { ticketId, status, by } = event.payload;
          if (by === "Technician") {
            setNotifications(prev => [
              {
                id: `NOT-${Date.now()}-TKT-STAT`,
                category: "operational",
                priority: "medium",
                title: "Technician Workflow Update",
                description: `Technician updated ticket ${ticketId} status to ${status}.`,
                relatedEntityId: ticketId,
                timestamp: new Date().toISOString(),
                read: false, dismissed: false, archived: false, actionCompleted: false
              },
              ...prev
            ]);
          }
          break;
        }
        case 'SLA_WARNING': {
          const { ticketId, urgency, timeRemaining } = event.payload;
          setNotifications(prev => [
            {
              id: `NOT-${Date.now()}-SLA`,
              category: "ai",
              priority: "high",
              title: "SLA Breach Warning",
              description: `Ticket ${ticketId} is at risk. ${timeRemaining} remaining.`,
              relatedEntityId: ticketId,
              timestamp: new Date().toISOString(),
              read: false, dismissed: false, archived: false, actionCompleted: false
            },
            ...prev
          ]);
          break;
        }
        case 'CONSUMABLE_DEPLETED':
          setNotifications(prev => [
            {
              id: `NOT-${Date.now()}`,
              category: "assets",
              priority: "medium",
              title: "Consumable Depleted",
              description: `${event.payload.consumable} is depleted on Asset ${event.payload.assetId}.`,
              relatedEntityId: event.payload.assetId,
              timestamp: new Date().toISOString(),
              read: false,
              dismissed: false,
              archived: false,
              actionCompleted: false
            },
            ...prev
          ]);
          break;
      }
    });
  }, []);

  // ── Derived ticket lists ─────────────────────────────────────────────────
  const openTickets = tickets.filter(t => t.status !== "Closed" && t.status !== "Rejected" && t.status !== "Completed");
  const breachedTickets = tickets.filter(t => t.slaStatus === "breached" && t.status !== "Closed" && t.status !== "Rejected" && t.status !== "Completed");
  const atRiskTickets = tickets.filter(t => t.slaStatus === "at_risk" && t.status !== "Closed" && t.status !== "Rejected" && t.status !== "Completed");
  const unassignedTickets = tickets.filter(t => t.status === "Approved");
  const pendingReviewTickets = tickets.filter(t => t.status === "Pending Review");
  // For Operations Dashboard: all non-pending-review active tickets
  const operationalTickets = tickets.filter(t => t.status !== "Pending Review");
  // Finalized: completed, closed, rejected
  const finalizedTickets = tickets.filter(t => t.status === "Completed" || t.status === "Closed" || t.status === "Rejected");
  const assignedTickets = tickets.filter(t => t.status === "Assigned" || t.status === "Technician Accepted" || t.status === "In Progress" || t.status === "Work Order Generated");

  // ── Derived PM lists ─────────────────────────────────────────────────────
  const overduePMTasks = pmTasks.filter(p => p.status === "Overdue");
  const upcomingPMTasks = pmTasks.filter(p => p.status === "Requested" || p.status === "Approved" || p.status === "Planning");

  // ── SLA metrics ──────────────────────────────────────────────────────────
  const currentMonthCompliance = slaHistory[slaHistory.length - 1]?.compliance ?? 0;
  const breachCount = breachedTickets.length;
  const atRiskCount = atRiskTickets.length;

  // ── Revenue ──────────────────────────────────────────────────────────────
  const currentMonthRevenue = revenueHistory[revenueHistory.length - 1];

  // ── Activity ─────────────────────────────────────────────────────────────
  const unreadActivityCount = activity.filter(a => !a.read).length;
  const unreadNotificationCount = notifications.filter(n => !n.read && !n.dismissed && !n.archived).length;

  // ── Reassignment events ──────────────────────────────────────────────────
  const [reassignmentEvents, setReassignmentEvents] = useState<ReassignmentEvent[]>(mockReassignmentEvents);

  const reassignmentSummary = {
    totalEvents: reassignmentEvents.length,
    byStatus: {
      requested: reassignmentEvents.filter(e => e.status === "requested").length,
      processing: reassignmentEvents.filter(e => e.status === "processing").length,
      completed: reassignmentEvents.filter(e => e.status === "completed").length,
      rejected: reassignmentEvents.filter(e => e.status === "rejected").length,
      failed: reassignmentEvents.filter(e => e.status === "failed").length,
    },
  };

  // ── KPIs (System Admin Operations equivalent) ─────────────────────────────
  const kpis = {
    activeTickets: openTickets.length,
    pendingHitl: pendingReviewTickets.length,
    operationalQueue: openTickets.filter(t => t.status !== "Pending Review").length,
    assignedTickets: assignedTickets.length,
    slaCompliance: currentMonthCompliance,
    activeTechnicians: technicians.filter(t => t.availability === "on_job").length,
    availableTechnicians: technicians.filter(t => t.availability === "available").length,
    unavailableTechnicians: technicians.filter(t => t.availability === "unavailable" || t.availability === "off").length,
    monthRevenue: currentMonthRevenue?.revenue ?? 0,
    slaBreached: breachCount,
    slaAtRisk: atRiskCount,
  };

  // ── Workflow actions ─────────────────────────────────────────────────────
  const approveForAssignment = useCallback((ticketId: string) => {
    const newNotif: VendorNotification = { id: `NOT-$\{Date.now()}`, category: "operational", priority: "medium", title: "New ticket approved for assignment", description: `Ticket $\{ticketId} is approved and ready for dispatch.`, relatedEntityId: ticketId, timestamp: new Date().toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false };
    setNotifications(prev => [newNotif, ...prev]);
    setTickets(prev => prev.map(t =>
      t.id === ticketId && t.status === "Pending Review"
        ? { ...t, status: "Approved", updatedAt: new Date().toISOString() }
        : t
    ));
    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_reviewed", message: `${ticketId} approved for assignment`,
      entityId: ticketId, entityType: "ticket", timestamp: new Date().toISOString(), read: false
    }, ...prev]);
  }, []);

  const modifyAndApprove = useCallback((ticketId: string, priority: Priority, category: string, notes: string) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId && t.status === "Pending Review"
        ? { 
            ...t, 
            status: "Approved", 
            modifiedPriority: priority, 
            modifiedCategory: category, 
            modifiedNotes: notes,
            priority: priority, 
            category: category,
            updatedAt: new Date().toISOString() 
          }
        : t
    ));
    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_reviewed", message: `${ticketId} modified and approved`,
      entityId: ticketId, entityType: "ticket", timestamp: new Date().toISOString(), read: false
    }, ...prev]);
  }, []);

  const rejectTicket = useCallback((ticketId: string, reason: string, notes: string) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId && t.status === "Pending Review"
        ? { ...t, status: "Rejected", rejectionReason: reason, rejectionNotes: notes, updatedAt: new Date().toISOString() }
        : t
    ));
    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_rejected", message: `${ticketId} rejected: ${reason}`,
      entityId: ticketId, entityType: "ticket", timestamp: new Date().toISOString(), read: false
    }, ...prev]);
  }, []);

  const technicianAcceptTicket = useCallback((ticketId: string) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, status: "Technician Accepted", updatedAt: new Date().toISOString() }
        : t
    ));
  }, []);

  const startWork = useCallback((ticketId: string) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, status: "In Progress", updatedAt: new Date().toISOString() }
        : t
    ));
  }, []);

  const createWorkOrder = useCallback((ticketId: string, techId: string, techName: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.status !== "In Progress") return "";
    
    const woId = `WO-${Date.now().toString().slice(-4)}`;
    const newWO: WorkOrder = {
      id: woId,
      ticketId,
      technicianId: techId,
      technicianName: techName,
      category: ticket.category,
      customerName: ticket.customerName,
      location: ticket.location + (ticket.floor ? ` · ${ticket.floor}` : ""),
      createdAt: new Date().toISOString(),
      estimatedHours: ticket.aiAnalysis?.estimatedHours || 2,
      status: "in_progress",
      checklist: [
        { id: "C1", label: "Inspect reported issue", done: false },
        { id: "C2", label: "Perform required repair", done: false },
        { id: "C3", label: "Test functionality", done: false },
        { id: "C4", label: "Clean up work area", done: false },
      ]
    };
    
    setWorkOrders(prev => [newWO, ...prev]);
    
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, workOrderId: woId, status: "Work Order Generated" } : t
    ));
    
    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "work_order_created", message: `Work Order ${woId} created for Ticket ${ticketId}`,
      entityId: ticketId, entityType: "ticket", timestamp: new Date().toISOString(), read: false
    }, ...prev]);

    return woId;
  }, [tickets]);

  const completeWorkOrder = useCallback((workOrderId: string, notes: string) => {
    const newNotif: VendorNotification = { id: `NOT-$\{Date.now()}`, category: "operational", priority: "low", title: "Work order completed", description: `Work order $\{workOrderId} has been successfully completed.`, relatedEntityId: workOrderId, timestamp: new Date().toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false };
    setNotifications(prev => [newNotif, ...prev]);
    let ticketCost = 0;
    setWorkOrders(prev => prev.map(w => {
      if (w.id === workOrderId) {
        // Approximate 150 AED per estimated hour
        ticketCost = (w.estimatedHours || 2) * 150;
        return { ...w, status: "completed", resolutionNotes: notes, completedAt: new Date().toISOString() };
      }
      return w;
    }));
    
    if (ticketCost > 0) {
      setRevenueHistory(prev => {
        const last = prev[prev.length - 1];
        if (last) {
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, revenue: last.revenue + ticketCost, jobs: last.jobs + 1, labor: last.labor + ticketCost };
          return updated;
        }
        return prev;
      });
    }

    setTickets(prev => prev.map(t => 
      t.workOrderId === workOrderId ? { ...t, status: "Completed", updatedAt: new Date().toISOString() } : t
    ));

    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_resolved", message: `Work Order ${workOrderId} completed`,
      entityId: workOrderId, entityType: "work_order", timestamp: new Date().toISOString(), read: false
    }, ...prev]);

    const wo = workOrders.find(w => w.id === workOrderId);
    if (wo) {
       const tkt = tickets.find(t => t.id === wo.ticketId);
       if (tkt && tkt.assetId) {
          publishEvent({
             type: 'WORK_ORDER_COMPLETED',
             payload: { ticketId: tkt.id, assetId: tkt.assetId, category: wo.category, status: "Completed", title: tkt.title }
          });
       }
    }
  }, [workOrders, tickets]);

  const closeTicket = useCallback((ticketId: string, resolutionNotes: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId && t.status === "Completed") {
        if (t.workOrderId) {
          setWorkOrders(wos => wos.map(w => w.id === t.workOrderId ? { ...w, status: "closed", closedAt: new Date().toISOString() } : w));
        }
        return { 
          ...t, 
          status: "Closed", 
          slaStatus: "resolved", 
          notes: [...t.notes, `Closed: ${resolutionNotes}`],
          updatedAt: new Date().toISOString(), 
          resolvedAt: new Date().toISOString() 
        };
      }
      return t;
    }));
    
    // Workflow integration: Boost asset health if a ticket is closed
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket && ticket.assetId) {
      setAssets(prev => prev.map(a => 
        a.id === ticket.assetId 
          ? { ...a, healthScore: Math.min(100, (a.healthScore || 0) + 5) } 
          : a
      ));
    }
    
    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_resolved", message: `${ticketId} closed`,
      entityId: ticketId, entityType: "ticket", timestamp: new Date().toISOString(), read: false
    }, ...prev]);
  }, []);

  const escalateTicket = useCallback((ticketId: string, reason: string) => {
    const newNotif: VendorNotification = { id: `NOT-$\{Date.now()}`, category: "operational", priority: "high", title: "Ticket escalated", description: `Ticket $\{ticketId} was escalated: $\{reason}`, relatedEntityId: ticketId, timestamp: new Date().toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false };
    setNotifications(prev => [newNotif, ...prev]);
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, status: "Escalated", slaStatus: "at_risk", notes: [...t.notes, `Escalated: ${reason}`], updatedAt: new Date().toISOString() }
        : t
    ));

    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_escalated", message: `Ticket ${ticketId} escalated: ${reason}`,
      entityId: ticketId, entityType: "ticket", timestamp: new Date().toISOString(), read: false
    }, ...prev]);
  }, []);

  // ── Ticket actions (legacy / internal) ───────────────────────────────────
  const assignTicket = useCallback((ticketId: string, techId: string, techName: string) => {
    const newNotif: VendorNotification = { id: `NOT-$\{Date.now()}`, category: "technician", priority: "high", title: "Technician accepted assignment", description: `$\{techName} has been assigned to ticket $\{ticketId}.`, relatedEntityId: ticketId, timestamp: new Date().toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false };
    setNotifications(prev => [newNotif, ...prev]);
    setTickets(prev => prev.map(t =>
      t.id === ticketId && (t.status === "Approved" || t.status === "Reassigned")
        ? { ...t, assignedTechnicianId: techId, assignedTechnicianName: techName, status: "Assigned" as TicketStatus, updatedAt: new Date().toISOString() }
        : t
    ));
    setTechnicians(prev => prev.map(tech =>
      tech.id === techId
        ? { ...tech, activeJobCount: tech.activeJobCount + 1, availability: "on_job" as TechAvailability, currentJobId: ticketId }
        : tech
    ));
    const newActivity: ActivityItem = {
      id: `ACT-${Date.now()}`,
      type: "ticket_assigned",
      message: `${ticketId} assigned to ${techName}`,
      entityId: ticketId,
      entityType: "ticket",
      timestamp: new Date().toISOString(),
      read: false,
    };
    setActivity(prev => [newActivity, ...prev]);
    publishEvent({ type: 'TICKET_ASSIGNED', payload: { ticketId, vendorId: 'VEN-01', status: 'Assigned', techId, techName } });
  }, []);

  // ── Reassignment approval / rejection (System Admin workflow) ────────────
  const approveReassignment = useCallback((eventId: string) => {
    const event = reassignmentEvents.find(e => e.id === eventId);
    if (!event || event.status !== "requested") return;

    setReassignmentEvents(prev => prev.map(e =>
      e.id === eventId
        ? { ...e, status: "processing", slaImpact: { ...e.slaImpact!, approvalDelayMinutes: Math.floor((Date.now() - new Date(e.timestamp).getTime()) / 60000) } }
        : e
    ));

    // Simulate async dispatch — mark completed after brief delay representation
    setTimeout(() => {
      setReassignmentEvents(prev => prev.map(e =>
        e.id === eventId
          ? { ...e, status: "completed", newTechnicianName: "AI Reassigned Technician", slaImpact: { approvalDelayMinutes: 8, processingDurationMinutes: 12, reassignmentDurationMinutes: 20 } }
          : e
      ));
    }, 0);

    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_assigned",
      message: `Reassignment for ${event.requestId} approved — new technician dispatched`,
      entityId: event.requestId, entityType: "ticket",
      timestamp: new Date().toISOString(), read: false,
    }, ...prev]);
  }, [reassignmentEvents]);

  const rejectReassignment = useCallback((eventId: string) => {
    const event = reassignmentEvents.find(e => e.id === eventId);
    if (!event || event.status !== "requested") return;

    setReassignmentEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, status: "rejected" } : e
    ));

    setActivity(prev => [{
      id: `ACT-${Date.now()}`, type: "ticket_rejected",
      message: `Reassignment for ${event.requestId} rejected — original technician retained`,
      entityId: event.requestId, entityType: "ticket",
      timestamp: new Date().toISOString(), read: false,
    }, ...prev]);
  }, [reassignmentEvents]);

  const reassignTicket = useCallback((ticketId: string, newTechId: string, newTechName: string, reason: string, notes: string) => {
    let oldTechId: string | null = null;
    let oldTechName: string | null = null;

    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        oldTechId = t.assignedTechnicianId || null;
        oldTechName = t.assignedTechnicianName || null;
        return { 
          ...t, 
          assignedTechnicianId: newTechId, 
          assignedTechnicianName: newTechName, 
          status: "Assigned" as TicketStatus,
          notes: [...t.notes, `Reassigned to ${newTechName}. Reason: ${reason}. Notes: ${notes}`],
          updatedAt: new Date().toISOString() 
        };
      }
      return t;
    }));

    setTechnicians(prev => prev.map(tech => {
      if (tech.id === newTechId) {
        return { ...tech, activeJobCount: tech.activeJobCount + 1, availability: "on_job" as TechAvailability, currentJobId: ticketId };
      }
      if (oldTechId && tech.id === oldTechId) {
        const newCount = Math.max(0, tech.activeJobCount - 1);
        const newAvail = newCount === 0 ? ("available" as TechAvailability) : ("on_job" as TechAvailability);
        const newCurrentJob = newCount === 0 ? undefined : tech.currentJobId;
        return { ...tech, activeJobCount: newCount, availability: newAvail, currentJobId: newCurrentJob };
      }
      return tech;
    }));

    setActivity(prev => [{
      id: `ACT-${Date.now()}`,
      type: "ticket_assigned",
      message: `${ticketId} reassigned to ${newTechName} (Reason: ${reason})`,
      entityId: ticketId,
      entityType: "ticket",
      timestamp: new Date().toISOString(),
      read: false,
    }, ...prev]);

    // Log as reassignment event
    const newEvent: ReassignmentEvent = {
      id: `RE-${Date.now()}`,
      requestId: ticketId,
      status: "completed",
      previousTechnicianId: "",
      previousTechnicianName: "Previous Technician",
      newTechnicianId: newTechId,
      newTechnicianName: newTechName,
      reason,
      notes,
      slaImpact: { approvalDelayMinutes: 5, processingDurationMinutes: 10, reassignmentDurationMinutes: 15 },
      timestamp: new Date().toISOString(),
    };
    setReassignmentEvents(prev => [newEvent, ...prev]);
  }, []);

  const resolveTicket = useCallback((ticketId: string) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, status: "Resolved" as TicketStatus, slaStatus: "resolved", updatedAt: new Date().toISOString(), resolvedAt: new Date().toISOString() }
        : t
    ));
  }, []);

  const addTicketNote = useCallback((ticketId: string, note: string) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, notes: [...t.notes, note], updatedAt: new Date().toISOString() }
        : t
    ));
  }, []);

  const getTicketById = useCallback((id: string) => tickets.find(t => t.id === id), [tickets]);
  const getWorkOrderById = useCallback((id: string) => workOrders.find(w => w.id === id), [workOrders]);

  // ── Technician actions ───────────────────────────────────────────────────
  const updateTechnicianAvailability = useCallback((id: string, availability: TechAvailability) => {
    setTechnicians(prev => prev.map(t =>
      t.id === id ? { ...t, availability } : t
    ));
  }, []);

  // ── Asset helpers ────────────────────────────────────────────────────────
  const getAssetById = useCallback((id: string) => assets.find(a => a.id === id), [assets]);
  const getAssetsByCustomer = useCallback((customerId: string) => assets.filter(a => a.customerId === customerId), [assets]);

  // ── PM actions ───────────────────────────────────────────────────────────
  const assignPMTask = useCallback((pmId: string, techId: string, techName: string) => {
    setPMTasks(prev => prev.map(p => {
      if (p.id === pmId) {
        const timeline = [...(p.timeline || []), { status: "Technician Assigned" as any, timestamp: new Date().toISOString() }];
        return { ...p, assignedTechnicianId: techId, assignedTechnicianName: techName, status: "Technician Assigned" as any, timeline };
      }
      return p;
    }));
  }, []);

  const completePMTask = useCallback((pmId: string) => {
    let targetAssetId: string | null = null;
    setPMTasks(prev => prev.map(p => {
      if (p.id === pmId) {
        targetAssetId = p.assetId;
        const timeline = [...(p.timeline || []), { status: "Completed" as any, timestamp: new Date().toISOString() }];
        return { ...p, status: "Completed" as any, completedDate: new Date().toISOString().split("T")[0], timeline };
      }
      return p;
    }));

    // Workflow integration: Boost asset health significantly and reset PM date
    if (targetAssetId) {
      setAssets(prev => prev.map(a => 
        a.id === targetAssetId
          ? { 
              ...a, 
              healthScore: Math.min(100, (a.healthScore || 0) + 15),
              health: "Healthy",
              lastPMDate: new Date().toISOString().split("T")[0]
            }
          : a
      ));
    }
  }, []);

  const togglePMChecklistItem = useCallback((pmId: string, itemId: string) => {
    setPMTasks(prev => prev.map(p =>
      p.id === pmId
        ? { ...p, checklist: p.checklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c) }
        : p
    ));
  }, []);

  // ── Activity actions ─────────────────────────────────────────────────────
  
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
  }, []);

  const archiveNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, archived: true } : n));
  }, []);

  const markNotificationActionCompleted = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, actionCompleted: true, read: true } : n));
  }, []);

  const markActivityRead = useCallback((id: string) => {
    setActivity(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }, []);

  
  const updateVendorProfile = useCallback((updates: Partial<VendorInfo>) => {
    setVendor(prev => ({ ...prev, ...updates }));
  }, []);

  const createSupportTicket = useCallback((ticket: Omit<VendorSupportTicket, 'id' | 'status' | 'timestamp'>) => {
    const newTicket: VendorSupportTicket = {
      ...ticket,
      id: `SUP-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      status: "Open",
      timestamp: new Date().toISOString()
    };
    setSupportTickets(prev => [newTicket, ...prev]);
  }, []);


  const markAllActivityRead = useCallback(() => {
    setActivity(prev => prev.map(a => ({ ...a, read: true })));
  }, []);

  return (
    <VendorContext.Provider value={{
      vendor, updateVendorProfile, supportTickets, createSupportTicket, slaContract: null, customers,
      technicians, updateTechnicianAvailability,
      tickets, openTickets, breachedTickets, atRiskTickets, unassignedTickets, pendingReviewTickets,
      operationalTickets, finalizedTickets,
      assignTicket, reassignTicket, resolveTicket, addTicketNote, getTicketById, advanceTicketWorkflow,
      approveForAssignment, modifyAndApprove, rejectTicket, technicianAcceptTicket, startWork, createWorkOrder, completeWorkOrder, closeTicket, escalateTicket,
      reassignmentEvents, reassignmentSummary, approveReassignment, rejectReassignment,
      workOrders, getWorkOrderById,
      assets, getAssetById, getAssetsByCustomer,
      amcRenewals, warrantyRenewals, advanceAMCWorkflow, updateAMCPhysicalService, advanceWarrantyWorkflow, activateWarrantyContract,
      pmTasks, overduePMTasks, upcomingPMTasks, assignPMTask, completePMTask, togglePMChecklistItem, advancePMWorkflow,
      slaHistory, currentMonthCompliance, breachCount, atRiskCount,
      revenueHistory, currentMonthRevenue,
      activity, unreadActivityCount, markActivityRead, markAllActivityRead,
      notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead,
      dismissNotification, archiveNotification, markNotificationActionCompleted,
      kpis,
    }}>
      {children}
    </VendorContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useVendor() {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error("useVendor must be used within VendorProvider");
  return ctx;
}

// Re-export types for convenience
export type {
  VendorInfo, VendorCustomer, VendorTechnician, VendorTicket,
  VendorAsset, PMTask, SLAMonthHistory, MonthRevenue, ActivityItem,
  WorkOrder, WorkOrderStatus, AIAnalysis,
  Priority, TicketStatus, TechAvailability,
};
