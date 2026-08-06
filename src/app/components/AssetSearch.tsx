import { handleBackNavigation } from "../utils/navigation";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Search, X, Mic, Clock, ChevronRight,
  Wind, Zap, Shield, Droplets, Cpu, Monitor,
  Settings2, MoveVertical, Flame, Building2,
  Home, FileText, Database, User, Bot,
  MapPin, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, RotateCcw, Tag,
} from "lucide-react";

// ─── Design tokens — identical to AssetListing / AssetDashboard ───────────────
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
const cardShadow   = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
const blueShadow   = "0 4px 20px rgba(37,99,235,0.22), 0 1px 4px rgba(0,0,0,0.08)";

import { useAssetContext, Asset } from "../contexts/AssetContext";

const QUICK_FILTERS = [
  { label:"Healthy",           color:green,  tint:greenT  },
  { label:"Warning",           color:orange, tint:orangeT },
  { label:"Critical",          color:red,    tint:redT    },
  { label:"Warranty Expiring", color:purple, tint:purpleT },
  { label:"AMC Expiring",      color:amber,  tint:amberT  },
];

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"12px 20px 6px", backgroundColor:"#0052CC", flexShrink:0 }}>
      <span style={{ fontSize:"12px", fontWeight:600, color:"white", fontFamily:inter }}>9:41</span>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:"2px" }}>
          {[3,5,7,9].map((h,i)=>(
            <div key={i} style={{ width:"3px", height:`${h}px`, borderRadius:"1px", backgroundColor:"white" }}/>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"2px" }}>
          <div style={{ width:"22px", height:"11px", borderRadius:"2px", border:"1.5px solid white", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, right:"3px", backgroundColor:"white", borderRadius:"1px" }}/>
          </div>
          <div style={{ width:"2px", height:"5px", borderRadius:"1px", backgroundColor:"white" }}/>
        </div>
      </div>
    </div>
  );
}

