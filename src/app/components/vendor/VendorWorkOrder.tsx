import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor } from "../../contexts/VendorContext";
import { ArrowLeft, Clock, MapPin, User, CheckSquare, Square, Save, ClipboardList, CheckCircle2 } from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

function BackHeader({ title, fallbackRoute }: { title: string, fallbackRoute: string }) {
  const navigate = useNavigate();
  return (
    <div style={{ backgroundColor: blue, paddingTop: "44px", paddingBottom: "16px", paddingLeft: "20px", paddingRight: "20px", position: "sticky", top: 0, zIndex: 10 }}>
      <button
        type="button"
        onClick={() => navigate(fallbackRoute)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer",
          fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter,
          marginBottom: "16px"
        }}
      >
        <ArrowLeft size={15} color="white" /> Back
      </button>
      <h1 style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: "white", margin: 0 }}>
        {title}
      </h1>
    </div>
  );
}

export default function VendorWorkOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getWorkOrderById, getTicketById, completeWorkOrder } = useVendor();

  const workOrder = getWorkOrderById(id || "");
  const ticket = getTicketById(workOrder?.ticketId || "");

  const [notes, setNotes] = useState(workOrder?.resolutionNotes || "");
  const [successMsg, setSuccessMsg] = useState("");

  if (!workOrder || !ticket) {
    return (
      <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />} header={<BackHeader title="Work Order Not Found" fallbackRoute="/vendor/dashboard" />}>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter }}>Work order could not be found.</p>
        </div>
      </MobileLayout>
    );
  }

  const isCompleted = workOrder.status === "completed" || workOrder.status === "closed";

  const handleComplete = () => {
    completeWorkOrder(workOrder.id, notes);
    setSuccessMsg("Work Order Completed!");
    setTimeout(() => {
      setSuccessMsg("");
      navigate(`/vendor/tickets/${workOrder.ticketId}`);
    }, 1500);
  };

  const getStatusDisplay = () => {
    if (workOrder.status === "open") return { label: "Open", bg: amberT, color: amber };
    if (workOrder.status === "in_progress") return { label: "In Progress", bg: blueTint, color: blue };
    if (workOrder.status === "completed") return { label: "Completed", bg: greenT, color: green };
    return { label: "Closed", bg: border, color: inkMut };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />} header={<BackHeader title="Work Order" fallbackRoute={`/vendor/tickets/${workOrder.ticketId}`} />}>
      {successMsg && (
        <div style={{ position: "absolute", top: "20px", left: "20px", right: "20px", padding: "12px 16px", backgroundColor: green, color: "white", borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px", zIndex: 1000, boxShadow: "0 4px 16px rgba(22,163,74,0.3)" }}>
          <CheckCircle2 size={18} color="white" />
          <span style={{ fontSize: "14px", fontWeight: 600, fontFamily: inter }}>{successMsg}</span>
        </div>
      )}

      <div style={{ padding: "20px", paddingBottom: "100px" }}>
        {/* WO Header */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", marginBottom: "16px", boxShadow: cardShadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 4px" }}>
                {workOrder.id}
              </h2>
              <div style={{ fontSize: "13px", fontWeight: 600, color: blue, fontFamily: inter, cursor: "pointer" }} onClick={() => navigate(`/vendor/tickets/${workOrder.ticketId}`)}>
                {workOrder.ticketId}
              </div>
            </div>
            <div style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: statusDisplay.bg, color: statusDisplay.color, fontSize: "11px", fontWeight: 800, fontFamily: inter, textTransform: "uppercase" }}>
              {statusDisplay.label}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "12px", borderTop: `1px solid ${border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: inkSec, fontFamily: inter }}>
              <User size={14} color={inkMut} /> <strong>Assigned:</strong> {workOrder.technicianName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: inkSec, fontFamily: inter }}>
              <MapPin size={14} color={inkMut} /> <strong>Location:</strong> {workOrder.location}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: inkSec, fontFamily: inter }}>
              <Clock size={14} color={inkMut} /> <strong>Est. Time:</strong> {workOrder.estimatedHours}h
            </div>
          </div>
        </div>

        {/* Checklist */}
        <h3 style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <ClipboardList size={16} color={blue} /> Service Checklist
        </h3>
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", marginBottom: "16px", boxShadow: cardShadow }}>
          {workOrder.checklist.map((item, i) => (
            <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 0", borderBottom: i === workOrder.checklist.length - 1 ? "none" : `1px solid ${border}` }}>
              <div style={{ marginTop: "2px" }}>
                {item.done ? <CheckSquare size={16} color={green} /> : <Square size={16} color={inkMut} />}
              </div>
              <span style={{ fontSize: "14px", color: item.done ? inkSec : ink, fontFamily: inter, textDecoration: item.done ? "line-through" : "none" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Resolution Notes */}
        <h3 style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 12px" }}>Resolution Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isCompleted}
          placeholder="Enter detailed repair notes, parts used, etc."
          style={{
            width: "100%", height: "120px", borderRadius: "12px", border: `1px solid ${border}`,
            padding: "12px", fontSize: "14px", fontFamily: inter, color: ink, backgroundColor: isCompleted ? bg : card,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)", resize: "none", outline: "none", boxSizing: "border-box"
          }}
        />
      </div>

      {!isCompleted && (
        <div style={{ position: "absolute", bottom: "70px", left: 0, right: 0, padding: "16px 20px", backgroundColor: card, borderTop: `1px solid ${border}`, zIndex: 10 }}>
          <button
            type="button"
            onClick={handleComplete}
            style={{ width: "100%", height: "48px", borderRadius: "12px", backgroundColor: green, color: "white", border: "none", fontSize: "15px", fontWeight: 700, fontFamily: inter, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", boxShadow: "0 4px 12px rgba(22,163,74,0.3)" }}
          >
            <CheckCircle2 size={18} /> Complete Work Order
          </button>
        </div>
      )}
    </MobileLayout>
  );
}
