import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from "react";
import { useVendor } from "./VendorContext";
import { TechProfile, TechPerformanceData } from "../types/legacy";
import { VendorTicket, PMTask, WorkOrder } from "../types/legacy";
import { supabase } from "../lib/supabase";

export type FilterType = "all" | "unread" | "assignments" | "urgent" | "vendor" | "customer" | "ai" | "completed";

export type ActionType = "new_job" | "reassigned" | "pm_task" | "warranty" | "amc" | "vendor_msg" | "sla_warn" | "customer_comment" | "wo_update" | "cancelled" | "route_change" | "ai_rec" | "report_approved";

export interface NotificationItem {
  id: string;
  type: FilterType | "system" | "route";
  actionType: ActionType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  priority: "low" | "medium" | "high" | "critical";
  jobId?: string;
  assetName?: string;
}

export interface NotificationPreferences {
  jobAssignment: boolean;
  pmTask: boolean;
  warrantyInspection: boolean;
  amcVisit: boolean;
  vendorMessages: boolean;
  slaAlerts: boolean;
  aiRecommendations: boolean;
  sound: boolean;
  vibration: boolean;
  email: boolean;
}

export const generateMockNotifications = (): NotificationItem[] => {
  const now = new Date();
  const createDate = (hoursAgo: number, daysAgo: number = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - hoursAgo);
    return d.toISOString();
  };

  return [
    {
      id: "notif-1", type: "urgent", actionType: "sla_warn",
      title: "SLA Warning: TKT-0003",
      description: "Job SLA will breach in 45 minutes. Priority upgrade recommended.",
      timestamp: createDate(0), isRead: false, priority: "high", jobId: "TKT-0003",
    },
    {
      id: "notif-2", type: "assignments", actionType: "pm_task",
      title: "New PM Task Assigned",
      description: "Quarterly maintenance for HVAC Unit C4 at Al-Mansoor Tower.",
      timestamp: createDate(1), isRead: false, priority: "medium", jobId: "PM-108", assetName: "HVAC Unit C4",
    },
    {
      id: "notif-3", type: "customer", actionType: "customer_comment",
      title: "Customer Comment Added",
      description: "Al-Mansoor Trading requested arrival before 10:00 AM for Floor 3 access.",
      timestamp: createDate(2), isRead: true, priority: "medium", jobId: "TKT-0003",
    },
    {
      id: "notif-4", type: "vendor", actionType: "vendor_msg",
      title: "Parts Ready for Pickup",
      description: "Your requested R-410A refrigerant is ready at Vendor Depot 2.",
      timestamp: createDate(3), isRead: true, priority: "low", jobId: "TKT-0003"
    },
    {
      id: "notif-5", type: "route", actionType: "route_change",
      title: "Route Advisory",
      description: "High traffic on Sheikh Zayed Rd. Depart 15 min early for on-time arrival.",
      timestamp: createDate(4), isRead: false, priority: "medium", jobId: "TKT-0003"
    },
    {
      id: "notif-6", type: "ai", actionType: "ai_rec",
      title: "AI Recommendation: Safety Check",
      description: "TKT-0003 involves refrigerant handling. Ensure PPE kit is ready before starting.",
      timestamp: createDate(5), isRead: true, priority: "low", jobId: "TKT-0003", assetName: "HVAC Unit C4"
    },
    {
      id: "notif-7", type: "completed", actionType: "report_approved",
      title: "Service Report Approved",
      description: "The customer has digitally signed and approved the report for TKT-0015.",
      timestamp: createDate(2, 1), isRead: true, priority: "low", jobId: "TKT-0015",
    },
    {
      id: "notif-8", type: "urgent", actionType: "cancelled",
      title: "Job Cancelled",
      description: "The customer cancelled TKT-0015. Your route has been automatically updated.",
      timestamp: createDate(6, 1), isRead: true, priority: "high", jobId: "TKT-0015",
    },
    {
      id: "notif-9", type: "assignments", actionType: "amc",
      title: "AMC Site Visit Assigned",
      description: "Emergency AMC inspection required at Downtown Mall. Respond immediately.",
      timestamp: createDate(2, 3), isRead: true, priority: "critical", jobId: "PM-108",
    },
    {
      id: "notif-10", type: "assignments", actionType: "reassigned",
      title: "Job Reassigned",
      description: "PM-114 has been temporarily reassigned back to you.",
      timestamp: createDate(5, 3), isRead: true, priority: "medium", jobId: "PM-114",
    },
    {
      id: "notif-11", type: "assignments", actionType: "new_job",
      title: "New Job Assigned",
      description: "Critical AC failure reported at Tech Park Building 4.",
      timestamp: createDate(1, 2), isRead: true, priority: "critical", jobId: "TKT-0003",
    },
    {
      id: "notif-12", type: "assignments", actionType: "wo_update",
      title: "Work Order Updated",
      description: "Work order parts list has been approved by management.",
      timestamp: createDate(10, 2), isRead: true, priority: "medium", jobId: "TKT-0003",
    },
    {
      id: "notif-13", type: "assignments", actionType: "warranty",
      title: "Warranty Inspection Assigned",
      description: "Inspect Chiller Unit for warranty claim validation.",
      timestamp: createDate(1, 4), isRead: true, priority: "medium", jobId: "PM-108",
    }
  ];
};

