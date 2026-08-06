import React, { useState } from "react";
import { useParams } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { ConfirmationDialog } from "../../components/admin/shared/ConfirmationDialog";
import { Settings2, ShieldAlert, Cpu, Bot, TrendingUp, AlertTriangle } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminBadge } from "../../components/admin/shared/AdminBadge";

export default function AIModelDetailPage() {
  const { id } = useParams();
  const { aiModels } = useAdminContext();
  
  const model = aiModels.find(m => m.id === id);

  const [threshold, setThreshold] = useState(model?.confidenceThreshold || 0.85);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  if (!model) return <div>Model not found</div>;

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title={model.name} fallbackRoute="/admin/ai-config" showBackButton={true} rightActions={
        <AdminBadge status={model.status} />
      } />}
    >
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "30px" }}>
        
        {/* Performance Metrics */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
           <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px", color: tokens.ink }}>Performance Metrics</h3>
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
             <div style={{ padding: "12px", backgroundColor: tokens.bg, borderRadius: "8px", border: `1px solid ${tokens.border}` }}>
               <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={14} color={tokens.inkSec} /><span style={{ fontSize: "12px", color: tokens.inkSec }}>Accuracy Trend</span></div>
               <div style={{ fontSize: "18px", fontWeight: 700, color: tokens.ink }}>{model.accuracy}%</div>
             </div>
             <div style={{ padding: "12px", backgroundColor: tokens.bg, borderRadius: "8px", border: `1px solid ${tokens.border}` }}>
               <div className="flex items-center gap-1.5 mb-1"><ShieldAlert size={14} color={tokens.inkSec} /><span style={{ fontSize: "12px", color: tokens.inkSec }}>HITL Rate</span></div>
               <div style={{ fontSize: "18px", fontWeight: 700, color: tokens.ink }}>{model.hitlRate}%</div>
             </div>
           </div>
           
           <div style={{ height: "60px", display: "flex", alignItems: "flex-end", gap: "4px", paddingTop: "10px", borderTop: `1px solid ${tokens.border}` }}>
             {/* Fake bar chart for accuracy trend */}
             {model.accuracyTrend.map((val, i) => (
               <div key={i} style={{ flex: 1, backgroundColor: tokens.primary, opacity: val / 100, height: `${val}%`, borderRadius: "2px 2px 0 0" }} />
             ))}
           </div>
           <div style={{ fontSize: "11px", color: tokens.inkMut, textAlign: "center", marginTop: "4px" }}>30 Day Trend</div>
        </div>

        {/* Confidence Config */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <div className="flex items-center gap-2 mb-4">
             <Settings2 size={18} color={tokens.primary} />
             <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>Confidence Threshold</h3>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>Threshold Value</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: tokens.primary }}>{threshold.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="0.99" 
              step="0.01" 
              value={threshold} 
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: tokens.primary }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
            <div className="flex items-center gap-2">
              <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.green }} />
              <span style={{ fontSize: "12px", color: tokens.inkSec }}>Auto-approve predictions above <strong>{threshold.toFixed(2)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.orange }} />
              <span style={{ fontSize: "12px", color: tokens.inkSec }}>Require human review (HITL) below <strong>{threshold.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>

        {/* HITL Rules */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <div className="flex items-center gap-2 mb-4">
             <Bot size={18} color={tokens.inkSec} />
             <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>HITL Trigger Rules</h3>
          </div>
          <div className="flex flex-col gap-3">
            {Object.entries(model.hitlTriggerRules).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center">
                <span style={{ fontSize: "13px", color: tokens.ink }}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <div style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: val ? tokens.green : tokens.border, display: "flex", alignItems: "center", padding: "2px", justifyContent: val ? "flex-end" : "flex-start", transition: "all 0.2s" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Rules */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <div className="flex items-center gap-2 mb-4">
             <AlertTriangle size={18} color={tokens.red} />
             <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>Safety Rules</h3>
          </div>
          <p style={{ fontSize: "12px", color: tokens.inkMut, marginBottom: "12px" }}>Predictions matching these rules will be blocked or escalated immediately.</p>
          <div className="flex flex-wrap gap-2">
             {model.safetyRules.map(rule => (
               <span key={rule} style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "16px", border: `1px solid ${tokens.red}40`, backgroundColor: tokens.red + "10", color: tokens.red }}>
                 {rule}
               </span>
             ))}
             <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "16px", border: `1px dashed ${tokens.border}`, color: tokens.inkSec, cursor: "pointer" }}>+ Add Rule</span>
          </div>
        </div>

        {/* Save */}
        <button onClick={() => setShowSaveDialog(true)} style={{ width: "100%", padding: "14px", backgroundColor: tokens.primary, color: "white", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>
          Save Configuration
        </button>

      </div>

      <ConfirmationDialog 
        isOpen={showSaveDialog}
        title="Update Model Config"
        message="Changes to the confidence threshold and HITL rules will affect all new tickets processed by this model immediately. Confirm?"
        confirmLabel="Apply Changes"
        confirmColor={tokens.primary}
        cancelLabel="Cancel"
        onConfirm={() => setShowSaveDialog(false)}
        onClose={() => setShowSaveDialog(false)}
        isDestructive={false}
        icon={Cpu}
        iconColor={tokens.primary}
      />

    </MobileLayout>
  );
}
