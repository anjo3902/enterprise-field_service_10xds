import { handleBackNavigation } from "../utils/navigation";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Bell, User, Search, Mic,
  Wind, Zap, Droplets, MoveVertical,
  Home, FileText, Database, Bot,
  AlertTriangle, CheckCircle2, Clock,
  Activity, TrendingUp, TrendingDown,
  ChevronRight, Shield, Building2,
  SlidersHorizontal,
} from "lucide-react";

// ─── Design tokens — exact mirror across all asset screens ────────────────────
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
const inkSec   = "#475569";
const inkMut   = "#64748B";
const inkFaint = "#94A3B8";

const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";

const inter      = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
const blueShadow = "0 4px 20px rgba(37,99,235,0.22), 0 1px 4px rgba(0,0,0,0.08)";

import { useMachineHealthContext, Machine, MachineStatus } from "../contexts/MachineHealthContext";
import { useEffect } from "react";
import MachineHealthFilterPanel from './MachineHealthFilterPanel';



const STATUS_P: Record<MachineStatus, {
  color: string;
  tint: string;
  bar: string;
}> = {
  Healthy: {
    color: green,
    tint: greenT,
    bar: `linear-gradient(90deg, ${green}, #4ADE80)`
  },

  Warning: {
    color: amber,
    tint: amberT,
    bar: `linear-gradient(90deg, ${amber}, #FCD34D)`
  },

  Critical: {
    color: red,
    tint: redT,
    bar: `linear-gradient(90deg, ${red}, #F87171)`
  },

  
};


// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0,
    }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3, 5, 7, 9].map((h, i) => (
            <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white" }} />
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
    <div style={{
      background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
      padding: "10px 20px 18px", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <button type="button" style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "10px", padding: "6px 12px 6px 9px",
          cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter,
        }} onClick={() => handleBackNavigation(navigate, '/dashboard')}>
          <ArrowLeft size={15} color="white" /> Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ position: "relative" }}>
            <button type="button" style={{
              width: "36px", height: "36px", borderRadius: "10px",
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <Bell size={17} color="white" />
            </button>
            <div style={{
              position: "absolute", top: "6px", right: "6px",
              width: "7px", height: "7px", borderRadius: "50%",
              backgroundColor: red, border: "1.5px solid #0052CC",
            }} />
          </div>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(140deg, #334155, #1E293B)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid rgba(255,255,255,0.2)",
          }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "white", fontFamily: inter }}>AC</span>
          </div>
        </div>
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: inter, marginBottom: "3px" }}>
        Machine Health
      </h1>
      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: inter }}>
        Real-time equipment health monitoring
      </p>
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────
export function SearchBar({ onFilterClick }: { onFilterClick: () => void }) {
  const [focused, setFocused] = useState(false);
  const { searchQuery, setSearchQuery, activeFilterCount } = useMachineHealthContext();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, setSearchQuery]);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  return (
    <div style={{ backgroundColor: card, padding: "12px 20px", borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
      <div style={{
        height: "46px", borderRadius: "13px",
        backgroundColor: focused ? card : bg,
        border: focused ? `2px solid ${blue}` : `1.5px solid ${border}`,
        boxShadow: focused ? `0 0 0 3px ${blueRing}` : "none",
        display: "flex", alignItems: "center", gap: "10px", padding: "0 14px",
        transition: "all 0.18s ease",
      }}>
        <Search size={16} color={focused ? blue : inkFaint} style={{ flexShrink: 0, transition: "color 0.18s" }} />
        <input
          type="text"
          placeholder="Search machines..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "13.5px", color: ink, fontFamily: inter }}
        />
        <button type="button" onClick={onFilterClick} style={{
          width: "30px", height: "30px", borderRadius: "9px",
          backgroundColor: focused || activeFilterCount > 0 ? blueTint : divider,
          border: `1px solid ${focused || activeFilterCount > 0 ? blue + "30" : border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0, transition: "all 0.18s", position: "relative"
        }}>
          <SlidersHorizontal size={13} color={focused || activeFilterCount > 0 ? blue : inkFaint} />
          {activeFilterCount > 0 && (
            <div style={{
              position: "absolute", top: "-4px", right: "-4px",
              width: "14px", height: "14px", borderRadius: "50%",
              backgroundColor: blue, color: "white", fontSize: "9px",
              fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${card}`
            }}>
              {activeFilterCount}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function Sect({ title, action, onActionClick }: { title: string; action?: string, onActionClick?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
      <span style={{ fontSize: "15.5px", fontWeight: 800, color: ink, letterSpacing: "-0.02em", fontFamily: inter }}>{title}</span>
      {action && (
        <button type="button" onClick={onActionClick} style={{
          background: "none", border: "none", fontSize: "12px", color: blue,
          fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", fontFamily: inter,
        }}>
          {action} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Summary KPI card ─────────────────────────────────────────────────────────
function KPICard({ label, value, icon: Icon, color, tint, trend, up }: {
  label: string; value: string; icon: React.ElementType;
  color: string; tint: string; trend: string; up: boolean;
}) {
  return (
    <div style={{
      flex: 1,
      background: `radial-gradient(circle at 10% 15%, ${tint} 0%, ${card} 65%)`,
      borderRadius: "20px", padding: "15px 14px 13px",
      boxShadow: cardShadow, border: `1px solid ${border}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: "-18px", right: "-18px", width: "64px", height: "64px", borderRadius: "50%", backgroundColor: tint, opacity: 0.7 }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "11px", backgroundColor: tint, border: `1px solid ${color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={17} color={color} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px", backgroundColor: up ? greenT : redT, borderRadius: "100px", padding: "2px 6px" }}>
          {up ? <TrendingUp size={9} color={green} /> : <TrendingDown size={9} color={red} />}
          <span style={{ fontSize: "9.5px", fontWeight: 700, color: up ? green : red, fontFamily: inter }}>{trend}</span>
        </div>
      </div>
      <p style={{ fontSize: "23px", fontWeight: 800, color: ink, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, marginBottom: "4px" }}>{value}</p>
      <p style={{ fontSize: "10.5px", fontWeight: 500, color: inkMut, fontFamily: inter }}>{label}</p>
    </div>
  );
}

// ─── Machine Health Card ──────────────────────────────────────────────────────
export function MachineCard({ machine }: { machine: Machine }) {
  const sp = STATUS_P[machine.status];
  const r = 24, sw = 6;
  const C = 2 * Math.PI * r;
  const dash = (machine.health / 100) * C;
  const [pressed, setPressed] = useState(false);
  const navigate = useNavigate();

  // Mini sparkline for this machine
  const W = 80, H = 28;
  const lo = Math.min(...machine.trend), hi = Math.max(...machine.trend);
  const range = hi - lo || 1;
  const pts = machine.trend.map((v, i) => {
    const x = (i / (machine.trend.length - 1)) * W;
    const y = H - ((v - lo) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={() => navigate(`/machine-health/details/${machine.id}`)}
      style={{
        backgroundColor: card, borderRadius: "18px",
        boxShadow: pressed ? "none" : cardShadow,
        border: `1px solid ${pressed ? machine.iconColor + "35" : border}`,
        marginBottom: "10px", overflow: "hidden",
        transform: pressed ? "scale(0.99)" : "scale(1)",
        transition: "all 0.12s ease", cursor: "pointer",
      }}
    >
      {/* Top accent strip */}
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${machine.iconColor}, ${machine.iconColor}50)` }} />

      <div style={{ padding: "14px 14px 13px" }}>
        {/* Row 1: icon + name/info + health ring */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
          {/* Equipment icon */}
          <div style={{
            width: "46px", height: "46px", borderRadius: "14px",
            backgroundColor: machine.iconTint,
            border: `1.5px solid ${machine.iconColor}25`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: `0 3px 10px ${machine.iconColor}22`,
          }}>
            <machine.icon size={22} color={machine.iconColor} />
          </div>

          {/* Name + ID + category */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, lineHeight: 1.25, marginBottom: "3px" }}>
              {machine.name}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: inkFaint, fontFamily: inter }}>{machine.id}</span>
              <div style={{ width: "3px", height: "3px", borderRadius: "50%", backgroundColor: border }} />
              <span style={{ fontSize: "10px", fontWeight: 600, color: inkSec, backgroundColor: divider, borderRadius: "5px", padding: "1px 6px", fontFamily: inter }}>
                {machine.category}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px" }}>
              <span style={{
                fontSize: "9.5px", fontWeight: 700, color: sp.color,
                backgroundColor: sp.tint, borderRadius: "100px",
                padding: "2px 8px", border: `1px solid ${sp.color}22`, fontFamily: inter,
              }}>
                {machine.status}
              </span>
              {machine.incidents > 0 && (
                <span style={{
                  fontSize: "9.5px", fontWeight: 600, color: red,
                  backgroundColor: redT, borderRadius: "100px",
                  padding: "2px 7px", fontFamily: inter,
                }}>
                  {machine.incidents} incident{machine.incidents > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Health ring gauge */}
          <div style={{ position: "relative", width: "58px", height: "58px", flexShrink: 0 }}>
            <svg width="58" height="58" viewBox="0 0 58 58" style={{ display: "block" }}>
              <circle cx="29" cy="29" r={r} fill="none" stroke={divider} strokeWidth={sw} />
              <circle
                cx="29" cy="29" r={r}
                fill="none" stroke={sp.color} strokeWidth={sw}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
                transform="rotate(-90 29 29)"
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: sp.color, fontFamily: inter, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {machine.health}%
              </span>
            </div>
          </div>
        </div>

        {/* Health bar */}
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "10px", color: inkMut, fontFamily: inter }}>Health Score</span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: sp.color, fontFamily: inter }}>{machine.health}%</span>
          </div>
          <div style={{ height: "5px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${machine.health}%`, background: sp.bar, borderRadius: "100px" }} />
          </div>
        </div>

        {/* Row 3: sparkline + meta + view details */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", borderTop: `1px solid ${divider}`, paddingTop: "10px" }}>
          {/* Mini sparkline */}
          <div style={{ width: `${W}px`, height: `${H}px`, flexShrink: 0 }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
              <polyline
                points={pts}
                fill="none"
                stroke={machine.iconColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
              {/* Last point dot */}
              {(() => {
                const lastV = machine.trend[machine.trend.length - 1];
                const lx = W;
                const ly = H - ((lastV - lo) / range) * (H - 4) - 2;
                return <circle cx={lx} cy={ly} r="3" fill={machine.iconColor} />;
              })()}
            </svg>
          </div>

          {/* Meta info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
              <Clock size={10} color={inkFaint} />
              <span style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter }}>{machine.lastUpdated}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Activity size={10} color={inkFaint} />
              <span style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter }}>{machine.uptime} uptime</span>
            </div>
          </div>

          {/* View Details */}
          <button type="button" style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            height: "30px", borderRadius: "9px", padding: "0 11px",
            background: `linear-gradient(135deg, ${blue}, ${blueDark})`,
            border: "none", cursor: "pointer", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(37,99,235,0.28)",
            fontFamily: inter,
          }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "white" }}>Details</span>
            <ChevronRight size={12} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Multi-line Health Trend Chart ────────────────────────────────────────────
function HealthTrendChart({ machines }: { machines: Machine[] }) {
  const CW = 310, CH = 110;
  const PAD = { t: 8, b: 22, l: 30, r: 8 };
  const innerW = CW - PAD.l - PAD.r;
  const innerH = CH - PAD.t - PAD.b;

  const toX = (i: number) => PAD.l + (i / 6) * innerW;
  const toY = (v: number) => PAD.t + innerH - (v / 100) * innerH;

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const gridLines = [25, 50, 75, 100];

  return (
    <div style={{
      backgroundColor: card, borderRadius: "18px",
      boxShadow: cardShadow, border: `1px solid ${border}`,
      padding: "16px 16px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <p style={{ fontSize: "13.5px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "2px" }}>
            7-Day Health Trend
          </p>
          <p style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter }}>
            All machines · Last 7 days
          </p>
        </div>
        <div style={{
          backgroundColor: blueTint, borderRadius: "100px",
          padding: "3px 10px", border: `1px solid ${blue}22`,
        }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: blue, fontFamily: inter }}>Live</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px", marginBottom: "12px" }}>
        {machines.map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "20px", height: "3px", borderRadius: "100px", backgroundColor: m.iconColor }} />
            <span style={{ fontSize: "10px", color: inkSec, fontFamily: inter, fontWeight: 500 }}>{m.name.split(" ").slice(0, 2).join(" ")}</span>
          </div>
        ))}
      </div>

      {/* SVG chart */}
      <svg width="100%" height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ display: "block", overflow: "visible" }}>
        {/* Grid lines + Y labels */}
        {gridLines.map(v => (
          <g key={v}>
            <line x1={PAD.l} y1={toY(v)} x2={CW - PAD.r} y2={toY(v)} stroke={divider} strokeWidth="1" strokeDasharray="3 3" />
            <text x={PAD.l - 5} y={toY(v) + 4} textAnchor="end" fontSize="8" fill={inkFaint} fontFamily={inter}>{v}</text>
          </g>
        ))}

        {/* Machine trend lines with area fill */}
        {machines.map(m => {
          const pts = m.trend.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
          const lastI = m.trend.length - 1;
          const lastX = toX(lastI);
          const lastY = toY(m.trend[lastI]);

          return (
            <g key={m.id}>
              <polyline
                points={pts}
                fill="none"
                stroke={m.iconColor}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* End dot */}
              <circle cx={lastX} cy={lastY} r="3.5" fill={m.iconColor} />
              <circle cx={lastX} cy={lastY} r="6" fill={m.iconColor} fillOpacity="0.15" />
              {/* End label */}
              <text x={lastX + 8} y={lastY + 4} fontSize="8.5" fill={m.iconColor} fontFamily={inter} fontWeight="700">
                {m.health}%
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {days.map((d, i) => (
          <text key={d} x={toX(i)} y={CH - 4} textAnchor="middle" fontSize="8.5" fill={inkFaint} fontFamily={inter}>{d}</text>
        ))}

        {/* X axis line */}
        <line x1={PAD.l} y1={CH - PAD.b} x2={CW - PAD.r} y2={CH - PAD.b} stroke={border} strokeWidth="1" />
      </svg>
    </div>
  );
}

export function MachineHealthDashboard() {
  const { filteredMachines, clearFilters } = useMachineHealthContext();
  const navigate = useNavigate();
  const AVG_HEALTH = filteredMachines.length > 0 ? Math.round(filteredMachines.reduce((a, m) => a + m.health, 0) / filteredMachines.length) : 0;
  const healthyCount = filteredMachines.filter(m => m.status === 'Healthy').length;
  const warningCount = filteredMachines.filter(m => m.status === 'Warning').length;
  const criticalCount = filteredMachines.filter(m => m.status === 'Critical').length;
  
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  return (
    <>
    <MobileLayout
      header={
        <>
          <StatusBar />
          <PageHeader />
          <SearchBar onFilterClick={() => setFilterPanelOpen(true)} />
        </>
      }
    >
        {/* ── Summary KPI grid ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Summary" />
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <KPICard
              label="Healthy Machines" value={healthyCount.toString()}
              icon={CheckCircle2} color={green} tint={greenT}
              trend="+0" up={true}
            />
            <KPICard
              label="Warning Machines" value={warningCount.toString()}
              icon={AlertTriangle} color={amber} tint={amberT}
              trend="+0" up={false}
            />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <KPICard
              label="Critical Machines" value={criticalCount.toString()}
              icon={AlertTriangle} color={red} tint={redT}
              trend="+0" up={false}
            />
            <KPICard
              label="Avg Health Score" value={`${AVG_HEALTH}%`}
              icon={Activity} color={blue} tint={blueTint}
              trend="−0%" up={false}
            />
          </div>
        </div>

        {/* ── Machine Health Cards ── */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Machine Health Status" action="View All" onActionClick={() => navigate("/machine-health/list")} />
          
          {filteredMachines.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "16px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Search size={28} color={inkMut} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "8px" }}>No machines found</h3>
              <p style={{ fontSize: "13.5px", color: inkSec, fontFamily: inter, marginBottom: "20px" }}>Try adjusting your search or filters to find what you're looking for.</p>
              <button type="button" onClick={clearFilters} style={{
                backgroundColor: card, border: `1px solid ${border}`, borderRadius: "12px",
                padding: "10px 20px", fontSize: "13px", fontWeight: 600, color: ink,
                fontFamily: inter, cursor: "pointer", boxShadow: cardShadow
              }}>
                Reset Filters
              </button>
            </div>
          ) : (
            filteredMachines.slice(0, 5).map(m => <MachineCard key={m.id} machine={m} />)
          )}
        </div>

        {/* ── Health Trend Chart ── */}
        {filteredMachines.length > 0 && (
          <div style={{ padding: "18px 20px 24px" }}>
            <Sect title="Health Trend" />
            <HealthTrendChart machines={filteredMachines.slice(0, 5)} />
          </div>
        )}
    </MobileLayout>
    <MachineHealthFilterPanel open={filterPanelOpen} onOpenChange={setFilterPanelOpen} />
    </>
  );
}
