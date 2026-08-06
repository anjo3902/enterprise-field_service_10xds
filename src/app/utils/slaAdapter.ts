// ─── SLA Adapter Utility ──────────────────────────────────────────────────────
// Bridges the VendorContext (single source of truth) to the UI display
// formats expected by Organization-facing screens.
//
// SLA CALCULATION is now fully delegated to slaEngine.ts — the single engine
// used by ALL dashboards (Organization, Vendor, Technician).
// ─────────────────────────────────────────────────────────────────────────────

import type { VendorTicket } from "../types/legacy";

import { computeSLADisplay, useSLACountdown, slaCardDisplay, slaEngine, SLA_COLORS } from "./slaEngine";
import type { SLAUrgency, SLAResult } from "./slaEngine";

// Re-export engine primitives so existing imports keep working
export { computeSLADisplay, useSLACountdown, slaCardDisplay, slaEngine, SLA_COLORS };
export type { SLAUrgency, SLAResult };

// ─── SLAItem: shape consumed by SLATrackerScreen ─────────────────────────────
// SLAUrgency is now imported from slaEngine (re-exported above)
export type OrgSLAStatus =
  | "Near Breach"
  | "Immediate Attention Required"
  | "On Track"
  | "Needs Supervisor Review"
  | "Breached"
  | "Escalated";

export interface SLAItem {
  id: string;
  issue: string;
  customer: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  assignee: string;
  remaining: string;
  urgency: SLAUrgency;
  status: OrgSLAStatus;
  progress: number;
  // Raw fields needed for live ticking countdowns
  slaDeadline: string;
  vendorSlaStatus?: string;
  rawStatus: string;
}

// computeSLADisplay is now re-exported from slaEngine — see top of this file

// ─── Derive OrgSLAStatus from VendorTicket ────────────────────────────────────
export function deriveOrgSLAStatus(ticket: VendorTicket): OrgSLAStatus {
  if (ticket.status === "Escalated") return "Escalated";
  if (ticket.slaStatus === "breached") return "Breached";
  if (!ticket.assignedTechnicianId) return "Needs Supervisor Review";

  const msRemaining = new Date(ticket.slaDeadline).getTime() - Date.now();
  if (msRemaining <= 0) return "Breached";

  const minsRemaining = msRemaining / 60000;
  if (minsRemaining < 15) return "Immediate Attention Required";
  if (ticket.slaStatus === "at_risk") return "Near Breach";

  return "On Track";
}

// ─── Main adapter: VendorTicket → SLAItem ─────────────────────────────────────
export function adaptVendorTicketToSLAItem(ticket: VendorTicket): SLAItem {
  const { remaining, urgency, progress } = computeSLADisplay(ticket.slaDeadline);
  const status = deriveOrgSLAStatus(ticket);

  return {
    id: ticket.id,
    issue: ticket.title,
    customer: ticket.customerName,
    priority: ticket.priority,
    assignee: ticket.assignedTechnicianName ?? "Unassigned",
    remaining,
    urgency,
    status,
    progress,
    slaDeadline: ticket.slaDeadline,
    vendorSlaStatus: ticket.slaStatus,
    rawStatus: ticket.status,
  };
}

// ─── Org ticket status mapping ────────────────────────────────────────────────
export type OrgTicketStatus = "Open" | "In Progress" | "Pending" | "Resolved" | "Closed";

export function mapVendorStatusToOrg(vendorStatus: string): OrgTicketStatus {
  switch (vendorStatus) {
    case "Pending Review":
    case "Approved":
      return "Open";
    case "Assigned":
    case "Technician Accepted":
    case "Travelling":
    case "Arrived":
    case "Checked In":
    case "On Site":
    case "In Progress":
    case "Work Order Generated":
    case "Escalated":
    case "Reassigned":
      return "In Progress";
    case "Completed":
      return "Resolved";
    case "Closed":
    case "Rejected":
      return "Closed";
    default:
      return "Pending";
  }
}

// ─── SLA urgency from org ticket status ──────────────────────────────────────
export function mapVendorSLAUrgency(ticket: VendorTicket): SLAUrgency {
  if (ticket.slaStatus === "breached") return "breached";
  const { urgency } = computeSLADisplay(ticket.slaDeadline);
  return urgency;
}

