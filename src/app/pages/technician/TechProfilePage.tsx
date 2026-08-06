import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { TechBottomNavigation } from "../../components/technician/TechBottomNavigation";
import { useTechnician } from "../../contexts/TechnicianContext";
import {
  User, Mail, Phone, MapPin, Briefcase, Star, ClipboardList,
  Target, Clock, Calendar, CheckCircle2, Award, LogOut, ChevronRight,
  Bell, Globe, HelpCircle, Info, Edit3, Key, Shield, CalendarDays, ArrowLeft, Pencil
} from "lucide-react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const blue = "#2563EB", blueTint = "#EFF6FF", blueDark = "#1E40AF";
const green = "#16A34A", greenT = "#DCFCE7";
const red = "#DC2626", redT = "#FEF2F2";
const amber = "#D97706", amberT = "#FFFBEB";
const purple = "#7C3AED", purpleT = "#F5F3FF";
const teal = "#0891B2", tealT = "#ECFEFF";
const ink = "#0F172A", inkSec = "#475569", inkMut = "#64748B", inkFaint = "#94A3B8";
const bg = "#F8FAFC", card = "#FFFFFF", border = "#E2E8F0", divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, icon: Icon, rightAction }: { title: string; subtitle?: string; icon?: any; rightAction?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
      <div style={{ display: "flex", gap: "10px" }}>
        {Icon && <Icon size={20} color={ink} style={{ marginTop: "2px" }} />}
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.01em" }}>
            {title}
          </h3>
          {subtitle && <p style={{ margin: 0, fontSize: "13px", color: inkMut, fontFamily: inter, fontWeight: 500 }}>{subtitle}</p>}
        </div>
      </div>
      {rightAction}
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div style={{ padding: "12px", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
      <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: inter }}>{label}</p>
      <div style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: ink, fontFamily: inter, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{ backgroundColor: ink, color: "white", padding: "6px 14px", borderRadius: "8px", border: "none", fontSize: "12px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}
    >
      Edit
    </button>
  );
}

