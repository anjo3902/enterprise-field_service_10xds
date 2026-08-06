import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { subscribeToEvent, AppEvent } from "../utils/eventBus";
import { useVendor } from "./VendorContext";
import { useAnalyticsContext } from "./AnalyticsContext";
import { useRevenueContext } from "./RevenueContext";
import { supabase } from "../lib/supabase";
import {
  AdminOrganization, AdminVendor, AdminUser, AdminSLAPolicy, AdminAuditLog,
  AdminAIModel, AdminAIInsight, AdminSecurityAlert, AdminActiveSession,
  AdminFailedLogin, AdminPlatformLicense, AdminNotification, AdminIntegration
} from "../types/legacy";

export interface AdminContextType {
  // Owned Data
  organizations: AdminOrganization[];
  vendors: AdminVendor[];
  users: AdminUser[];
  slaPolicies: AdminSLAPolicy[];
  auditLog: AdminAuditLog[];
  aiModels: AdminAIModel[];
  aiInsights: AdminAIInsight[];
  securityAlerts: AdminSecurityAlert[];
  activeSessions: AdminActiveSession[];
  failedLogins: AdminFailedLogin[];
  license: AdminPlatformLicense;
  integrations: AdminIntegration[];
  adminNotifications: AdminNotification[];
  platformAlerts: AdminNotification[];

  // Data from other contexts (Read-only exposure)
  platformKpis: {
    totalTickets: number;
    slaCompliance: number;
    avgResponseHrs: number;
    revenueOppValue: number;
  };

