import React, { useState } from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { ShieldAlert, Globe, Lock, Unlock } from "lucide-react";
import { ConfirmationDialog } from "../../components/admin/shared/ConfirmationDialog";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function FailedLoginsPage() {
  const { failedLogins } = useAdminContext();
  const [ipToBlock, setIpToBlock] = useState<string | null>(null);

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Failed Logins" fallbackRoute="/admin/security" showBackButton={true} />}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>Failed (24h)</div>
             <div style={{ fontSize: "24px", fontWeight: 700, color: tokens.ink }}>{failedLogins.length}</div>
          </div>
          <div style={{ backgroundColor: tokens.card, padding: "16px", borderRadius: "12px", border: `1px solid ${tokens.border}` }}>
             <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>Locked Accounts</div>
             <div style={{ fontSize: "24px", fontWeight: 700, color: tokens.red }}>0</div>
          </div>
        </div>

        {/* List */}
        <div className="flex flex-col gap-3">
          {failedLogins.map(login => (
            <div key={login.id} style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}` }}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} color={tokens.orange} />
                  <span style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>{login.attemptedEmail}</span>
                </div>
                <span style={{ fontSize: "11px", color: tokens.inkMut }}>{new Date(login.timestamp).toLocaleString()}</span>
              </div>
              
              <div style={{ fontSize: "13px", color: tokens.inkSec, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                Reason: <strong style={{ color: tokens.ink }}>{login.failureReason}</strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "12px", backgroundColor: tokens.bg, borderRadius: "8px", border: `1px solid ${tokens.border}`, marginBottom: "12px" }}>
                <div className="flex items-center gap-2">
                   <Globe size={14} color={tokens.inkMut} />
                   <div>
                     <div style={{ fontSize: "11px", color: tokens.inkMut }}>IP Address</div>
                     <div style={{ fontSize: "12px", fontWeight: 500, color: tokens.ink }}>{login.ip}</div>
                   </div>
                </div>
                <div>
                   <div style={{ fontSize: "11px", color: tokens.inkMut }}>Location</div>
                   <div style={{ fontSize: "12px", fontWeight: 500, color: tokens.ink }}>{login.geoLocation || 'Unknown'}</div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span style={{ fontSize: "11px", fontWeight: 600, color: tokens.inkSec }}>Attempts (24h): {login.attemptsFromIpLast24h}</span>
                <button 
                  onClick={() => setIpToBlock(login.ip)}
                  style={{ padding: "6px 12px", backgroundColor: "white", color: tokens.ink, border: `1px solid ${tokens.border}`, borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Lock size={12} /> Block IP
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      <ConfirmationDialog 
        isOpen={!!ipToBlock}
        title="Block IP Address"
        message={`Are you sure you want to block ${ipToBlock} at the firewall level? This will drop all traffic from this origin.`}
        confirmLabel="Block IP"
        confirmColor={tokens.red}
        cancelLabel="Cancel"
        onConfirm={() => setIpToBlock(null)}
        onClose={() => setIpToBlock(null)}
        isDestructive={true}
        icon={Lock}
        iconColor={tokens.red}
      />
    </MobileLayout>
  );
}
