import { BottomNavigation } from "./ui/BottomNavigation";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Bell, Search, Mic, ChevronRight, Building2,
  Wrench, Monitor, Users, Cpu, BarChart3, Shield,
  Home, FileText, Database, User, Sparkles,
  AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Zap, Activity, Settings2, ArrowUpRight,
  MoreHorizontal, Bot, CalendarClock, TrendingDown,
  MapPin, CircleDot, ChevronDown, Star,
  Wind, Droplets, MoveVertical, X,
} from "lucide-react";
import { MobileLayout } from "./ui/MobileLayout";
import { useRevenueContext, Opportunity } from "../contexts/RevenueContext";
import { useVendor } from "../contexts/VendorContext";
import { adaptVendorTicketToSLAItem, SLAItem, useSLACountdown } from "../utils/slaAdapter";
import { useSharedSLA, SharedSLAKPIs } from "../hooks/useSharedSLA";
import { publishEvent } from "../utils/eventBus";
import { ComplianceCard, SLACard } from "./SLATrackerScreen";
import { OpportunityCard } from "./RevenueIntelligenceScreen";

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
const cardShadowMd = "0 2px 8px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)";
const blueShadow = `0 4px 20px rgba(37,99,235,0.22), 0 1px 4px rgba(0,0,0,0.08)`;

