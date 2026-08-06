import React from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { BrainCircuit, Cpu, Target, ShieldAlert, ChevronRight, Activity } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminBadge } from "../../components/admin/shared/AdminBadge";

export default function AIOverviewPage() {
  const navigate = useNavigate();
  const { aiModels } = useAdminContext();

  const avgAccuracy = aiModels.reduce((acc, m) => acc + m.accuracy, 0) / (aiModels.length || 1);
  const avgHitl = aiModels.reduce((acc, m) => acc + m.hitlRate, 0) / (aiModels.length || 1);
  const degradedModels = aiModels.filter(m => m.status === 'Degraded').length;

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="AI Configuration" fallbackRoute="/admin/dashboard" showBackButton={true} rightActions={
        <div style={{ fontSize: "11px", fontWeight: 600, padding: "4px 8px", borderRadius: "12px", backgroundColor: degradedModels> 0 ? tokens.orange + "20" : tokens.green + "20", color: degradedModels > 0 ? tokens.orange : tokens.green }}>
          {degradedModels > 0 ? "Degraded" : "Healthy"}
        </div>
      } />}
    >
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "30px" }}>
        
        {/* Health Summary Card */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: tokens.primary }} />
          <div className="flex items-center gap-3 mb-4">
             <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tokens.primary + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
               <BrainCircuit size={20} color={tokens.primary} />
             </div>
             <div>
               <h2 style={{ fontSize: "16px", fontWeight: 700, color: tokens.ink, margin: 0 }}>Platform AI Health</h2>
               <div style={{ fontSize: "12px", color: tokens.inkSec }}>Last updated: {new Date().toLocaleTimeString()}</div>
             </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
             <div>
               <div className="flex items-center gap-1.5 mb-1"><Target size={14} color={tokens.inkSec} /><span style={{ fontSize: "12px", color: tokens.inkSec }}>Avg Accuracy</span></div>
               <div style={{ fontSize: "20px", fontWeight: 700, color: avgAccuracy > 90 ? tokens.green : tokens.ink }}>{avgAccuracy.toFixed(1)}%</div>
             </div>
             <div>
               <div className="flex items-center gap-1.5 mb-1"><ShieldAlert size={14} color={tokens.inkSec} /><span style={{ fontSize: "12px", color: tokens.inkSec }}>HITL Rate</span></div>
               <div style={{ fontSize: "20px", fontWeight: 700, color: tokens.ink }}>{avgHitl.toFixed(1)}%</div>
             </div>
             <div>
               <div className="flex items-center gap-1.5 mb-1"><Cpu size={14} color={tokens.inkSec} /><span style={{ fontSize: "12px", color: tokens.inkSec }}>Active Models</span></div>
               <div style={{ fontSize: "20px", fontWeight: 700, color: tokens.ink }}>{aiModels.length}</div>
             </div>
             <div>
               <div className="flex items-center gap-1.5 mb-1"><Activity size={14} color={tokens.inkSec} /><span style={{ fontSize: "12px", color: tokens.inkSec }}>Warnings</span></div>
               <div style={{ fontSize: "20px", fontWeight: 700, color: degradedModels > 0 ? tokens.orange : tokens.ink }}>{degradedModels}</div>
             </div>
          </div>
        </div>

        <button onClick={() => navigate('/admin/ai-config/insights')} style={{ width: "100%", padding: "14px", backgroundColor: tokens.card, color: tokens.primary, border: `1px solid ${tokens.border}`, borderRadius: "12px", fontSize: "15px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <BrainCircuit size={18} /> View AI Insight Feed
        </button>

        <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "8px 0 0", color: tokens.ink }}>Deployed Models</h3>

        {/* Model Cards */}
        <div className="flex flex-col gap-3">
          {aiModels.map(model => (
            <div key={model.id} onClick={() => navigate(`/admin/ai-config/${model.id}`)} style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}`, cursor: "pointer" }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink, margin: "0 0 2px" }}>{model.name}</h3>
                  <div style={{ fontSize: "12px", color: tokens.inkMut }}>{model.purpose}</div>
                </div>
                <ChevronRight size={18} color={tokens.inkMut} />
              </div>

              <div style={{ height: "1px", backgroundColor: tokens.border, margin: "12px 0" }} />

              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span style={{ fontSize: "11px", color: tokens.inkSec, marginBottom: "2px" }}>Accuracy</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: model.accuracy > 90 ? tokens.green : tokens.orange }}>{model.accuracy}%</span>
                </div>
                <div className="flex flex-col">
                  <span style={{ fontSize: "11px", color: tokens.inkSec, marginBottom: "2px" }}>Confidence</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{model.avgConfidence.toFixed(2)}</span>
                </div>
                <div className="flex flex-col">
                  <span style={{ fontSize: "11px", color: tokens.inkSec, marginBottom: "2px" }}>HITL Rate</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{model.hitlRate}%</span>
                </div>
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                  <AdminBadge status={model.status} />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </MobileLayout>
  );
}
