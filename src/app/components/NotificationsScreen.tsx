import React, { useState, useEffect } from "react";
import { subscribeToEvent } from "../utils/eventBus";
import { useNavigate } from "react-router";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import {
  ArrowLeft, Bell, ChevronRight, Activity, AlertTriangle, CheckCircle2,
  TrendingUp, Sparkles, Settings2, FileText, Bot, Search
} from "lucide-react";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueDark = "#1D4ED8";
const blueMid  = "#3B82F6";
const blueTint = "#EFF6FF";
const blueRing = "rgba(37,99,235,0.12)";

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
              placeholder="Search notifications..." 
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
              Notifications
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>
              Stay updated on your enterprise activities
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

// ─── Section heading ──────────────────────────────────────────────────────────
function Sect({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
      <span style={{ fontSize: "15.5px", fontWeight: 800, color: ink, letterSpacing: "-0.02em", fontFamily: inter }}>{title}</span>
      {action && (
        <button type="button" onClick={onAction} style={{
          background: "none", border: "none", fontSize: "12px", color: blue,
          fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
          gap: "2px", fontFamily: inter,
        }}>
          {action} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Notification Item ────────────────────────────────────────────────────────
interface NotificationProps {
  title: string; desc: string; time: string;
  category: string; priority: "High" | "Medium" | "Low";
  read: boolean; icon: React.ElementType; color: string; tint: string;
}

function NotificationCard({ notif, onClick }: { notif: NotificationProps, onClick: () => void }) {
  const pp: Record<"High" | "Medium" | "Low", { color: string; tint: string }> = {
    High:   { color: red,    tint: redT    },
    Medium: { color: amber,  tint: amberT  },
    Low:    { color: blue,   tint: blueTint },
  };
  const { color: pc, tint: pt } = pp[notif.priority];
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        backgroundColor: !notif.read ? blueTint : card,
        borderRadius: "16px", boxShadow: pressed ? "none" : cardShadow,
        border: `1px solid ${!notif.read ? blueRing : border}`,
        marginBottom: "10px", padding: "14px 16px",
        display: "flex", alignItems: "flex-start", gap: "12px",
        position: "relative", cursor: "pointer",
        transform: pressed ? "scale(0.98)" : "scale(1)",
        transition: "all 0.15s ease",
      }}
    >
      {!notif.read && (
        <div style={{
          position: "absolute", top: "16px", right: "16px",
          width: "8px", height: "8px", borderRadius: "50%",
          backgroundColor: blue, border: "1.5px solid white",
        }} />
      )}
      
      <div style={{
        width: "42px", height: "42px", borderRadius: "12px",
        backgroundColor: notif.tint, border: `1px solid ${notif.color}22`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <notif.icon size={18} color={notif.color} />
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingRight: !notif.read ? "16px" : "0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: inkSec, backgroundColor: divider, borderRadius: "4px", padding: "2px 6px", fontFamily: inter }}>
            {notif.category}
          </span>
          <span style={{
            fontSize: "9px", fontWeight: 700, color: pc, backgroundColor: pt,
            borderRadius: "100px", padding: "2px 6px", flexShrink: 0,
            border: `1px solid ${pc}20`, fontFamily: inter, letterSpacing: "0.03em",
          }}>
            {notif.priority.toUpperCase()}
          </span>
        </div>
        <p style={{ fontSize: "13.5px", fontWeight: 700, color: ink, fontFamily: inter, lineHeight: 1.3, marginBottom: "3px" }}>
          {notif.title}
        </p>
        <p style={{ fontSize: "11.5px", color: inkMut, fontFamily: inter, lineHeight: 1.45, marginBottom: "8px" }}>
          {notif.desc}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "10.5px", fontWeight: 600, color: inkFaint, fontFamily: inter }}>{notif.time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const KPIS = [
  { label: "Total Alerts", value: "24", icon: Bell, color: blue, tint: blueTint },
  { label: "Unread", value: "8", icon: Activity, color: green, tint: greenT },
  { label: "High Priority", value: "5", icon: AlertTriangle, color: red, tint: redT },
];

const CATEGORIES = [
  "All", "Service Requests", "Asset Updates", "Machine Health", "SLA", "Revenue", "Announcements"
];

const NOTIFICATIONS: NotificationProps[] = [
  {
    title: "Critical Failure Detected",
    desc: "Generator G-04 has reported a critical engine failure. Immediate attention required.",
    time: "2m ago", category: "Machine Health", priority: "High", read: false,
    icon: AlertTriangle, color: red, tint: redT
  },
  {
    title: "SLA Breach Warning",
    desc: "Ticket #T-9042 is 30 minutes away from breaching the resolution SLA.",
    time: "15m ago", category: "SLA", priority: "High", read: false,
    icon: Activity, color: orange, tint: orangeT
  },
  {
    title: "New Service Request",
    desc: "A new service request for HVAC Maintenance has been assigned to your team.",
    time: "1h ago", category: "Service Requests", priority: "Medium", read: true,
    icon: FileText, color: blue, tint: blueTint
  },
  {
    title: "Asset Status Updated",
    desc: "CCTV Network Campus status was updated to Maintenance.",
    time: "3h ago", category: "Asset Updates", priority: "Low", read: true,
    icon: CheckCircle2, color: green, tint: greenT
  },
  {
    title: "Revenue Opportunity",
    desc: "AMC contract for Production Wing A expires in 12 days.",
    time: "5h ago", category: "Revenue", priority: "Medium", read: true,
    icon: TrendingUp, color: purple, tint: purpleT
  }
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState("All");
  const [notifs, setNotifs] = useState(NOTIFICATIONS);
  const [selectedNotif, setSelectedNotif] = useState<NotificationProps | null>(null);

  const [successMsg, setSuccessMsg] = useState("");
  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3500); };

  useEffect(() => {
    return subscribeToEvent((event) => {
      if (event.type === 'AMC_QUOTATION_SUBMITTED') {
        setNotifs(prev => [{
          title: "Quotation Received",
          desc: `Vendor has submitted a quotation of AED ${event.payload.amount} for asset ${event.payload.assetId}.`,
          time: "Just now", category: "Revenue", priority: "High", read: false,
          icon: FileText, color: purple, tint: purpleT
        }, ...prev]);
      }
    });
  }, []);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({ priority: "All", readStatus: "All" });
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);

  const handleActionNavigation = (notif: NotificationProps) => {
    if (notif.title === "Quotation Received") {
       flash("Quotation approved. Vendor notified.");
       setSelectedNotif(null);
       markAsRead(notif);
       return;
    }

    switch (notif.category) {
      case "Machine Health":
        navigate("/machine-health");
        break;
      case "Asset Updates":
        navigate("/assets/details/AST-10024");
        break;
      case "Revenue":
        navigate("/revenue-intelligence");
        break;
      case "SLA": {
        const match = notif.desc.match(/(?:Ticket\s*#?|SR-)([A-Z0-9-]+)/i);
        if (match && match[1]) {
          navigate(`/sla-tracker?highlight=${match[1]}`);
        } else {
          navigate("/sla-tracker");
        }
        break;
      }
      case "Service Requests": {
        const match = notif.desc.match(/(?:Ticket\s*#?|SR-)([A-Z0-9-]+)/i);
        if (match && match[1]) {
          navigate(`/ticket-details/${match[1]}`);
        } else {
          navigate("/ticket-details/SR-10452");
        }
        break;
      }
      default:
        break;
    }
  };

  const markAsRead = (notif: NotificationProps) => {
    setNotifs(prev => prev.map(n => n === notif ? { ...n, read: true } : n));
    setSelectedNotif(null);
  };

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const archiveNotif = (notif: NotificationProps) => {
    setNotifs(prev => prev.filter(n => n !== notif));
    setSelectedNotif(null);
  };

  const getPrimaryActionLabel = (notif: NotificationProps) => {
    if (notif.title === "Quotation Received") return "Approve Quotation";
    const cat = notif.category;
    if (cat === "Machine Health") return "Open Related Machine";
    if (cat === "Asset Updates") return "Open Related Asset";
    if (cat === "Revenue") return "View Revenue Opportunity";
    return "Open Related Ticket";
  };

  const filteredNotifs = notifs.filter(n => {
    const matchesCat = activeCat === "All" || n.category === activeCat;
    const matchesSearch = !searchQuery.trim() || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filters.priority === "All" || n.priority === filters.priority;
    const matchesRead = filters.readStatus === "All" || (filters.readStatus === "Read" ? n.read : !n.read);
    return matchesCat && matchesSearch && matchesPriority && matchesRead;
  });

  const highPriorityNotifs = notifs.filter(n => n.priority === "High");

  // Dynamically calculate KPIs
  const unreadCount = notifs.filter(n => !n.read).length;
  const highPriorityCount = highPriorityNotifs.length;
  const kpis = [
    { label: "Total Alerts", value: notifs.length.toString(), icon: Bell, color: blue, tint: blueTint },
    { label: "Unread", value: unreadCount.toString(), icon: Activity, color: green, tint: greenT },
    { label: "High Priority", value: highPriorityCount.toString(), icon: AlertTriangle, color: red, tint: redT },
  ];

  return (
    <MobileLayout
      header={
        <>
          <StatusBar />
          <PageHeader 
            isSearchOpen={isSearchOpen} setIsSearchOpen={setIsSearchOpen}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            onFilter={() => setFilterModalOpen(true)}
          />
        </>
      }
      scrollContainerStyle={{ paddingBottom: "100px" }}
      modals={
        <>
          {/* ── Notification Details Modal ── */}
          {selectedNotif && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setSelectedNotif(null)}>
              <div style={{ width: "100%", maxHeight: "80%", display: "flex", flexDirection: "column", backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", boxShadow: "0 -8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "24px 20px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: selectedNotif.tint, border: `1px solid ${selectedNotif.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <selectedNotif.icon size={24} color={selectedNotif.color} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 800, color: ink, fontFamily: inter, marginBottom: "4px" }}>{selectedNotif.category}</h3>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: selectedNotif.color, backgroundColor: selectedNotif.tint, borderRadius: "100px", padding: "3px 8px", fontFamily: inter }}>{selectedNotif.priority} Priority</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedNotif(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><ArrowLeft style={{transform:"rotate(-90deg)"}} size={20} color={inkSec}/></button>
                  </div>
                  
                  <div style={{ backgroundColor: bg, borderRadius: "12px", padding: "16px", marginBottom: "20px", border: `1px solid ${border}` }}>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "8px" }}>{selectedNotif.title}</p>
                    <p style={{ fontSize: "13.5px", color: inkSec, fontFamily: inter, lineHeight: 1.5, marginBottom: "12px" }}>{selectedNotif.desc}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: `1px solid ${border}` }}>
                      <span style={{ fontSize: "11.5px", color: inkFaint, fontWeight: 500, fontFamily: inter }}>Received {selectedNotif.time}</span>
                      <span style={{ fontSize: "11.5px", color: selectedNotif.read ? green : blue, fontWeight: 600, fontFamily: inter }}>{selectedNotif.read ? "Read" : "Unread"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "10px" }}>
                    <button type="button" onClick={() => handleActionNavigation(selectedNotif)} style={{ height: "46px", borderRadius: "12px", background: `linear-gradient(135deg, ${blue}, ${blueDark})`, border: "none", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: `0 4px 12px ${blue}30` }}>
                      {getPrimaryActionLabel(selectedNotif)}
                    </button>
                    <div style={{ display: "flex", gap: "10px" }}>
                      {!selectedNotif.read && (
                        <button type="button" onClick={() => markAsRead(selectedNotif)} style={{ flex: 1, height: "44px", borderRadius: "12px", background: card, border: `1.5px solid ${border}`, color: ink, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Mark as Read</button>
                      )}
                      <button type="button" onClick={() => archiveNotif(selectedNotif)} style={{ flex: 1, height: "44px", borderRadius: "12px", background: redT, border: `1.5px solid ${red}20`, color: red, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Archive</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Filter Modal ── */}
          {filterModalOpen && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setFilterModalOpen(false)}>
              <div style={{ width: "100%", backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 30px", boxShadow: "0 -8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter }}>Filter Notifications</h3>
                  <button type="button" onClick={() => { setFilters({ priority: "All", readStatus: "All" }); setFilterModalOpen(false); }} style={{ background: "none", border: "none", color: blue, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Reset</button>
                </div>
                
                <div style={{ marginBottom: "20px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: inkSec, fontFamily: inter, marginBottom: "10px" }}>Priority</p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {["All", "High", "Medium", "Low"].map(p => (
                      <button key={p} type="button" onClick={() => setFilters(prev => ({ ...prev, priority: p }))} style={{ height: "36px", borderRadius: "8px", padding: "0 14px", backgroundColor: filters.priority === p ? blueTint : card, border: `1px solid ${filters.priority === p ? blue : border}`, color: filters.priority === p ? blue : ink, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>{p}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: inkSec, fontFamily: inter, marginBottom: "10px" }}>Status</p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {["All", "Unread", "Read"].map(s => (
                      <button key={s} type="button" onClick={() => setFilters(prev => ({ ...prev, readStatus: s }))} style={{ height: "36px", borderRadius: "8px", padding: "0 14px", backgroundColor: filters.readStatus === s ? blueTint : card, border: `1px solid ${filters.readStatus === s ? blue : border}`, color: filters.readStatus === s ? blue : ink, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>{s}</button>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={() => setFilterModalOpen(false)} style={{ width: "100%", height: "46px", borderRadius: "12px", background: blue, border: "none", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Apply Filters</button>
              </div>
            </div>
          )}

          {/* ── Priority Alerts Modal ── */}
          {priorityModalOpen && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setPriorityModalOpen(false)}>
              <div style={{ width: "100%", maxHeight: "85%", display: "flex", flexDirection: "column", backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", boxShadow: "0 -8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "20px 20px 10px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: redT, border: `1px solid ${red}20`, display: "flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={16} color={red}/></div>
                    <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter }}>Priority Alerts</h3>
                  </div>
                  <button type="button" onClick={() => setPriorityModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><ArrowLeft style={{transform:"rotate(-90deg)"}} size={20} color={inkSec}/></button>
                </div>
                <div style={{ padding: "16px 20px 24px", overflowY: "auto", flex: 1 }}>
                  {highPriorityNotifs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 0" }}>
                      <p style={{ fontSize: "14px", color: inkMut, fontFamily: inter }}>No high priority alerts.</p>
                    </div>
                  ) : (
                    highPriorityNotifs.map((n, i) => (
                      <NotificationCard key={i} notif={n} onClick={() => { setPriorityModalOpen(false); setSelectedNotif(n); }} />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
      {/* ── Scrollable body ── */}
        
        {/* Success Msg */}
        {successMsg && (
          <div style={{ padding: "16px 20px 0" }}>
            <div style={{ backgroundColor: greenT, border: `1px solid ${green}40`, borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color={green} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: green, fontFamily: inter }}>{successMsg}</span>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div style={{ padding: "18px 20px 6px", display: "flex", gap: "10px" }}>
          {kpis.map((kpi, i) => (
            <KPICard key={i} {...kpi} />
          ))}
        </div>

        {/* AI Priority Section */}
        <div style={{ padding: "12px 20px 6px" }}>
          <div style={{
            background: `linear-gradient(135deg, ${inkB}, #0F172A)`,
            borderRadius: "16px", padding: "16px 18px",
            boxShadow: `0 8px 24px rgba(15,23,42,0.25), inset 0 1px 1px rgba(255,255,255,0.1)`,
            border: `1px solid rgba(255,255,255,0.08)`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, right: 0, width: "120px", height: "120px",
              background: `radial-gradient(circle at top right, rgba(124,58,237,0.2), transparent 70%)`,
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", position: "relative" }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "10px",
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bot size={18} color="white" />
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "white", fontFamily: inter }}>AI Assistant</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: inter }}>Priority Triage</p>
              </div>
              <div style={{ marginLeft: "auto", background: "rgba(124,58,237,0.2)", borderRadius: "100px", padding: "4px 8px", border: "1px solid rgba(124,58,237,0.3)" }}>
                <Sparkles size={12} color="#C4B5FD" />
              </div>
            </div>
            <p style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.9)", lineHeight: 1.5, fontFamily: inter, position: "relative" }}>
              AI has identified <strong style={{ color: "white", fontWeight: 700 }}>{highPriorityCount} notifications</strong> requiring immediate attention.
            </p>
            <div style={{ marginTop: "14px", position: "relative" }}>
              <button type="button" onClick={() => setPriorityModalOpen(true)} style={{
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px", padding: "8px 14px", color: "white",
                fontSize: "12px", fontWeight: 600, fontFamily: inter, cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px"
              }}>
                Review Priority Alerts <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div style={{ padding: "14px 0 10px", overflowX: "auto", scrollbarWidth: "none" }}>
          <div style={{ display: "flex", gap: "8px", padding: "0 20px" }}>
            {CATEGORIES.map(cat => {
              const active = activeCat === cat;
              return (
                <button key={cat} onClick={() => setActiveCat(cat)} type="button" style={{
                  height: "34px", borderRadius: "100px", padding: "0 16px",
                  backgroundColor: active ? blue : card,
                  border: `1px solid ${active ? blue : border}`,
                  color: active ? "white" : inkSec,
                  fontSize: "12.5px", fontWeight: 600, fontFamily: inter,
                  cursor: "pointer", whiteSpace: "nowrap",
                  boxShadow: active ? `0 2px 10px ${blueRing}` : "none",
                  transition: "all 0.15s ease",
                  display: "flex", alignItems: "center", gap: "6px"
                }}>
                  {cat === "All" && active && <Sparkles size={12} color="white" />}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications Feed */}
        <div style={{ padding: "10px 20px 24px" }}>
          <Sect title="Recent Notifications" action="Mark all read" onAction={markAllRead} />
          <div>
            {filteredNotifs.map((n, i) => (
              <NotificationCard key={i} notif={n} onClick={() => setSelectedNotif(n)} />
            ))}
            {filteredNotifs.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 20px" }}>
                <p style={{ fontSize: "14px", color: inkMut, fontFamily: inter }}>No notifications found.</p>
              </div>
            )}
          </div>
        </div>

    </MobileLayout>
  );
}
