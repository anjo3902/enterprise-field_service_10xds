import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminActionFooter } from "../../components/admin/shared/AdminActionFooter";
import { ConfirmationDialog } from "../../components/admin/shared/ConfirmationDialog";
import { AlertTriangle, RefreshCw, CheckCircle, Loader2 } from "lucide-react";
import { useSafeBack } from "../../utils/navigation";

const DEFAULT_FORM = {
  companyName: "",
  serviceTypes: [] as string[],
  primaryRegion: "",
  fullName: "",
  emailAddress: "",
  phoneNumber: "",
  slaTarget: "95",
  organization: "None (Platform Level)"
};

export default function VendorCreatePage() {
  const navigate = useNavigate();
  const safeBack = useSafeBack();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [hasDraft, setHasDraft] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const draft = localStorage.getItem("vendor_draft");
    if (draft) {
      setHasDraft(true);
    }
  }, []);

  const handleFieldChange = (field: string, value: any) => {
    setIsDirty(true);
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    localStorage.setItem("vendor_draft", JSON.stringify(updated));
  };

  const handleRestoreDraft = () => {
    const draft = localStorage.getItem("vendor_draft");
    if (draft) {
      setFormData(JSON.parse(draft));
      setHasDraft(false);
      setIsDirty(true);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem("vendor_draft");
    setHasDraft(false);
    setIsDirty(false);
  };

  const validateStep = () => {
    setError("");
    if (step === 1) {
      if (!formData.companyName.trim()) return "Company Name is required.";
      if (!formData.primaryRegion.trim()) return "Primary Region is required.";
      if (formData.serviceTypes.length === 0) return "At least one Service Type is required.";
    }
    if (step === 2) {
      if (!formData.fullName.trim()) return "Full Name is required.";
      if (!formData.emailAddress.trim() || !/^\S+@\S+\.\S+$/.test(formData.emailAddress)) return "A valid Email Address is required.";
      if (!formData.phoneNumber.trim()) return "Phone Number is required.";
    }
    return "";
  };

  const handleNext = () => {
    const stepError = validateStep();
    if (stepError) {
      setError(stepError);
      return;
    }

    if (step < 3) {
      setStep(step + 1);
    } else {
      setIsSaving(true);
      setTimeout(() => {
        clearDraft();
        setIsSaving(false);
        setShowToast(true);
        setTimeout(() => navigate('/admin/vendors'), 1500);
      }, 1000);
    }
  };

  const handleBackAttempt = () => {
    if (isDirty) {
      setShowExitWarning(true);
    } else {
      safeBack("/admin/vendors");
    }
  };

  const handleConfirmExit = () => {
    setShowExitWarning(false);
    safeBack("/admin/vendors");
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Onboard Vendor" fallbackRoute="/admin/vendors" onBackClick={handleBackAttempt} />}>
      <div style={{ padding: "20px" }}>
        
        {/* Wizard Progress */}
        <div className="flex items-center justify-between mb-6">
           {[1,2,3].map(s => (
             <React.Fragment key={s}>
               <div style={{ width: "32px", height: "32px", borderRadius: "16px", backgroundColor: s <= step ? tokens.primary : tokens.border, color: s <= step ? "white" : tokens.inkSec, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px" }}>
                 {s}
               </div>
               {s < 3 && <div style={{ flex: 1, height: "2px", backgroundColor: s < step ? tokens.primary : tokens.border, margin: "0 8px" }} />}
             </React.Fragment>
           ))}
        </div>

        {hasDraft && !isDirty && (
          <div style={{ backgroundColor: "#EFF6FF", padding: "12px", borderRadius: "12px", border: "1px solid #BFDBFE", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: "#1E3A8A", fontWeight: 500 }}>You have an unsaved draft.</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={clearDraft} style={{ background: "none", border: "none", fontSize: "12px", color: "#60A5FA", cursor: "pointer", fontWeight: 500 }}>Discard</button>
              <button onClick={handleRestoreDraft} style={{ background: tokens.primary, border: "none", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", color: "white", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}><RefreshCw size={12}/> Restore</button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: "#FEF2F2", padding: "12px", borderRadius: "12px", border: "1px solid #FECACA", marginBottom: "16px", color: tokens.red, fontSize: "13px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Vendor Details</h2>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Company Name</label>
              <input type="text" value={formData.companyName} onChange={e => handleFieldChange('companyName', e.target.value)} placeholder="FixIt HVAC Services" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Service Types</label>
              <select multiple value={formData.serviceTypes} onChange={e => handleFieldChange('serviceTypes', Array.from(e.target.selectedOptions, option => option.value))} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px", backgroundColor: "white", minHeight: "80px" }}>
                <option value="HVAC">HVAC</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Janitorial">Janitorial</option>
              </select>
              <span style={{ fontSize: "11px", color: tokens.inkMut, marginTop: "4px", display: "block" }}>Hold Ctrl/Cmd to select multiple</span>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Primary Region</label>
              <input type="text" value={formData.primaryRegion} onChange={e => handleFieldChange('primaryRegion', e.target.value)} placeholder="North America" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px" }} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Vendor Manager</h2>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Full Name</label>
              <input type="text" value={formData.fullName} onChange={e => handleFieldChange('fullName', e.target.value)} placeholder="John Smith" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Email Address</label>
              <input type="email" value={formData.emailAddress} onChange={e => handleFieldChange('emailAddress', e.target.value)} placeholder="john@fixit.com" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Phone Number</label>
              <input type="tel" value={formData.phoneNumber} onChange={e => handleFieldChange('phoneNumber', e.target.value)} placeholder="+1 (555) 123-4567" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px" }} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Contract & SLA</h2>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>SLA Target (%)</label>
              <input type="number" value={formData.slaTarget} onChange={e => handleFieldChange('slaTarget', e.target.value)} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Assign to Organization</label>
              <select value={formData.organization} onChange={e => handleFieldChange('organization', e.target.value)} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px", backgroundColor: "white" }}>
                <option value="None (Platform Level)">None (Platform Level)</option>
                <option value="Acme Corp">Acme Corp</option>
                <option value="Global Industries">Global Industries</option>
              </select>
            </div>
            <div style={{ padding: "16px", backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "12px", marginTop: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#9A3412" }}>Requires Approval</div>
              <div style={{ fontSize: "12px", color: "#C2410C", marginTop: "4px" }}>New vendors will be placed in "Pending Approval" state until reviewed by a system administrator.</div>
            </div>
          </div>
        )}

        <AdminActionFooter>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} style={{ flex: 1, padding: "14px", backgroundColor: "white", border: `1px solid ${tokens.border}`, borderRadius: "12px", fontSize: "15px", fontWeight: 600, color: tokens.inkSec, cursor: "pointer" }}>Back</button>
          )}
          <button disabled={isSaving} onClick={handleNext} style={{ flex: 2, padding: "14px", backgroundColor: isSaving ? tokens.inkMut : tokens.primary, border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 600, color: "white", cursor: isSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {isSaving && <Loader2 size={18} className="animate-spin" />}
            {step === 3 ? "Submit Vendor" : "Continue"}
          </button>
        </AdminActionFooter>
      </div>

      <ConfirmationDialog
        isOpen={showExitWarning}
        title="Unsaved Changes"
        message="You have unsaved changes in this form. If you leave now, your progress will be saved as a draft, but you will not complete the vendor onboarding."
        confirmLabel="Leave Anyway"
        confirmColor={tokens.red}
        cancelLabel="Stay Here"
        onConfirm={handleConfirmExit}
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
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Vendor onboarding initiated</span>
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
