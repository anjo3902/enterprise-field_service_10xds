import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { MobileLayout } from "./ui/MobileLayout";
import {
  ArrowLeft, Shield, Clock, User, CheckCircle2, AlertTriangle, MapPin,
  FileText, Star, ThumbsUp, ThumbsDown, Download, Award, MessageSquare,
  ClipboardCheck, XCircle, ChevronRight, Package, TrendingUp, Wrench,
  Building2, BadgeCheck
} from "lucide-react";
import { useVendor } from "../contexts/VendorContext";
import { useSLACountdown, buildTimelineFromTicket } from "../utils/slaAdapter";

// ─── Design tokens ────────────────────────────────────────────────────────────
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const ink = "#0F172A";
const inkSec = "#475569";
const inkMut = "#64748B";
const inkFaint = "#94A3B8";
const blue = "#2563EB";
const blueMid = "#3B82F6";
const blueTint = "#EFF6FF";
const blueDark = "#1D4ED8";
const green = "#16A34A";
const greenT = "#DCFCE7";
const amber = "#D97706";
const amberT = "#FFFBEB";
const red = "#DC2626";
const redT = "#FEF2F2";
const purple = "#7C3AED";
const purpleT = "#F5F3FF";
const divider = "#F1F5F9";
const inter = "'Inter','Roboto',sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)";
const blueShadow = "0 4px 20px rgba(37,99,235,0.22),0 1px 4px rgba(0,0,0,0.08)";
const greenShadow = "0 4px 20px rgba(22,163,74,0.25),0 1px 4px rgba(0,0,0,0.08)";

// ─── Customer Workflow State ──────────────────────────────────────────────────
type CustomerWorkflowStatus =
  | "awaiting_completion"   // ticket not yet completed by vendor
  | "pending_review"        // vendor marked complete, customer must accept/reject
  | "accepted"              // customer accepted — can now rate & download
  | "rejected"              // customer rejected — ticket re-opened
  | "closed";               // customer accepted + rated + ticket officially closed

const URGENCY_COLOR: Record<string, string> = {
  critical: red, warning: amber, ok: green, breached: red,
};

// ─── Star Rating component ────────────────────────────────────────────────────
function StarRating({
  value, onChange, size = 28
}: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s} type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
        >
          <Star
            size={size}
            color={s <= (hovered || value) ? amber : "#CBD5E1"}
            fill={s <= (hovered || value) ? amber : "none"}
            style={{ transition: "color 0.12s" }}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: "'Inter', sans-serif" }}>9:41</span>
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

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type = "success" }: { msg: string; type?: "success" | "error" | "info" }) {
  const colors = { success: green, error: red, info: blue };
  const shadows = { success: greenShadow, error: "0 4px 20px rgba(220,38,38,0.25)", info: blueShadow };
  return (
    <div style={{
      position: "fixed", bottom: "110px", left: "20px", right: "20px",
      backgroundColor: colors[type], color: "white", padding: "14px 20px",
      borderRadius: "14px", fontSize: "13.5px", fontWeight: 700, fontFamily: inter,
      boxShadow: shadows[type], zIndex: 2000, display: "flex", alignItems: "center", gap: "10px",
    }}>
      {type === "success" && <CheckCircle2 size={18} />}
      {type === "error" && <XCircle size={18} />}
      {msg}
    </div>
  );
}