// ─── Status bar (brand-consistent with auth screens) ───────────────────────────
function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1.5 flex-shrink-0"
      style={{ backgroundColor: "#0052CC" }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div className="flex items-center gap-2">
        <div className="flex items-end gap-0.5">
          {[3, 5, 7, 9].map((h, i) => (
            <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white", opacity: i < 4 ? 1 : 0.4 }} />
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <div style={{ width: "22px", height: "11px", borderRadius: "2px", border: "1.5px solid white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, right: "3px", backgroundColor: "white", borderRadius: "1px" }} />
          </div>
          <div style={{ width: "2px", height: "5px", borderRadius: "1px", backgroundColor: "white" }} />
        </div>
      </div>
    </div>
  );
}

// ─── App header ───────────────────────────────────────────────────────────────
function AppHeader() {
  const navigate = useNavigate();
  return (
    <div style={{ backgroundColor: card, borderBottom: `1px solid ${border}`, padding: "14px 20px 16px", flexShrink: 0 }}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-3.5">
        {/* Org identity */}
        <div className="flex items-center gap-2.5">
          <div style={{
            width: "38px", height: "38px", borderRadius: "11px",
            background: `linear-gradient(140deg, ${blue} 0%, ${blueDark} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: blueShadow, flexShrink: 0,
          }}>
            <Building2 size={19} color="white" />
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: ink, lineHeight: 1.2, fontFamily: inter }}>Acme Corporation</p>
            <p style={{ fontSize: "10.5px", color: inkMut, fontWeight: 500, fontFamily: inter, marginTop: "1px" }}>Enterprise Service Management</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Bell */}
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => navigate('/notifications')} style={{
              width: "38px", height: "38px", borderRadius: "11px",
              backgroundColor: bg, border: `1.5px solid ${border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <Bell size={18} color={inkSec} />
            </button>
            <div style={{
              position: "absolute", top: "7px", right: "7px",
              width: "8px", height: "8px", borderRadius: "50%",
              backgroundColor: red, border: "1.5px solid white",
            }} />
          </div>
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div onClick={() => navigate('/profile')} style={{
              width: "38px", height: "38px", borderRadius: "11px",
              background: `linear-gradient(140deg, #334155, #1E293B)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px solid ${border}`, cursor: "pointer",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "white", fontFamily: inter }}>AC</span>
            </div>
            <div style={{
              position: "absolute", bottom: "1px", right: "1px",
              width: "9px", height: "9px", borderRadius: "50%",
              backgroundColor: green, border: "1.5px solid white",
            }} />
          </div>
        </div>
      </div>

      {/* Greeting */}
      <div>
        <p style={{ fontSize: "20px", fontWeight: 800, color: ink, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: inter }}>
          Good Morning 👋
        </p>
        <p style={{ fontSize: "12.5px", color: inkMut, fontWeight: 400, marginTop: "3px", fontFamily: inter }}>
          Thursday, 25 June 2026 &nbsp;·&nbsp; Dubai, UAE
        </p>
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
export function Sect({ title, action, onActionClick }: { title: string; action?: string; onActionClick?: () => void }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
      <span style={{ fontSize: "15.5px", fontWeight: 800, color: ink, letterSpacing: "-0.02em", fontFamily: inter }}>{title}</span>
      {action && (
        <button type="button" onClick={onActionClick} style={{
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

// ─── KPI card ─────────────────────────────────────────────────────────────────
interface KPIProps {
  label: string; value: string; icon: React.ElementType;
  color: string; tint: string; trend: string; up: boolean;
}
function KPICard({ label, value, icon: Icon, color, tint, trend, up }: KPIProps) {
  return (
    <div style={{
      flex: 1,
      background: `radial-gradient(circle at 10% 15%, ${tint} 0%, ${card} 65%)`,
      borderRadius: "20px", padding: "15px 14px 13px",
      boxShadow: cardShadow,
      border: `1px solid ${border}`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative circle */}
      <div style={{
        position: "absolute", top: "-18px", right: "-18px",
        width: "64px", height: "64px", borderRadius: "50%",
        backgroundColor: tint, opacity: 0.7,
      }} />
      <div className="flex items-start justify-between mb-2.5">
        <div style={{
          width: "36px", height: "36px", borderRadius: "11px",
          backgroundColor: tint, border: `1px solid ${color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={17} color={color} />
        </div>
        <div className="flex items-center gap-0.5" style={{
          backgroundColor: up ? greenT : redT,
          borderRadius: "100px", padding: "2px 6px",
        }}>
          {up ? <TrendingUp size={9} color={green} /> : <TrendingDown size={9} color={red} />}
          <span style={{ fontSize: "9.5px", fontWeight: 700, color: up ? green : red, fontFamily: inter }}>{trend}</span>
        </div>
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
  color: string; tint: string;
  badge?: { text: string; color: string; tint: string };
  route?: string;
}
function QACard({ icon: Icon, label, desc, color, tint, badge, route }: QAProps) {
  const [pressed, setPressed] = useState(false);
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); if (route) navigate(route); }}
      onPointerLeave={() => setPressed(false)}
      style={{
        flex: 1,
        minHeight: "152px",
        backgroundColor: card,
        borderRadius: "20px",
        padding: "15px 14px 14px",
        boxShadow: pressed
          ? "none"
          : "0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
        border: `1.5px solid ${pressed ? color + "38" : border}`,
        cursor: "pointer",
        textAlign: "left" as const,
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "all 0.15s ease",
        fontFamily: inter,
        display: "flex",
        flexDirection: "column" as const,
        position: "relative" as const,
        overflow: "hidden",
      }}
    >
      {/* Decorative radial tint wash — top-right corner */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "70px", height: "70px",
        background: `radial-gradient(circle at top right, ${color}12, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Top row: icon container + arrow pill */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", marginBottom: "11px",
      }}>
        {/* Icon */}
        <div style={{
          width: "44px", height: "44px", borderRadius: "13px",
          backgroundColor: tint,
          border: `1.5px solid ${color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 3px 10px ${color}25`,
        }}>
          <Icon size={21} color={color} />
        </div>

        {/* Arrow — accent-tinted pill */}
        <div style={{
          width: "25px", height: "25px", borderRadius: "8px",
          backgroundColor: `${color}12`,
          border: `1px solid ${color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <ArrowUpRight size={13} color={color} />
        </div>
      </div>

      {/* Label */}
      <p style={{
        fontSize: "12.5px", fontWeight: 700, color: ink,
        lineHeight: 1.3, marginBottom: "4px", fontFamily: inter,
      }}>
        {label}
      </p>

      {/* Description */}
      <p style={{
        fontSize: "10.5px", color: inkMut, lineHeight: 1.45,
        fontFamily: inter, flex: 1,
        marginBottom: badge ? "10px" : "0",
      }}>
        {desc}
      </p>

      {/* Optional status badge (e.g., Machine Health) */}
      {badge && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          backgroundColor: badge.tint,
          borderRadius: "100px", padding: "3px 9px",
          border: `1px solid ${badge.color}25`,
          alignSelf: "flex-start",
        }}>
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%",
            backgroundColor: badge.color, flexShrink: 0,
            boxShadow: `0 0 0 2px ${badge.color}30`,
          }} />
          <span style={{
            fontSize: "9.5px", fontWeight: 700,
            color: badge.color, fontFamily: inter,
          }}>
            {badge.text}
          </span>
        </div>
      )}
    </button>
  );
}

// ─── Priority & Status badges ─────────────────────────────────────────────────
function PBadge({ level }: { level: "Critical" | "High" | "Medium" | "Low" }) {
  const m = { Critical: [redT, red], High: [orangeT, orange], Medium: [amberT, amber], Low: [greenT, green] } as Record<string, string[]>;
  const [bg2, fg] = m[level];
  return <span style={{ background: bg2, color: fg, fontSize: "9px", fontWeight: 700, borderRadius: "100px", padding: "2px 7px", letterSpacing: "0.03em", fontFamily: inter }}>{level}</span>;
}

function SBadge({ status }: { status: "In Progress" | "Assigned" | "Pending" | "Resolved" | "Open" }) {
  const m = {
    "In Progress": [blueTint, blue],
    "Assigned": ["#DBEAFE", "#1D4ED8"],
    "Pending": [orangeT, orange],
    "Resolved": [greenT, green],
    "Open": [divider, inkSec],
  } as Record<string, string[]>;
  const [bg2, fg] = m[status];
  return <span style={{ background: bg2, color: fg, fontSize: "9px", fontWeight: 600, borderRadius: "100px", padding: "2px 7px", fontFamily: inter }}>{status}</span>;
}

// ─── Service Request card ─────────────────────────────────────────────────────
interface SRProps {
  id: string; title: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "In Progress" | "Assigned" | "Pending" | "Resolved" | "Open";
  assignee: string; time: string; category: string;
  onClick?: () => void;
}
function SRCard({ id, title, priority, status, assignee, time, category, onClick }: SRProps) {
  const barClr = { Critical: red, High: orange, Medium: amber, Low: green }[priority];
  return (
    <div style={{
      backgroundColor: card, borderRadius: "16px",
      boxShadow: cardShadow, border: `1px solid ${border}`,
      marginBottom: "10px", overflow: "hidden",
      display: "flex",
      cursor: onClick ? "pointer" : "default",
    }} onClick={onClick}>
      <div style={{ width: "4px", backgroundColor: barClr, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "12px 13px 11px" }}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ fontSize: "9.5px", fontWeight: 700, color: inkFaint, letterSpacing: "0.05em", fontFamily: inter }}>{id}</span>
              <span style={{
                fontSize: "9px", color: inkFaint, backgroundColor: bg,
                borderRadius: "5px", padding: "1px 5px", fontFamily: inter, border: `1px solid ${border}`,
              }}>{category}</span>
            </div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: ink, lineHeight: 1.3, fontFamily: inter }}>{title}</p>
          </div>
          <MoreHorizontal size={15} color={inkFaint} style={{ flexShrink: 0, marginTop: "2px" }} />
        </div>
        {/* Badges */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          <PBadge level={priority} />
          <SBadge status={status} />
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div style={{
              width: "20px", height: "20px", borderRadius: "6px",
              background: `linear-gradient(140deg, ${blue}, ${blueMid})`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <User size={10} color="white" />
            </div>
            <span style={{ fontSize: "11px", color: inkSec, fontWeight: 500, fontFamily: inter }}>{assignee}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={10} color={inkFaint} />
            <span style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter }}>{time}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Alert card ───────────────────────────────────────────────────────────────
interface AProps { title: string; desc: string; level: "Critical" | "Medium" | "Resolved"; icon: React.ElementType; time: string; }
function AlertCard({ title, desc, level, icon: Icon, time }: AProps) {
  const m = {
    Critical: { dot: red, bg: redT, border: "#FECACA", color: red, label: "Critical" },
    Medium: { dot: amber, bg: amberT, border: "#FDE68A", color: amber, label: "Medium" },
    Resolved: { dot: green, bg: greenT, border: "#BBF7D0", color: green, label: "Resolved" },
  };
  const s = m[level];
  return (
    <div style={{
      background: s.bg, borderRadius: "16px",
      border: `1px solid ${s.border}`,
      padding: "12px 14px", marginBottom: "10px",
      display: "flex", alignItems: "flex-start", gap: "11px",
    }}>
      <div style={{
        width: "34px", height: "34px", borderRadius: "10px",
        backgroundColor: card,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <Icon size={16} color={s.dot} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p style={{ fontSize: "13px", fontWeight: 700, color: ink, lineHeight: 1.3, flex: 1, fontFamily: inter }}>{title}</p>
          <span style={{
            fontSize: "9px", fontWeight: 700, color: s.color,
            backgroundColor: card, borderRadius: "100px", padding: "2px 7px",
            flexShrink: 0, boxShadow: "0 1px 2px rgba(0,0,0,0.06)", fontFamily: inter,
          }}>{s.label}</span>
        </div>
        <p style={{ fontSize: "11.5px", color: inkSec, lineHeight: 1.45, marginBottom: "5px", fontFamily: inter }}>{desc}</p>
        <span style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter }}>{time}</span>
      </div>
    </div>
  );
}

// ─── Revenue Intelligence card (Home Dashboard) ───────────────────────────────
function RevenueCard({ rec, onAction }: { rec: Opportunity; onAction?: (action: string) => void }) {
  const pp: Record<string, { color: string; tint: string }> = {
    High:   { color: red,    tint: redT    },
    Medium: { color: amber,  tint: amberT  },
    Low:    { color: green,  tint: greenT  },
  };
  const { color: pc, tint: pt } = pp[rec.priority] ?? { color: inkMut, tint: divider };

  return (
    <div style={{
      backgroundColor: card, borderRadius: "16px",
      boxShadow: cardShadow, border: `1px solid ${border}`,
      marginBottom: "10px", overflow: "hidden", display: "flex",
    }}>
      <div style={{ width: "4px", backgroundColor: rec.color, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "13px 13px 12px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "7px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "9px",
            backgroundColor: rec.tint, border: `1px solid ${rec.color}22`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <rec.icon size={15} color={rec.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "12.5px", fontWeight: 700, color: ink, fontFamily: inter, lineHeight: 1.25 }}>
              {rec.title}
            </p>
            <p style={{ fontSize: "11px", color: inkMut, fontFamily: inter, marginTop: "2px" }}>
              {rec.assetName} · <span style={{ color: inkFaint }}>{rec.location}</span>
            </p>
          </div>
          <span style={{
            fontSize: "9px", fontWeight: 700, color: pc, backgroundColor: pt,
            borderRadius: "100px", padding: "3px 8px", flexShrink: 0,
            border: `1px solid ${pc}20`, fontFamily: inter,
          }}>{rec.priority}</span>
        </div>

        <p style={{ fontSize: "11.5px", color: inkSec, fontFamily: inter, lineHeight: 1.5, marginBottom: "10px" }}>
          {rec.desc}
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "9.5px", color: inkFaint, fontFamily: inter, fontWeight: 500, marginBottom: "1px" }}>Est. Savings</p>
            <p style={{ fontSize: "15px", fontWeight: 800, color: green, fontFamily: inter, letterSpacing: "-0.025em" }}>
              {rec.estimatedSavings}
            </p>
          </div>
          <button type="button" onClick={() => onAction && onAction(rec.primaryAction)} style={{
            height: "32px", borderRadius: "9px", padding: "0 13px",
            background: `linear-gradient(135deg, ${blue}, ${blueDark})`,
            border: "none", color: "white",
            fontSize: "11px", fontWeight: 600, fontFamily: inter,
            cursor: "pointer", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(37,99,235,0.28)",
          }}>
            {rec.primaryAction}
          </button>
        </div>
      </div>
    </div>
  );
}

// REVENUE_RECS is now sourced from RevenueContext in the component (live state)

// ─── Analytics Overview ──────────────────────────────────────────────────────

// 1 — Service Request Trend (sparkline)
function ServiceRequestTrendCard() {
  const raw   = [45, 52, 48, 61, 57, 68, 74];
  const days  = ["M", "T", "W", "T", "F", "S", "S"];
  const W = 130, H = 44;
  const lo = Math.min(...raw), hi = Math.max(...raw);
  const pts = raw.map((v, i) => {
    const x = (i / (raw.length - 1)) * W;
    const y = H - ((v - lo) / (hi - lo)) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const areaPts = `0,${H} ${pts} ${W},${H}`;
  const lastX = W;
  const lastY = H - ((raw[raw.length - 1] - lo) / (hi - lo)) * (H - 4) - 2;

  return (
    <div style={{ flex: 1, backgroundColor: card, borderRadius: "18px", boxShadow: cardShadow, border: `1px solid ${border}`, padding: "14px 13px 12px", overflow: "hidden" }}>
      <p style={{ fontSize: "11.5px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "2px" }}>
        Service Requests
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "10px" }}>
        <TrendingUp size={11} color={green} />
        <span style={{ fontSize: "9.5px", fontWeight: 700, color: green, fontFamily: inter }}>+12% this week</span>
      </div>

      {/* Sparkline */}
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="srt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={blue} stopOpacity="0.18" />
            <stop offset="100%" stopColor={blue} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPts} fill="url(#srt-fill)" />
        <polyline points={pts} fill="none" stroke={blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="3.5" fill={blue} />
        <circle cx={lastX} cy={lastY} r="6" fill={blue} fillOpacity="0.15" />
      </svg>

      {/* Day axis */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", marginBottom: "8px" }}>
        {days.map((d, i) => (
          <span key={i} style={{ fontSize: "9px", color: i === 6 ? blue : inkFaint, fontWeight: i === 6 ? 700 : 400, fontFamily: inter }}>{d}</span>
        ))}
      </div>

      {/* Big value */}
      <p style={{ fontSize: "22px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.04em", lineHeight: 1 }}>
        74 <span style={{ fontSize: "10.5px", fontWeight: 500, color: inkMut }}>today</span>
      </p>
    </div>
  );
}

// 2 — Asset Performance (donut)
function AssetPerformanceCard() {
  const cx = 43, cy = 43, r = 32, sw = 11;
  const C = 2 * Math.PI * r;
  const segs = [
    { pct: 0.86, color: green,  label: "Healthy"  },
    { pct: 0.10, color: orange, label: "Warning"  },
    { pct: 0.04, color: red,    label: "Critical" },
  ];
  let cum = 0;
  const arcs = segs.map(s => {
    const startDeg = -90 + cum * 360;
    cum += s.pct;
    return { ...s, startDeg, len: Math.max(0, s.pct * C - 3) };
  });

  return (
    <div style={{ flex: 1, backgroundColor: card, borderRadius: "18px", boxShadow: cardShadow, border: `1px solid ${border}`, padding: "14px 13px 12px" }}>
      <p style={{ fontSize: "11.5px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "10px" }}>
        Asset Performance
      </p>

      {/* Donut */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
        <div style={{ position: "relative", width: "86px", height: "86px" }}>
          <svg width="86" height="86" viewBox="0 0 86 86" style={{ display: "block" }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={divider} strokeWidth={sw} />
            {arcs.map(a => (
              <circle key={a.label} cx={cx} cy={cy} r={r} fill="none"
                stroke={a.color} strokeWidth={sw} strokeLinecap="butt"
                strokeDasharray={`${a.len} ${C}`}
                transform={`rotate(${a.startDeg} ${cx} ${cy})`}
              />
            ))}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "16px", fontWeight: 800, color: green, fontFamily: inter, letterSpacing: "-0.04em", lineHeight: 1 }}>86%</span>
            <span style={{ fontSize: "8px", color: inkFaint, fontFamily: inter, marginTop: "1px" }}>Healthy</span>
          </div>
        </div>
      </div>

      {/* Legend rows */}
      {segs.map(s => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: s.color, flexShrink: 0 }} />
          <span style={{ fontSize: "10px", color: inkSec, fontFamily: inter, flex: 1 }}>{s.label}</span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: s.color, fontFamily: inter }}>{Math.round(s.pct * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

// 3 — Technician Productivity (horizontal bars)
function TechnicianProductivityCard() {
  const bars = [
    { label: "Completed",   value: 84,  max: 110, display: "84 jobs", color: green  },
    { label: "Pending",     value: 23,  max: 110, display: "23 jobs", color: orange },
    { label: "Avg Response",value: 28,  max: 100, display: "1.4 hrs", color: blue   },
  ];

  return (
    <div style={{ flex: 1, backgroundColor: card, borderRadius: "18px", boxShadow: cardShadow, border: `1px solid ${border}`, padding: "14px 13px 12px" }}>
      <p style={{ fontSize: "11.5px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "12px" }}>
        Technician Output
      </p>

      {bars.map((b, i) => (
        <div key={b.label} style={{ marginBottom: i < bars.length - 1 ? "10px" : "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "10px", color: inkMut, fontFamily: inter }}>{b.label}</span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: b.color, fontFamily: inter }}>{b.display}</span>
          </div>
          <div style={{ height: "5px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(b.value / b.max) * 100}%`,
              background: b.color, borderRadius: "100px",
            }} />
          </div>
        </div>
      ))}

      {/* Active count chip */}
      <div style={{ backgroundColor: blueTint, borderRadius: "10px", padding: "8px 10px", border: `1px solid ${blue}20` }}>
        <p style={{ fontSize: "9.5px", color: inkMut, fontFamily: inter, marginBottom: "1px" }}>Active Technicians</p>
        <p style={{ fontSize: "19px", fontWeight: 800, color: blue, fontFamily: inter, letterSpacing: "-0.04em", lineHeight: 1 }}>
          86 <span style={{ fontSize: "10px", fontWeight: 500, color: inkMut }}>of 94</span>
        </p>
      </div>
    </div>
  );
}

// 4 — Customer Satisfaction (CSAT)
function CustomerSatisfactionCard() {
  const score = 4.8;
  const full  = Math.floor(score);

  return (
    <div style={{ flex: 1, backgroundColor: card, borderRadius: "18px", boxShadow: cardShadow, border: `1px solid ${border}`, padding: "14px 13px 12px" }}>
      <p style={{ fontSize: "11.5px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "8px" }}>
        Customer CSAT
      </p>

      {/* Star row */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "7px" }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} size={13} color="#FFC400" fill={i <= full ? "#FFC400" : divider} />
        ))}
      </div>

      {/* Big score */}
      <p style={{ fontSize: "28px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: "3px" }}>
        {score}<span style={{ fontSize: "13px", fontWeight: 500, color: inkMut }}>/5</span>
      </p>

      <p style={{ fontSize: "10px", color: inkMut, fontFamily: inter, marginBottom: "10px" }}>
        312 reviews this month
      </p>

      {/* Monthly trend chip */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: greenT, borderRadius: "9px", padding: "6px 8px", border: `1px solid ${green}25` }}>
        <TrendingUp size={11} color={green} />
        <span style={{ fontSize: "9.5px", fontWeight: 700, color: green, fontFamily: inter }}>+0.2 vs last month</span>
      </div>
    </div>
  );
}

// Overall compliance card with SVG ring
function SLAComplianceCard({ kpis }: { kpis: SharedSLAKPIs }) {
  const pct = kpis.compliance;
  const r = 38;
  const C = 2 * Math.PI * r;
  const dash = (pct / 100) * C;

  return (
    <div style={{
      backgroundColor: card, borderRadius: "18px",
      boxShadow: cardShadow, border: `1px solid ${border}`,
      padding: "16px", marginBottom: "12px",
      display: "flex", alignItems: "center", gap: "16px",
    }}>
      {/* Ring gauge */}
      <div style={{ position: "relative", width: "92px", height: "92px", flexShrink: 0 }}>
        <svg width="92" height="92" viewBox="0 0 92 92" style={{ display: "block" }}>
          <circle cx="46" cy="46" r={r} fill="none" stroke={divider} strokeWidth="7" />
          <circle
            cx="46" cy="46" r={r}
            fill="none" stroke={green} strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
            transform="rotate(-90 46 46)"
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "16px", fontWeight: 800, color: green, fontFamily: inter, letterSpacing: "-0.04em", lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontSize: "8.5px", fontWeight: 600, color: inkFaint, fontFamily: inter, marginTop: "2px" }}>SLA</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "10px" }}>
          Overall SLA Compliance
        </p>
        {[
          { dot: green,  label: "Within SLA",       value: kpis.onTrack.toString(), unit: "Requests" },
          { dot: orange, label: "Nearing Breach",    value: kpis.nearBreach.toString(),   unit: "Requests" },
          { dot: red,    label: "Already Breached",  value: kpis.breached.toString(),   unit: "Requests" },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: i < 2 ? "7px" : 0 }}>
            <div style={{
              width: "9px", height: "9px", borderRadius: "50%",
              backgroundColor: s.dot, flexShrink: 0,
              boxShadow: `0 0 0 2.5px ${s.dot}28`,
            }} />
            <span style={{ fontSize: "11.5px", color: inkSec, fontFamily: inter, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: "11.5px", fontWeight: 800, color: s.dot, fontFamily: inter }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Individual SLA alert card
function SLAAlertCard({ item, onAction }: { item: SLAItem; onAction?: (action: string) => void }) {
  const { remaining, urgency } = useSLACountdown(item.slaDeadline, item.vendorSlaStatus, item.rawStatus);
  const action = urgency === "breached" ? "Escalate" : "Escalate Now";
  const barColor = urgency === "breached" || urgency === "critical" ? red : orange;

  const priorityP: Record<string, { color: string; tint: string }> = {
    Critical: { color: red,    tint: redT    },
    High:     { color: orange, tint: orangeT },
    Medium:   { color: amber,  tint: amberT  },
    Low:      { color: green,  tint: greenT  },
  };
  const statusP: Record<string, { color: string; tint: string }> = {
    "Near Breach":                  { color: orange, tint: orangeT },
    "Immediate Attention Required": { color: red,    tint: redT    },
    "On Track":                     { color: green,  tint: greenT  },
    "Needs Supervisor Review":      { color: amber,  tint: amberT  },
    "Breached":                     { color: red,    tint: redT    },
    "Escalated":                    { color: purple, tint: purpleT },
  };
  const pp = priorityP[item.priority] || priorityP.Medium;
  const sp = statusP[item.status] || statusP["On Track"];

  return (
    <div style={{
      backgroundColor: card, borderRadius: "16px",
      boxShadow: cardShadow, border: `1px solid ${border}`,
      marginBottom: "10px", overflow: "hidden", display: "flex",
    }}>
      {/* Left colour bar */}
      <div style={{ width: "4px", backgroundColor: barColor, flexShrink: 0 }} />

      <div style={{ flex: 1, padding: "12px 13px 11px" }}>
        {/* Row 1: SR ID + priority badge + status badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10.5px", fontWeight: 700, color: inkFaint, fontFamily: inter }}>
            {item.id}
          </span>
          <span style={{
            fontSize: "9px", fontWeight: 700, color: pp.color, backgroundColor: pp.tint,
            borderRadius: "100px", padding: "2px 7px", fontFamily: inter,
            border: `1px solid ${pp.color}22`,
          }}>{item.priority}</span>
          <div style={{ flex: 1 }} />
          <span style={{
            fontSize: "9px", fontWeight: 700, color: sp.color, backgroundColor: sp.tint,
            borderRadius: "100px", padding: "2px 7px", fontFamily: inter,
            border: `1px solid ${sp.color}22`,
          }}>{item.status}</span>
        </div>

        {/* Issue title */}
        <p style={{ fontSize: "13.5px", fontWeight: 700, color: ink, fontFamily: inter, lineHeight: 1.3, marginBottom: "3px" }}>
          {item.issue}
        </p>

        {/* Customer */}
      <p style={{ fontSize: "11px", color: inkMut, fontFamily: inter, marginBottom: "8px" }}>
          {item.customer}
        </p>

        {/* Time + assignee row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Clock size={12} color={barColor} />
            <span style={{ fontSize: "12.5px", fontWeight: 800, color: barColor, fontFamily: inter, letterSpacing: "-0.01em" }}>
              {remaining} remaining
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{
              width: "18px", height: "18px", borderRadius: "6px",
              background: `linear-gradient(135deg, ${blue}, ${blueDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <User size={10} color="white" />
            </div>
            <span style={{ fontSize: "11px", color: inkSec, fontFamily: inter }}>{item.assignee}</span>
          </div>
        </div>

        {/* Action button */}
        <button type="button" onClick={() => onAction && onAction(action)} style={{
          width: "100%", height: "33px", borderRadius: "9px",
          backgroundColor: sp.tint, border: `1.5px solid ${sp.color}30`,
          color: sp.color, fontSize: "12px", fontWeight: 700,
          fontFamily: inter, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
          transition: "all 0.15s",
        }}>
          {action}
        </button>
      </div>
    </div>
  );
}



// Compact KPI row
function SLAKPIRow() {
  const metrics = [
    { label: "Avg Response Time",    value: "1.4 hrs", color: blue   },
    { label: "Avg Resolution Time",  value: "5.8 hrs", color: purple  },
    { label: "First Time Fix Rate",  value: "94%",     color: green  },
    { label: "Customer Satisfaction",value: "4.8 / 5", color: amber  },
  ];

  return (
    <div style={{
      backgroundColor: card, borderRadius: "18px",
      boxShadow: cardShadow, border: `1px solid ${border}`,
      padding: "14px 16px",
    }}>
      <p style={{ fontSize: "12.5px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "12px" }}>
        Today's SLA Performance
      </p>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
        {metrics.map((m) => (
          <div key={m.label} style={{
            flex: "1 1 calc(50% - 4px)",
            backgroundColor: bg, borderRadius: "12px",
            padding: "11px 12px",
            border: `1px solid ${border}`,
          }}>
            <p style={{ fontSize: "20px", fontWeight: 800, color: m.color, fontFamily: inter, letterSpacing: "-0.035em", lineHeight: 1, marginBottom: "5px" }}>
              {m.value}
            </p>
            <p style={{ fontSize: "10.5px", color: inkMut, fontFamily: inter, lineHeight: 1.3 }}>
              {m.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}



// ─── Machine Health card ──────────────────────────────────────────────────────
type HealthStatus = "Healthy" | "Warning" | "Critical";
interface MHProps {
  name: string; pct: number; status: HealthStatus;
  updated: string; icon: React.ElementType;
  onClick?: () => void;
}

function MachineHealthCard({ name, pct, status, updated, icon: Icon, onClick }: MHProps) {
  const palette: Record<HealthStatus, { fg: string; tint: string; bdr: string; barA: string; barB: string }> = {
    Healthy:  { fg: green,  tint: greenT,  bdr: "#BBF7D0", barA: "#16A34A", barB: "#4ADE80" },
    Warning:  { fg: orange, tint: orangeT, bdr: "#FED7AA", barA: "#EA580C", barB: "#FB923C" },
    Critical: { fg: red,    tint: redT,    bdr: "#FECACA", barA: "#DC2626", barB: "#F87171" },
  };
  const { fg, tint, bdr, barA, barB } = palette[status];

  // SVG ring: radius 13, circumference ≈ 81.68
  const circ = 2 * Math.PI * 13;
  const dash = (pct / 100) * circ;

  return (
    <div style={{
      flex: 1,
      backgroundColor: card,
      borderRadius: "18px",
      border: `1px solid ${bdr}`,
      boxShadow: cardShadow,
      padding: "13px 13px 12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      position: "relative",
      overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
    }} onClick={onClick}>
      {/* Tint wash — top-right radial */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "64px", height: "64px",
        background: `radial-gradient(circle at top right, ${tint}, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Row 1: equipment icon ← → circular gauge */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: "30px", height: "30px", borderRadius: "9px",
          backgroundColor: tint,
          border: `1px solid ${fg}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={15} color={fg} />
        </div>

        {/* SVG ring gauge */}
        <div style={{ position: "relative", width: "38px", height: "38px", flexShrink: 0 }}>
          <svg width="38" height="38" viewBox="0 0 38 38" style={{ display: "block" }}>
            <circle cx="19" cy="19" r="13" fill="none" stroke={border} strokeWidth="3" />
            <circle
              cx="19" cy="19" r="13"
              fill="none"
              stroke={fg}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              transform="rotate(-90 19 19)"
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "8.5px", fontWeight: 800, color: fg, fontFamily: inter, letterSpacing: "-0.03em" }}>
              {pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Machine name */}
      <p style={{ fontSize: "12px", fontWeight: 700, color: ink, lineHeight: 1.3, fontFamily: inter, margin: 0 }}>
        {name}
      </p>

      {/* Health bar */}
      <div style={{ height: "4px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${barA}, ${barB})`,
          borderRadius: "100px",
        }} />
      </div>

      {/* Status badge + updated time */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: "9px", fontWeight: 700,
          color: fg, backgroundColor: tint,
          borderRadius: "100px", padding: "2px 7px",
          fontFamily: inter, letterSpacing: "0.02em",
        }}>{status}</span>
        <span style={{ fontSize: "9.5px", color: inkFaint, fontFamily: inter }}>{updated}</span>
      </div>
    </div>
  );
}

// ─── AI insight row ───────────────────────────────────────────────────────────
function AIRow({ text, type, textColor = "rgba(255,255,255,0.9)" }: { text: string; type: "warn" | "info" | "ok", textColor?: string }) {
  const m = {
    warn: { ic: <AlertTriangle size={12} color={amber} />, bg: "rgba(217,119,6,0.18)" },
    info: { ic: <Zap size={12} color={blueMid} />, bg: "rgba(59,130,246,0.18)" },
    ok: { ic: <CheckCircle2 size={12} color="#4ADE80" />, bg: "rgba(74,222,128,0.18)" },
  };
  const { ic, bg: ibg } = m[type];
  return (
    <div className="flex items-start gap-3" style={{ marginBottom: "11px" }}>
      <div style={{ width: "26px", height: "26px", borderRadius: "8px", backgroundColor: ibg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {ic}
      </div>
      <p style={{ fontSize: "12.5px", color: textColor, lineHeight: 1.55, flex: 1, paddingTop: "3px", fontFamily: inter }}>{text}</p>
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────
interface TProps { title: string; assignee: string; deadline: string; progress: number; tag: string; }
function TaskCard({ title, assignee, deadline, progress, tag }: TProps) {
  const barColor = progress > 70 ? green : progress > 35 ? blue : orange;
  return (
    <div style={{
      backgroundColor: card, borderRadius: "16px",
      border: `1px solid ${border}`, padding: "13px 14px 12px",
      marginBottom: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p style={{ fontSize: "13px", fontWeight: 700, color: ink, lineHeight: 1.3, flex: 1, fontFamily: inter }}>{title}</p>
        <span style={{ fontSize: "9px", fontWeight: 600, color: blue, backgroundColor: blueTint, borderRadius: "100px", padding: "2px 7px", flexShrink: 0, fontFamily: inter }}>{tag}</span>
      </div>
      <div className="flex items-center gap-3 mb-2.5">
        <div className="flex items-center gap-1.5">
          <div style={{ width: "18px", height: "18px", borderRadius: "6px", background: `linear-gradient(140deg, ${purple}, #9F7AEA)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User size={9} color="white" />
          </div>
          <span style={{ fontSize: "11px", color: inkSec, fontFamily: inter }}>{assignee}</span>
        </div>
        <div className="flex items-center gap-1">
          <CalendarClock size={11} color={inkFaint} />
          <span style={{ fontSize: "11px", color: inkFaint, fontFamily: inter }}>{deadline}</span>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span style={{ fontSize: "10px", color: inkMut, fontWeight: 500, fontFamily: inter }}>Progress</span>
          <span style={{ fontSize: "10px", color: barColor, fontWeight: 700, fontFamily: inter }}>{progress}%</span>
        </div>
        <div style={{ height: "5px", backgroundColor: bg, borderRadius: "100px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, borderRadius: "100px", backgroundColor: barColor, transition: "width 0.5s ease" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Timeline label ───────────────────────────────────────────────────────────
function TimeLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: "10px", marginTop: "6px" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: blue, flexShrink: 0, boxShadow: `0 0 0 3px ${blueRing}` }} />
      <span style={{ fontSize: "11px", fontWeight: 700, color: blue, letterSpacing: "0.07em", textTransform: "uppercase" as const, fontFamily: inter }}>{label}</span>
      <div style={{ flex: 1, height: "1px", backgroundColor: border }} />
    </div>
  );
}

const KPIS = [
  { label: "Active Tickets", value: "324", icon: FileText, color: blue, tint: blueTint, trend: "+12", up: true },
  { label: "Critical Alerts", value: "12", icon: AlertTriangle, color: red, tint: redT, trend: "-2", up: true },
  { label: "Total Assets", value: "1,248", icon: Database, color: green, tint: greenT, trend: "+124", up: true },
  { label: "AI Suggestions", value: "8", icon: Sparkles, color: purple, tint: purpleT, trend: "+2", up: true },
];

const QAS = [
  { icon: FileText, label: "New Ticket", desc: "Report an issue", color: blue, tint: blueTint, route: '/raise-ticket' },
  { icon: Wrench, label: "Service Request", desc: "Request maintenance", color: green, tint: greenT, route: '/my-tickets' },
  { icon: Shield, label: "Security", desc: "Report security incident", color: red, tint: redT, route: '/security' },
  { icon: Database, label: "Asset Tag", desc: "Register new asset", color: amber, tint: amberT, route: '/assets' },
  { icon: Activity, label: "Health Check", desc: "Run diagnostics", color: purple, tint: purpleT, route: '/machine-health' },
  { icon: TrendingUp, label: "Performance", desc: "View analytics", color: teal, tint: tealT, route: '/analytics' }
];

const SRS: SRProps[] = [
  { id: "SR-1029", title: "HVAC Repair", priority: "High", status: "Open", assignee: "John D.", time: "10 mins ago", category: "Maintenance" },
  { id: "SR-1030", title: "Pump Failure", priority: "Critical", status: "In Progress", assignee: "Mike S.", time: "1 hour ago", category: "Urgent" }
];

const ALERTS = [
  { title: "Temperature High", desc: "Server room A exceeding normal limits", level: "Critical" as const, icon: AlertTriangle, time: "Just now" },
  { title: "Low Battery", desc: "Backup generator battery at 15%", level: "Medium" as const, icon: Activity, time: "2h ago" },
  { title: "Maintenance Due", desc: "Quarterly HVAC check required", level: "Resolved" as const, icon: Wrench, time: "1d ago" }
];

const MACHINES = [
  { name: "CNC Lathe A", pct: 92, status: "Healthy" as const, updated: "5m ago", icon: Database },
  { name: "Milling Machine", pct: 75, status: "Warning" as const, updated: "10m ago", icon: Wrench },
  { name: "3D Printer", pct: 98, status: "Healthy" as const, updated: "1m ago", icon: Activity },
  { name: "Assembly Robot", pct: 45, status: "Critical" as const, updated: "2m ago", icon: AlertTriangle }
];

export function HomeDashboard() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const confirmAction = () => {
    if (activeModal) {
      if (activeModal === "Renew AMC") {
        publishEvent({ type: 'AMC_RENEWAL_REQUESTED', payload: { assetId: 'AST-10024', assetName: 'Air Conditioning Unit A', requestedBy: 'Org' } });
      } else if (activeModal === "Extend Warranty") {
        publishEvent({ type: 'WARRANTY_EXTENSION_REQUESTED', payload: { assetId: 'AST-10024', assetName: 'Air Conditioning Unit A' } });
      } else if (activeModal === "Schedule Maintenance") {
        publishEvent({ type: 'PM_SCHEDULED', payload: { assetId: 'AST-10024', taskDetails: { type: 'Maintenance' } } });
      } else if (activeModal === "Escalate Now" || activeModal === "Dispatch Backup Technician") {
        publishEvent({ type: 'TICKET_CREATED', payload: { id: `TKT-${Date.now().toString().slice(-4)}`, title: 'Emergency Dispatch Requested', priority: 'High', status: 'Pending Review', assetId: 'AST-10024', category: 'Emergency', location: 'Main Facility' } });
      } else if (activeModal === "Create Purchase Request") {
        publishEvent({ type: 'TICKET_CREATED', payload: { id: `TKT-${Date.now().toString().slice(-4)}`, title: 'Consumable Replacement', priority: 'Medium', status: 'Pending Review', assetId: 'AST-10024', category: 'Procurement', location: 'Main Facility' } });
      }

      setToastMsg(`${activeModal} initiated successfully`);
      setActiveModal(null);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  // ── Live Revenue Intelligence data from shared context ──
  const { activeOpportunities, liveTotal, liveSavings, liveHighPriority } = useRevenueContext();
  const filteredRevenue = activeOpportunities;

  // ── Single source of truth: VendorContext ──
  const vendor = useVendor();
  const { kpis, topAlerts } = useSharedSLA();

  // Active tickets count from VendorContext
  const openTicketsCount = vendor.tickets.filter(t => t.status !== "Closed" && t.status !== "Rejected" && t.status !== "Completed").length;
  const dynamicKpis = [
    { label: "Active Tickets", value: openTicketsCount.toString(), icon: FileText, color: blue, tint: blueTint, trend: "+12", up: true },
    KPIS[1], KPIS[2], KPIS[3]
  ];

  // Recent requests from VendorContext tickets
  const dynamicSRS = useMemo(() =>
    vendor.tickets
      .filter(t => t.status !== "Rejected")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: (t.status === "Pending Review" ? "Open" : t.status === "Completed" ? "Resolved" : "In Progress") as "Resolved" | "Pending" | "Assigned" | "In Progress" | "Open",
        assignee: t.assignedTechnicianName ?? "Unassigned",
        time: new Date(t.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        category: t.category,
      })),
    [vendor.tickets]
  );

  const filteredSRS = dynamicSRS.length > 0 ? dynamicSRS : SRS;
  const filteredAlerts = ALERTS;
  const filteredMachines = MACHINES;



  return (
    <MobileLayout
      header={
        <>
          <StatusBar />
          <AppHeader />
        </>
      }
      modals={
        <>

          {["Renew AMC", "Extend Warranty", "Create Work Order", "Schedule Maintenance", "Create Purchase Request", "View Recommendations", "Escalate Now", "Dispatch Backup Technician", "Assign Supervisor", "View Details"].includes(activeModal || "") && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setActiveModal(null)}>
              <div style={{ width: "320px", backgroundColor: card, borderRadius: "24px", padding: "24px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: blueTint, border: `1px solid ${blue}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                  <Sparkles size={24} color={blue} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, marginBottom: "8px" }}>{activeModal}</h3>
                <p style={{ fontSize: "13px", color: inkMut, fontFamily: inter, marginBottom: "24px", lineHeight: 1.5 }}>Are you sure you want to proceed with this action? This will update the system records.</p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1, height: "42px", borderRadius: "10px", background: card, border: `1.5px solid ${border}`, color: ink, fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Cancel</button>
                  <button type="button" onClick={confirmAction} style={{ flex: 1, height: "42px", borderRadius: "10px", background: blue, border: "none", color: "white", fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Confirm</button>
                </div>
              </div>
            </div>
          )}

          {toastMsg && (
            <div style={{ position: "absolute", bottom: "80px", left: "20px", right: "20px", backgroundColor: inkB, borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000, animation: "fadeIn 0.3s ease" }}>
              <CheckCircle2 size={18} color={green} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "white", fontFamily: inter }}>{toastMsg}</span>
            </div>
          )}
        </>
      }
    >

        {/* ── Overview KPIs ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Overview" />
          {/* KPI grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            {dynamicKpis.map((k, i) => (
              <KPICard key={i} {...k} />
            ))}
          </div>
        </div>

        {/* ── Today's pulse banner ── */}
        <div style={{ padding: "14px 20px 6px" }}>
          <div style={{
            borderRadius: "18px", overflow: "hidden",
            background: `linear-gradient(130deg, ${blue} 0%, ${blueDark} 100%)`,
            padding: "16px 18px",
            boxShadow: blueShadow,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: inter, marginBottom: "4px" }}>Today's Pulse</p>
              <p style={{ fontSize: "16px", fontWeight: 800, color: "white", fontFamily: inter, letterSpacing: "-0.02em", lineHeight: 1.2 }}>14 requests need action</p>
              <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.68)", fontFamily: inter, marginTop: "3px" }}>3 escalations · 5 SLA at risk</p>
            </div>
            <div style={{
              width: "52px", height: "52px", borderRadius: "16px",
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Activity size={24} color="white" />
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Quick Actions" />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <QACard {...QAS[0]} />
              <QACard {...QAS[1]} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <QACard {...QAS[2]} />
              <QACard {...QAS[3]} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <QACard {...QAS[4]} />
              <QACard {...QAS[5]} />
            </div>
          </div>
        </div>

        {/* ── Recent Requests ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Recent Requests" action="See All" onActionClick={() => navigate('/my-tickets')} />
          {filteredSRS.map((r) => <SRCard key={r.id} {...r} onClick={() => navigate(`/ticket-details/${r.id}`)} />)}
        </div>

        {/* ── Active Alerts ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Active Alerts" action="Manage" onActionClick={() => navigate('/notifications')} />
          {filteredAlerts.map((a, i) => <AlertCard key={i} {...a} />)}
        </div>

        {/* ── Machine Health ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Machine Health" action="View All" onActionClick={() => navigate('/machine-health')} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
            {filteredMachines.map(m => (
              <div key={m.name} style={{ flex: "1 1 calc(50% - 5px)", minWidth: 0 }}>
                <MachineHealthCard {...m} onClick={() => navigate(`/machine-health/score?machine=${encodeURIComponent(m.name)}`)} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Revenue Intelligence ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Revenue Intelligence" action="View All" onActionClick={() => navigate('/revenue-intelligence')} />

          {/* AI intro card — orange accent */}
          <div style={{
            backgroundColor: card, borderRadius: "18px",
            border: `1px solid ${orange}28`,
            boxShadow: `0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(234,88,12,0.07)`,
            padding: "16px 16px 14px", marginBottom: "14px",
            position: "relative", overflow: "hidden",
          }}>
            {/* Orange accent bar */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "3px",
              background: `linear-gradient(90deg, ${orange}, ${amber})`,
            }} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "8px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
                background: `linear-gradient(135deg, ${orange}, ${amber})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 14px rgba(234,88,12,0.32)`,
              }}>
                <Sparkles size={19} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "2px" }}>
                  Revenue Intelligence
                </p>
                <p style={{ fontSize: "11.5px", fontWeight: 600, color: orange, fontFamily: inter, marginBottom: "7px" }}>
                  AI-powered Revenue Opportunities
                </p>
                <p style={{ fontSize: "12px", color: inkSec, fontFamily: inter, lineHeight: 1.6 }}>
                  The AI continuously analyzes contracts, assets, warranties and service history to identify new revenue opportunities.
                </p>
              </div>
            </div>
          </div>

          {/* AI Revenue Summary card */}
          <div style={{
            borderRadius: "18px",
            background: `linear-gradient(150deg, #1E3A8A 0%, ${blue} 100%)`,
            padding: "16px 16px 14px", marginTop: "4px", marginBottom: "20px",
            boxShadow: "0 6px 24px rgba(29,78,216,0.28), 0 1px 4px rgba(0,0,0,0.1)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: "-24px", right: "-24px", width: "90px", height: "90px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />
            <div style={{ position: "absolute", bottom: "-12px", left: "16px", width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.04)" }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "10px",
                backgroundColor: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={16} color="white" />
              </div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "white", fontFamily: inter }}>
                AI Revenue Summary
              </p>
            </div>

            <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.1)", marginBottom: "12px" }} />

            <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.84)", fontFamily: inter, lineHeight: 1.65, marginBottom: "14px" }}>
              AI has identified{" "}
              <span style={{ fontWeight: 700, color: "white" }}>{liveTotal} operational saving opportunities</span>
              {" "}worth approximately{" "}
              <span style={{ fontWeight: 800, color: "#86EFAC" }}>{liveSavings}</span>
              {" "}across your assets. Priority: <span style={{ fontWeight: 700, color: "white" }}>{liveHighPriority} high-priority</span> items need immediate action.
            </p>
          </div>

          {/* AI Opportunities Sub-heading */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, whiteSpace: "nowrap" }}>
              AI Opportunities
            </span>
            <div style={{ flex: 1, height: "1px", backgroundColor: border }} />
          </div>

          <div style={{
            borderRadius: "16px",
            background: card, border: `1px solid ${border}`,
            padding: "16px 16px 5px", marginBottom: "20px",
            boxShadow: cardShadow
          }}>
            <AIRow text="Predictive maintenance recommended for Generator 04 — last serviced 87 days ago" type="warn" textColor={inkSec} />
            <AIRow text="5 SLA violations may occur today based on current response velocity" type="info" textColor={inkSec} />
            <AIRow text="12 service requests can be auto-assigned using skill-based matching" type="ok" textColor={inkSec} />
          </div>

          {/* Revenue Cards Sub-heading */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, whiteSpace: "nowrap" }}>
              Suggested Actions
            </span>
            <div style={{ flex: 1, height: "1px", backgroundColor: border }} />
            <div style={{
              backgroundColor: orangeT, borderRadius: "100px",
              padding: "3px 10px", border: `1px solid ${orange}22`, flexShrink: 0,
            }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: orange, fontFamily: inter }}>
                {liveTotal} found
              </span>
            </div>
          </div>

          {filteredRevenue.slice(0, 3).map(r => <OpportunityCard key={r.id} opp={r} onView={() => navigate('/revenue-intelligence')} />)}

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={() => navigate('/ai-assistant')} style={{
              flex: 1, height: "42px", borderRadius: "11px",
              backgroundColor: card, border: `1.5px solid ${border}`,
              color: ink, fontSize: "12.5px", fontWeight: 700,
              fontFamily: inter, cursor: "pointer",
            }}>
              All AI Insights
            </button>
            <button type="button" onClick={() => navigate('/revenue-intelligence')} style={{
              flex: 1, height: "42px", borderRadius: "11px",
              backgroundColor: blueTint, border: `1.5px solid ${blue}20`,
              color: blue, fontSize: "12.5px", fontWeight: 700,
              fontFamily: inter, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}>
              All Revenue <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ── SLA Tracker ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="SLA Tracker" action="View All" onActionClick={() => navigate('/sla-tracker')} />

          {/* Overall compliance card */}
          <ComplianceCard compliance={kpis.compliance} withinSLA={kpis.onTrack} nearBreach={kpis.nearBreach} breached={kpis.breached} />

          {/* Critical SLA Alerts sub-heading */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, whiteSpace: "nowrap" }}>
              Critical SLA Alerts
            </span>
            <div style={{ flex: 1, height: "1px", backgroundColor: border }} />
            <div style={{
              backgroundColor: redT, borderRadius: "100px",
              padding: "3px 10px", border: `1px solid ${red}22`, flexShrink: 0,
            }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: red, fontFamily: inter }}>
                {topAlerts.length} alerts
              </span>
            </div>
          </div>

          {/* SLA alert cards */}
          {topAlerts.map((a) => <SLACard key={a.id} item={a} />)}

          {/* KPI performance row */}
          <SLAKPIRow />
        </div>


        {/* ── Analytics Overview ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Analytics Overview" action="View All" onActionClick={() => navigate('/analytics')} />
          {/* Row 1 */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <ServiceRequestTrendCard />
            <AssetPerformanceCard />
          </div>
          {/* Row 2 */}
          <div style={{ display: "flex", gap: "10px" }}>
            <TechnicianProductivityCard />
            <CustomerSatisfactionCard />
          </div>
        </div>

        {/* ── Upcoming Tasks ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Upcoming Tasks" action="View All" onActionClick={() => navigate('/tasks')} />

          <TimeLabel label="Today" />
          {vendor.tickets.filter(t => t.category === "Preventive Maintenance" && t.status !== "Closed").slice(0, 3).map((t, idx) => (
            <TaskCard key={t.id} title={t.title} assignee={t.assignedTechnicianName || "Unassigned"} deadline="Today" progress={0} tag="Maintenance" />
          ))}
          {vendor.tickets.filter(t => t.category === "Preventive Maintenance" && t.status !== "Closed").length === 0 && (
            <TaskCard title="Quarterly HVAC Inspection – Tower A" assignee="Rahul Sharma" deadline="3:00 PM" progress={65} tag="Inspection" />
          )}

          <TimeLabel label="Tomorrow" />
          <TaskCard title="Fire Safety System Audit" assignee="Priya Nair" deadline="10:00 AM" progress={0} tag="Compliance" />

          <TimeLabel label="This Week" />
          <TaskCard title="Annual Asset Inventory Review" assignee="Anita Roy" deadline="Fri, 28 Jun" progress={82} tag="Asset" />
        </div>

        {/* ── Performance Summary ── */}
        <div style={{ padding: "18px 20px 4px" }}>
          <Sect title="This Month" />
          <div style={{
            backgroundColor: card, borderRadius: "20px",
            border: `1px solid ${border}`, padding: "16px 18px",
            boxShadow: cardShadow,
          }}>
            <div className="flex items-center justify-between mb-4">
              <p style={{ fontSize: "12.5px", fontWeight: 700, color: ink, fontFamily: inter }}>Performance Summary</p>
              <span style={{ fontSize: "11px", color: inkFaint, fontFamily: inter }}>June 2026</span>
            </div>
            {[
              { label: "Requests Closed", value: "84%", pct: 84, color: green },
              { label: "Avg. Response Time", value: "1.4 h", pct: 72, color: blue },
              { label: "Vendor Rating", value: "4.6 / 5", pct: 92, color: purple },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: "12px" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: "5px" }}>
                  <span style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{m.label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: m.color, fontFamily: inter }}>{m.value}</span>
                </div>
                <div style={{ height: "5px", backgroundColor: bg, borderRadius: "100px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${m.pct}%`, borderRadius: "100px", backgroundColor: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: "20px" }} />
    </MobileLayout>
  );
}
