import React from "react";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { useVendor } from "../../contexts/VendorContext";
import { TrendingUp, DollarSign, PieChart, ArrowUpRight, BarChart3 } from "lucide-react";
import { VendorBottomNavigation } from "./VendorBottomNavigation";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const purple   = "#7C3AED";
const purpleT  = "#F5F3FF";
const teal     = "#0891B2";
const tealT    = "#ECFEFF";
const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

export default function VendorRevenue() {
  const { revenueHistory, currentMonthRevenue } = useVendor();

  const totalRevenue = revenueHistory.reduce((sum, h) => sum + h.revenue, 0);

  return (
    <MobileLayout bottomNav={<VendorBottomNavigation />} backgroundColor={bg} header={<BackHeader title="Revenue Intelligence" fallbackRoute="/vendor/dashboard" />}>
      <div style={{ padding: "16px 20px" }}>
        
        {/* ── Main KPI ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: inkMut, fontFamily: inter, letterSpacing: "0.05em", marginBottom: "4px" }}>REVENUE YTD</div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: ink, fontFamily: inter, lineHeight: 1 }}>AED {(totalRevenue / 1000).toFixed(0)}K</div>
            </div>
            <div style={{ padding: "6px 10px", borderRadius: "8px", backgroundColor: greenT, display: "flex", alignItems: "center", gap: "4px" }}>
              <ArrowUpRight size={14} color={green} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: green, fontFamily: inter }}>+8.2%</span>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "120px", marginTop: "20px" }}>
            {revenueHistory.map((h, i) => {
              const hPercent = (h.revenue / 150000) * 100; // max scale 150k
              return (
                <div key={h.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", backgroundColor: divider, borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: `${hPercent}%`, backgroundColor: i === revenueHistory.length - 1 ? teal : tealT, borderTopLeftRadius: "6px", borderTopRightRadius: "6px" }} />
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: inkMut, fontFamily: inter }}>{h.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Current Month Breakdown ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 16px", fontFamily: inter, display: "flex", alignItems: "center", gap: "8px" }}>
            <PieChart size={18} color={purple} /> Current Month Breakdown
          </h3>

          <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, fontFamily: inter, color: teal, marginBottom: "4px" }}>
            AED {(currentMonthRevenue.revenue / 1000).toFixed(1)}K
          </div>
          <div style={{ fontSize: "12px", color: inkSec, fontFamily: inter, marginBottom: "20px" }}>Total generated in {currentMonthRevenue.month}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter }}>Labor Services</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>AED {(currentMonthRevenue.labor / 1000).toFixed(1)}K</span>
              </div>
              <div style={{ width: "100%", height: "6px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden" }}>
                <div style={{ width: `${(currentMonthRevenue.labor / currentMonthRevenue.revenue) * 100}%`, height: "100%", backgroundColor: blue, borderRadius: "100px" }} />
              </div>
            </div>
            
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter }}>Parts & Materials</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>AED {(currentMonthRevenue.parts / 1000).toFixed(1)}K</span>
              </div>
              <div style={{ width: "100%", height: "6px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden" }}>
                <div style={{ width: `${(currentMonthRevenue.parts / currentMonthRevenue.revenue) * 100}%`, height: "100%", backgroundColor: purple, borderRadius: "100px" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Billable Jobs ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart3 size={20} color={blue} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter, marginBottom: "2px" }}>BILLABLE JOBS</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter }}>{currentMonthRevenue.jobs}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter, marginBottom: "2px" }}>AVG REVENUE / JOB</div>
            <div style={{ fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em", color: green, fontFamily: inter }}>
              AED {(currentMonthRevenue.revenue / currentMonthRevenue.jobs).toFixed(0)}
            </div>
          </div>
        </div>
        
      </div>
    </MobileLayout>
  );
}