export interface TechnicianContextType {
  profile: TechProfile;
  performance: TechPerformanceData;
  
  // Jobs (filtered from VendorContext for TEC-01)
  jobs: VendorTicket[];
  pmTasks: PMTask[];
  workOrders: WorkOrder[];
  
  // Single Source of Truth Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;

  activeJob: VendorTicket | PMTask | null;

  // Actions
  acceptJob: (jobId: string) => void;
  setTravelling: (jobId: string) => void;
  setArrived: (jobId: string) => void;
  checkIn: (jobId: string) => void;
  startJob: (jobId: string) => void;
  completeJob: (jobId: string) => void;
  submitReport: (jobId: string, notes: string) => void;
  
  acceptPM: (pmId: string) => void;
  startPM: (pmId: string) => void;
  togglePMChecklistItem: (pmId: string, itemId: string) => void;
  completePM: (pmId: string) => void;

  toggleWOChecklistItem: (woId: string, itemId: string) => void;
  
  // Notification Actions
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  
  // Settings
  language: string;
  setLanguage: (lang: string) => void;
  notificationPreferences: NotificationPreferences;
  updateNotificationPreference: (key: keyof NotificationPreferences, value: boolean) => void;
}

const TechnicianContext = createContext<TechnicianContextType | undefined>(undefined);

