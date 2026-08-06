import React from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { Lock, Smartphone, Monitor, Bell, Globe, ChevronRight } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function AdminProfilePage() {
  const navigate = useNavigate();

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="My Profile" fallbackRoute="/admin/dashboard" showBackButton={true} />}
    >
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "30px" }}>
        
        {/* Profile Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "20px 0" }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: tokens.primary, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: 700 }}>
            SA
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px", color: tokens.ink }}>System Admin</h2>
            <div style={{ fontSize: "14px", color: tokens.inkSec }}>admin@10xds.com</div>
          </div>
          <div style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "12px", backgroundColor: "#F1F5F9", color: tokens.inkSec }}>
            Superuser Role
          </div>
        </div>

        {/* Security & Access */}
        <div>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: tokens.inkMut, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", marginLeft: "8px" }}>Security & Access</h3>
          <div style={{ backgroundColor: tokens.card, borderRadius: "16px", border: `1px solid ${tokens.border}`, overflow: "hidden" }}>
            
            <div style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${tokens.border}`, cursor: "pointer" }}>
              <div className="flex items-center gap-3">
                <Lock size={18} color={tokens.inkSec} />
                <span style={{ fontSize: "15px", fontWeight: 600, color: tokens.ink }}>Change Password</span>
              </div>
              <ChevronRight size={18} color={tokens.inkMut} />
            </div>

            <div style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${tokens.border}`, cursor: "pointer" }}>
              <div className="flex items-center gap-3">
                <Smartphone size={18} color={tokens.inkSec} />
                <span style={{ fontSize: "15px", fontWeight: 600, color: tokens.ink }}>Two-Factor Authentication (2FA)</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", color: "#16A34A", fontWeight: 600 }}>Enabled</span>
                <ChevronRight size={18} color={tokens.inkMut} />
              </div>
            </div>

            <div style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <div className="flex items-center gap-3">
                <Monitor size={18} color={tokens.inkSec} />
                <span style={{ fontSize: "15px", fontWeight: 600, color: tokens.ink }}>My Active Sessions</span>
              </div>
              <ChevronRight size={18} color={tokens.inkMut} />
            </div>

          </div>
        </div>

        {/* Preferences */}
        <div>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: tokens.inkMut, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", marginLeft: "8px" }}>Preferences</h3>
          <div style={{ backgroundColor: tokens.card, borderRadius: "16px", border: `1px solid ${tokens.border}`, overflow: "hidden" }}>
            
            <div style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${tokens.border}`, cursor: "pointer" }}>
              <div className="flex items-center gap-3">
                <Bell size={18} color={tokens.inkSec} />
                <span style={{ fontSize: "15px", fontWeight: 600, color: tokens.ink }}>Notification Preferences</span>
              </div>
              <ChevronRight size={18} color={tokens.inkMut} />
            </div>

            <div style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <div className="flex items-center gap-3">
                <Globe size={18} color={tokens.inkSec} />
                <span style={{ fontSize: "15px", fontWeight: 600, color: tokens.ink }}>Language & Region</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", color: tokens.inkMut }}>English (US)</span>
                <ChevronRight size={18} color={tokens.inkMut} />
              </div>
            </div>

          </div>
        </div>

        <button 
          onClick={() => navigate('/login')}
          style={{ width: "100%", padding: "16px", backgroundColor: "white", color: "#DC2626", border: "1px solid #FECACA", borderRadius: "16px", fontSize: "15px", fontWeight: 700, cursor: "pointer", marginTop: "12px" }}
        >
          Sign Out
        </button>

      </div>
    </MobileLayout>
  );
}
