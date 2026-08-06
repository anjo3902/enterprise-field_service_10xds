import { handleBackNavigation } from "../utils/navigation";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Bell, Search, SlidersHorizontal, ArrowUpDown, ArrowLeft,
  Monitor, Wind, Zap, Shield, Droplets, Cpu,
  Home, FileText, Database, User, Bot,
  AlertTriangle, CheckCircle2, Clock, ChevronRight, Plus,
  Settings2, Building2, MoveVertical, Flame,
} from "lucide-react";
import { getHealthStatus } from "../utils/businessRules";

// ─── Design tokens — exact mirror of AssetDashboard ────────────────────────────
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

const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
const blueShadow = "0 4px 20px rgba(37,99,235,0.22), 0 1px 4px rgba(0,0,0,0.08)";

import { useAssetContext, Asset } from "../contexts/AssetContext";

// ─── Filter config ────────────────────────────────────────────────────────────
type Filter =
  | "All"
  | "Active"
  | "Healthy"
  | "Warning"
  | "Critical"
  | "Maintenance";

// ─── Status palette helper ────────────────────────────────────────────────────
const statusPalette: Record<
  "Healthy" | "Warning" | "Critical" | "Maintenance",
  {
    color: string;
    tint: string;
    bar: string;
  }
> = {
  Healthy:     { color: green,  tint: greenT,  bar: `linear-gradient(90deg, ${green}, #4ADE80)` },
  Warning:     { color: orange, tint: orangeT, bar: `linear-gradient(90deg, ${orange}, #FB923C)` },
  Critical:    { color: red,    tint: redT,    bar: `linear-gradient(90deg, ${red}, #F87171)` },
  Maintenance: { color: amber,  tint: amberT,  bar: `linear-gradient(90deg, ${amber}, #FCD34D)` },
};

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0 }}>
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

// ─── Compact blue header ──────────────────────────────────────────────────────
function ListingHeader({ count }: { count: number }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
      padding: "10px 20px 18px",
      flexShrink: 0,
    }}>
      {/* Nav row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <button type="button" style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "10px", padding: "6px 12px 6px 9px",
          cursor: "pointer", fontFamily: inter,
          fontSize: "12.5px", fontWeight: 600, color: "white",
        }} onClick={() => handleBackNavigation(navigate, '/assets')}>
          <ArrowLeft size={15} color="white" />
          Back
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
            border: "1.5px solid rgba(255,255,255,0.2)", cursor: "pointer",
          }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "white", fontFamily: inter }}>AC</span>
          </div>
        </div>
      </div>

      {/* Title + count */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{
            fontSize: "20px", fontWeight: 800, color: "white",
            letterSpacing: "-0.025em", lineHeight: 1.15,
            fontFamily: inter, marginBottom: "4px",
          }}>Assets</h1>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.68)", fontFamily: inter }}>
            Manage all enterprise assets
          </p>
        </div>
        <div style={{
          backgroundColor: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: "100px", padding: "4px 12px",
        }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "white", fontFamily: inter }}>
            {count} assets
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Search bar with filter + sort ────────────────────────────────────────────
function ListingSearch({ onFocusChange }: { onFocusChange?: (v: boolean) => void }) {
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const toggle = (v: boolean) => { setFocused(v); onFocusChange?.(v); };

  return (
    <div style={{
      backgroundColor: card,
      padding: "12px 20px 0",
      flexShrink: 0,
    }}>
      <div style={{
        height: "46px", borderRadius: "13px",
        backgroundColor: focused ? card : bg,
        border: focused ? `2px solid ${blue}` : `1.5px solid ${border}`,
        boxShadow: focused ? `0 0 0 3px ${blueRing}` : "none",
        display: "flex", alignItems: "center", gap: "10px", padding: "0 12px",
        transition: "all 0.18s ease",
      }}>
        <Search size={16} color={focused ? blue : inkFaint} style={{ flexShrink: 0, transition: "color 0.18s" }} />
        <input
          type="text"
          placeholder="Search assets, IDs, categories..."
          onClick={() => navigate('/assets/search')}
          onFocus={() => toggle(true)}
          onBlur={() => toggle(false)}
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: "13.5px", color: ink, fontFamily: inter,
          }}
        />
        {/* Filter button */}
        <button type="button" onClick={() => navigate('/assets/filters')} style={{
          width: "30px", height: "30px", borderRadius: "8px",
          backgroundColor: focused ? blueTint : divider,
          border: `1px solid ${focused ? blue + "30" : border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0, transition: "all 0.18s",
        }}>
          <SlidersHorizontal size={13} color={focused ? blue : inkFaint} />
        </button>
        {/* Divider */}
        <div style={{ width: "1px", height: "20px", backgroundColor: border, flexShrink: 0 }} />
        {/* Sort button */}
        <button type="button" style={{
          width: "30px", height: "30px", borderRadius: "8px",
          backgroundColor: divider,
          border: `1px solid ${border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}>
          <ArrowUpDown size={13} color={inkFaint} />
        </button>
      </div>
    </div>
  );
}
const FILTERS = [
  { label: "All", color: blue },
  { label: "Active", color: teal },
  { label: "Healthy", color: green },
  { label: "Warning", color: amber },
  { label: "Critical", color: red },
  { label: "Maintenance", color: purple },
];

