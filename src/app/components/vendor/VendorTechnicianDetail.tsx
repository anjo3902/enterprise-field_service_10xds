import React from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { useVendor } from "../../contexts/VendorContext";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import {
  Phone, Mail, MapPin, Star, Clock, Briefcase, 
  CheckCircle2, AlertTriangle, Shield, Award, ClipboardList
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
const purple   = "#7C3AED";
const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

export default function VendorTechnicianDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { technicians, getTicketById, tickets } = useVendor();
  
  const tech = technicians.find(t => t.id === id);

  if (!tech) {
    return (
      <MobileLayout bottomNav={<VendorBottomNavigation />} header={<BackHeader title="Technician Details" fallbackRoute="/vendor/technicians" />}>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <h2 style={{ fontSize: "18px", color: ink, fontFamily: inter }}>Technician not found</h2>
          <button onClick={() => navigate("/vendor/technicians")} style={{ marginTop: "16px", padding: "10px 20px", borderRadius: "8px", backgroundColor: blue, color: "white", border: "none", fontSize: "14px", fontWeight: 600, fontFamily: inter }}>Back to List</button>
        </div>
      </MobileLayout>
    );
  }

  const statusColor = tech.availability === "available" ? green : tech.availability === "on_job" ? blue : red;
  const statusTint = tech.availability === "available" ? greenT : tech.availability === "on_job" ? blueTint : redT;
  const statusLabel = tech.availability.replace("_", " ").toUpperCase();

  const currentJob = tech.currentJobId ? getTicketById(tech.currentJobId) : null;
  const recentlyCompleted = tickets.filter(t => t.assignedTechnicianId === tech.id && t.status === "Completed").slice(0, 3);

  return (
    <MobileLayout bottomNav={<VendorBottomNavigation />} backgroundColor={bg} header={<BackHeader title="Technician Profile" fallbackRoute="/vendor/technicians" />}>
      <div style={{ padding: "16px" }}>
        
        {/* ── Profile Header ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "20px", marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, fontFamily: inter, width: "80px", height: "80px", borderRadius: "40px", backgroundColor: tech.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", position: "relative", marginBottom: "12px" }}>
            {tech.initials}
            <div style={{ position: "absolute", bottom: "4px", right: "4px", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: statusColor, border: `3px solid ${card}` }} />
          </div>
          
          <h2 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: inter, color: ink, margin: "0 0 4px" }}>{tech.name}</h2>
          <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: "0 0 16px" }}>{tech.role}</p>

          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <a href={`tel:${tech.phone}`} style={{ flex: 1, height: "40px", borderRadius: "10px", backgroundColor: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", textDecoration: "none", color: ink }}>
              <Phone size={16} color={inkSec} />
              <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: inter }}>Call</span>
            </a>
            <a href={`mailto:${tech.email}`} style={{ flex: 1, height: "40px", borderRadius: "10px", backgroundColor: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", textDecoration: "none", color: ink }}>
              <Mail size={16} color={inkSec} />
              <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: inter }}>Email</span>
            </a>
          </div>
        </div>

        {/* ── Status & Current Job ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>Current Status</h3>
            <div style={{ padding: "4px 10px", borderRadius: "8px", backgroundColor: statusTint, fontSize: "11px", fontWeight: 800, color: statusColor, fontFamily: inter, letterSpacing: "0.02em" }}>
              {statusLabel}
            </div>
          </div>
          
          {tech.availability === "on_job" && currentJob ? (
            <div onClick={() => navigate(`/vendor/tickets/${currentJob.id}`)} style={{ backgroundColor: blueTint, borderRadius: "12px", border: `1px solid ${blue}30`, padding: "12px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: blue, fontFamily: inter }}>Active Ticket: {currentJob.id}</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: currentJob.priority === "Critical" ? red : amber, fontFamily: inter }}>{currentJob.priority}</span>
              </div>
              <p style={{ fontSize: "13px", color: ink, fontFamily: inter, margin: "0 0 8px", fontWeight: 500 }}>{currentJob.title}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: inkSec, fontFamily: inter }}>
                <MapPin size={12} /> {currentJob.location}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: 0 }}>
              {tech.availability === "available" ? "Ready for dispatch. No active jobs currently assigned." : "Technician is currently unavailable."}
            </p>
          )}
        </div>

        {/* ── Performance ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Shield size={14} color={green} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter }}>SLA ADHERENCE</span>
            </div>
            <div style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: ink }}>{tech.slaAdherence}%</div>
            <div style={{ fontSize: "11px", color: inkSec, fontFamily: inter, marginTop: "4px" }}>Target: 90%</div>
          </div>
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Star size={14} color={amber} fill={amber} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter }}>RATING</span>
            </div>
            <div style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: ink }}>{tech.rating.toFixed(1)}</div>
            <div style={{ fontSize: "11px", color: inkSec, fontFamily: inter, marginTop: "4px" }}>Based on 42 reviews</div>
          </div>
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <CheckCircle2 size={14} color={blue} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter }}>JOBS DONE</span>
            </div>
            <div style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: ink }}>{tech.jobsThisMonth}</div>
            <div style={{ fontSize: "11px", color: inkSec, fontFamily: inter, marginTop: "4px" }}>This month</div>
          </div>
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Clock size={14} color={purple} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter }}>AVG TIME</span>
            </div>
            <div style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: ink }}>{tech.avgCompletionHrs}h</div>
            <div style={{ fontSize: "11px", color: inkSec, fontFamily: inter, marginTop: "4px" }}>Per ticket</div>
          </div>
        </div>

        {/* ── Skills & Certifications ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Skills</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
            {tech.skills.map(s => (
              <div key={s} style={{ padding: "6px 12px", borderRadius: "100px", backgroundColor: bg, border: `1px solid ${border}`, fontSize: "12px", color: inkSec, fontFamily: inter, fontWeight: 500 }}>
                {s}
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Certifications</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {tech.certifications.map(c => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Award size={16} color={amber} />
                <span style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* ── Quick Actions ── */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[
            { label: "SLA", onClick: () => navigate("/vendor/sla"), color: "#16A34A", bg: "#DCFCE7", icon: Shield },
            { label: "Performance", onClick: () => navigate("/vendor/performance"), color: "#7C3AED", bg: "#F5F3FF", icon: AlertTriangle },
          ].map(a => (
            <button key={a.label} type="button" onClick={a.onClick}
              style={{ flex: 1, padding: "10px 8px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: card, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <a.icon size={18} color={a.color} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: a.color, fontFamily: inter }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* ── Active Ticket Assignments ── */}
        {tickets.filter(t => t.assignedTechnicianId === tech.id && t.status !== "Completed" && t.status !== "Closed" && t.status !== "Rejected").length > 0 && (
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Active Assignments</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tickets.filter(t => t.assignedTechnicianId === tech.id && t.status !== "Completed" && t.status !== "Closed" && t.status !== "Rejected").map(t => (
                <div key={t.id} onClick={() => navigate(`/vendor/tickets/${t.id}`)}
                  style={{ padding: "12px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: bg, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: ink, fontFamily: inter }}>{t.id}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: t.priority === "Critical" ? "#DC2626" : t.priority === "High" ? amber : blue, fontFamily: inter, textTransform: "uppercase" }}>{t.priority}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: inkSec, fontFamily: inter, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>{t.title}</p>
                  </div>
                  <div style={{ padding: "3px 8px", borderRadius: "6px", backgroundColor: t.status === "In Progress" ? "#F5F3FF" : blueTint, fontSize: "10px", fontWeight: 700, color: t.status === "In Progress" ? "#7C3AED" : blue, fontFamily: inter, flexShrink: 0 }}>{t.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent Jobs ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "32px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Recently Completed</h3>

          {recentlyCompleted.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentlyCompleted.map(t => (
                <div key={t.id} onClick={() => navigate(`/vendor/tickets/${t.id}`)} style={{ padding: "12px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: bg, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{t.id}</span>
                    <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>
                      {new Date(t.resolvedAt || "").toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: inkSec, fontFamily: inter, margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: inkMut, fontFamily: inter, margin: 0, fontStyle: "italic" }}>No recent jobs to display.</p>
          )}
        </div>

      </div>
    </MobileLayout>
  );
}
