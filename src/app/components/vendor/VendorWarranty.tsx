import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor, VendorAsset } from "../../contexts/VendorContext";
import {
  ArrowLeft, Shield, Search, X, AlertTriangle, ArrowRight, CheckCircle2
} from "lucide-react";

const blue = "#2563EB", blueMid = "#3B82F6", blueTint = "#EFF6FF", green = "#16A34A", greenT = "#DCFCE7", amber = "#D97706", amberT = "#FFFBEB", red = "#DC2626", redT = "#FEF2F2", ink = "#0F172A", inkSec = "#475569", inkMut = "#64748B", bg = "#F8FAFC", card = "#FFFFFF", border = "#E2E8F0", divider = "#F1F5F9", inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

export default function VendorWarranty() {
  const navigate = useNavigate();
  const { warrantyRenewals, getAssetById, customers } = useVendor();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Pending Action" | "Active">("All");

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || "Unknown Customer";

  const warranties = useMemo(() => {
    let list = warrantyRenewals.map(r => {
      const asset = getAssetById(r.assetId);
      const days = Math.ceil((new Date(r.currentExpiryDate).getTime() - Date.now()) / 86400000);
      return { ...r, asset, days };
    }).filter(r => r.asset !== undefined) as (typeof warrantyRenewals[0] & { asset: VendorAsset, days: number })[];

    if (filter === "Pending Action") {
      list = list.filter(r => r.status === "New Request" || r.status === "Under Review" || r.status === "Inspection Required" || r.status === "Inspection Completed");
    } else if (filter === "Active") {
      list = list.filter(r => r.status === "Activated");
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.asset.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || getCustomerName(r.asset.customerId).toLowerCase().includes(q));
    }

    return list.sort((a, b) => a.days - b.days);
  }, [warrantyRenewals, getAssetById, search, filter, customers]);

  const expiringCount = warrantyRenewals.filter(r => {
    const days = Math.ceil((new Date(r.currentExpiryDate).getTime() - Date.now()) / 86400000);
    return days <= 30 && days >= 0 && r.status !== "Activated";
  }).length;

  return (
    <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
        padding: "50px 20px 24px", flexShrink: 0, position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <button type="button" style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "10px", padding: "6px 12px 6px 9px",
            cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter,
          }} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} color="white" /> Back
          </button>
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: inter, marginBottom: "4px" }}>
          Warranty Contracts
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", fontFamily: inter }}>
          Manage extensions, quotations, and approvals
        </p>

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <div style={{ flex: 1, height: "44px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", padding: "0 14px", gap: "10px" }}>
            <Search size={18} color="white" />
            <input 
              type="text" 
              placeholder="Search warranties..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", fontSize: "14px", color: "white", outline: "none", fontFamily: inter }}
              className="placeholder-white-50"
            />
            {search && <X size={16} color="white" style={{ cursor: "pointer" }} onClick={() => setSearch("")} />}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {expiringCount > 0 && filter !== "Active" && (
          <div style={{ backgroundColor: redT, borderRadius: "12px", padding: "14px", marginBottom: "16px", border: `1px solid ${red}30` }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <AlertTriangle size={20} color={red} style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 800, color: red, margin: "0 0 4px", fontFamily: inter }}>Expiring Warranties</h4>
                <p style={{ fontSize: "12.5px", color: "#991B1B", margin: "0 0 10px", fontFamily: inter, lineHeight: 1.4 }}>
                  There are <b>{expiringCount}</b> warranties expiring soon that require attention.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "16px" }}>
          {["All", "Pending Action", "Active"].map(f => (
            <button key={f} type="button" onClick={() => setFilter(f as any)}
              style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: filter === f ? blue : card, border: `1px solid ${filter === f ? blue : border}`, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: filter === f ? `0 4px 12px ${blue}40` : "none", transition: "all 0.2s" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: filter === f ? "white" : inkSec, fontFamily: inter }}>{f}</span>
            </button>
          ))}
        </div>

        {warranties.length > 0 ? warranties.map(r => (
          <div key={r.id} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", marginBottom: "12px", boxShadow: cardShadow }} onClick={() => navigate(`/vendor/warranty/${r.id}`)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: blue, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: inter }}>{getCustomerName(r.asset.customerId)}</div>
                  {r.status === "Activated" ? (
                    <div style={{ padding: "2px 6px", borderRadius: "100px", backgroundColor: greenT, fontSize: "9px", fontWeight: 700, color: green, fontFamily: inter, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={10} /> Active
                    </div>
                  ) : (
                    <div style={{ padding: "2px 6px", borderRadius: "100px", backgroundColor: r.days <= 30 ? redT : amberT, fontSize: "9px", fontWeight: 700, color: r.days <= 30 ? red : amber, fontFamily: inter, textTransform: "uppercase" }}>
                      {r.days <= 30 ? "Expiring Soon" : "Pending"}
                    </div>
                  )}
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter, letterSpacing: "-0.01em" }}>{r.asset.name}</h3>
                <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>Ref: {r.id}</p>
              </div>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={16} color={blue} />
              </div>
            </div>

            <div style={{ backgroundColor: bg, borderRadius: "8px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px", border: `1px solid ${border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter, textTransform: "uppercase" }}>Workflow Status</span>
                <div style={{ fontSize: "12px", fontWeight: 700, color: ink, fontFamily: inter }}>{r.status}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter, textTransform: "uppercase" }}>Current Expiry</span>
                <div style={{ fontSize: "12px", fontWeight: 700, color: ink, fontFamily: inter }}>
                  {new Date(r.currentExpiryDate).toLocaleDateString()} 
                  {r.status !== "Activated" && ` (${r.days} Days)`}
                </div>
              </div>
            </div>

            <button style={{ width: "100%", height: "40px", borderRadius: "10px", backgroundColor: divider, color: ink, border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}>
              View Request Details <ArrowRight size={14} />
            </button>
          </div>
        )) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Shield size={32} color={inkMut} style={{ marginBottom: "16px" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 8px" }}>No warranties found</h3>
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
