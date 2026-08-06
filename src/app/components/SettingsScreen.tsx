import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import {
  ArrowLeft, Search, Globe, Clock,
  Bell, Mail, MessageSquare, Lock, ShieldCheck,
  HelpCircle, Headset, Info, ChevronRight, X, Check
} from "lucide-react";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueMid  = "#3B82F6";
const blueDark = "#1D4ED8";
const blueTint = "#EFF6FF";

const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const inkFaint = "#94A3B8";

const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";

const inter    = "'Inter', 'Roboto', sans-serif";

const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0
    }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3, 5, 7, 9].map((h, i) => (
            <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white", opacity: i < 4 ? 1 : 0.4 }} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <div style={{ width: "22px", height: "11px", borderRadius: "2px", border: "1.5px solid white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, right: "3px", backgroundColor: "white", borderRadius: "1px" }} />
          </div>
          <div style={{ width: "2px", height: "5px", borderRadius: "1px", backgroundColor: "white" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader() {
  const navigate = useNavigate();
  return (
    <div style={{ background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <button
          type="button"
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer",
            fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter
          }}
          onClick={() => handleBackNavigation(navigate, '/dashboard')}
        >
          <ArrowLeft size={15} color="white" /> Back
        </button>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" style={{
            width: "32px", height: "32px", borderRadius: "10px",
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
          }}>
            <Search size={15} color="white" />
          </button>
        </div>
      </div>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, marginBottom: "4px" }}>
          Settings
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>
          Configure application preferences
        </p>
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function Sect({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", padding: "0 4px" }}>
      <span style={{ fontSize: "14px", fontWeight: 800, color: inkSec, letterSpacing: "-0.01em", fontFamily: inter }}>{title}</span>
    </div>
  );
}

