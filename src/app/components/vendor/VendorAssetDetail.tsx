import React from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { useVendor } from "../../contexts/VendorContext";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import {
  Package, MapPin, AlertTriangle, Shield, Clock,
  Calendar, Wrench, FileText, CheckCircle2, ChevronRight, Activity
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

export default function VendorAssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAssetById, customers, tickets } = useVendor();

  const asset = getAssetById(id || "");

  if (!asset) {
    return (
      <MobileLayout bottomNav={<VendorBottomNavigation />} header={<BackHeader title="Asset Details" fallbackRoute="/vendor/assets" />}>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <h2 style={{ fontSize: "18px", color: ink, fontFamily: inter }}>Asset not found</h2>
          <button onClick={() => navigate("/vendor/assets")} style={{ marginTop: "16px", padding: "10px 20px", borderRadius: "8px", backgroundColor: blue, color: "white", border: "none", fontSize: "14px", fontWeight: 600, fontFamily: inter }}>Back to Assets</button>
        </div>
      </MobileLayout>
    );
  }

  const customer = customers.find(c => c.id === asset.customerId);
  const activeTicket = asset.activeTicketId ? tickets.find(t => t.id === asset.activeTicketId) : null;

  const healthColors = {
    "Healthy": { color: green, tint: greenT },
    "At Risk": { color: amber, tint: amberT },
    "Critical": { color: red, tint: redT },
    "Under Maintenance": { color: blue, tint: blueTint },
  };
  const hc = healthColors[asset.health] || { color: inkMut, tint: divider };

  return (
    <MobileLayout bottomNav={<VendorBottomNavigation />} backgroundColor={bg} header={<BackHeader title="Asset Profile" fallbackRoute="/vendor/assets" />}>
      <div style={{ padding: "16px" }}>
        
        {/* ── Header Card ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "20px", marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "20px", backgroundColor: hc.tint, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${hc.color}30`, marginBottom: "12px" }}>
            <Package size={36} color={hc.color} />
          </div>
          
          <h2 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: inter, color: ink, margin: "0 0 4px" }}>{asset.name}</h2>
          <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: "0 0 16px" }}>{asset.category} · {asset.model}</p>

          <div style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: hc.tint, fontSize: "12px", fontWeight: 800, color: hc.color, fontFamily: inter, letterSpacing: "0.02em" }}>
            {asset.health.toUpperCase()}
          </div>
        </div>

        {/* ── Active Issue Alert ── */}
        {activeTicket && (
          <div onClick={() => navigate(`/vendor/tickets/${activeTicket.id}`)} style={{ backgroundColor: redT, borderRadius: "16px", border: `1px solid ${red}40`, padding: "16px", marginBottom: "16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <AlertTriangle size={20} color={red} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: red, fontFamily: inter }}>ACTIVE TICKET: {activeTicket.id}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: red, fontFamily: inter }}>{activeTicket.status}</span>
              </div>
              <p style={{ fontSize: "13px", color: red, fontFamily: inter, margin: 0, lineHeight: 1.4, opacity: 0.9 }}>{activeTicket.title}</p>
            </div>
            <ChevronRight size={16} color={red} style={{ alignSelf: "center", opacity: 0.5 }} />
          </div>
        )}

        {/* ── Key Info ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Activity size={14} color={blue} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter }}>HEALTH SCORE</span>
            </div>
            <div style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: ink }}>{asset.healthScore}/100</div>
          </div>
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Calendar size={14} color={purple} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter }}>AGE</span>
            </div>
            <div style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: ink }}>{asset.ageYears} yrs</div>
          </div>
        </div>

        {/* ── Specifications ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Specifications</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>Serial Number</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{asset.serial}</span>
            </div>
            <div style={{ height: "1px", backgroundColor: divider }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>Purchase Date</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{new Date(asset.purchaseDate).toLocaleDateString()}</span>
            </div>
            <div style={{ height: "1px", backgroundColor: divider }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>Warranty Expiry</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{new Date(asset.warrantyExpiry).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* ── Location ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Location & Customer</h3>
          
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={16} color={blue} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "2px" }}>{customer?.name}</div>
              <div style={{ fontSize: "13px", color: inkSec, fontFamily: inter, marginBottom: "2px" }}>{asset.location}</div>
              {asset.floor && <div style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>{asset.floor}</div>}
            </div>
          </div>
        </div>

        {/* ── Maintenance Schedule ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "32px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Maintenance Schedule</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px", backgroundColor: bg, borderRadius: "12px", border: `1px solid ${border}` }}>
              <Wrench size={16} color={inkMut} style={{ marginTop: "2px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, marginBottom: "2px" }}>LAST PM</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: ink, fontFamily: inter }}>{asset.lastPMDate ? new Date(asset.lastPMDate).toLocaleDateString() : "No record"}</div>
              </div>
            </div>
            
            <div onClick={() => navigate("/vendor/maintenance")} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px", backgroundColor: blueTint, borderRadius: "12px", border: `1px solid ${blue}30`, cursor: "pointer" }}>
              <Calendar size={16} color={blue} style={{ marginTop: "2px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", color: blue, fontFamily: inter, fontWeight: 700, marginBottom: "2px" }}>NEXT PM DUE</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter }}>{asset.nextPMDate ? new Date(asset.nextPMDate).toLocaleDateString() : "Not scheduled"}</div>
              </div>
              <ChevronRight size={16} color={blue} style={{ alignSelf: "center", opacity: 0.5 }} />
            </div>
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
