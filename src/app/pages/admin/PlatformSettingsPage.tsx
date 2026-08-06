import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { AdminActionFooter } from "../../components/admin/shared/AdminActionFooter";
import { Settings, Palette, Globe, Wrench, Mail, MessageSquare, Database, Key, Sliders, CheckCircle2 } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function PlatformSettingsPage() {
  const navigate = useNavigate();
  
  // States for the various configurations
  const [platformName, setPlatformName] = useState("Enterprise FSM");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailGateway, setEmailGateway] = useState("smtp.10xds.com");
  const [smsGateway, setSmsGateway] = useState("Twilio");
  const [storageProvider, setStorageProvider] = useState("AWS S3");
  const [showSaveToast, setShowSaveToast] = useState(false);

  const handleSave = () => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-4">
       <Icon size={18} color={tokens.ink} />
       <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: tokens.ink }}>{title}</h3>
    </div>
  );

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="Platform Settings" fallbackRoute="/admin/dashboard" showBackButton={false} />}
    >
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "30px" }}>
        
        {/* Branding & System Preferences */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <SectionHeader icon={Palette} title="Branding & System Preferences" />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Platform Name</label>
              <input type="text" value={platformName} onChange={(e) => setPlatformName(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, outline: "none" }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>Dark Mode Default</div>
                <div style={{ fontSize: "11px", color: tokens.inkSec }}>Force dark mode for all new tenants</div>
              </div>
              <div style={{ width: "40px", height: "24px", borderRadius: "12px", backgroundColor: tokens.border, position: "relative", cursor: "pointer" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "10px", backgroundColor: "white", position: "absolute", top: "2px", left: "2px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <SectionHeader icon={Globe} title="Regional Settings" />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Default Timezone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white", outline: "none" }}>
                <option value="UTC">UTC (Universal Time)</option>
                <option value="America/New_York">Eastern Time (US)</option>
                <option value="Asia/Dubai">Gulf Standard Time</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Date Format</label>
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white", outline: "none" }}>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <SectionHeader icon={Wrench} title="Maintenance" />
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>Maintenance Mode</div>
              <div style={{ fontSize: "11px", color: tokens.inkSec }}>Suspend access for non-admins</div>
            </div>
            <div 
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              style={{ width: "40px", height: "24px", borderRadius: "12px", backgroundColor: maintenanceMode ? tokens.red : tokens.border, position: "relative", cursor: "pointer", transition: "all 0.2s" }}
            >
              <div style={{ width: "20px", height: "20px", borderRadius: "10px", backgroundColor: "white", position: "absolute", top: "2px", left: maintenanceMode ? "18px" : "2px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", transition: "all 0.2s" }} />
            </div>
          </div>
        </div>

        {/* Communication (Email & SMS) */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <SectionHeader icon={Mail} title="Communication Gateways" />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Email Gateway</label>
              <input type="text" value={emailGateway} onChange={(e) => setEmailGateway(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>SMS Provider</label>
              <select value={smsGateway} onChange={(e) => setSmsGateway(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white", outline: "none" }}>
                <option value="Twilio">Twilio</option>
                <option value="AWS SNS">AWS SNS</option>
                <option value="MessageBird">MessageBird</option>
              </select>
            </div>
          </div>
        </div>

        {/* Storage & API Keys */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <SectionHeader icon={Database} title="Storage & API Keys" />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Storage Provider</label>
              <select value={storageProvider} onChange={(e) => setStorageProvider(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white", outline: "none" }}>
                <option value="AWS S3">AWS S3</option>
                <option value="Azure Blob">Azure Blob Storage</option>
                <option value="Google Cloud">Google Cloud Storage</option>
              </select>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Key size={16} color={tokens.inkSec} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>Manage API Keys</span>
              </div>
              <button onClick={() => navigate('/admin/settings/integrations')} style={{ padding: "6px 12px", backgroundColor: tokens.borderLight, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: tokens.ink, cursor: "pointer" }}>
                View Keys
              </button>
            </div>
          </div>
        </div>

        <AdminActionFooter>
          <button 
            onClick={handleSave}
            style={{ width: "100%", padding: "14px", backgroundColor: tokens.primary, color: "white", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 600, cursor: "pointer", transition: "background-color 0.2s" }}
          >
            Save Configuration
          </button>
        </AdminActionFooter>

      </div>

      {/* Save Success Toast */}
      {showSaveToast && (
        <div style={{
          position: "absolute",
          bottom: "100px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#10B981",
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
          <CheckCircle2 size={18} color="white" />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Settings saved securely</span>
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
