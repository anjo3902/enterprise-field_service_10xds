import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { 
  TrendingUp, BarChart3, Activity, ShieldCheck, 
  Users, DollarSign, Box, Target, Cpu, ChevronRight 
} from "lucide-react";

export default function PlatformAnalyticsPage() {
  const navigate = useNavigate();
  const { platformKpis, vendors, aiModels } = useAdminContext();
  const [period, setPeriod] = useState("30 Days");

  const avgSla = vendors.reduce((acc, v) => acc + v.slaCompliance, 0) / (vendors.length || 1);
  const avgAiAcc = aiModels.reduce((acc, m) => acc + m.accuracy, 0) / (aiModels.length || 1);

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="Platform Analytics" showBackButton={true} fallbackRoute="/admin/dashboard" rightActions={
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, outline: "none" }}>
          <option value="Today">Today</option>
          <option value="7 Days">7 Days</option>
          <option value="30 Days">30 Days</option>
          <option value="90 Days">90 Days</option>
        </select>
      } />}
    >
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>Total Tickets</div>
             <div style={{ fontSize: "24px", fontWeight: 700, color: tokens.ink }}>{platformKpis?.totalTickets?.toLocaleString() || "14,230"}</div>
             <div className="flex items-center gap-1 mt-2" style={{ color: tokens.green, fontSize: "11px", fontWeight: 600 }}><TrendingUp size={12} /> +12% vs last {period}</div>
          </div>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>Avg SLA Compliance</div>
             <div style={{ fontSize: "24px", fontWeight: 700, color: avgSla >= 95 ? tokens.green : tokens.orange }}>{avgSla.toFixed(1)}%</div>
             <div className="flex items-center gap-1 mt-2" style={{ color: tokens.inkSec, fontSize: "11px", fontWeight: 600 }}><Target size={12} /> Target: 95%</div>
          </div>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>Avg Resolution Time</div>
             <div style={{ fontSize: "24px", fontWeight: 700, color: tokens.ink }}>4.2h</div>
             <div className="flex items-center gap-1 mt-2" style={{ color: tokens.green, fontSize: "11px", fontWeight: 600 }}><TrendingUp size={12} style={{ transform: "scaleY(-1)" }} /> -0.4h</div>
          </div>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>AI Accuracy</div>
             <div style={{ fontSize: "24px", fontWeight: 700, color: tokens.primary }}>{avgAiAcc.toFixed(1)}%</div>
             <div className="flex items-center gap-1 mt-2" style={{ color: tokens.inkSec, fontSize: "11px", fontWeight: 600 }}><Cpu size={12} /> {aiModels.length} models active</div>
          </div>
        </div>

        {/* Deep Dive Actions */}
        <div className="flex flex-col gap-2">
          <button onClick={() => navigate('/admin/analytics/tenants')} style={{ padding: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: "12px", cursor: "pointer" }}>
            <div className="flex items-center gap-3"><BarChart3 size={18} color={tokens.primary} /><span style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>Tenant Comparison</span></div>
            <ChevronRight size={18} color={tokens.inkMut} />
          </button>
          <button onClick={() => navigate('/admin/analytics/vendors')} style={{ padding: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: "12px", cursor: "pointer" }}>
            <div className="flex items-center gap-3"><ShieldCheck size={18} color={tokens.green} /><span style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>Vendor Leaderboard</span></div>
            <ChevronRight size={18} color={tokens.inkMut} />
          </button>
          <button onClick={() => navigate('/admin/analytics/technicians')} style={{ padding: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: "12px", cursor: "pointer" }}>
            <div className="flex items-center gap-3"><Users size={18} color={tokens.orange} /><span style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>Technician Utilization</span></div>
            <ChevronRight size={18} color={tokens.inkMut} />
          </button>
        </div>

        {/* Revenue Summary */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <div className="flex items-center gap-2 mb-4">
             <DollarSign size={18} color={tokens.inkSec} />
             <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>Revenue Opportunity</h3>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: tokens.primary, marginBottom: "12px" }}>
            $2.4M
          </div>
          <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between">
               <div style={{ fontSize: "13px", fontWeight: 500, color: tokens.inkSec }}>AMC Renewals</div>
               <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>$1.2M</div>
             </div>
             <div className="flex items-center justify-between">
               <div style={{ fontSize: "13px", fontWeight: 500, color: tokens.inkSec }}>Warranty Conversions</div>
               <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>$800K</div>
             </div>
             <div className="flex items-center justify-between">
               <div style={{ fontSize: "13px", fontWeight: 500, color: tokens.inkSec }}>Predictive Maintenance</div>
               <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>$400K</div>
             </div>
          </div>
        </div>

        {/* Asset Summary */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <div className="flex items-center gap-2 mb-4">
             <Box size={18} color={tokens.inkSec} />
             <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>Asset Health</h3>
          </div>
          <div className="flex items-center gap-4">
            <div style={{ width: "80px", height: "80px", borderRadius: "40px", border: `8px solid ${tokens.border}`, borderTopColor: tokens.green, borderRightColor: tokens.green, borderBottomColor: tokens.orange, borderLeftColor: tokens.red }} />
            <div className="flex flex-col gap-2 flex-1">
               <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.green }} /><span style={{ fontSize: "12px", color: tokens.inkSec }}>Healthy</span></div><span style={{ fontSize: "12px", fontWeight: 600 }}>65%</span></div>
               <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.orange }} /><span style={{ fontSize: "12px", color: tokens.inkSec }}>At Risk</span></div><span style={{ fontSize: "12px", fontWeight: 600 }}>25%</span></div>
               <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.red }} /><span style={{ fontSize: "12px", color: tokens.inkSec }}>Critical</span></div><span style={{ fontSize: "12px", fontWeight: 600 }}>10%</span></div>
            </div>
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
