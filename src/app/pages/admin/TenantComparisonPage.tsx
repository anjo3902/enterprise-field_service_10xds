import React, { useState } from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { Building2, Download, Filter, RefreshCcw, CheckCircle } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function TenantComparisonPage() {
  const { organizations } = useAdminContext();
  const [metric, setMetric] = useState("Tickets");
  const [showToast, setShowToast] = useState(false);
  const [filterActive, setFilterActive] = useState(false);

  const handleExport = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Tenant Comparison" fallbackRoute="/admin/analytics" />}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button 
            onClick={() => setFilterActive(!filterActive)} 
            style={{ padding: "6px 12px", backgroundColor: filterActive ? tokens.primaryTint : "white", color: filterActive ? tokens.primary : tokens.inkSec, border: `1px solid ${filterActive ? tokens.primaryTint : tokens.border}`, borderRadius: "8px", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
          >
            <Filter size={14} /> Filter
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            {filterActive && (
              <button 
                onClick={() => setFilterActive(false)} 
                style={{ padding: "6px 12px", backgroundColor: "transparent", color: tokens.inkMut, border: `1px solid ${tokens.border}`, borderRadius: "8px", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
              >
                <RefreshCcw size={14} /> Reset
              </button>
            )}
            <button 
              onClick={handleExport} 
              style={{ padding: "6px 12px", backgroundColor: "white", color: tokens.primary, border: `1px solid ${tokens.border}`, borderRadius: "8px", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {["Tickets", "SLA Rate", "Assets", "CSAT"].map(m => (
            <button 
              key={m}
              onClick={() => setMetric(m)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "16px",
                border: `1px solid ${metric === m ? tokens.primary : tokens.border}`,
                backgroundColor: metric === m ? "#E6F0FF" : tokens.card,
                color: metric === m ? tokens.primary : tokens.inkSec,
                fontSize: "13px",
                fontWeight: metric === m ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px", color: tokens.ink }}>Comparison by {metric}</h3>
          <div className="flex flex-col gap-4">
            {organizations.map((org, i) => {
              // Mock logic for demo
              let val = 0; let pct = 0; let color = tokens.primary;
              if (metric === "Tickets") { val = org.ticketCount; pct = Math.min((val / 1000) * 100, 100); color = "#3B82F6"; }
              if (metric === "SLA Rate") { val = org.slaRate; pct = val; color = val >= 95 ? tokens.green : "#EA580C"; }
              if (metric === "Assets") { val = org.assetCount; pct = Math.min((val / 2000) * 100, 100); color = "#8B5CF6"; }
              if (metric === "CSAT") { val = 4.8 - (i * 0.1); pct = (val / 5) * 100; color = "#EAB308"; }

              return (
                <div key={org.id}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} color={tokens.inkMut} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{org.name}</span>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: tokens.ink }}>{metric === "SLA Rate" ? val + "%" : metric === "CSAT" ? val.toFixed(1) : val}</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", backgroundColor: "#F1F5F9", borderRadius: "4px" }}>
                    <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>


      </div>

      {showToast && (
        <div style={{
          position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: tokens.ink, color: "white", padding: "12px 24px",
          borderRadius: "30px", display: "flex", alignItems: "center", gap: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)", animation: "fadeInUp 0.3s ease-out", zIndex: 1000
        }}>
          <CheckCircle size={18} color={tokens.green} />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Report exported successfully</span>
        </div>
      )}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>
    </MobileLayout>
  );
}
