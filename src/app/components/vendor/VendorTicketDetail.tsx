import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { useVendor, VendorTicket, VendorTechnician, Priority } from "../../contexts/VendorContext";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useSLACountdown } from "../../utils/slaEngine";
import {
  Clock, MapPin, Building2, User, AlertTriangle, MessageSquare, 
  CheckCircle2, X, FileText, Calendar, ArrowRight, Bot, Shield,
  ClipboardList, Edit2, XCircle
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueTint = "#EFF6FF";
const blueDark = "#1E40AF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const orange   = "#EA580C";
const orangeT  = "#FFF7ED";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const purple   = "#7C3AED";
const purpleT  = "#F5F3FF";
const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// getSLARemaining removed — using unified slaEngine.useSLACountdown hook

// ─── Modals ──────────────────────────────────────────────────────────────────
function AssignModal({ technicians, onClose, onAssign }: { technicians: VendorTechnician[]; onClose: () => void; onAssign: (tech: VendorTechnician) => void; }) {
  const [search, setSearch] = useState("");
  const filtered = technicians.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))).sort((a, b) => {
    const order = { "available": 1, "on_job": 2, "unavailable": 3, "off": 4 };
    return order[a.availability] - order[b.availability];
  });

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.65)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "40px", maxHeight: "80%", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>Assign Technician</h3>
          <button type="button" onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "100px", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} color={inkMut} /></button>
        </div>
        <input type="text" placeholder="Search name or skill..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", height: "44px", borderRadius: "12px", border: `1px solid ${border}`, padding: "0 16px", fontSize: "14px", fontFamily: inter, marginBottom: "16px" }} />
        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(tech => (
            <div key={tech.id} onClick={() => tech.availability !== "off" && onAssign(tech)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: bg, opacity: tech.availability === "off" ? 0.5 : 1, cursor: tech.availability === "off" ? "not-allowed" : "pointer" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "20px", backgroundColor: tech.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: inter }}>{tech.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter }}>{tech.name}</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: tech.availability === "available" ? green : tech.availability === "on_job" ? blue : inkMut, fontFamily: inter, backgroundColor: tech.availability === "available" ? greenT : tech.availability === "on_job" ? blueTint : divider, padding: "2px 6px", borderRadius: "4px" }}>{tech.availability.replace("_", " ").toUpperCase()}</span>
                </div>
                <div style={{ fontSize: "12px", color: inkSec, fontFamily: inter, marginBottom: "4px" }}>{tech.role}</div>
                <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>{tech.activeJobCount} active jobs · {tech.skills.slice(0,2).join(", ")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModifyModal({ ticket, onClose, onApply }: { ticket: VendorTicket; onClose: () => void; onApply: (prio: Priority, cat: string, note: string) => void; }) {
  const [priority, setPriority] = useState<Priority>(ticket.priority);
  const [category, setCategory] = useState(ticket.category);
  const [note, setNote] = useState("");

  const priorities: Priority[] = ["Critical", "High", "Medium", "Low"];
  
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.65)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "40px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>Modify & Approve</h3>
          <button type="button" onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "100px", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} color={inkMut} /></button>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter, display: "block", marginBottom: "8px" }}>Priority</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {priorities.map(p => (
              <button key={p} type="button" onClick={() => setPriority(p)} style={{ flex: 1, padding: "10px 0", borderRadius: "8px", border: `1px solid ${priority === p ? blue : border}`, backgroundColor: priority === p ? blueTint : bg, color: priority === p ? blue : ink, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>{p}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter, display: "block", marginBottom: "8px" }}>Category</label>
          <input type="text" value={category} onChange={e => setCategory(e.target.value)} style={{ width: "100%", height: "44px", borderRadius: "8px", border: `1px solid ${border}`, padding: "0 12px", fontSize: "14px", fontFamily: inter, boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: "24px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter, display: "block", marginBottom: "8px" }}>Modification Notes</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for modification..." style={{ width: "100%", height: "80px", borderRadius: "8px", border: `1px solid ${border}`, padding: "12px", fontSize: "14px", fontFamily: inter, resize: "none", boxSizing: "border-box" }} />
        </div>
        <button type="button" onClick={() => onApply(priority, category, note)} style={{ width: "100%", height: "48px", borderRadius: "12px", backgroundColor: amber, color: "white", border: "none", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
          Confirm Modification
        </button>
      </div>
    </div>
  );
}

function RejectModal({ onClose, onReject }: { onClose: () => void; onReject: (reason: string, notes: string) => void; }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const reasons = ["Not Covered by Contract", "Requires Customer Approval", "Spam/Duplicate", "Out of Scope"];
  
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.65)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "40px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: red, margin: 0, fontFamily: inter }}>Reject Ticket</h3>
          <button type="button" onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "100px", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} color={inkMut} /></button>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter, display: "block", marginBottom: "8px" }}>Rejection Reason</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {reasons.map(r => (
              <button key={r} type="button" onClick={() => setReason(r)} style={{ padding: "12px", borderRadius: "8px", border: `1px solid ${reason === r ? red : border}`, backgroundColor: reason === r ? redT : bg, color: reason === r ? red : ink, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer", textAlign: "left" }}>{r}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: "24px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter, display: "block", marginBottom: "8px" }}>Additional Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Provide more details..." style={{ width: "100%", height: "80px", borderRadius: "8px", border: `1px solid ${border}`, padding: "12px", fontSize: "14px", fontFamily: inter, resize: "none", boxSizing: "border-box" }} />
        </div>
        <button type="button" disabled={!reason} onClick={() => onReject(reason, notes)} style={{ width: "100%", height: "48px", borderRadius: "12px", backgroundColor: red, color: "white", border: "none", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: reason ? "pointer" : "not-allowed", opacity: reason ? 1 : 0.5 }}>
          Reject Ticket
        </button>
      </div>
    </div>
  );
}


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function VendorTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    assignTicket, addTicketNote, getTicketById, technicians, customers,
    approveForAssignment, modifyAndApprove, rejectTicket,
    technicianAcceptTicket, startWork, createWorkOrder, completeWorkOrder, closeTicket
  } = useVendor();
  
  const [showModify, setShowModify] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [noteText, setNoteText] = useState("");

  const ticket = getTicketById(id!);
  if (!ticket) {
    return (
      <MobileLayout bottomNav={<VendorBottomNavigation />} header={<BackHeader title="Ticket Details" fallbackRoute="/vendor/tickets" />}>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <h2 style={{ fontSize: "18px", color: ink, fontFamily: inter }}>Ticket not found</h2>
          <button onClick={() => navigate("/vendor/tickets")} style={{ marginTop: "16px", padding: "10px 20px", borderRadius: "8px", backgroundColor: blue, color: "white", border: "none", fontSize: "14px", fontWeight: 600, fontFamily: inter }}>Back to Tickets</button>
        </div>
      </MobileLayout>
    );
  }

  const customer = customers.find(c => c.id === ticket.customerId);
  // Live SLA using unified engine
  const slaResult = useSLACountdown(ticket.slaDeadline, ticket.slaStatus, ticket.status, ticket.slaResolutionHrs);
  const sla = { text: slaResult.remaining, color: slaResult.color, bg: slaResult.bg, isBreached: slaResult.isBreached, percent: slaResult.progress };

  const isPendingReview = ticket.status === "Pending Review";
  const isRejected = ticket.status === "Rejected";

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addTicketNote(ticket.id, noteText.trim());
    setNoteText("");
  };

  return (
    <MobileLayout bottomNav={<VendorBottomNavigation />} backgroundColor={bg} header={<BackHeader title={`Ticket ${ticket.id}`} fallbackRoute="/vendor/tickets" />} 
      modals={
        <>
          {showModify && <ModifyModal ticket={ticket} onClose={() => setShowModify(false)} onApply={(prio, cat, note) => { modifyAndApprove(ticket.id, prio, cat, note); setShowModify(false); navigate(-1); }} />}
          {showReject && <RejectModal onClose={() => setShowReject(false)} onReject={(reason, note) => { rejectTicket(ticket.id, reason, note); setShowReject(false); }} />}
        </>
      }
    >
      <div style={{ padding: "16px", paddingBottom: "120px" }}>

        {ticket.status === "Rejected" && (
          <div style={{ backgroundColor: redT, border: `1px solid ${red}30`, borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <XCircle size={18} color={red} />
              <span style={{ fontSize: "14px", fontWeight: 700, color: red, fontFamily: inter }}>Ticket Rejected</span>
            </div>
            <p style={{ fontSize: "13px", color: red, margin: 0, fontFamily: inter }}>Reason: {ticket.rejectionReason}</p>
          </div>
        )}

        {/* ── Header Card ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", marginBottom: "16px", boxShadow: cardShadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: divider, border: `1px solid ${border}`, fontSize: "11px", fontWeight: 700, color: inkSec, fontFamily: inter, textTransform: "uppercase" }}>
                {ticket.status}
              </div>
              <div style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: ticket.priority === "Critical" ? redT : ticket.priority === "High" ? orangeT : amberT, border: `1px solid ${ticket.priority === "Critical" ? red : ticket.priority === "High" ? orange : amber}30`, fontSize: "11px", fontWeight: 700, color: ticket.priority === "Critical" ? red : ticket.priority === "High" ? orange : amber, fontFamily: inter, textTransform: "uppercase" }}>
                {ticket.priority} PRIORITY
              </div>
            </div>
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 8px", lineHeight: 1.3 }}>{ticket.title}</h2>
          <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: "0 0 16px", lineHeight: 1.4 }}>{ticket.description}</p>
          
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: inkMut, fontFamily: inter }}>
            <Calendar size={14} /> Created: {formatDate(ticket.createdAt)}
          </div>
        </div>

        {/* ── AI Analysis Panel ── */}
        {ticket.aiAnalysis && (ticket.status === "Pending Review" || ticket.status === "Approved") && (
          <div style={{ backgroundColor: blueTint, borderRadius: "16px", border: `1px solid ${blue}30`, padding: "16px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Bot size={18} color={blue} />
              <span style={{ fontSize: "14px", fontWeight: 800, color: blueDark, fontFamily: inter }}>AI Diagnosis</span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: blue, fontFamily: inter, textTransform: "uppercase" }}>Fault Category</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{ticket.aiAnalysis.faultType}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: blue, fontFamily: inter, textTransform: "uppercase" }}>Severity</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{ticket.aiAnalysis.severity}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: blue, fontFamily: inter, textTransform: "uppercase" }}>Suggested Priority</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{ticket.aiAnalysis.suggestedPriority}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: blue, fontFamily: inter, textTransform: "uppercase" }}>Suggested SLA</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{ticket.aiAnalysis.suggestedSLA}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: blue, fontFamily: inter, textTransform: "uppercase" }}>Suggested Skill Match</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{ticket.aiAnalysis.suggestedSkill}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: blue, fontFamily: inter, textTransform: "uppercase" }}>Suggested Technician</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{ticket.aiAnalysis.suggestedTechnicianName || "None"}</div>
              </div>
            </div>

            <div style={{ backgroundColor: "rgba(255,255,255,0.6)", borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: blue, fontFamily: inter, textTransform: "uppercase", marginBottom: "4px" }}>Reasoning</div>
              <div style={{ fontSize: "13px", color: inkSec, fontFamily: inter, lineHeight: 1.4 }}>
                {ticket.aiAnalysis.reasoning}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "white", border: `1px solid ${blue}30`, color: inkSec, fontSize: "11px", fontWeight: 600, padding: "4px 8px", borderRadius: "6px", fontFamily: inter }}>
                Confidence: {(ticket.aiAnalysis.confidence * 100).toFixed(0)}%
              </div>
              {ticket.aiAnalysis.safetyFlag && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: redT, border: `1px solid ${red}30`, color: red, fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "6px", fontFamily: inter }}>
                  <Shield size={12} /> SAFETY FLAG
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "white", border: `1px solid ${blue}30`, color: inkSec, fontSize: "11px", fontWeight: 600, padding: "4px 8px", borderRadius: "6px", fontFamily: inter }}>
                <Clock size={12} /> Est. {ticket.aiAnalysis.estimatedHours}h
              </div>
            </div>
          </div>
        )}

        {/* ── SLA Panel ── */}
        {!isRejected && (
          <div style={{ backgroundColor: sla.bg, borderRadius: "16px", border: `1px solid ${sla.color}30`, padding: "16px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <Clock size={16} color={sla.color} />
                <span style={{ fontSize: "13px", fontWeight: 700, color: sla.color, fontFamily: inter }}>SLA Resolution Target</span>
              </div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: sla.color, fontFamily: inter }}>{sla.text}</div>
            </div>
            {sla.isBreached && <AlertTriangle size={24} color={sla.color} />}
          </div>
        )}

        {/* ── Work Order Card (If exists) ── */}
        {ticket.workOrderId && (
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${green}`, padding: "16px", marginBottom: "16px", boxShadow: `0 4px 12px ${green}20`, cursor: "pointer" }} onClick={() => navigate(`/vendor/work-orders/${ticket.workOrderId}`)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 4px", fontFamily: inter }}>Work Order</h3>
                <div style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>{ticket.workOrderId}</div>
              </div>
              <button style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: green, color: "white", border: "none", fontSize: "12px", fontWeight: 700, fontFamily: inter }}>Open</button>
            </div>
          </div>
        )}

        {/* ── Assignment (If approved and not rejected) ── */}
        {!isPendingReview && !isRejected && !ticket.workOrderId && (
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", marginBottom: "16px", boxShadow: cardShadow }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Assignment</h3>
            
            {ticket.assignedTechnicianId ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "20px", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={20} color={blue} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "2px" }}>{ticket.assignedTechnicianName}</div>
                    <div style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>Technician</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: amberT, border: `1px dashed ${amber}60`, borderRadius: "12px", padding: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <AlertTriangle size={16} color={amber} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: amber, fontFamily: inter }}>Unassigned</span>
                  </div>
                  <div style={{ fontSize: "11px", color: amber, fontFamily: inter }}>Pending Dispatch</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Customer & Asset Info ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", marginBottom: "16px", boxShadow: cardShadow }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Details</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <Building2 size={16} color={inkMut} style={{ marginTop: "2px" }} />
              <div>
                <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Customer</div>
                <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>{ticket.customerName}</div>
                {customer && <div style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{customer.contactPerson} · {customer.contactPhone}</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <MapPin size={16} color={inkMut} style={{ marginTop: "2px" }} />
              <div>
                <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Location</div>
                <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>{ticket.location} {ticket.floor ? `· ${ticket.floor}` : ""}</div>
              </div>
            </div>
            {ticket.assetName && (
              <div style={{ display: "flex", gap: "10px", alignItems: "center", backgroundColor: bg, padding: "10px", borderRadius: "8px", border: `1px solid ${border}` }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: purpleT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={16} color={purple} />
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Linked Asset</div>
                  <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 600 }}>{ticket.assetName}</div>
                </div>
                <ArrowRight size={16} color={inkMut} style={{ marginLeft: "auto" }} />
              </div>
            )}
          </div>
        </div>

        {/* ── Internal Notes ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", boxShadow: cardShadow }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter, display: "flex", alignItems: "center", gap: "6px" }}>
            <MessageSquare size={16} color={inkSec} /> Internal Notes
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            {ticket.notes.length > 0 ? ticket.notes.map((note, i) => (
              <div key={i} style={{ backgroundColor: bg, padding: "10px 12px", borderRadius: "10px", border: `1px solid ${border}`, fontSize: "13px", color: ink, fontFamily: inter }}>
                {note}
              </div>
            )) : (
              <div style={{ fontSize: "13px", color: inkMut, fontFamily: inter, fontStyle: "italic" }}>No internal notes yet.</div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="text" placeholder="Add a note..." value={noteText} onChange={e => setNoteText(e.target.value)} style={{ flex: 1, height: "40px", borderRadius: "8px", border: `1px solid ${border}`, padding: "0 12px", fontSize: "13px", fontFamily: inter, outline: "none" }} />
            <button type="button" onClick={handleAddNote} style={{ height: "40px", padding: "0 16px", borderRadius: "8px", backgroundColor: blue, border: "none", color: "white", fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Add</button>
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Actions ── */}
      {ticket.status === "Pending Review" && (
        <div style={{ position: "absolute", bottom: "70px", left: 0, right: 0, padding: "16px 20px", backgroundColor: card, borderTop: `1px solid ${border}`, display: "flex", gap: "10px", boxShadow: "0 -4px 16px rgba(0,0,0,0.05)", zIndex: 10 }}>
          <button type="button" onClick={() => setShowReject(true)} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: red, fontSize: "12px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
            <X size={14} /> Reject
          </button>
          <button type="button" onClick={() => setShowModify(true)} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: amber, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "white", fontSize: "12px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
            <Edit2 size={14} /> Modify
          </button>
          <button type="button" onClick={() => { approveForAssignment(ticket.id); navigate(-1); }} style={{ flex: 1.2, height: "48px", borderRadius: "12px", backgroundColor: blue, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "white", fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
            <CheckCircle2 size={14} /> Approve
          </button>
        </div>
      )}



      {ticket.status === "Assigned" && (
        <div style={{ position: "absolute", bottom: "70px", left: 0, right: 0, padding: "16px 20px", backgroundColor: card, borderTop: `1px solid ${border}`, display: "flex", gap: "12px", boxShadow: "0 -4px 16px rgba(0,0,0,0.05)", zIndex: 10 }}>
          <button type="button" onClick={() => technicianAcceptTicket(ticket.id)} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "white", fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>
            <CheckCircle2 size={18} /> Tech Accept
          </button>
        </div>
      )}

      {ticket.status === "Technician Accepted" && (
        <div style={{ position: "absolute", bottom: "70px", left: 0, right: 0, padding: "16px 20px", backgroundColor: card, borderTop: `1px solid ${border}`, display: "flex", gap: "12px", boxShadow: "0 -4px 16px rgba(0,0,0,0.05)", zIndex: 10 }}>
          <button type="button" onClick={() => startWork(ticket.id)} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "white", fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>
            <Bot size={18} /> Start Work
          </button>
        </div>
      )}

      {ticket.status === "In Progress" && (
        <div style={{ position: "absolute", bottom: "70px", left: 0, right: 0, padding: "16px 20px", backgroundColor: card, borderTop: `1px solid ${border}`, display: "flex", gap: "12px", boxShadow: "0 -4px 16px rgba(0,0,0,0.05)", zIndex: 10 }}>
          <button type="button" onClick={() => createWorkOrder(ticket.id, ticket.assignedTechnicianId!, ticket.assignedTechnicianName!)} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "white", fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>
            <FileText size={18} /> Generate Work Order
          </button>
        </div>
      )}
      
      {ticket.status === "Work Order Generated" && (
        <div style={{ position: "absolute", bottom: "70px", left: 0, right: 0, padding: "16px 20px", backgroundColor: card, borderTop: `1px solid ${border}`, display: "flex", gap: "12px", boxShadow: "0 -4px 16px rgba(0,0,0,0.05)", zIndex: 10 }}>
          <button type="button" onClick={() => completeWorkOrder(ticket.workOrderId!, "Completed via UI")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: green, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "white", fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer", boxShadow: `0 4px 12px ${green}40` }}>
            <CheckCircle2 size={18} /> Complete Ticket
          </button>
        </div>
      )}

      {ticket.status === "Completed" && (
        <div style={{ position: "absolute", bottom: "70px", left: 0, right: 0, padding: "16px 20px", backgroundColor: card, borderTop: `1px solid ${border}`, display: "flex", gap: "12px", boxShadow: "0 -4px 16px rgba(0,0,0,0.05)", zIndex: 10 }}>
          <button type="button" onClick={() => closeTicket(ticket.id, "Closed via UI")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: green, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "white", fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer", boxShadow: `0 4px 12px ${green}40` }}>
            <CheckCircle2 size={18} /> Close Ticket
          </button>
        </div>
      )}
    </MobileLayout>
  );
}
