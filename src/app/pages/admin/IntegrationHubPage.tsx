import React from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { Settings, CheckCircle, XCircle, Key } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function IntegrationHubPage() {
  const { integrations } = useAdminContext();

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Integrations" fallbackRoute="/admin/platform" showBackButton={true} />}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        <div className="flex flex-col gap-3">
          {integrations.map(integ => (
            <div key={integ.id} style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}` }}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: tokens.bg, border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Settings size={20} color={tokens.inkSec} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: tokens.ink }}>{integ.name}</div>
                    <div style={{ fontSize: "12px", color: tokens.inkSec }}>{integ.type}</div>
                  </div>
                </div>
                {integ.status === 'connected' ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: tokens.green }}><CheckCircle size={12} /> Connected</span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: tokens.red }}><XCircle size={12} /> Disconnected</span>
                )}
              </div>
              
              <div style={{ fontSize: "11px", color: tokens.inkMut, marginBottom: "12px" }}>
                Last Sync: {new Date(integ.lastSync).toLocaleString()}
              </div>

              <div className="flex items-center gap-2">
                <button style={{ flex: 1, padding: "8px", backgroundColor: tokens.primary, color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Configure</button>
                <button style={{ flex: 1, padding: "8px", backgroundColor: "white", color: tokens.ink, border: `1px solid ${tokens.border}`, borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Test Sync</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}`, marginTop: "8px" }}>
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
               <Key size={16} color={tokens.ink} />
               <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>API Keys</h3>
             </div>
             <button style={{ background: "none", border: "none", color: tokens.primary, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>+ Generate New</button>
           </div>
           
           <div className="flex flex-col gap-2">
             <div style={{ padding: "12px", backgroundColor: tokens.bg, borderRadius: "8px", border: `1px solid ${tokens.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <div>
                 <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>PowerBI Reporting Key</div>
                 <div style={{ fontSize: "11px", color: tokens.inkMut, fontFamily: "monospace", marginTop: "2px" }}>Created 2 months ago</div>
               </div>
               <button style={{ background: "none", border: "none", color: tokens.red, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Revoke</button>
             </div>
           </div>
        </div>

      </div>
    </MobileLayout>
  );
}
