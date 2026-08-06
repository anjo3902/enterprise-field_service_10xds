import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { ConfirmationDialog } from "../../components/admin/shared/ConfirmationDialog";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminBadge } from "../../components/admin/shared/AdminBadge";
import { 
  Building2, MapPin, Mail, Phone, CreditCard, MoreVertical, 
  Briefcase, Activity, ShieldCheck, User, Users, ChevronRight, Ban, CheckCircle, Edit
} from "lucide-react";

export default function OrganizationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organizations, vendors, users, auditLog } = useAdminContext();

  const [activeTab, setActiveTab] = useState("Overview");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const org = organizations.find(o => o.id === id);
  const orgVendors = useMemo(() => vendors.filter(v => org?.assignedVendorIds?.includes(v.id)), [vendors, org]);
  const orgUsers = useMemo(() => users.filter(u => u.assignedEntityId === id && u.assignedEntityType === 'org'), [users, id]);
  const orgAudit = useMemo(() => auditLog.filter(a => a.entityId === id), [auditLog, id]);

  if (!org) {
    return (
      <MobileLayout showBottomNav={false} header={<BackHeader title="Not Found" fallbackRoute="/admin/organizations" />}>
        <div style={{ padding: 20, textAlign: "center" }}>Organization not found.</div>
      </MobileLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return tokens.green;
      case 'Suspended': return tokens.red;
      case 'Pending': return tokens.orange;
      default: return tokens.inkMut;
    }
  };

  const handleSuspend = () => {
    setShowSuspendDialog(false);
    setShowMoreMenu(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleAssign = () => {
    setShowAssignDialog(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title={org.name} fallbackRoute="/admin/organizations" showBackButton={true} rightActions={
        <div style={{ position: "relative" }}>
          <button onClick={() => navigate(`/admin/organizations/${org.id}/edit`)} style={{ background: "transparent", border: "none", color: "white", padding: "8px", cursor: "pointer" }}>
            <Edit size={18} />
          </button>
          <button onClick={() => setShowMoreMenu(!showMoreMenu)} style={{ background: "transparent", border: "none", color: "white", padding: "8px", cursor: "pointer" }}>
            <MoreVertical size={18} />
          </button>

          {showMoreMenu && (
            <div style={{ position: "absolute", top: "100%", right: 0, backgroundColor: tokens.card, borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: `1px solid ${tokens.border}`, zIndex: 100, width: "180px", overflow: "hidden" }}>
              <button onClick={() => { navigate(`/admin/organizations/${org.id}/edit`); setShowMoreMenu(false); }} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${tokens.border}`, fontSize: "14px", color: tokens.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <Edit size={16} /> Edit Organization
              </button>
              {org.status === 'Suspended' ? (
                <button onClick={() => setShowMoreMenu(false)} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${tokens.border}`, fontSize: "14px", color: tokens.green, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle size={16} /> Reactivate
                </button>
              ) : (
                <button onClick={() => setShowSuspendDialog(true)} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${tokens.border}`, fontSize: "14px", color: tokens.red, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Ban size={16} /> Suspend Org
                </button>
              )}
              <button onClick={() => { setActiveTab('Audit'); setShowMoreMenu(false); }} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", fontSize: "14px", color: tokens.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={16} /> View Audit Log
              </button>
            </div>
          )}
        </div>
      } />}
    >
      {/* Hero Card */}
      <div style={{ background: "linear-gradient(135deg, #0052CC 0%, #3B82F6 100%)", padding: "0 20px 24px", color: "white" }}>
        <div className="flex items-center gap-4 mb-4 pt-4">
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 800, color: tokens.primary }}>
            {org.name.substring(0,2).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>{org.name}</h1>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: "12px", fontFamily: "monospace", backgroundColor: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "4px" }}>{org.id}</span>
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", backgroundColor: getStatusColor(org.status) }}>{org.status}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between" style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginBottom: "2px" }}>Plan Tier</div>
            <div className="flex items-center gap-1.5"><CreditCard size={14} /> <span style={{ fontSize: "13px", fontWeight: 600 }}>{org.plan}</span></div>
          </div>
          <div style={{ width: "1px", height: "24px", backgroundColor: "rgba(255,255,255,0.2)" }} />
          <div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginBottom: "2px" }}>Region</div>
            <div className="flex items-center gap-1.5"><MapPin size={14} /> <span style={{ fontSize: "13px", fontWeight: 600 }}>{org.region}</span></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${tokens.border}`, backgroundColor: tokens.card, position: "sticky", top: 0, zIndex: 10, msOverflowStyle: "none", scrollbarWidth: "none" }}>
        {["Overview", "Vendors", "Analytics", "Users", "Audit"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ padding: "14px 20px", background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab ? tokens.primary : "transparent"}`, color: activeTab === tab ? tokens.primary : tokens.inkSec, fontSize: "14px", fontWeight: activeTab === tab ? 600 : 500, cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px 30px" }}>
        {activeTab === "Overview" && (
          <div className="flex flex-col gap-4">
            <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px", color: tokens.ink }}>Contact Information</h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={18} color={tokens.inkMut} /></div>
                  <div><div style={{ fontSize: "12px", color: tokens.inkSec }}>Primary Admin</div><div style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>{org.adminName}</div></div>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}><Mail size={18} color={tokens.inkMut} /></div>
                  <div><div style={{ fontSize: "12px", color: tokens.inkSec }}>Email Address</div><div style={{ fontSize: "14px", fontWeight: 500, color: tokens.primary }}>{org.adminEmail}</div></div>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={18} color={tokens.inkMut} /></div>
                  <div><div style={{ fontSize: "12px", color: tokens.inkSec }}>Phone</div><div style={{ fontSize: "14px", fontWeight: 500, color: tokens.ink }}>{org.adminPhone}</div></div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
               <div className="flex items-center justify-between mb-4">
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>Quick Actions</h3>
               </div>
               <div className="flex flex-col gap-2">
                 <button onClick={() => setShowAssignDialog(true)} style={{ padding: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: "8px", cursor: "pointer" }}>
                   <span style={{ fontSize: "13.5px", fontWeight: 600, color: tokens.ink }}>Assign Vendor</span>
                   <ChevronRight size={16} color={tokens.inkMut} />
                 </button>
                 <button onClick={() => navigate(`/admin/organizations/${org.id}/analytics`)} style={{ padding: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: "8px", cursor: "pointer" }}>
                   <span style={{ fontSize: "13.5px", fontWeight: 600, color: tokens.ink }}>View Full Analytics</span>
                   <ChevronRight size={16} color={tokens.inkMut} />
                 </button>
               </div>
            </div>
          </div>
        )}

        {activeTab === "Vendors" && (
          <div className="flex flex-col gap-3">
            {orgVendors.length > 0 ? orgVendors.map(v => (
              <div key={v.id} style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink, marginBottom: "4px" }}>{v.name}</div>
                  <div style={{ fontSize: "12px", color: tokens.inkSec, display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldCheck size={14} color={tokens.green} /> SLA Target: 95%
                  </div>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, padding: "4px 8px", borderRadius: "12px", backgroundColor: getStatusColor(v.status) + "15", color: getStatusColor(v.status) }}>{v.status}</div>
              </div>
            )) : <p>No vendors assigned.</p>}
            <button onClick={() => setShowAssignDialog(true)} style={{ padding: "14px", backgroundColor: "white", color: tokens.primary, border: `1px solid ${tokens.primary}`, borderRadius: "12px", fontSize: "14px", fontWeight: 600, marginTop: "8px", cursor: "pointer" }}>+ Assign New Vendor</button>
          </div>
        )}
        
        {activeTab === "Analytics" && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Activity size={32} color={tokens.inkMut} style={{ marginBottom: "16px" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px" }}>Analytics Overview</h3>
            <p style={{ fontSize: "13px", color: tokens.inkSec, margin: "0 0 20px" }}>Summary data for {org.name}</p>
            <button onClick={() => navigate(`/admin/organizations/${org.id}/analytics`)} style={{ padding: "12px 24px", backgroundColor: tokens.primary, color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>View Full Analytics</button>
          </div>
        )}

        {activeTab === "Users" && (
          <div className="flex flex-col gap-3">
            {orgUsers.length > 0 ? orgUsers.map(u => (
              <div key={u.id} style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: tokens.ink }}>{u.firstName.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>{u.firstName} {u.lastName}</div>
                    <div style={{ fontSize: "12px", color: tokens.inkSec, textTransform: "capitalize" }}>{u.role}</div>
                  </div>
                </div>
                <AdminBadge status={u.status} />
              </div>
            )) : <p>No users found.</p>}
          </div>
        )}

        {activeTab === "Audit" && (
          <div className="flex flex-col gap-4">
             {orgAudit.length > 0 ? orgAudit.map(a => (
               <div key={a.id} style={{ backgroundColor: tokens.card, padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }}>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>{a.actionDescription}</div>
                  <div style={{ fontSize: "11px", color: tokens.inkMut, marginTop: "4px" }}>{new Date(a.timestamp).toLocaleString()} by {a.actorName}</div>
               </div>
             )) : <p>No recent activity.</p>}
          </div>
        )}
      </div>

      <ConfirmationDialog 
        isOpen={showSuspendDialog}
        title="Suspend Organization"
        message={`Are you sure you want to suspend ${org.name}?`}
        confirmLabel="Suspend"
        confirmColor={tokens.red}
        cancelLabel="Cancel"
        onConfirm={handleSuspend}
        onClose={() => setShowSuspendDialog(false)}
        isDestructive={true}
        icon={Ban}
        iconColor={tokens.red}
      >
        <div style={{ backgroundColor: "#FEF2F2", padding: "12px", borderRadius: "8px", border: "1px solid #FECACA", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#991B1B", marginBottom: "4px" }}>Impact Summary:</div>
          <div style={{ fontSize: "13px", color: "#B91C1C", display: "flex", justifyContent: "space-between" }}>
            <span>Org Admins Suspended:</span>
            <strong>{orgUsers.length}</strong>
          </div>
          <div style={{ fontSize: "13px", color: "#B91C1C", display: "flex", justifyContent: "space-between" }}>
            <span>Vendors Suspended:</span>
            <strong>{orgVendors.length}</strong>
          </div>
          <div style={{ fontSize: "13px", color: "#B91C1C", display: "flex", justifyContent: "space-between" }}>
            <span>Technicians Suspended:</span>
            <strong>{users.filter(u => u.role === 'technician' && orgVendors.some(v => v.id === u.assignedEntityId)).length}</strong>
          </div>
          <div style={{ fontSize: "12px", color: "#991B1B", marginTop: "8px", fontStyle: "italic", lineHeight: 1.4 }}>
            All users belonging to this organization and its dedicated vendors will immediately lose access. Data will be preserved.
          </div>
        </div>
      </ConfirmationDialog>

      <ConfirmationDialog 
        isOpen={showAssignDialog}
        title="Assign Vendor"
        message={`Assign a new vendor to ${org.name}?`}
        confirmLabel="Assign"
        confirmColor={tokens.primary}
        cancelLabel="Cancel"
        onConfirm={handleAssign}
        onClose={() => setShowAssignDialog(false)}
        isDestructive={false}
        icon={Briefcase}
        iconColor={tokens.primary}
      >
        <div style={{ marginTop: "12px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink, display: "block", marginBottom: "8px" }}>Select Vendor</label>
          <select style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white", outline: "none" }}>
             {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      </ConfirmationDialog>

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
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Action completed successfully</span>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </MobileLayout>
  );
}
