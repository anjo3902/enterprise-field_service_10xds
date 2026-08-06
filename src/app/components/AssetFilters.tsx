import { handleBackNavigation } from "../utils/navigation";
import { MobileLayout } from "./ui/MobileLayout";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Wind, Monitor, Shield, Zap, Droplets,
   Database,  
  ChevronDown, CalendarDays, RotateCcw, Check, 
  SlidersHorizontal, X,
} from "lucide-react";
import { useAssetContext } from "../contexts/AssetContext";

// ─── Design tokens — identical across all asset screens ───────────────────────
const blue     = "#2563EB";
const blueDark = "#1D4ED8";
const blueMid  = "#3B82F6";
const blueTint = "#EFF6FF";


const green    = "#16A34A";
const greenT   = "#DCFCE7";
const orange   = "#EA580C";
const orangeT  = "#FFF7ED";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";


const ink      = "#0F172A";
const inkSec   = "#475569";

const inkFaint = "#94A3B8";

const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";

const inter      = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
const blueShadow = "0 4px 20px rgba(37,99,235,0.22), 0 1px 4px rgba(0,0,0,0.08)";


const EXPIRY_OPTIONS = ["Active","Expiring Soon","Expired"];

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"12px 20px 6px", backgroundColor:"#0052CC", flexShrink:0 }}>
      <span style={{ fontSize:"12px", fontWeight:600, color:"white", fontFamily:inter }}>9:41</span>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:"2px" }}>
          {[3,5,7,9].map((h,i)=>(
            <div key={i} style={{ width:"3px",height:`${h}px`,borderRadius:"1px",backgroundColor:"white" }}/>
          ))}
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

