import { handleBackNavigation } from "../utils/navigation";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { useState, useEffect } from "react";
import { getRecentActivities, getAllAssets } from "../lib/assets.service";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Wind, PlusCircle, Shield, CheckCircle2,
  Settings2, Wrench, RefreshCw, Activity, Bell,
  Home, FileText, Database, User, Bot,
  ChevronRight, Building2, CalendarDays,
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

// ─── Timeline data ────────────────────────────────────────────────────────────
type HistoryCategory = "All" | "Maintenance" | "Repair" | "Inspection";

interface HistoryItem {
  id: number; type: string; date: string; time: string;
  desc: string; technician: string; vendor: string;
  color: string; tint: string; icon: React.ElementType;
  category: HistoryCategory | "Other";
}


const FILTER_DEFS: { label: HistoryCategory | "All"; color: string; tint: string }[] = [
  { label: "All",         color: blue,   tint: blueTint },
  { label: "Maintenance", color: amber,  tint: amberT   },
  { label: "Repair",      color: red,    tint: redT     },
  { label: "Inspection",  color: teal,   tint: tealT    },
];

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

// ─── Compact blue sub-page header ────────────────────────────────────────────
function PageHeader({ count }: { count: number }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
      padding: "10px 20px 18px", flexShrink: 0,
    }}>
      {/* Nav row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <button type="button" style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "10px", padding: "6px 12px 6px 9px",
          cursor: "pointer", fontSize: "12.5px", fontWeight: 600,
          color: "white", fontFamily: inter,
        }} onClick={() => handleBackNavigation(navigate, '/assets/details/AST-10024')}>
          <ArrowLeft size={15} color="white" />
          Back
        </button>
        <div style={{
          backgroundColor: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: "100px", padding: "4px 12px",
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "white", fontFamily: inter }}>
            {count} events
          </span>
        </div>
      </div>

      {/* Title + asset context */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", lineHeight: 1.15, fontFamily: inter, marginBottom: "6px" }}>
          Asset History
        </h1>
        {/* Asset context chip */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "7px",
          backgroundColor: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: "100px", padding: "5px 12px 5px 8px",
        }}>
          <div style={{
            width: "22px", height: "22px", borderRadius: "7px",
            backgroundColor: tealT,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Wind size={12} color={teal} />
          </div>
          
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.5)" }} />
          
        </div>
      </div>
    </div>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────
function FilterBar({
  active, onChange, counts,
}: {
  active: string;
  onChange: (f: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div style={{
      backgroundColor: card, borderBottom: `1px solid ${border}`,
      padding: "10px 20px 12px", flexShrink: 0,
    }}>
      <div style={{
        display: "flex", gap: "8px",
        overflowX: "auto", scrollbarWidth: "none",
      }}>
        {FILTER_DEFS.map((f) => {
          const on = active === f.label;
          const c = counts[f.label] ?? 0;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => onChange(f.label)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                height: "33px", borderRadius: "100px", padding: "0 13px",
                backgroundColor: on ? f.color : card,
                border: `1.5px solid ${on ? f.color : border}`,
                cursor: "pointer", flexShrink: 0,
                boxShadow: on ? `0 2px 8px ${f.color}30` : "none",
                transition: "all 0.15s ease", fontFamily: inter,
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: on ? "white" : inkSec, whiteSpace: "nowrap" }}>
                {f.label}
              </span>
              <span style={{
                fontSize: "10px", fontWeight: 700,
                color: on ? "rgba(255,255,255,0.75)" : inkFaint,
                backgroundColor: on ? "rgba(255,255,255,0.2)" : divider,
                borderRadius: "100px", padding: "1px 6px",
              }}>
                {c}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Single timeline card ─────────────────────────────────────────────────────
function TimelineCard({ item, isLast }: { item: HistoryItem; isLast: boolean }) {
  return (
    <div style={{ display: "flex", gap: "12px", paddingBottom: isLast ? 0 : "4px" }}>

      {/* Left spine column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "38px", flexShrink: 0 }}>
        {/* Icon circle */}
        <div style={{
          width: "38px", height: "38px", borderRadius: "12px",
          backgroundColor: item.tint,
          border: `1.5px solid ${item.color}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 2px 8px ${item.color}20`,
          zIndex: 1,
        }}>
          <item.icon size={18} color={item.color} />
        </div>
        {/* Connector line */}
        {!isLast && (
          <div style={{
            width: "2px", flex: 1,
            background: `linear-gradient(180deg, ${item.color}40, ${border})`,
            marginTop: "6px", minHeight: "24px",
            borderRadius: "1px",
          }} />
        )}
      </div>

      {/* Right card content */}
      <div style={{
        flex: 1,
        backgroundColor: card,
        borderRadius: "16px",
        boxShadow: cardShadow,
        border: `1px solid ${border}`,
        overflow: "hidden",
        marginBottom: isLast ? 0 : "10px",
      }}>
        {/* Colored accent top strip */}
        <div style={{ height: "3px", background: `linear-gradient(90deg, ${item.color}, ${item.color}60)` }} />

        <div style={{ padding: "12px 14px 13px" }}>
          {/* Row 1: type badge + date + time */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
            <span style={{
              fontSize: "10px", fontWeight: 700, color: item.color,
              backgroundColor: item.tint, borderRadius: "100px",
              padding: "3px 9px", flexShrink: 0,
              border: `1px solid ${item.color}22`, fontFamily: inter, letterSpacing: "0.02em",
            }}>
              {item.type}
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: inkSec, fontFamily: inter }}>{item.date}</span>
              <span style={{ fontSize: "10px", color: inkFaint, fontFamily: inter, marginTop: "1px" }}>{item.time}</span>
            </div>
          </div>

          {/* Description */}
          <p style={{
            fontSize: "12.5px", color: inkSec, fontFamily: inter,
            lineHeight: 1.6, marginBottom: "10px",
          }}>
            {item.desc}
          </p>

          {/* Footer: technician + vendor */}
          <div style={{ display: "flex", alignItems: "center", gap: "0", borderTop: `1px solid ${divider}`, paddingTop: "10px" }}>
            {/* Technician */}
            <div style={{ display: "flex", alignItems: "center", gap: "7px", flex: 1 }}>
              <div style={{
                width: "24px", height: "24px", borderRadius: "8px",
                background: `linear-gradient(135deg, ${blue}, ${blueDark})`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <User size={12} color="white" />
              </div>
              <div>
                <p style={{ fontSize: "9.5px", color: inkFaint, fontFamily: inter, fontWeight: 500 }}>Technician</p>
                <p style={{ fontSize: "11.5px", fontWeight: 600, color: ink, fontFamily: inter }}>{item.technician}</p>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: "1px", height: "32px", backgroundColor: divider, flexShrink: 0, margin: "0 14px" }} />

            {/* Vendor */}
            <div style={{ display: "flex", alignItems: "center", gap: "7px", flex: 1 }}>
              <div style={{
                width: "24px", height: "24px", borderRadius: "8px",
                backgroundColor: tealT, border: `1px solid ${teal}22`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Building2 size={12} color={teal} />
              </div>
              <div>
                <p style={{ fontSize: "9.5px", color: inkFaint, fontFamily: inter, fontWeight: 500 }}>Vendor</p>
                <p style={{ fontSize: "11.5px", fontWeight: 600, color: ink, fontFamily: inter }}>{item.vendor}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Year group label ─────────────────────────────────────────────────────────
function YearLabel({ year }: { year: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", marginTop: "4px" }}>
      <div style={{
        backgroundColor: blueTint, borderRadius: "100px",
        padding: "4px 12px", border: `1px solid ${blue}22`, flexShrink: 0,
      }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: blue, fontFamily: inter }}>{year}</span>
      </div>
      <div style={{ flex: 1, height: "1px", backgroundColor: border }} />
    </div>
  );
}

export function AssetHistory() {
  const [history, setHistory] = useState<any[]>([]);
const [assets, setAssets] = useState<any[]>([]);
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>("All");

  useEffect(() => {
  async function loadHistory() {
    try {
      const [historyData, assetData] = await Promise.all([
        getRecentActivities(),
        getAllAssets(),
      ]);

      setHistory(historyData || []);
      setAssets(assetData || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }

  loadHistory();
}, []);
const mappedHistory = history.map((item) => {
  const asset = assets.find(
    (a) => a.asset_id === item.asset_id
  );

  const date = new Date(item.activity_date);

  let category: HistoryCategory | "Other" = "Other";

  if (item.activity_type.toLowerCase().includes("maintenance")) {
    category = "Maintenance";
  } else if (item.activity_type.toLowerCase().includes("repair")) {
    category = "Repair";
  } else if (
    item.activity_type.toLowerCase().includes("inspection") ||
    item.activity_type.toLowerCase().includes("health")
  ) {
    category = "Inspection";
  }

  return {
    id: item.id,
    type: item.activity_type,
    date: date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    desc: item.description,
    technician: item.performed_by,
    vendor: asset?.vendor ?? "N/A",
    color:
      category === "Maintenance"
        ? amber
        : category === "Repair"
        ? red
        : category === "Inspection"
        ? teal
        : blue,
    tint:
      category === "Maintenance"
        ? amberT
        : category === "Repair"
        ? redT
        : category === "Inspection"
        ? tealT
        : blueTint,
    icon:
      category === "Maintenance"
        ? Settings2
        : category === "Repair"
        ? Wrench
        : category === "Inspection"
        ? CheckCircle2
        : Activity,
    category,
  };
});

const filtered =
  activeFilter === "All"
    ? mappedHistory
    : mappedHistory.filter(
        (item) => item.category === activeFilter
      );

const counts = {
  All: mappedHistory.length,
  Maintenance: mappedHistory.filter(
    (i) => i.category === "Maintenance"
  ).length,
  Repair: mappedHistory.filter(
    (i) => i.category === "Repair"
  ).length,
  Inspection: mappedHistory.filter(
    (i) => i.category === "Inspection"
  ).length,
};

const grouped: Record<string, any[]> = {};

filtered.forEach((item) => {
  const year = item.date.split(" ")[2];

  if (!grouped[year]) {
    grouped[year] = [];
  }

  grouped[year].push(item);
});

const years = Object.keys(grouped).sort(
  (a, b) => Number(b) - Number(a)
);
  return (
    <MobileLayout
      header={
        <>
          {/* ── Fixed top chrome ── */}
          <StatusBar />
          <PageHeader count={filtered.length} />
          <FilterBar active={activeFilter} onChange={setActiveFilter} counts={counts} />

          {/* ── Result summary strip ── */}
          <div style={{
            backgroundColor: bg, padding: "10px 20px 4px",
            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "12px", color: inkFaint, fontFamily: inter }}>
              <span style={{ fontWeight: 700, color: ink }}>{filtered.length}</span>
              {" "}event{filtered.length !== 1 ? "s" : ""} in history
            </span>
            <span style={{ fontSize: "11px", color: blue, fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>
              Newest first
            </span>
          </div>
        </>
      }
      scrollContainerStyle={{ padding: "10px 20px 100px" }}
    >
        {filtered.length === 0 ? (
          /* Empty state */
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", paddingTop: "60px", gap: "14px",
          }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "22px",
              backgroundColor: divider,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CalendarDays size={30} color={inkFaint} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "16px", fontWeight: 800, color: ink, fontFamily: inter, marginBottom: "6px" }}>No events found</p>
              <p style={{ fontSize: "13px", color: inkMut, fontFamily: inter, lineHeight: 1.55 }}>
                No history events match the selected filter.
              </p>
            </div>
          </div>
        ) : (
          years.map(year => (
            <div key={year}>
              <YearLabel year={year} />
              {grouped[year].map((item, idx) => (
                <TimelineCard
                  key={item.id}
                  item={item}
                  isLast={idx === grouped[year].length - 1 && year === years[years.length - 1]}
                />
              ))}
              {/* Year group spacer */}
              <div style={{ height: "8px" }} />
            </div>
          ))
        )}

      <div style={{ height: "16px" }} />
    </MobileLayout>
  );
}
