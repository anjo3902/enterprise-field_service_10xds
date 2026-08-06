import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor } from "../../contexts/VendorContext";
import { 
  User, Bell, Lock, Globe, HelpCircle, 
  LogOut, ChevronRight, CheckCircle2, Shield,
  ArrowLeft, Search, SlidersHorizontal
} from "lucide-react";

// Design tokens
const blue     = "#2563EB";
const blueMid  = "#3B82F6";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

const SettingsSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div style={{ marginBottom: "24px" }}>
    <h3 style={{ fontSize: "13px", fontWeight: 700, color: inkMut, fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 16px" }}>
      {title}
    </h3>
    <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, overflow: "hidden", boxShadow: cardShadow }}>
      {children}
    </div>
  </div>
);

const SettingsItem = ({ icon: Icon, title, subtitle, rightElement, onClick, isLast }: any) => (
  <div 
    onClick={onClick}
    style={{ 
      display: "flex", alignItems: "center", padding: "16px", 
      borderBottom: isLast ? "none" : `1px solid ${divider}`,
      cursor: onClick ? "pointer" : "default"
    }}
  >
    <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px", flexShrink: 0 }}>
      <Icon size={18} color={blue} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: "15px", fontWeight: 600, color: ink, fontFamily: inter, marginBottom: subtitle ? "2px" : "0" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>
          {subtitle}
        </div>
      )}
    </div>
    {rightElement || (
      onClick && <ChevronRight size={18} color={inkMut} />
    )}
  </div>
);

const Toggle = ({ checked, onChange }: any) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    style={{ width: "36px", height: "20px", borderRadius: "10px", backgroundColor: checked ? blue : border, position: "relative", cursor: "pointer", transition: "background-color 0.2s" }}
  >
    <div style={{ width: "16px", height: "16px", borderRadius: "8px", backgroundColor: "#FFF", position: "absolute", top: "2px", left: checked ? "18px" : "2px", transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
  </div>
);

export default function VendorSettings() {
  const navigate = useNavigate();
  const { vendor } = useVendor();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  return (
    <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />}>
      
      {/* ── Custom Header ── */}
      <div style={{
        background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
        padding: "50px 20px 24px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <button type="button" style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "10px", padding: "6px 12px 6px 9px",
            cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter,
          }} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} color="white" /> Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button type="button" style={{
              width: "36px", height: "36px", borderRadius: "10px",
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <Search size={17} color="white" />
            </button>
            <button type="button" style={{
              width: "36px", height: "36px", borderRadius: "10px",
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <SlidersHorizontal size={17} color="white" />
            </button>
          </div>
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: inter, marginBottom: "4px" }}>
          Profile
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", fontFamily: inter }}>
          Manage your account and preferences
        </p>
      </div>

      <div style={{ padding: "24px 16px", marginTop: "-16px", position: "relative", zIndex: 10 }}>
        
        {/* Profile Card */}
        <div style={{
          backgroundColor: card,
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "24px",
          boxShadow: cardShadow,
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "16px",
              backgroundColor: "#2B3648", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", fontWeight: 800, fontFamily: inter,
            }}>
              {vendor.managerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div style={{
              position: "absolute", bottom: "-6px", right: "-6px",
              width: "26px", height: "26px", borderRadius: "50%",
              backgroundColor: blue, display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid white", cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 2px", letterSpacing: "-0.02em" }}>
              {vendor.managerName}
            </h2>
            <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: "0 0 8px", fontWeight: 500 }}>
              {vendor.managerRole}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ backgroundColor: "#F1F5F9", borderRadius: "4px", padding: "3px 6px", fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter }}>
                ID: EMP-9042
              </div>
              <div style={{ backgroundColor: blueTint, border: `1px solid ${blue}30`, borderRadius: "4px", padding: "2px 6px", fontSize: "11px", fontWeight: 700, color: blue, fontFamily: inter }}>
                {vendor.name}
              </div>
            </div>
          </div>
        </div>

        <SettingsSection title="Account & Profile">
          <SettingsItem 
            icon={User} 
            title="Personal Information" 
            subtitle="Update your profile and contact details"
            onClick={() => navigate("/vendor/settings/personal-info")}
          />
          <SettingsItem 
            icon={Shield} 
            title="Vendor Contract" 
            subtitle="View SLA targets and terms"
            onClick={() => navigate("/vendor/sla")}
            isLast={true}
          />
        </SettingsSection>

        <SettingsSection title="Security & Preferences">
          <SettingsItem 
            icon={Lock} 
            title="Change Password" 
            subtitle="Update your security credentials"
            onClick={() => navigate("/vendor/settings/password")}
          />
          <SettingsItem 
            icon={Bell} 
            title="Push Notifications" 
            subtitle="Alerts for new tickets and SLAs"
            rightElement={<Toggle checked={pushEnabled} onChange={() => setPushEnabled(!pushEnabled)} />}
          />
          <SettingsItem 
            icon={Globe} 
            title="Email Notifications" 
            subtitle="Daily performance summaries"
            rightElement={<Toggle checked={emailEnabled} onChange={() => setEmailEnabled(!emailEnabled)} />}
            isLast={true}
          />
        </SettingsSection>

        <SettingsSection title="Support & Legal">
          <SettingsItem 
            icon={HelpCircle} 
            title="Help & Support" 
            subtitle="FAQ, Live Chat, and Contact"
            onClick={() => navigate("/vendor/settings/help")}
            isLast={true}
          />
        </SettingsSection>

        {/* Logout Button */}
        <button 
          onClick={() => navigate("/login")}
          style={{ 
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            backgroundColor: card, border: `1px solid ${border}`, borderRadius: "16px",
            padding: "16px", cursor: "pointer", boxShadow: cardShadow,
            marginTop: "12px", marginBottom: "32px"
          }}
        >
          <LogOut size={18} color="#DC2626" />
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#DC2626", fontFamily: inter }}>
            Sign Out
          </span>
        </button>

        <div style={{ textAlign: "center", paddingBottom: "24px" }}>
          <p style={{ fontSize: "12px", color: inkMut, fontFamily: inter, margin: "0 0 4px" }}>
            10xDS Facility Management App
          </p>
          <p style={{ fontSize: "11px", color: inkMut, fontFamily: inter, opacity: 0.7, margin: 0 }}>
            Version 2.4.1 (89240)
          </p>
        </div>

      </div>

    </MobileLayout>
  );
}