// ─── Compact blue header ──────────────────────────────────────────────────────
function SearchPageHeader() {
  const navigate = useNavigate();
  return (
    <div style={{
      background:`linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
      padding:"10px 20px 20px", flexShrink:0,
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
        <button type="button" style={{
          display:"inline-flex", alignItems:"center", gap:"5px",
          background:"rgba(255,255,255,0.15)",
          border:"1px solid rgba(255,255,255,0.25)",
          borderRadius:"10px", padding:"6px 12px 6px 9px",
          cursor:"pointer", fontSize:"12.5px", fontWeight:600,
          color:"white", fontFamily:inter,
        }} onClick={() => handleBackNavigation(navigate, '/assets')}>
          <ArrowLeft size={15} color="white"/>
          Back
        </button>
        {/* Scope indicator */}
        <div style={{
          backgroundColor:"rgba(255,255,255,0.12)",
          border:"1px solid rgba(255,255,255,0.2)",
          borderRadius:"100px", padding:"4px 12px",
        }}>
          <span style={{ fontSize:"11px", fontWeight:700, color:"rgba(255,255,255,0.85)", fontFamily:inter, letterSpacing:"0.04em" }}>
            2,450 Assets
          </span>
        </div>
      </div>

      <h1 style={{ fontSize:"20px", fontWeight:800, color:"white",
        letterSpacing:"-0.025em", lineHeight:1.15, fontFamily:inter, marginBottom:"2px" }}>
        Asset Search
      </h1>
      <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.62)", fontFamily:inter }}>
        Search by name, ID, category or vendor
      </p>
    </div>
  );
}

// ─── Search input bar ─────────────────────────────────────────────────────────
interface SearchBarProps {
  query: string;
  onChange: (v:string)=>void;
  onFocus: ()=>void;
  onBlur: ()=>void;
  focused: boolean;
  onClear: ()=>void;
  onVoiceStart: ()=>void;
}
function SearchInputBar({ query, onChange, onFocus, onBlur, focused, onClear, onVoiceStart }: SearchBarProps) {
  return (
    <div style={{ backgroundColor:card, padding:"14px 20px 12px",
      borderBottom:`1px solid ${border}`, flexShrink:0 }}>
      <div style={{
        height:"50px", borderRadius:"14px",
        backgroundColor: focused ? card : bg,
        border: focused ? `2px solid ${blue}` : `1.5px solid ${border}`,
        boxShadow: focused ? `0 0 0 4px ${blueRing}, ${cardShadow}` : cardShadow,
        display:"flex", alignItems:"center", gap:"10px", padding:"0 14px",
        transition:"all 0.2s ease",
      }}>
        <Search size={18} color={focused ? blue : inkFaint}
          style={{ flexShrink:0, transition:"color 0.2s" }}/>
        <input
          type="text"
          value={query}
          placeholder="Search assets, asset IDs, vendors, categories..."
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          autoFocus
          style={{
            flex:1, border:"none", outline:"none", background:"transparent",
            fontSize:"14px", color:ink, fontFamily:inter,
          }}
        />
        {query ? (
          <button type="button" onClick={onClear} style={{
            width:"24px", height:"24px", borderRadius:"50%",
            backgroundColor:divider, border:"none",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", flexShrink:0,
          }}>
            <X size={13} color={inkMut}/>
          </button>
        ) : (
          <button type="button" onClick={onVoiceStart} style={{
            width:"30px", height:"30px", borderRadius:"9px",
            backgroundColor:focused ? blueTint : divider,
            border:`1px solid ${focused ? blue+"30" : border}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", flexShrink:0, transition:"all 0.18s",
          }}>
            <Mic size={14} color={focused ? blue : inkFaint}/>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Recent search row ────────────────────────────────────────────────────────
function RecentRow({ term, onTap, onRemove }: { term:string; onTap:()=>void; onRemove:()=>void }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:"14px",
      padding:"13px 20px",
      borderBottom:`1px solid ${divider}`,
      cursor:"pointer",
    }} onClick={onTap}>
      <div style={{
        width:"34px", height:"34px", borderRadius:"10px",
        backgroundColor:divider,
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>
        <Clock size={15} color={inkFaint}/>
      </div>
      <span style={{ flex:1, fontSize:"13.5px", fontWeight:500, color:inkSec, fontFamily:inter }}>
        {term}
      </span>
      <button type="button" onClick={e=>{ e.stopPropagation(); onRemove(); }} style={{
        width:"28px", height:"28px", borderRadius:"8px",
        backgroundColor:"transparent", border:`1px solid ${border}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor:"pointer", flexShrink:0,
      }}>
        <X size={12} color={inkFaint}/>
      </button>
    </div>
  );
}

// ─── Quick filter chip ────────────────────────────────────────────────────────
function QuickChip({ label, color, tint, active, onToggle }:
  { label:string; color:string; tint:string; active:boolean; onToggle:()=>void }) {
  return (
    <button type="button" onClick={onToggle} style={{
      display:"inline-flex", alignItems:"center", gap:"6px",
      height:"34px", borderRadius:"100px", padding:"0 14px",
      backgroundColor: active ? color : card,
      border:`1.5px solid ${active ? color : border}`,
      cursor:"pointer", flexShrink:0,
      boxShadow: active ? `0 2px 10px ${color}35` : "none",
      transition:"all 0.15s ease", fontFamily:inter,
    }}>
      <div style={{ width:"6px", height:"6px", borderRadius:"50%",
        backgroundColor: active ? "rgba(255,255,255,0.8)" : color }}/>
      <span style={{ fontSize:"12.5px", fontWeight:600,
        color: active ? "white" : inkSec, whiteSpace:"nowrap" }}>
        {label}
      </span>
    </button>
  );
}

function ResultCard({ asset, query }: { asset:Asset; query:string }) {
  const displayStatus = asset.status === "Maintenance" ? "Maintenance" : asset.healthStatus;
  const p = {
    Healthy: { color:green, tint:greenT, bar:`linear-gradient(90deg,${green},#4ADE80)` },
    Warning: { color:orange, tint:orangeT, bar:`linear-gradient(90deg,${orange},#FB923C)` },
    Critical: { color:red, tint:redT, bar:`linear-gradient(90deg,${red},#F87171)` },
    Maintenance: { color:amber, tint:amberT, bar:`linear-gradient(90deg,${amber},#FCD34D)` }
  }[displayStatus] || { color:inkFaint, tint:divider, bar:divider };
  const [pressed, setPressed] = useState(false);
  const navigate = useNavigate();

  // Bold-match helper (highlight query in text)
  function Highlight({ text }: { text:string }) {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ color:blue, fontWeight:800, backgroundColor:blueTint,
          borderRadius:"3px", padding:"0 2px" }}>
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div
      onPointerDown={()=>setPressed(true)}
      onPointerUp={()=>setPressed(false)}
      onPointerLeave={()=>setPressed(false)}
      onClick={() => navigate(`/assets/details/${asset.assetId}`)}
      style={{
        backgroundColor:card, borderRadius:"18px",
        boxShadow: pressed ? "none" : cardShadow,
        border:`1px solid ${border}`,
        marginBottom:"10px", overflow:"hidden",
        display:"flex",
        transform: pressed ? "scale(0.99)" : "scale(1)",
        transition:"all 0.12s ease", cursor:"pointer",
      }}
    >
      {/* Health colour bar */}
      <div style={{ width:"4px", backgroundColor:p.color, flexShrink:0 }}/>

      <div style={{ flex:1, padding:"14px 13px 13px" }}>

        {/* Row 1: icon + name + status badge */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:"11px", marginBottom:"9px" }}>
          <div style={{
            width:"40px", height:"40px", borderRadius:"12px",
            backgroundColor:asset.iconTint,
            border:`1px solid ${asset.iconColor}20`,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
            <asset.icon size={19} color={asset.iconColor}/>
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"8px" }}>
              <p style={{ fontSize:"13.5px", fontWeight:700, color:ink,
                lineHeight:1.3, fontFamily:inter, flex:1, minWidth:0 }}>
                <Highlight text={asset.name}/>
              </p>
              <span style={{
                fontSize:"9px", fontWeight:700, color:p.color,
                backgroundColor:p.tint, borderRadius:"100px",
                padding:"3px 8px", flexShrink:0,
                border:`1px solid ${p.color}20`, fontFamily:inter,
                letterSpacing:"0.03em",
              }}>{asset.status}</span>
            </div>

            {/* Asset ID + Category */}
            <div style={{ display:"flex", alignItems:"center", gap:"6px", marginTop:"3px" }}>
              <span style={{ fontSize:"10.5px", fontWeight:600, color:inkFaint, fontFamily:inter }}>
                <Highlight text={asset.assetId}/>
              </span>
              <div style={{ width:"3px", height:"3px", borderRadius:"50%", backgroundColor:border }}/>
              <span style={{ fontSize:"10px", fontWeight:600, color:inkSec,
                backgroundColor:divider, borderRadius:"5px",
                padding:"1px 6px", fontFamily:inter }}>
                <Highlight text={asset.category}/>
              </span>
            </div>
          </div>
        </div>

        {/* Health bar */}
        <div style={{ marginBottom:"9px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"5px" }}>
            <span style={{ fontSize:"10.5px", color:inkMut, fontFamily:inter, fontWeight:500 }}>
              Health Score
            </span>
            <span style={{ fontSize:"11px", fontWeight:800, color:p.color,
              fontFamily:inter, letterSpacing:"-0.02em" }}>
              {asset.health}%
            </span>
          </div>
          <div style={{ height:"5px", backgroundColor:divider, borderRadius:"100px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${asset.health}%`,
              background:p.bar, borderRadius:"100px" }}/>
          </div>
        </div>

        {/* Row 3: vendor + location + chevron */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
              <Building2 size={11} color={inkFaint} style={{ flexShrink:0 }}/>
              <span style={{ fontSize:"10.5px", color:inkSec, fontFamily:inter,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {asset.vendor}
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"4px", flexShrink:0 }}>
              <MapPin size={10} color={inkFaint}/>
              <span style={{ fontSize:"10px", color:inkFaint, fontFamily:inter, whiteSpace:"nowrap",
                maxWidth:"90px", overflow:"hidden", textOverflow:"ellipsis" }}>
                {asset.location}
              </span>
            </div>
          </div>
          <div style={{
            width:"26px", height:"26px", borderRadius:"8px",
            backgroundColor:divider,
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0, marginLeft:"10px",
          }}>
            <ChevronRight size={14} color={inkFaint}/>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AssetSearch() {
  const { assets, filteredAssets, searchQuery, setSearchQuery, filters, setFilters, clearFilters, resetAll } = useAssetContext();
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState(["Generator G-04", "HVAC", "Server Room"]);
  const [isRecording, setIsRecording] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleFilter = (label: string) => {
    // Only map Healthy, Warning, Critical to health filters
    if (["Healthy", "Warning", "Critical", "Maintenance"].includes(label)) {
      setFilters(prev => {
        const next = new Set(prev.health);
        next.has(label) ? next.delete(label) : next.add(label);
        return { ...prev, health: next };
      });
    }
  };

  const handleVoiceSearch = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setToastMessage("Speech recognition not supported in this browser.");
      setTimeout(() => setToastMessage(""), 3000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsSearching(true);
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      setToastMessage("Speech recognition failed. Please try again.");
      setTimeout(() => setToastMessage(""), 3000);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const removeRecent = (term: string) =>
    setRecentSearches(prev => prev.filter(t => t !== term));

  const applyRecent = (term:string) => {
    setSearchQuery(term);
    setIsSearching(true);
  };

  // Filter logic
  // filteredAssets is already computed globally by AssetContext
  const filtered = filteredAssets;

  return (
    <MobileLayout
      header={
        <>
          {/* ── Fixed top chrome ── */}
          <StatusBar/>
          <SearchPageHeader/>
          <SearchInputBar
          query={searchQuery}
          onChange={(v) => { setSearchQuery(v); if (!isSearching) setIsSearching(true); }}
          onFocus={() => setIsSearching(true)}
          onBlur={() => {}}
          focused={isSearching}
          onClear={() => setSearchQuery("")}
          onVoiceStart={handleVoiceSearch}
        />
        </>
      }
      scrollContainerStyle={{ paddingBottom:"100px" }}
    >

        {/* ── EMPTY STATE: Recent Searches + Quick Filters ── */}
        {!isSearching && (
          <>
            {/* Recent Searches */}
            <div style={{ backgroundColor:card, marginBottom:"8px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"14px 20px 10px" }}>
                <span style={{ fontSize:"12px", fontWeight:700, color:inkMut,
                  letterSpacing:"0.06em", textTransform:"uppercase", fontFamily:inter }}>
                  Recent Searches
                </span>
                {recentSearches.length > 0 && (
                  <button type="button" onClick={()=>setRecentSearches([])} style={{
                    background:"none", border:"none", fontSize:"12px", color:blue,
                    fontWeight:600, cursor:"pointer", fontFamily:inter,
                    display:"flex", alignItems:"center", gap:"3px",
                  }}>
                    <RotateCcw size={11}/> Clear all
                  </button>
                )}
              </div>

              {recentSearches.length === 0 ? (
                <div style={{ padding:"16px 20px 20px", textAlign:"center" }}>
                  <p style={{ fontSize:"13px", color:inkFaint, fontFamily:inter }}>No recent searches</p>
                </div>
              ) : (
                recentSearches.map(term => (
                  <RecentRow
                    key={term}
                    term={term}
                    onTap={()=>applyRecent(term)}
                    onRemove={()=>removeRecent(term)}
                  />
                ))
              )}
            </div>

            {/* Quick Filters */}
            <div style={{ backgroundColor:card, marginBottom:"8px", padding:"14px 0 16px" }}>
              <p style={{ fontSize:"12px", fontWeight:700, color:inkMut, letterSpacing:"0.06em",
                textTransform:"uppercase", fontFamily:inter, padding:"0 20px", marginBottom:"12px" }}>
                Quick Filters
              </p>
              <div style={{ display:"flex", gap:"8px", overflowX:"auto",
                scrollbarWidth:"none", padding:"0 20px 2px" }}>
                {QUICK_FILTERS.map(f=>(
                  <QuickChip
                    key={f.label}
                    label={f.label}
                    color={f.color}
                    tint={f.tint}
                    active={filters.health.has(f.label)}
                    onToggle={()=>{ toggleFilter(f.label); }}
                  />
                ))}
              </div>
            </div>

            {/* Browse all prompt */}
            <div style={{ backgroundColor:card, padding:"14px 20px 10px" }}>
              <p style={{ fontSize:"12px", fontWeight:700, color:inkMut, letterSpacing:"0.06em",
                textTransform:"uppercase", fontFamily:inter, marginBottom:"12px" }}>
                Suggested Assets
              </p>
              {assets.slice(0,3).map(a => (
                <ResultCard key={a.id} asset={a} query=""/>
              ))}
            </div>
          </>
        )}

        {/* ── RESULTS STATE ── */}
        {isSearching && (
          <>
            {/* Active filters strip */}
            {filters.health.size > 0 && (
              <div style={{ backgroundColor:card, borderBottom:`1px solid ${border}`, padding:"10px 20px" }}>
                <div style={{ display:"flex", gap:"8px", overflowX:"auto", scrollbarWidth:"none" }}>
                  {QUICK_FILTERS.map(f=>(
                    <QuickChip
                      key={f.label}
                      label={f.label}
                      color={f.color}
                      tint={f.tint}
                      active={filters.health.has(f.label)}
                      onToggle={()=>toggleFilter(f.label)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Result meta row */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 20px 6px", backgroundColor:bg, flexShrink:0,
            }}>
              <div>
                <span style={{ fontSize:"12px", color:inkFaint, fontFamily:inter }}>
                  {filtered.length === 0 ? "No results" : (
                    <>
                      <span style={{ fontWeight:700, color:ink }}>{filtered.length}</span>
                      {" "}result{filtered.length!==1?"s":""}
                      {searchQuery && (
                        <> for{" "}
                          <span style={{ fontWeight:700, color:blue }}>"{searchQuery}"</span>
                        </>
                      )}
                    </>
                  )}
                </span>
              </div>
              {filtered.length > 0 && (
                <span style={{ fontSize:"11px", color:blue, fontWeight:600,
                  fontFamily:inter, cursor:"pointer" }}>
                  Sort ↓
                </span>
              )}
            </div>

            {/* Asset cards */}
            <div style={{ padding:"6px 20px 20px" }}>
              {filtered.length === 0 ? (
                /* Empty result state */
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", paddingTop:"40px", gap:"14px" }}>
                  <div style={{
                    width:"72px", height:"72px", borderRadius:"22px",
                    backgroundColor:divider,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <Search size={30} color={inkFaint}/>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <p style={{ fontSize:"16px", fontWeight:800, color:ink,
                      fontFamily:inter, marginBottom:"6px" }}>
                      No assets found
                    </p>
                    <p style={{ fontSize:"13px", color:inkMut, fontFamily:inter, lineHeight:1.55 }}>
                      No assets match{" "}
                      {searchQuery && <><strong>"{searchQuery}"</strong>{" "}</>}
                      {filters.health.size > 0 && "with the selected filters"}.
                      <br/>Try a different search or adjust filters.
                    </p>
                  </div>
                  <button type="button"
                    onClick={()=>{ resetAll(); }}
                    style={{
                      height:"40px", borderRadius:"100px", padding:"0 20px",
                      backgroundColor:blueTint, border:`1.5px solid ${blue}30`,
                      color:blue, fontSize:"13px", fontWeight:600,
                      fontFamily:inter, cursor:"pointer",
                      display:"flex", alignItems:"center", gap:"6px",
                    }}>
                    <RotateCcw size={13}/>
                    Clear search
                  </button>
                </div>
              ) : (
                filtered.map(a => <ResultCard key={a.id} asset={a} query={searchQuery}/>)
              )}
            </div>
          </>
        )}

      {/* Voice Recording Overlay */}
      {isRecording && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 1000,
          backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            backgroundColor: card, borderRadius: "24px",
            padding: "32px 40px", display: "flex", flexDirection: "column",
            alignItems: "center", boxShadow: blueShadow
          }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              backgroundColor: blueTint, display: "flex", alignItems: "center",
              justifyContent: "center", marginBottom: "16px",
              animation: "pulse 1.5s infinite"
            }}>
              <Mic size={32} color={blue} />
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "8px" }}>
              Listening...
            </h2>
            <p style={{ fontSize: "14px", color: inkMut, fontFamily: inter }}>
              Speak your search query
            </p>
          </div>
          <style>
            {`
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
                70% { box-shadow: 0 0 0 20px rgba(37, 99, 235, 0); }
                100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
              }
            `}
          </style>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "absolute", bottom: "100px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: ink, color: "white", padding: "12px 24px",
          borderRadius: "100px", fontSize: "13.5px", fontWeight: 600,
          fontFamily: inter, zIndex: 1000, boxShadow: cardShadow
        }}>
          {toastMessage}
        </div>
      )}
    </MobileLayout>
  );
}
