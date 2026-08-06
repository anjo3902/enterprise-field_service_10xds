import React, { useState } from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { AdminActionFooter } from "../../components/admin/shared/AdminActionFooter";
import { ConfirmationDialog } from "../../components/admin/shared/ConfirmationDialog";
import { useAdminContext } from "../../contexts/AdminContext";
import { ShieldCheck, Users, Building2, HardHat, HardDrive, BrainCircuit, CheckCircle2, Copy, Mail, Phone, Clock, Loader2, ArrowUpCircle } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function LicenseManagerPage() {
  const { license, licenseUpgradeRequested, licenseUpgradeRequestTime, requestLicenseUpgrade } = useAdminContext();
  
  // State for workflows
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  const displayToast = (message: string) => {
    setShowToast({ message, visible: true });
    setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    displayToast(`${label} copied to clipboard`);
  };

  const handleUpgradeConfirm = async () => {
    setIsSubmittingUpgrade(true);
    await requestLicenseUpgrade();
    setIsSubmittingUpgrade(false);
    setShowUpgradeDialog(false);
    displayToast("License upgrade request submitted successfully");
  };

  const getGaugeColor = (used: number, total: number) => {
    const pct = used / total;
    if (pct >= 0.95) return tokens.red;
    if (pct >= 0.8) return tokens.orange;
    return tokens.green;
  };

  const UsageGauge = ({ label, used, total, icon: Icon }: any) => {
    const pct = (used / total) * 100;
    const color = getGaugeColor(used, total);
    
    return (
      <div style={{ marginBottom: "16px" }}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Icon size={14} color={tokens.inkSec} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{label}</span>
          </div>
          <div style={{ fontSize: "12px", fontWeight: 600 }}>
             <span style={{ color: color }}>{used.toLocaleString()}</span>
             <span style={{ color: tokens.inkMut }}> / {total.toLocaleString()}</span>
          </div>
        </div>
        <div style={{ width: "100%", height: "8px", backgroundColor: tokens.bg, borderRadius: "4px", border: `1px solid ${tokens.border}`, overflow: "hidden" }}>
           <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", backgroundColor: color }} />
        </div>
      </div>
    );
  };

  const modals = (
    <>
      {/* Contact Account Manager Dialog */}
      {showContactDialog && (
        <div 
          onClick={() => setShowContactDialog(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", zIndex: 100, display: "flex", alignItems: "flex-end", animation: "fadeIn 0.2s ease-out" }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", backgroundColor: "white", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", animation: "slideUp 0.3s ease-out" }}
          >
            <div style={{ width: "40px", height: "4px", backgroundColor: tokens.border, borderRadius: "2px", margin: "0 auto 20px" }} />
            
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: tokens.ink, margin: "0 0 8px" }}>Account Manager</h2>
            <p style={{ fontSize: "14px", color: tokens.inkSec, margin: "0 0 24px" }}>Your dedicated support contact for {license.planName} licensing.</p>

            <div style={{ backgroundColor: tokens.bg, borderRadius: "16px", padding: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "24px", backgroundColor: tokens.primary, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700 }}>
                  {license.accountManagerName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: tokens.ink }}>{license.accountManagerName}</div>
                  <div style={{ fontSize: "13px", color: tokens.primary, fontWeight: 600 }}>Enterprise Success Manager</div>
                </div>
              </div>
              
              <div style={{ height: "1px", backgroundColor: tokens.border, margin: "16px 0" }} />
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: tokens.inkSec }}>
                  <Mail size={16} />
                  <span style={{ fontSize: "14px" }}>{license.accountManagerEmail}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleCopy(license.accountManagerEmail, "Email")} style={{ background: "none", border: "none", padding: "4px", cursor: "pointer", color: tokens.inkMut }}><Copy size={16} /></button>
                  <a href={`mailto:${license.accountManagerEmail}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 12px", backgroundColor: tokens.primaryTint, color: tokens.primary, borderRadius: "8px", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>Email</a>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: tokens.inkSec }}>
                  <Phone size={16} />
                  <span style={{ fontSize: "14px" }}>+971 50 123 4567</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleCopy("+971501234567", "Phone")} style={{ background: "none", border: "none", padding: "4px", cursor: "pointer", color: tokens.inkMut }}><Copy size={16} /></button>
                  <a href="tel:+971501234567" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 12px", backgroundColor: tokens.primaryTint, color: tokens.primary, borderRadius: "8px", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>Call</a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: tokens.inkSec }}>
                <Clock size={16} />
                <span style={{ fontSize: "14px" }}>Available Mon-Fri, 9AM-6PM GST</span>
              </div>
            </div>

            <button 
              onClick={() => setShowContactDialog(false)}
              style={{ width: "100%", padding: "14px", backgroundColor: "white", color: tokens.ink, border: `1px solid ${tokens.border}`, borderRadius: "12px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Request Dialog */}
      <ConfirmationDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        title="Request License Upgrade"
        message={`Your current ${license.planName} plan is reaching its resource limits.`}
        detail="We recommend upgrading to the Enterprise Plus tier to increase your maximum capacity for Vendors, Storage, and AI API calls. This will increase your estimated monthly billing."
        confirmLabel="Submit Upgrade Request"
        confirmColor={tokens.primary}
        onConfirm={handleUpgradeConfirm}
        isLoading={isSubmittingUpgrade}
        icon={ArrowUpCircle}
        iconColor={tokens.primary}
        iconTint={tokens.primaryTint}
      />

      {/* Toast Notification */}
      {showToast.visible && (
        <div style={{
          position: "absolute", bottom: "100px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: tokens.green, color: "white", padding: "12px 24px",
          borderRadius: "30px", display: "flex", alignItems: "center", gap: "8px",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)", animation: "fadeInUp 0.3s ease-out", zIndex: 1000
        }}>
          <CheckCircle2 size={18} color="white" />
          <span style={{ fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap" }}>{showToast.message}</span>
        </div>
      )}
    </>
  );

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="License Manager" fallbackRoute="/admin/dashboard" showBackButton={true} />} modals={modals}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Overview */}
        <div style={{ backgroundColor: tokens.primary, borderRadius: "16px", padding: "20px", color: "white" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
               <ShieldCheck size={20} color="#86EFAC" />
               <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{license.planName} Plan</h2>
            </div>
            {licenseUpgradeRequested && (
              <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "rgba(255,255,255,0.2)", padding: "4px 8px", borderRadius: "12px" }}>
                Pending Upgrade
              </span>
            )}
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", marginBottom: "16px" }}>License ID: {license.licenseId}</div>
          
          <div style={{ padding: "12px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}>
             <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>Next Renewal</div>
             <div style={{ fontSize: "16px", fontWeight: 700 }}>{new Date(license.renewalDate).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Usage */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px", color: tokens.ink }}>Resource Usage</h3>
          
          <UsageGauge label="Organizations" used={license.usage.organizations.used} total={license.usage.organizations.total} icon={Building2} />
          <UsageGauge label="Vendors" used={license.usage.vendors.used} total={license.usage.vendors.total} icon={HardHat} />
          <UsageGauge label="Total Users" used={license.usage.users.used} total={license.usage.users.total} icon={Users} />
          
          <div style={{ height: "1px", backgroundColor: tokens.border, margin: "16px 0" }} />
          
          <UsageGauge label="Storage (GB)" used={license.usage.storageGb.used} total={license.usage.storageGb.total} icon={HardDrive} />
          <UsageGauge label="AI API Calls / mo" used={license.usage.apiCallsMonthly.used} total={license.usage.apiCallsMonthly.total} icon={BrainCircuit} />
        </div>

        <AdminActionFooter>
          <button 
            onClick={() => setShowContactDialog(true)}
            style={{ flex: 1, padding: "14px", backgroundColor: tokens.card, color: tokens.ink, border: `1px solid ${tokens.border}`, borderRadius: "12px", fontSize: "15px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            Contact Account Manager
          </button>
          <button 
            onClick={() => setShowUpgradeDialog(true)}
            disabled={licenseUpgradeRequested}
            style={{ flex: 2, padding: "14px", backgroundColor: licenseUpgradeRequested ? tokens.border : tokens.primary, color: licenseUpgradeRequested ? tokens.inkMut : "white", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 600, cursor: licenseUpgradeRequested ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {licenseUpgradeRequested ? "Upgrade Request Submitted" : "Request License Upgrade"}
          </button>
        </AdminActionFooter>

      </div>
    </MobileLayout>
  );
}
