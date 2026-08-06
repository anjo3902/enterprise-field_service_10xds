import React, { useState } from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { Monitor, Smartphone, Globe, AlertTriangle, ShieldAlert, CheckCircle, Loader2 } from "lucide-react";
import { ConfirmationDialog } from "../../components/admin/shared/ConfirmationDialog";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminBadge } from "../../components/admin/shared/AdminBadge";

export default function SessionManagerPage() {
  const { activeSessions } = useAdminContext();
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [revokeAll, setRevokeAll] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [localSessions, setLocalSessions] = useState(activeSessions);

  const handleConfirmRevoke = () => {
    setIsRevoking(true);
    setTimeout(() => {
      if (revokeAll) {
        setLocalSessions([]);
      } else {
        setLocalSessions(prev => prev.filter(s => s.id !== sessionToRevoke));
      }
      setIsRevoking(false);
      setSessionToRevoke(null);
      setRevokeAll(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 1000);
  };

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes("ios") || device.toLowerCase().includes("android")) {
      return <Smartphone size={16} color={tokens.inkMut} />;
    }
    return <Monitor size={16} color={tokens.inkMut} />;
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Active Sessions" subtitle={`${localSessions.length} total`} fallbackRoute="/admin/security" showBackButton={true} />}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {localSessions.length > 0 && (
          <button 
            onClick={() => setRevokeAll(true)}
            style={{ padding: "12px", backgroundColor: "#FEF2F2", color: tokens.red, border: `1px solid #FECACA`, borderRadius: "12px", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", marginBottom: "8px" }}
          >
            <ShieldAlert size={18} />
            Revoke All Sessions
          </button>
        )}

        {localSessions.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: tokens.inkMut }}>
            No active sessions found.
          </div>
        )}

        {localSessions.map(session => (
          <div key={session.id} style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}` }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>{session.userName}</div>
                <div style={{ fontSize: "11px", color: tokens.inkSec }}>{session.userRole.replace('_', ' ')}</div>
              </div>
              <AdminBadge status={session.device} />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "12px", backgroundColor: tokens.bg, borderRadius: "8px", border: `1px solid ${tokens.border}`, marginBottom: "12px" }}>
              <div className="flex items-center gap-2">
                 <Globe size={14} color={tokens.inkMut} />
                 <div>
                   <div style={{ fontSize: "11px", color: tokens.inkMut }}>IP Address</div>
                   <div style={{ fontSize: "12px", fontWeight: 500, color: tokens.ink }}>{session.ip}</div>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 {getDeviceIcon(session.device)}
                 <div>
                   <div style={{ fontSize: "11px", color: tokens.inkMut }}>Location</div>
                   <div style={{ fontSize: "12px", fontWeight: 500, color: tokens.ink }}>{session.location || 'Unknown'}</div>
                 </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span style={{ fontSize: "11px", color: tokens.inkSec }}>Started: {new Date(session.loginTime).toLocaleString()}</span>
              <button 
                onClick={() => setSessionToRevoke(session.id)}
                style={{ padding: "6px 12px", backgroundColor: "#FEF2F2", color: tokens.red, border: `1px solid #FECACA`, borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                Revoke Session
              </button>
            </div>
          </div>
        ))}

      </div>

      <ConfirmationDialog 
        isOpen={!!sessionToRevoke || revokeAll}
        title={revokeAll ? "Revoke All Sessions" : "Revoke Session"}
        message={revokeAll ? "This will immediately sign out ALL users from ALL devices. They will need to log in again." : "This will immediately sign the user out of this device. They will need to log in again to access the platform."}
        confirmLabel={isRevoking ? "Revoking..." : "Revoke Access"}
        confirmColor={tokens.red}
        cancelLabel="Cancel"
        onConfirm={handleConfirmRevoke}
        onClose={() => { if (!isRevoking) { setSessionToRevoke(null); setRevokeAll(false); } }}
        isDestructive={true}
        icon={AlertTriangle}
        iconColor={tokens.red}
      />


      {showToast && (
        <div style={{
          position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: tokens.green, color: "white", padding: "12px 24px",
          borderRadius: "30px", display: "flex", alignItems: "center", gap: "8px",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)", animation: "fadeInUp 0.3s ease-out", zIndex: 1000
        }}>
          <CheckCircle size={18} color="white" />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Sessions revoked successfully</span>
        </div>
      )}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>
    </MobileLayout>
  );
}