// ─── Page header ──────────────────────────────────────────────────────────────
function FilterHeader({ activeCount, onReset }: { activeCount:number; onReset:()=>void }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background:`linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
      padding:"10px 20px 18px", flexShrink:0,
    }}>
      {/* Nav row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
        <button type="button" style={{
          display:"inline-flex", alignItems:"center", gap:"5px",
          background:"rgba(255,255,255,0.15)",
          border:"1px solid rgba(255,255,255,0.25)",
          borderRadius:"10px", padding:"6px 12px 6px 9px",
          cursor:"pointer", fontSize:"12.5px", fontWeight:600,
          color:"white", fontFamily:inter,
        }} onClick={() => handleBackNavigation(navigate, '/assets/search')}>
          <ArrowLeft size={15} color="white"/>
          Back
        </button>

        {/* Reset button */}
        <button type="button" onClick={onReset} style={{
          display:"inline-flex", alignItems:"center", gap:"5px",
          background:"rgba(255,255,255,0.14)",
          border:"1px solid rgba(255,255,255,0.25)",
          borderRadius:"10px", padding:"6px 14px",
          cursor:"pointer", fontSize:"12.5px", fontWeight:600,
          color:"white", fontFamily:inter,
        }}>
          <RotateCcw size={13} color="white"/>
          Reset
        </button>
      </div>

      {/* Title row */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
        <div>
          <h1 style={{ fontSize:"20px", fontWeight:800, color:"white",
            letterSpacing:"-0.025em", lineHeight:1.15, fontFamily:inter, marginBottom:"3px" }}>
            Filter Assets
          </h1>
          <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.65)", fontFamily:inter }}>
            Narrow down your asset list
          </p>
        </div>
        {activeCount > 0 && (
          <div style={{
            backgroundColor:"rgba(255,255,255,0.2)",
            border:"1px solid rgba(255,255,255,0.3)",
            borderRadius:"100px", padding:"4px 12px",
            marginLeft:"auto",
          }}>
            <span style={{ fontSize:"12px", fontWeight:700, color:"white", fontFamily:inter }}>
              {activeCount} active
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Custom checkbox ──────────────────────────────────────────────────────────
function Checkbox({ checked, onChange }: { checked:boolean; onChange:()=>void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width:"22px", height:"22px", borderRadius:"6px",
        backgroundColor: checked ? blue : card,
        border: checked ? "none" : `2px solid ${border}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow: checked ? `0 2px 8px rgba(37,99,235,0.35)` : "none",
        transition:"all 0.18s ease", flexShrink:0, cursor:"pointer",
      }}
    >
      {checked && (
        <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
          <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

// ─── Custom radio ─────────────────────────────────────────────────────────────
function Radio({ selected, onChange }: { selected:boolean; onChange:()=>void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width:"22px", height:"22px", borderRadius:"50%",
        backgroundColor: selected ? blue : card,
        border: selected ? "none" : `2px solid ${border}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow: selected ? `0 2px 8px rgba(37,99,235,0.35)` : "none",
        transition:"all 0.18s ease", flexShrink:0, cursor:"pointer",
      }}
    >
      {selected && <div style={{ width:"8px", height:"8px", borderRadius:"50%", backgroundColor:"white" }}/>}
    </div>
  );
}

// ─── Filter section wrapper ───────────────────────────────────────────────────
function Section({ title, icon: Icon, count, children }:
  { title:string; icon?:React.ElementType; count?:number; children:React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      backgroundColor:card, borderRadius:"18px",
      border:`1px solid ${border}`, boxShadow:cardShadow,
      overflow:"hidden", marginBottom:"10px",
    }}>
      {/* Section header */}
      <button
        type="button"
        onClick={()=>setOpen(o=>!o)}
        style={{
          width:"100%", display:"flex", alignItems:"center",
          justifyContent:"space-between",
          padding:"14px 18px 14px",
          background:"none", border:"none",
          borderBottom: open ? `1px solid ${divider}` : "none",
          cursor:"pointer", fontFamily:inter,
        }}
      >
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {Icon && (
            <div style={{
              width:"28px", height:"28px", borderRadius:"8px",
              background:`linear-gradient(135deg, ${blue}, ${blueDark})`,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Icon size={14} color="white"/>
            </div>
          )}
          <span style={{ fontSize:"13.5px", fontWeight:700, color:ink, fontFamily:inter }}>
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <div style={{
              backgroundColor:blueTint, borderRadius:"100px",
              padding:"2px 8px", border:`1px solid ${blue}20`,
            }}>
              <span style={{ fontSize:"10px", fontWeight:700, color:blue, fontFamily:inter }}>
                {count}
              </span>
            </div>
          )}
        </div>
        <ChevronDown
          size={16} color={inkFaint}
          style={{ transform:open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }}
        />
      </button>

      {/* Items */}
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── Checkbox row (multi-select) ──────────────────────────────────────────────
function CheckRow({
  checked, onToggle, label, sublabel, count,
  icon: Icon, iconColor, iconTint, dot, dotColor, last,
}: {
  checked:boolean; onToggle:()=>void;
  label:string; sublabel?:string; count?: number | string;
  icon?:React.ElementType; iconColor?:string; iconTint?:string;
  dot?:boolean; dotColor?:string; last?:boolean;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display:"flex", alignItems:"center", gap:"14px",
        padding:"13px 18px",
        borderBottom: last ? "none" : `1px solid ${divider}`,
        cursor:"pointer",
        backgroundColor: checked ? `${blue}05` : "transparent",
        transition:"background 0.15s",
      }}
    >
      <Checkbox checked={checked} onChange={onToggle}/>

      {/* Icon */}
      {Icon && iconColor && iconTint && (
        <div style={{
          width:"34px", height:"34px", borderRadius:"10px",
          backgroundColor:checked ? iconTint : divider,
          border:`1px solid ${checked ? iconColor+"25" : border}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0, transition:"all 0.18s",
        }}>
          <Icon size={16} color={checked ? iconColor : inkFaint}/>
        </div>
      )}

      {/* Dot indicator */}
      {dot && dotColor && (
        <div style={{
          width:"10px", height:"10px", borderRadius:"50%",
          backgroundColor:checked ? dotColor : border,
          flexShrink:0, transition:"background 0.18s",
          boxShadow: checked ? `0 0 0 3px ${dotColor}20` : "none",
        }}/>
      )}

      {/* Labels */}
      <div style={{ flex:1 }}>
        <p style={{ fontSize:"13.5px", fontWeight:checked?700:500,
          color:checked?ink:inkSec, fontFamily:inter, lineHeight:1.3 }}>
          {label}
        </p>
        {sublabel && (
          <p style={{ fontSize:"11px", color:inkFaint, fontFamily:inter, marginTop:"1px" }}>
            {sublabel}
          </p>
        )}
      </div>

      {/* Count */}
      {count !== undefined && (
        <span style={{
          fontSize:"11px", fontWeight:600,
          color:checked ? blue : inkFaint,
          backgroundColor:checked ? blueTint : divider,
          borderRadius:"100px", padding:"2px 8px",
          fontFamily:inter, transition:"all 0.15s",
        }}>
          {count.toLocaleString()}
        </span>
      )}
    </div>
  );
}

