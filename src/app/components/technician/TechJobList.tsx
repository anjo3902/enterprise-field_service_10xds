import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { TechBottomNavigation } from "./TechBottomNavigation";
import { useTechnician } from "../../contexts/TechnicianContext";
import { VendorTicket } from "../../types/legacy";
import { PMTask } from "../../types/legacy";
import { TechAIBriefModal } from "./TechAIBriefModal";
import { TechReassignmentModal } from "./TechReassignmentModal";
import { TechReportModal } from "./TechReportModal";
import { TechRouteMap } from "./TechRouteMap";
import { useSLACountdown, slaCardDisplay } from "../../utils/slaEngine";
import {
  Search, X, ChevronDown, Filter,
  MapPin, Clock, AlertTriangle, CheckCircle2,
  ClipboardList, Bot, Phone, ArrowUpDown,
  Wrench, Settings2, Shield, Signal, Wifi, Battery, Star,
  Eye, Play, CheckSquare, Lock, AlertCircle, Check, ArrowLeft
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue="#2563EB",blueTint="#EFF6FF",blueDark="#1E40AF",
  green="#16A34A",greenT="#DCFCE7",
  red="#DC2626",redT="#FEF2F2",
  amber="#D97706",amberT="#FFFBEB",
  purple="#7C3AED",purpleT="#F5F3FF",purpleBorder="#E9D5FF",
  teal="#0891B2",tealT="#ECFEFF",
  ink="#0F172A",inkSec="#475569",inkMut="#64748B",inkFaint="#94A3B8",
  bg="#F8FAFC",card="#FFFFFF",border="#E2E8F0",divider="#F1F5F9",
  inter="'Inter','Roboto',sans-serif",
  cardShadow="0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

// ─── Helpers ──────────────────────────────────────────────────────────────────
// getSLA is a thin wrapper delegating to the unified slaEngine
// Kept exported for backward compat with TechRouteMap and other consumers
export function getSLA(iso: string, vendorSlaStatus?: string, ticketStatus?: string) {
  const r = slaCardDisplay(iso, vendorSlaStatus, ticketStatus);
  return { text: r.text, color: r.color, bg: r.bg, pct: r.urgent ? 95 : 50, urgent: r.urgent, breached: r.isBreached };
}
export function prioColor(p: string) {
  if (p === "Critical") return { c: red, bg: redT };
  if (p === "High") return { c: amber, bg: amberT };
  if (p === "Medium") return { c: blue, bg: blueTint };
  return { c: inkMut, bg: divider };
}
export function statusColor(s: string) {
  const norm = s.toLowerCase();
  if (["in progress", "maintenance started", "checklist in progress"].includes(norm)) return { c: amber, bg: amberT };
  if (["completed", "closed", "waiting customer confirmation", "report submitted"].includes(norm)) return { c: green, bg: greenT };
  // Default to Assigned state
  return { c: blue, bg: blueTint };
}
function jobTypeColor(type: string) {
  if (type === "service") return { c: blue, bg: blueTint, label: "Service" };
  if (type === "pm") return { c: teal, bg: tealT, label: "PM Task" };
  if (type === "inspection") return { c: purple, bg: purpleT, label: "Inspection" };
  if (type === "amc") return { c: green, bg: greenT, label: "AMC Visit" };
  if (type === "emergency") return { c: red, bg: redT, label: "Emergency" };
  return { c: inkMut, bg: divider, label: type };
}

// ─── Unified job item for display ─────────────────────────────────────────────
export interface JobItem {
  id: string; type: "service" | "pm" | "inspection" | "amc" | "emergency";
  title: string; status: string; priority: string;
  customerName: string; location: string; assetName?: string;
  slaDeadline: string; createdAt: string; category: string;
  estimatedHrs?: number; workOrderId?: string;
  aiRisk?: boolean; notes?: string[];
  faultType?: string; contactPhone?: string; routePosition?: number;
  reassignmentRequested?: boolean;
  locationCoords?: string;
}

export function toJobItem(t: VendorTicket, index: number): JobItem {
  const isEmergency = t.priority === "Critical" && t.aiAnalysis?.safetyFlag;
  const hash = t.id.split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  const locationCoords = `${25.2048 + (hash % 50)*0.001},${55.2708 + ((hash >> 3) % 50)*0.001}`;
  return {
    id: t.id, type: isEmergency ? "emergency" : "service",
    title: t.title, status: t.status, priority: t.priority,
    customerName: t.customerName, location: t.location + (t.floor ? ` · ${t.floor}` : ""),
    assetName: t.assetName, slaDeadline: t.slaDeadline, createdAt: t.createdAt,
    category: t.category, workOrderId: t.workOrderId,
    aiRisk: t.aiAnalysis?.safetyFlag || (t.aiAnalysis?.confidence ?? 1) < 0.7,
    notes: t.notes,
    faultType: t.category || "General Maintenance",
    contactPhone: "+1 (555) 019-2834", // mock contact
    routePosition: index + 1,
    reassignmentRequested: false,
    locationCoords
  };
}
export function pmToJobItem(p: PMTask, index: number): JobItem {
  const hash = p.id.split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  const locationCoords = `${25.2048 + (hash % 50)*0.001},${55.2708 + ((hash >> 3) % 50)*0.001}`;
  return {
    id: p.id, type: "pm", title: p.type, status: p.status, priority: p.priority || "Medium",
    customerName: p.customerName, location: p.location || p.customerName,
    assetName: p.assetName, slaDeadline: p.dueDate ? new Date(p.dueDate + "T23:59:00").toISOString() : new Date(Date.now() + 48 * 3600000).toISOString(),
    createdAt: p.timeline?.[0]?.timestamp || new Date().toISOString(),
    category: p.category, estimatedHrs: p.estimatedHrs, workOrderId: p.workOrderId,
    faultType: p.category || "Routine Check",
    contactPhone: "+1 (555) 019-2834",
    routePosition: index + 1,
    reassignmentRequested: false,
    locationCoords
  };
}

type TabKey = "all" | "assigned" | "active" | "completed" | "pm" | "emergency";
type SortKey = "route" | "sla" | "priority" | "newest" | "oldest" | "duration";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Assigned" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Done" },
  { key: "pm", label: "PM" },
  { key: "emergency", label: "Emergency" },
];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "route", label: "AI Route Order" },
  { key: "sla", label: "Earliest SLA" },
  { key: "priority", label: "Highest Priority" }
];
const PRIORITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