export function TechnicianProvider({ children }: { children: ReactNode }) {
  const vendor = useVendor();

  const [profile, setProfile] = useState<TechProfile>({} as TechProfile);
  const [performance, setPerformance] = useState<TechPerformanceData>({} as TechPerformanceData);
  
  // State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [techNotifications, setTechNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profileData) {
            setProfile({
              id: profileData.id,
              name: `${profileData.first_name} ${profileData.last_name}`,
              email: profileData.email,
              phone: profileData.phone || "",
              avatarUrl: profileData.avatar_url,
              role: "vendor_technician",
              status: "active",
              vendorId: "",
              vendorName: "",
              skills: [],
              certifications: [],
              location: [0, 0],
              joinedDate: profileData.created_at
            });
            setPerformance({
              slaCompliance: 100,
              avgResolutionTime: 0,
              customerRating: 5,
              jobsCompleted: 0,
              firstTimeFixRate: 100
            });
          }
        }
      } catch (err) {
         console.error("Technician fetch error:", err);
      }
    };
    fetchData();
  }, []);
  
  const [language, setLanguage] = useState<string>("English");
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    jobAssignment: true,
    pmTask: true,
    warrantyInspection: true,
    amcVisit: true,
    vendorMessages: true,
    slaAlerts: true,
    aiRecommendations: true,
    sound: true,
    vibration: true,
    email: false,
  });
  // Derived state from shared VendorContext
  const myJobs = useMemo(() => vendor.tickets.filter(t => t.assignedTechnicianId === profile.id || t.assignedTechnicianName === profile.name), [vendor.tickets, profile.id, profile.name]);
  const myPMTasks = useMemo(() => vendor.pmTasks.filter(t => t.assignedTechnicianId === profile.id || t.assignedTechnicianName === profile.name), [vendor.pmTasks, profile.id, profile.name]);
  const myWorkOrders = useMemo(() => vendor.workOrders.filter(w => w.technicianId === profile.id || w.technicianName === profile.name), [vendor.workOrders, profile.id, profile.name]);

  useEffect(() => {
    import("../utils/eventBus").then(({ subscribeToEvent }) => {
      const unsub = subscribeToEvent((event) => {
        if (event.type === 'TICKET_ASSIGNED') {
          const { ticketId, techId, techName } = event.payload;
          if (techId === profile.id || techName === profile.name) {
            setTechNotifications(prev => [{
              id: `notif-${Date.now()}-assgn`,
              type: "assignments",
              actionType: "new_job",
              title: "New Job Assigned",
              description: `You have been assigned to ${ticketId}.`,
              timestamp: new Date().toISOString(),
              isRead: false,
              priority: "high",
              jobId: ticketId
            }, ...prev]);
          }
        } else if (event.type === 'TICKET_STATUS_CHANGED') {
          const { ticketId, status, by } = event.payload;
          if (by !== "Technician" && myJobs.some(j => j.id === ticketId)) {
            setTechNotifications(prev => [{
              id: `notif-${Date.now()}-stat`,
              type: "system",
              actionType: "wo_update",
              title: "Job Updated",
              description: `Job ${ticketId} status updated to ${status}.`,
              timestamp: new Date().toISOString(),
              isRead: false,
              priority: "medium",
              jobId: ticketId
            }, ...prev]);
          }
        } else if (event.type === 'SLA_WARNING') {
          const { ticketId, urgency, timeRemaining } = event.payload;
          if (myJobs.some(j => j.id === ticketId)) {
            setTechNotifications(prev => [{
              id: `notif-${Date.now()}-sla`,
              type: "urgent",
              actionType: "sla_warn",
              title: `SLA Warning: ${ticketId}`,
              description: `Job SLA will breach. ${timeRemaining} remaining.`,
              timestamp: new Date().toISOString(),
              isRead: false,
              priority: "high",
              jobId: ticketId
            }, ...prev]);
          }
        }
      });
      return unsub;
    });
  }, [profile.id, profile.name, myJobs]);

  const activeJob = useMemo(() => {
    const activeTicket = myJobs.find(j => ["In Progress", "Work Order Generated", "Technician Accepted", "Travelling", "Arrived", "Checked In"].includes(j.status));
    if (activeTicket) return activeTicket;
    const activePM = myPMTasks.find(p => ["Maintenance Started", "Checklist In Progress", "Accepted", "Travelling", "Arrived"].includes(p.status));
    if (activePM) return activePM;
    return null;
  }, [myJobs, myPMTasks]);
  
  const unreadNotificationCount = useMemo(() => techNotifications.filter(n => !n.isRead).length, [techNotifications]);

  const advanceJob = (id: string, newStatus: string) => {
    vendor.advanceTicketWorkflow(id, newStatus);
  };

  const acceptJob = (id: string) => advanceJob(id, "Technician Accepted");
  const setTravelling = (id: string) => advanceJob(id, "Travelling");
  const setArrived = (id: string) => advanceJob(id, "Arrived");
  const checkIn = (id: string) => advanceJob(id, "Checked In");
  
  const startJob = (id: string) => {
    if (id.startsWith("PM-")) {
      vendor.advancePMWorkflow(id, "Maintenance Started");
    } else {
      advanceJob(id, "In Progress");
    }
  };
  
  const completeJob = (id: string) => {
    if (id.startsWith("PM-")) {
      vendor.advancePMWorkflow(id, "Completed");
    } else {
      const job = myJobs.find(j => j.id === id);
      if (job) {
        vendor.advanceTicketWorkflow(id, "Completed");
        const wo = myWorkOrders.find(w => w.ticketId === id);
        if (wo) vendor.completeWorkOrder(wo.id, "Completed by Technician");
      }
    }
  };

  const submitReport = (id: string, notes: string) => {
    vendor.addTicketNote(id, `[Service Report] ${notes}`);
    vendor.advanceTicketWorkflow(id, "Report Submitted");
  };

  const acceptPM = (id: string) => vendor.advancePMWorkflow(id, "Accepted");
  const startPM = (id: string) => vendor.advancePMWorkflow(id, "Maintenance Started");
  const togglePMChecklistItem = (pmId: string, itemId: string) => vendor.togglePMChecklistItem(pmId, itemId);
  const completePM = (id: string) => vendor.completePMTask(id);

  const toggleWOChecklistItem = (woId: string, itemId: string) => {
    // In a real app we'd call vendor.toggleWOChecklistItem, here we mock it directly if missing
  };

  const markNotificationRead = (id: string) => {
    setTechNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };
  
  const markAllNotificationsRead = () => {
    setTechNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };
  
  const dismissNotification = (id: string) => {
    setTechNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const updateNotificationPreference = (key: keyof NotificationPreferences, value: boolean) => {
    setNotificationPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <TechnicianContext.Provider value={{
      profile, performance, jobs: myJobs, pmTasks: myPMTasks, workOrders: myWorkOrders, 
      notifications: techNotifications, activeJob, unreadNotificationCount,
      acceptJob, setTravelling, setArrived, checkIn, startJob, completeJob, submitReport,
      acceptPM, startPM, togglePMChecklistItem, completePM,
      toggleWOChecklistItem, 
      markNotificationRead, markAllNotificationsRead, dismissNotification,
      language, setLanguage, notificationPreferences, updateNotificationPreference
    }}>
      {children}
    </TechnicianContext.Provider>
  );
}

export function useTechnician() {
  const context = useContext(TechnicianContext);
  if (!context) throw new Error("useTechnician must be used within a TechnicianProvider");
  return context;
}
