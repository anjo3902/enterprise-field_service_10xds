import React from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { useVendor } from "../../contexts/VendorContext";
import type { VendorTicket } from "../../contexts/VendorContext";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { slaCardDisplay } from "../../utils/slaEngine";
import {
  Shield, AlertTriangle, CheckCircle2, Clock, 
  TrendingUp, BarChart3, ChevronRight, Info
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const inkFaint = "#94A3B8";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

// getSLARemaining removed — now using unified slaEngine.slaCardDisplay

function SLATicketCard({ ticket, onClick }: { ticket: VendorTicket; onClick: () => void }) {
  const sla = slaCardDisplay(ticket.slaDeadline, ticket.slaStatus, ticket.status);

  return (
    <div onClick={onClick} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${sla.isBreached ? red : amber}40`, boxShadow: cardShadow, padding: "16px", marginBottom: "12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter }}>{ticket.id}</span>
            <div style={{ padding: "2px 6px", borderRadius: "6px", backgroundColor: ticket.priority === "Critical" ? redT : amberT, fontSize: "10px", fontWeight: 700, color: ticket.priority === "Critical" ? red : amber, fontFamily: inter }}>
              {ticket.priority.toUpperCase()}
            </div>
          </div>
          <span style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{ticket.customerName}</span>
        </div>
        <div style={{ padding: "4px 8px", borderRadius: "8px", backgroundColor: sla.bg, display: "flex", alignItems: "center", gap: "4px" }}>
          {sla.isBreached ? <AlertTriangle size={12} color={sla.color} /> : <Clock size={12} color={sla.color} />}
          <span style={{ fontSize: "11px", fontWeight: 700, color: sla.color, fontFamily: inter }}>{sla.text}</span>
        </div>
      </div>
      
      <p style={{ fontSize: "13px", color: ink, fontFamily: inter, margin: 0, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {ticket.title}
      </p>

      {ticket.assignedTechnicianId ? (
        <div style={{ fontSize: "12px", color: inkMut, fontFamily: inter }}>
          Assigned to: <span style={{ color: inkSec, fontWeight: 600 }}>{ticket.assignedTechnicianName}</span>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "12px", color: red, fontFamily: inter, fontWeight: 600 }}>Unassigned</div>
        </div>
      )}
    </div>
  );
}

export default function VendorSLA() {
  const navigate = useNavigate();
  const { currentMonthCompliance, slaContract, breachedTickets, atRiskTickets, openTickets, kpis } = useVendor();

  const healthyTickets = openTickets.filter(t => t.slaStatus === "ok");

  const isCompliant = currentMonthCompliance >= slaContract.complianceTarget;
  const healthColor = isCompliant ? green : currentMonthCompliance >= 80 ? amber : red;

  return (
    <MobileLayout bottomNav={<VendorBottomNavigation />} backgroundColor={bg} header={<BackHeader title="SLA Monitor" fallbackRoute="/vendor/dashboard" />}>
      <div style={{ padding: "16px 20px" }}>
        
        {/* ── Overview Card ── */}
        <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "24px", marginBottom: "20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "32px", backgroundColor: isCompliant ? greenT : redT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
            <Shield size={32} color={healthColor} />
          </div>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: inkSec, fontFamily: inter, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Compliance</h2>
          <div style={{ fontSize: "40px", fontWeight: 800, color: healthColor, fontFamily: inter, margin: "0 0 4px", lineHeight: 1 }}>
            {currentMonthCompliance}%
          </div>
          <p style={{ fontSize: "13px", color: inkMut, fontFamily: inter, margin: "0 0 16px" }}>
            Target: {slaContract.complianceTarget}%
          </p>

          <div style={{ width: "100%", height: "8px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${currentMonthCompliance}%`, backgroundColor: healthColor, borderRadius: "100px" }} />
          </div>
        </div>

        {/* ── Contract Rules ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter, display: "flex", alignItems: "center", gap: "6px" }}>
            <Info size={16} color={inkSec} /> SLA Resolution Targets
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {Object.entries(slaContract.resolutionSLA).map(([priority, hrs]) => (
              <div key={priority} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", backgroundColor: bg, borderRadius: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter }}>{priority}</span>
                <span style={{ fontSize: "9.5px", fontWeight: 700, color: inkFaint, fontFamily: inter, letterSpacing: "0.05em" }}>{hrs}h</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "12px", color: red, fontFamily: inter, margin: "12px 0 0", fontStyle: "italic", lineHeight: 1.4 }}>
            {slaContract.penaltyNote}
          </p>
        </div>

        {/* ── Breached Tickets ── */}
        {breachedTickets.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: red, margin: "0 0 12px", fontFamily: inter, display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={18} /> Breached ({breachedTickets.length})
            </h3>
            {breachedTickets.map(t => (
              <SLATicketCard key={t.id} ticket={t} onClick={() => navigate(`/vendor/tickets/${t.id}`)} />
            ))}
          </div>
        )}

        {/* ── Upcoming Breaches Tickets ── */}
        {atRiskTickets.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: amber, margin: "0 0 12px", fontFamily: inter, display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} /> Upcoming Breaches ({atRiskTickets.length})
            </h3>
            {atRiskTickets.map(t => (
              <SLATicketCard key={t.id} ticket={t} onClick={() => navigate(`/vendor/tickets/${t.id}`)} />
            ))}
          </div>
        )}

        {/* ── Healthy Tickets ── */}
        {healthyTickets.length > 0 ? (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: green, margin: "0 0 12px", fontFamily: inter, display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={18} /> Healthy ({healthyTickets.length})
            </h3>
            {healthyTickets.map(t => (
              <SLATicketCard key={t.id} ticket={t} onClick={() => navigate(`/vendor/tickets/${t.id}`)} />
            ))}
          </div>
        ) : (
          breachedTickets.length === 0 && atRiskTickets.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}` }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "32px", backgroundColor: greenT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle2 size={32} color={green} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 8px" }}>SLA is Healthy</h3>
              <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: 0 }}>All tickets are well within their SLA parameters.</p>
            </div>
          )
        )}
      </div>
    </MobileLayout>
  );
}