// ─── SLA Badge with live update ───────────────────────────────────────────────
function SLABadge({ deadline }: { deadline: string }) {
  const [sla, setSla] = useState(() => getSLA(deadline));
  useEffect(() => {
    const id = setInterval(() => setSla(getSLA(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px", backgroundColor: sla.bg, padding: "3px 7px", borderRadius: "7px" }}>
      <Clock size={10} color={sla.color} />
      <span style={{ fontSize: "10px", fontWeight: 700, color: sla.color, fontFamily: inter }}>{sla.text}</span>
    </div>
  );
}

// ─── Job Card (Old Field Service Dispatcher style with enhancements) ───────────
export function JobCard({ 
  job, onView, onAI, onReassign, onAction, isActionLoading, isLockedRoute, isTechnicianBusy
}: {
  job: JobItem;
  onView: () => void;
  onAI: () => void;
  onReassign: () => void;
  onAction: (jobId: string, actionName: string, methodName: string) => void;
  isActionLoading: boolean;
  isLockedRoute?: boolean;
  isTechnicianBusy: boolean;
}) {
  const p = prioColor(job.priority);
  const s = statusColor(job.status);
  const sla = getSLA(job.slaDeadline);
  
  // Re-map 8-state complex states back to simple 3-state for the frontend button logic
  const isCompleted = ["Completed", "Closed", "Waiting Customer Confirmation", "Report Submitted"].includes(job.status);
  const isInProgress = ["In Progress", "Maintenance Started", "Checklist In Progress"].includes(job.status);
  
  const borderColor = sla.breached ? red : isLockedRoute ? amber : isCompleted ? `${green}50` : border;
  
  const isReassignmentEligible = !isCompleted && !isInProgress && !job.reassignmentRequested;
  const isReassignmentPending = job.reassignmentRequested;
  const showAIBrief = !isCompleted && !isInProgress;
  
  const startJobDisabled = isActionLoading || isTechnicianBusy;

  return (
    <div style={{
      backgroundColor: card,
      borderRadius: "12px",
      border: isLockedRoute ? `2px solid ${amber}` : `1px solid ${borderColor}`,
      boxShadow: isLockedRoute ? `0 4px 20px ${amber}30` : cardShadow,
      padding: "16px",
      marginBottom: "12px",
      position: "relative",
      opacity: isCompleted ? 0.85 : 1,
    }}>
      {/* Top row: Route Pos, ID, Badges, SLA (Enhancement) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: ink, fontFamily: inter, letterSpacing: "0.02em", marginRight: "2px" }}>
            #{job.routePosition} - {job.id}
          </span>
          {job.aiRisk && (
            <div style={{ padding: "2px 7px", borderRadius: 100, backgroundColor: redT, display: "flex", alignItems: "center", gap: "3px" }}>
              <AlertTriangle size={8} color={red} />
              <span style={{ fontSize: "9px", fontWeight: 700, color: red, fontFamily: inter }}>AI Risk</span>
            </div>
          )}
        </div>
        <SLABadge deadline={job.slaDeadline} />
      </div>

      {/* 2-Column Grid (Old Style Label-Value) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        
        <div>
          <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>Fault Type</span>
          <div style={{ fontSize: "13px", fontWeight: 500, color: ink, fontFamily: inter, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
             {job.faultType}
          </div>
        </div>

        <div>
          <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>Severity</span>
          <div style={{ display: "inline-block", padding: "1px 6px", borderRadius: 100, backgroundColor: p.bg, border: `1px solid ${p.c}30` }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: p.c, fontFamily: inter, textTransform: "uppercase" }}>{job.priority}</span>
          </div>
        </div>

        <div>
          <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>Location</span>
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.location)}`} target="_blank" rel="noreferrer" style={{ fontSize: "13px", fontWeight: 500, color: blue, fontFamily: inter, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
             <MapPin size={11} color={blue} /> {job.location}
          </a>
        </div>

        <div>
          <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>Contact</span>
          {job.contactPhone ? (
             <a href={`tel:${job.contactPhone.replace(/\D/g,'')}`} style={{ fontSize: "13px", fontWeight: 500, color: blue, fontFamily: inter, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                <Phone size={11} color={blue} /> {job.contactPhone}
             </a>
          ) : (
             <span style={{ fontSize: "13px", fontWeight: 500, color: ink, fontFamily: inter }}>-</span>
          )}
        </div>

        <div>
          <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>Status</span>
          {isInProgress ? (
             <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "1px 6px", borderRadius: 100, backgroundColor: amberT, border: `1px solid ${amber}30` }}>
                <Lock size={10} color={amber} />
                <span style={{ fontSize: "10px", fontWeight: 700, color: amber, fontFamily: inter, textTransform: "uppercase" }}>IN PROGRESS</span>
             </div>
          ) : (
             <div style={{ display: "inline-block", padding: "1px 6px", borderRadius: 100, backgroundColor: s.bg, border: `1px solid ${s.c}30` }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: s.c, fontFamily: inter, textTransform: "uppercase" }}>{job.status}</span>
             </div>
          )}
        </div>
        
        <div style={{ gridColumn: "1 / -1" }}>
           <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>Title (Enhancement)</span>
           <p style={{ fontSize: "13px", fontWeight: 500, color: ink, fontFamily: inter, margin: 0 }}>
             {job.title}
           </p>
        </div>
      </div>

      {/* Horizontal Action Button Group (Old Style) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${border}` }}>
         <button type="button" onClick={onView} style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: bg, border: `1px solid ${border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
           <Eye size={13} color={inkSec} />
           <span style={{ fontSize: "12px", fontWeight: 600, color: inkSec, fontFamily: inter }}>View Details</span>
         </button>

         {!isCompleted && !isInProgress && (
           <button 
             type="button" 
             onClick={() => onAction(job.id, "Start Job", "startJob")}
             disabled={startJobDisabled}
             style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: startJobDisabled ? divider : blue, border: "none", cursor: startJobDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: startJobDisabled ? 0.6 : 1 }}
           >
             {isActionLoading ? <div style={{ width: "13px", height: "13px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 1s linear infinite" }} /> : <Play size={13} color={startJobDisabled ? inkMut : "white"} />}
             <span style={{ fontSize: "12px", fontWeight: 600, color: startJobDisabled ? inkMut : "white", fontFamily: inter }}>Start Job</span>
           </button>
         )}

         {!isCompleted && isInProgress && (
           <button 
             type="button" 
             onClick={() => onAction(job.id, "Mark Complete", "completeJob")}
             disabled={isActionLoading}
             style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: green, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: isActionLoading ? 0.6 : 1 }}
           >
             {isActionLoading ? <div style={{ width: "13px", height: "13px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 1s linear infinite" }} /> : <Check size={13} color="white" />}
             <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>Mark as Completed</span>
           </button>
         )}

         {showAIBrief && (
           <button type="button" onClick={onAI} style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: purpleT, border: `1px solid ${purpleBorder}`, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
             <Bot size={13} color={purple} />
             <span style={{ fontSize: "12px", fontWeight: 600, color: purple, fontFamily: inter }}>Prepare Visit (AI)</span>
           </button>
         )}

         {!isReassignmentPending && isReassignmentEligible && (
           <button type="button" onClick={onReassign} disabled={isActionLoading} style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: amber, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
             <AlertCircle size={13} color="white" />
             <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>Request Reassignment</span>
           </button>
         )}

         {isReassignmentPending && (
           <div style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: amberT, border: `1px solid ${amber}40`, display: "flex", alignItems: "center", gap: "6px" }}>
             <AlertCircle size={13} color={amber} />
             <span style={{ fontSize: "12px", fontWeight: 600, color: amber, fontFamily: inter }}>Reassignment Pending</span>
           </div>
         )}

         {!isReassignmentPending && !isReassignmentEligible && isInProgress && (
           <div style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", gap: "6px" }}>
             <AlertCircle size={13} color={inkMut} />
             <span style={{ fontSize: "12px", fontWeight: 600, color: inkMut, fontFamily: inter }}>Work Started</span>
           </div>
         )}
      </div>
    </div>
  );
}

// ─── Compact Completed Card ───────────────────────────────────────────────────
function CompletedMiniCard({ job, onView, onSubmitReport }: { job: JobItem; onView: () => void; onSubmitReport: () => void }) {
  const isReported = job.status === "Report Submitted";
  
  return (
    <div style={{ backgroundColor: card, borderRadius: "10px", border: `1px solid ${border}`, padding: "10px 12px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: ink, fontFamily: inter }}>{job.id}</span>
          <div style={{ padding: "1px 6px", borderRadius: 100, backgroundColor: greenT }}>
            <span style={{ fontSize: "8px", fontWeight: 700, color: green, fontFamily: inter }}>DONE</span>
          </div>
        </div>
        <p style={{ fontSize: "11px", color: inkMut, fontFamily: inter, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {job.faultType} · {job.customerName}
        </p>
      </div>
      
      <div style={{ display: "flex", gap: "6px" }}>
        <button onClick={onView} style={{ padding: "6px 12px", borderRadius: "6px", backgroundColor: bg, border: `1px solid ${border}`, color: inkSec, fontSize: "10px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          <Eye size={10} /> View Details
        </button>
        {!isReported && (
           <button onClick={onSubmitReport} style={{ padding: "6px 12px", borderRadius: "6px", backgroundColor: green, border: "none", color: "white", fontSize: "10px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
             Submit Report
           </button>
        )}
      </div>
    </div>
  );
}

function StatusBar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(id); }, []);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 6px", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.9)", fontFamily: inter }}>
        {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <Signal size={12} color="rgba(255,255,255,0.85)" />
        <Wifi size={12} color="rgba(255,255,255,0.85)" />
        <Battery size={14} color="rgba(255,255,255,0.85)" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TechJobList() {
  const navigate = useNavigate();
  const context = useTechnician();
  const { jobs, pmTasks, activeJob, startJob, completeJob, submitReport } = context;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("route");
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const searchRef = useRef<HTMLInputElement>(null);
  
  // Modals & Actions
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiJobId, setAiJobId] = useState("");
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignJobData, setReassignJobData] = useState({ id: "", loc: "", sev: "" });
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportJobId, setReportJobId] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{title: string, type: 'success'|'error'} | null>(null);

  // Local state to track mocked reassignments since context doesn't have it natively
  const [localReassignedJobs, setLocalReassignedJobs] = useState<string[]>([]);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const showToast = (title: string, type: 'success'|'error' = 'success') => {
    setToastMsg({ title, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const allJobs = useMemo<JobItem[]>(() => {
    const serviceJobs = jobs.map((t, i) => toJobItem(t, i));
    const pmList = pmTasks.map((t, i) => pmToJobItem(t, serviceJobs.length + i));
    return [...serviceJobs, ...pmList].map(j => ({
      ...j,
      reassignmentRequested: localReassignedJobs.includes(j.id)
    }));
  }, [jobs, pmTasks, localReassignedJobs]);

  const isCompletedStatus = (s: string) => ["Completed","Closed","Waiting Customer Confirmation","Report Submitted"].includes(s);
  
  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case "all": return allJobs.filter(j => !isCompletedStatus(j.status));
      case "assigned": return allJobs.filter(j => ["Assigned","Technician Accepted","Work Order Created","Technician Assigned","Accepted","Dispatched"].includes(j.status));
      case "active": return allJobs.filter(j => ["In Progress","Travelling","Arrived","Checked In","Maintenance Started","Checklist In Progress","Inspection"].includes(j.status));
      case "completed": return allJobs.filter(j => isCompletedStatus(j.status));
      case "pm": return allJobs.filter(j => j.type === "pm" && !isCompletedStatus(j.status));
      case "emergency": return allJobs.filter(j => j.type === "emergency" && !isCompletedStatus(j.status));
      default: return allJobs;
    }
  }, [allJobs, activeTab]);

  const completedTodayList = useMemo(() => {
    if (activeTab === "completed") return [];
    return allJobs.filter(j => isCompletedStatus(j.status));
  }, [allJobs, activeTab]);

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabFiltered;
    return tabFiltered.filter(j =>
      j.id.toLowerCase().includes(q) ||
      j.title.toLowerCase().includes(q) ||
      j.customerName.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q)
    );
  }, [tabFiltered, search]);

  const drawerFiltered = useMemo(() => {
    let list = searchFiltered;
    if (filterPriority !== "all") list = list.filter(j => j.priority === filterPriority);
    if (filterStatus !== "all") list = list.filter(j => j.status === filterStatus);
    return list;
  }, [searchFiltered, filterPriority, filterStatus]);

  const sorted = useMemo(() => {
    const list = [...drawerFiltered];
    switch (sortKey) {
      case "route": list.sort((a, b) => (a.routePosition || 0) - (b.routePosition || 0)); break;
      case "sla": list.sort((a, b) => new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime()); break;
      case "priority": list.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4)); break;
    }

    if (activeJob) {
      const activeIdx = list.findIndex(j => j.id === activeJob.id);
      if (activeIdx > -1) {
        const [active] = list.splice(activeIdx, 1);
        list.unshift(active);
      }
    }
    return list;
  }, [drawerFiltered, sortKey, activeJob]);

  const tabCounts = useMemo(() => ({
    all: allJobs.filter(j => !isCompletedStatus(j.status)).length,
    assigned: allJobs.filter(j => ["Assigned","Technician Accepted","Work Order Created","Technician Assigned","Accepted","Dispatched"].includes(j.status)).length,
    active: allJobs.filter(j => ["In Progress","Travelling","Arrived","Checked In","Maintenance Started","Checklist In Progress","Inspection"].includes(j.status)).length,
    completed: allJobs.filter(j => isCompletedStatus(j.status)).length,
    pm: allJobs.filter(j => j.type === "pm" && !isCompletedStatus(j.status)).length,
    emergency: allJobs.filter(j => j.type === "emergency" && !isCompletedStatus(j.status)).length,
  }), [allJobs]);

  const totalPending = tabCounts.assigned + tabCounts.active;

  const handleAction = (jobId: string, actionLabel: string, methodStr: string) => {
    setActionLoadingId(jobId);
    setTimeout(() => {
      try {
        if (methodStr === 'startJob') startJob(jobId);
        else if (methodStr === 'completeJob') completeJob(jobId);
        else if (methodStr === 'submitReport') submitReport(jobId, "Completed check."); 
        showToast(actionLabel + " Successful", "success");
      } catch (err) {
        showToast(actionLabel + " Failed", "error");
      }
      setActionLoadingId(null);
    }, 600);
  };

  // Map route mock data
  const mockTechnicianLocation = useMemo(() => ({ latitude: 25.2048, longitude: 55.2708 }), []); // Dubai center
  const routeOrder = useMemo(() => sorted.map(j => j.id), [sorted]);

  const header = (
    <div style={{ background: `linear-gradient(135deg, ${blueDark} 0%, ${blue} 100%)`, flexShrink: 0 }}>
      <StatusBar />
      <div style={{ padding: "4px 20px 14px" }}>
        <div style={{ marginBottom: "12px", marginTop: "8px" }}>
          <button type="button" onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "12px", color: "white", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            <ArrowLeft size={18} />
            Back
          </button>
        </div>
        <h1 style={{ margin: "0 0 3px", fontSize: "22px", fontWeight: 800, color: "white", fontFamily: inter, letterSpacing: "-0.03em" }}>My Jobs</h1>
        <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.65)", fontFamily: inter }}>
          {totalPending} pending · {tabCounts.completed} completed today
        </p>

        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "12px", padding: "0 12px", gap: "8px", height: "40px", border: "1px solid rgba(255,255,255,0.2)" }}>
          <Search size={15} color="rgba(255,255,255,0.7)" />
          <input
            ref={searchRef}
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs, customers, assets…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "13px", color: "white", fontFamily: inter, fontWeight: 500 }}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
              <X size={14} color="rgba(255,255,255,0.7)" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <MobileLayout backgroundColor={bg} header={header} bottomNav={<TechBottomNavigation />}>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {toastMsg && (
        <div style={{ position: "absolute", top: "20px", left: "20px", right: "20px", zIndex: 9999, animation: "slideInUp 0.3s ease-out forwards" }}>
          <div style={{ backgroundColor: toastMsg.type === 'success' ? '#166534' : '#991B1B', color: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {toastMsg.type === 'success' ? <CheckCircle2 size={18} color="white" /> : <AlertTriangle size={18} color="white" />}
            <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: inter }}>{toastMsg.title}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ backgroundColor: card, borderBottom: `1px solid ${border}`, flexShrink: 0, overflowX: "auto", scrollbarWidth: "none" }}>
        <div style={{ display: "flex", padding: "0 12px", gap: "2px", minWidth: "max-content" }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "11px 10px", background: "none", border: "none", cursor: "pointer", borderBottom: isActive ? `2.5px solid ${blue}` : "2.5px solid transparent", transition: "all 0.15s" }}>
                <span style={{ fontSize: "11.5px", fontWeight: isActive ? 700 : 500, color: isActive ? blue : inkMut, fontFamily: inter }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Route Lock Banner (Old behavior) */}
      {activeJob && (activeTab === "all" || activeTab === "active") && (
        <div style={{ padding: "12px 14px 4px" }}>
          <div style={{ backgroundColor: amberT, borderRadius: "10px", border: `1px solid ${amber}40`, padding: "10px 12px", display: "flex", gap: "10px" }}>
            <Lock size={16} color={amber} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#92400E", fontFamily: inter, margin: "0 0 2px" }}>Route Locked</p>
              <p style={{ fontSize: "11px", color: "#B45309", fontFamily: inter, margin: 0, lineHeight: 1.4 }}>
                Job #{activeJob.id} is currently in progress. Your optimized route is locked.
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "6px 14px 20px" }}>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: inkMut, fontSize: "13px", fontFamily: inter }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sorted.map(job => (
              <JobCard
                key={job.id}
                job={job}
                isLockedRoute={activeJob?.id === job.id}
                isTechnicianBusy={activeJob !== null}
                onView={() => navigate(`/tech/jobs/${job.id}`)}
                onAI={() => { setAiJobId(job.id); setAiModalOpen(true); }}
                onReassign={() => { 
                  setReassignJobData({ id: job.id, loc: job.location, sev: job.priority });
                  setReassignModalOpen(true);
                }}
                onAction={handleAction}
                isActionLoading={actionLoadingId === job.id}
              />
            ))}
            {/* Route Map Section */}
            {sorted.length > 0 && (activeTab === "all" || activeTab === "assigned" || activeTab === "active") && (
              <div style={{ marginTop: "16px" }}>
                <TechRouteMap 
                  technicianLocation={mockTechnicianLocation} 
                  jobs={sorted} 
                  routeOrder={routeOrder} 
                />
              </div>
            )}
          </div>
        )}

        {/* COMPLETED TODAY Section (Old behavior) */}
        {!loading && completedTodayList.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ height: "1px", flex: 1, backgroundColor: border }} />
              <span style={{ fontSize: "10px", fontWeight: 700, color: inkMut, fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Completed Today ({completedTodayList.length})
              </span>
              <div style={{ height: "1px", flex: 1, backgroundColor: border }} />
            </div>
            
            {completedTodayList.map(job => (
              <CompletedMiniCard 
                key={job.id}
                job={job}
                onView={() => navigate(`/tech/jobs/${job.id}`)}
                onSubmitReport={() => {
                  setReportJobId(job.id);
                  setReportModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <TechAIBriefModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} jobId={aiJobId} />
      <TechReassignmentModal isOpen={reassignModalOpen} onClose={() => setReassignModalOpen(false)} jobId={reassignJobData.id} jobLocation={reassignJobData.loc} jobSeverity={reassignJobData.sev} onSubmit={() => {
        setLocalReassignedJobs(prev => [...prev, reassignJobData.id]);
        showToast("Reassignment Requested", "success");
      }} />
      <TechReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} jobId={reportJobId} onSubmit={(data) => {
        handleAction(reportJobId, "Submit Report", "submitReport");
      }} />
    </MobileLayout>
  );
}

