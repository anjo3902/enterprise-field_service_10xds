import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { AdminActionFooter } from "../../components/admin/shared/AdminActionFooter";
import { useAdminContext } from "../../contexts/AdminContext";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { ConfirmationDialog } from "../../components/admin/shared/ConfirmationDialog";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useSafeBack } from "../../utils/navigation";

export default function SLAPolicyEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { slaPolicies } = useAdminContext();
  const safeBack = useSafeBack();
  
  const policy = slaPolicies.find(p => p.id === id);

  const [name, setName] = useState(policy?.name || "");
  const [desc, setDesc] = useState(policy?.description || "");

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);

  if (!policy) return <div>Not found</div>;

  const handleChange = (setter: any, value: any) => {
    setIsDirty(true);
    setter(value);
  };

  const handleBackAttempt = () => {
    if (isDirty) setShowExitWarning(true);
    else safeBack(`/admin/sla/${id}`);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsDirty(false);
      setShowToast(true);
      setTimeout(() => navigate(`/admin/sla/${id}`), 1500);
    }, 1000);
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Edit Policy" fallbackRoute={`/admin/sla/${id}`} onBackClick={handleBackAttempt} />}>
      <div style={{ padding: "20px 16px" }}>
        
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}`, marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Basic Info</h2>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Policy Name</label>
            <input type="text" value={name} onChange={(e) => handleChange(setName, e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Description</label>
            <textarea value={desc} onChange={(e) => handleChange(setDesc, e.target.value)} rows={3} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, resize: "none" }} />
          </div>
        </div>

        <AdminActionFooter>
          <button 
            onClick={handleBackAttempt}
            disabled={isSaving}
            style={{ flex: 1, padding: "14px", backgroundColor: "white", color: tokens.inkSec, border: `1px solid ${tokens.border}`, borderRadius: "12px", fontSize: "15px", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer" }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            style={{ flex: 2, padding: "14px", backgroundColor: isSaving ? tokens.inkMut : (!isDirty ? tokens.border : tokens.primary), color: (!isDirty && !isSaving) ? tokens.inkMut : "white", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 600, cursor: (!isDirty || isSaving) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {isSaving && <Loader2 size={18} className="animate-spin" />}
            Save Changes
          </button>
        </AdminActionFooter>

      </div>

      <ConfirmationDialog
        isOpen={showExitWarning}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to discard them and leave this page?"
        confirmLabel="Discard & Leave"
        confirmColor={tokens.red}
        cancelLabel="Keep Editing"
        onConfirm={() => safeBack(`/admin/sla/${id}`)}
        onClose={() => setShowExitWarning(false)}
        isDestructive={true}
        icon={AlertTriangle}
        iconColor={tokens.red}
        iconTint="#FEF2F2"
      />

      {showToast && (
        <div style={{
          position: "absolute", bottom: "100px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: tokens.green, color: "white", padding: "12px 24px",
          borderRadius: "30px", display: "flex", alignItems: "center", gap: "8px",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)", animation: "fadeInUp 0.3s ease-out", zIndex: 1000
        }}>
          <CheckCircle size={18} color="white" />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>SLA Policy updated successfully</span>
        </div>
      )}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </MobileLayout>
  );
}
