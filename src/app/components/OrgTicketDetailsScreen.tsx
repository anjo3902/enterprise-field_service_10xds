import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { MobileLayout } from "./ui/MobileLayout";
import {
  ArrowLeft, Shield, Clock, User, CheckCircle2, AlertTriangle, MapPin,
  FileText, Star, ThumbsUp, ThumbsDown, Download, Award, MessageSquare,
  ClipboardCheck, XCircle, ChevronRight, Package, TrendingUp, Wrench,
  Building2, BadgeCheck, Sparkles, Zap, Search, Calendar,
  Phone, Mail, Bell, Activity, History, Send, Paperclip,
  Navigation, LogIn, Car, UserCheck, PlusCircle, CheckCircle,
  BarChart2, Info, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { useVendor } from "../contexts/VendorContext";
import { useSLACountdown, buildTimelineFromTicket } from "../utils/slaAdapter";
import { subscribeToEvent } from "../utils/eventBus";

// ─── Design tokens ────────────────────────────────────────────────────────────
const bg         = "#F8FAFC";
const card       = "#FFFFFF";
const border     = "#E2E8F0";
const ink        = "#0F172A";
const inkSec     = "#475569";
const inkMut     = "#64748B";
const inkFaint   = "#94A3B8";
const blue       = "#2563EB";
const blueMid    = "#3B82F6";
const blueTint   = "#EFF6FF";
const blueDark   = "#1D4ED8";
const green      = "#16A34A";
const greenT     = "#DCFCE7";
const amber      = "#D97706";
const amberT     = "#FFFBEB";
const red        = "#DC2626";
const redT       = "#FEF2F2";
const purple     = "#7C3AED";
const purpleT    = "#F5F3FF";
const teal       = "#0891B2";
const tealT      = "#ECFEFF";
const divider    = "#F1F5F9";
const inter      = "'Inter','Roboto',sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)";
const blueShadow = "0 4px 20px rgba(37,99,235,0.22),0 1px 4px rgba(0,0,0,0.08)";
const greenShadow= "0 4px 20px rgba(22,163,74,0.25),0 1px 4px rgba(0,0,0,0.08)";

// ─── Customer Workflow State ──────────────────────────────────────────────────
type CustomerWorkflowStatus =
  | "awaiting_completion"
  | "pending_review"
  | "accepted"
  | "rejected"
  | "closed";

type ModalType =
  | "accept_confirm"
  | "reject_confirm"
  | "rate_technician"
  | "rate_vendor"
  | "feedback"
  | "escalate"
  | "contact_vendor"
  | "complaint"
  | "download_menu"
  | "completion_cert"
  | "preview_image"
  | null;

type Tab = "overview" | "timeline" | "service" | "sla";

const URGENCY_COLOR: Record<string, string> = {
  critical: red, warning: amber, ok: green, breached: red,
};
const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  Critical: { bg: redT,    text: red    },
  High:     { bg: amberT,  text: amber  },
  Medium:   { bg: blueTint,text: blue   },
  Low:      { bg: greenT,  text: green  },
};
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  "Pending Review":       { bg: amberT,  text: amber  },
  "Approved":             { bg: blueTint,text: blue   },
  "Assigned":             { bg: blueTint,text: blue   },
  "Technician Accepted":  { bg: blueTint,text: blue   },
  "Travelling":           { bg: amberT,  text: amber  },
  "Arrived":              { bg: blueTint,text: blue   },
  "Checked In":           { bg: blueTint,text: blue   },
  "On Site":              { bg: blueTint,text: blue   },
  "In Progress":          { bg: blueTint,text: blue   },
  "Work Order Generated": { bg: purpleT, text: purple },
  "Completed":            { bg: greenT,  text: green  },
  "Report Submitted":     { bg: purpleT, text: purple },
  "Closed":               { bg: greenT,  text: green  },
  "Rejected":             { bg: redT,    text: red    },
  "Escalated":            { bg: redT,    text: red    },
  "Reassigned":           { bg: amberT,  text: amber  },
};

// ─── Reusable micro-components ────────────────────────────────────────────────

function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3, 5, 7, 9].map((h, i) => <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white" }} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <div style={{ width: "22px", height: "11px", borderRadius: "2px", border: "1.5px solid white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, right: "3px", backgroundColor: "white", borderRadius: "1px" }} />
          </div>
          <div style={{ width: "2px", height: "5px", borderRadius: "1px", backgroundColor: "white" }} />
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, type = "success" }: { msg: string; type?: "success" | "error" | "info" }) {
  const colors = { success: green, error: red, info: blue };
  const shadows = { success: greenShadow, error: "0 4px 20px rgba(220,38,38,0.25)", info: blueShadow };
  return (
    <div style={{ position: "absolute", bottom: "110px", left: "20px", right: "20px", backgroundColor: colors[type], color: "white", padding: "14px 20px", borderRadius: "14px", fontSize: "13.5px", fontWeight: 700, fontFamily: inter, boxShadow: shadows[type], zIndex: 2000, display: "flex", alignItems: "center", gap: "10px" }}>
      {type === "success" && <CheckCircle2 size={18} />}
      {type === "error" && <XCircle size={18} />}
      {type === "info" && <Info size={18} />}
      {msg}
    </div>
  );
}

function Pill({ label, color, bg: bgColor }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ display: "inline-block", fontSize: "11.5px", fontWeight: 700, color, backgroundColor: bgColor, borderRadius: "100px", padding: "3px 10px", fontFamily: inter }}>
      {label}
    </span>
  );
}

