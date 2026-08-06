import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { ConfirmationDialog } from "../../components/admin/shared/ConfirmationDialog";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { 
  Building2, MapPin, Mail, Phone, MoreVertical, 
  Briefcase, Activity, ShieldCheck, User, Users, ChevronRight, Ban, CheckCircle, Edit, Star, FileText, FileCheck, HelpCircle, Map
} from "lucide-react";

export default function VendorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vendors, organizations, users, auditLog } = useAdminContext();

  const [activeTab, setActiveTab] = useState("Overview");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showAssignOrgDialog, setShowAssignOrgDialog] = useState(false);
  const [selectedTech, setSelectedTech] = useState<any>(null); // For Tech read-only sheet
  const [showToast, setShowToast] = useState(false);

  const vendor = vendors.find(v => v.id === id);
  const vendorOrgs = useMemo(() => organizations.filter(o => vendor?.assignedOrgIds?.includes(o.id)), [organizations, vendor]);
  const vendorUsers = useMemo(() => users.filter(u => u.assignedEntityId === id && u.assignedEntityType === 'vendor'), [users, id]);
  const vendorAudit = useMemo(() => auditLog.filter(a => a.entityId === id), [auditLog, id]);
  const vendorTechs = useMemo(() => vendorUsers.filter(u => u.role === 'technician'), [vendorUsers]);

  if (!vendor) {
    return (
      <MobileLayout showBottomNav={false} header={<BackHeader title="Not Found" fallbackRoute="/admin/vendors" variant="admin" />}>
        <div style={{ padding: 20, textAlign: "center" }}>Vendor not found.</div>
      </MobileLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return tokens.green;
      case 'Suspended': return tokens.red;
      case 'Pending Approval': return tokens.amber;
      default: return tokens.inkMut;
    }
  };

  const handleSuspend = () => { setShowSuspendDialog(false); setShowMoreMenu(false); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };
  const handleApprove = () => { setShowApproveDialog(false); setShowMoreMenu(false); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };
  const handleAssign = () => { setShowAssignOrgDialog(false); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader 
        title={vendor.name} 
        fallbackRoute="/admin/vendors" 
        showBackButton={true}
        variant="admin"
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Vendors', path: '/admin/vendors' },
          { label: vendor.name, path: `/admin/vendors/${vendor.id}` }
        ]}
        rightActions={
        <div style={{ position: "relative" }}>
          <button onClick={() => navigate(`/admin/vendors/${vendor.id}/edit`)} style={{ background: "transparent", border: "none", color: "white", padding: "8px", cursor: "pointer" }}>
            <Edit size={18} />
          </button>
          <button onClick={() => setShowMoreMenu(!showMoreMenu)} style={{ background: "transparent", border: "none", color: "white", padding: "8px", cursor: "pointer" }}>
            <MoreVertical size={18} />
          </button>

          {showMoreMenu && (
            <div style={{ position: "absolute", top: "100%", right: 0, backgroundColor: tokens.card, borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: `1px solid ${tokens.border}`, zIndex: 100, width: "180px", overflow: "hidden" }}>
              {vendor.status === 'Pending Approval' && (
                <button onClick={() => setShowApproveDialog(true)} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${tokens.border}`, fontSize: "14px", color: tokens.green, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle size={16} /> Approve Vendor
                </button>
              )}
              {vendor.status === 'Active' && (
                <button onClick={() => setShowSuspendDialog(true)} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${tokens.border}`, fontSize: "14px", color: tokens.red, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Ban size={16} /> Suspend Vendor
                </button>
              )}
              {vendor.status === 'Suspended' && (
                <button onClick={() => setShowApproveDialog(true)} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${tokens.border}`, fontSize: "14px", color: tokens.green, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle size={16} /> Reactivate
                </button>
              )}
              <button onClick={() => { setShowAssignOrgDialog(true); setShowMoreMenu(false); }} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${tokens.border}`, fontSize: "14px", color: tokens.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={16} /> Assign to Org
              </button>
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
            {vendor.name.substring(0,2).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>{vendor.name}</h1>
            <div className="flex items-center gap-3 mb-2">
              <span style={{ fontSize: "12px", fontFamily: "monospace", backgroundColor: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "4px" }}>{vendor.id}</span>
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", backgroundColor: getStatusColor(vendor.status) }}>{vendor.status}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star size={14} fill="#FCD34D" color="#FCD34D" />
              <span style={{ fontSize: "13px", fontWeight: 600 }}>{vendor.starRating}</span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>/5.0 avg</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between" style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginBottom: "2px" }}>Contract ID</div>
            <div className="flex items-center gap-1.5"><FileText size={14} /> <span style={{ fontSize: "13px", fontWeight: 600 }}>{vendor.contractId}</span></div>
          </div>
          <div style={{ width: "1px", height: "24px", backgroundColor: "rgba(255,255,255,0.2)" }} />
          <div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginBottom: "2px" }}>SLA Target</div>
            <div className="flex items-center gap-1.5"><ShieldCheck size={14} /> <span style={{ fontSize: "13px", fontWeight: 600 }}>{vendor.slaTarget}%</span></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${tokens.border}`, backgroundColor: tokens.card, position: "sticky", top: 0, zIndex: 10, msOverflowStyle: "none", scrollbarWidth: "none" }}>
        {["Overview", "Technicians", "Performance", "Contracts", "Audit"].map(tab => (
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
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 12px", color: tokens.ink }}>Service Profile</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {vendor.serviceTypes.map(t => (
                  <span key={t} style={{ fontSize: "12px", backgroundColor: "#F1F5F9", color: tokens.inkSec, padding: "4px 10px", borderRadius: "16px", fontWeight: 500 }}>{t}</span>
                ))}
              </div>
              <h3 style={{ fontSize: "13px", fontWeight: 700, margin: "16px 0 8px", color: tokens.inkSec }}>Regions Covered</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.serviceRegions.map(r => (
                  <span key={r} style={{ fontSize: "12px", border: `1px solid ${tokens.border}`, color: tokens.inkSec, padding: "4px 10px", borderRadius: "16px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}><MapPin size={12} /> {r}</span>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px", color: tokens.ink }}>Vendor Manager</h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={18} color={tokens.inkMut} /></div>
                  <div><div style={{ fontSize: "12px", color: tokens.inkSec }}>Manager Name</div><div style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>{vendor.managerName}</div></div>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}><Mail size={18} color={tokens.inkMut} /></div>
                  <div><div style={{ fontSize: "12px", color: tokens.inkSec }}>Email Address</div><div style={{ fontSize: "14px", fontWeight: 500, color: tokens.primary }}>{vendor.managerEmail}</div></div>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={18} color={tokens.inkMut} /></div>
                  <div><div style={{ fontSize: "12px", color: tokens.inkSec }}>Phone</div><div style={{ fontSize: "14px", fontWeight: 500, color: tokens.ink }}>{vendor.managerPhone}</div></div>
                </div>
              </div>
            </div>
            
            <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>Certifications</h3>
              </div>
              <div className="flex flex-col gap-3">
                {vendor.certifications.map(c => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck size={16} color={tokens.green} />
                      <span style={{ fontSize: "13px", fontWeight: 500, color: tokens.ink }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: "12px", color: tokens.inkMut }}>Exp: {c.expiry}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === "Technicians" && (
          <div className="flex flex-col gap-3">
            <div style={{ padding: "12px", backgroundColor: "#EEF2FF", border: `1px solid #C7D2FE`, borderRadius: "8px", display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
              <HelpCircle size={18} color="#4F46E5" style={{ flexShrink: 0, marginTop: "2px" }} />
              <p style={{ margin: 0, fontSize: "12px", color: "#3730A3", lineHeight: 1.5 }}>
                System Admins have read-only access to technician profiles. Dispatch and assignments must be handled by the Vendor Manager.
              </p>
            </div>
            {vendorTechs.length > 0 ? vendorTechs.map(t => (
              <div key={t.id} onClick={() => setSelectedTech(t)} style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyItems: "center", gap: "12px", cursor: "pointer" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: tokens.ink }}>{t.firstName.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>{t.firstName} {t.lastName}</div>
                  <div style={{ fontSize: "12px", color: tokens.inkSec, display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                    <Activity size={12} /> {t.status}
                  </div>
                </div>
                <ChevronRight size={18} color={tokens.border} />
              </div>
            )) : <p>No technicians found.</p>}
          </div>
        )}

        {/* Mock other tabs briefly since instruction is "Stop after Vendor module" but they must exist */}
        {activeTab === "Performance" && (
           <div style={{ textAlign: "center", padding: "40px 20px" }}>
             <Activity size={32} color={tokens.inkMut} style={{ marginBottom: "16px" }} />
             <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px" }}>Performance Metrics</h3>
             <p style={{ fontSize: "13px", color: tokens.inkSec, margin: "0 0 20px" }}>Current SLA Compliance: <strong style={{color: tokens.green}}>{vendor.slaCompliance}%</strong></p>
           </div>
        )}
        
        {activeTab === "Contracts" && (
           <div style={{ textAlign: "center", padding: "40px 20px" }}>
             <FileText size={32} color={tokens.inkMut} style={{ marginBottom: "16px" }} />
             <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px" }}>Active Contracts</h3>
             <p style={{ fontSize: "13px", color: tokens.inkSec, margin: "0 0 20px" }}>Current Contract: {vendor.contractId}</p>
           </div>
        )}

        {activeTab === "Audit" && (
          <div className="flex flex-col gap-4">
             {vendorAudit.length > 0 ? vendorAudit.map(a => (
               <div key={a.id} style={{ backgroundColor: tokens.card, padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }}>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>{a.actionDescription}</div>
                  <div style={{ fontSize: "11px", color: tokens.inkMut, marginTop: "4px" }}>{new Date(a.timestamp).toLocaleString()} by {a.actorName}</div>
               </div>
             )) : <p>No recent activity.</p>}
          </div>
        )}
      </div>

      {/* Tech Read-Only Sheet */}
      {selectedTech && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", backgroundColor: tokens.bg, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "40px", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div style={{ width: "56px", height: "56px", borderRadius: "28px", backgroundColor: "#E6F0FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 700, color: tokens.primary }}>{selectedTech.firstName.charAt(0)}</div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{selectedTech.firstName} {selectedTech.lastName}</h3>
                  <span style={{ fontSize: "12px", color: tokens.inkSec }}>ID: {selectedTech.id}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTech(null)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: tokens.inkSec }}>&times;</button>
            </div>
            
            <div style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}`, marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: tokens.inkSec, marginBottom: "4px" }}>Status</div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: getStatusColor(selectedTech.status) }}>{selectedTech.status}</div>
            </div>

            <div style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}` }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px" }}>Contact</h4>
              <div style={{ fontSize: "13px", marginBottom: "8px" }}><span style={{ color: tokens.inkSec, display: "inline-block", width: "60px" }}>Email:</span> {selectedTech.email}</div>
              <div style={{ fontSize: "13px" }}><span style={{ color: tokens.inkSec, display: "inline-block", width: "60px" }}>Phone:</span> {selectedTech.phone}</div>
            </div>

            <button onClick={() => setSelectedTech(null)} style={{ width: "100%", padding: "14px", backgroundColor: tokens.primary, color: "white", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 600, marginTop: "24px", cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}

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

      {/* Dialogs */}
      <ConfirmationDialog 
        isOpen={showSuspendDialog}
        title="Suspend Vendor"
        message={`Are you sure you want to suspend ${vendor.name}? All technicians will immediately lose dispatch capabilities.`}
        confirmLabel="Suspend"
        confirmColor={tokens.red}
        cancelLabel="Cancel"
        onConfirm={handleSuspend}
        onClose={() => setShowSuspendDialog(false)}
        isDestructive={true}
        icon={Ban}
        iconColor={tokens.red}
      />

      <ConfirmationDialog 
        isOpen={showApproveDialog}
        title={vendor.status === 'Suspended' ? "Reactivate Vendor" : "Approve Vendor"}
        message={`Are you sure you want to approve ${vendor.name} for platform access?`}
        confirmLabel="Approve"
        confirmColor={tokens.green}
        cancelLabel="Cancel"
        onConfirm={handleApprove}
        onClose={() => setShowApproveDialog(false)}
        isDestructive={false}
        icon={CheckCircle}
        iconColor={tokens.green}
        iconTint="#DCFCE7"
      />

      <ConfirmationDialog 
        isOpen={showAssignOrgDialog}
        title="Assign Organization"
        message={`Assign an organization to ${vendor.name}?`}
        confirmLabel="Assign"
        confirmColor={tokens.primary}
        cancelLabel="Cancel"
        onConfirm={handleAssign}
        onClose={() => setShowAssignOrgDialog(false)}
        isDestructive={false}
        icon={Briefcase}
        iconColor={tokens.primary}
      >
        <div style={{ marginTop: "12px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink, display: "block", marginBottom: "8px" }}>Select Organization</label>
          <select style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white", outline: "none" }}>
             {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      </ConfirmationDialog>

    </MobileLayout>
  );
}