// ─── Filter chips ─────────────────────────────────────────────────────────────
function FilterChips({ active, onChange, counts }: { active: Filter; onChange: (f: Filter) => void; counts: Record<string, number> }) {
  return (
    <div style={{
      backgroundColor: card,
      borderBottom: `1px solid ${border}`,
      flexShrink: 0,
      paddingBottom: "12px",
    }}>
      <div style={{
        display: "flex", gap: "8px",
        overflowX: "auto", scrollbarWidth: "none",
        padding: "10px 20px 0",
      }}>
        {FILTERS.map((f) => {
          const on = active === f.label;
          const count = counts[f.label] ?? 0;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => onChange(f.label as Filter)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                height: "32px", borderRadius: "100px",
                padding: "0 12px",
                backgroundColor: on ? f.color : card,
                border: on ? `1.5px solid ${f.color}` : `1.5px solid ${border}`,
                cursor: "pointer", flexShrink: 0,
                transition: "all 0.15s ease",
                boxShadow: on ? `0 2px 8px ${f.color}30` : "none",
                fontFamily: inter,
              }}
            >
              <span style={{
                fontSize: "12px", fontWeight: 600,
                color: on ? "white" : inkSec,
                whiteSpace: "nowrap",
              }}>
                {f.label}
              </span>
              <span style={{
                fontSize: "10px", fontWeight: 700,
                color: on ? "rgba(255,255,255,0.75)" : inkFaint,
                backgroundColor: on ? "rgba(255,255,255,0.2)" : divider,
                borderRadius: "100px", padding: "1px 6px", minWidth: "18px", textAlign: "center",
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Asset card ───────────────────────────────────────────────────────────────
function AssetCard({ asset }: { asset: Asset }) {
  const displayStatus =
  asset.status === "Maintenance"
    ? "Maintenance"
    : getHealthStatus(asset.health);

const p = statusPalette[displayStatus];
  const [pressed, setPressed] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={() => navigate(`/assets/details/${asset.assetId}`)}
      style={{
        backgroundColor: card, borderRadius: "18px",
        boxShadow: pressed ? "none" : cardShadow,
        border: `1px solid ${border}`,
        marginBottom: "10px", overflow: "hidden",
        display: "flex",
        transform: pressed ? "scale(0.99)" : "scale(1)",
        transition: "all 0.12s ease",
        cursor: "pointer",
      }}
    >
      {/* Health color bar */}
      <div style={{ width: "4px", backgroundColor: p.color, flexShrink: 0 }} />

      {/* Main content */}
      <div style={{ flex: 1, padding: "14px 13px 13px" }}>

        {/* Row 1: Icon + Name + Status badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "11px", marginBottom: "8px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            backgroundColor: asset.iconTint,
            border: `1px solid ${asset.iconColor}20`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <asset.icon size={19} color={asset.iconColor} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
              <p style={{
                fontSize: "13.5px", fontWeight: 700, color: ink,
                lineHeight: 1.3, fontFamily: inter, flex: 1, minWidth: 0,
              }}>
                {asset.name}
              </p>
              {/* Status badge */}
              <span style={{
                fontSize: "9px", fontWeight: 700,
                color: p.color, backgroundColor: p.tint,
                borderRadius: "100px", padding: "3px 8px",
                flexShrink: 0, letterSpacing: "0.03em", fontFamily: inter,
                border: `1px solid ${p.color}20`,
              }}>
                {displayStatus}
              </span>
            </div>

            {/* Asset ID + Category */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
              <span style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter, fontWeight: 600 }}>
                {asset.assetId}
              </span>
              <div style={{ width: "3px", height: "3px", borderRadius: "50%", backgroundColor: border, flexShrink: 0 }} />
              <span style={{
                fontSize: "10px", fontWeight: 600,
                color: inkSec, backgroundColor: divider,
                borderRadius: "5px", padding: "1px 6px", fontFamily: inter,
              }}>
                {asset.category}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Health score bar */}
        <div style={{ marginBottom: "9px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "10.5px", color: inkMut, fontFamily: inter, fontWeight: 500 }}>
              Health Score
            </span>
            <span style={{
              fontSize: "11px", fontWeight: 800, color: p.color, fontFamily: inter,
              letterSpacing: "-0.02em",
            }}>
              {asset.health}%
            </span>
          </div>
          <div style={{ height: "5px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${asset.health}%`,
              background: p.bar, borderRadius: "100px",
            }} />
          </div>
        </div>

        {/* Row 3: Vendor + Last service + Arrow */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
              <Building2 size={11} color={inkFaint} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "10.5px", color: inkSec, fontFamily: inter, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {asset.vendor}
              </span>
            </div>
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={10} color={inkFaint} />
              <span style={{ fontSize: "10px", color: inkFaint, fontFamily: inter, whiteSpace: "nowrap" }}>
                {asset.lastService}
              </span>
            </div>
          </div>
          <div style={{
            width: "26px", height: "26px", borderRadius: "8px",
            backgroundColor: divider,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginLeft: "10px",
          }}>
            <ChevronRight size={14} color={inkFaint} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Floating action button ───────────────────────────────────────────────────
function FAB() {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        position: "absolute",
        bottom: "90px", right: "20px",
        height: "48px",
        display: "flex", alignItems: "center", gap: "8px",
        padding: "0 20px",
        background: `linear-gradient(135deg, ${blue}, ${blueDark})`,
        borderRadius: "100px", border: "none",
        boxShadow: pressed ? "none" : `${blueShadow}, 0 0 0 4px ${blueRing}`,
        cursor: "pointer", zIndex: 50,
        fontFamily: inter,
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "all 0.14s ease",
      }}
    >
      <div style={{
        width: "22px", height: "22px", borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Plus size={14} color="white" />
      </div>
      <span style={{ fontSize: "13.5px", fontWeight: 700, color: "white", letterSpacing: "0.01em" }}>
        Add Asset
      </span>
    </button>
  );
}

export function AssetListing() {
  const { assets, filteredAssets, activeFilterCount } = useAssetContext();
  const location = useLocation();

const selectedCategory =
  new URLSearchParams(location.search).get("category");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

const categoryFiltered = selectedCategory
  ? filteredAssets.filter(
      (a) => a.category === selectedCategory
    )
  : filteredAssets;
const localFiltered =
  activeFilter === "All"
    ? categoryFiltered
    : activeFilter === "Active"
    ? categoryFiltered.filter((a) => a.status === "Active")
    : activeFilter === "Maintenance"
    ? categoryFiltered.filter((a) => a.status === "Maintenance")
    : categoryFiltered.filter(
        (a) =>
          getHealthStatus(a.health) === activeFilter
      );

  const counts: Record<string, number> = {
    All: filteredAssets.length,
   Active: filteredAssets.filter((a) => a.status === "Active").length,

Healthy: filteredAssets.filter(
  (a) => getHealthStatus(a.health) === "Healthy"
).length,

Warning: filteredAssets.filter(
  (a) => getHealthStatus(a.health) === "Warning"
).length,

Critical: filteredAssets.filter(
  (a) => getHealthStatus(a.health) === "Critical"
).length,

Maintenance: filteredAssets.filter(
  (a) => a.status === "Maintenance"
).length,
  };

  return (
    <MobileLayout
      header={
        <>
          <StatusBar />
          <ListingHeader count={localFiltered.length} />
          <ListingSearch />
          <FilterChips active={activeFilter} onChange={setActiveFilter} counts={counts} />

          {/* ── Result info strip ── */}
          <div style={{
            backgroundColor: bg, padding: "10px 20px 4px",
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "12px", color: inkFaint, fontFamily: inter }}>
              Showing{" "}
              <span style={{ fontWeight: 700, color: ink }}>{localFiltered.length}</span>
              {" "}of{" "}
              <span style={{ fontWeight: 700, color: ink }}>{assets.length}</span>
              {" "}assets
            </span>
            <span style={{ fontSize: "11px", color: blue, fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>
              Sort by: Health ↓
            </span>
          </div>
        </>
      }
      scrollContainerStyle={{ padding: "6px 20px 100px" }}
      fab={<FAB />}
    >
        {localFiltered.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", paddingTop: "48px", gap: "12px",
          }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "20px",
              backgroundColor: divider,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Database size={28} color={inkFaint} />
            </div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter }}>No assets found</p>
            <p style={{ fontSize: "12.5px", color: inkMut, fontFamily: inter, textAlign: "center" }}>
              No assets match the selected filter.
            </p>
          </div>
        ) : (
          localFiltered.map((asset) => <AssetCard key={asset.id} asset={asset} />)
        )}
        {/* FAB spacer */}
        <div style={{ height: "24px" }} />
    </MobileLayout>
  );
}
