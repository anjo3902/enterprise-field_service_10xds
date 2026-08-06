import React, { useState } from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { BrainCircuit, CheckCircle, XCircle, Clock } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminEmptyState } from "../../components/admin/shared/AdminEmptyState";

export default function AIInsightFeedPage() {
  const { aiInsights } = useAdminContext();
  const [filter, setFilter] = useState("All");

  const filteredInsights = filter === "All" ? aiInsights : aiInsights.filter(i => i.outcome === filter.toLowerCase());

  const getOutcomeIcon = (outcome: string) => {
    switch(outcome) {
      case 'correct': return <CheckCircle size={16} color={tokens.green} />;
      case 'incorrect': return <XCircle size={16} color={tokens.red} />;
      case 'pending': return <Clock size={16} color={tokens.orange} />;
      default: return null;
    }
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}  header={<BackHeader title="AI Insights" subtitle="Decision Feed" fallbackRoute="/admin/ai-config" showBackButton={true} />}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {["All", "Correct", "Incorrect", "Pending"].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "16px",
                border: `1px solid ${filter === f ? tokens.primary : tokens.border}`,
                backgroundColor: filter === f ? "#E6F0FF" : tokens.card,
                color: filter === f ? tokens.primary : tokens.inkSec,
                fontSize: "13px",
                fontWeight: filter === f ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-3">
           {filteredInsights.length > 0 ? filteredInsights.map(insight => (
             <div key={insight.id} style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}` }}>
               <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2">
                   <BrainCircuit size={16} color={tokens.primary} />
                   <span style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkMut }}>{insight.modelId}</span>
                 </div>
                 <span style={{ fontSize: "11px", fontFamily: "monospace", color: tokens.inkSec }}>{insight.ticketId}</span>
               </div>
               
               <p style={{ fontSize: "14px", color: tokens.ink, margin: "0 0 12px", fontWeight: 500, lineHeight: 1.4 }}>
                 {insight.decision}
               </p>

               <div style={{ height: "1px", backgroundColor: tokens.border, margin: "12px 0" }} />

               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-4">
                   <div style={{ fontSize: "12px" }}>
                     <span style={{ color: tokens.inkMut }}>Conf: </span>
                     <span style={{ fontWeight: 600, color: insight.confidence > 0.85 ? tokens.green : tokens.orange }}>{insight.confidence.toFixed(2)}</span>
                   </div>
                   {insight.hitlTriggered && (
                     <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", backgroundColor: "#FEFCE8", color: "#A16207", border: "1px solid #FDE047" }}>HITL Triggered</span>
                   )}
                 </div>
                 <div className="flex items-center gap-1.5" style={{ fontSize: "12px", fontWeight: 600, color: tokens.ink }}>
                   {getOutcomeIcon(insight.outcome)}
                   <span style={{ textTransform: "capitalize" }}>{insight.outcome}</span>
                 </div>
               </div>
             </div>
           )) : (
             <AdminEmptyState 
               icon={<BrainCircuit size={24} />}
               title="No insights found"
               description="No insights match the current filters."
             />
           )}
        </div>

      </div>
    </MobileLayout>
  );
}