function KPICard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string; tint: string }) {
  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Icon size={12} color={color} />
        <span style={{ fontSize: "10px", fontWeight: 600, color: inkMut, fontFamily: inter }}>{label}</span>
      </div>
      <div style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.03em" }}>{value}</div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, onClick, color = ink, showArrow = true }: { icon: any; label: string; onClick: () => void; color?: string; showArrow?: boolean }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderBottom: `1px solid ${divider}`, cursor: "pointer" }}>
      <Icon size={18} color={color} />
      <span style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: color, fontFamily: inter }}>{label}</span>
      {showArrow && <ChevronRight size={16} color={inkFaint} />}
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function TechProfilePage() {
  const navigate = useNavigate();
  const { profile, performance, jobs, pmTasks, language, setLanguage, notificationPreferences, updateNotificationPreference } = useTechnician();
  
  // Interactive State
  const [activeDrawer, setActiveDrawer] = useState<"status" | "skills" | "schedule" | "language" | "notifications" | "about" | null>(null);

  const [availabilityStatus, setAvailabilityStatus] = useState("on_job");
  const [maxJobs, setMaxJobs] = useState<number>(7);
  
  const [primarySkills, setPrimarySkills] = useState("AC Repair, Chiller Maintenance, Duct Cleaning, Refrigeration");
  const [secondarySkills, setSecondarySkills] = useState("Electrical Basics, Plumbing Repairs, Thermostat Wiring");
  const [certifications, setCertifications] = useState<string[]>(profile.certifications);
  const [isAddingCert, setIsAddingCert] = useState(false);
  const [newCertInput, setNewCertInput] = useState("");
  
  const [shiftType, setShiftType] = useState("Morning Shift");
  const [weekendOff, setWeekendOff] = useState("Friday, Saturday");

  // Calculate availability badge
  const getAvailability = (status: string) => {
    switch(status) {
      case "available": return { label: "Available", color: green, bg: greenT };
      case "on_job": return { label: "On Job", color: amber, bg: amberT };
      case "unavailable": return { label: "Unavailable", color: purple, bg: purpleT };
      case "off": return { label: "Off Duty", color: inkMut, bg: divider };
      default: return { label: "Unknown", color: inkMut, bg: divider };
    }
  };
  const avail = getAvailability(availabilityStatus);

  // Derived properties
  const workingHours = shiftType === "Morning Shift" ? "08:00 AM - 05:00 PM" :
                       shiftType === "Evening Shift" ? "02:00 PM - 11:00 PM" :
                       "10:00 PM - 07:00 AM";

  const todayJobs = jobs.filter(j => !["Completed","Closed","Rejected"].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === "Completed").length;
  const completedPMs = pmTasks.filter(p => p.status === "Completed").length;
  const amcVisits = Math.floor(completedPMs * 0.4); 
  const warrantyInspections = Math.floor(completedJobs * 0.1);

  // Profile data
  const primaryDomain = "HVAC";
  const experienceLevel = "Field Engineer";
  const locationZone = "Downtown Dubai";
  const coords = "25.197200, 55.274400";
  const criticalFaultEligible = experienceLevel.toLowerCase() === "field engineer" ? "Yes" : "No";

  const renderDrawer = () => {
    if (!activeDrawer) return null;

    let title = "";
    let description = "";
    let content = null;

    if (activeDrawer === "status") {
      title = "Edit Work Status";
      description = "Update your current availability status and adjust your maximum jobs per day.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", display: "block" }}>Availability Status</label>
            <select value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: bg, color: ink, fontSize: "14px", fontWeight: 500, fontFamily: inter, outline: "none" }}>
              <option value="available">Available</option>
              <option value="on_job">On Job</option>
              <option value="unavailable">Unavailable</option>
              <option value="off">Off Duty</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", display: "block" }}>Max Jobs Per Day</label>
            <input type="number" value={maxJobs} onChange={(e) => setMaxJobs(Number(e.target.value))} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: bg, color: ink, fontSize: "14px", fontWeight: 500, fontFamily: inter, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
      );
    } else if (activeDrawer === "skills") {
      title = "Edit Skills & Certifications";
      description = "Manage your primary skills, secondary skills, and active certifications.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", display: "block" }}>Primary Skills (Comma separated)</label>
            <textarea rows={2} value={primarySkills} onChange={(e) => setPrimarySkills(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: bg, color: ink, fontSize: "14px", fontWeight: 500, fontFamily: inter, outline: "none", resize: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", display: "block" }}>Secondary Skills (Comma separated)</label>
            <textarea rows={2} value={secondarySkills} onChange={(e) => setSecondarySkills(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: bg, color: ink, fontSize: "14px", fontWeight: 500, fontFamily: inter, outline: "none", resize: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", display: "block" }}>Certifications</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
              {certifications.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: "8px", backgroundColor: divider }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: ink }}>{c}</span>
                  <button 
                    onClick={() => setCertifications(certifications.filter((_, idx) => idx !== i))} 
                    style={{ background: "none", border: "none", color: red, cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {isAddingCert ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <input 
                  value={newCertInput} 
                  onChange={e => setNewCertInput(e.target.value)} 
                  placeholder="Certification Name" 
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${border}`, fontSize: "13px", outline: "none", fontFamily: inter }}
                  autoFocus
                />
                <button 
                  onClick={() => {
                    if (newCertInput.trim()) {
                      setCertifications([...certifications, newCertInput.trim()]);
                    }
                    setNewCertInput("");
                    setIsAddingCert(false);
                  }}
                  style={{ padding: "0 12px", backgroundColor: ink, color: "white", borderRadius: "8px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer" }}>
                  Add
                </button>
                <button 
                  onClick={() => {
                    setNewCertInput("");
                    setIsAddingCert(false);
                  }}
                  style={{ padding: "0 12px", backgroundColor: divider, color: ink, borderRadius: "8px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div onClick={() => setIsAddingCert(true)} style={{ padding: "12px", border: `1px dashed ${inkMut}`, borderRadius: "10px", backgroundColor: bg, color: inkSec, fontSize: "13px", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer" }}>
                + Add New Certification
              </div>
            )}
          </div>
        </div>
      );
    } else if (activeDrawer === "schedule") {
      title = "Edit Work Schedule";
      description = "Request shift changes or update your upcoming leave schedule.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", display: "block" }}>Shift Type</label>
            <select value={shiftType} onChange={(e) => setShiftType(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: bg, color: ink, fontSize: "14px", fontWeight: 500, fontFamily: inter, outline: "none" }}>
              <option value="Morning Shift">Morning Shift (08:00 AM - 05:00 PM)</option>
              <option value="Evening Shift">Evening Shift (02:00 PM - 11:00 PM)</option>
              <option value="Night Shift">Night Shift (10:00 PM - 07:00 AM)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", display: "block" }}>Weekend Off</label>
            <select value={weekendOff} onChange={(e) => setWeekendOff(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: bg, color: ink, fontSize: "14px", fontWeight: 500, fontFamily: inter, outline: "none" }}>
              <option value="Friday, Saturday">Friday, Saturday</option>
              <option value="Saturday, Sunday">Saturday, Sunday</option>
              <option value="Sunday, Monday">Sunday, Monday</option>
            </select>
          </div>
        </div>
      );
    } else if (activeDrawer === "language") {
      title = "Language Preferences";
      description = "Select your preferred application language.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {["English", "Arabic", "Malayalam"].map(lang => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang);
                setActiveDrawer(null);
              }}
              style={{
                padding: "16px", borderRadius: "12px", border: `1px solid ${language === lang ? blue : border}`,
                backgroundColor: language === lang ? blueTint : card, display: "flex", justifyContent: "space-between",
                alignItems: "center", cursor: "pointer", fontFamily: inter
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: language === lang ? 700 : 500, color: language === lang ? blue : ink }}>{lang}</span>
              {language === lang && <CheckCircle2 size={18} color={blue} />}
            </button>
          ))}
        </div>
      );
    } else if (activeDrawer === "notifications") {
      title = "Notification Preferences";
      description = "Manage alerts, push notifications, and sound settings.";
      
      const PreferenceToggle = ({ label, settingKey }: { label: string, settingKey: keyof typeof notificationPreferences }) => (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${divider}` }}>
          <span style={{ fontSize: "14px", fontWeight: 500, color: ink }}>{label}</span>
          <div 
            onClick={() => updateNotificationPreference(settingKey, !notificationPreferences[settingKey])}
            style={{ width: "40px", height: "24px", borderRadius: "12px", backgroundColor: notificationPreferences[settingKey] ? green : border, position: "relative", cursor: "pointer", transition: "all 0.2s" }}
          >
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "white", position: "absolute", top: "1px", left: notificationPreferences[settingKey] ? "19px" : "1px", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
          </div>
        </div>
      );

      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h4 style={{ fontSize: "12px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.05em", margin: "8px 0 4px" }}>Alert Types</h4>
          <PreferenceToggle label="Job Assignments" settingKey="jobAssignment" />
          <PreferenceToggle label="PM Tasks & AMC Visits" settingKey="pmTask" />
          <PreferenceToggle label="SLA Warnings" settingKey="slaAlerts" />
          <PreferenceToggle label="Vendor Messages" settingKey="vendorMessages" />
          <PreferenceToggle label="AI Recommendations" settingKey="aiRecommendations" />
          
          <h4 style={{ fontSize: "12px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 4px" }}>Delivery Settings</h4>
          <PreferenceToggle label="Push & Sound" settingKey="sound" />
          <PreferenceToggle label="Vibration" settingKey="vibration" />
          <PreferenceToggle label="Email Summaries" settingKey="email" />
        </div>
      );
    } else if (activeDrawer === "about") {
      title = "About 10xDS App";
      description = "Application information and legal documents.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", backgroundColor: divider, borderRadius: "12px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Globe size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.01em" }}>10xDS Technician Pro</div>
              <div style={{ fontSize: "13px", color: inkMut, fontWeight: 500 }}>Version 2.4.1 (Build 8902)</div>
            </div>
          </div>
          <div style={{ fontSize: "13.5px", color: inkSec, lineHeight: "1.5", marginTop: "4px" }}>
            The 10xDS Enterprise Service Management app is designed to streamline field service operations, ensuring high SLAs and intelligent task routing.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => { setActiveDrawer(null); navigate("/privacy"); }} style={{ padding: "12px", backgroundColor: card, border: `1px solid ${border}`, borderRadius: "10px", fontSize: "14px", fontWeight: 600, color: blue, cursor: "pointer", textAlign: "center" }}>Privacy Policy</button>
            <button onClick={() => { setActiveDrawer(null); navigate("/terms"); }} style={{ padding: "12px", backgroundColor: card, border: `1px solid ${border}`, borderRadius: "10px", fontSize: "14px", fontWeight: 600, color: blue, cursor: "pointer", textAlign: "center" }}>Terms & Conditions</button>
          </div>
          <div style={{ fontSize: "11px", color: inkFaint, textAlign: "center", marginTop: "12px" }}>
            © 2026 10xDS. All rights reserved.
          </div>
        </div>
      );
    }

    return (
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div onClick={() => setActiveDrawer(null)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", animation: "fadeIn 0.2s ease-out forwards" }} />
        
        <div style={{ position: "relative", backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "20px 20px 30px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "85%", overflowY: "auto", fontFamily: inter, boxShadow: "0 -4px 20px rgba(0,0,0,0.1)", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>
             <div style={{ width: "40px", height: "5px", borderRadius: "100px", backgroundColor: border }} />
          </div>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: ink, letterSpacing: "-0.02em" }}>{title}</h2>
            <p style={{ margin: 0, fontSize: "14px", color: inkMut, fontWeight: 500 }}>{description}</p>
          </div>
          <div style={{ padding: "4px 0" }}>
            {content}
          </div>

          {activeDrawer !== "language" && activeDrawer !== "about" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => setActiveDrawer(null)} style={{ padding: "14px", backgroundColor: ink, color: "white", borderRadius: "12px", fontSize: "15px", fontWeight: 700, border: "none", cursor: "pointer" }}>Save Changes</button>
              <button onClick={() => setActiveDrawer(null)} style={{ padding: "14px", backgroundColor: divider, color: ink, borderRadius: "12px", fontSize: "15px", fontWeight: 700, border: "none", cursor: "pointer" }}>Cancel</button>
            </div>
          )}
        </div>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        `}</style>
      </div>
    );
  };

  return (
    <MobileLayout backgroundColor={bg} bottomNav={<TechBottomNavigation />} modals={renderDrawer()}>
      <div style={{ paddingBottom: "30px", fontFamily: inter }}>
        
        {/* 1. Header block */}
        <div style={{ background: blue, padding: "20px 20px 24px", flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: "8px" }}>
            <button 
              onClick={() => navigate(-1)}
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", color: "white", padding: "6px 12px", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h1 style={{ margin: "0 0 4px", fontSize: "28px", fontWeight: 800, color: "white", letterSpacing: "-0.03em", fontFamily: inter }}>Profile</h1>
            <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.85)", fontWeight: 500, fontFamily: inter }}>
              Manage your account and preferences
            </p>
          </div>
        </div>

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px", position: "relative", zIndex: 10 }}>
          
          {/* Identity Card */}
          <div style={{ backgroundColor: card, borderRadius: "20px", padding: "20px", boxShadow: cardShadow, border: `1px solid ${border}`, display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "16px", backgroundColor: profile.avatarColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "24px", fontWeight: 800, color: "white", fontFamily: inter }}>{profile.initials}</span>
              </div>
              <div style={{ position: "absolute", bottom: "-6px", right: "-6px", width: "24px", height: "24px", borderRadius: "12px", backgroundColor: blue, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", cursor: "pointer" }}>
                <Pencil size={10} color="white" />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.02em" }}>{profile.name}</h2>
              <p style={{ margin: "0 0 10px", fontSize: "13px", color: inkSec, fontFamily: inter, fontWeight: 500 }}>{experienceLevel}</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ padding: "3px 8px", backgroundColor: divider, color: inkSec, borderRadius: "6px", fontSize: "11px", fontWeight: 700, fontFamily: inter }}>ID: {profile.id}</span>
                <span style={{ padding: "3px 8px", backgroundColor: "white", border: `1px solid ${blue}40`, color: blue, borderRadius: "6px", fontSize: "11px", fontWeight: 700, fontFamily: inter }}>Acme Facility</span>
              </div>
            </div>
          </div>
          
          {/* 2. Profile Details (Personal Information) */}
          <div style={{ backgroundColor: card, borderRadius: "16px", padding: "18px", boxShadow: cardShadow, border: `1px solid ${border}` }}>
            <SectionHeader title="Profile" subtitle="Read-only identity and field assignment details" icon={User} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <DetailBox label="Name" value={profile.name} />
              <DetailBox label="Technician Code" value={profile.id} />
              <DetailBox label="Phone Number" value="+916000000827" />
              <DetailBox label="Primary Domain" value={primaryDomain} />
              <DetailBox label="Experience Level" value={experienceLevel} />
              <DetailBox label="Location Zone" value={locationZone} />
              {experienceLevel.toLowerCase() === "field engineer" && (
                <DetailBox label="Critical Fault Eligible" value={criticalFaultEligible} />
              )}
              <DetailBox label="Coordinates" value={coords} />
            </div>
          </div>

          {/* 3. Work Status */}
          <div style={{ backgroundColor: card, borderRadius: "16px", padding: "18px", boxShadow: cardShadow, border: `1px solid ${border}` }}>
            <SectionHeader 
              title="Work Status" 
              subtitle="Read-only live operational status from dispatch system" 
              icon={Briefcase} 
              rightAction={<EditButton onClick={() => setActiveDrawer("status")} />} 
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <DetailBox label="Availability Status" value={
                <span style={{ display: "flex", alignItems: "center", gap: "6px", textTransform: "capitalize", color: ink }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "4px", backgroundColor: avail.color }} />
                  {avail.label}
                </span>
              } />
              <DetailBox label="Current Jobs" value={todayJobs.length} />
              <DetailBox label="Max Jobs Per Day" value={maxJobs} />
            </div>
          </div>

          {/* 4. Skills & Certifications */}
          <div style={{ backgroundColor: card, borderRadius: "16px", padding: "18px", boxShadow: cardShadow, border: `1px solid ${border}` }}>
            <SectionHeader 
              title="Skills & Certifications" 
              subtitle="Editable competency profile used for dispatch eligibility" 
              icon={Shield} 
              rightAction={<EditButton onClick={() => setActiveDrawer("skills")} />} 
            />
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              {/* Skills Box */}
              <div style={{ padding: "12px", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: "10px" }}>
                <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.05em" }}>Primary Skills</p>
                <div style={{ fontSize: "13px", fontWeight: 600, color: ink, lineHeight: "1.6" }}>
                  {primarySkills}
                </div>
              </div>
              
              {/* Certified Skills Box */}
              <div style={{ padding: "12px", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: "10px" }}>
                <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.05em" }}>Secondary Skills</p>
                <div style={{ fontSize: "13px", fontWeight: 600, color: ink, lineHeight: "1.6" }}>
                  {secondarySkills}
                </div>
              </div>
            </div>

            {/* Certifications Box */}
            <div style={{ padding: "12px", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: "10px" }}>
              <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", letterSpacing: "0.05em" }}>Certifications</p>
              <div style={{ fontSize: "13px", fontWeight: 600, color: ink, lineHeight: "1.6" }}>
                {certifications.length > 0 ? certifications.join(", ") : "None"}
              </div>
            </div>
          </div>

          {/* 5. Work Schedule */}
          <div style={{ backgroundColor: card, borderRadius: "16px", padding: "18px", boxShadow: cardShadow, border: `1px solid ${border}` }}>
            <SectionHeader 
              title="Work Schedule" 
              subtitle="View and manage your assigned shifts and availability" 
              icon={CalendarDays} 
              rightAction={<EditButton onClick={() => setActiveDrawer("schedule")} />} 
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <DetailBox label="Shift Type" value={shiftType} />
              <DetailBox label="Working Hours" value={workingHours} />
              <DetailBox label="Weekend Off" value={weekendOff} />
              <DetailBox label="Upcoming Leave" value="None" />
            </div>
          </div>

          {/* 6. Performance */}
          <div style={{ backgroundColor: card, borderRadius: "16px", padding: "18px", boxShadow: cardShadow, border: `1px solid ${border}` }}>
            <SectionHeader title="Performance Metrics" icon={Star} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <KPICard label="Jobs Completed" value={performance.jobsCompleted} icon={ClipboardList} color={blue} tint={blueTint} />
              <KPICard label="SLA Compliance" value={`${performance.slaCompliance}%`} icon={Target} color={green} tint={greenT} />
              <KPICard label="Avg Completion" value={`${performance.avgCompletionHrs}h`} icon={Clock} color={amber} tint={amberT} />
              <KPICard label="First-Time Fix" value="92%" icon={CheckCircle2} color={teal} tint={tealT} />
            </div>
          </div>

          {/* 7. Work History Summary */}
          <div style={{ backgroundColor: card, borderRadius: "16px", padding: "18px", boxShadow: cardShadow, border: `1px solid ${border}` }}>
            <SectionHeader title="Work History Summary" icon={ClipboardList} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: `1px solid ${divider}` }}>
                <span style={{ fontSize: "13px", color: inkSec, fontWeight: 500 }}>Completed Jobs</span>
                <span style={{ fontSize: "14px", color: ink, fontWeight: 800 }}>{completedJobs}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: `1px solid ${divider}` }}>
                <span style={{ fontSize: "13px", color: inkSec, fontWeight: 500 }}>PM Visits</span>
                <span style={{ fontSize: "14px", color: ink, fontWeight: 800 }}>{completedPMs}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: `1px solid ${divider}` }}>
                <span style={{ fontSize: "13px", color: inkSec, fontWeight: 500 }}>Warranty Inspections</span>
                <span style={{ fontSize: "14px", color: ink, fontWeight: 800 }}>{warrantyInspections}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: inkSec, fontWeight: 500 }}>AMC Visits</span>
                <span style={{ fontSize: "14px", color: ink, fontWeight: 800 }}>{amcVisits}</span>
              </div>
            </div>
          </div>

          {/* 8. Settings & Links */}
          <div style={{ backgroundColor: card, borderRadius: "16px", boxShadow: cardShadow, border: `1px solid ${border}`, overflow: "hidden" }}>
            <SettingsRow icon={Key} label="Change Password" onClick={() => navigate("/tech/profile/password")} />
            <SettingsRow icon={Bell} label="Notification Preferences" onClick={() => setActiveDrawer("notifications")} />
            <SettingsRow icon={Globe} label={`Language (${language})`} onClick={() => setActiveDrawer("language")} />
            <SettingsRow icon={HelpCircle} label="Help & Support" onClick={() => navigate("/tech/profile/help")} />
            <SettingsRow icon={Info} label="About 10xDS App" onClick={() => setActiveDrawer("about")} />
          </div>

          {/* 9. Logout */}
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={() => navigate("/login")}
              style={{ width: "100%", backgroundColor: card, border: `1px solid ${red}40`, borderRadius: "16px", padding: "16px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: "pointer", boxShadow: cardShadow }}
            >
              <LogOut size={18} color={red} />
              <span style={{ fontSize: "15px", fontWeight: 700, color: red, fontFamily: inter }}>Logout</span>
            </button>
          </div>
          
        </div>
      </div>
    </MobileLayout>
  );
}