// ─── Format ISO timestamp for display ────────────────────────────────────────
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;
  const diffD = diffMs / 86400000;

  if (diffD < 1) {
    if (diffH < 1) {
      const mins = Math.floor(diffMs / 60000);
      return `${mins} min${mins !== 1 ? "s" : ""} ago`;
    }
    const h = Math.floor(diffH);
    return `Today, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffD < 2) {
    return `Yesterday, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Build a synthetic timeline from VendorTicket status ─────────────────────
export interface OrgTimelineEvent {
  id: string;
  status: string;
  time: string;
  desc: string;
  iconName: string;
  color: string;
  tint: string;
  state: "done" | "current" | "pending";
}

const STATUS_SEQUENCE = [
  "Pending Review",
  "Approved",
  "Assigned",
  "Technician Accepted",
  "In Progress",
  "Work Order Generated",
  "Completed",
  "Closed",
];

export function buildTimelineFromTicket(ticket: VendorTicket): OrgTimelineEvent[] {
  const green = "#16A34A"; const greenT = "#DCFCE7";
  const blue = "#2563EB"; const blueTint = "#EFF6FF";
  const orange = "#EA580C"; const orangeT = "#FFF7ED";
  const purple = "#7C3AED"; const purpleT = "#F5F3FF";
  const amber = "#D97706"; const amberT = "#FFFBEB";
  const inkMut = "#64748B"; const divider = "#F1F5F9";

  const currentIdx = STATUS_SEQUENCE.indexOf(ticket.status);
  const isEscalated = ticket.status === "Escalated";

  const steps: Array<{
    status: string; desc: string; iconName: string; color: string; tint: string;
  }> = [
    { status: "Ticket Raised", desc: "Service request submitted by your team.", iconName: "FileText", color: green, tint: greenT },
    { status: "Vendor Review", desc: `${ticket.status === "Rejected" ? "Ticket was reviewed and rejected." : "Vendor reviewed and approved the service request."}`, iconName: "Search", color: blue, tint: blueTint },
    { status: "Technician Assigned", desc: ticket.assignedTechnicianName ? `${ticket.assignedTechnicianName} assigned to this job.` : "Awaiting technician assignment.", iconName: "UserPlus", color: purple, tint: purpleT },
    { status: "En Route", desc: "Technician accepted the job and is travelling to site.", iconName: "Navigation", color: orange, tint: orangeT },
    { status: "On Site", desc: "Technician arrived at the location and checked in.", iconName: "MapPin", color: amber, tint: amberT },
    { status: "Work In Progress", desc: "Technician is actively working on the issue.", iconName: "Wrench", color: blue, tint: blueTint },
    { status: "Completed", desc: "Work completed. Awaiting your confirmation.", iconName: "CheckCircle", color: green, tint: greenT },
  ];

  if (isEscalated) {
    steps.splice(2, 0, { status: "Escalated", desc: "Ticket escalated for priority handling.", iconName: "AlertTriangle", color: "#DC2626", tint: "#FEF2F2" });
  }

  // Determine how far through we are
  let completedUpTo = -1;
  if (ticket.status === "Pending Review") completedUpTo = 0;
  else if (ticket.status === "Approved") completedUpTo = 1;
  else if (ticket.status === "Assigned") completedUpTo = 2;
  else if (ticket.status === "Technician Accepted" || ticket.status === "Travelling") completedUpTo = 3;
  else if (ticket.status === "Arrived" || ticket.status === "Checked In" || ticket.status === "On Site") completedUpTo = 4;
  else if (ticket.status === "In Progress" || ticket.status === "Work Order Generated") completedUpTo = 5;
  else if (ticket.status === "Completed" || ticket.status === "Report Submitted" || ticket.status === "Closed") completedUpTo = 6;

  return steps.map((step, idx) => {
    const state: "done" | "current" | "pending" =
      idx < completedUpTo ? "done" :
      idx === completedUpTo ? "current" :
      "pending";

    const timeLabel = idx === 0
      ? formatTimestamp(ticket.createdAt)
      : idx <= completedUpTo
        ? formatTimestamp(ticket.updatedAt)
        : "Pending";

    return {
      id: `EVT-${ticket.id}-${idx}`,
      status: step.status,
      time: timeLabel,
      desc: step.desc,
      iconName: step.iconName,
      color: state === "pending" ? inkMut : step.color,
      tint: state === "pending" ? divider : step.tint,
      state,
    };
  });
}

