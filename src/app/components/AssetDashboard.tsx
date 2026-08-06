import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Bell, Search, SlidersHorizontal, ArrowLeft,
  Monitor, Wind, Zap, Shield, Droplets,
  Home, FileText, Database, User, Bot,
  CalendarClock, AlertTriangle, CheckCircle2,
  Activity, PlusCircle, RefreshCw, ChevronRight,
  TrendingUp, TrendingDown, Clock, Package,
  Settings2, Cpu, BarChart3, Tag, Wrench,
} from "lucide-react";
import {
  getAllAssets,
  getRecentActivities,
} from "../lib/assets.service";
import { getHealthStatus } from "../utils/businessRules";

// ─── Exact same design tokens as HomeDashboard ────────────────────────────────
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
const slate    = "#64748B";
const slateT   = "#F1F5F9";

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
const blueShadow = "0 4px 20px rgba(37,99,235,0.22), 0 1px 4px rgba(0,0,0,0.08)";

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1.5 flex-shrink-0"
      style={{ backgroundColor: "#0052CC" }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div className="flex items-center gap-2">
        <div className="flex items-end gap-0.5">
          {[3, 5, 7, 9].map((h, i) => (
            <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white" }} />
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

// ─── Compact blue sub-page header ────────────────────────────────────────────
function AssetHeader() {
  const navigate = useNavigate();
  return (
    <div style={{
      background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
      padding: "12px 20px 18px",
      flexShrink: 0,
    }}>
      {/* Navigation row */}
      <div className="flex items-center justify-between mb-3">
        {/* Back button */}
        <button type="button" style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "10px", padding: "6px 12px 6px 9px",
          cursor: "pointer", color: "white",
          fontSize: "12.5px", fontWeight: 600, fontFamily: inter,
        }} onClick={() => handleBackNavigation(navigate, '/dashboard')}>
          <ArrowLeft size={15} color="white" />
          Back
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2">
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
              backgroundColor: red, border: "1.5px solid transparent",
              backgroundClip: "padding-box",
            }} />
          </div>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(140deg, #334155, #1E293B)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid rgba(255,255,255,0.2)", cursor: "pointer",
          }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "white", fontFamily: inter }}>AC</span>
          </div>
        </div>
      </div>

      {/* Title block */}
      <div>
        <h1 style={{
          fontSize: "20px", fontWeight: 800, color: "white",
          letterSpacing: "-0.025em", lineHeight: 1.15, fontFamily: inter, marginBottom: "4px",
        }}>
          Asset Dashboard
        </h1>
        <p style={{
          fontSize: "12px", color: "rgba(255,255,255,0.68)",
          fontFamily: inter, lineHeight: 1.45,
        }}>
          Monitor and manage enterprise assets across your organization.
        </p>
      </div>
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────
function AssetSearch() {
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  return (
    <div style={{
      backgroundColor: card,
      borderBottom: `1px solid ${border}`,
      padding: "12px 20px 12px",
      flexShrink: 0,
    }}>
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
          placeholder="Search assets, asset IDs, vendors..."
          onFocus={() => setFocused(true)}
          onClick={() => navigate('/assets/search')}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", border: "none", outline: "none", background: "transparent",
            fontSize: "13.5px", color: ink, fontFamily: inter,
          }}
        />
       
      </div>
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

