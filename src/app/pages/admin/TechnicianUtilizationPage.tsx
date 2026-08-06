import React from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { Users, Activity, CheckCircle, Clock } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function TechnicianUtilizationPage() {
  const { users } = useAdminContext();

  const techs = users.filter(u => u.role === 'technician');

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Technician Utilization" fallbackRoute="/admin/analytics" />}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div className="flex items-center gap-2 mb-2">
               <Users size={16} color={tokens.inkMut} />
               <div style={{ fontSize: "12px", color: tokens.inkSec }}>Total Active</div>
             </div>
             <div style={{ fontSize: "24px", fontWeight: 700 }}>{techs.length}</div>
          </div>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div className="flex items-center gap-2 mb-2">
               <Activity size={16} color={tokens.inkMut} />
               <div style={{ fontSize: "12px", color: tokens.inkSec }}>Avg Jobs/Mo</div>
             </div>
             <div style={{ fontSize: "24px", fontWeight: 700 }}>42</div>
          </div>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div className="flex items-center gap-2 mb-2">
               <CheckCircle size={16} color={tokens.inkMut} />
               <div style={{ fontSize: "12px", color: tokens.inkSec }}>Completion Rate</div>
             </div>
             <div style={{ fontSize: "24px", fontWeight: 700, color: tokens.green }}>94%</div>
          </div>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div className="flex items-center gap-2 mb-2">
               <Clock size={16} color={tokens.inkMut} />
               <div style={{ fontSize: "12px", color: tokens.inkSec }}>Avg On-Site</div>
             </div>
             <div style={{ fontSize: "24px", fontWeight: 700 }}>1.8h</div>
          </div>
        </div>

        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
           <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px", color: tokens.ink }}>Availability Breakdown</h3>
           <div className="flex flex-col gap-3">
             {[
               { label: "Available", count: 12, pct: 40, color: tokens.green },
               { label: "On Job", count: 15, pct: 50, color: tokens.primary },
               { label: "Off Duty", count: 3, pct: 10, color: tokens.inkMut }
             ].map(stat => (
               <div key={stat.label}>
                 <div className="flex justify-between" style={{ fontSize: "12px", marginBottom: "4px", fontWeight: 500 }}>
                   <div className="flex items-center gap-1.5"><div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stat.color }} /> {stat.label}</div>
                   <span>{stat.count}</span>
                 </div>
                 <div style={{ width: "100%", height: "6px", backgroundColor: "#F1F5F9", borderRadius: "3px" }}>
                   <div style={{ width: `${stat.pct}%`, height: "100%", backgroundColor: stat.color, borderRadius: "3px" }} />
                 </div>
               </div>
             ))}
           </div>
        </div>

      </div>
    </MobileLayout>
  );
}
