import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Bell, Search, X, TrendingUp, Zap,
  Filter, Check, MapPin, Activity, ChevronRight,
  AlertTriangle, Lightbulb, Clock, Target, CheckCircle2,
  RefreshCw, Loader,
} from "lucide-react";
import { handleBackNavigation } from "../utils/navigation";
import { MobileLayout } from "./ui/MobileLayout";
import {
  useRevenueContext, Opportunity, Priority, RevenueFilters, SortOrder, OppStatus,
} from "../contexts/RevenueContext";
import { publishEvent } from "../utils/eventBus";

// ─── Tokens ───────────────────────────────────────────────────────────────────
export const blue = "#2563EB"; export const blueDark = "#1D4ED8"; export const blueMid = "#3B82F6";
export const blueTint = "#EFF6FF"; export const blueRing = "rgba(37,99,235,0.12)";
export const green = "#16A34A"; export const greenT = "#DCFCE7";
export const orange = "#EA580C"; export const orangeT = "#FFF7ED";
export const purple = "#7C3AED"; export const purpleT = "#F5F3FF";
export const red = "#DC2626"; export const redT = "#FEF2F2";
export const amber = "#D97706"; export const amberT = "#FFFBEB";
export const teal = "#0891B2"; export const tealT = "#ECFEFF";
export const ink = "#0F172A"; export const inkSec = "#475569";
export const inkMut = "#64748B"; export const inkFaint = "#94A3B8";
export const bg = "#F8FAFC"; export const card = "#FFFFFF";
export const border = "#E2E8F0"; export const divider = "#F1F5F9";
export const inter = "'Inter','Roboto',sans-serif";
export const cardShadow = "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)";

// ─── Mobile-confined Bottom Sheet ────────────────────────────────────────────
function BottomSheet({ open, onClose, children, maxHeight = "85%" }:
  { open: boolean; onClose: () => void; children: React.ReactNode; maxHeight?: string }) {
  if (!open) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 200,
      backgroundColor: "rgba(15,23,42,0.55)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }} onClick={onClose}>
      <div style={{
        backgroundColor: card, borderTopLeftRadius: "20px", borderTopRightRadius: "20px",
        maxHeight, display: "flex", flexDirection: "column",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.14)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width: "40px", height: "4px", borderRadius: "2px", backgroundColor: "#CBD5E1", margin: "10px auto 0", flexShrink: 0 }} />
        {children}
      </div>
    </div>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────
