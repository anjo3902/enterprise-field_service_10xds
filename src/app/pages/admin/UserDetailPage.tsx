import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { ConfirmationDialog } from "../../components/admin/shared/ConfirmationDialog";
import { 
  Building2, Mail, Phone, MoreVertical, 
  Briefcase, Activity, ShieldCheck, User as UserIcon, MonitorSmartphone, Key, Ban, CheckCircle, Smartphone
} from "lucide-react";
import type { AdminUser } from "../../types/legacy";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminBadge } from "../../components/admin/shared/AdminBadge";

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { users, organizations, vendors, auditLog } = useAdminContext();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const user = users.find(u => u.id === id);
  const userAudit = auditLog.filter(a => a.actorId === id).slice(0, 5);

  if (!user) {
    return (
      <MobileLayout showBottomNav={false} header={<BackHeader title="Not Found" fallbackRoute="/admin/users" />}>
        <div style={{ padding: 20, textAlign: "center" }}>User not found.</div>
      </MobileLayout>
    );
  }

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'system_admin': return { bg: "#EEF2FF", color: "#4F46E5", label: "System Admin" };
      case 'org_admin': return { bg: "#E6F0FF", color: "#2563EB", label: "Org Admin" };
      case 'vendor_manager': return { bg: "#ECFEFF", color: "#0891B2", label: "Vendor Manager" };
      case 'technician': return { bg: "#DCFCE7", color: "#16A34A", label: "Technician" };
      default: return { bg: "#F1F5F9", color: "#64748B", label: "User" };
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return tokens.green;
      case 'Inactive': return tokens.inkMut;
      case 'Locked': return tokens.red;
      default: return tokens.inkMut;
    }
  };

  const getEntityName = (u: AdminUser) => {
    if (u.role === 'system_admin') return "10xDS Platform";
    if (u.assignedEntityType === 'org') return organizations.find(o => o.id === u.assignedEntityId)?.name || "Unknown Org";
    if (u.assignedEntityType === 'vendor') return vendors.find(v => v.id === u.assignedEntityId)?.name || "Unknown Vendor";
    return "Unassigned";
  };

  const roleBadge = getRoleBadge(user.role);

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title={`${user.firstName} ${user.lastName}`} fallbackRoute="/admin/users" showBackButton={true} rightActions={
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowMoreMenu(!showMoreMenu)} style={{ background: "transparent", border: "none", color: "white", padding: "8px", cursor: "pointer" }}>
            <MoreVertical size={18} />
          </button>

          {showMoreMenu && (
            <div style={{ position: "absolute", top: "100%", right: 0, backgroundColor: tokens.card, borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: `1px solid ${tokens.border}`, zIndex: 100, width: "190px", overflow: "hidden" }}>
              <button onClick={() => { setShowResetDialog(true); setShowMoreMenu(false); }} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${tokens.border}`, fontSize: "14px", color: tokens.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <Key size={16} /> Reset Password
              </button>
              {user.status === 'Active' ? (
                <button onClick={() => { setShowDeactivateDialog(true); setShowMoreMenu(false); }} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${tokens.border}`, fontSize: "14px", color: tokens.red, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Ban size={16} /> Deactivate User
                </button>
              ) : (
                <button onClick={() => setShowMoreMenu(false)} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${tokens.border}`, fontSize: "14px", color: tokens.green, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle size={16} /> Activate User
                </button>
              )}
            </div>
          )}
        </div>
      } />}
    >
      <div style={{ padding: "20px 16px 30px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Profile Card */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "24px", border: `1px solid ${tokens.border}`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ position: "absolute", top: "24px", right: "24px" }}>
            <AdminBadge status={user.status} />
          </div>
          <div style={{ width: "80px", height: "80px", borderRadius: "40px", backgroundColor: roleBadge.bg, color: roleBadge.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: tokens.ink, margin: "0 0 4px" }}>{user.firstName} {user.lastName}</h2>
          <div style={{ fontSize: "14px", color: tokens.inkSec, marginBottom: "12px" }}>{user.email}</div>
          <div style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px", backgroundColor: roleBadge.bg, color: roleBadge.color, display: "inline-block", marginBottom: "16px" }}>
            {roleBadge.label}
          </div>
          
          <div style={{ width: "100%", height: "1px", backgroundColor: tokens.border, margin: "8px 0 16px" }} />
          
          <div className="flex flex-col gap-3 w-full text-left">
            <div className="flex items-center gap-3">
              <Phone size={16} color={tokens.inkMut} />
              <span style={{ fontSize: "13px", color: tokens.ink }}>{user.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              {user.assignedEntityType === 'org' ? <Building2 size={16} color={tokens.inkMut} /> : user.assignedEntityType === 'vendor' ? <Briefcase size={16} color={tokens.inkMut} /> : <ShieldCheck size={16} color={tokens.inkMut} />}
              <span style={{ fontSize: "13px", color: tokens.ink, fontWeight: 500 }}>{getEntityName(user)}</span>
            </div>
          </div>
        </div>

        {/* Security & Sessions */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px", color: tokens.ink }}>Security & Sessions</h3>
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
               <Key size={16} color={tokens.inkMut} />
               <span style={{ fontSize: "13px", fontWeight: 500, color: tokens.inkSec }}>Two-Factor Auth</span>
             </div>
             <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", backgroundColor: user.twoFactorEnabled ? tokens.green + "15" : tokens.red + "15", color: user.twoFactorEnabled ? tokens.green : tokens.red }}>
               {user.twoFactorEnabled ? "Enabled" : "Disabled"}
             </span>
          </div>
          <div style={{ height: "1px", backgroundColor: tokens.border, margin: "12px 0" }} />
          <h4 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 12px", color: tokens.inkSec }}>Active Sessions</h4>
          <div className="flex flex-col gap-3">
            {user.sessions.map((session, i) => (
              <div key={i} style={{ padding: "12px", backgroundColor: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: "8px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div className="flex items-start gap-3">
                  {session.device.includes('iPhone') || session.device.includes('Android') ? <Smartphone size={16} color={tokens.inkMut} style={{marginTop: "2px"}} /> : <MonitorSmartphone size={16} color={tokens.inkMut} style={{marginTop: "2px"}} />}
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{session.device}</div>
                    <div style={{ fontSize: "11px", color: tokens.inkMut, marginTop: "2px" }}>{session.location} • {session.ip}</div>
                    <div style={{ fontSize: "11px", color: tokens.inkMut, marginTop: "2px" }}>Active since {new Date(session.loginTime).toLocaleDateString()}</div>
                  </div>
                </div>
                <button onClick={() => { setSelectedSession(session.device); setShowRevokeDialog(true); }} style={{ padding: "4px 8px", backgroundColor: "transparent", color: tokens.red, border: `1px solid ${tokens.red}`, borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Revoke</button>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log snippet */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px", color: tokens.ink }}>Recent Activity</h3>
          <div className="flex flex-col gap-3">
             {userAudit.length > 0 ? userAudit.map(a => (
               <div key={a.id} style={{ paddingBottom: "12px", borderBottom: `1px solid ${tokens.border}` }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: tokens.ink }}>{a.actionDescription}</div>
                  <div style={{ fontSize: "11px", color: tokens.inkMut, marginTop: "4px" }}>{new Date(a.timestamp).toLocaleString()}</div>
               </div>
             )) : <p style={{ fontSize: "13px", color: tokens.inkMut }}>No recent activity.</p>}
          </div>
        </div>

      </div>

      {/* Dialogs */}
      <ConfirmationDialog 
        isOpen={showDeactivateDialog}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${user.firstName}? This will immediately revoke all their active sessions and they will not be able to log in.`}
        confirmLabel="Deactivate"
        confirmColor={tokens.red}
        cancelLabel="Cancel"
        onConfirm={() => setShowDeactivateDialog(false)}
        onClose={() => setShowDeactivateDialog(false)}
        isDestructive={true}
        icon={Ban}
        iconColor={tokens.red}
      />

      <ConfirmationDialog 
        isOpen={showResetDialog}
        title="Reset Password"
        message={`Send a password reset email to ${user.email}?`}
        confirmLabel="Send Email"
        confirmColor={tokens.primary}
        cancelLabel="Cancel"
        onConfirm={() => setShowResetDialog(false)}
        onClose={() => setShowResetDialog(false)}
        isDestructive={false}
        icon={Key}
        iconColor={tokens.primary}
        iconTint={roleBadge.bg}
      />

      <ConfirmationDialog 
        isOpen={showRevokeDialog}
        title="Revoke Session"
        message={`Are you sure you want to revoke the session on ${selectedSession}? The user will be logged out immediately on that device.`}
        confirmLabel="Revoke"
        confirmColor={tokens.red}
        cancelLabel="Cancel"
        onConfirm={() => setShowRevokeDialog(false)}
        onClose={() => setShowRevokeDialog(false)}
        isDestructive={true}
        icon={MonitorSmartphone}
        iconColor={tokens.red}
      />

    </MobileLayout>
  );
}