// ─── Reusable Bottom Sheet Modal ──────────────────────────────────────────────
function SettingsModal({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <>
      <style>{`
        @keyframes settingsSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      <div 
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} 
        onClick={onClose}
      >
        <div 
          style={{ width: "100%", maxHeight: "90%", display: "flex", flexDirection: "column", backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", boxShadow: "0 -8px 32px rgba(0,0,0,0.12)", animation: "settingsSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }} 
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: "24px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, margin: 0 }}>{title}</h3>
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><X size={22} color={inkSec} /></button>
          </div>
          <div style={{ padding: "0 20px 30px", overflowY: "auto", scrollbarWidth: "none" }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Settings Item & Group ────────────────────────────────────────────────────
interface SettingItemProps {
  icon: React.ElementType; label: string;
  type: "toggle" | "value" | "link";
  value?: string | boolean;
  onToggle?: (val: boolean) => void;
  onClick?: () => void;
  last?: boolean;
}

function SettingsItem({ icon: Icon, label, type, value, onToggle, onClick, last }: SettingItemProps) {
  return (
    <div 
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px",
        borderBottom: last ? "none" : `1px solid ${divider}`,
        cursor: onClick ? "pointer" : "default"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px", backgroundColor: divider,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <Icon size={15} color={inkMut} />
        </div>
        <p style={{ fontSize: "14px", fontWeight: 600, color: ink, fontFamily: inter }}>{label}</p>
      </div>
      
      {/* Right side control */}
      <div>
        {type === "value" && (
          <span style={{ fontSize: "13px", color: inkMut, fontFamily: inter, fontWeight: 500 }}>
            {value}
          </span>
        )}
        
        {type === "link" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {value && <span style={{ fontSize: "13px", color: inkMut, fontFamily: inter, fontWeight: 500 }}>{value}</span>}
            <ChevronRight size={16} color={inkFaint} />
          </div>
        )}
        
        {type === "toggle" && (
          <button
            type="button"
            onClick={() => onToggle && onToggle(!value)}
            style={{
              width: "42px", height: "24px", borderRadius: "100px",
              backgroundColor: value ? blue : border,
              border: "none", cursor: "pointer", position: "relative",
              transition: "background-color 0.2s ease"
            }}
          >
            <div style={{
              position: "absolute", top: "2px", left: value ? "20px" : "2px",
              width: "20px", height: "20px", borderRadius: "50%",
              backgroundColor: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: "left 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const navigate = useNavigate();
  const [push, setPush] = useState(() => localStorage.getItem("app_notif_push") !== "false");
  const [email, setEmail] = useState(() => localStorage.getItem("app_notif_email") === "true");
  const [sms, setSms] = useState(() => localStorage.getItem("app_notif_sms") === "true");

  const handleTogglePush = (val: boolean) => {
    setPush(val);
    localStorage.setItem("app_notif_push", String(val));
  };
  const handleToggleEmail = (val: boolean) => {
    setEmail(val);
    localStorage.setItem("app_notif_email", String(val));
  };
  const handleToggleSms = (val: boolean) => {
    setSms(val);
    localStorage.setItem("app_notif_sms", String(val));
  };
  const [twoFactor, setTwoFactor] = useState(() => localStorage.getItem("app_security_2fa") === "true");
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleToggle2FA = () => {
    const newState = !twoFactor;
    setTwoFactor(newState);
    localStorage.setItem("app_security_2fa", String(newState));
    setActiveModal(null);
  };

  const [language, setLanguage] = useState(() => localStorage.getItem("app_language") || "English");
  const [timezone, setTimezone] = useState(() => localStorage.getItem("app_timezone") || "UTC+4 Dubai");

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem("app_language", lang);
    setActiveModal(null);
  };

  const handleTimezoneSelect = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem("app_timezone", tz);
    setActiveModal(null);
  };


  return (
    <MobileLayout
      header={
        <>
          <StatusBar />
          <PageHeader />
        </>
      }
      scrollContainerStyle={{ paddingBottom: "100px" }}
      modals={
        activeModal && (
          <SettingsModal 
            title={activeModal === "Help" ? "Help Center" : activeModal === "Support" ? "Contact Support" : activeModal === "TwoFactor" ? "Two-Factor Authentication" : activeModal} 
            onClose={() => setActiveModal(null)}
          >
            {activeModal === "Language" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {["English", "Arabic", "French", "Spanish"].map((lang, i) => {
                  const isSelected = language === lang;
                  return (
                  <button key={i} type="button" onClick={() => handleLanguageSelect(lang)} style={{ width: "100%", height: "44px", borderRadius: "12px", background: isSelected ? blueTint : bg, border: `1px solid ${isSelected ? blue + "30" : border}`, color: isSelected ? blue : ink, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px" }}>
                    {lang}
                    {isSelected && <Check size={16} color={blue} />}
                  </button>
                )})}
              </div>
            )}

            {activeModal === "Timezone" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {["UTC+5:30 India", "UTC+4 Dubai", "UTC+0 London", "UTC-5 New York"].map((tz, i) => {
                  const isSelected = timezone === tz;
                  return (
                  <button key={i} type="button" onClick={() => handleTimezoneSelect(tz)} style={{ width: "100%", height: "44px", borderRadius: "12px", background: isSelected ? blueTint : bg, border: `1px solid ${isSelected ? blue + "30" : border}`, color: isSelected ? blue : ink, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px" }}>
                    {tz}
                    {isSelected && <Check size={16} color={blue} />}
                  </button>
                )})}
              </div>
            )}

            {activeModal === "TwoFactor" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p style={{ fontSize: "14px", color: inkMut, fontFamily: inter, lineHeight: 1.5 }}>
                  Two-Factor Authentication (2FA) adds an extra layer of security to your account. When enabled, you will be required to provide a unique code sent to your device along with your password.
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: bg, borderRadius: "12px", border: `1px solid ${border}` }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: ink, fontFamily: inter }}>Current Status</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: twoFactor ? blue : inkMut, fontFamily: inter }}>{twoFactor ? "Enabled" : "Disabled"}</span>
                </div>
                <button type="button" onClick={handleToggle2FA} style={{ width: "100%", height: "48px", borderRadius: "12px", background: twoFactor ? "#EF4444" : blue, border: "none", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer", marginTop: "8px" }}>
                  {twoFactor ? "Disable 2FA" : "Enable 2FA"}
                </button>
              </div>
            )}

            {activeModal === "About" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: `linear-gradient(135deg, ${blue}, #1E3A8A)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${blue}40`, flexShrink: 0 }}>
                  <span style={{ fontSize: "28px", fontWeight: 800, color: "white", fontFamily: inter }}>10x</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 2px 0" }}>10xDS Enterprise UI</p>
                  <p style={{ fontSize: "13px", color: inkMut, fontFamily: inter, margin: 0 }}>Version 1.4.2 (Build 9021)</p>
                </div>

                <div style={{ width: "100%", backgroundColor: bg, borderRadius: "12px", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px", border: `1px solid ${border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: inkMut, fontFamily: inter }}>Organization</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>10xDS</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: inkMut, fontFamily: inter }}>Website</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: blue, fontFamily: inter }}>10xds.com</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: inkMut, fontFamily: inter }}>Support</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: blue, fontFamily: inter }}>support@10xds.com</span>
                  </div>
                </div>

                <div style={{ width: "100%", display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => { setActiveModal(null); navigate("/settings/privacy"); }} style={{ flex: 1, height: "40px", borderRadius: "10px", background: bg, border: `1px solid ${border}`, color: ink, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Privacy Policy</button>
                  <button type="button" onClick={() => { setActiveModal(null); navigate("/settings/terms"); }} style={{ flex: 1, height: "40px", borderRadius: "10px", background: bg, border: `1px solid ${border}`, color: ink, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Terms</button>
                </div>

                <button type="button" onClick={() => setActiveModal(null)} style={{ width: "100%", height: "44px", borderRadius: "12px", background: blue, border: "none", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Close</button>
              </div>
            )}

            {activeModal === "Help" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button type="button" onClick={() => { setActiveModal(null); navigate("/settings/faq"); }} style={{ width: "100%", height: "44px", borderRadius: "12px", background: bg, border: `1px solid ${border}`, color: ink, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px" }}>
                  FAQ <ChevronRight size={16} color={inkFaint} />
                </button>
                <button type="button" onClick={() => { setActiveModal(null); navigate("/settings/user-guide"); }} style={{ width: "100%", height: "44px", borderRadius: "12px", background: bg, border: `1px solid ${border}`, color: ink, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px" }}>
                  User Guide <ChevronRight size={16} color={inkFaint} />
                </button>
                <button type="button" onClick={() => { setActiveModal(null); navigate("/settings/tutorials"); }} style={{ width: "100%", height: "44px", borderRadius: "12px", background: bg, border: `1px solid ${border}`, color: ink, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px" }}>
                  Video Tutorials <ChevronRight size={16} color={inkFaint} />
                </button>
              </div>
            )}

            {activeModal === "Support" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button type="button" onClick={() => { setActiveModal(null); navigate("/settings/live-chat"); }} style={{ width: "100%", height: "48px", borderRadius: "12px", background: blueTint, border: `1px solid ${blue}30`, color: blue, fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  Live Chat Support
                </button>
                <button type="button" onClick={() => { setActiveModal(null); navigate("/raise-ticket"); }} style={{ width: "100%", height: "48px", borderRadius: "12px", background: bg, border: `1px solid ${border}`, color: ink, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  Submit a Ticket
                </button>
                <p style={{ fontSize: "11px", color: inkFaint, fontFamily: inter, textAlign: "center", marginTop: "8px" }}>Support hours: 9AM - 6PM GST (Mon-Fri)</p>
              </div>
            )}
          </SettingsModal>
        )
      }
    >
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="General" />
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
            <SettingsItem icon={Globe} label="Language" type="link" value={language} onClick={() => setActiveModal("Language")} />
            <SettingsItem icon={Clock} label="Timezone" type="link" value={timezone} onClick={() => setActiveModal("Timezone")} last />
          </div>
        </div>

        {/* Notifications */}
        <div style={{ padding: "12px 20px 6px" }}>
          <Sect title="Notifications" />
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
            <SettingsItem icon={Bell} label="Push Notifications" type="toggle" value={push} onToggle={handleTogglePush} />
            <SettingsItem icon={Mail} label="Email Notifications" type="toggle" value={email} onToggle={handleToggleEmail} />
            <SettingsItem icon={MessageSquare} label="SMS Notifications" type="toggle" value={sms} onToggle={handleToggleSms} last />
          </div>
        </div>

        {/* Security */}
        <div style={{ padding: "12px 20px 6px" }}>
          <Sect title="Security" />
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
            <SettingsItem icon={Lock} label="Change Password" type="link" onClick={() => navigate("/settings/change-password")} />
            <SettingsItem icon={ShieldCheck} label="Two-Factor Authentication" type="link" value={twoFactor ? "Enabled" : "Disabled"} onClick={() => setActiveModal("TwoFactor")} last />
          </div>
        </div>

        {/* Support */}
        <div style={{ padding: "12px 20px 24px" }}>
          <Sect title="Support" />
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
            <SettingsItem icon={HelpCircle} label="Help Center" type="link" onClick={() => setActiveModal("Help")} />
            <SettingsItem icon={Headset} label="Contact Support" type="link" onClick={() => setActiveModal("Support")} />
            <SettingsItem icon={Info} label="About" type="link" onClick={() => setActiveModal("About")} last />
          </div>
        </div>

    </MobileLayout>
  );
}