// ─── Simulate download (mock) ─────────────────────────────────────────────────
function mockDownload(filename: string) {
  // In production this would call an API. Here we simulate with a blob.
  const content = `10xDS Enterprise Service Management\n${filename}\nGenerated: ${new Date().toLocaleString()}\nThis is a mock report for demonstration purposes.`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function SLADetailsScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const ticketId = id || "";
  const vendor = useVendor();

  // ── Local customer workflow state (frontend only, mock) ──
  const [workflowStatus, setWorkflowStatus] = useState<CustomerWorkflowStatus>(() => {
    const t = vendor.getTicketById(ticketId);
    if (!t) return "awaiting_completion";
    if (t.status === "Closed") return "closed";
    if (t.status === "Completed") return "pending_review";
    return "awaiting_completion";
  });

  // Active modal
  type ModalType =
    | "accept_confirm"
    | "reject_confirm"
    | "rate_technician"
    | "rate_vendor"
    | "feedback"
    | "download_menu"
    | "completion_cert"
    | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Rating state
  const [techRating, setTechRating] = useState(0);
  const [vendorRating, setVendorRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [certVisible, setCertVisible] = useState(false);

  const ticket = vendor.getTicketById(ticketId);
  const tech = ticket?.assignedTechnicianId
    ? vendor.technicians.find(t => t.id === ticket.assignedTechnicianId)
    : null;

  // Live SLA countdown using unified hook
  const liveSla = useSLACountdown(
    ticket?.slaDeadline || new Date().toISOString(),
    ticket?.slaStatus,
    ticket?.status,
    ticket?.slaResolutionHrs
  );

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Toast helper ──
  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
  };

  if (!ticket) {
    return (
      <MobileLayout>
        <StatusBar />
        <div style={{ background: `linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <button type="button" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}>
              <ArrowLeft size={15} color="white" /> Back
            </button>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: inter, margin: 0 }}>SLA Tracker</h1>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "20px", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <AlertTriangle size={32} color={red} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 8px", fontFamily: inter }}>Ticket Not Found</h2>
          <p style={{ fontSize: "14px", color: inkMut, textAlign: "center", margin: "0 0 24px", fontFamily: inter, lineHeight: 1.5 }}>
            The ticket ID <strong style={{ color: ink }}>{ticketId}</strong> does not exist.
          </p>
          <button type="button" onClick={() => navigate(-1)} style={{ height: "48px", padding: "0 24px", borderRadius: "12px", backgroundColor: blue, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
            Return to Tracker
          </button>
        </div>
      </MobileLayout>
    );
  }

  // ── SLA computations ──
  const slaRemaining = liveSla.remaining;
  const slaProgress = liveSla.progress;
  const slaUrgency = liveSla.urgency;
  const slaResponseTarget = `< ${ticket.slaResponseHrs}h`;
  const slaResolutionTarget = `< ${ticket.slaResolutionHrs}h`;
  const slaComplianceStatus = liveSla.isBreached ? "SLA Breached"
    : ticket.slaStatus === "at_risk" ? "At Risk" : "Within SLA";
  const uc = URGENCY_COLOR[slaUrgency] || green;
  const createdAt = new Date(ticket.createdAt).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });

  // Timeline
  const timeline = buildTimelineFromTicket(ticket);

  // ── Action Handlers ──
  const handleAccept = () => {
    setIsLoading(true);
    setTimeout(() => {
      vendor.escalateTicket(ticketId, ""); // reuse to mark — in production would call acceptCompletion()
      setWorkflowStatus("accepted");
      setIsLoading(false);
      setActiveModal(null);
      showToast("✓ Service completion accepted. Please rate the service.");
    }, 800);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) { showToast("Please provide a reason for rejection.", "error"); return; }
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
    if (rating === 0) { showToast("Please select a star rating before submitting.", "error"); return; }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setActiveModal(null);
      showToast(`✓ ${type === "tech" ? "Technician" : "Vendor"} rated ${rating}/5 stars.`);
      // If both rated, move to closed
      if (type === "tech" && vendorRating > 0) setWorkflowStatus("closed");
      if (type === "vendor" && techRating > 0) setWorkflowStatus("closed");
    }, 600);
  };

  const handleSubmitFeedback = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setActiveModal(null);
      showToast("✓ Service feedback submitted successfully.");
    }, 600);
  };

  const toggleFeedbackTag = (tag: string) => {
    setFeedbackTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const FEEDBACK_TAGS = ["On Time", "Professional", "Quick Fix", "Excellent Work", "Communication", "Needs Improvement", "Delayed", "Re-Work Required"];
  const REJECT_REASONS = ["Work is incomplete", "Issue still persists", "Wrong service performed", "Technician did not arrive", "Parts need replacement", "Requires follow-up"];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <MobileLayout
      showBottomNav={false}
      backgroundColor={bg}
      header={
        <>
          <StatusBar />
          <div style={{ background: `linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <button type="button" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}>
                <ArrowLeft size={15} color="white" /> Back
              </button>
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "100px", padding: "4px 10px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "white", fontFamily: inter }}>{ticket.priority}</span>
                </div>
                <div style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "100px", padding: "4px 10px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "white", fontFamily: inter }}>{ticketId}</span>
                </div>
              </div>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, margin: "0 0 6px" }}>{ticket.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontFamily: inter }}>{ticket.category}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>•</span>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontFamily: inter }}>{ticket.status}</span>
            </div>
          </div>
        </>
      }
    >
      {/* ──── Toast ──── */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div style={{ padding: "20px 16px", paddingBottom: "100px" }}>

        {/* ══ COMPLETION BANNER (pending_review state) ══ */}
        {workflowStatus === "pending_review" && (
          <div style={{ backgroundColor: card, borderRadius: "20px", border: `2px solid ${green}`, padding: "20px", marginBottom: "20px", boxShadow: "0 4px 24px rgba(22,163,74,0.12)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: greenT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ClipboardCheck size={24} color={green} />
              </div>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 800, color: ink, margin: "0 0 3px", fontFamily: inter }}>Service Completed</p>
                <p style={{ fontSize: "12.5px", color: inkMut, margin: 0, fontFamily: inter }}>Vendor has marked this service as complete. Your confirmation is required.</p>
              </div>
            </div>
            <div style={{ backgroundColor: divider, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12.5px", color: inkMut, fontFamily: inter }}>Completed By</span>
                <span style={{ fontSize: "12.5px", fontWeight: 700, color: ink, fontFamily: inter }}>{tech?.name ?? ticket.assignedTechnicianName ?? "Technician"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12.5px", color: inkMut, fontFamily: inter }}>Completion Time</span>
                <span style={{ fontSize: "12.5px", fontWeight: 700, color: ink, fontFamily: inter }}>{new Date(ticket.updatedAt).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12.5px", color: inkMut, fontFamily: inter }}>SLA Compliance</span>
                <span style={{ fontSize: "12.5px", fontWeight: 700, color: liveSla.isBreached ? red : green, fontFamily: inter }}>{liveSla.isBreached ? "Breached" : "Within SLA"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={() => setActiveModal("reject_confirm")} style={{ flex: 1, height: "48px", borderRadius: "13px", backgroundColor: redT, border: `1px solid ${red}40`, color: red, fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                <ThumbsDown size={16} /> Reject
              </button>
              <button type="button" onClick={() => setActiveModal("accept_confirm")} style={{ flex: 2, height: "48px", borderRadius: "13px", background: `linear-gradient(135deg,${green},#15803D)`, border: "none", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", boxShadow: greenShadow }}>
                <ThumbsUp size={16} /> Accept Completion
              </button>
            </div>
          </div>
        )}

        {/* ══ REJECTION BANNER ══ */}
        {workflowStatus === "rejected" && (
          <div style={{ backgroundColor: redT, borderRadius: "20px", border: `1.5px solid ${red}30`, padding: "18px 20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <XCircle size={22} color={red} />
              <div>
                <p style={{ fontSize: "14px", fontWeight: 800, color: red, margin: "0 0 2px", fontFamily: inter }}>Completion Rejected</p>
                <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>Vendor has been notified. Awaiting corrective action.</p>
              </div>
            </div>
          </div>
        )}

        {/* ══ ACCEPTED / CLOSED BANNER ══ */}
        {(workflowStatus === "accepted" || workflowStatus === "closed") && (
          <div style={{ backgroundColor: greenT, borderRadius: "20px", border: `1.5px solid ${green}30`, padding: "18px 20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CheckCircle2 size={22} color={green} />
              <div>
                <p style={{ fontSize: "14px", fontWeight: 800, color: green, margin: "0 0 2px", fontFamily: inter }}>
                  {workflowStatus === "closed" ? "Service Closed & Rated" : "Completion Accepted"}
                </p>
                <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>
                  {workflowStatus === "closed"
                    ? "Thank you for your feedback. Ticket officially closed."
                    : "Please rate the technician and vendor to close this ticket."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ POST-ACCEPTANCE: Rating & Actions ══ */}
        {(workflowStatus === "accepted" || workflowStatus === "closed") && (
          <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "20px", boxShadow: cardShadow }}>
            <p style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 16px", fontFamily: inter }}>Rate & Review Service</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              {/* Rate Technician */}
              <button type="button" onClick={() => setActiveModal("rate_technician")} style={{ padding: "14px 10px", borderRadius: "14px", backgroundColor: techRating > 0 ? amberT : divider, border: `1.5px solid ${techRating > 0 ? amber : border}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <Wrench size={20} color={techRating > 0 ? amber : inkSec} />
                <span style={{ fontSize: "12px", fontWeight: 700, color: techRating > 0 ? amber : ink, fontFamily: inter }}>Rate Technician</span>
                {techRating > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <Star size={12} color={amber} fill={amber} />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: amber, fontFamily: inter }}>{techRating}/5</span>
                  </div>
                )}
              </button>
              {/* Rate Vendor */}
              <button type="button" onClick={() => setActiveModal("rate_vendor")} style={{ padding: "14px 10px", borderRadius: "14px", backgroundColor: vendorRating > 0 ? purpleT : divider, border: `1.5px solid ${vendorRating > 0 ? purple : border}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <Building2 size={20} color={vendorRating > 0 ? purple : inkSec} />
                <span style={{ fontSize: "12px", fontWeight: 700, color: vendorRating > 0 ? purple : ink, fontFamily: inter }}>Rate Vendor</span>
                {vendorRating > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <Star size={12} color={purple} fill={purple} />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: purple, fontFamily: inter }}>{vendorRating}/5</span>
                  </div>
                )}
              </button>
            </div>
            {/* Service Feedback */}
            <button type="button" onClick={() => setActiveModal("feedback")} style={{ width: "100%", padding: "14px", borderRadius: "14px", backgroundColor: divider, border: `1.5px solid ${border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
              <MessageSquare size={18} color={inkSec} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, flex: 1, textAlign: "left" }}>
                {feedbackText ? "Feedback Submitted ✓" : "Add Service Feedback"}
              </span>
              <ChevronRight size={16} color={inkFaint} />
            </button>
          </div>
        )}

        {/* ══ DOWNLOAD REPORTS ══ */}
        {(workflowStatus === "accepted" || workflowStatus === "closed") && (
          <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "20px", boxShadow: cardShadow }}>
            <p style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 14px", fontFamily: inter }}>Documents & Reports</p>
            {[
              { icon: FileText, label: "SLA Report", sub: "Full SLA compliance summary", color: blue, file: `SLA_Report_${ticketId}.txt` },
              { icon: Package, label: "Service Report", sub: "Technician work summary", color: purple, file: `Service_Report_${ticketId}.txt` },
              { icon: Award, label: "Completion Certificate", sub: "Official service completion document", color: green, file: null },
            ].map((item, i) => (
              <button
                key={i} type="button"
                onClick={() => item.file ? mockDownload(item.file) : setActiveModal("completion_cert")}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "14px 0", borderBottom: i < 2 ? `1px solid ${divider}` : "none", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: item.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <item.icon size={18} color={item.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 3px", fontFamily: inter }}>{item.label}</p>
                  <p style={{ fontSize: "12px", color: inkMut, margin: 0, fontFamily: inter }}>{item.sub}</p>
                </div>
                <Download size={16} color={inkFaint} />
              </button>
            ))}
          </div>
        )}

        {/* ══ SLA COUNTDOWN ══ */}
        <div style={{ backgroundColor: card, borderRadius: "20px", boxShadow: cardShadow, border: `1px solid ${border}`, padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={18} color={uc} />
              <span style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter }}>SLA Countdown</span>
            </div>
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: uc, backgroundColor: uc + "1A", borderRadius: "100px", padding: "4px 10px" }}>
              {slaComplianceStatus}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", marginBottom: "16px" }}>
            <span style={{ fontSize: "32px", fontWeight: 800, color: uc, fontFamily: inter, lineHeight: 1, letterSpacing: "-0.03em" }}>{slaRemaining}</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: inkMut, fontFamily: inter, paddingBottom: "4px" }}>remaining</span>
          </div>
          <div style={{ height: "8px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden", marginBottom: "16px" }}>
            <div style={{ height: "100%", width: `${slaProgress}%`, backgroundColor: uc, borderRadius: "100px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${border}`, paddingTop: "16px" }}>
            <div>
              <p style={{ fontSize: "12px", color: inkMut, margin: "0 0 6px", fontFamily: inter }}>Response Target</p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{slaResponseTarget}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "12px", color: inkMut, margin: "0 0 6px", fontFamily: inter }}>Resolution Target</p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{slaResolutionTarget}</p>
            </div>
          </div>
        </div>

        {/* ══ ASSIGNED TECHNICIAN ══ */}
        <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 16px", fontFamily: inter }}>Assigned Technician</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `linear-gradient(135deg,${blue},${blueDark})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <User size={20} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 4px", fontFamily: inter }}>{tech ? tech.name : (ticket.assignedTechnicianName ?? "Unassigned")}</p>
              <p style={{ fontSize: "13px", color: inkSec, margin: 0, fontFamily: inter }}>{tech ? tech.role : "Field Engineer"} • {tech ? tech.availability : "Unknown"}</p>
            </div>
          </div>
        </div>

        {/* ══ LOCATION ══ */}
        <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 16px", fontFamily: inter }}>Location & Contact</h2>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={16} color={inkSec} />
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 4px", fontFamily: inter }}>{ticket.location}</p>
              <p style={{ fontSize: "12.5px", color: inkMut, margin: 0, fontFamily: inter }}>Medical Wing, North Wing</p>
            </div>
          </div>
        </div>

        {/* ══ SERVICE TIMELINE ══ */}
        <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <TrendingUp size={17} color={blue} />
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: 0, fontFamily: inter }}>Service Timeline</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {timeline.map((evt, i) => {
              const isLast = i === timeline.length - 1;
              return (
                <div key={evt.id} style={{ display: "flex", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: evt.tint, border: `1.5px solid ${evt.color}30`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, flexShrink: 0 }}>
                      {evt.state === "done" && <CheckCircle2 size={13} color={evt.color} />}
                      {evt.state === "current" && <Clock size={13} color={evt.color} />}
                      {evt.state === "pending" && <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: inkFaint }} />}
                    </div>
                    {!isLast && <div style={{ width: "2px", flex: 1, backgroundColor: evt.state === "pending" ? divider : evt.color + "30", marginTop: "2px", marginBottom: "2px", minHeight: "20px" }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: "4px", paddingBottom: isLast ? 0 : "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                      <p style={{ fontSize: "13px", fontWeight: evt.state === "pending" ? 500 : 700, color: evt.state === "pending" ? inkMut : ink, margin: 0, fontFamily: inter }}>{evt.status}</p>
                      <span style={{ fontSize: "11px", color: inkFaint, fontFamily: inter }}>{evt.time}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: inkMut, margin: 0, fontFamily: inter, lineHeight: 1.4 }}>{evt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ CUSTOMER CONFIRMATION (completed state, not yet reviewed) ══ */}
        {workflowStatus === "awaiting_completion" && (
          <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "20px", boxShadow: cardShadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Clock size={17} color={amber} />
              <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: 0, fontFamily: inter }}>Awaiting Completion</h2>
            </div>
            <p style={{ fontSize: "13px", color: inkMut, margin: "0 0 14px", fontFamily: inter, lineHeight: 1.5 }}>
              This service is still in progress. Once the technician completes and the vendor verifies, you will receive a notification to confirm the service.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: amberT, borderRadius: "12px", padding: "12px 14px", border: `1px solid ${amber}30` }}>
              <AlertTriangle size={16} color={amber} />
              <span style={{ fontSize: "12.5px", fontWeight: 600, color: amber, fontFamily: inter }}>No action required yet.</span>
            </div>
          </div>
        )}

      </div>

      {/* ════════════════ MODALS ════════════════ */}

      {/* ── Accept Confirm ── */}
      {activeModal === "accept_confirm" && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", zIndex: 999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => !isLoading && setActiveModal(null)}>
          <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 36px", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "40px", height: "4px", backgroundColor: divider, borderRadius: "2px", margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: greenT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ThumbsUp size={22} color={green} />
              </div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: 800, color: ink, margin: "0 0 3px", fontFamily: inter }}>Accept Completion?</h2>
                <p style={{ fontSize: "13px", color: inkMut, margin: 0, fontFamily: inter }}>This confirms the service was completed to satisfaction.</p>
              </div>
            </div>
            <div style={{ backgroundColor: divider, borderRadius: "14px", padding: "14px 16px", marginBottom: "24px" }}>
              {[
                ["Ticket", ticketId],
                ["Technician", tech?.name ?? ticket.assignedTechnicianName ?? "—"],
                ["Service", ticket.title],
                ["SLA Status", liveSla.isBreached ? "Breached" : "Within SLA"],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", color: inkMut, fontFamily: inter }}>{label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" onClick={() => setActiveModal(null)} disabled={isLoading} style={{ flex: 1, height: "48px", borderRadius: "14px", backgroundColor: divider, border: `1px solid ${border}`, color: inkSec, fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleAccept} disabled={isLoading} style={{ flex: 2, height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${green},#15803D)`, border: "none", color: "white", fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: isLoading ? "not-allowed" : "pointer", boxShadow: greenShadow, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {isLoading ? <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 1s linear infinite" }} /> : <><CheckCircle2 size={16} /> Confirm Acceptance</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Confirm ── */}
      {activeModal === "reject_confirm" && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", zIndex: 999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => !isLoading && setActiveModal(null)}>
          <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 36px", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "40px", height: "4px", backgroundColor: divider, borderRadius: "2px", margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ThumbsDown size={20} color={red} />
              </div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter }}>Reject Completion</h2>
                <p style={{ fontSize: "13px", color: inkMut, margin: 0, fontFamily: inter }}>Select a reason to notify the vendor.</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              {REJECT_REASONS.map(reason => (
                <button key={reason} type="button" onClick={() => setRejectReason(reason)} style={{ width: "100%", padding: "13px 16px", borderRadius: "12px", border: `1.5px solid ${rejectReason === reason ? red : border}`, backgroundColor: rejectReason === reason ? redT : card, color: rejectReason === reason ? red : ink, fontSize: "13.5px", fontWeight: rejectReason === reason ? 700 : 500, fontFamily: inter, cursor: "pointer", textAlign: "left" }}>
                  {reason}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1, height: "48px", borderRadius: "14px", backgroundColor: divider, border: `1px solid ${border}`, color: inkSec, fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleReject} disabled={isLoading || !rejectReason} style={{ flex: 2, height: "48px", borderRadius: "14px", backgroundColor: rejectReason ? red : inkFaint, border: "none", color: "white", fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: !rejectReason || isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {isLoading ? <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 1s linear infinite" }} /> : <><XCircle size={16} /> Confirm Rejection</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rate Technician ── */}
      {activeModal === "rate_technician" && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", zIndex: 999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => !isLoading && setActiveModal(null)}>
          <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 36px", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "40px", height: "4px", backgroundColor: divider, borderRadius: "2px", margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: `linear-gradient(135deg,${blue},${blueDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={22} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter }}>Rate Technician</h2>
                <p style={{ fontSize: "13px", color: inkMut, margin: 0, fontFamily: inter }}>{tech?.name ?? ticket.assignedTechnicianName ?? "Technician"}</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <StarRating value={techRating} onChange={setTechRating} size={36} />
            </div>
            <p style={{ textAlign: "center", fontSize: "13px", color: inkMut, margin: "0 0 24px", fontFamily: inter }}>
              {techRating === 0 ? "Tap to rate" : techRating === 5 ? "Outstanding! 🌟" : techRating >= 4 ? "Very Good" : techRating === 3 ? "Satisfactory" : techRating === 2 ? "Needs Improvement" : "Poor"}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1, height: "48px", borderRadius: "14px", backgroundColor: divider, border: `1px solid ${border}`, color: inkSec, fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={() => handleSubmitRating("tech")} disabled={isLoading || techRating === 0} style={{ flex: 2, height: "48px", borderRadius: "14px", background: techRating > 0 ? `linear-gradient(135deg,${blue},${blueDark})` : inkFaint, border: "none", color: "white", fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: techRating === 0 || isLoading ? "not-allowed" : "pointer", boxShadow: techRating > 0 ? blueShadow : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {isLoading ? <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 1s linear infinite" }} /> : <><Star size={16} /> Submit Rating</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rate Vendor ── */}
      {activeModal === "rate_vendor" && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", zIndex: 999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => !isLoading && setActiveModal(null)}>
          <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 36px", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "40px", height: "4px", backgroundColor: divider, borderRadius: "2px", margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: `linear-gradient(135deg,${purple},#6D28D9)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={22} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter }}>Rate Vendor</h2>
                <p style={{ fontSize: "13px", color: inkMut, margin: 0, fontFamily: inter }}>{vendor.vendor?.name ?? "Service Vendor"}</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <StarRating value={vendorRating} onChange={setVendorRating} size={36} />
            </div>
            <p style={{ textAlign: "center", fontSize: "13px", color: inkMut, margin: "0 0 24px", fontFamily: inter }}>
              {vendorRating === 0 ? "Tap to rate" : vendorRating === 5 ? "Excellent Vendor! 🌟" : vendorRating >= 4 ? "Very Reliable" : vendorRating === 3 ? "Satisfactory" : vendorRating === 2 ? "Below Expectations" : "Unsatisfactory"}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1, height: "48px", borderRadius: "14px", backgroundColor: divider, border: `1px solid ${border}`, color: inkSec, fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={() => handleSubmitRating("vendor")} disabled={isLoading || vendorRating === 0} style={{ flex: 2, height: "48px", borderRadius: "14px", background: vendorRating > 0 ? `linear-gradient(135deg,${purple},#6D28D9)` : inkFaint, border: "none", color: "white", fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: vendorRating === 0 || isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {isLoading ? <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 1s linear infinite" }} /> : <><Star size={16} /> Submit Rating</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Service Feedback ── */}
      {activeModal === "feedback" && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", zIndex: 999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => !isLoading && setActiveModal(null)}>
          <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 36px", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)", maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "40px", height: "4px", backgroundColor: divider, borderRadius: "2px", margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={20} color={blue} />
              </div>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: ink, margin: 0, fontFamily: inter }}>Service Feedback</h2>
            </div>
            {/* Tags */}
            <p style={{ fontSize: "12px", fontWeight: 700, color: inkSec, margin: "0 0 10px", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>Select All That Apply</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
              {FEEDBACK_TAGS.map(tag => {
                const selected = feedbackTags.includes(tag);
                return (
                  <button key={tag} type="button" onClick={() => toggleFeedbackTag(tag)} style={{ padding: "7px 14px", borderRadius: "100px", border: `1.5px solid ${selected ? blue : border}`, backgroundColor: selected ? blueTint : card, color: selected ? blue : inkSec, fontSize: "12.5px", fontWeight: selected ? 700 : 500, fontFamily: inter, cursor: "pointer" }}>
                    {tag}
                  </button>
                );
              })}
            </div>
            {/* Text area */}
            <p style={{ fontSize: "12px", fontWeight: 700, color: inkSec, margin: "0 0 8px", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>Additional Comments</p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="Share your experience with this service..."
              rows={4}
              style={{ width: "100%", borderRadius: "14px", border: `1.5px solid ${border}`, padding: "14px", fontSize: "14px", fontFamily: inter, color: ink, backgroundColor: bg, resize: "none", outline: "none", boxSizing: "border-box", marginBottom: "20px" }}
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1, height: "48px", borderRadius: "14px", backgroundColor: divider, border: `1px solid ${border}`, color: inkSec, fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleSubmitFeedback} disabled={isLoading} style={{ flex: 2, height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${blue},${blueDark})`, border: "none", color: "white", fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: blueShadow, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {isLoading ? <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 1s linear infinite" }} /> : <><MessageSquare size={16} /> Submit Feedback</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Completion Certificate ── */}
      {activeModal === "completion_cert" && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.7)", zIndex: 999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => setActiveModal(null)}>
          <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 36px", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "40px", height: "4px", backgroundColor: divider, borderRadius: "2px", margin: "0 auto 20px" }} />

            {/* Certificate header */}
            <div style={{ background: `linear-gradient(135deg,${blue},${blueDark})`, borderRadius: "20px", padding: "24px 20px", marginBottom: "20px", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "60px", backgroundColor: "rgba(255,255,255,0.06)" }} />
              <div style={{ position: "absolute", bottom: "-30px", left: "-30px", width: "160px", height: "160px", borderRadius: "80px", backgroundColor: "rgba(255,255,255,0.04)" }} />
              <div style={{ width: "64px", height: "64px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", position: "relative" }}>
                <BadgeCheck size={32} color="white" />
              </div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: inter, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Completion Certificate</p>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "white", margin: "0 0 4px", fontFamily: inter, letterSpacing: "-0.02em" }}>Service Complete</h2>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", margin: 0, fontFamily: inter }}>{ticketId}</p>
            </div>

            {/* Certificate details */}
            <div style={{ backgroundColor: divider, borderRadius: "16px", padding: "18px", marginBottom: "20px" }}>
              {[
                ["Service", ticket.title],
                ["Customer", ticket.customerName],
                ["Technician", tech?.name ?? ticket.assignedTechnicianName ?? "—"],
                ["Category", ticket.category],
                ["Location", ticket.location],
                ["Completed On", new Date(ticket.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
                ["SLA Compliance", liveSla.isBreached ? "⚠ Breached" : "✓ Within SLA"],
                ["Certificate ID", `CERT-${ticketId}-${Date.now().toString(36).toUpperCase()}`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", marginBottom: "10px", borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontSize: "12.5px", color: inkMut, fontFamily: inter }}>{label}</span>
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: ink, fontFamily: inter, textAlign: "right", maxWidth: "55%" }}>{val}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <CheckCircle2 size={16} color={green} />
                <span style={{ fontSize: "12.5px", fontWeight: 700, color: green, fontFamily: inter }}>Digitally Verified by 10xDS ESM</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1, height: "48px", borderRadius: "14px", backgroundColor: divider, border: `1px solid ${border}`, color: inkSec, fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Close</button>
              <button type="button" onClick={() => { mockDownload(`Completion_Certificate_${ticketId}.txt`); showToast("✓ Certificate downloaded."); }} style={{ flex: 2, height: "48px", borderRadius: "14px", background: `linear-gradient(135deg,${blue},${blueDark})`, border: "none", color: "white", fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: blueShadow, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Download size={16} /> Download Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </MobileLayout>
  );
}