// ─── Radio row (single-select) ────────────────────────────────────────────────
function RadioRow({ selected, onSelect, label, badge, badgeColor, badgeTint, last }:
  { selected:boolean; onSelect:()=>void; label:string;
    badge?:string; badgeColor?:string; badgeTint?:string; last?:boolean }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display:"flex", alignItems:"center", gap:"14px",
        padding:"13px 18px",
        borderBottom: last ? "none" : `1px solid ${divider}`,
        cursor:"pointer",
        backgroundColor: selected ? `${blue}05` : "transparent",
        transition:"background 0.15s",
      }}
    >
      <Radio selected={selected} onChange={onSelect}/>

      <span style={{ flex:1, fontSize:"13.5px", fontWeight:selected?700:500,
        color:selected?ink:inkSec, fontFamily:inter }}>
        {label}
      </span>

      {badge && badgeColor && badgeTint && (
        <span style={{
          fontSize:"9.5px", fontWeight:700,
          color:badgeColor, backgroundColor:badgeTint,
          borderRadius:"100px", padding:"3px 9px",
          fontFamily:inter, letterSpacing:"0.03em",
          border:`1px solid ${badgeColor}20`,
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Date range section ───────────────────────────────────────────────────────
function DateRangeSection({ from, to, onFromChange, onToChange }:
  { from:string; to:string; onFromChange:(v:string)=>void; onToChange:(v:string)=>void }) {
  const [pickerOpen, setPickerOpen] = useState<"from" | "to" | null>(null);

  const fmt = (iso:string) => {
    if (!iso) return "Select date";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
  };
  return (
    <div style={{
      backgroundColor:card, borderRadius:"18px",
      border:`1px solid ${border}`, boxShadow:cardShadow,
      overflow:"hidden", marginBottom:"10px",
    }}>
      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center", gap:"10px",
        padding:"14px 18px",
        borderBottom:`1px solid ${divider}`,
      }}>
        <div style={{
          width:"28px", height:"28px", borderRadius:"8px",
          background:`linear-gradient(135deg, ${blue}, ${blueDark})`,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <CalendarDays size={14} color="white"/>
        </div>
        <span style={{ fontSize:"13.5px", fontWeight:700, color:ink, fontFamily:inter }}>
          Last Service Date
        </span>
      </div>

      {/* Date pickers */}
      {[
        { label:"From Date", value:from, onChange:onFromChange },
        { label:"To Date",   value:to,   onChange:onToChange   },
      ].map((d,i,arr)=>(
        <label key={d.label} style={{
          display:"flex", alignItems:"center", gap:"14px",
          padding:"13px 18px",
          borderBottom: i < arr.length-1 ? `1px solid ${divider}` : "none",
          cursor:"pointer",
          position: "relative",
        }}>
          <div style={{
            width:"34px", height:"34px", borderRadius:"10px",
            backgroundColor:blueTint,
            border:`1px solid ${blue}20`,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
            <CalendarDays size={15} color={blue}/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:"11px", fontWeight:600, color:inkFaint,
              fontFamily:inter, marginBottom:"2px", letterSpacing:"0.03em",
              textTransform:"uppercase" }}>
              {d.label}
            </p>
            <p style={{ fontSize:"13.5px", fontWeight:600, color:ink, fontFamily:inter }}>
              {fmt(d.value)}
            </p>
          </div>
          <div style={{
            backgroundColor:divider, borderRadius:"8px",
            padding:"5px 10px", border:`1px solid ${border}`,
          }}>
            <span style={{ fontSize:"11px", color:inkSec, fontWeight:600, fontFamily:inter }}>
              Change
            </span>
          </div>
          {/* Custom Date Picker Trigger */}
          <div
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPickerOpen(d.label === "From Date" ? "from" : "to"); }}
            style={{ position:"absolute", inset:0 }}
          />
        </label>
      ))}

      {pickerOpen && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 1000,
          backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: card, borderRadius: "20px", width: "100%", maxWidth: "340px",
            padding: "24px", boxShadow: blueShadow
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: ink, fontFamily: inter }}>
                Select {pickerOpen === "from" ? "From Date" : "To Date"}
              </h3>
              <button onClick={() => setPickerOpen(null)} style={{ background:"none", border:"none", cursor:"pointer" }}>
                <X size={20} color={inkFaint} />
              </button>
            </div>
            <input 
              type="date"
              autoFocus
              value={pickerOpen === "from" ? from : to}
              onChange={(e) => {
                if (pickerOpen === "from") onFromChange(e.target.value);
                else onToChange(e.target.value);
              }}
              style={{
                width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${border}`,
                fontSize: "15px", fontFamily: inter, color: ink, backgroundColor: bg, marginBottom: "20px"
              }}
            />
            <button onClick={() => setPickerOpen(null)} style={{
              width: "100%", padding: "14px", borderRadius: "12px", border: "none",
              backgroundColor: blue, color: "white", fontSize: "15px", fontWeight: 700,
              fontFamily: inter, cursor: "pointer"
            }}>
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bottom actions ───────────────────────────────────────────────────────────
function BottomActions({ count, onApply, onClear }:
  { count:number; onApply:()=>void; onClear:()=>void }) {
  const [applying, setApplying] = useState(false);
  const handleApply = () => {
    setApplying(true);
    setTimeout(()=>setApplying(false), 1600);
    onApply();
  };
  return (
    <div style={{
      backgroundColor:card, borderTop:`1px solid ${border}`,
      padding:"12px 20px 10px", flexShrink:0,
      boxShadow:"0 -4px 20px rgba(0,0,0,0.06)",
    }}>
      {/* Apply */}
      <button type="button" onClick={handleApply} style={{
        width:"100%", height:"50px", borderRadius:"13px", border:"none",
        background: applying
          ? `linear-gradient(135deg, ${blueMid}, ${blue})`
          : `linear-gradient(135deg, ${blue}, ${blueDark})`,
        color:"white", fontSize:"15px", fontWeight:700,
        fontFamily:inter, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
        boxShadow:blueShadow,
        marginBottom:"10px", letterSpacing:"0.01em",
        transition:"all 0.2s",
      }}>
        {applying ? (
          <>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"
              style={{ animation:"spin 0.8s linear infinite" }}>
              <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
              <path d="M10 2a8 8 0 0 1 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Applying...
          </>
        ) : (
          <>
            <Check size={17}/>
            Apply Filters
            {count > 0 && (
              <span style={{
                backgroundColor:"rgba(255,255,255,0.22)",
                borderRadius:"100px", padding:"2px 9px",
                fontSize:"12px", fontWeight:700,
              }}>
                {count}
              </span>
            )}
          </>
        )}
      </button>

      {/* Clear */}
      <button type="button" onClick={onClear} style={{
        width:"100%", height:"46px", borderRadius:"13px",
        border:`1.5px solid ${border}`,
        backgroundColor:"transparent",
        color:count > 0 ? red : inkFaint,
        fontSize:"14px", fontWeight:600,
        fontFamily:inter, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:"7px",
        transition:"all 0.18s",
      }}>
        <RotateCcw size={14} color={count>0?red:inkFaint}/>
        Clear All Filters
        {count > 0 && (
          <span style={{ fontSize:"11px", color:red+"90" }}>({count} selected)</span>
        )}
      </button>
    </div>
  );
}

const expiryBadge: Record<string, { badge: string; color: string; tint: string }> = {
  "Active": { badge: "Valid >30d", color: green, tint: greenT },
  "Expiring Soon": { badge: "<30 Days", color: amber, tint: amberT },
  "Expired": { badge: "Expired", color: red, tint: redT }
};

export function AssetFilters() {
  const navigate = useNavigate();
  const {
  assets,
  filters,
  setFilters,
  clearFilters,
} = useAssetContext();

  const [categories,   setCategories]   = useState(new Set(filters.categories));
  const [healthStatus, setHealthStatus] = useState(new Set(filters.health));
  const [vendors,      setVendors]      = useState(new Set(filters.vendors));
  const [warranty, setWarranty] = useState("");
  const [amc,          setAmc]          = useState<string | null>(null);
  const [fromDate,     setFromDate]     = useState(filters.serviceDateFrom);
  const [toDate,       setToDate]       = useState(filters.serviceDateTo);
const categoryData = Object.entries(
  assets.reduce<Record<string, number>>((acc, asset) => {
    acc[asset.category] = (acc[asset.category] || 0) + 1;
    return acc;
  }, {})
).map(([label, count]) => ({
  label,
  count: count as number,
  icon: Database,
  iconColor: blue,
  iconTint: blueTint,
}));

const healthData = [
  {
    label: "Healthy",
    color: green,
    tint: greenT,
    count: assets.filter((a) => a.health >= 80).length,
  },
  {
    label: "Warning",
    color: orange,
    tint: orangeT,
    count: assets.filter((a) => a.health >= 60 && a.health < 80).length,
  },
  {
    label: "Critical",
    color: red,
    tint: redT,
    count: assets.filter((a) => a.health < 60).length,
  },
];
const vendorData = Object.entries(
  assets.reduce<Record<string, number>>((acc, asset) => {
    acc[asset.vendor] = (acc[asset.vendor] || 0) + 1;
    return acc;
  }, {})
).map(([label, count]) => ({
  label,
  count: count as number,
}));

  const toggleSet = (set:Set<string>, setFn:(s:Set<string>)=>void, key:string) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setFn(next);
  };

  const totalActive =
    categories.size + healthStatus.size + vendors.size +
    (warranty ? 1 : 0) + (amc ? 1 : 0) +
    (fromDate || toDate ? 1 : 0);

  const handleClear = () => {
    setCategories(new Set());
    setHealthStatus(new Set());
    setVendors(new Set());
    setWarranty("");
    setAmc(null);
    setFromDate("");
    setToDate("");
    clearFilters();
  };

  const handleApply = () => {
  setFilters({
    categories,
    health: healthStatus,
    vendors,
    warranty,
    amc,
    serviceDateFrom: fromDate,
    serviceDateTo: toDate,
  });

  setTimeout(() => {
    navigate(-1);
  }, 1600);
};
  return (
    <MobileLayout
      header={
        <>
          {/* ── Fixed top ── */}
          <StatusBar/>
          <FilterHeader activeCount={totalActive} onReset={handleClear}/>
        </>
      }
      scrollContainerStyle={{ padding:"14px 16px 100px" }}
      fab={
        <div style={{ position: "absolute", bottom: "68px", left: 0, right: 0, zIndex: 10 }}>
          <BottomActions count={totalActive} onApply={handleApply} onClear={handleClear}/>
        </div>
      }
    >

        {/* ── Asset Category ── */}
        <Section title="Asset Category" icon={SlidersHorizontal} count={categories.size}>
          {categoryData.map((c,i)=>(
            <CheckRow
              key={c.label}
              checked={categories.has(c.label)}
              onToggle={()=>toggleSet(categories,setCategories,c.label)}
              label={c.label}
              count={c.count}
              icon={c.icon} iconColor={c.iconColor} iconTint={c.iconTint}
             last={i === categoryData.length - 1}
            />
          ))}
        </Section>

        {/* ── Health Status ── */}
        <Section title="Health Status" icon={Database} count={healthStatus.size}>
          {healthData.map((h,i)=>(
            <CheckRow
              key={h.label}
              checked={healthStatus.has(h.label)}
              onToggle={()=>toggleSet(healthStatus,setHealthStatus,h.label)}
              label={h.label}
              count={h.count}
              dot dotColor={h.color}
              last={i === healthData.length - 1}
            />
          ))}
        </Section>

        {/* ── Vendor ── */}
        <Section title="Vendor" icon={Database} count={vendors.size}>
          {vendorData.map((v,i)=>(
            <CheckRow
              key={v.label}
              checked={vendors.has(v.label)}
              onToggle={()=>toggleSet(vendors,setVendors,v.label)}
              label={v.label}
              count={v.count}
             last={i === vendorData.length - 1}
            />
          ))}
        </Section>

        {/* ── Warranty Status ── */}
        <Section title="Warranty Status" icon={Database} count={warranty?1:0}>
          {EXPIRY_OPTIONS.map((opt,i)=>{
            const b = expiryBadge[opt];
            return (
              <RadioRow
                key={opt}
                selected={warranty===opt}
                onSelect={()=>setWarranty(warranty===opt?"":opt)}
                label={opt}
                badge={b.badge} badgeColor={b.color} badgeTint={b.tint}
                last={i===EXPIRY_OPTIONS.length-1}
              />
            );
          })}
        </Section>

        {/* ── AMC Status ── */}
        <Section title="AMC Status" icon={Database} count={amc?1:0}>
          {EXPIRY_OPTIONS.map((opt,i)=>{
            const b = expiryBadge[opt];
            return (
              <RadioRow
                key={opt}
                selected={amc===opt}
                onSelect={()=>setAmc(amc===opt?null:opt)}
                label={opt}
                badge={b.badge} badgeColor={b.color} badgeTint={b.tint}
                last={i===EXPIRY_OPTIONS.length-1}
              />
            );
          })}
        </Section>

        {/* ── Date Range ── */}
        <DateRangeSection
          from={fromDate} to={toDate}
          onFromChange={setFromDate} onToChange={setToDate}
        />

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  );
}
