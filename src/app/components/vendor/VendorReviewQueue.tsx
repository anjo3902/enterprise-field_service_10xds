import React from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor, VendorTicket } from "../../contexts/VendorContext";
import { ArrowLeft, Clock, MapPin, AlertTriangle, Shield, CheckCircle2, Bot, ArrowRight } from "lucide-react";

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

export default function VendorReviewQueue() {
  const navigate = useNavigate();
  const { pendingReviewTickets } = useVendor();

  const sortedTickets = [...pendingReviewTickets].sort((a, b) => {
    // Sort by SLA Deadline nearest first
    return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
  });

  return (
    <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />} header={<BackHeader title="Pending Review" fallbackRoute="/vendor/dashboard" />}>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em", color: ink, fontFamily: inter, margin: 0 }}>
            Review Queue
          </h2>
          <div style={{ padding: "4px 8px", borderRadius: "100px", backgroundColor: pendingReviewTickets.length > 0 ? amberT : greenT, border: `1px solid ${pendingReviewTickets.length > 0 ? amber : green}30`, fontSize: "11px", fontWeight: 700, color: pendingReviewTickets.length > 0 ? amber : green, fontFamily: inter }}>
            {pendingReviewTickets.length} Pending
          </div>
        </div>

        {sortedTickets.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sortedTickets.map(ticket => {
              const isUrgent = ticket.aiAnalysis?.severity === "Critical" || ticket.aiAnalysis?.severity === "High";
              const severityColor = ticket.aiAnalysis?.severity === "Critical" ? red : (ticket.aiAnalysis?.severity === "High" ? amber : blue);
              const severityTint = ticket.aiAnalysis?.severity === "Critical" ? redT : (ticket.aiAnalysis?.severity === "High" ? amberT : blueTint);

              return (
                <div key={ticket.id} onClick={() => navigate(`/vendor/tickets/${ticket.id}`)} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", cursor: "pointer", boxShadow: cardShadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "9.5px", fontWeight: 700, color: inkFaint, fontFamily: inter, letterSpacing: "0.05em" }}>{ticket.id}</span>
                      {ticket.aiAnalysis && (
                        <div style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: severityTint, fontSize: "10px", fontWeight: 800, color: severityColor, fontFamily: inter, display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase" }}>
                          {isUrgent ? <AlertTriangle size={10} /> : <Bot size={10} />}
                          AI: {ticket.aiAnalysis.severity}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: ink, margin: "0 0 4px", fontFamily: inter, lineHeight: 1.3 }}>
                    {ticket.title}
                  </h3>
                  
                  <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {ticket.description}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter, backgroundColor: bg, padding: "4px 8px", borderRadius: "6px" }}>
                      <MapPin size={12} /> {ticket.customerName}
                    </div>
                    {ticket.aiAnalysis?.safetyFlag && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: red, fontFamily: inter, backgroundColor: redT, padding: "4px 8px", borderRadius: "6px" }}>
                        <Shield size={12} /> Safety Flag
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/vendor/tickets/${ticket.id}`); }} style={{ width: "100%", height: "40px", borderRadius: "10px", backgroundColor: blue, color: "white", border: "none", fontSize: "14px", fontWeight: 700, fontFamily: inter, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" }}>
                    Review Now <ArrowRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "40px 20px", textAlign: "center", backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "24px", backgroundColor: greenT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={24} color={green} />
            </div>
            <h3 style={{ fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em", color: ink, fontFamily: inter, margin: "0 0 8px" }}>Review Queue Empty</h3>
            <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: 0 }}>All incoming tickets have been reviewed and approved for dispatch.</p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
