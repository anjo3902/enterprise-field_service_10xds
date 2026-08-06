import React, { useState } from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { ShieldCheck, Target, Award } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function VendorLeaderboardPage() {
  const { vendors } = useAdminContext();
  const [period, setPeriod] = useState("30 Days");

  const rankedVendors = [...vendors].sort((a, b) => b.slaCompliance - a.slaCompliance);

  const getRankColor = (index: number) => {
    if (index === 0) return tokens.gold;
    if (index === 1) return tokens.silver;
    if (index === 2) return tokens.bronze;
    return tokens.inkSec;
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Vendor Leaderboard" fallbackRoute="/admin/analytics" rightActions={
      <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, outline: "none" }}>
        <option>7 Days</option>
        <option>30 Days</option>
        <option>90 Days</option>
      </select>
    } />}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {rankedVendors.map((v, i) => (
          <div key={v.id} style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: i < 3 ? `2px solid ${getRankColor(i)}` : `1px solid ${tokens.border}`, position: "relative" }}>
            <div className="flex items-start gap-4">
              <div style={{ width: "40px", height: "40px", borderRadius: "20px", backgroundColor: getRankColor(i) + "15", color: getRankColor(i), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "18px" }}>
                #{i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: tokens.ink }}>{v.name}</h3>
                  {i < 3 && <Award size={20} color={getRankColor(i)} fill={getRankColor(i)} />}
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                   <div>
                     <div style={{ fontSize: "11px", color: tokens.inkSec }}>SLA Compliance</div>
                     <div className="flex items-center gap-1.5 mt-1">
                       <ShieldCheck size={14} color={tokens.green} />
                       <span style={{ fontSize: "15px", fontWeight: 700, color: tokens.green }}>{v.slaCompliance}%</span>
                     </div>
                   </div>
                   <div>
                     <div style={{ fontSize: "11px", color: tokens.inkSec }}>CSAT</div>
                     <div className="flex items-center gap-1.5 mt-1">
                       <Target size={14} color={tokens.inkSec} />
                       <span style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink }}>{v.starRating}/5.0</span>
                     </div>
                   </div>
                </div>

              </div>
            </div>
          </div>
        ))}

      </div>
    </MobileLayout>
  );
}
