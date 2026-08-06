import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor, VendorAsset } from "../../contexts/VendorContext";
import {
  Package, Search, Filter, AlertTriangle, CheckCircle2,
  Clock, Activity, Wrench, X, MapPin, Settings2, ChevronRight,
  Shield, Calendar, RefreshCw, ArrowLeft
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
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

type FilterType = "All" | "Operational" | "Service Required" | "Action Needed";

function AssetCard({ asset, customerName, onClick }: { asset: VendorAsset; customerName?: string; onClick: () => void }) {
  const healthMap: Record<string, { label: string; color: string; tint: string }> = {
    "Healthy": { label: "Operational", color: green, tint: greenT },
    "At Risk": { label: "Service Required", color: amber, tint: amberT },
    "Critical": { label: "Action Needed", color: red, tint: redT },
    "Under Maintenance": { label: "Under Maintenance", color: blue, tint: blueTint },
  };
  const hc = healthMap[asset.health] || { label: "Unknown", color: inkMut, tint: divider };

  return (
    <div onClick={onClick} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${border}` }}>
            <Package size={20} color={inkSec} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: blue, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px", fontFamily: inter }}>{customerName || "Unknown Client"}</div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter }}>{asset.name}</h3>
            <div style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{asset.category} · {asset.model}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px", backgroundColor: bg, borderRadius: "10px", border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Service Contract</span>
          <span style={{ fontSize: "12px", color: ink, fontFamily: inter, fontWeight: 600 }}>Active AMC</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Current Request</span>
          <span style={{ fontSize: "12px", color: asset.activeTicketId ? red : inkSec, fontFamily: inter, fontWeight: 600 }}>{asset.activeTicketId ? "Emergency Repair" : "None"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Vendor Status</span>
          <div style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: hc.tint, fontSize: "10px", fontWeight: 700, color: hc.color, fontFamily: inter }}>{hc.label}</div>
        </div>
      </div>
      
      <button style={{ width: "100%", height: "36px", borderRadius: "8px", backgroundColor: blueTint, color: blue, border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, marginTop: "4px", cursor: "pointer" }}>
        {asset.activeTicketId ? "Review Request" : "View Asset Details"}
      </button>
    </div>
  );
}

export default function VendorAssetList() {
  const navigate = useNavigate();
  const { assets, customers, overduePMTasks, upcomingPMTasks, amcRenewals, warrantyRenewals } = useVendor();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");

  const filteredAssets = useMemo(() => {
    let res = assets;

    if (filter !== "All") {
      const mapBack: Record<string, string> = {
        "Operational": "Healthy",
        "Service Required": "At Risk",
        "Action Needed": "Critical"
      };
      res = res.filter(a => a.health === mapBack[filter]);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(a => 
        a.name.toLowerCase().includes(q) || 
        a.model.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.serial.toLowerCase().includes(q)
      );
    }

    return res;
  }, [assets, filter, search]);

  const stats = {
    total: assets.length,
    healthy: assets.filter(a => a.health === "Healthy").length,
    atRisk: assets.filter(a => a.health === "At Risk").length,
    critical: assets.filter(a => a.health === "Critical").length,
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name;

  // Operational alerts
  const overduePM = overduePMTasks.length;
  const upcomingPM = upcomingPMTasks.filter(p => p.status === "Requested" || p.status === "Planning").length;
  const criticalAssets = assets.filter(a => a.health === "Critical").length;
  const expiringAMC = amcRenewals.filter(a => {
    const days = (new Date(a.expiryDate).getTime() - Date.now()) / 86400000;
    return days <= 30 && days >= 0;
  }).length;
  const expiringWarranty = warrantyRenewals.filter(w => {
    const days = (new Date(w.currentExpiryDate).getTime() - Date.now()) / 86400000;
    return days <= 30 && days >= 0;
  }).length;

  return (
    <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />}>
      <div style={{ backgroundColor: blue, paddingTop: "44px", paddingBottom: "16px", paddingLeft: "20px", paddingRight: "20px", position: "sticky", top: 0, zIndex: 10 }}>
        <button type="button" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter, marginBottom: "16px" }}>
          <ArrowLeft size={15} color="white" /> Back
        </button>
        <div>
          <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.8)", fontFamily: inter, margin: "0 0 2px", fontWeight: 500 }}>Asset Management</p>
          <h1 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: inter, color: "white", margin: "0 0 16px" }}>Client Assets</h1>
        </div>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ flex: 1, height: "44px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", padding: "0 14px", gap: "10px" }}>
            <Search size={18} color="white" />
            <input 
              type="text" 
              placeholder="Search name, model, serial..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", fontSize: "14px", color: "white", outline: "none", fontFamily: inter }}
              className="placeholder-white-50"
            />
            {search && <X size={16} color="white" style={{ cursor: "pointer" }} onClick={() => setSearch("")} />}
          </div>
        </div>
      </div>

      {/* Operational Alert Banners */}
      <div style={{ padding: "12px 16px 0" }}>
        {criticalAssets > 0 && (
          <div style={{ backgroundColor: redT, borderRadius: "12px", padding: "10px 14px", marginBottom: "8px", border: `1px solid ${red}30`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={16} color={red} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: red, fontFamily: inter }}>{criticalAssets} asset{criticalAssets > 1 ? "s" : ""} in critical state</span>
            </div>
            <button type="button" onClick={() => setFilter("Action Needed")} style={{ padding: "4px 10px", borderRadius: "8px", backgroundColor: red, border: "none", fontSize: "11px", fontWeight: 700, color: "white", cursor: "pointer", fontFamily: inter }}>View</button>
          </div>
        )}
        {overduePM > 0 && (
          <div style={{ backgroundColor: amberT, borderRadius: "12px", padding: "10px 14px", marginBottom: "8px", border: `1px solid ${amber}30`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Settings2 size={16} color={amber} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: amber, fontFamily: inter }}>{overduePM} overdue PM task{overduePM > 1 ? "s" : ""}</span>
            </div>
            <button type="button" onClick={() => navigate("/vendor/maintenance")} style={{ padding: "4px 10px", borderRadius: "8px", backgroundColor: amber, border: "none", fontSize: "11px", fontWeight: 700, color: "white", cursor: "pointer", fontFamily: inter }}>Schedule</button>
          </div>
        )}
        {(expiringAMC > 0 || expiringWarranty > 0) && (
          <div style={{ backgroundColor: blueTint, borderRadius: "12px", padding: "10px 14px", marginBottom: "8px", border: `1px solid ${blue}20`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={16} color={blue} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: blue, fontFamily: inter }}>{expiringAMC + expiringWarranty} contract{expiringAMC + expiringWarranty > 1 ? "s" : ""} expiring in 30 days</span>
            </div>
            <button type="button" onClick={() => navigate("/vendor/amc")} style={{ padding: "4px 10px", borderRadius: "8px", backgroundColor: blue, border: "none", fontSize: "11px", fontWeight: 700, color: "white", cursor: "pointer", fontFamily: inter }}>Renew</button>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {[
            { label: "PM Schedule", icon: Settings2, onClick: () => navigate("/vendor/maintenance"), color: amber, tint: amberT },
            { label: "AMC Renewals", icon: RefreshCw, onClick: () => navigate("/vendor/amc"), color: blue, tint: blueTint },
            { label: "Warranty", icon: Shield, onClick: () => navigate("/vendor/warranty"), color: green, tint: greenT },
          ].map(a => (
            <button key={a.label} type="button" onClick={a.onClick}
              style={{ flex: 1, padding: "10px 6px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: card, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <a.icon size={16} color={a.color} />
              <span style={{ fontSize: "10px", fontWeight: 700, color: a.color, fontFamily: inter, textAlign: "center" }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "4px 0 0" }}>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none", padding: "0 20px 16px" }}>
          {[
            { label: "All", count: stats.total },
            { label: "Operational", count: stats.healthy },
            { label: "Service Required", count: stats.atRisk },
            { label: "Action Needed", count: stats.critical },
          ].map(f => (
            <button key={f.label} type="button" onClick={() => setFilter(f.label as FilterType)}
              style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: filter === f.label ? blue : card, border: `1px solid ${filter === f.label ? blue : border}`, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: filter === f.label ? `0 4px 12px ${blue}40` : "none" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: filter === f.label ? "white" : inkSec, fontFamily: inter }}>{f.label}</span>
              <div style={{ padding: "2px 6px", borderRadius: "10px", backgroundColor: filter === f.label ? "rgba(255,255,255,0.2)" : divider, fontSize: "10px", fontWeight: 700, color: filter === f.label ? "white" : inkMut, fontFamily: inter }}>
                {f.count}
              </div>
            </button>
          ))}
        </div>
        </div>

        <div style={{ padding: "0 20px 20px" }}>
          {filteredAssets.length > 0 ? (
            filteredAssets.map(asset => (
            <AssetCard 
              key={asset.id} 
              asset={asset} 
              customerName={getCustomerName(asset.customerId)}
              onClick={() => navigate(`/vendor/assets/${asset.id}`)}
            />
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "32px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Package size={32} color={inkMut} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 8px" }}>No assets found</h3>
            <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: 0 }}>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .placeholder-white-50::placeholder { color: rgba(255,255,255,0.6); }
      `}} />
    </MobileLayout>
  );
}
