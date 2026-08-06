import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { 
  ShieldAlert, Fingerprint, Monitor, AlertTriangle, Key, 
  Activity, CheckCircle, Shield
} from "lucide-react";

export default function SecurityDashboardPage() {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const handleAction = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  const { securityAlerts, failedLogins, activeSessions } = useAdminContext();

  const activeThreats = securityAlerts.filter(a => a.status !== 'resolved');

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="Security Console" fallbackRoute="/admin/dashboard" showBackButton={true} rightActions={
        <div style={{ fontSize: "11px", fontWeight: 600, padding: "4px 8px", borderRadius: "12px", backgroundColor: activeThreats.length> 0 ? tokens.red + "20" : tokens.green + "20", color: activeThreats.length > 0 ? tokens.red : tokens.green }}>
          {activeThreats.length > 0 ? "Elevated Threat" : "Normal"}
        </div>
      } />}
    >
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "30px" }}>
        
        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)", borderRadius: "16px", padding: "20px", color: "white" }}>
          <div className="flex items-center gap-3 mb-6">
             <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: activeThreats.length > 0 ? tokens.red + "30" : tokens.green + "30", display: "flex", alignItems: "center", justifyContent: "center" }}>
               {activeThreats.length > 0 ? <ShieldAlert size={24} color="#FCA5A5" /> : <Shield size={24} color="#86EFAC" />}
             </div>
             <div>
               <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }}>Security Posture</h2>
               <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>Last scan: {new Date().toLocaleTimeString()}</div>
             </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
             <div>
               <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>Active Alerts</div>
               <div style={{ fontSize: "20px", fontWeight: 700 }}>{activeThreats.length}</div>
             </div>
             <div>
               <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>Failed Logins</div>
               <div style={{ fontSize: "20px", fontWeight: 700 }}>{failedLogins.length}</div>
             </div>
             <div>
               <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>Suspicious</div>
               <div style={{ fontSize: "20px", fontWeight: 700 }}>0</div>
             </div>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <button onClick={() => navigate('/admin/security/logs')} style={{ padding: "16px", backgroundColor: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <Fingerprint size={24} color={tokens.primary} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>Access Logs</span>
          </button>
          <button onClick={() => navigate('/admin/security/sessions')} style={{ padding: "16px", backgroundColor: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <Monitor size={24} color={tokens.primary} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>Active Sessions</span>
          </button>
          <button onClick={() => navigate('/admin/security/failed-logins')} style={{ padding: "16px", backgroundColor: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <AlertTriangle size={24} color={tokens.orange} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>Failed Logins</span>
          </button>
          <button onClick={() => handleAction("2FA Compliance view coming soon")} style={{ padding: "16px", backgroundColor: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <Key size={24} color={tokens.green} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>2FA Compliance</span>
          </button>
        </div>

        {/* Alerts List */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px", color: tokens.ink }}>Active Alerts</h3>
          <div className="flex flex-col gap-3">
            {activeThreats.length > 0 ? activeThreats.map(alert => (
              <div key={alert.id} style={{ padding: "12px", backgroundColor: alert.severity === 'critical' ? "#FEF2F2" : "#FFF7ED", border: `1px solid ${alert.severity === 'critical' ? '#FECACA' : '#FED7AA'}`, borderRadius: "12px" }}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} color={alert.severity === 'critical' ? tokens.red : tokens.orange} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: alert.severity === 'critical' ? "#991B1B" : "#9A3412" }}>{alert.title}</span>
                  </div>
                  <span style={{ fontSize: "11px", color: tokens.inkMut }}>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
                <p style={{ fontSize: "13px", color: tokens.ink, margin: "0 0 12px", lineHeight: 1.4 }}>{alert.description}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAction("Investigation started")} style={{ padding: "6px 12px", backgroundColor: "white", border: `1px solid ${tokens.border}`, borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: tokens.ink, cursor: "pointer" }}>Investigate</button>
                  <button onClick={() => handleAction("Alert dismissed")} style={{ padding: "6px 12px", backgroundColor: "transparent", border: "none", fontSize: "12px", fontWeight: 600, color: tokens.inkSec, cursor: "pointer" }}>Dismiss</button>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: "center", padding: "20px", color: tokens.inkMut, fontSize: "13px" }}>No active security alerts.</div>
            )}
          </div>
        </div>

      </div>

      {/* Toast */}
      {showToast && (
        <div style={{
          position: "absolute",
          bottom: "100px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: tokens.green,
          color: "white",
          padding: "12px 24px",
          borderRadius: "30px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
          animation: "fadeInUp 0.3s ease-out",
          zIndex: 1000
        }}>
          <CheckCircle size={18} color="white" />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>{toastMsg}</span>
        </div>
      )}
    </MobileLayout>
  );
}
