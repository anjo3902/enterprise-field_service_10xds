import { handleBackNavigation } from "../utils/navigation";
import { BackHeader } from "./navigation/BackHeader";
import { MobileLayout } from "./ui/MobileLayout";
import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { useVendor } from "../contexts/VendorContext";
import { computeSLADisplay, mapVendorStatusToOrg, mapVendorSLAUrgency, formatTimestamp } from "../utils/slaAdapter";
import {
  ArrowLeft, Bell, User, Search, SlidersHorizontal, ArrowUpDown,
  Home, FileText, Database, Bot, Sparkles, Plus,
  AlertTriangle, CheckCircle2, Clock, ChevronRight, MoreHorizontal,
  MapPin, Building2, Wind, Zap, Monitor, Droplets, Settings2,
  X, Wrench, ClipboardList, Filter, MoveVertical,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = "Critical" | "High" | "Medium" | "Low";
type Status   = "Open" | "In Progress" | "Pending" | "Resolved" | "Closed";
type FilterKey = "All" | Status;

export interface AdvancedFilters {
  status: FilterKey;
  priority: Priority | "All";
  category: string;
  technician: string;
  date: string;
}

const DEFAULT_FILTERS: AdvancedFilters = { status: "All", priority: "All", category: "All", technician: "All", date: "All" };

interface Ticket {
  id: string; title: string; asset: string; assetIcon: any;
  assetColor: string; assetTint: string; location: string;
  priority: Priority; status: Status; assignee: string;
  slaRemaining: string; slaUrgency: "critical" | "warning" | "ok" | "breached";
  createdAt: string; progress: number; category: string; customer: string;
}

// ─── Palettes ─────────────────────────────────────────────────────────────────
const PRIORITY_P: Record<Priority, { color: string; tint: string }> = {
  Critical: { color: red,    tint: redT    },
  High:     { color: orange, tint: orangeT },
  Medium:   { color: amber,  tint: amberT  },
  Low:      { color: green,  tint: greenT  },
};
const STATUS_P: Record<Status, { color: string; tint: string; bar: string }> = {
  "Open":        { color: blue,   tint: blueTint, bar: `linear-gradient(90deg,${blue},${blueMid})`   },
  "In Progress": { color: purple, tint: purpleT,  bar: `linear-gradient(90deg,${purple},#9F7AEA)`    },
  "Pending":     { color: amber,  tint: amberT,   bar: `linear-gradient(90deg,${amber},#FCD34D)`     },
  "Resolved":    { color: green,  tint: greenT,   bar: `linear-gradient(90deg,${green},#4ADE80)`     },
  "Closed":      { color: inkMut, tint: divider,  bar: `linear-gradient(90deg,${inkMut},${inkFaint})`},
};
const SLA_COLOR: Record<string, string> = {
  critical: red, warning: amber, ok: green, breached: red,
};


// ─── Modals ───────────────────────────────────────────────────────────────────
function TicketActionsModal({ ticketId, onClose, onActionComplete }: { ticketId: string; onClose: () => void; onActionComplete: (msg: string) => void }) {
  const navigate = useNavigate();
  return (
    <div style={{ position:"absolute",inset:0,paddingBottom:"100px",backgroundColor:"rgba(15,23,42,0.65)",zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px",paddingBottom:"40px",animation:"slideUp 0.2s ease-out" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px" }}>
          <h3 style={{ fontSize:"18px",fontWeight:700,color:ink,margin:0,fontFamily:inter }}>Ticket Actions</h3>
          <button type="button" onClick={onClose} style={{ width:"32px",height:"32px",borderRadius:"100px",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><X size={16} color={inkMut}/></button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
          <button onClick={() => { navigate(`/ticket-details/${ticketId}`); onClose(); }} style={{ height:"52px",borderRadius:"12px",backgroundColor:bg,border:`1px solid ${border}`,display:"flex",alignItems:"center",gap:"12px",padding:"0 16px",cursor:"pointer",textAlign:"left" }}>
            <FileText size={18} color={blue}/> <span style={{ fontSize:"15px",fontWeight:600,color:ink,fontFamily:inter }}>View Details ({ticketId})</span>
          </button>
          <button onClick={() => { onActionComplete(`Ticket ${ticketId} reassigned successfully.`); onClose(); }} style={{ height:"52px",borderRadius:"12px",backgroundColor:bg,border:`1px solid ${border}`,display:"flex",alignItems:"center",gap:"12px",padding:"0 16px",cursor:"pointer",textAlign:"left" }}>
            <User size={18} color={purple}/> <span style={{ fontSize:"15px",fontWeight:600,color:ink,fontFamily:inter }}>Reassign Ticket</span>
          </button>
          <button onClick={() => { onActionComplete(`Ticket ${ticketId} escalated.`); onClose(); }} style={{ height:"52px",borderRadius:"12px",backgroundColor:bg,border:`1px solid ${border}`,display:"flex",alignItems:"center",gap:"12px",padding:"0 16px",cursor:"pointer",textAlign:"left" }}>
            <AlertTriangle size={18} color={amber}/> <span style={{ fontSize:"15px",fontWeight:600,color:ink,fontFamily:inter }}>Escalate Priority</span>
          </button>
          <button onClick={() => { onActionComplete(`Ticket ${ticketId} closed.`); onClose(); }} style={{ height:"52px",borderRadius:"12px",backgroundColor:bg,border:`1px solid ${border}`,display:"flex",alignItems:"center",gap:"12px",padding:"0 16px",cursor:"pointer",textAlign:"left" }}>
            <CheckCircle2 size={18} color={green}/> <span style={{ fontSize:"15px",fontWeight:600,color:ink,fontFamily:inter }}>Close Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterModal({ currentFilters, onApply, onClose }: { currentFilters: AdvancedFilters; onApply: (f: AdvancedFilters) => void; onClose: () => void }) {
  const [f, setF] = useState<AdvancedFilters>(currentFilters);
  const dropdownStyle = { width:"100%", height:"44px", borderRadius:"12px", border:`1.5px solid ${border}`, padding:"0 14px", fontSize:"14px", fontFamily:inter, color:ink, backgroundColor:bg };
  const labelStyle = { fontSize:"12.5px", fontWeight:600, color:inkSec, fontFamily:inter, marginBottom:"6px", display:"block" };

  return (
    <div style={{ position:"absolute",inset:0,paddingBottom:"100px",backgroundColor:"rgba(15,23,42,0.65)",zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px",paddingBottom:"40px",animation:"slideUp 0.2s ease-out" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px" }}>
          <h3 style={{ fontSize:"18px",fontWeight:700,color:ink,margin:0,fontFamily:inter }}>Advanced Filters</h3>
          <button type="button" onClick={onClose} style={{ width:"32px",height:"32px",borderRadius:"100px",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><X size={16} color={inkMut}/></button>
        </div>
        
        <div style={{ display:"flex", flexDirection:"column", gap:"16px", maxHeight:"400px", overflowY:"auto" }}>
          <div>
            <span style={labelStyle}>Status</span>
            <select style={dropdownStyle} value={f.status} onChange={e=>setF({...f, status: e.target.value as FilterKey})}>
              <option value="All">All</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <span style={labelStyle}>Priority</span>
            <select style={dropdownStyle} value={f.priority} onChange={e=>setF({...f, priority: e.target.value as any})}>
              <option value="All">All</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <span style={labelStyle}>Category</span>
            <select style={dropdownStyle} value={f.category} onChange={e=>setF({...f, category: e.target.value})}>
              <option value="All">All Categories</option>
              <option value="HVAC">HVAC</option>
              <option value="Power">Power</option>
              <option value="IT">IT</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Security">Security</option>
            </select>
          </div>
          <div>
            <span style={labelStyle}>Assigned Technician</span>
            <select style={dropdownStyle} value={f.technician} onChange={e=>setF({...f, technician: e.target.value})}>
              <option value="All">All Technicians</option>
              <option value="Unassigned">Unassigned</option>
              <option value="Rahul Sharma">Rahul Sharma</option>
              <option value="Priya Nair">Priya Nair</option>
              <option value="John David">John David</option>
              <option value="Vikram Das">Vikram Das</option>
              <option value="Anita Roy">Anita Roy</option>
            </select>
          </div>
          <div>
            <span style={labelStyle}>Date</span>
            <select style={dropdownStyle} value={f.date} onChange={e=>setF({...f, date: e.target.value})}>
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
            </select>
          </div>
        </div>

        <div style={{ display:"flex", gap:"10px", marginTop:"24px" }}>
          <button type="button" onClick={() => setF(DEFAULT_FILTERS)} style={{ flex:1, height:"48px", borderRadius:"12px", backgroundColor:divider, border:"none", color:inkSec, fontSize:"15px", fontWeight:700, fontFamily:inter, cursor:"pointer" }}>Reset</button>
          <button type="button" onClick={() => onApply(f)} style={{ flex:2, height:"48px", borderRadius:"12px", background:`linear-gradient(135deg,${blue},${blueDark})`, border:"none", color:"white", fontSize:"15px", fontWeight:700, fontFamily:inter, cursor:"pointer", boxShadow:blueShadow }}>Apply Filters</button>
        </div>
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const ALL_TICKETS: Ticket[] = [
  {
    id: "SR-10452", title: "Air Conditioning Failure – Block C",
    asset: "AC Unit A12", assetIcon: Wind, assetColor: teal, assetTint: tealT,
    location: "Block C, Rooftop", priority: "Critical", status: "In Progress",
    assignee: "Rahul Sharma", slaRemaining: "18 min", slaUrgency: "critical",
    createdAt: "Today, 09:15 AM", progress: 55, category: "HVAC", customer: "Alpha Corp",
  },
  {
    id: "SR-10447", title: "Generator Startup Failure – Block B",
    asset: "Generator G-04", assetIcon: Zap, assetColor: amber, assetTint: amberT,
    location: "Block B, Level 1", priority: "Critical", status: "Open",
    assignee: "Priya Nair", slaRemaining: "6 min", slaUrgency: "critical",
    createdAt: "Today, 08:50 AM", progress: 10, category: "Power", customer: "Beta Industries",
  },
  {
    id: "SR-10433", title: "Network Connectivity Issues – Server Room",
    asset: "Server Rack A1", assetIcon: Monitor, assetColor: blue, assetTint: blueTint,
    location: "Basement, Server Room", priority: "Medium", status: "In Progress",
    assignee: "John David", slaRemaining: "2 hrs 14 min", slaUrgency: "ok",
    createdAt: "Today, 07:30 AM", progress: 70, category: "IT", customer: "Gamma Tech",
  },
  {
    id: "SR-10429", title: "Water Leakage – Floor 7 Restroom",
    asset: "Water Pump WP-02", assetIcon: Droplets, assetColor: blue, assetTint: blueTint,
    location: "Tower A, Floor 7", priority: "High", status: "Pending",
    assignee: "Unassigned", slaRemaining: "42 min", slaUrgency: "warning",
    createdAt: "Today, 06:00 AM", progress: 20, category: "Plumbing", customer: "Delta Operations",
  },
  {
    id: "SR-10418", title: "HVAC Filter Replacement – Block D",
    asset: "HVAC Chiller Unit", assetIcon: Settings2, assetColor: inkMut, assetTint: divider,
    location: "Block D, Rooftop", priority: "Low", status: "Resolved",
    assignee: "Vikram Das", slaRemaining: "Completed", slaUrgency: "ok",
    createdAt: "Yesterday, 02:30 PM", progress: 100, category: "HVAC", customer: "Alpha Corp",
  },
  {
    id: "SR-10401", title: "CCTV Camera Offline – Main Gate",
    asset: "CCTV Network", assetIcon: Monitor, assetColor: purple, assetTint: purpleT,
    location: "Main Gate, Ground", priority: "High", status: "Closed",
    assignee: "Anita Roy", slaRemaining: "Closed", slaUrgency: "ok",
    createdAt: "Yesterday, 10:00 AM", progress: 100, category: "Security", customer: "Omega Logistics",
  },
];

// ─── Category icon/color mapping ─────────────────────────────────────────────
function getCategoryAsset(category: string): { assetIcon: any; assetColor: string; assetTint: string } {
  switch (category) {
    case "HVAC":        return { assetIcon: Wind,     assetColor: teal,   assetTint: tealT   };
    case "Electrical":  return { assetIcon: Zap,      assetColor: amber,  assetTint: amberT  };
    case "Power":       return { assetIcon: Zap,      assetColor: amber,  assetTint: amberT  };
    case "IT":          return { assetIcon: Monitor,  assetColor: blue,   assetTint: blueTint };
    case "Plumbing":    return { assetIcon: Droplets, assetColor: blue,   assetTint: blueTint };
    case "Fire Safety": return { assetIcon: AlertTriangle, assetColor: red,    assetTint: redT    };
    case "Elevators":   return { assetIcon: MoveVertical, assetColor: purple, assetTint: purpleT };
    default:            return { assetIcon: Settings2, assetColor: inkMut, assetTint: divider };
  }
}

const FILTER_DEFS: { label: FilterKey; color: string; tint: string }[] = [
  { label: "All",         color: blue,   tint: blueTint },
  { label: "Open",        color: blue,   tint: blueTint },
  { label: "In Progress", color: purple, tint: purpleT  },
  { label: "Pending",     color: amber,  tint: amberT   },
  { label: "Resolved",    color: green,  tint: greenT   },
  { label: "Closed",      color: inkMut, tint: divider  },
];

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px 6px", backgroundColor:"#0052CC", flexShrink:0 }}>
      <span style={{ fontSize:"12px", fontWeight:600, color:"white", fontFamily:inter }}>9:41</span>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:"2px" }}>
          {[3,5,7,9].map((h,i)=><div key={i} style={{ width:"3px",height:`${h}px`,borderRadius:"1px",backgroundColor:"white" }}/>)}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"2px" }}>
          <div style={{ width:"22px",height:"11px",borderRadius:"2px",border:"1.5px solid white",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",inset:0,right:"3px",backgroundColor:"white",borderRadius:"1px" }}/>
          </div>
          <div style={{ width:"2px",height:"5px",borderRadius:"1px",backgroundColor:"white" }}/>
        </div>
      </div>
    </div>
  );
}


// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, onFilterClick }: { value: string; onChange: (v: string) => void; onFilterClick: () => void; }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ backgroundColor:card, padding:"12px 20px 0", flexShrink:0 }}>
      <div style={{ height:"46px",borderRadius:"13px",backgroundColor:focused?card:bg,border:focused?`2px solid ${blue}`:`1.5px solid ${border}`,boxShadow:focused?`0 0 0 3px ${blueRing}`:cardShadow,display:"flex",alignItems:"center",gap:"10px",padding:"0 14px",transition:"all 0.18s ease" }}>
        <Search size={16} color={focused?blue:inkFaint} style={{ flexShrink:0,transition:"color 0.18s" }}/>
        <input type="text" placeholder="Search tickets, asset, location…" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ flex:1,border:"none",outline:"none",background:"transparent",fontSize:"13.5px",color:ink,fontFamily:inter }}/>
        {value ? (
          <button type="button" onClick={()=>onChange("")} style={{ width:"22px",height:"22px",borderRadius:"50%",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
            <X size={12} color={inkMut}/>
          </button>
        ) : (
          <div style={{ width:"1px",height:"20px",backgroundColor:border,flexShrink:0 }}/>
        )}
        {!value && (
          <button type="button" onClick={onFilterClick} style={{ width:"30px",height:"30px",borderRadius:"9px",backgroundColor:focused?blueTint:divider,border:`1px solid ${focused?blue+"30":border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.18s" }}>
            <Filter size={13} color={focused?blue:inkFaint}/>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────
function FilterChips({ active, onChange, counts }: { active: FilterKey; onChange: (f: FilterKey) => void; counts: Record<string,number> }) {
  return (
    <div style={{ backgroundColor:card, borderBottom:`1px solid ${border}`, padding:"10px 20px 12px", flexShrink:0 }}>
      <div style={{ display:"flex",gap:"7px",overflowX:"auto",scrollbarWidth:"none" }}>
        {FILTER_DEFS.map(f=>{
          const on = active===f.label;
          return (
            <button key={f.label} type="button" onClick={()=>onChange(f.label)} style={{ display:"inline-flex",alignItems:"center",gap:"5px",height:"32px",borderRadius:"100px",padding:"0 12px",backgroundColor:on?f.color:card,border:`1.5px solid ${on?f.color:border}`,cursor:"pointer",flexShrink:0,boxShadow:on?`0 2px 8px ${f.color}30`:"none",transition:"all 0.15s ease",fontFamily:inter }}>
              <span style={{ fontSize:"12px",fontWeight:600,color:on?"white":inkSec,whiteSpace:"nowrap" }}>{f.label}</span>
              <span style={{ fontSize:"10px",fontWeight:700,color:on?"rgba(255,255,255,0.75)":inkFaint,backgroundColor:on?"rgba(255,255,255,0.2)":divider,borderRadius:"100px",padding:"1px 6px",minWidth:"16px",textAlign:"center" }}>{counts[f.label]??0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sort / filter row ────────────────────────────────────────────────────────
function SortRow({ count, total, activeSort, onSortChange, onFilterClick }: { count: number; total: number; activeSort: string; onSortChange: (v: string) => void; onFilterClick: () => void; }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px 4px",backgroundColor:bg,flexShrink:0 }}>
      <span style={{ fontSize:"12px",color:inkFaint,fontFamily:inter }}>
        Showing <span style={{ fontWeight:700,color:ink }}>{count}</span> of <span style={{ fontWeight:700,color:ink }}>{total}</span> tickets
      </span>
      <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
        <div style={{ position: "relative" }}>
          <button type="button" style={{ display:"inline-flex",alignItems:"center",gap:"4px",height:"28px",borderRadius:"8px",padding:"0 10px",backgroundColor:card,border:`1px solid ${border}`,cursor:"pointer",fontFamily:inter,boxShadow:"0 1px 2px rgba(0,0,0,0.04)" }}>
            <ArrowUpDown size={12} color={inkMut}/>
            <span style={{ fontSize:"11px",fontWeight:600,color:inkSec }}>{activeSort}</span>
          </button>
          <select value={activeSort} onChange={(e) => onSortChange(e.target.value)} style={{ position:"absolute", inset:0, opacity:0, width:"100%", height:"100%", cursor:"pointer" }}>
            <option value="Latest">Latest</option>
            <option value="Oldest">Oldest</option>
            <option value="Priority">Priority</option>
            <option value="SLA Remaining">SLA Remaining</option>
          </select>
        </div>
        <button type="button" onClick={onFilterClick} style={{ display:"inline-flex",alignItems:"center",gap:"4px",height:"28px",borderRadius:"8px",padding:"0 10px",backgroundColor:card,border:`1px solid ${border}`,cursor:"pointer",fontFamily:inter,boxShadow:"0 1px 2px rgba(0,0,0,0.04)" }}>
          <SlidersHorizontal size={12} color={inkMut}/>
          <span style={{ fontSize:"11px",fontWeight:600,color:inkSec }}>Filter</span>
        </button>
      </div>
    </div>
  );
}


// ─── Ticket card ──────────────────────────────────────────────────────────────
function TicketCard({ ticket, onClick, onMoreClick }: { ticket: Ticket; onClick: () => void; onMoreClick: (e: React.MouseEvent) => void }) {
  const pp = PRIORITY_P[ticket.priority];
  const sp = STATUS_P[ticket.status];
  const slaColor = SLA_COLOR[ticket.slaUrgency];
  const [pressed, setPressed] = useState(false);
  const isResolved = ticket.status === "Resolved" || ticket.status === "Closed";

  return (
    <div
      onPointerDown={()=>setPressed(true)}
      onPointerUp={()=>setPressed(false)}
      onPointerLeave={()=>setPressed(false)}
      onClick={onClick}
      style={{ backgroundColor:card,borderRadius:"18px",boxShadow:pressed?"none":cardShadow,border:`1px solid ${pressed?pp.color+"35":border}`,marginBottom:"10px",overflow:"hidden",display:"flex",transform:pressed?"scale(0.99)":"scale(1)",transition:"all 0.12s ease",cursor:"pointer" }}
    >
      {/* Priority bar */}
      <div style={{ width:"4px",backgroundColor:pp.color,flexShrink:0 }}/>

      <div style={{ flex:1,padding:"13px 13px 12px" }}>
        {/* Row 1: ID + category + overflow */}
        <div style={{ display:"flex",alignItems:"center",gap:"6px",marginBottom:"5px" }}>
          <span style={{ fontSize:"10.5px",fontWeight:700,color:inkFaint,fontFamily:inter,letterSpacing:"0.02em" }}>{ticket.id}</span>
          <span style={{ fontSize:"9.5px",fontWeight:600,color:inkSec,backgroundColor:divider,borderRadius:"5px",padding:"1px 6px",fontFamily:inter }}>{ticket.category}</span>
          <div style={{ flex:1 }}/>
          <button type="button" onClick={onMoreClick} style={{ width:"26px",height:"26px",borderRadius:"7px",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
            <MoreHorizontal size={14} color={inkFaint}/>
          </button>
        </div>

        {/* Row 2: Title */}
        <p style={{ fontSize:"13.5px",fontWeight:700,color:ink,lineHeight:1.3,fontFamily:inter,marginBottom:"6px" }}>{ticket.title}</p>

        {/* Row 3: Asset + Location */}
        <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"8px",flexWrap:"wrap" as const }}>
          <div style={{ display:"flex",alignItems:"center",gap:"5px" }}>
            <div style={{ width:"20px",height:"20px",borderRadius:"6px",backgroundColor:ticket.assetTint,border:`1px solid ${ticket.assetColor}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <ticket.assetIcon size={11} color={ticket.assetColor}/>
            </div>
            <span style={{ fontSize:"11px",color:inkSec,fontFamily:inter,fontWeight:500 }}>{ticket.asset}</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:"4px" }}>
            <MapPin size={11} color={inkFaint}/>
            <span style={{ fontSize:"10.5px",color:inkFaint,fontFamily:inter }}>{ticket.location}</span>
          </div>
        </div>

        {/* Row 4: Priority + Status + SLA */}
        <div style={{ display:"flex",alignItems:"center",gap:"6px",marginBottom:"8px",flexWrap:"wrap" as const }}>
          <span style={{ fontSize:"9.5px",fontWeight:700,color:pp.color,backgroundColor:pp.tint,borderRadius:"100px",padding:"3px 8px",border:`1px solid ${pp.color}22`,fontFamily:inter,letterSpacing:"0.02em" }}>{ticket.priority}</span>
          <span style={{ fontSize:"9.5px",fontWeight:700,color:sp.color,backgroundColor:sp.tint,borderRadius:"100px",padding:"3px 8px",border:`1px solid ${sp.color}22`,fontFamily:inter }}>{ticket.status}</span>
          <div style={{ flex:1 }}/>
          {/* SLA time */}
          <div style={{ display:"flex",alignItems:"center",gap:"4px" }}>
            <Clock size={11} color={slaColor}/>
            <span style={{ fontSize:"10.5px",fontWeight:700,color:slaColor,fontFamily:inter }}>{ticket.slaRemaining}</span>
          </div>
        </div>

        {/* Row 5: Progress bar */}
        {!isResolved && (
          <div style={{ marginBottom:"8px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
              <span style={{ fontSize:"9.5px",color:inkFaint,fontFamily:inter,fontWeight:500 }}>Progress</span>
              <span style={{ fontSize:"9.5px",fontWeight:700,color:sp.color,fontFamily:inter }}>{ticket.progress}%</span>
            </div>
            <div style={{ height:"4px",backgroundColor:divider,borderRadius:"100px",overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${ticket.progress}%`,background:sp.bar,borderRadius:"100px" }}/>
            </div>
          </div>
        )}
        {isResolved && (
          <div style={{ display:"flex",alignItems:"center",gap:"5px",marginBottom:"8px" }}>
            <CheckCircle2 size={13} color={green}/>
            <span style={{ fontSize:"11px",fontWeight:600,color:green,fontFamily:inter }}>{ticket.status === "Resolved" ? "Resolved successfully" : "Closed"}</span>
          </div>
        )}

        {/* Row 6: Assignee + Created */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:`1px solid ${divider}`,paddingTop:"8px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
            {ticket.assignee === "Unassigned" ? (
              <div style={{ width:"20px",height:"20px",borderRadius:"6px",backgroundColor:divider,border:`1px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <User size={11} color={inkFaint}/>
              </div>
            ) : (
              <div style={{ width:"20px",height:"20px",borderRadius:"6px",background:`linear-gradient(135deg,${blue},${blueDark})`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <User size={11} color="white"/>
              </div>
            )}
            <span style={{ fontSize:"11px",color:ticket.assignee==="Unassigned"?inkFaint:inkSec,fontFamily:inter,fontWeight:ticket.assignee==="Unassigned"?400:500,fontStyle:ticket.assignee==="Unassigned"?"italic":"normal" }}>{ticket.assignee}</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:"4px" }}>
            <Clock size={10} color={inkFaint}/>
            <span style={{ fontSize:"10.5px",color:inkFaint,fontFamily:inter }}>{ticket.createdAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  const navigate = useNavigate();
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:"60px",gap:"16px" }}>
      <div style={{ width:"88px",height:"88px",borderRadius:"26px",background:`linear-gradient(135deg,${blueTint},${divider})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 20px ${blue}15` }}>
        <ClipboardList size={40} color={inkFaint}/>
      </div>
      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:"17px",fontWeight:800,color:ink,fontFamily:inter,letterSpacing:"-0.02em",marginBottom:"6px" }}>No Tickets Yet</p>
        <p style={{ fontSize:"13px",color:inkMut,fontFamily:inter,lineHeight:1.6,maxWidth:"240px",margin:"0 auto" }}>
          You haven't raised any service requests. Tap the button below to get started.
        </p>
      </div>
      <button type="button" onClick={() => navigate('/raise-ticket')} style={{ height:"44px",borderRadius:"12px",padding:"0 24px",background:`linear-gradient(135deg,${blue},${blueDark})`,border:"none",color:"white",fontSize:"13.5px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",gap:"7px",boxShadow:blueShadow }}>
        <Plus size={16}/> Raise First Ticket
      </button>
    </div>
  );
}


// ─── No results state ─────────────────────────────────────────────────────────
function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:"48px",gap:"14px" }}>
      <div style={{ width:"72px",height:"72px",borderRadius:"22px",backgroundColor:divider,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <Search size={30} color={inkFaint}/>
      </div>
      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:"16px",fontWeight:800,color:ink,fontFamily:inter,marginBottom:"5px" }}>No Results Found</p>
        <p style={{ fontSize:"12.5px",color:inkMut,fontFamily:inter,lineHeight:1.55 }}>
          No tickets match{" "}
          {query && <><strong style={{ color:blue }}>"{query}"</strong>{" "}</>}
          Try adjusting your search or filter.
        </p>
      </div>
      <button type="button" onClick={onClear} style={{ height:"38px",borderRadius:"100px",padding:"0 18px",backgroundColor:blueTint,border:`1.5px solid ${blue}30`,color:blue,fontSize:"13px",fontWeight:600,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",gap:"6px" }}>
        <X size={13}/> Clear search
      </button>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function SkeletonCard({ index = 0 }: { index?: number }) {
  const delay = `${index * 150}ms`;
  return (
    <div style={{ backgroundColor:card,borderRadius:"18px",boxShadow:cardShadow,border:`1px solid ${border}`,marginBottom:"10px",overflow:"hidden",display:"flex",height:"158px",animationDelay:delay }}>
      <div style={{ width:"4px",backgroundColor:divider,flexShrink:0 }}/>
      <div style={{ flex:1,padding:"13px 13px 12px",display:"flex",flexDirection:"column",gap:"10px" }}>
        <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
          <div style={{ width:"64px",height:"12px",borderRadius:"6px",backgroundColor:divider,animation:"pulse 1.5s ease-in-out infinite",animationDelay:delay }}/>
          <div style={{ width:"40px",height:"12px",borderRadius:"6px",backgroundColor:divider,animation:"pulse 1.5s ease-in-out infinite",animationDelay:delay }}/>
        </div>
        <div style={{ width:"85%",height:"14px",borderRadius:"6px",backgroundColor:divider,animation:"pulse 1.5s ease-in-out infinite",animationDelay:delay }}/>
        <div style={{ width:"60%",height:"12px",borderRadius:"6px",backgroundColor:divider,animation:"pulse 1.5s ease-in-out infinite",animationDelay:delay }}/>
        <div style={{ display:"flex",gap:"6px" }}>
          <div style={{ width:"56px",height:"20px",borderRadius:"100px",backgroundColor:divider,animation:"pulse 1.5s ease-in-out infinite",animationDelay:delay }}/>
          <div style={{ width:"72px",height:"20px",borderRadius:"100px",backgroundColor:divider,animation:"pulse 1.5s ease-in-out infinite",animationDelay:delay }}/>
        </div>
        <div style={{ width:"100%",height:"4px",borderRadius:"100px",backgroundColor:divider,animation:"pulse 1.5s ease-in-out infinite",animationDelay:delay }}/>
        <div style={{ display:"flex",justifyContent:"space-between",paddingTop:"4px",borderTop:`1px solid ${divider}` }}>
          <div style={{ width:"80px",height:"12px",borderRadius:"6px",backgroundColor:divider,animation:"pulse 1.5s ease-in-out infinite",animationDelay:delay }}/>
          <div style={{ width:"64px",height:"12px",borderRadius:"6px",backgroundColor:divider,animation:"pulse 1.5s ease-in-out infinite",animationDelay:delay }}/>
        </div>
      </div>
    </div>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────
function FAB({ onClick }: { onClick: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      onPointerDown={()=>setPressed(true)}
      onPointerUp={()=>setPressed(false)}
      onPointerLeave={()=>setPressed(false)}
      onClick={onClick}
      style={{ position:"absolute",bottom:"82px",right:"20px",height:"50px",display:"flex",alignItems:"center",gap:"9px",padding:"0 22px",background:`linear-gradient(135deg,${blue},${blueDark})`,borderRadius:"100px",border:"none",boxShadow:pressed?"none":`${blueShadow}, 0 0 0 4px ${blueRing}`,cursor:"pointer",zIndex:50,transform:pressed?"scale(0.96)":"scale(1)",transition:"all 0.14s ease",fontFamily:inter }}
    >
      <div style={{ width:"24px",height:"24px",borderRadius:"50%",backgroundColor:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <Plus size={15} color="white"/>
      </div>
      <span style={{ fontSize:"14px",fontWeight:700,color:"white",letterSpacing:"0.01em" }}>Raise Ticket</span>
    </button>
  );
}

export function MyTickets() {
  const navigate = useNavigate();
  const location = useLocation();
  const [successMsg, setSuccessMsg] = useState("");
  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3500); };
  const [query,        setQuery]     = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const [sortActive,   setSortActive] = useState("Latest");
  const [actionsTicketId, setActionsTicketId] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  // ── Single source of truth: VendorContext tickets → Ticket display format ──
  const vendor = useVendor();

  // Map vendor tickets to the Ticket display shape
  const tickets = useMemo<Ticket[]>(() =>
    vendor.tickets.map(t => {
      const { assetIcon, assetColor, assetTint } = getCategoryAsset(t.category);
      const slaDisp = computeSLADisplay(t.slaDeadline);
      const orgStatus = mapVendorStatusToOrg(t.status);
      const progress = t.status === "Completed" || t.status === "Closed" ? 100 :
                       orgStatus === "In Progress" ? 55 :
                       orgStatus === "Open" ? 10 : 30;
      return {
        id: t.id,
        title: t.title,
        asset: t.assetName ?? t.category,
        assetIcon,
        assetColor,
        assetTint,
        location: t.location + (t.floor ? `, ${t.floor}` : ""),
        priority: t.priority as Priority,
        status: orgStatus as Status,
        assignee: t.assignedTechnicianName ?? "Unassigned",
        slaRemaining: slaDisp.remaining,
        slaUrgency: slaDisp.urgency as "critical" | "warning" | "ok" | "breached",
        createdAt: formatTimestamp(t.createdAt),
        progress,
        category: t.category,
        customer: t.customerName,
      };
    }),
    [vendor.tickets]
  );

  const filtered = tickets.filter(t => {
    const qMatch = !query.trim() ||
      t.id.toLowerCase().includes(query.toLowerCase()) ||
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.asset.toLowerCase().includes(query.toLowerCase()) ||
      t.location.toLowerCase().includes(query.toLowerCase()) ||
      t.category.toLowerCase().includes(query.toLowerCase()) ||
      t.customer.toLowerCase().includes(query.toLowerCase());
    
    if (!qMatch) return false;

    if (advancedFilters.status !== "All" && t.status !== advancedFilters.status) return false;
    if (advancedFilters.priority !== "All" && t.priority !== advancedFilters.priority) return false;
    if (advancedFilters.category !== "All" && t.category !== advancedFilters.category) return false;
    if (advancedFilters.technician !== "All" && t.assignee !== advancedFilters.technician && !(advancedFilters.technician === "Unassigned" && t.assignee === "Unassigned")) return false;
    
    if (advancedFilters.date !== "All") {
       if (advancedFilters.date === "Today") {
          if (!t.createdAt.includes("Today") && !t.createdAt.includes("Just now") && !t.createdAt.includes("min ago")) return false;
       } else if (advancedFilters.date === "Last 7 Days") {
          if (!t.createdAt.includes("Today") && !t.createdAt.includes("Yesterday") && !t.createdAt.includes("Just now") && !t.createdAt.includes("ago")) return false;
       }
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortActive === "Priority") {
      const pmap: Record<string, number> = { "Critical": 4, "High": 3, "Medium": 2, "Low": 1 };
      return (pmap[b.priority] || 0) - (pmap[a.priority] || 0);
    }
    if (sortActive === "SLA Remaining") {
      const smap: Record<string, number> = { "breached": 4, "critical": 3, "warning": 2, "ok": 1 };
      return (smap[b.slaUrgency] || 0) - (smap[a.slaUrgency] || 0);
    }
    if (sortActive === "Oldest") {
       return a.id.localeCompare(b.id);
    }
    // Default: Latest
    return b.id.localeCompare(a.id);
  });

  const counts: Record<string,number> = {
    All:           tickets.length,
    "Open":        tickets.filter(t=>t.status==="Open").length,
    "In Progress": tickets.filter(t=>t.status==="In Progress").length,
    "Pending":     tickets.filter(t=>t.status==="Pending").length,
    "Resolved":    tickets.filter(t=>t.status==="Resolved").length,
    "Closed":      tickets.filter(t=>t.status==="Closed").length,
  };

  const loading = false; // VendorContext data is synchronous — no async loading needed
  const showEmpty   = !loading && tickets.length === 0;
  const showNoRes   = !loading && tickets.length > 0 && sorted.length === 0;
  const showList    = !loading && sorted.length > 0;

  return (
    <MobileLayout
      header={
        <>
          <StatusBar/>
          <BackHeader 
            title="My Tickets" 
            subtitle="Track and manage your service requests" 
            fallbackRoute="/dashboard" 
            rightActions={
              <>
                <div style={{ position:"relative" }}>
                  <button type="button" style={{ width:"36px",height:"36px",borderRadius:"10px",backgroundColor:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.22)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
                    <Bell size={17} color="white"/>
                  </button>
                  <div style={{ position:"absolute",top:"6px",right:"6px",width:"7px",height:"7px",borderRadius:"50%",backgroundColor:red,border:"1.5px solid #0052CC" }}/>
                </div>
                <div style={{ width:"36px",height:"36px",borderRadius:"10px",background:"linear-gradient(140deg,#334155,#1E293B)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(255,255,255,0.2)" }}>
                  <span style={{ fontSize:"12px",fontWeight:700,color:"white",fontFamily:inter }}>AC</span>
                </div>
              </>
            }
            bottomRightContent={
              <div style={{ backgroundColor:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:"100px",padding:"4px 12px" }}>
                <span style={{ fontSize:"12px",fontWeight:700,color:"white",fontFamily:inter }}>{sorted.length} tickets</span>
              </div>
            }
          />
          <SearchBar value={query} onChange={setQuery} onFilterClick={() => setShowFilterModal(true)}/>
          <FilterChips active={advancedFilters.status} onChange={(f)=>{ setAdvancedFilters({...advancedFilters, status: f}); }} counts={counts}/>
          {!loading && <SortRow count={sorted.length} total={tickets.length} activeSort={sortActive} onSortChange={setSortActive} onFilterClick={() => setShowFilterModal(true)}/>}
        </>
      }
      scrollContainerStyle={{ padding:"6px 16px 100px" }}
      fab={<FAB onClick={() => navigate('/raise-ticket')} />}
      modals={
        <>
          {actionsTicketId && <TicketActionsModal ticketId={actionsTicketId} onClose={() => setActionsTicketId(null)} onActionComplete={flash} />}
          {showFilterModal && <FilterModal currentFilters={advancedFilters} onApply={(f) => { setAdvancedFilters(f); setShowFilterModal(false); }} onClose={() => setShowFilterModal(false)} />}
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.45; }
            }
          `}</style>
        </>
      }
    >

        {/* Success Msg */}
        {successMsg && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ backgroundColor: greenT, border: `1px solid ${green}40`, borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color={green} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: green, fontFamily: inter }}>{successMsg}</span>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && [1,2,3].map(i=><SkeletonCard key={i}/>)}

        {/* Empty state */}
        {showEmpty && <EmptyState/>}

        {/* No results */}
        {showNoRes && <NoResults query={query} onClear={()=>{ setQuery(""); setAdvancedFilters(DEFAULT_FILTERS); }}/>}

        {/* Ticket list */}
        {showList && sorted.map(t=><TicketCard key={t.id} ticket={t} onClick={() => navigate(`/ticket-details/${t.id}`)} onMoreClick={(e) => { e.stopPropagation(); setActionsTicketId(t.id); }}/>)}

        {/* FAB spacer */}
        <div style={{ height:"24px" }}/>
    </MobileLayout>
  );
}