export function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3, 5, 7, 9].map((h, i) => <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white" }} />)}
        </div>
        <div style={{ width: "22px", height: "11px", borderRadius: "2px", border: "1.5px solid white", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, right: "3px", backgroundColor: "white", borderRadius: "1px" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────
export function PageHeader({ title = "Revenue Intelligence", subtitle = "AI-powered operational savings", backPath = "/dashboard" }) {
  const navigate = useNavigate();
  const { liveSavings } = useRevenueContext();
  return (
    <div style={{ background: `linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <button type="button" onClick={() => handleBackNavigation(navigate, backPath)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}>
          <ArrowLeft size={15} color="white" />Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button type="button" style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Bell size={17} color="white" /></button>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(140deg,#334155,#1E293B)", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid rgba(255,255,255,0.2)" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "white", fontFamily: inter }}>AC</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: inter, marginBottom: "3px" }}>{title}</h1>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: inter }}>{subtitle}</p>
        </div>
        <div style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "100px", padding: "4px 12px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "white", fontFamily: inter }}>{liveSavings}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
export function SearchBar({ onFilterClick }: { onFilterClick: () => void }) {
  const { searchQuery, setSearchQuery, activeFilterCount } = useRevenueContext();
  const [f, setF] = useState(false);
  return (
    <div style={{ backgroundColor: card, padding: "12px 20px 0", flexShrink: 0 }}>
      <div style={{ height: "46px", borderRadius: "13px", backgroundColor: f ? card : bg, border: f ? `2px solid ${blue}` : `1.5px solid ${border}`, boxShadow: f ? `0 0 0 3px ${blueRing}` : cardShadow, display: "flex", alignItems: "center", gap: "10px", padding: "0 14px", transition: "all 0.18s" }}>
        <Search size={16} color={f ? blue : inkFaint} style={{ flexShrink: 0 }} />
        <input type="text" placeholder="Search asset, ID, location, category..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "13.5px", color: ink, fontFamily: inter }} />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery("")} style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={12} color={inkMut} />
          </button>
        )}
        <button type="button" onClick={onFilterClick} style={{ width: "30px", height: "30px", borderRadius: "9px", backgroundColor: activeFilterCount > 0 ? blueTint : divider, border: `1px solid ${activeFilterCount > 0 ? blue + "30" : border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
          <Filter size={13} color={activeFilterCount > 0 ? blue : inkFaint} />
          {activeFilterCount > 0 && (
            <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "13px", height: "13px", borderRadius: "50%", backgroundColor: blue, border: "1px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 700, color: "white" }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Status badge helper ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: OppStatus }) {
  const map: Record<OppStatus, { color: string; tint: string; label: string }> = {
    New:            { color: blue,   tint: blueTint, label: "New"            },
    "Action Started": { color: amber, tint: amberT,  label: "In Progress"    },
    Completed:      { color: green,  tint: greenT,   label: "Completed"      },
    Archived:       { color: inkMut, tint: divider,  label: "Archived"       },
  };
  const { color, tint, label } = map[status] ?? map.New;
  if (status === "New") return null; // Don't show badge for new items
  return (
    <span style={{ fontSize: "9px", fontWeight: 700, color, backgroundColor: tint, borderRadius: "100px", padding: "2px 7px", fontFamily: inter, border: `1px solid ${color}20`, marginLeft: "4px" }}>
      {label}
    </span>
  );
}

// ─── Primary action button label based on status ──────────────────────────────
function getPrimaryBtnLabel(opp: Opportunity): string {
  if (opp.status === "Action Started") {
    if (opp.primaryAction === "Create Work Order" || opp.primaryAction === "Schedule Maintenance") return "View Work Order";
    if (opp.primaryAction === "Create Purchase Request") return "View Request";
    return "View Action";
  }
  if (opp.status === "Completed") return "✓ Completed";
  return opp.primaryAction;
}

// ─── Opportunity Card ─────────────────────────────────────────────────────────
export function OpportunityCard({ opp, onView }: { opp: Opportunity; onView: () => void }) {
  const pp: Record<Priority, { color: string; tint: string }> = {
    High:   { color: red,   tint: redT   },
    Medium: { color: amber, tint: amberT },
    Low:    { color: green, tint: greenT },
  };
  const { color: pc, tint: pt } = pp[opp.priority];
  return (
    <div onClick={onView} style={{ backgroundColor: card, borderRadius: "18px", boxShadow: cardShadow, border: `1px solid ${border}`, marginBottom: "10px", overflow: "hidden", display: "flex", cursor: "pointer" }}>
      <div style={{ width: "4px", backgroundColor: opp.status === "Completed" ? inkFaint : opp.color, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "13px 14px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "7px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "10px", backgroundColor: opp.tint, border: `1px solid ${opp.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <opp.icon size={16} color={opp.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, lineHeight: 1.25 }}>{opp.title}</p>
              <StatusBadge status={opp.status} />
            </div>
            <p style={{ fontSize: "11.5px", fontWeight: 600, color: inkSec, fontFamily: inter, marginTop: "2px" }}>{opp.assetName} · <span style={{ color: inkFaint, fontWeight: 400 }}>{opp.assetId}</span></p>
          </div>
          <span style={{ fontSize: "9px", fontWeight: 700, color: pc, backgroundColor: pt, borderRadius: "100px", padding: "3px 8px", fontFamily: inter, flexShrink: 0 }}>{opp.priority}</span>
        </div>

        {/* Location chip */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
          <MapPin size={10} color={inkFaint} />
          <span style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter }}>{opp.location}</span>
          <span style={{ width: "3px", height: "3px", borderRadius: "50%", backgroundColor: inkFaint, margin: "0 2px" }} />
          <span style={{ fontSize: "10.5px", color: opp.color, fontFamily: inter, fontWeight: 600 }}>{opp.currentStatus}</span>
        </div>

        {/* Description */}
        <p style={{ fontSize: "11.5px", color: inkSec, fontFamily: inter, lineHeight: 1.5, marginBottom: "10px" }}>{opp.desc}</p>

        {/* Bottom row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "9.5px", color: inkFaint, fontFamily: inter, fontWeight: 500, marginBottom: "1px" }}>Est. Savings</p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: green, fontFamily: inter, letterSpacing: "-0.03em" }}>{opp.estimatedSavings}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ fontSize: "9.5px", color: inkFaint, fontFamily: inter, textAlign: "right" }}>
              <span style={{ display: "block", marginBottom: "1px" }}>AI Confidence</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: opp.aiConfidence >= 90 ? green : opp.aiConfidence >= 75 ? amber : red }}>{opp.aiConfidence}%</span>
            </div>
            <div style={{ width: "30px", height: "30px", borderRadius: "9px", backgroundColor: blueTint, border: `1px solid ${blue}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={16} color={blue} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Bottom Sheet ──────────────────────────────────────────────────────
export function FilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { filters, setFilters } = useRevenueContext();
  const [draft, setDraft] = useState<RevenueFilters>({ ...filters, type: new Set(filters.type), priority: new Set(filters.priority), category: new Set(filters.category), savingsRange: new Set(filters.savingsRange), confidence: new Set(filters.confidence) });

  useEffect(() => {
    if (open) setDraft({ type: new Set(filters.type), priority: new Set(filters.priority), category: new Set(filters.category), savingsRange: new Set(filters.savingsRange), confidence: new Set(filters.confidence) });
  }, [open, filters]);

  const toggle = (key: keyof RevenueFilters, value: string) => {
    setDraft(prev => { const next = new Set(prev[key]); if (next.has(value)) next.delete(value); else next.add(value); return { ...prev, [key]: next }; });
  };

  const FilterSection = ({ title, fKey, opts }: { title: string; fKey: keyof RevenueFilters; opts: string[] }) => (
    <div style={{ padding: "14px 20px", borderBottom: `1px solid ${divider}` }}>
      <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "10px" }}>{title}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
        {opts.map(opt => {
          const active = draft[fKey].has(opt);
          return (
            <button key={opt} type="button" onClick={() => toggle(fKey, opt)} style={{ padding: "7px 12px", borderRadius: "100px", cursor: "pointer", backgroundColor: active ? blueTint : card, border: `1px solid ${active ? blue : border}`, color: active ? blue : inkMut, fontSize: "12.5px", fontWeight: 600, fontFamily: inter, transition: "all 0.15s" }}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="92%">
      <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "17px", fontWeight: 800, color: ink, fontFamily: inter }}>Filters</p>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={inkSec} /></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        <FilterSection title="Opportunity Type" fKey="type" opts={["AMC Renewal", "Warranty Expiry", "Frequent Breakdown", "Preventive Maintenance", "Consumables Replacement", "IoT Monitoring"]} />
        <FilterSection title="Priority" fKey="priority" opts={["High", "Medium", "Low"]} />
        <FilterSection title="Asset Category" fKey="category" opts={["HVAC", "Power Systems", "Water Systems", "Electrical", "IT Equipment"]} />
        <FilterSection title="Estimated Savings" fKey="savingsRange" opts={["< ₹25K", "₹25K–₹1L", "> ₹1L"]} />
        <FilterSection title="AI Confidence" fKey="confidence" opts={["≥ 90%", "75–90%", "< 75%"]} />
        <div style={{ height: "10px" }} />
      </div>
      <div style={{ padding: "16px 20px 28px", borderTop: `1px solid ${border}`, display: "flex", gap: "10px", backgroundColor: card }}>
        <button type="button" onClick={() => setDraft({ type: new Set(), priority: new Set(), category: new Set(), savingsRange: new Set(), confidence: new Set() })} style={{ flex: 1, padding: "13px", borderRadius: "13px", backgroundColor: card, border: `1.5px solid ${border}`, fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, cursor: "pointer" }}>Reset</button>
        <button type="button" onClick={() => { setFilters(draft); onClose(); }} style={{ flex: 2, padding: "13px", borderRadius: "13px", backgroundColor: blue, border: "none", fontSize: "14px", fontWeight: 700, color: "white", fontFamily: inter, cursor: "pointer" }}>Apply Filters</button>
      </div>
    </BottomSheet>
  );
}

// ─── Sort Bottom Sheet ────────────────────────────────────────────────────────
export function SortSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sortOrder, setSortOrder } = useRevenueContext();
  const options: SortOrder[] = ["Highest Savings", "Lowest Cost", "Highest Priority", "Highest Confidence", "Most Urgent", "Newest Recommendation"];
  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="60%">
      <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${divider}`, textAlign: "center" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: ink, fontFamily: inter }}>Sort By</p>
      </div>
      <div style={{ overflowY: "auto" }}>
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => { setSortOrder(opt); onClose(); }} style={{ width: "100%", textAlign: "left", padding: "15px 20px", background: sortOrder === opt ? blueTint : "none", border: "none", borderBottom: `1px solid ${divider}`, fontSize: "14.5px", fontWeight: sortOrder === opt ? 600 : 400, color: sortOrder === opt ? blue : ink, cursor: "pointer", fontFamily: inter, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {opt}
            {sortOrder === opt && <Check size={17} color={blue} strokeWidth={3} />}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

// ─── Opportunity Details Sheet ────────────────────────────────────────────────
export function OpportunityDetailsSheet({ opp, onClose }: { opp: Opportunity | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { updateOpportunityStatus } = useRevenueContext();
  const [actionFeedback, setActionFeedback] = useState<"none" | "loading" | "done">("none");

  // Reset feedback when a different opportunity is opened
  useEffect(() => { setActionFeedback("none"); }, [opp?.id]);

  const handlePrimaryAction = () => {
    if (!opp) return;

    // "Create Work Order" → navigate to raise-ticket with prefill data
    if (opp.primaryAction === "Create Work Order" || opp.primaryAction === "Schedule Maintenance") {
      onClose();
      navigate("/raise-ticket", {
        state: {
          prefill: {
            title: opp.woIssue,
            category: opp.woCategory,
            asset: opp.assetName,
            priority: opp.priority === "High" ? "High" : opp.priority === "Medium" ? "Medium" : "Low",
            description: opp.woRecommendation,
            location: opp.location,
          },
          sourceOppId: opp.id,
        }
      });
      return;
    }

    if (opp.primaryAction === "Renew AMC" || opp.primaryAction === "Extend Warranty") {
      setActionFeedback("loading");
      setTimeout(() => {
        if (opp.primaryAction === "Renew AMC") {
          publishEvent({ type: 'AMC_RENEWAL_REQUESTED', payload: { assetId: opp.assetId || 'AST-10024', assetName: opp.assetName || 'Asset', requestedBy: 'Org' } });
        } else {
          publishEvent({ type: 'WARRANTY_EXTENSION_REQUESTED', payload: { assetId: opp.assetId || 'AST-10024', assetName: opp.assetName || 'Asset' } });
        }
        updateOpportunityStatus(opp.id, "Action Started");
        setActionFeedback("done");
        setTimeout(() => { onClose(); navigate("/assets/renewals"); }, 1200);
      }, 900);
      return;
    }

    if (opp.primaryAction === "Create Purchase Request") {
      publishEvent({ type: 'TICKET_CREATED', payload: { id: `TKT-${Date.now().toString().slice(-4)}`, title: 'Consumable Replacement', priority: 'Medium', status: 'Pending Review', assetId: opp.assetId || 'AST-10024', category: 'Procurement', location: opp.location || 'Main Facility' } });
      onClose();
      navigate("/raise-ticket", {
        state: {
          prefill: {
            title: opp.woIssue,
            category: opp.woCategory,
            asset: opp.assetName,
            priority: opp.priority === "Low" ? "Low" : "Medium",
            description: opp.woRecommendation,
            location: opp.location,
          },
          sourceOppId: opp.id,
        }
      });
      return;
    }

    // "View Recommendations" → navigate to asset details
    if (opp.primaryAction === "View Recommendations") {
      onClose();
      navigate(`/assets/details/${opp.assetId}`);
      return;
    }

    // Default fallback
    setActionFeedback("loading");
    setTimeout(() => {
      updateOpportunityStatus(opp.id, "Action Started");
      setActionFeedback("done");
    }, 900);
  };

  const handleViewAsset = () => {
    onClose();
    navigate(`/assets/details/${opp?.assetId}`);
  };

  if (!opp) return null;

  const confColor = opp.aiConfidence >= 90 ? green : opp.aiConfidence >= 75 ? amber : red;
  const confTint  = opp.aiConfidence >= 90 ? greenT : opp.aiConfidence >= 75 ? amberT : redT;

  const btnLabel = getPrimaryBtnLabel(opp);
  const isCompleted = opp.status === "Completed";
  const isInProgress = opp.status === "Action Started";

  return (
    <BottomSheet open={!!opp} onClose={onClose} maxHeight="90%">
      {/* Header */}
      <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: opp.tint, border: `1px solid ${opp.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <opp.icon size={20} color={opp.color} />
          </div>
          <div>
            <p style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter, marginBottom: "2px" }}>{opp.title}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <p style={{ fontSize: "11.5px", color: inkMut, fontFamily: inter }}>{opp.type}</p>
              <StatusBadge status={opp.status} />
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><X size={20} color={inkSec} /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", scrollbarWidth: "none" }}>

        {/* Feedback banner */}
        {actionFeedback === "done" && (
          <div style={{ backgroundColor: greenT, border: `1px solid ${green}30`, borderRadius: "12px", padding: "12px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} color={green} />
            <p style={{ fontSize: "13px", fontWeight: 700, color: green, fontFamily: inter }}>Action initiated successfully!</p>
          </div>
        )}
        {isInProgress && actionFeedback === "none" && (
          <div style={{ backgroundColor: amberT, border: `1px solid ${amber}30`, borderRadius: "12px", padding: "12px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={16} color={amber} />
            <p style={{ fontSize: "13px", fontWeight: 700, color: amber, fontFamily: inter }}>Work Order in progress · {opp.linkedWorkOrderId || "Pending ID"}</p>
          </div>
        )}
        {isCompleted && (
          <div style={{ backgroundColor: greenT, border: `1px solid ${green}30`, borderRadius: "12px", padding: "12px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} color={green} />
            <p style={{ fontSize: "13px", fontWeight: 700, color: green, fontFamily: inter }}>This recommendation has been completed.</p>
          </div>
        )}

        {/* Asset Info */}
        <div style={{ backgroundColor: bg, borderRadius: "14px", padding: "14px", marginBottom: "14px", border: `1px solid ${border}` }}>
          <p style={{ fontSize: "11.5px", fontWeight: 700, color: inkFaint, fontFamily: inter, marginBottom: "10px", letterSpacing: "0.05em" }}>AFFECTED ASSET</p>
          {[
            ["Asset Name", opp.assetName, ink],
            ["Asset ID", opp.assetId, blue],
            ["Category", opp.assetCategory, ink],
            ["Location", opp.location, ink],
          ].map(([label, val, color]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: inkMut, fontFamily: inter }}>{label}</span>
              <span style={{ fontSize: "12.5px", fontWeight: label === "Asset ID" ? 600 : 700, color: color as string, fontFamily: inter }}>{val as string}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: `1px solid ${border}` }}>
            <span style={{ fontSize: "12px", color: inkMut, fontFamily: inter }}>Current Status</span>
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: opp.color, fontFamily: inter }}>{opp.currentStatus}</span>
          </div>
        </div>

        {/* AI Insight */}
        <div style={{ backgroundColor: card, borderRadius: "14px", padding: "14px", marginBottom: "14px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", backgroundColor: purpleT, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lightbulb size={14} color={purple} />
            </div>
            <p style={{ fontSize: "12.5px", fontWeight: 700, color: purple, fontFamily: inter }}>AI Analysis</p>
            <div style={{ marginLeft: "auto", backgroundColor: confTint, borderRadius: "100px", padding: "3px 9px", border: `1px solid ${confColor}25` }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: confColor, fontFamily: inter }}>{opp.aiConfidence}% Confidence</span>
            </div>
          </div>
          <p style={{ fontSize: "12.5px", color: inkSec, fontFamily: inter, lineHeight: 1.6 }}>{opp.aiInsight}</p>
        </div>

        {/* Financial Impact */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
          <div style={{ flex: 1, backgroundColor: greenT, borderRadius: "14px", padding: "14px", border: `1px solid ${green}20` }}>
            <p style={{ fontSize: "10.5px", color: green, fontFamily: inter, fontWeight: 600, marginBottom: "4px" }}>Estimated Savings</p>
            <p style={{ fontSize: "18px", fontWeight: 800, color: green, fontFamily: inter, letterSpacing: "-0.03em" }}>{opp.estimatedSavings}</p>
          </div>
          <div style={{ flex: 1, backgroundColor: card, borderRadius: "14px", padding: "14px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
            <p style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter, fontWeight: 500, marginBottom: "4px" }}>Estimated Cost</p>
            <p style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.03em" }}>{opp.estimatedCost}</p>
          </div>
        </div>

        {/* Recommended Action */}
        <div style={{ backgroundColor: card, borderRadius: "14px", padding: "14px", marginBottom: "14px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Target size={14} color={blue} />
            <p style={{ fontSize: "12.5px", fontWeight: 700, color: ink, fontFamily: inter }}>Recommended Action</p>
          </div>
          <p style={{ fontSize: "12.5px", color: inkSec, fontFamily: inter, lineHeight: 1.6, marginBottom: "10px" }}>{opp.recommendedAction}</p>
          <div style={{ paddingTop: "10px", borderTop: `1px solid ${divider}` }}>
            <p style={{ fontSize: "10.5px", fontWeight: 600, color: inkFaint, fontFamily: inter, marginBottom: "4px" }}>EXPECTED IMPACT</p>
            <p style={{ fontSize: "12px", color: inkSec, fontFamily: inter, lineHeight: 1.55 }}>{opp.expectedImpact}</p>
          </div>
        </div>

        {/* Action Buttons */}
        {!isCompleted && (
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={actionFeedback === "loading"}
            style={{ width: "100%", padding: "15px", marginBottom: "10px", borderRadius: "14px", background: isInProgress ? `linear-gradient(135deg,${amber},#B45309)` : `linear-gradient(135deg,${blue},${blueDark})`, border: "none", color: "white", fontSize: "14.5px", fontWeight: 700, fontFamily: inter, cursor: actionFeedback === "loading" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: `0 4px 14px ${isInProgress ? amber : blue}35`, opacity: actionFeedback === "loading" ? 0.7 : 1 }}
          >
            {actionFeedback === "loading"
              ? <><Loader size={17} style={{ animation: "spin 1s linear infinite" }} /> Processing…</>
              : <><opp.icon size={17} /> {btnLabel}</>
            }
          </button>
        )}
        <button
          type="button"
          onClick={handleViewAsset}
          style={{ width: "100%", padding: "14px", marginBottom: "20px", borderRadius: "14px", backgroundColor: card, border: `1.5px solid ${border}`, color: ink, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <Activity size={15} color={blue} /> View Asset Details
        </button>
      </div>
    </BottomSheet>
  );
}



// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, color, tint }: any) {
  return (
    <div style={{ flex: 1, background: `radial-gradient(circle at 10% 15%,${tint} 0%,${card} 65%)`, borderRadius: "20px", padding: "14px 13px 12px", boxShadow: cardShadow, border: `1px solid ${border}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-16px", right: "-16px", width: "56px", height: "56px", borderRadius: "50%", backgroundColor: tint, opacity: 0.7 }} />
      <div style={{ width: "34px", height: "34px", borderRadius: "10px", backgroundColor: tint, border: `1px solid ${color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "9px" }}>
        <Icon size={16} color={color} />
      </div>
      <p style={{ fontSize: "20px", fontWeight: 800, color: ink, letterSpacing: "-0.04em", lineHeight: 1, fontFamily: inter, marginBottom: "3px" }}>{value}</p>
      <p style={{ fontSize: "10.5px", fontWeight: 600, color: inkMut, fontFamily: inter, marginBottom: "1px" }}>{label}</p>
      <p style={{ fontSize: "9.5px", color, fontFamily: inter, fontWeight: 600 }}>{sub}</p>
    </div>
  );
}

// ─── AI Summary Card ──────────────────────────────────────────────────────────
function AISummaryCard({ onViewAll }: { onViewAll: () => void }) {
  const { activeOpportunities, liveHighPriority, liveSavings } = useRevenueContext();
  return (
    <div style={{ borderRadius: "18px", background: `linear-gradient(150deg,#1E3A8A 0%,${blue} 100%)`, padding: "16px 16px 14px", marginBottom: "10px", boxShadow: "0 6px 24px rgba(29,78,216,0.28)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-24px", right: "-24px", width: "90px", height: "90px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={16} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "13.5px", fontWeight: 700, color: "white", fontFamily: inter }}>AI Savings Intelligence</p>
          <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.6)", fontFamily: inter }}>Powered by 10xDS Intelligence</p>
        </div>
        <div style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "100px", padding: "3px 9px", border: "1px solid rgba(255,255,255,0.2)" }}>
          <span style={{ fontSize: "9px", fontWeight: 700, color: "white", letterSpacing: "0.06em", fontFamily: inter }}>LIVE</span>
        </div>
      </div>
      <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.1)", marginBottom: "12px" }} />
      <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.84)", fontFamily: inter, lineHeight: 1.65, marginBottom: "14px" }}>
        AI has identified{" "}
        <span style={{ fontWeight: 700, color: "white" }}>{activeOpportunities.length} active recommendations</span>
        {" "}worth approximately{" "}
        <span style={{ fontWeight: 800, color: "#86EFAC" }}>{liveSavings}</span>
        {" "}across your assets.{" "}
        <span style={{ fontWeight: 700, color: "white" }}>{liveHighPriority} high-priority</span> items need immediate action.
      </p>
      <button type="button" onClick={onViewAll} style={{ width: "100%", height: "40px", borderRadius: "11px", backgroundColor: "rgba(255,255,255,0.14)", border: "1.5px solid rgba(255,255,255,0.28)", color: "white", fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
        View All Recommendations <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function RevenueIntelligenceScreen() {
  const navigate = useNavigate();
  const { filteredOpportunities, activeOpportunities, liveTotal, liveSavings, liveHighPriority, liveAvgConfidence } = useRevenueContext();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [viewOpp, setViewOpp] = useState<Opportunity | null>(null);

  return (
    <MobileLayout
      header={
        <>
          <StatusBar />
          <PageHeader />
          <SearchBar onFilterClick={() => setFilterOpen(true)} />
        </>
      }
      modals={
        <>
          <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} />
          <SortSheet open={sortOpen} onClose={() => setSortOpen(false)} />
          <OpportunityDetailsSheet opp={viewOpp} onClose={() => setViewOpp(null)} />
        </>
      }
    >
      {/* KPI row */}
      <div style={{ padding: "14px 16px 6px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <KPICard label="Active Opportunities" value={String(liveTotal)} sub="Across all assets" icon={TrendingUp} color={blue} tint={blueTint} />
          <KPICard label="Est. Total Savings" value={liveSavings} sub="Annual impact" icon={Target} color={green} tint={greenT} />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <KPICard label="High Priority" value={String(liveHighPriority)} sub="Need immediate action" icon={AlertTriangle} color={red} tint={redT} />
          <KPICard label="Avg AI Confidence" value={`${liveAvgConfidence}%`} sub="Recommendation accuracy" icon={Activity} color={purple} tint={purpleT} />
        </div>
      </div>

      {/* AI Summary */}
      <div style={{ padding: "14px 16px 4px" }}>
        <AISummaryCard onViewAll={() => navigate('/revenue-intelligence/opportunities')} />
      </div>

      {/* Opportunity list */}
      <div style={{ padding: "14px 16px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <p style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter }}>{filteredOpportunities.length} Recommendations</p>
          <span onClick={() => setSortOpen(true)} style={{ fontSize: "11px", color: blue, fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Sort ↓</span>
        </div>
        {filteredOpportunities.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "40px", gap: "12px" }}>
            <TrendingUp size={28} color={inkFaint} />
            <p style={{ fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter }}>No recommendations found</p>
          </div>
        ) : (
          filteredOpportunities.slice(0, 5).map(o => <OpportunityCard key={o.id} opp={o} onView={() => setViewOpp(o)} />)
        )}
      </div>
      <div style={{ height: "40px" }} />
    </MobileLayout>
  );
}