  licenseUpgradeRequested: boolean;
  licenseUpgradeRequestTime: string | null;
  requestLicenseUpgrade: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  // Internal state for admin-owned collections
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<AdminSLAPolicy[]>([]);
  const [auditLog, setAuditLog] = useState<AdminAuditLog[]>([]);
  const [aiModels, setAiModels] = useState<AdminAIModel[]>([]);
  const [aiInsights, setAiInsights] = useState<AdminAIInsight[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<AdminSecurityAlert[]>([]);
  const [activeSessions, setActiveSessions] = useState<AdminActiveSession[]>([]);
  const [failedLogins, setFailedLogins] = useState<AdminFailedLogin[]>([]);
  const [license, setLicense] = useState<AdminPlatformLicense>({ id: "LIC-1", plan: "Enterprise", status: "Active", renewalDate: "2027-01-01", maxUsers: 1000, currentUsers: 0, features: [] });
  const [integrations, setIntegrations] = useState<AdminIntegration[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [licenseUpgradeRequested, setLicenseUpgradeRequested] = useState<boolean>(false);
  const [licenseUpgradeRequestTime, setLicenseUpgradeRequestTime] = useState<string | null>(null);

  // Fetch real data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch orgs
        const { data: orgData } = await supabase.from('organizations').select('*');
        if (orgData) {
          setOrganizations(orgData.map(o => ({
            id: o.id,
            name: o.name,
            status: o.status === 'active' ? 'Active' : o.status === 'suspended' ? 'Suspended' : 'Pending Setup',
            plan: 'Enterprise',
            adminName: 'Admin',
            adminEmail: 'admin@' + o.domain,
            adminPhone: '',
            region: 'Global',
            city: '',
            country: '',
            createdAt: o.created_at,
            licenseSeats: { users: 100, vendors: 50, technicians: 500 },
            assignedVendorIds: [],
            ticketCount: 0,
            assetCount: 0,
            slaRate: 100,
            lastActivity: o.created_at,
            subscriptionRenewal: '2027-01-01'
          })));
        }

        // Fetch vendors
        const { data: vendorData } = await supabase.from('vendors').select('*');
        if (vendorData) {
          setVendors(vendorData.map(v => ({
            id: v.id,
            name: v.name,
            status: v.status === 'active' ? 'Active' : 'Pending Approval',
            managerId: '',
            managerName: 'Manager',
            managerEmail: v.email,
            managerPhone: v.phone || '',
            serviceTypes: [],
            serviceRegions: [],
            technicianCount: 0,
            assignedOrgIds: [],
            contractId: '',
            slaTarget: 95,
            slaCompliance: 100,
            starRating: 5,
            certifications: [],
            revenue: 0,
            createdAt: v.created_at
          })));
        }
      } catch (err) {
        console.error("Failed to load admin context data", err);
      }
    };
    fetchData();
  }, []);

  const requestLicenseUpgrade = async () => {
    // Mock API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLicenseUpgradeRequested(true);
    setLicenseUpgradeRequestTime(new Date().toISOString());
    
    // Create an audit log entry
    const newAuditLog: AdminAuditLog = {
      id: `AUD-${Date.now()}`,
      actionCategory: "operational",
      actionDescription: "License upgrade request submitted to Account Manager",
      entityType: "platform",
      entityId: "License",
      actorId: "USR-001",
      actorName: "System Admin",
      actorRole: "system_admin",
      timestamp: new Date().toISOString(),
      ipAddress: "192.168.1.1",
      device: "Desktop",
      sessionId: "SES-123",
      severity: "info"
    };
    setAuditLog(prev => [newAuditLog, ...prev]);
  };

  // Consume existing contexts
  const vendorContext = useVendor();
  const analyticsContext = useAnalyticsContext();
  const revenueContext = useRevenueContext();

  // Derived metrics from other contexts
  const platformKpis = useMemo(() => {
    return {
      totalTickets: vendorContext.tickets.length,
      slaCompliance: vendorContext.kpis.slaCompliance,
      avgResponseHrs: analyticsContext.data.kpi.avgResponse,
      revenueOppValue: revenueContext.liveTotal
    };
  }, [vendorContext.tickets.length, vendorContext.kpis.slaCompliance, analyticsContext.data.kpi.avgResponse, revenueContext.liveTotal]);

  // Derived alerts
  const platformAlerts = useMemo(() => {
    return adminNotifications.filter(n => n.isAlert && !n.isRead).slice(0, 3);
  }, [adminNotifications]);

  useEffect(() => {
    const unsub = subscribeToEvent((event: AppEvent) => {
      // 1. We process all events. Some are alerts (go to notifications and audit), 
      // others are just operational (go to audit only, maybe notifications if important).
      
      let title = "";
      let description = "";
      let category: "Security" | "Platform" | "Tenants" | "AI" = "Platform";
      let severity: "info" | "warning" | "critical" = "info";
      let isAlert = false;
      let navTarget = "";
      let skipNotification = false; // flag to only put in audit log

      // --- Admin Specific Events ---
      if (event.type === 'ADMIN_VENDOR_SUSPENDED') {
        title = "Vendor Suspended";
        description = `Vendor '${event.payload.vendorName}' has been suspended.`;
        category = "Tenants"; severity = "critical"; isAlert = true;
        navTarget = `/admin/vendors/${event.payload.vendorId}`;
        
        setVendors(prev => prev.map(v => v.id === event.payload.vendorId ? { ...v, status: 'Suspended' } : v));
        setUsers(prev => prev.map(u => (u.assignedEntityType === 'vendor' && u.assignedEntityId === event.payload.vendorId) ? { ...u, status: 'Locked' } : u));
      } else if (event.type === 'ADMIN_ORG_SUSPENDED') {
        title = "Organization Suspended";
        description = `Organization '${event.payload.orgName}' suspended.`;
        category = "Tenants"; severity = "critical"; isAlert = true;
        navTarget = `/admin/organizations/${event.payload.orgId}`;
        
        // Cascading suspension
        const affectedVendorIds = vendors.filter(v => v.assignedOrgIds.includes(event.payload.orgId)).map(v => v.id);
        
        setOrganizations(prev => prev.map(o => o.id === event.payload.orgId ? { ...o, status: 'Suspended' } : o));
        setVendors(prev => prev.map(v => affectedVendorIds.includes(v.id) ? { ...v, status: 'Suspended' } : v));
        setUsers(prev => prev.map(u => {
           if (u.assignedEntityType === 'org' && u.assignedEntityId === event.payload.orgId) return { ...u, status: 'Locked' };
           if (u.assignedEntityType === 'vendor' && affectedVendorIds.includes(u.assignedEntityId)) return { ...u, status: 'Locked' };
           return u;
        }));
      } else if (event.type === 'SLA_WARNING') {
        title = "SLA Warning";
        description = `SLA warning — Ticket ${event.payload.ticketId}`;
        category = "Platform"; severity = "critical"; isAlert = true;
        navTarget = `/admin/audit`; 
      } else if (event.type === 'ADMIN_SECURITY_ALERT') {
        title = "Security Alert";
        description = event.payload.description;
        category = "Security"; severity = event.payload.severity; isAlert = true;
        navTarget = `/admin/security`;
      } else if (event.type === 'ADMIN_LICENSE_THRESHOLD') {
        title = "License Threshold";
        description = `${event.payload.resource} at ${event.payload.pct}% limit.`;
        category = "Platform"; severity = event.payload.pct > 95 ? "critical" : "warning"; isAlert = true;
        navTarget = `/admin/license`;
      } else if (event.type === 'ADMIN_AI_CONFIG_CHANGED') {
        title = "AI Config Updated";
        description = `AI '${event.payload.modelName}' config updated — ${event.payload.param}`;
        category = "AI"; severity = "info"; isAlert = true;
        navTarget = `/admin/ai-config/${event.payload.modelId}`;
      } else if (event.type === 'ADMIN_VENDOR_APPROVED') {
        title = "Vendor Approved";
        description = `Vendor '${event.payload.vendorName}' approved and activated.`;
        category = "Tenants"; severity = "info"; isAlert = true;
        navTarget = `/admin/vendors/${event.payload.vendorId}`;
      } else if (event.type === 'ADMIN_ORG_CREATED') {
        title = "Organization Created";
        description = `New org '${event.payload.orgName}' onboarded.`;
        category = "Tenants"; severity = "info"; isAlert = true;
        navTarget = `/admin/organizations/${event.payload.orgId}`;
      } 
      // --- Cross-Context Operational Events ---
      else if (event.type === 'TICKET_CREATED') {
        title = "Ticket Created";
        description = `Ticket ${event.payload.id} created: ${event.payload.title}`;
        category = "Platform"; severity = "info";
        skipNotification = true; // Just audit
      } else if (event.type === 'TICKET_ASSIGNED') {
        title = "Ticket Assigned";
        description = `Ticket ${event.payload.ticketId} assigned to ${event.payload.techName}`;
        category = "Platform"; severity = "info";
        skipNotification = true;
      } else if (event.type === 'TICKET_STATUS_CHANGED') {
        title = "Ticket Status Updated";
        description = `Ticket ${event.payload.ticketId} status changed to ${event.payload.status}`;
        category = "Platform"; severity = "info";
        skipNotification = true;
      } else if (event.type === 'WORK_ORDER_COMPLETED') {
        title = "Work Order Completed";
        description = `Ticket ${event.payload.ticketId} resolved`;
        category = "Platform"; severity = "info";
        skipNotification = true;
      } else if (event.type === 'AMC_RENEWAL_REQUESTED') {
        title = "AMC Renewal Requested";
        description = `Renewal requested for ${event.payload.assetName}`;
        category = "Tenants"; severity = "info";
        skipNotification = true;
      } else if (event.type === 'REPEATED_BREAKDOWN_DETECTED') {
        title = "Repeated Breakdown";
        description = `Multiple failures detected for ${event.payload.assetName}`;
        category = "Platform"; severity = "warning"; isAlert = true;
      } else {
        // Fallback for other events
        title = event.type.replace(/_/g, ' ');
        description = "A platform event occurred.";
        skipNotification = true; // Do not spam notifications with unknown events
      }

      if (!skipNotification) {
        const newNotif: AdminNotification = {
          id: `NOTIF-${Date.now()}`,
          eventType: event.type,
          title,
          description,
          category,
          severity,
          isAlert,
          isRead: false,
          timestamp: new Date().toISOString(),
          navigationTarget: navTarget
        };
        setAdminNotifications(prev => [newNotif, ...prev]);
      }

      // 3. Map to Audit Log
      const newAudit: AdminAuditLog = {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorId: "SYSTEM",
        actorName: "System",
        actorRole: "system",
        actionCategory: "operational",
        actionDescription: description,
        entityType: "platform",
        entityId: "SYS",
        ipAddress: "127.0.0.1",
        device: "System",
        sessionId: "SYS",
        severity: severity
      };

      setAuditLog(prev => [newAudit, ...prev]);
    });
    return unsub;
  }, []);

  return (
    <AdminContext.Provider value={{
      organizations, vendors, users, slaPolicies, auditLog,
      aiModels, aiInsights, securityAlerts, activeSessions,
      failedLogins, license, integrations, adminNotifications, platformAlerts,
      platformKpis,
      licenseUpgradeRequested, licenseUpgradeRequestTime, requestLicenseUpgrade
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdminContext must be used within an AdminProvider");
  return context;
}
