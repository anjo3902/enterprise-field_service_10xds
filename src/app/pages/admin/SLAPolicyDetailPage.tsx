import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { ConfirmationDialog } from "../../components/admin/shared/ConfirmationDialog";
import { Edit, Archive, CheckCircle, Clock, Calendar, Users, Activity, Bell, Map, ShieldAlert } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function SLAPolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { slaPolicies, vendors, auditLog } = useAdminContext();

  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("Matrix");

  const policy = slaPolicies.find(p => p.id === id);
  const assignedVendors = vendors.filter(v => policy?.assignedVendorIds.includes(v.id));
  const policyAudit = auditLog.filter(a => a.entityId === id).slice(0, 5);

  if (!policy) {
    return (
      <MobileLayout showBottomNav={false} header={<BackHeader title="Not Found" fallbackRoute="/admin/sla" />}>
        <div style={{ padding: 20, textAlign: "center" }}>Policy not found.</div>
      </MobileLayout>
    );
  }

  const priorityColors = {
    critical: { bg: "#FEF2F2", text: "#B91C1C", border: "#FCA5A5" },
    high: { bg: "#FFF7ED", text: "#C2410C", border: "#FDBA74" },
    medium: { bg: "#FEFCE8", text: "#A16207", border: "#FDE047" },
    low: { bg: "#F0FDF4", text: "#15803D", border: "#86EFAC" }
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="Policy Details" fallbackRoute="/admin/sla" showBackButton={true} rightActions={
        <div className="flex gap-2">
          <button onClick={() => navigate(`/admin/sla/${policy.id}/edit`)} style={{ background: "transparent", border: "none", color: "white", padding: "8px", cursor: "pointer" }}>
            <Edit size={18} />
          </button>
          <button onClick={() => setShowArchiveDialog(true)} style={{ background: "transparent", border: "none", color: "white", padding: "8px", cursor: "pointer" }}>
            {policy.status === 'Active' ? <Archive size={18} /> : <CheckCircle size={18} />}
          </button>
        </div>
      } />}
    >
      <div style={{ padding: "20px 16px 30px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Overview Card */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "20px", border: `1px solid ${tokens.border}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: policy.status === 'Active' ? tokens.green : tokens.inkMut }} />
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: tokens.ink, margin: "0 0 4px" }}>{policy.name}</h2>
              <div style={{ fontSize: "12px", fontFamily: "monospace", color: tokens.inkMut }}>{policy.id}</div>
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "12px", backgroundColor: policy.status === 'Active' ? tokens.green + "15" : tokens.inkMut + "15", color: policy.status === 'Active' ? tokens.green : tokens.inkSec }}>
              {policy.status}
            </span>
          </div>
          <p style={{ fontSize: "13px", color: tokens.inkSec, margin: "12px 0 16px", lineHeight: 1.5 }}>
            {policy.description}
          </p>
          <div style={{ width: "100%", height: "1px", backgroundColor: tokens.border, margin: "0 0 16px" }} />
          <div className="flex items-center gap-4">
             <div className="flex flex-col">
               <span style={{ fontSize: "11px", color: tokens.inkMut, marginBottom: "2px" }}>Created</span>
               <span style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec }}>{new Date(policy.createdAt).toLocaleDateString()}</span>
             </div>
             <div className="flex flex-col">
               <span style={{ fontSize: "11px", color: tokens.inkMut, marginBottom: "2px" }}>Modified</span>
               <span style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec }}>{new Date(policy.lastModified).toLocaleDateString()}</span>
             </div>
             <div className="flex flex-col">
               <span style={{ fontSize: "11px", color: tokens.inkMut, marginBottom: "2px" }}>Timezone</span>
               <span style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec }}>{policy.timezone}</span>
             </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${tokens.border}`, backgroundColor: tokens.bg, msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {["Matrix", "Config", "Vendors", "Audit"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab ? tokens.primary : "transparent"}`, color: activeTab === tab ? tokens.primary : tokens.inkSec, fontSize: "14px", fontWeight: activeTab === tab ? 600 : 500, cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "Matrix" && (
          <div className="flex flex-col gap-3">
            {(['critical', 'high', 'medium', 'low'] as const).map(prio => {
               const pData = policy.priorityMatrix[prio];
               const colors = priorityColors[prio];
               return (
                 <div key={prio} style={{ backgroundColor: tokens.card, borderRadius: "12px", border: `1px solid ${colors.border}`, overflow: "hidden" }}>
                   <div style={{ padding: "8px 12px", backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
                     <ShieldAlert size={14} color={colors.text} />
                     <span style={{ fontSize: "13px", fontWeight: 700, color: colors.text, textTransform: "capitalize" }}>{prio} Priority</span>
                   </div>
                   <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", textAlign: "center" }}>
                     <div>
                       <div style={{ fontSize: "11px", color: tokens.inkSec, marginBottom: "4px" }}>Response</div>
                       <div style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink }}>{pData.responseHrs}h</div>
                     </div>
                     <div style={{ borderLeft: `1px solid ${tokens.border}`, borderRight: `1px solid ${tokens.border}` }}>
                       <div style={{ fontSize: "11px", color: tokens.inkSec, marginBottom: "4px" }}>Resolution</div>
                       <div style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink }}>{pData.resolutionHrs}h</div>
                     </div>
                     <div>
                       <div style={{ fontSize: "11px", color: tokens.inkSec, marginBottom: "4px" }}>Escalation</div>
                       <div style={{ fontSize: "15px", fontWeight: 700, color: tokens.red }}>{pData.escalationAfterHrs}h</div>
                     </div>
                   </div>
                 </div>
               );
            })}
          </div>
        )}

        {activeTab === "Config" && (
          <div className="flex flex-col gap-4">
            <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
              <div className="flex items-center gap-2 mb-4">
                 <Clock size={18} color={tokens.primary} />
                 <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>Business Hours</h3>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span style={{ fontSize: "13px", color: tokens.inkSec }}>Mode</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{policy.businessHoursMode === "24/7" ? "24/7 (Always On)" : "Business Hours Only"}</span>
              </div>
              {policy.holidayDates.length > 0 && (
                <>
                  <div style={{ width: "100%", height: "1px", backgroundColor: tokens.border, margin: "12px 0" }} />
                  <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink, marginBottom: "8px" }}>Holiday Exceptions</div>
                  <div className="flex flex-wrap gap-2">
                    {policy.holidayDates.map(date => (
                      <span key={date} style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#F1F5F9", color: tokens.inkSec, borderRadius: "6px" }}>{date}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
              <div className="flex items-center gap-2 mb-4">
                 <Bell size={18} color={tokens.orange} />
                 <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>Escalation & Notifications</h3>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: "13px", color: tokens.inkSec }}>Escalate To</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{policy.escalationRole.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: "13px", color: tokens.inkSec }}>Channels</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink, textTransform: "uppercase" }}>{policy.escalationChannels.join(', ')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: "13px", color: tokens.inkSec }}>Pre-Breach Alert</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.orange }}>At {policy.notificationThresholdPct}% time</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Vendors" && (
          <div className="flex flex-col gap-3">
            {assignedVendors.length > 0 ? assignedVendors.map(v => (
              <div key={v.id} onClick={() => navigate(`/admin/vendors/${v.id}`)} style={{ backgroundColor: tokens.card, padding: "12px 16px", borderRadius: "12px", border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>{v.name}</div>
                  <div style={{ fontSize: "11px", color: tokens.inkMut, marginTop: "2px" }}>Contract: {v.contractId}</div>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: v.slaCompliance >= policy.notificationThresholdPct ? tokens.green : tokens.orange }}>{v.slaCompliance}%</div>
              </div>
            )) : <p style={{ fontSize: "13px", color: tokens.inkSec, textAlign: "center", padding: "20px" }}>No vendors assigned to this policy.</p>}
          </div>
        )}

        {activeTab === "Audit" && (
          <div className="flex flex-col gap-4">
             {policyAudit.length > 0 ? policyAudit.map(a => (
               <div key={a.id} style={{ backgroundColor: tokens.card, padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }}>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>{a.actionDescription}</div>
                  <div style={{ fontSize: "11px", color: tokens.inkMut, marginTop: "4px" }}>{new Date(a.timestamp).toLocaleString()} by {a.actorName}</div>
               </div>
             )) : <p>No recent activity.</p>}
          </div>
        )}
      </div>

      <ConfirmationDialog 
        isOpen={showArchiveDialog}
        title={policy.status === 'Active' ? "Archive Policy" : "Activate Policy"}
        message={policy.status === 'Active' ? `Are you sure you want to archive ${policy.name}? It will no longer be available for new vendor contracts.` : `Reactivate ${policy.name} for use?`}
        confirmLabel={policy.status === 'Active' ? "Archive" : "Activate"}
        confirmColor={policy.status === 'Active' ? tokens.red : tokens.green}
        cancelLabel="Cancel"
        onConfirm={() => setShowArchiveDialog(false)}
        onClose={() => setShowArchiveDialog(false)}
        isDestructive={policy.status === 'Active'}
        icon={Archive}
        iconColor={policy.status === 'Active' ? tokens.red : tokens.green}
      />

    </MobileLayout>
  );
}
