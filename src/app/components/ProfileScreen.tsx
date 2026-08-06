import React, { useState } from "react";
import { useNavigate } from "react-router";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import {
  ArrowLeft, Search, Settings2, Building2, User, Key, Bell, Shield,
  Mail, Phone, MapPin, CheckCircle2, Database, TrendingUp, Sparkles,
  ArrowUpRight, Edit3
} from "lucide-react";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueDark = "#1D4ED8";
const blueMid  = "#3B82F6";
const blueTint = "#EFF6FF";

const green    = "#16A34A";
const greenT   = "#DCFCE7";
const orange   = "#EA580C";
const orangeT  = "#FFF7ED";
const purple   = "#7C3AED";
const purpleT  = "#F5F3FF";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const teal     = "#0891B2";
const tealT    = "#ECFEFF";

const ink      = "#0F172A";
const inkB     = "#1E293B";
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
function PageHeader({ 
  isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery, onFilter
}: { 
  isSearchOpen: boolean; setIsSearchOpen: (val: boolean) => void;
  searchQuery: string; setSearchQuery: (val: string) => void;
  onFilter: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div style={{ background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0, minHeight: "106px" }}>
      {isSearchOpen ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <div style={{ flex: 1, height: "40px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", padding: "0 10px" }}>
            <Search size={16} color="white" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search profile..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "white", fontSize: "14px", fontFamily: inter, paddingLeft: "8px" }}
            />
          </div>
          <button type="button" onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} style={{ background: "none", border: "none", color: "white", fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
        </div>
      ) : (
        <>
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
              <button type="button" onClick={() => setIsSearchOpen(true)} style={{
                width: "32px", height: "32px", borderRadius: "10px",
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}>
                <Search size={15} color="white" />
              </button>
              <button type="button" onClick={onFilter} style={{
                width: "32px", height: "32px", borderRadius: "10px",
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}>
                <Settings2 size={15} color="white" />
              </button>
            </div>
          </div>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, marginBottom: "4px" }}>
              Profile
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>
              Manage your account and preferences
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
interface KPIProps {
  label: string; value: string; icon: React.ElementType;
  color: string; tint: string; trend?: string; up?: boolean;
}
function KPICard({ label, value, icon: Icon, color, tint, trend, up }: KPIProps) {
  return (
    <div style={{
      flex: 1,
      background: `radial-gradient(circle at 10% 15%, ${tint} 0%, ${card} 65%)`,
      borderRadius: "20px", padding: "15px 14px 13px",
      boxShadow: cardShadow, border: `1px solid ${border}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "-18px", right: "-18px",
        width: "64px", height: "64px", borderRadius: "50%",
        backgroundColor: tint, opacity: 0.7,
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "11px",
          backgroundColor: tint, border: `1px solid ${color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={17} color={color} />
        </div>
        {trend && (
          <div style={{
            display: "flex", alignItems: "center", gap: "3px",
            backgroundColor: up ? greenT : redT,
            borderRadius: "100px", padding: "2px 6px",
          }}>
            <TrendingUp size={9} color={up ? green : red} />
            <span style={{ fontSize: "9.5px", fontWeight: 700, color: up ? green : red, fontFamily: inter }}>{trend}</span>
          </div>
        )}
      </div>
      <p style={{ fontSize: "23px", fontWeight: 800, color: ink, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, marginBottom: "4px" }}>
        {value}
      </p>
      <p style={{ fontSize: "10.5px", fontWeight: 500, color: inkMut, fontFamily: inter, lineHeight: 1.3 }}>{label}</p>
    </div>
  );
}

// ─── Quick Action card ────────────────────────────────────────────────────────
interface QAProps {
  icon: React.ElementType; label: string; desc: string;
  color: string; tint: string; onClick?: () => void;
}
function QACard({ icon: Icon, label, desc, color, tint, onClick }: QAProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        flex: 1, minHeight: "152px", backgroundColor: card, borderRadius: "20px",
        padding: "15px 14px 14px",
        boxShadow: pressed ? "none" : cardShadow,
        border: `1.5px solid ${pressed ? color + "38" : border}`,
        cursor: "pointer", textAlign: "left",
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "all 0.15s ease", fontFamily: inter,
        display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0, width: "70px", height: "70px",
        background: `radial-gradient(circle at top right, ${color}12, transparent 70%)`, pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "11px" }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "13px", backgroundColor: tint,
          border: `1.5px solid ${color}22`, display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: `0 3px 10px ${color}25`,
        }}>
          <Icon size={21} color={color} />
        </div>
        <div style={{
          width: "25px", height: "25px", borderRadius: "8px", backgroundColor: `${color}12`,
          border: `1px solid ${color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <ArrowUpRight size={13} color={color} />
        </div>
      </div>
      <p style={{ fontSize: "12.5px", fontWeight: 700, color: ink, lineHeight: 1.3, marginBottom: "4px", fontFamily: inter }}>
        {label}
      </p>
      <p style={{ fontSize: "10.5px", color: inkMut, lineHeight: 1.45, fontFamily: inter, flex: 1 }}>
        {desc}
      </p>
    </button>
  );
}

// ─── Activity item ────────────────────────────────────────────────────────────
interface ActProps { icon: React.ElementType; color: string; tint: string; title: string; desc: string; time: string; last?: boolean; }
function ActivityItem({ icon: Icon, color, tint, title, desc, time, last }: ActProps) {
  return (
    <div style={{ display: "flex", gap: "12px", paddingBottom: last ? 0 : "14px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: "36px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "11px",
          backgroundColor: tint, border: `1px solid ${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={16} color={color} />
        </div>
        {!last && (
          <div style={{ width: "1.5px", flex: 1, backgroundColor: border, marginTop: "6px" }} />
        )}
      </div>
      <div style={{ flex: 1, paddingTop: "4px" }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, lineHeight: 1.3, marginBottom: "2px" }}>
          {title}
        </p>
        <p style={{ fontSize: "11.5px", color: inkSec, fontFamily: inter }}>{desc}</p>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
          <span style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter }}>{time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function Sect({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
      <span style={{ fontSize: "15.5px", fontWeight: 800, color: ink, letterSpacing: "-0.02em", fontFamily: inter }}>{title}</span>
    </div>
  );
}
// ─── Data ─────────────────────────────────────────────────────────────────────
const KPIS = [
  { label: "Tickets Closed", value: "1,248", icon: CheckCircle2, color: blue, tint: blueTint },
  { label: "Assets Managed", value: "342", icon: Database, color: teal, tint: tealT },
  { label: "SLA Compliance", value: "98.4%", icon: Shield, color: green, tint: greenT, trend: "+1.2%", up: true },
  { label: "AI Efficiency", value: "94", icon: Sparkles, color: purple, tint: purpleT, trend: "+3", up: true },
];

const ACTIVITIES = [
  { icon: CheckCircle2, color: green, tint: greenT, title: "Closed Ticket #T-8092", desc: "HVAC Maintenance at Medical Wing, Tower A", time: "2h ago" },
  { icon: Key, color: amber, tint: amberT, title: "Password Updated", desc: "Security settings changed", time: "2 days ago" },
  { icon: Database, color: blue, tint: blueTint, title: "Asset Reassigned", desc: "Generator G-04 moved to Building B", time: "4 days ago" }
];

const QUICK_ACTIONS = [
  { label: "Edit Profile", desc: "Update your personal details", icon: User, color: blue, tint: blueTint },
  { label: "Change Password", desc: "Manage your security credentials", icon: Key, color: amber, tint: amberT },
  { label: "Notifications", desc: "Configure your alert preferences", icon: Bell, color: purple, tint: purpleT },
  { label: "Security", desc: "Review login activity and sessions", icon: Shield, color: green, tint: greenT },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState("");
  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3500); };

  // Search & Filter state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ info: true, performance: true, settings: true, activity: true });

  // Profile state
  const [profileData, setProfileData] = useState({ name: "Alex Carter", title: "Senior Operations Manager", email: "alex.carter@acmecorp.com" });
  const [editForm, setEditForm] = useState(profileData);

  // Password state
  const [pwd, setPwd] = useState({ current: "", new: "", confirm: "" });
  const pwdValid = pwd.new.length >= 8 && /[A-Z]/.test(pwd.new) && /[a-z]/.test(pwd.new) && /[0-9]/.test(pwd.new) && /[^A-Za-z0-9]/.test(pwd.new) && pwd.new === pwd.confirm;
  
  const getPwdStrength = () => {
    if (!pwd.new) return 0;
    let s = 0;
    if (pwd.new.length >= 8) s++;
    if (/[A-Z]/.test(pwd.new)) s++;
    if (/[0-9]/.test(pwd.new)) s++;
    if (/[^A-Za-z0-9]/.test(pwd.new)) s++;
    return s;
  };
  const pwdStrength = getPwdStrength();

  // Notification Prefs state
  const [notifPrefs, setNotifPrefs] = useState({ push: true, email: false, sms: false, weekly: true });
  const [editNotifPrefs, setEditNotifPrefs] = useState(notifPrefs);

  // Security state
  const [sessions, setSessions] = useState([
    { id: 1, name: "Current Session", details: "Dubai, UAE (IP: 192.168.1.1)", meta: "Active now · Mac OS X" },
    { id: 2, name: "Previous Session", details: "Abu Dhabi, UAE (IP: 10.0.0.5)", meta: "Yesterday · iPhone 14" }
  ]);

  // Sign out logic
  const handleSignOut = () => {
    setActiveModal(null);
    navigate("/", { replace: true });
  };

  // Filtering sections
  const sq = searchQuery.toLowerCase();
  const showSection = (section: keyof typeof filters, keywords: string[]) => {
    if (!filters[section]) return false;
    if (!sq) return true;
    return keywords.some(k => k.toLowerCase().includes(sq));
  };

  const showInfo = showSection("info", ["email", "phone", "department", "region", "alex", "carter"]);
  const showPerf = showSection("performance", ["performance", "tickets", "assets", "sla", "ai"]);
  const showSettings = showSection("settings", ["account settings", "edit profile", "change password", "notifications", "security"]);
  const showActivity = showSection("activity", ["recent activity", "closed ticket", "password", "asset"]);

  return (
    <MobileLayout
      header={
        <>
          <StatusBar />
          <PageHeader 
            isSearchOpen={isSearchOpen} setIsSearchOpen={setIsSearchOpen}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            onFilter={() => setIsFilterOpen(true)}
          />
        </>
      }
      scrollContainerStyle={{ paddingBottom: "100px" }}
      modals={
        <>
          {/* ── Filter Modal ── */}
          {isFilterOpen && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setIsFilterOpen(false)}>
              <div style={{ width: "100%", backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 30px", boxShadow: "0 -8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter }}>Filter Sections</h3>
                  <button type="button" onClick={() => { setFilters({ info: true, performance: true, settings: true, activity: true }); setIsFilterOpen(false); }} style={{ background: "none", border: "none", color: blue, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Reset</button>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                  {Object.keys(filters).map((k) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: ink, fontFamily: inter, textTransform: "capitalize" }}>{k === "info" ? "Personal Information" : k}</span>
                      <button type="button" onClick={() => setFilters(prev => ({ ...prev, [k]: !prev[k as keyof typeof filters] }))} style={{ width: "42px", height: "24px", borderRadius: "100px", backgroundColor: filters[k as keyof typeof filters] ? blue : border, position: "relative", border: "none", cursor: "pointer" }}>
                        <div style={{ position: "absolute", top: "2px", left: filters[k as keyof typeof filters] ? "20px" : "2px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", transition: "left 0.2s" }} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setIsFilterOpen(false)} style={{ width: "100%", height: "46px", borderRadius: "12px", background: blue, border: "none", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Apply Filters</button>
              </div>
            </div>
          )}

          {/* ── Main Modals ── */}
          {activeModal && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setActiveModal(null)}>
              <div style={{ width: "100%", maxHeight: "90%", display: "flex", flexDirection: "column", backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 30px", boxShadow: "0 -8px 32px rgba(0,0,0,0.12)", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, marginBottom: "16px", flexShrink: 0 }}>{activeModal}</h3>
                
                {activeModal === "Sign Out" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>
                    <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter }}>Are you sure you want to sign out of your account?</p>
                    <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                      <button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1, height: "44px", borderRadius: "12px", background: card, border: `1.5px solid ${border}`, color: ink, fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
                      <button type="button" onClick={handleSignOut} style={{ flex: 1, height: "44px", borderRadius: "12px", background: red, border: "none", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Sign Out</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      }
    >
      {/* ── Scrollable body ── */}
        
        {/* Success Message Toast */}
        {successMsg && (
          <div style={{ padding: "16px 20px 0" }}>
            <div style={{ backgroundColor: greenT, border: `1px solid ${green}40`, borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color={green} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: green, fontFamily: inter }}>{successMsg}</span>
            </div>
          </div>
        )}

        {/* User Profile Card */}
        <div style={{ padding: "18px 20px 6px" }}>
          <div style={{
            backgroundColor: card, borderRadius: "20px",
            border: `1px solid ${border}`, boxShadow: cardShadow,
            padding: "20px", display: "flex", alignItems: "center", gap: "16px",
            position: "relative", overflow: "hidden"
          }}>
            <div style={{
              position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px",
              background: `radial-gradient(circle at top right, ${blue}12, transparent 70%)`, pointerEvents: "none"
            }} />
            
            <div style={{ position: "relative" }}>
              <div style={{
                width: "70px", height: "70px", borderRadius: "20px",
                background: `linear-gradient(140deg, #334155, #1E293B)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}>
                <span style={{ fontSize: "24px", fontWeight: 700, color: "white", fontFamily: inter }}>{profileData.name.split(" ").map(n => n[0]).join("")}</span>
              </div>
              <button type="button" onClick={() => navigate("/settings")} style={{
                position: "absolute", bottom: "-6px", right: "-6px",
                width: "28px", height: "28px", borderRadius: "50%",
                backgroundColor: blue, border: "2px solid white",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                boxShadow: "0 2px 6px rgba(37,99,235,0.3)"
              }}>
                <Edit3 size={13} color="white" />
              </button>
            </div>
            
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "19px", fontWeight: 800, color: ink, letterSpacing: "-0.02em", fontFamily: inter, marginBottom: "2px" }}>
                {profileData.name}
              </p>
              <p style={{ fontSize: "13px", fontWeight: 600, color: inkMut, fontFamily: inter, marginBottom: "6px" }}>
                {profileData.title}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: inkFaint, backgroundColor: divider, borderRadius: "4px", padding: "2px 6px", fontFamily: inter }}>
                  ID: EMP-9042
                </span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: blue, backgroundColor: blueTint, border: `1px solid ${blue}20`, borderRadius: "4px", padding: "2px 6px", fontFamily: inter }}>
                  Acme Corp
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Information */}
        {showInfo && (
          <div style={{ padding: "12px 20px 6px" }}>
            <div style={{
              backgroundColor: card, borderRadius: "16px",
              border: `1px solid ${border}`, boxShadow: cardShadow,
            }}>
              {[
                { icon: Mail, label: "Email", value: profileData.email },
                { icon: Phone, label: "Phone", value: "+971 50 123 4567" },
                { icon: Building2, label: "Department", value: "Enterprise Service Management" },
                { icon: MapPin, label: "Region", value: "Dubai, UAE" }
              ].map((info, idx, arr) => (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "14px 16px",
                  borderBottom: idx !== arr.length - 1 ? `1px solid ${divider}` : "none"
                }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "8px", backgroundColor: divider,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    <info.icon size={15} color={inkMut} />
                  </div>
                  <div>
                    <p style={{ fontSize: "11px", color: inkMut, fontFamily: inter, marginBottom: "2px" }}>{info.label}</p>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{info.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Summary */}
        {showPerf && (
          <div style={{ padding: "14px 20px 6px" }}>
            <Sect title="Performance Summary" />
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <KPICard {...KPIS[0]} />
              <KPICard {...KPIS[1]} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <KPICard {...KPIS[2]} />
              <KPICard {...KPIS[3]} />
            </div>
          </div>
        )}
        
        {/* Quick Actions */}
        {showSettings && (
          <div style={{ padding: "14px 20px 6px" }}>
            <Sect title="Account Settings" />
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <QACard {...QUICK_ACTIONS[0]} onClick={() => navigate("/settings")} />
              <QACard {...QUICK_ACTIONS[1]} onClick={() => navigate("/settings/change-password")} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <QACard {...QUICK_ACTIONS[2]} onClick={() => navigate("/settings")} />
              <QACard {...QUICK_ACTIONS[3]} onClick={() => navigate("/security")} />
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {showActivity && (
          <div style={{ padding: "14px 20px 24px" }}>
            <Sect title="Recent Activity" />
            <div style={{
              backgroundColor: card, borderRadius: "18px",
              border: `1px solid ${border}`, boxShadow: cardShadow,
              padding: "16px 16px 10px",
            }}>
              {ACTIVITIES.map((a, i) => (
                <ActivityItem key={i} {...a} last={i === ACTIVITIES.length - 1} />
              ))}
            </div>
          </div>
        )}

        {/* Sign Out */}
        <div style={{ padding: "0 20px 24px" }}>
          <button type="button" onClick={() => setActiveModal("Sign Out")} style={{
            width: "100%", height: "46px", borderRadius: "14px",
            backgroundColor: card, border: `1.5px solid ${red}20`,
            color: red, fontSize: "14px", fontWeight: 700, fontFamily: inter,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
          }}>
            Sign Out
          </button>
        </div>
    </MobileLayout>
  );
}