// ─── KPI card (exact mirror of HomeDashboard) ────────────────────────────────
interface KPIProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  tint: string;
  trend: string;
  up: boolean;
}

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  tint,
  trend,
  up,
}: KPIProps) {
  return (
    <div
      style={{
        flex: 1,
        background: `radial-gradient(circle at 10% 15%, ${tint} 0%, ${card} 65%)`,
        borderRadius: "20px",
        padding: "15px 14px 13px",
        boxShadow: cardShadow,
        border: `1px solid ${border}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-18px",
          right: "-18px",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: tint,
          opacity: 0.7,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "11px",
            backgroundColor: tint,
            border: `1px solid ${color}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={17} color={color} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "3px",
            backgroundColor: up ? greenT : redT,
            borderRadius: "100px",
            padding: "2px 6px",
          }}
        >
          {up ? (
            <TrendingUp size={9} color={green} />
          ) : (
            <TrendingDown size={9} color={red} />
          )}

          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 700,
              color: up ? green : red,
              fontFamily: inter,
            }}
          >
            {trend}
          </span>
        </div>
      </div>

      <p
        style={{
          fontSize: "23px",
          fontWeight: 800,
          color: ink,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          fontFamily: inter,
          marginBottom: "4px",
        }}
      >
        {value}
      </p>

      <p
        style={{
          fontSize: "10.5px",
          fontWeight: 500,
          color: inkMut,
          fontFamily: inter,
          lineHeight: 1.3,
        }}
      >
        {label}
      </p>
    </div>
  );
}
// ─── Asset Health donut chart ─────────────────────────────────────────────────
function AssetHealthDonut({
  healthyAssets,
  warningAssets,
  criticalAssets,
  healthyPercent,
  warningPercent,
  criticalPercent,
}: any) {

  const cx = 75;
  const cy = 75;
  const r = 54;
  const sw = 20;

  const C = 2 * Math.PI * r;
  const gap = 4;

  const segs = [
    {
      pct: healthyPercent / 100,
      color: green,
      label: "Healthy",
      count: healthyAssets.toString(),
    },
    {
      pct: warningPercent / 100,
      color: orange,
      label: "Warning",
      count: warningAssets.toString(),
    },
    {
      pct: criticalPercent / 100,
      color: red,
      label: "Critical",
      count: criticalAssets.toString(),
    },
  ];

  // cumulative start angles
  let cum = 0;
  const arcs = segs.map((s) => {
    const startDeg = -90 + cum * 360;
    const len = s.pct * C - gap;
    cum += s.pct;
    return { ...s, startDeg, len };
  });

  return (
    <div style={{
      backgroundColor: card, borderRadius: "20px",
      border: `1px solid ${border}`, boxShadow: cardShadow,
      padding: "20px", display: "flex", alignItems: "center", gap: "20px",
    }}>
      {/* Donut */}
      <div style={{ position: "relative", width: "150px", height: "150px", flexShrink: 0 }}>
        <svg width="150" height="150" viewBox="0 0 150 150" style={{ display: "block" }}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={divider} strokeWidth={sw} />
          {/* Segments */}
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={sw}
              strokeLinecap="butt"
              strokeDasharray={`${Math.max(0, a.len)} ${C}`}
              transform={`rotate(${a.startDeg} ${cx} ${cy})`}
            />
          ))}
        </svg>
        {/* Center stat */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "24px", fontWeight: 800, color: green, fontFamily: inter, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {healthyPercent}%
          </span>
          <span style={{ fontSize: "10px", fontWeight: 600, color: inkMut, fontFamily: inter, marginTop: "2px" }}>
            Healthy
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "2px" }}>
          Asset Health
        </p>
        {segs.map((s) => (
          <div key={s.label}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{s.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: ink, fontFamily: inter }}>{Math.round(s.pct * 100)}%</span>
                <span style={{ fontSize: "10px", color: inkFaint, fontFamily: inter }}>{s.count}</span>
              </div>
            </div>
            <div style={{ height: "3px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${s.pct * 100}%`, backgroundColor: s.color, borderRadius: "100px" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────
interface CatProps {
  icon: React.ElementType;
  name: string;
  count: string;
  color: string;
  tint: string;
}

function CategoryCard({ icon: Icon, name, count, color, tint }: CatProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() =>
        navigate(`/assets/listing?category=${encodeURIComponent(name)}`)
      }
      style={{
        cursor: "pointer",
        backgroundColor: card,
        borderRadius: "14px",
        border: `1px solid ${border}`,
        boxShadow: cardShadow,
        padding: "13px 16px",
        marginBottom: "8px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          backgroundColor: tint,
          border: `1px solid ${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={19} color={color} />
      </div>

      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: "13.5px",
            fontWeight: 700,
            color: ink,
            fontFamily: inter,
            lineHeight: 1.3,
          }}
        >
          {name}
        </p>

        <p
          style={{
            fontSize: "11.5px",
            color: inkMut,
            fontFamily: inter,
            marginTop: "2px",
          }}
        >
          {count} assets
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            backgroundColor: tint,
            borderRadius: "100px",
            padding: "3px 10px",
            border: `1px solid ${color}20`,
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color,
              fontFamily: inter,
            }}
          >
            {count}
          </span>
        </div>

        <ChevronRight size={15} color={inkFaint} />
      </div>
    </div>
  );
}
// ─── Renewal card ─────────────────────────────────────────────────────────────
interface RenewProps {
  name: string; type: string; days: number;
  status: "Critical" | "At Risk" | "Upcoming";
}
function RenewalCard({ id, name, type, days, status }: RenewProps & { id?: string }) {
  const navigate = useNavigate();
  const s = {
    Critical:  { bg: redT,    border: "#FECACA", color: red,    icon: <AlertTriangle size={16} color={red} /> },
    "At Risk": { bg: amberT,  border: "#FDE68A", color: amber,  icon: <CalendarClock size={16} color={amber} /> },
    Upcoming:  { bg: blueTint,border: "#BFDBFE", color: blue,   icon: <CalendarClock size={16} color={blue} /> },
  }[status];

  return (
    <div onClick={() => id ? navigate(`/assets/renewals/${id}`) : navigate('/assets/renewals')} style={{
      backgroundColor: card, borderRadius: "16px",
      border: `1px solid ${s.border}`, boxShadow: cardShadow,
      padding: "14px 16px", marginBottom: "10px",
      display: "flex", alignItems: "center", gap: "14px", cursor: "pointer",
    }}>
      <div style={{
        width: "42px", height: "42px", borderRadius: "12px",
        backgroundColor: s.bg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {s.icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "13.5px", fontWeight: 700, color: ink, fontFamily: inter, lineHeight: 1.3 }}>{name}</p>
        <p style={{ fontSize: "11.5px", color: inkMut, fontFamily: inter, marginTop: "2px" }}>{type}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
        <div style={{
          backgroundColor: s.bg, borderRadius: "100px", padding: "3px 9px",
          border: `1px solid ${s.color}25`,
        }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: s.color, fontFamily: inter }}>
            {days} days
          </span>
        </div>
        <span style={{ fontSize: "9px", fontWeight: 700, color: s.color, fontFamily: inter, letterSpacing: "0.03em" }}>
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ─── Activity item ────────────────────────────────────────────────────────────
interface ActProps { icon: React.ElementType; color: string; tint: string; title: string; asset: string; time: string; last?: boolean; }
function ActivityItem({ icon: Icon, color, tint, title, asset, time, last }: ActProps) {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate('/assets/history')} style={{ display: "flex", gap: "12px", paddingBottom: last ? 0 : "14px", cursor: "pointer" }}>
      {/* Timeline spine */}
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

      {/* Content */}
      <div style={{ flex: 1, paddingTop: "4px" }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, lineHeight: 1.3, marginBottom: "2px" }}>
          {title}
        </p>
        <p style={{ fontSize: "11.5px", color: inkSec, fontFamily: inter }}>{asset}</p>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
          <Clock size={10} color={inkFaint} />
          <span style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter }}>{time}</span>
        </div>
      </div>
    </div>
  );
}

const KPIS = [
  { label: "Total Assets", value: "2,840", icon: Database, color: blue, tint: blueTint, trend: "+42", up: true },
  { label: "Active Assets", value: "2,710", icon: Activity, color: green, tint: greenT, trend: "+18", up: true },
  { label: "Critical Status", value: "14", icon: AlertTriangle, color: red, tint: redT, trend: "-3", up: true },
  { label: "Maintenance", value: "116", icon: CheckCircle2, color: amber, tint: amberT, trend: "+12", up: false },
];



export function AssetDashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
 const totalAssets = assets.length;

const activeAssets = assets.filter(
  asset => asset.status === "Active"
).length;



const maintenanceAssets = assets.filter(
  asset => asset.status === "Maintenance"
).length;

const healthyAssets = assets.filter(
  asset => getHealthStatus(asset.health_score) === "Healthy"
).length;

const warningAssets = assets.filter(
  asset => getHealthStatus(asset.health_score) === "Warning"
).length;

const criticalAssets = assets.filter(
  asset => getHealthStatus(asset.health_score) === "Critical"
).length;

const kpis = [
  {
    ...KPIS[0],
    value: totalAssets.toString(),
  },
  {
    ...KPIS[1],
    value: activeAssets.toString(),
  },
  {
    ...KPIS[2],
    value: criticalAssets.toString(),
  },
  {
    ...KPIS[3],
    value: maintenanceAssets.toString(),
  },
];

const categoryCounts = assets.reduce((acc: any, asset: any) => {
  acc[asset.category] = (acc[asset.category] || 0) + 1;
  return acc;
}, {});

const categories = Object.entries(categoryCounts).map(([name, count]) => ({
  name,
  count: count.toString(),
  icon: Database,
  color: blue,
  tint: blueTint,
}));



const totalHealthAssets = assets.length || 1;

const healthyPercent = Math.round(
  (healthyAssets / totalHealthAssets) * 100
);

const warningPercent = Math.round(
  (warningAssets / totalHealthAssets) * 100
);

const criticalPercent = Math.round(
  (criticalAssets / totalHealthAssets) * 100
);

const today = new Date();

const renewals = assets.flatMap((asset: any) => {
  const items = [];

  // Warranty
  if (asset.warranty_expiry) {
    const warrantyDate = new Date(asset.warranty_expiry);
    const days = Math.ceil(
      (warrantyDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
    );

    if (days >= 0) {
      items.push({
        id: asset.asset_id + "-warranty",
        name: asset.asset_name,
        type: "Warranty",
        days,
        status:
          days <= 30
            ? "Critical"
            : days <= 90
            ? "At Risk"
            : "Upcoming",
      });
    }
  }

  // AMC
  if (asset.amc_expiry) {
    const amcDate = new Date(asset.amc_expiry);
    const days = Math.ceil(
      (amcDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
    );

    if (days >= 0) {
      items.push({
        id: asset.asset_id + "-amc",
        name: asset.asset_name,
        type: "AMC",
        days,
        status:
          days <= 30
            ? "Critical"
            : days <= 90
            ? "At Risk"
            : "Upcoming",
      });
    }
  }

  return items;
});
renewals.sort((a, b) => a.days - b.days);

useEffect(() => {
  async function loadAssets() {
    try {
      const [assetData, activityData] = await Promise.all([
  getAllAssets(),
  getRecentActivities(),
]);

setAssets(assetData || []);
setActivities(activityData || []);
      
    } catch (err) {
      
  console.error("Failed to load assets:", err);
}
     
    
  }

  loadAssets();
}, []);
  const navigate = useNavigate();
  return (
    <MobileLayout
      header={
        <>
          <StatusBar />
          <AssetHeader />
          <AssetSearch />
        </>
      }
    >

 {/* KPI Overview */}
<div style={{ padding: "18px 20px 6px" }}>
  <Sect title="Asset Overview" />

  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
    <KPICard {...kpis[0]} />
    <KPICard {...kpis[1]} />
  </div>

  <div style={{ display: "flex", gap: "10px" }}>
    <KPICard {...kpis[2]} />
    <KPICard {...kpis[3]} />
  </div>
</div>
        {/* Asset Health Overview */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Asset Health Overview" />
          <AssetHealthDonut
  healthyAssets={healthyAssets}
  warningAssets={warningAssets}
  criticalAssets={criticalAssets}
  healthyPercent={healthyPercent}
  warningPercent={warningPercent}
  criticalPercent={criticalPercent}
/>
        </div>

        {/* Category Distribution */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Asset Categories" action="View All" onAction={() => navigate('/assets/listing')} />
        {categories.map((c) => (
  <CategoryCard key={c.name} {...c} />
))}
        </div>

        {/* Upcoming Renewals */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Upcoming Renewals" action="View All" onAction={() => navigate('/assets/renewals')} />
          {renewals.slice(0, 5).map((r) => (
  <RenewalCard key={r.id} {...r} />
))}
        </div>

        {/* Recent Asset Activity */}
        <div style={{ padding: "18px 20px 6px" }}>
          <Sect title="Recent Activity" action="View All" onAction={() => navigate('/assets/history')} />
          <div style={{
            backgroundColor: card, borderRadius: "18px",
            border: `1px solid ${border}`, boxShadow: cardShadow,
            padding: "16px 16px 10px",
          }}>
            {activities.map((activity, i) => (
  <ActivityItem
    key={activity.id}
    icon={FileText}
    color={blue}
    tint={blueTint}
    title={activity.activity_type}
    asset={
  assets.find(a => a.assetId === activity.asset_id)?.name ??
  activity.asset_id
}
    time={new Date(activity.activity_date).toLocaleDateString()}
    last={i === activities.length - 1}
  />
))}
</div>
</div>
</MobileLayout>
);
}