function SectionCard({ title, icon, children, iconColor = blue, accent }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; iconColor?: string; accent?: string;
}) {
  return (
    <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${accent ?? border}`, padding: "20px", marginBottom: "16px", boxShadow: cardShadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        {icon}
        <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: 0, fontFamily: inter }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
      <span style={{ fontSize: "12px", color: inkMut, fontFamily: inter, flexShrink: 0, marginRight: "8px" }}>{label}</span>
      <span style={{ fontSize: "12.5px", fontWeight: 600, color: valueColor ?? ink, fontFamily: inter, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: "1px", backgroundColor: divider, margin: "4px 0 12px" }} />;
}

function Avatar({ initials, gradient, size = 44 }: { initials: string; gradient: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "12px", background: gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.36, fontWeight: 800, color: "white", fontFamily: inter }}>{initials}</span>
    </div>
  );
}

function StarRating({ value, onChange, size = 28 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
          <Star size={size} color={s <= (hovered || value) ? amber : "#CBD5E1"} fill={s <= (hovered || value) ? amber : "none"} style={{ transition: "color 0.12s" }} />
        </button>
      ))}
    </div>
  );
}

function mockDownload(filename: string) {
  const content = `10xDS Enterprise Service Management\n${filename}\nGenerated: ${new Date().toLocaleString()}\nThis is a mock report for demonstration purposes.`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.65)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "8px 24px 40px", maxHeight: "85%", display: "flex", flexDirection: "column", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: "40px", height: "4px", borderRadius: "2px", backgroundColor: "#CBD5E1", margin: "12px auto 20px" }} />
        {children}
      </div>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Overview"  },
  { id: "timeline",  label: "Timeline"  },
  { id: "service",   label: "Service"   },
  { id: "sla",       label: "SLA"       },
];

function TabBar({ active, onSelect }: { active: Tab; onSelect: (t: Tab) => void }) {
  return (
    <div style={{ display: "flex", gap: "6px", padding: "10px 16px", backgroundColor: card, borderBottom: `1px solid ${border}`, overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
      {TABS.map(t => {
        const isActive = t.id === active;
        return (
          <button key={t.id} type="button" onClick={() => onSelect(t.id)} style={{ padding: "7px 16px", borderRadius: "100px", border: "none", backgroundColor: isActive ? blue : "transparent", color: isActive ? "white" : inkMut, fontSize: "12.5px", fontWeight: isActive ? 700 : 500, fontFamily: inter, cursor: "pointer", flexShrink: 0, transition: "background 0.15s" }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Enterprise Timeline Step ─────────────────────────────────────────────────
const ENTERPRISE_STEPS = [
  { key: "created",    label: "Ticket Created",         icon: PlusCircle,   color: green,  tint: greenT  },
  { key: "approved",   label: "Vendor Accepted",         icon: Building2,    color: blue,   tint: blueTint},
  { key: "assigned",   label: "Technician Assigned",     icon: UserCheck,    color: purple, tint: purpleT },
  { key: "travelling", label: "Travelling to Site",      icon: Car,          color: amber,  tint: amberT  },
  { key: "arrived",    label: "Arrived at Site",         icon: MapPin,       color: blue,   tint: blueTint},
  { key: "checkin",    label: "Checked In",              icon: LogIn,        color: blue,   tint: blueTint},
  { key: "working",    label: "Work in Progress",        icon: Wrench,       color: purple, tint: purpleT },
  { key: "completed",  label: "Work Completed",          icon: CheckCircle2, color: green,  tint: greenT  },
  { key: "report",     label: "Report Submitted",        icon: FileText,     color: purple, tint: purpleT },
  { key: "accepted",   label: "Customer Accepted",       icon: ThumbsUp,     color: green,  tint: greenT  },
  { key: "closed",     label: "Ticket Closed",           icon: BadgeCheck,   color: green,  tint: greenT  },
];

function getStepState(stepKey: string, status: string): "done" | "current" | "pending" {
  const doneMap: Record<string, number> = {
    "Pending Review": 0, "Approved": 1, "Assigned": 2,
    "Technician Accepted": 2, "Travelling": 3, "Arrived": 4, "Checked In": 5,
    "On Site": 5, "In Progress": 6, "Work Order Generated": 6,
    "Completed": 7, "Report Submitted": 8, "Closed": 10, "Escalated": 6,
  };
  const stepIdx: Record<string, number> = {
    created: 0, approved: 1, assigned: 2, travelling: 3, arrived: 4,
    checkin: 5, working: 6, completed: 7, report: 8, accepted: 9, closed: 10,
  };
  const done = doneMap[status] ?? -1;
  const me = stepIdx[stepKey] ?? 99;
  if (me < done) return "done";
  if (me === done) return "current";
  return "pending";
}

// ─── Mini SLA Bar Chart ───────────────────────────────────────────────────────
function SLAMiniChart({ data }: { data: { month: string; compliance: number }[] }) {
  const max = 100;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "70px", position: "relative" }}>
      {/* Target line at 90% */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: `${(90 / max) * 70}px`, borderTop: `1.5px dashed ${amber}`, zIndex: 1 }} />
      {data.map(d => {
        const h = (d.compliance / max) * 70;
        const color = d.compliance >= 90 ? green : red;
        return (
          <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "100%", height: `${h}px`, backgroundColor: color, borderRadius: "4px 4px 0 0", opacity: 0.85, minHeight: "4px", transition: "height 0.5s" }} />
            <span style={{ fontSize: "9.5px", color: inkMut, fontFamily: inter }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function OrgTicketDetailsScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const ticketId = id ?? "";

  const vendorCtx = useVendor();
  const { getTicketById, technicians, assets, getAssetById, vendor, pmTasks, amcRenewals, warrantyRenewals, slaHistory, escalateTicket, advanceTicketWorkflow } = vendorCtx;

  const ticket = getTicketById(ticketId);
  const tech = ticket?.assignedTechnicianId ? technicians.find(t => t.id === ticket.assignedTechnicianId) ?? null : null;
  const asset = ticket?.assetId ? getAssetById(ticket.assetId) ?? null : null;

  // Related records for this asset
  const relatedPM  = pmTasks.filter(p => p.assetId === ticket?.assetId).slice(0, 3);
  const relatedAMC = amcRenewals.filter(a => a.assetId === ticket?.assetId);
  const relatedWar = warrantyRenewals.filter(w => w.assetId === ticket?.assetId);

  const liveSla = useSLACountdown(
    ticket?.slaDeadline ?? new Date().toISOString(),
    ticket?.slaStatus,
    ticket?.status,
    ticket?.slaResolutionHrs,
  );

  // ── Workflow state ─────────────────────────────────────────────────────────
  const [workflowStatus, setWorkflowStatus] = useState<CustomerWorkflowStatus>(() => {
    const t = getTicketById(ticketId);
    if (!t) return "awaiting_completion";
    if (t.status === "Closed") return "closed";
    if (t.status === "Completed" || t.status === "Report Submitted") return "pending_review";
    return "awaiting_completion";
  });

  useEffect(() => {
    if (ticket) {
      if (ticket.status === "Closed") setWorkflowStatus("closed");
      else if (ticket.status === "Completed" || ticket.status === "Report Submitted") setWorkflowStatus("pending_review");
      else setWorkflowStatus("awaiting_completion");
    }
  }, [ticket?.status]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [techRating, setTechRating] = useState(0);
  const [vendorRating, setVendorRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [escalateLevel, setEscalateLevel] = useState("L1");
  const [escalateReason, setEscalateReason] = useState("");
  const [complaintCategory, setComplaintCategory] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<{ from: "org" | "vendor" | "system"; text: string; time: string }[]>([
    { from: "vendor", text: "Technician is on the way to your site. ETA approximately 45 minutes.", time: "2h ago" },
    { from: "system", text: "Technician arrived and checked in at the site.", time: "1h 20m ago" },
    { from: "vendor", text: "Work is in progress. We will notify you upon completion.", time: "55m ago" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [ratedTech, setRatedTech] = useState(false);
  const [ratedVendor, setRatedVendor] = useState(false);

  // Skeleton load
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [ticketId]);

  // ── Live tracking state (updated via EventBus) ─────────────────────────────
  const [liveEta, setLiveEta] = useState<string | null>(null);
  const [liveDistance, setLiveDistance] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToEvent((event) => {
      if (event.type === 'TECH_LOCATION_UPDATED' && event.payload.ticketId === ticketId) {
        setLiveEta(event.payload.eta);
        setLiveDistance(event.payload.distance);
      }
    });
  }, [ticketId]);

  // Derived: display ETA / distance — prefer live updates, fall back to ticket data
  const displayEta      = liveEta      ?? ticket?.technicianEta      ?? "—";
  const displayDistance = liveDistance ?? ticket?.technicianDistance ?? "—";

  // Derived: elapsed time on site
  const elapsedOnSite = (() => {
    const startTs = ticket?.startedWorkAt ?? ticket?.arrivedAt;
    if (!startTs) return null;
    const mins = Math.round((Date.now() - new Date(startTs).getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  })();

  // Derived: formatted timestamps
  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  // Live-tracking phases
  const isEnRoute  = ticket?.status === "Travelling";
  const isOnSite   = ticket?.status === "Arrived" || ticket?.status === "Checked In" || ticket?.status === "On Site";
  const isWorking  = ticket?.status === "In Progress" || ticket?.status === "Work Order Generated";
  const isComplete = ticket?.status === "Completed" || ticket?.status === "Report Submitted" || ticket?.status === "Closed";
  const showMap    = isEnRoute || isOnSite;  // Map visible only during travel phases

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => setToast({ msg, type });

  // ── Derived display values ─────────────────────────────────────────────────
  const slaUrgency   = liveSla.urgency ?? "ok";
  const uc           = URGENCY_COLOR[slaUrgency] ?? green;
  const slaLabel     = liveSla.isBreached ? "SLA Breached" : ticket?.slaStatus === "at_risk" ? "At Risk" : "Within SLA";
  const priorityColors = PRIORITY_COLOR[ticket?.priority ?? "Medium"] ?? { bg: blueTint, text: blue };
  const statusColors   = STATUS_COLOR[ticket?.status ?? ""] ?? { bg: divider, text: inkSec };
  const timeline = ticket ? buildTimelineFromTicket(ticket) : [];

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleAccept = () => {
    setIsLoading(true);
    setTimeout(() => {
      setWorkflowStatus("accepted");
      setIsLoading(false);
      setActiveModal(null);
      showToast("✓ Service accepted. Please rate the service.");
    }, 800);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) { showToast("Please select a rejection reason.", "error"); return; }
    setIsLoading(true);
    setTimeout(() => {
      setWorkflowStatus("rejected");
      setIsLoading(false);
      setActiveModal(null);
      setRejectReason("");
      showToast("Completion rejected. Vendor has been notified.", "error");
    }, 800);
  };

  const handleSubmitRating = (type: "tech" | "vendor") => {
    const rating = type === "tech" ? techRating : vendorRating;
    if (rating === 0) { showToast("Please select a star rating.", "error"); return; }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setActiveModal(null);
      if (type === "tech") setRatedTech(true);
      else setRatedVendor(true);
      showToast(`✓ ${type === "tech" ? "Technician" : "Vendor"} rated ${rating}/5 stars.`);
      if ((type === "tech" && ratedVendor) || (type === "vendor" && ratedTech)) {
        setWorkflowStatus("closed");
        showToast("✓ Ticket closed. Thank you for your feedback!");
      }
    }, 600);
  };

  const handleSubmitFeedback = () => {
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); setActiveModal(null); showToast("✓ Feedback submitted."); }, 600);
  };

  const handleEscalate = () => {
    if (!escalateReason.trim()) { showToast("Please enter an escalation reason.", "error"); return; }
    setIsLoading(true);
    setTimeout(() => {
      escalateTicket(ticketId, escalateReason);
      setIsLoading(false);
      setActiveModal(null);
      setEscalateReason("");
      showToast("⚠ Ticket escalated. Vendor notified.", "info");
    }, 800);
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    const msg = chatMessage;
    setChatMessage("");
    setChatMessages(prev => [...prev, { from: "org", text: msg, time: "Just now" }]);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { from: "vendor", text: "Thank you for your message. Our team will address this shortly.", time: "Just now" }]);
    }, 1500);
  };

  const toggleFeedbackTag = (tag: string) =>
    setFeedbackTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const FEEDBACK_TAGS = ["On Time", "Professional", "Quick Fix", "Excellent Work", "Communication", "Needs Improvement", "Delayed", "Re-Work Required"];
  const REJECT_REASONS = ["Work is incomplete", "Issue still persists", "Wrong service performed", "Technician did not arrive", "Parts need replacement", "Requires follow-up"];

  // ─── Skeleton ─────────────────────────────────────────────────────────────
  const SkeletonBlock = ({ w = "100%", h = "16px", r = "8px" }: { w?: string; h?: string; r?: string }) => (
    <div style={{ width: w, height: h, borderRadius: r, backgroundColor: "#E2E8F0", animation: "orgSkelPulse 1.5s ease-in-out infinite" }} />
  );

  // ─── Error state ──────────────────────────────────────────────────────────
  if (!loading && !ticket) {
    return (
      <MobileLayout showBottomNav={false} backgroundColor={bg} header={<><StatusBar /><div style={{ background: `linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`, padding: "10px 20px 18px" }}><button type="button" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}><ArrowLeft size={15} color="white" /> Back</button></div></>}>
        <style>{`@keyframes orgSkelPulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "20px", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}><AlertTriangle size={34} color={red} /></div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 8px", fontFamily: inter }}>Ticket Not Found</h2>
          <p style={{ fontSize: "13.5px", color: inkMut, textAlign: "center", margin: "0 0 28px", fontFamily: inter, lineHeight: 1.55 }}>Ticket <strong style={{ color: ink }}>{ticketId}</strong> does not exist.</p>
          <button type="button" onClick={() => navigate("/sla-tracker")} style={{ height: "48px", padding: "0 28px", borderRadius: "14px", background: `linear-gradient(135deg,${blue},${blueDark})`, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: blueShadow }}>Return to SLA Tracker</button>
        </div>
      </MobileLayout>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <MobileLayout
      showBottomNav={false}
      backgroundColor={bg}
      header={
        <>
          <StatusBar />
          {loading ? (
            <div style={{ background: `linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`, padding: "14px 20px 20px", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ width: "70px", height: "32px", borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.2)" }} />
                <div style={{ display: "flex", gap: "6px" }}>
                  <div style={{ width: "64px", height: "24px", borderRadius: "100px", backgroundColor: "rgba(255,255,255,0.15)" }} />
                  <div style={{ width: "80px", height: "24px", borderRadius: "100px", backgroundColor: "rgba(255,255,255,0.12)" }} />
                </div>
              </div>
              <div style={{ width: "70%", height: "22px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.2)", marginBottom: "10px" }} />
              <div style={{ width: "45%", height: "15px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.15)" }} />
            </div>
          ) : (
            <div style={{ background: `linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`, padding: "10px 20px 20px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <button type="button" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}>
                  <ArrowLeft size={15} color="white" /> Back
                </button>
                <div style={{ display: "flex", gap: "6px" }}>
                  <div style={{ backgroundColor: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.30)", borderRadius: "100px", padding: "4px 10px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "white", fontFamily: inter, letterSpacing: "0.05em" }}>{ticket!.priority.toUpperCase()}</span>
                  </div>
                  <div style={{ backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "100px", padding: "4px 10px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.85)", fontFamily: inter }}>{ticketId}</span>
                  </div>
                </div>
              </div>
              <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, margin: "0 0 6px", lineHeight: 1.2 }}>{ticket!.title}</h1>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.80)", fontFamily: inter }}>{ticket!.category} · {ticket!.status}</span>
                <div style={{ backgroundColor: `${uc}22`, border: `1px solid ${uc}55`, borderRadius: "100px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Shield size={11} color={uc} />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: uc, fontFamily: inter }}>{slaLabel}</span>
                </div>
              </div>
            </div>
          )}
          <TabBar active={activeTab} onSelect={setActiveTab} />
        </>
      }
      modals={
        <>
          {/* ── ACCEPT CONFIRM MODAL ── */}
          {activeModal === "accept_confirm" && (
            <BottomSheet onClose={() => setActiveModal(null)}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: greenT, display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={24} color={green} /></div>
                <div><h3 style={{ fontSize: "17px", fontWeight: 800, color: ink, margin: "0 0 3px", fontFamily: inter }}>Confirm Acceptance</h3><p style={{ fontSize: "13px", color: inkMut, margin: 0, fontFamily: inter }}>Confirm that the service has been completed satisfactorily.</p></div>
              </div>
              <div style={{ backgroundColor: greenT, borderRadius: "14px", padding: "14px 16px", marginBottom: "20px", border: `1px solid ${green}30` }}>
                <p style={{ fontSize: "13px", color: green, fontWeight: 600, margin: 0, fontFamily: inter }}>By accepting, you confirm the work is complete and accurate. You will then be able to rate the service.</p>
              </div>
              <button type="button" onClick={handleAccept} disabled={isLoading} style={{ width: "100%", height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${green},#15803D)`, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: greenShadow, marginBottom: "10px" }}>
                {isLoading ? "Processing..." : "✓ Accept Completion"}
              </button>
              <button type="button" onClick={() => setActiveModal(null)} style={{ width: "100%", height: "44px", borderRadius: "14px", backgroundColor: divider, border: "none", color: inkSec, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
            </BottomSheet>
          )}

          {/* ── REJECT CONFIRM MODAL ── */}
          {activeModal === "reject_confirm" && (
            <BottomSheet onClose={() => setActiveModal(null)}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center" }}><ThumbsDown size={24} color={red} /></div>
                <div><h3 style={{ fontSize: "17px", fontWeight: 800, color: ink, margin: "0 0 3px", fontFamily: inter }}>Reject Completion</h3><p style={{ fontSize: "13px", color: inkMut, margin: 0, fontFamily: inter }}>The vendor will be notified to take corrective action.</p></div>
              </div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: inkSec, margin: "0 0 10px", fontFamily: inter }}>Reason for rejection</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {REJECT_REASONS.map(r => (
                  <button key={r} type="button" onClick={() => setRejectReason(r)} style={{ padding: "12px 16px", borderRadius: "12px", border: `1.5px solid ${rejectReason === r ? red : border}`, backgroundColor: rejectReason === r ? redT : bg, color: rejectReason === r ? red : ink, fontSize: "13px", fontWeight: rejectReason === r ? 700 : 500, fontFamily: inter, cursor: "pointer", textAlign: "left" }}>{r}</button>
                ))}
              </div>
              <button type="button" onClick={handleReject} disabled={isLoading} style={{ width: "100%", height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${red},#B91C1C)`, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", marginBottom: "10px" }}>
                {isLoading ? "Processing..." : "Confirm Rejection"}
              </button>
              <button type="button" onClick={() => setActiveModal(null)} style={{ width: "100%", height: "44px", borderRadius: "14px", backgroundColor: divider, border: "none", color: inkSec, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
            </BottomSheet>
          )}

          {/* ── RATE TECHNICIAN MODAL ── */}
          {activeModal === "rate_technician" && (
            <BottomSheet onClose={() => setActiveModal(null)}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 6px", fontFamily: inter }}>Rate Technician</h3>
              <p style={{ fontSize: "13px", color: inkMut, margin: "0 0 20px", fontFamily: inter }}>{tech?.name ?? ticket?.assignedTechnicianName ?? "Technician"}</p>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}><StarRating value={techRating} onChange={setTechRating} size={36} /></div>
              <button type="button" onClick={() => handleSubmitRating("tech")} disabled={isLoading} style={{ width: "100%", height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${blue},${blueDark})`, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: blueShadow, marginBottom: "10px" }}>
                {isLoading ? "Submitting..." : "Submit Rating"}
              </button>
              <button type="button" onClick={() => setActiveModal(null)} style={{ width: "100%", height: "44px", borderRadius: "14px", backgroundColor: divider, border: "none", color: inkSec, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
            </BottomSheet>
          )}

          {/* ── RATE VENDOR MODAL ── */}
          {activeModal === "rate_vendor" && (
            <BottomSheet onClose={() => setActiveModal(null)}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 6px", fontFamily: inter }}>Rate Vendor</h3>
              <p style={{ fontSize: "13px", color: inkMut, margin: "0 0 20px", fontFamily: inter }}>{vendor.name}</p>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}><StarRating value={vendorRating} onChange={setVendorRating} size={36} /></div>
              <button type="button" onClick={() => handleSubmitRating("vendor")} disabled={isLoading} style={{ width: "100%", height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${purple},#6D28D9)`, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", marginBottom: "10px" }}>
                {isLoading ? "Submitting..." : "Submit Rating"}
              </button>
              <button type="button" onClick={() => setActiveModal(null)} style={{ width: "100%", height: "44px", borderRadius: "14px", backgroundColor: divider, border: "none", color: inkSec, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
            </BottomSheet>
          )}

          {/* ── FEEDBACK MODAL ── */}
          {activeModal === "feedback" && (
            <BottomSheet onClose={() => setActiveModal(null)}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 6px", fontFamily: inter }}>Service Feedback</h3>
              <p style={{ fontSize: "13px", color: inkMut, margin: "0 0 16px", fontFamily: inter }}>Help us improve by sharing your experience.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                {FEEDBACK_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleFeedbackTag(tag)} style={{ padding: "8px 14px", borderRadius: "100px", border: `1.5px solid ${feedbackTags.includes(tag) ? blue : border}`, backgroundColor: feedbackTags.includes(tag) ? blueTint : bg, color: feedbackTags.includes(tag) ? blue : inkSec, fontSize: "12.5px", fontWeight: feedbackTags.includes(tag) ? 700 : 500, fontFamily: inter, cursor: "pointer" }}>{tag}</button>
                ))}
              </div>
              <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Additional comments (optional)..." style={{ width: "100%", minHeight: "90px", borderRadius: "12px", border: `1px solid ${border}`, padding: "12px", fontSize: "13.5px", fontFamily: inter, resize: "none", color: ink, boxSizing: "border-box" }} />
              <button type="button" onClick={handleSubmitFeedback} style={{ width: "100%", height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${blue},${blueDark})`, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: blueShadow, marginTop: "14px", marginBottom: "10px" }}>Submit Feedback</button>
              <button type="button" onClick={() => setActiveModal(null)} style={{ width: "100%", height: "44px", borderRadius: "14px", backgroundColor: divider, border: "none", color: inkSec, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
            </BottomSheet>
          )}

          {/* ── ESCALATE MODAL ── */}
          {activeModal === "escalate" && (
            <BottomSheet onClose={() => setActiveModal(null)}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={24} color={red} /></div>
                <div><h3 style={{ fontSize: "17px", fontWeight: 800, color: ink, margin: "0 0 3px", fontFamily: inter }}>Escalate Request</h3><p style={{ fontSize: "13px", color: inkMut, margin: 0, fontFamily: inter }}>This will alert vendor management immediately.</p></div>
              </div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: inkSec, margin: "0 0 10px", fontFamily: inter }}>Escalation Level</p>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {["L1", "L2", "L3"].map(l => (
                  <button key={l} type="button" onClick={() => setEscalateLevel(l)} style={{ flex: 1, height: "40px", borderRadius: "10px", border: `1.5px solid ${escalateLevel === l ? red : border}`, backgroundColor: escalateLevel === l ? redT : bg, color: escalateLevel === l ? red : inkSec, fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>{l}</button>
                ))}
              </div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: inkSec, margin: "0 0 8px", fontFamily: inter }}>Reason</p>
              <textarea value={escalateReason} onChange={e => setEscalateReason(e.target.value)} placeholder="Describe why you are escalating this request..." style={{ width: "100%", minHeight: "80px", borderRadius: "12px", border: `1px solid ${border}`, padding: "12px", fontSize: "13.5px", fontFamily: inter, resize: "none", color: ink, boxSizing: "border-box", marginBottom: "16px" }} />
              <button type="button" onClick={handleEscalate} disabled={isLoading} style={{ width: "100%", height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${red},#B91C1C)`, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", marginBottom: "10px" }}>
                {isLoading ? "Escalating..." : "⚠ Confirm Escalation"}
              </button>
              <button type="button" onClick={() => setActiveModal(null)} style={{ width: "100%", height: "44px", borderRadius: "14px", backgroundColor: divider, border: "none", color: inkSec, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
            </BottomSheet>
          )}

          {/* ── CONTACT VENDOR MODAL ── */}
          {activeModal === "contact_vendor" && (
            <BottomSheet onClose={() => setActiveModal(null)}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 6px", fontFamily: inter }}>Contact {vendor.name}</h3>
              <p style={{ fontSize: "13px", color: inkMut, margin: "0 0 20px", fontFamily: inter }}>Choose how to reach the vendor.</p>
              {[
                { icon: Phone, label: "Call Vendor", detail: vendor.phone ?? "+971 50 123 4567", action: () => { setActiveModal(null); showToast("Calling Vendor...", "info"); } },
                { icon: Mail, label: "Email Vendor", detail: vendor.email ?? "vendor@acme.ae", action: () => { setActiveModal(null); showToast("Opening mail composer...", "info"); } },
                { icon: MessageSquare, label: "Message In-App", detail: "Switch to Service tab to chat", action: () => { setActiveModal(null); setActiveTab("service"); } },
              ].map(item => (
                <button key={item.label} type="button" onClick={item.action} style={{ display: "flex", alignItems: "center", gap: "14px", width: "100%", padding: "14px 16px", backgroundColor: divider, borderRadius: "14px", border: "none", cursor: "pointer", marginBottom: "10px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: card, display: "flex", alignItems: "center", justifyContent: "center" }}><item.icon size={18} color={blue} /></div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 2px", fontFamily: inter }}>{item.label}</p>
                    <p style={{ fontSize: "12px", color: inkMut, margin: 0, fontFamily: inter }}>{item.detail}</p>
                  </div>
                </button>
              ))}
            </BottomSheet>
          )}

          {/* ── COMPLAINT MODAL ── */}
          {activeModal === "complaint" && (
            <BottomSheet onClose={() => setActiveModal(null)}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 6px", fontFamily: inter }}>Raise a Complaint</h3>
              <p style={{ fontSize: "13px", color: inkMut, margin: "0 0 16px", fontFamily: inter }}>Your complaint will be logged and reviewed by our team.</p>
              <p style={{ fontSize: "13px", fontWeight: 700, color: inkSec, margin: "0 0 10px", fontFamily: inter }}>Category</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                {["Service Quality", "Delay", "Technician Behavior", "Billing Issue", "Safety Concern"].map(c => (
                  <button key={c} type="button" onClick={() => setComplaintCategory(c)} style={{ padding: "8px 14px", borderRadius: "100px", border: `1.5px solid ${complaintCategory === c ? red : border}`, backgroundColor: complaintCategory === c ? redT : bg, color: complaintCategory === c ? red : inkSec, fontSize: "12.5px", fontWeight: complaintCategory === c ? 700 : 500, fontFamily: inter, cursor: "pointer" }}>{c}</button>
                ))}
              </div>
              <textarea value={complaintDesc} onChange={e => setComplaintDesc(e.target.value)} placeholder="Describe the issue..." style={{ width: "100%", minHeight: "80px", borderRadius: "12px", border: `1px solid ${border}`, padding: "12px", fontSize: "13.5px", fontFamily: inter, resize: "none", color: ink, boxSizing: "border-box", marginBottom: "16px" }} />
              <button type="button" onClick={() => { setActiveModal(null); showToast("✓ Complaint submitted and logged."); setComplaintCategory(""); setComplaintDesc(""); }} style={{ width: "100%", height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${red},#B91C1C)`, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", marginBottom: "10px" }}>Submit Complaint</button>
              <button type="button" onClick={() => setActiveModal(null)} style={{ width: "100%", height: "44px", borderRadius: "14px", backgroundColor: divider, border: "none", color: inkSec, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
            </BottomSheet>
          )}

          {/* ── DOWNLOAD MENU ── */}
          {activeModal === "download_menu" && (
            <BottomSheet onClose={() => setActiveModal(null)}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 6px", fontFamily: inter }}>Download Documents</h3>
              <p style={{ fontSize: "13px", color: inkMut, margin: "0 0 20px", fontFamily: inter }}>Available documents for this ticket.</p>
              {[
                { label: "SLA Report", file: `SLA_Report_${ticketId}.txt`, available: true },
                { label: "Service Report", file: `Service_Report_${ticketId}.txt`, available: workflowStatus !== "awaiting_completion" },
                { label: "Completion Certificate", file: `Completion_Cert_${ticketId}.txt`, available: workflowStatus === "accepted" || workflowStatus === "closed" },
              ].map(doc => (
                <button key={doc.label} type="button" disabled={!doc.available} onClick={() => { if (doc.available) { mockDownload(doc.file); setActiveModal(null); showToast(`✓ ${doc.label} downloaded.`); } }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", backgroundColor: doc.available ? divider : "#F8FAFC", borderRadius: "14px", border: `1px solid ${doc.available ? border : "#E2E8F0"}`, cursor: doc.available ? "pointer" : "not-allowed", marginBottom: "10px", opacity: doc.available ? 1 : 0.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FileText size={18} color={doc.available ? blue : inkFaint} />
                    <span style={{ fontSize: "14px", fontWeight: 600, color: doc.available ? ink : inkFaint, fontFamily: inter }}>{doc.label}</span>
                  </div>
                  <Download size={16} color={doc.available ? blue : inkFaint} />
                </button>
              ))}
            </BottomSheet>
          )}

          {/* ── COMPLETION CERT ── */}
          {activeModal === "completion_cert" && (
            <BottomSheet onClose={() => setActiveModal(null)}>
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: `linear-gradient(135deg,${green},#15803D)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Award size={36} color="white" /></div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: ink, margin: "0 0 6px", fontFamily: inter }}>Service Complete</h3>
                <p style={{ fontSize: "13px", color: inkMut, margin: "0 0 24px", fontFamily: inter }}>Ticket {ticketId} has been successfully completed.</p>
                <div style={{ backgroundColor: divider, borderRadius: "16px", padding: "16px", textAlign: "left", marginBottom: "20px" }}>
                  <p style={{ fontSize: "12px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>COMPLETED BY</p>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{tech?.name ?? ticket?.assignedTechnicianName ?? "Technician"} · {vendor.name}</p>
                </div>
                <button type="button" onClick={() => { mockDownload(`Completion_Certificate_${ticketId}.txt`); showToast("✓ Certificate downloaded."); }} style={{ width: "100%", height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${green},#15803D)`, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: greenShadow, marginBottom: "10px" }}>
                  <Download size={18} style={{ verticalAlign: "middle", marginRight: "8px" }} />Download Certificate
                </button>
                <button type="button" onClick={() => setActiveModal(null)} style={{ width: "100%", height: "44px", borderRadius: "14px", backgroundColor: divider, border: "none", color: inkSec, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Close</button>
              </div>
            </BottomSheet>
          )}

          {/* ── PREVIEW IMAGE MODAL ── */}
          {activeModal === "preview_image" && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.95)", zIndex: 3000, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px" }}>
                <p style={{ color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, margin: 0 }}>Issue Evidence</p>
                <button type="button" onClick={() => setActiveModal(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <XCircle size={20} color="white" />
                </button>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflow: "hidden" }}>
                <img src={ticket?.imageUrl ?? "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=800"} alt="Evidence" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
            </div>
          )}
        </>
      }
    >
      <style>{`
        @keyframes orgSkelPulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes orgPulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes orgSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ padding: "16px", paddingBottom: "100px" }}>

        {/* ═══ SKELETON ════════════════════════════════════════════════════════ */}
        {loading && (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "16px", boxShadow: cardShadow }}>
                <div style={{ width: "40%", height: "18px", borderRadius: "8px", backgroundColor: "#E2E8F0", animation: "orgSkelPulse 1.5s ease-in-out infinite", marginBottom: "16px" }} />
                {[70, 55, 80].map((w, j) => (<div key={j} style={{ width: `${w}%`, height: "14px", borderRadius: "6px", backgroundColor: "#E2E8F0", animation: "orgSkelPulse 1.5s ease-in-out infinite", marginBottom: "10px" }} />))}
              </div>
            ))}
          </>
        )}

        {/* ═══ OVERVIEW TAB ════════════════════════════════════════════════════ */}
        {!loading && ticket && activeTab === "overview" && (
          <>
            {/* ── Status Banner (completion workflow) ── */}
            {workflowStatus === "pending_review" && (
              <div style={{ backgroundColor: card, borderRadius: "20px", border: `2px solid ${green}`, padding: "20px", marginBottom: "16px", boxShadow: `0 4px 24px ${green}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <CheckCircle2 size={20} color={green} />
                  <h3 style={{ fontSize: "15px", fontWeight: 800, color: green, margin: 0, fontFamily: inter }}>Service Completed — Your Confirmation Required</h3>
                </div>
                <p style={{ fontSize: "13px", color: inkSec, margin: "0 0 14px", fontFamily: inter }}>The technician has marked this job as complete. Please review and confirm.</p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={() => setActiveModal("accept_confirm")} style={{ flex: 1, height: "44px", borderRadius: "12px", background: `linear-gradient(135deg,${green},#15803D)`, border: "none", color: "white", fontSize: "13.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>✓ Accept</button>
                  <button type="button" onClick={() => setActiveModal("reject_confirm")} style={{ flex: 1, height: "44px", borderRadius: "12px", backgroundColor: redT, border: `1.5px solid ${red}33`, color: red, fontSize: "13.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>✗ Reject</button>
                </div>
              </div>
            )}
            {workflowStatus === "accepted" && (
              <div style={{ backgroundColor: greenT, borderRadius: "20px", border: `1px solid ${green}33`, padding: "16px 20px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <CheckCircle2 size={18} color={green} />
                  <span style={{ fontSize: "14px", fontWeight: 700, color: green, fontFamily: inter }}>Accepted — Please Rate the Service</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => setActiveModal("rate_technician")} style={{ flex: 1, height: "38px", borderRadius: "10px", background: `linear-gradient(135deg,${blue},${blueDark})`, border: "none", color: "white", fontSize: "12.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Rate Technician</button>
                  <button type="button" onClick={() => setActiveModal("rate_vendor")} style={{ flex: 1, height: "38px", borderRadius: "10px", background: `linear-gradient(135deg,${purple},#6D28D9)`, border: "none", color: "white", fontSize: "12.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Rate Vendor</button>
                </div>
              </div>
            )}
            {workflowStatus === "rejected" && (
              <div style={{ backgroundColor: redT, borderRadius: "20px", border: `1px solid ${red}33`, padding: "16px 20px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <XCircle size={18} color={red} />
                  <span style={{ fontSize: "14px", fontWeight: 700, color: red, fontFamily: inter }}>Completion Rejected — Vendor is taking corrective action</span>
                </div>
              </div>
            )}
            {workflowStatus === "closed" && (
              <div style={{ backgroundColor: greenT, borderRadius: "20px", border: `1px solid ${green}33`, padding: "16px 20px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <BadgeCheck size={18} color={green} />
                  <span style={{ fontSize: "14px", fontWeight: 700, color: green, fontFamily: inter }}>Service Closed & Rated — Thank you!</span>
                </div>
                <button type="button" onClick={() => setActiveModal("completion_cert")} style={{ height: "36px", padding: "0 16px", borderRadius: "10px", background: `linear-gradient(135deg,${green},#15803D)`, border: "none", color: "white", fontSize: "12.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>View Certificate</button>
              </div>
            )}

            {/* ── Ticket Summary Card ── */}
            <SectionCard title="Service Request" icon={<FileText size={17} color={blue} />}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <InfoRow label="Request ID" value={ticket.id} />
                <InfoRow label="Category" value={ticket.category} />
                <InfoRow label="Priority" value={<Pill label={ticket.priority} color={priorityColors.text} bg={priorityColors.bg} />} />
                <InfoRow label="Status" value={<Pill label={ticket.status} color={statusColors.text} bg={statusColors.bg} />} />
              </div>
              <Divider />
              <InfoRow label="Location" value={<span style={{ display: "flex", alignItems: "center", gap: "4px" }}><MapPin size={12} color={inkMut} />{ticket.location}{ticket.floor ? ` · ${ticket.floor}` : ""}</span>} />
              <InfoRow label="Created" value={new Date(ticket.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
              <InfoRow label="Updated" value={new Date(ticket.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} />
              {ticket.description && (
                <>
                  <Divider />
                  <p style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Issue Description</p>
                  <p style={{ fontSize: "13.5px", color: inkSec, fontFamily: inter, lineHeight: 1.55, margin: 0 }}>
                    {expandedDesc || ticket.description.length <= 120 ? ticket.description : ticket.description.slice(0, 120) + "…"}
                  </p>
                  {ticket.description.length > 120 && (
                    <button type="button" onClick={() => setExpandedDesc(!expandedDesc)} style={{ background: "none", border: "none", color: blue, fontSize: "12.5px", fontWeight: 600, fontFamily: inter, cursor: "pointer", padding: "4px 0", display: "flex", alignItems: "center", gap: "4px" }}>
                      {expandedDesc ? <><ChevronUp size={14} />Show less</> : <><ChevronDown size={14} />Show more</>}
                    </button>
                  )}
                </>
              )}
              
              <Divider />
              <p style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Attached Evidence</p>
              {/* Evidence image: shown only if ticket.imageUrl is set (data-driven, no hardcoding) */}
              {ticket.imageUrl ? (
                <button type="button" onClick={() => setActiveModal("preview_image")} style={{ width: "100%", height: "140px", borderRadius: "12px", overflow: "hidden", position: "relative", border: `1px solid ${border}`, cursor: "pointer", padding: 0, backgroundColor: bg }}>
                  <img src={ticket.imageUrl} alt="Customer Evidence" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}>
                    <div style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: "8px 12px", borderRadius: "100px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Search size={14} color="white" />
                      <span style={{ color: "white", fontSize: "12px", fontWeight: 600, fontFamily: inter }}>View Photo</span>
                    </div>
                  </div>
                </button>
              ) : (
                <div style={{ padding: "16px", backgroundColor: bg, borderRadius: "12px", border: `1px dashed ${border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontSize: "12.5px", color: inkMut, fontFamily: inter, margin: 0 }}>No initial evidence provided.</p>
                </div>
              )}
            </SectionCard>

            {/* ── Vendor Card ── */}
            <SectionCard title="Assigned Vendor" icon={<Building2 size={17} color={purple} />}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
                <Avatar initials={vendor.name.slice(0, 2).toUpperCase()} gradient={`linear-gradient(135deg,${purple},#6D28D9)`} size={48} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 3px", fontFamily: inter }}>{vendor.name}</p>
                  <p style={{ fontSize: "12.5px", color: inkSec, margin: "0 0 2px", fontFamily: inter }}>{vendor.managerName} · {vendor.managerRole}</p>
                  <p style={{ fontSize: "12px", color: inkMut, margin: 0, fontFamily: inter }}>{vendor.phone ?? "+971 50 123 4567"}</p>
                </div>
              </div>
              <Divider />
              <InfoRow label="Contract ID" value={vendor.contractId} />
              <InfoRow label="SLA Target" value={`${vendor.complianceTarget}% compliance`} valueColor={green} />
              {vendor.serviceTypes?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {vendor.serviceTypes.map(s => <Pill key={s} label={s} color={purple} bg={purpleT} />)}
                </div>
              )}
              <Divider />
              <button type="button" onClick={() => setActiveModal("contact_vendor")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 14px", backgroundColor: purpleT, borderRadius: "12px", border: "none", cursor: "pointer" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: purple, fontFamily: inter }}>Contact Vendor</span>
                <ChevronRight size={16} color={purple} />
              </button>
            </SectionCard>

            {/* ── Technician Card ── */}
            <SectionCard title="Assigned Technician" icon={<User size={17} color={blue} />}>
              {ticket.assignedTechnicianId ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
                    <Avatar initials={tech?.initials ?? (ticket.assignedTechnicianName?.slice(0, 2).toUpperCase() ?? "TN")} gradient={`linear-gradient(135deg,${blue},${blueDark})`} size={48} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 3px", fontFamily: inter }}>{tech?.name ?? ticket.assignedTechnicianName}</p>
                      <p style={{ fontSize: "12.5px", color: inkSec, margin: "0 0 4px", fontFamily: inter }}>{tech?.role ?? "Field Engineer"}</p>
                      {tech?.rating && <span style={{ fontSize: "12px", color: amber, fontWeight: 700 }}>★ {tech.rating.toFixed(1)}</span>}
                    </div>
                    {/* Live availability pulse */}
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: greenT, borderRadius: "100px", padding: "5px 10px" }}>
                      <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: green, animation: "orgPulse 1.5s ease-in-out infinite" }} />
                      <span style={{ fontSize: "11px", fontWeight: 700, color: green, fontFamily: inter }}>On Site</span>
                    </div>
                  </div>
                  <Divider />
                  <InfoRow label="Phone" value={tech?.phone ?? "—"} />
                  <InfoRow label="SLA Adherence" value={`${tech?.slaAdherence ?? "—"}%`} valueColor={tech?.slaAdherence && tech.slaAdherence >= 90 ? green : amber} />
                  {tech && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" onClick={() => navigate(`/technician-performance/${tech.id}`)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", backgroundColor: divider, borderRadius: "12px", border: "none", cursor: "pointer" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: blue, fontFamily: inter }}>View Technician Profile</span>
                        <ChevronRight size={16} color={blue} />
                      </button>
                      {(ticket.status === "Travelling" || ticket.status === "Arrived" || ticket.status === "On Site") && (
                        <button type="button" onClick={() => setActiveTab("timeline")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", backgroundColor: blueTint, borderRadius: "12px", border: "none", cursor: "pointer" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: blue, fontFamily: inter }}>Track Technician</span>
                          <Navigation size={16} color={blue} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: amberT, borderRadius: "14px", padding: "14px 16px", border: `1px solid ${amber}30` }}>
                  <AlertTriangle size={20} color={amber} />
                  <div>
                    <p style={{ fontSize: "13.5px", fontWeight: 700, color: amber, margin: "0 0 2px", fontFamily: inter }}>No Technician Assigned</p>
                    <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>Awaiting vendor assignment.</p>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* ── Asset Card ── */}
            {asset && (
              <SectionCard title="Asset Details" icon={<Package size={17} color={purple} />}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: purpleT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Package size={20} color={purple} /></div>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 3px", fontFamily: inter }}>{asset.name}</p>
                    <p style={{ fontSize: "12.5px", color: inkSec, margin: 0, fontFamily: inter }}>{asset.id} · {asset.category}</p>
                  </div>
                </div>
                <Divider />
                <InfoRow label="Location" value={`${asset.location}${asset.floor ? ` · ${asset.floor}` : ""}`} />
                <InfoRow label="Warranty" value={<Pill label={new Date(asset.warrantyExpiry) > new Date() ? "Under Warranty" : "Expired"} color={new Date(asset.warrantyExpiry) > new Date() ? green : red} bg={new Date(asset.warrantyExpiry) > new Date() ? greenT : redT} />} />
                <InfoRow label="Health" value={<Pill label={asset.health} color={asset.health === "Healthy" ? green : asset.health === "At Risk" ? amber : red} bg={asset.health === "Healthy" ? greenT : asset.health === "At Risk" ? amberT : redT} />} />
                <InfoRow label="Health Score" value={`${asset.healthScore}/100`} valueColor={asset.healthScore >= 70 ? green : asset.healthScore >= 50 ? amber : red} />
                {asset.lastPMDate && <InfoRow label="Last PM" value={new Date(asset.lastPMDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />}
                {asset.nextPMDate && <InfoRow label="Next PM" value={new Date(asset.nextPMDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />}
                <Divider />
                <button type="button" onClick={() => navigate(`/assets/details/${asset.id}`)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 14px", backgroundColor: divider, borderRadius: "12px", border: "none", cursor: "pointer" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: blue, fontFamily: inter }}>View Full Asset History</span>
                  <ChevronRight size={16} color={blue} />
                </button>
              </SectionCard>
            )}

            {/* ── Customer Action Buttons ── */}
            <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "16px", boxShadow: cardShadow }}>
              <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 14px", fontFamily: inter }}>Quick Actions</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { label: "View SLA", icon: Shield, color: blue, bg: blueTint, action: () => setActiveTab("sla") },
                  { label: "Escalate", icon: AlertTriangle, color: red, bg: redT, action: () => setActiveModal("escalate"), disabled: workflowStatus === "closed" },
                  { label: "Contact Vendor", icon: Phone, color: purple, bg: purpleT, action: () => setActiveModal("contact_vendor") },
                  { label: "Complaint", icon: ClipboardCheck, color: amber, bg: amberT, action: () => setActiveModal("complaint") },
                  { label: "Download", icon: Download, color: teal, bg: tealT, action: () => setActiveModal("download_menu") },
                  { label: "Feedback", icon: MessageSquare, color: green, bg: greenT, action: () => setActiveModal("feedback"), disabled: workflowStatus === "awaiting_completion" },
                ].map(btn => (
                  <button key={btn.label} type="button" onClick={btn.action} disabled={btn.disabled} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "14px", backgroundColor: btn.disabled ? divider : btn.bg, border: "none", cursor: btn.disabled ? "not-allowed" : "pointer", opacity: btn.disabled ? 0.5 : 1 }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", backgroundColor: btn.disabled ? "#E2E8F0" : `${btn.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <btn.icon size={17} color={btn.disabled ? inkFaint : btn.color} />
                    </div>
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: btn.disabled ? inkFaint : btn.color, fontFamily: inter }}>{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Related AMC ── */}
            {relatedAMC.length > 0 && (
              <SectionCard title="Related AMC" icon={<RefreshCw size={17} color={teal} />}>
                {relatedAMC.map(amc => (
                  <div key={amc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: divider, borderRadius: "12px", padding: "12px 14px", marginBottom: "8px" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: "0 0 3px", fontFamily: inter }}>{amc.id}</p>
                      <p style={{ fontSize: "11.5px", color: inkMut, margin: 0, fontFamily: inter }}>Expires: {new Date(amc.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Pill label={amc.status} color={teal} bg={tealT} />
                      <button type="button" onClick={() => navigate("/assets/renewals")} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={16} color={inkMut} /></button>
                    </div>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* ── Related Warranty ── */}
            {relatedWar.length > 0 && (
              <SectionCard title="Related Warranty" icon={<Shield size={17} color={amber} />}>
                {relatedWar.map(w => (
                  <div key={w.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: divider, borderRadius: "12px", padding: "12px 14px", marginBottom: "8px" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: "0 0 3px", fontFamily: inter }}>{w.id}</p>
                      <p style={{ fontSize: "11.5px", color: inkMut, margin: 0, fontFamily: inter }}>Expires: {new Date(w.currentExpiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Pill label={w.status} color={amber} bg={amberT} />
                      <button type="button" onClick={() => navigate(`/assets/renewals/${w.id}`)} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={16} color={inkMut} /></button>
                    </div>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* ── Related PM Tasks ── */}
            {relatedPM.length > 0 && (
              <SectionCard title="Related Preventive Maintenance" icon={<Wrench size={17} color={purple} />}>
                {relatedPM.map(pm => (
                  <div key={pm.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: divider, borderRadius: "12px", padding: "12px 14px", marginBottom: "8px" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: "0 0 3px", fontFamily: inter }}>{pm.type}</p>
                      <p style={{ fontSize: "11.5px", color: inkMut, margin: 0, fontFamily: inter }}>Due: {pm.dueDate} · {pm.status}</p>
                    </div>
                    <button type="button" onClick={() => navigate(`/assets/details/${pm.assetId}`)} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={16} color={blue} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => showToast("Opening Maintenance History...", "info")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", backgroundColor: purpleT, borderRadius: "12px", border: "none", cursor: "pointer", marginTop: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: purple, fontFamily: inter }}>View All PM Tasks</span>
                  <ChevronRight size={16} color={purple} />
                </button>
              </SectionCard>
            )}
          </>
        )}

        {/* ═══ TIMELINE TAB ════════════════════════════════════════════════════ */}
        {!loading && ticket && activeTab === "timeline" && (
          <>
            {/* ── Live Tracking Widget: En Route ── */}
            {showMap && (
              <div style={{ backgroundColor: card, borderRadius: "20px", border: `2px solid ${blue}44`, padding: "20px", marginBottom: "16px", boxShadow: `0 4px 24px ${blue}18` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Navigation size={17} color={blue} />
                    <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: 0, fontFamily: inter }}>Live Technician Tracking</h2>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: greenT, borderRadius: "100px", padding: "4px 10px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: green, animation: "orgPulse 1.2s ease-in-out infinite" }} />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: green, fontFamily: inter }}>
                      {isOnSite ? "ON SITE" : "EN ROUTE"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ backgroundColor: divider, borderRadius: "12px", padding: "12px" }}>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>TECHNICIAN</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: "0 0 2px", fontFamily: inter }}>{tech?.name ?? ticket.assignedTechnicianName ?? "—"}</p>
                    <p style={{ fontSize: "11.5px", color: inkMut, margin: 0, fontFamily: inter }}>{tech?.location ?? "—"}</p>
                  </div>
                  <div style={{ backgroundColor: divider, borderRadius: "12px", padding: "12px" }}>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>{isOnSite ? "STATUS" : "ETA"}</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: blue, margin: "0 0 2px", fontFamily: inter }}>
                      {isOnSite ? (ticket.status === "Arrived" ? "Arrived at Site" : "Checked In") : `Arriving in ${displayEta}`}
                    </p>
                    <p style={{ fontSize: "11.5px", color: inkMut, margin: 0, fontFamily: inter }}>
                      {isOnSite ? `Arrived ${fmt(ticket.arrivedAt)}` : `${displayDistance} away`}
                    </p>
                  </div>
                </div>

                {/* Simulated Interactive Map */}
                <div style={{ position: "relative", width: "100%", height: "180px", borderRadius: "14px", overflow: "hidden", border: `1px solid ${border}`, backgroundColor: "#E2E8F0", zIndex: 1 }}>
                  <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" alt="Map" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
                  {/* Route Line */}
                  <div style={{ position: "absolute", left: "15%", right: "56px", top: "50%", height: "4px", backgroundColor: "transparent", zIndex: 2, borderTop: `3px dashed ${blue}`, opacity: 0.7 }} />
                  {/* Destination Pin */}
                  <div style={{ position: "absolute", right: "20px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 3 }}>
                    <div style={{ padding: "4px 8px", backgroundColor: green, color: "white", borderRadius: "8px", fontSize: "10px", fontWeight: 700, marginBottom: "4px", boxShadow: greenShadow }}>{ticket.location}</div>
                    <MapPin size={24} color={green} fill="white" />
                  </div>
                  
                  {/* Technician Pin */}
                  <div style={{ 
                    position: "absolute", 
                    left: ticket.status === "Travelling" ? "25%" : "calc(100% - 70px)", 
                    top: "50%", 
                    transform: "translateY(-50%)", 
                    transition: "left 8s ease-in-out",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    zIndex: 4
                  }}>
                    <div style={{ padding: "4px 8px", backgroundColor: blue, color: "white", borderRadius: "8px", fontSize: "10px", fontWeight: 700, marginBottom: "4px", boxShadow: blueShadow }}>{tech?.name?.split(' ')[0] ?? "Tech"}</div>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: blueShadow, border: `2px solid ${blue}` }}>
                      <Car size={16} color={blue} />
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: "11px", color: inkFaint, margin: "8px 0 0", fontFamily: inter, textAlign: "center" }}>Last updated 2 min ago</p>
              </div>
            )}

            {/* ── Working On Site Banner ── */}
            {isWorking && ticket.assignedTechnicianId && (
              <div style={{ backgroundColor: card, borderRadius: "20px", border: `2px solid ${purple}44`, padding: "20px", marginBottom: "16px", boxShadow: `0 4px 24px ${purple}18` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Wrench size={17} color={purple} />
                    <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: 0, fontFamily: inter }}>Work In Progress</h2>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: purpleT, borderRadius: "100px", padding: "4px 10px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: purple, animation: "orgPulse 1.8s ease-in-out infinite" }} />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: purple, fontFamily: inter }}>WORKING</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ backgroundColor: divider, borderRadius: "12px", padding: "12px" }}>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>TECHNICIAN</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: "0 0 2px", fontFamily: inter }}>{tech?.name ?? ticket.assignedTechnicianName ?? "—"}</p>
                    <p style={{ fontSize: "11.5px", color: inkMut, margin: 0, fontFamily: inter }}>{tech?.role ?? "—"}</p>
                  </div>
                  <div style={{ backgroundColor: divider, borderRadius: "12px", padding: "12px" }}>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>WORKING SINCE</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: purple, margin: "0 0 2px", fontFamily: inter }}>{fmt(ticket.startedWorkAt ?? ticket.arrivedAt)}</p>
                    {elapsedOnSite && <p style={{ fontSize: "11.5px", color: inkMut, margin: 0, fontFamily: inter }}>{elapsedOnSite} elapsed</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Visit Summary (after Completion) ── */}
            {isComplete && ticket.assignedTechnicianId && (
              <div style={{ backgroundColor: greenT, borderRadius: "20px", border: `2px solid ${green}44`, padding: "20px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <BadgeCheck size={22} color={green} />
                  <h2 style={{ fontSize: "15px", fontWeight: 800, color: green, margin: 0, fontFamily: inter }}>Visit Summary</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "12px" }}>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>TECHNICIAN</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{tech?.name ?? ticket.assignedTechnicianName ?? "—"}</p>
                  </div>
                  <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "12px" }}>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>COMPLETED AT</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: green, margin: 0, fontFamily: inter }}>{fmt(ticket.completedAt ?? ticket.resolvedAt)}</p>
                  </div>
                  {ticket.startedWorkAt && ticket.completedAt && (
                    <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "12px" }}>
                      <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>WORK DURATION</p>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>
                        {(() => {
                          const mins = Math.round((new Date(ticket.completedAt!).getTime() - new Date(ticket.startedWorkAt!).getTime()) / 60000);
                          return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
                        })()}
                      </p>
                    </div>
                  )}
                  <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "12px" }}>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>ARRIVED AT</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{fmt(ticket.arrivedAt)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setActiveTab("service")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 14px", backgroundColor: "white", borderRadius: "12px", border: `1px solid ${green}44`, cursor: "pointer" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: green, fontFamily: inter }}>View Service Report</span>
                  <ChevronRight size={16} color={green} />
                </button>
              </div>
            )}

            {/* Enterprise 11-step timeline */}
            <SectionCard title="Service Timeline" icon={<TrendingUp size={17} color={blue} />}>
              {ENTERPRISE_STEPS.map((step, idx) => {
                const state = getStepState(step.key, ticket.status);
                const isLast = idx === ENTERPRISE_STEPS.length - 1;
                const IconComp = step.icon;
                return (
                  <div key={step.key} style={{ display: "flex", gap: "12px", marginBottom: isLast ? 0 : "4px" }}>
                    {/* connector column */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "32px", flexShrink: 0 }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "50%",
                        backgroundColor: state === "pending" ? divider : step.tint,
                        border: `2px solid ${state === "pending" ? "#CBD5E1" : step.color}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                        animation: state === "current" ? "orgPulse 1.8s ease-in-out infinite" : "none",
                      }}>
                        <IconComp size={15} color={state === "pending" ? inkFaint : step.color} />
                      </div>
                      {!isLast && (
                        <div style={{ flex: 1, width: "2px", backgroundColor: state === "done" ? step.color : "#E2E8F0", borderRadius: "1px", margin: "4px 0", minHeight: "20px", borderLeft: state === "pending" ? `2px dashed #E2E8F0` : "none" }} />
                      )}
                    </div>
                    {/* content */}
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontSize: "13.5px", fontWeight: state === "pending" ? 500 : 700, color: state === "pending" ? inkFaint : ink, fontFamily: inter }}>{step.label}</span>
                        {state !== "pending" && (
                          <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>
                            {state === "current" ? "In Progress" : new Date(ticket.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      {state === "done" && <Pill label="Done" color={step.color} bg={step.tint} />}
                      {state === "current" && <Pill label="Active" color={step.color} bg={step.tint} />}
                    </div>
                  </div>
                );
              })}
            </SectionCard>

            {/* Activity Feed */}
            <SectionCard title="Activity Feed" icon={<Activity size={17} color={blue} />}>
              {[
                { dot: blue,   actor: "System",       text: `Ticket assigned to ${vendor.name}`, time: "2h ago" },
                { dot: amber,  actor: "Vendor",        text: "Technician departure confirmed", time: "1h 45m ago" },
                { dot: green,  actor: "Technician",    text: `Arrived and checked in at ${ticket.floor ?? ticket.location}`, time: "1h 20m ago" },
                ...(ticket.slaStatus === "at_risk" ? [{ dot: red, actor: "System", text: "⚠ SLA warning — 30 min remaining", time: "55m ago" }] : []),
                ...(ticket.notes.map(n => ({ dot: purple, actor: "Vendor Note", text: n, time: "recently" }))),
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: item.dot, flexShrink: 0, marginTop: "4px" }} />
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: inkSec, margin: "0 0 2px", fontFamily: inter }}>{item.actor}</p>
                    <p style={{ fontSize: "13px", color: ink, margin: "0 0 2px", fontFamily: inter }}>{item.text}</p>
                    <p style={{ fontSize: "11px", color: inkFaint, margin: 0, fontFamily: inter }}>{item.time}</p>
                  </div>
                </div>
              ))}
            </SectionCard>
          </>
        )}

        {/* ═══ SERVICE TAB ═════════════════════════════════════════════════════ */}
        {!loading && ticket && activeTab === "service" && (
          <>
            {/* Service Report */}
            <div style={{ backgroundColor: ticket.status === "Completed" || ticket.status === "Report Submitted" || ticket.status === "Closed" ? greenT : amberT, borderRadius: "14px", border: `1px solid ${ticket.status === "Completed" || ticket.status === "Report Submitted" || ticket.status === "Closed" ? green : amber}33`, padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              {ticket.status === "Completed" || ticket.status === "Closed" ? <CheckCircle2 size={16} color={green} /> : <Clock size={16} color={amber} />}
              <p style={{ fontSize: "13px", fontWeight: 600, color: ticket.status === "Completed" || ticket.status === "Closed" ? green : amber, margin: 0, fontFamily: inter }}>
                {ticket.status === "Completed" || ticket.status === "Report Submitted" || ticket.status === "Closed" ? "Service report submitted." : "Service report not yet submitted. Available after technician completes work."}
              </p>
            </div>

            <SectionCard title="Work Summary" icon={<ClipboardCheck size={17} color={blue} />}>
              {[
                { label: "Root Cause", content: ticket.aiAnalysis?.reasoning ?? ticket.description ?? "Analysis pending technician report submission." },
                { label: "Fault Type", content: ticket.aiAnalysis?.faultType ?? "To be determined by technician on site." },
                { label: "Technician Notes", content: ticket.notes.length > 0 ? ticket.notes.join(" ") : "No notes added yet." },
              ].map(section => (
                <div key={section.label} style={{ marginBottom: "14px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>{section.label}</p>
                  <p style={{ fontSize: "13.5px", color: inkSec, fontFamily: inter, lineHeight: 1.55, margin: 0, borderLeft: `3px solid ${blue}`, paddingLeft: "10px" }}>{section.content}</p>
                  <Divider />
                </div>
              ))}
            </SectionCard>

            {/* Attachments */}
            <SectionCard title="Attachments" icon={<Paperclip size={17} color={blue} />}>
              {[
                { label: "SLA Report", size: "42 KB", available: true },
                { label: "Service Report", size: "118 KB", available: workflowStatus !== "awaiting_completion" },
                { label: "Completion Certificate", size: "28 KB", available: workflowStatus === "accepted" || workflowStatus === "closed" },
              ].map(doc => (
                <button key={doc.label} type="button" disabled={!doc.available} onClick={() => { if (doc.available) { mockDownload(`${doc.label.replace(/ /g, "_")}_${ticketId}.txt`); showToast(`✓ ${doc.label} downloaded.`); } }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 14px", backgroundColor: doc.available ? divider : "#F8FAFC", borderRadius: "12px", border: `1px solid ${doc.available ? border : "#E2E8F0"}`, cursor: doc.available ? "pointer" : "not-allowed", marginBottom: "8px", opacity: doc.available ? 1 : 0.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <FileText size={16} color={doc.available ? blue : inkFaint} />
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: doc.available ? ink : inkFaint, margin: "0 0 2px", fontFamily: inter }}>{doc.label}</p>
                      <p style={{ fontSize: "11px", color: inkMut, margin: 0, fontFamily: inter }}>{doc.size} · {doc.available ? "Available" : "Locked"}</p>
                    </div>
                  </div>
                  <Download size={16} color={doc.available ? blue : inkFaint} />
                </button>
              ))}
            </SectionCard>

            {/* Communication Thread */}
            <SectionCard title="Messages" icon={<MessageSquare size={17} color={blue} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px", maxHeight: "260px", overflowY: "auto" }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "org" ? "flex-end" : msg.from === "system" ? "center" : "flex-start" }}>
                    {msg.from === "system" ? (
                      <span style={{ fontSize: "11.5px", color: inkFaint, fontFamily: inter, fontStyle: "italic" }}>{msg.text}</span>
                    ) : (
                      <div style={{ maxWidth: "80%" }}>
                        <p style={{ fontSize: "10.5px", color: inkFaint, margin: "0 0 3px", fontFamily: inter }}>{msg.from === "org" ? "You" : "[Vendor]"} · {msg.time}</p>
                        <div style={{ backgroundColor: msg.from === "org" ? blue : divider, borderRadius: "14px", borderTopRightRadius: msg.from === "org" ? "4px" : "14px", borderTopLeftRadius: msg.from === "vendor" ? "4px" : "14px", padding: "10px 14px" }}>
                          <p style={{ fontSize: "13px", color: msg.from === "org" ? "white" : ink, margin: 0, fontFamily: inter }}>{msg.text}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Divider />
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendMessage()} placeholder="Message vendor..." style={{ flex: 1, height: "42px", borderRadius: "12px", border: `1px solid ${border}`, padding: "0 14px", fontSize: "13.5px", fontFamily: inter, color: ink, outline: "none" }} />
                <button type="button" onClick={handleSendMessage} style={{ width: "42px", height: "42px", borderRadius: "12px", background: `linear-gradient(135deg,${blue},${blueDark})`, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <Send size={17} color="white" />
                </button>
              </div>
            </SectionCard>
          </>
        )}

        {/* ═══ SLA TAB ═════════════════════════════════════════════════════════ */}
        {!loading && ticket && activeTab === "sla" && (
          <>
            {/* Live SLA countdown hero */}
            <div style={{ backgroundColor: liveSla.isBreached ? redT : card, borderRadius: "20px", border: `2px solid ${uc}33`, padding: "24px 20px", marginBottom: "16px", boxShadow: cardShadow }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Shield size={17} color={uc} /><h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: 0, fontFamily: inter }}>SLA Countdown</h2></div>
                <Pill label={slaLabel} color={uc} bg={`${uc}18`} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "34px", fontWeight: 800, fontFamily: inter, lineHeight: 1, color: uc, letterSpacing: "-0.03em" }}>{liveSla.remaining}</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: inkMut, fontFamily: inter, paddingBottom: "4px" }}>remaining</span>
              </div>
              <div style={{ height: "8px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden", marginBottom: "14px" }}>
                <div style={{ height: "100%", width: `${liveSla.progress}%`, backgroundColor: uc, borderRadius: "100px", transition: "width 0.5s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><p style={{ fontSize: "11px", color: inkMut, margin: "0 0 3px", fontFamily: inter }}>Response Target</p><p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>&lt; {ticket.slaResponseHrs}h</p></div>
                <div style={{ textAlign: "right" }}><p style={{ fontSize: "11px", color: inkMut, margin: "0 0 3px", fontFamily: inter }}>Resolution Target</p><p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>&lt; {ticket.slaResolutionHrs}h</p></div>
              </div>
            </div>

            {/* SLA Metrics grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {[
                { label: "Response Time", value: `${ticket.slaResponseHrs}h`, target: ticket.slaResponseHrs, color: green },
                { label: "Resolution Target", value: `${ticket.slaResolutionHrs}h`, target: ticket.slaResolutionHrs, color: ticket.slaStatus === "breached" ? red : blue },
                { label: "SLA Status", value: ticket.slaStatus.replace("_", " ").toUpperCase(), target: 0, color: ticket.slaStatus === "ok" ? green : ticket.slaStatus === "at_risk" ? amber : red },
                { label: "Priority", value: ticket.priority, target: 0, color: priorityColors.text },
              ].map(m => (
                <div key={m.label} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "14px 16px", boxShadow: cardShadow }}>
                  <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 6px", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</p>
                  <p style={{ fontSize: "18px", fontWeight: 800, color: m.color, margin: 0, fontFamily: inter }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Escalation card */}
            <SectionCard title="Escalation Status" icon={<AlertTriangle size={17} color={ticket.status === "Escalated" ? red : amber} />}>
              <InfoRow label="Current Level" value={<Pill label={ticket.status === "Escalated" ? "Escalated" : "Level 0 — No Escalation"} color={ticket.status === "Escalated" ? red : green} bg={ticket.status === "Escalated" ? redT : greenT} />} />
              <InfoRow label="Auto-Escalate At" value="75% time elapsed" />
              <InfoRow label="Vendor Notified" value={<Pill label={ticket.status === "Escalated" ? "Yes" : "No"} color={ticket.status === "Escalated" ? red : inkMut} bg={ticket.status === "Escalated" ? redT : divider} />} />
              <Divider />
              {workflowStatus !== "closed" && (
                <button type="button" onClick={() => setActiveModal("escalate")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 14px", backgroundColor: redT, borderRadius: "12px", border: `1px solid ${red}33`, cursor: "pointer" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: red, fontFamily: inter }}>Escalate Now</span>
                  <ChevronRight size={16} color={red} />
                </button>
              )}
            </SectionCard>

            {/* SLA History Chart */}
            <SectionCard title="SLA History (Last 6 Months)" icon={<BarChart2 size={17} color={blue} />}>
              <SLAMiniChart data={slaHistory.slice(0, 6).map(h => ({ month: h.month, compliance: h.compliance }))} />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                <div style={{ width: "12px", height: "2px", borderTop: `1.5px dashed ${amber}` }} />
                <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>90% SLA target</span>
              </div>
            </SectionCard>

            {/* AI Insights */}
            {ticket.aiAnalysis && (
              <div style={{ background: `linear-gradient(135deg,#1E3A8A 0%,${blue} 60%,${blueMid} 100%)`, borderRadius: "20px", padding: "20px", marginBottom: "16px", boxShadow: blueShadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <Sparkles size={17} color="white" />
                  <h2 style={{ fontSize: "15px", fontWeight: 800, color: "white", margin: 0, fontFamily: inter }}>AI SLA Insights</h2>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: inter, marginLeft: "auto" }}>10xDS Intelligence</span>
                </div>
                {[
                  { icon: Zap,          label: "Issue Summary",        text: `${ticket.aiAnalysis.faultType} detected. ${ticket.aiAnalysis.reasoning}`, color: "#67E8F9" },
                  { icon: Search,       label: "Root Cause",           text: `${ticket.aiAnalysis.faultType} (${Math.round(ticket.aiAnalysis.confidence * 100)}% confidence). Suggested skill: ${ticket.aiAnalysis.suggestedSkill}.`, color: "#FCD34D" },
                  { icon: CheckCircle2, label: "Recommended Action",   text: `Assign ${ticket.aiAnalysis.suggestedTechnicianName}. Estimated resolution: ${ticket.aiAnalysis.estimatedHours}h.`, color: "#86EFAC" },
                  { icon: Calendar,     label: "Next PM",              text: `Schedule preventive maintenance within 90 days. Estimated cost ₹12,000–18,000.`, color: "#C4B5FD" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <item.icon size={15} color={item.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", margin: "0 0 3px", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", margin: 0, fontFamily: inter, lineHeight: 1.5 }}>{item.text}</p>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: inter }}>AI Risk Level:</span>
                  <Pill label={ticket.aiAnalysis.severity} color={ticket.aiAnalysis.severity === "Critical" || ticket.aiAnalysis.severity === "High" ? red : ticket.aiAnalysis.severity === "Medium" ? amber : green} bg={ticket.aiAnalysis.severity === "Critical" || ticket.aiAnalysis.severity === "High" ? redT : ticket.aiAnalysis.severity === "Medium" ? amberT : greenT} />
                </div>
              </div>
            )}

            {/* Notification history */}
            <SectionCard title="Notifications & Alerts" icon={<Bell size={17} color={blue} />}>
              {[
                { icon: AlertTriangle, color: amber, label: "SLA At Risk Alert", desc: `Ticket ${ticketId} is approaching SLA deadline.`, time: "1h ago" },
                { icon: User, color: blue, label: "Technician Assigned", desc: `${tech?.name ?? ticket.assignedTechnicianName ?? "Technician"} assigned to this ticket.`, time: "2h ago" },
                { icon: Building2, color: purple, label: "Vendor Accepted", desc: `${vendor.name} accepted this service request.`, time: "3h ago" },
              ].map((n, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", padding: "12px 0", borderBottom: i < 2 ? `1px solid ${divider}` : "none" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: `${n.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><n.icon size={16} color={n.color} /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: "0 0 3px", fontFamily: inter }}>{n.label}</p>
                    <p style={{ fontSize: "12.5px", color: inkSec, margin: "0 0 3px", fontFamily: inter }}>{n.desc}</p>
                    <p style={{ fontSize: "11px", color: inkFaint, margin: 0, fontFamily: inter }}>{n.time}</p>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => navigate("/notifications")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", backgroundColor: divider, borderRadius: "12px", border: "none", cursor: "pointer", marginTop: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: blue, fontFamily: inter }}>View All Notifications</span>
                <ChevronRight size={16} color={blue} />
              </button>
            </SectionCard>

            {/* History */}
            <SectionCard title="Ticket History" icon={<History size={17} color={purple} />}>
              {timeline.slice(0, 5).map((step, i) => (
                <div key={step.id} style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: i < 4 ? `1px solid ${divider}` : "none" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: step.color, flexShrink: 0, marginTop: "5px" }} />
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: "0 0 2px", fontFamily: inter }}>{step.status}</p>
                    <p style={{ fontSize: "12px", color: inkSec, margin: "0 0 2px", fontFamily: inter }}>{step.desc}</p>
                    <p style={{ fontSize: "11px", color: inkFaint, margin: 0, fontFamily: inter }}>{step.time}</p>
                  </div>
                </div>
              ))}
            </SectionCard>
          </>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </MobileLayout>
  );
}
