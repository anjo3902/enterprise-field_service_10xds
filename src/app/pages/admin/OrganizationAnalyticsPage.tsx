import React from "react";
import { useParams } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function OrganizationAnalyticsPage() {
  const { id } = useParams();
  const { organizations } = useAdminContext();
  const org = organizations.find(o => o.id === id);

  if (!org) return <div>Not found</div>;

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Org Analytics" subtitle={org.name} fallbackRoute={`/admin/organizations/${id}`} />}>
      <div style={{ padding: "20px 16px" }}>
        
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px" }}>30-Day Overview</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>Total Tickets</div>
             <div style={{ fontSize: "24px", fontWeight: 700 }}>248</div>
             <div className="flex items-center gap-1 mt-2" style={{ color: "#16A34A", fontSize: "11px", fontWeight: 600 }}><TrendingUp size={12} /> +12% vs last mo</div>
          </div>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>SLA Compliance</div>
             <div style={{ fontSize: "24px", fontWeight: 700, color: "#16A34A" }}>96.5%</div>
             <div className="flex items-center gap-1 mt-2" style={{ color: tokens.inkSec, fontSize: "11px", fontWeight: 600 }}>Target: 95.0%</div>
          </div>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>Avg Resolution</div>
             <div style={{ fontSize: "24px", fontWeight: 700 }}>4.2h</div>
          </div>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>Breaches</div>
             <div style={{ fontSize: "24px", fontWeight: 700, color: "#DC2626" }}>3</div>
          </div>
        </div>

        <div style={{ backgroundColor: tokens.card, padding: "20px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
          <div className="flex items-center gap-2 mb-4">
             <BarChart3 size={18} color={tokens.primary} />
             <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Ticket Categories</h3>
          </div>
          
          <div className="flex flex-col gap-3">
             {[
               { name: "HVAC", count: 120, pct: 48 },
               { name: "Electrical", count: 80, pct: 32 },
               { name: "Plumbing", count: 48, pct: 20 },
             ].map(cat => (
               <div key={cat.name}>
                 <div className="flex justify-between" style={{ fontSize: "12px", marginBottom: "4px", fontWeight: 500 }}>
                   <span>{cat.name}</span>
                   <span>{cat.count}</span>
                 </div>
                 <div style={{ width: "100%", height: "6px", backgroundColor: "#F1F5F9", borderRadius: "3px" }}>
                   <div style={{ width: `${cat.pct}%`, height: "100%", backgroundColor: tokens.primary, borderRadius: "3px" }} />
                 </div>
               </div>
             ))}
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
