import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation as useRouterLocation } from "react-router";
import {
  ArrowLeft, Paperclip, CheckCircle2, AlertCircle,
  FileText, MapPin, Mic, X, Sparkles, ChevronDown, ChevronUp,
  ShieldAlert, Zap, Monitor, Database, Tag, Activity,
  Flame, Brain, Search, Wrench, Package, Clock, Calendar,
  Shield, AlertTriangle, User, CheckCircle, RotateCcw,
  Info, Building2, ArrowRight, ChevronRight,
} from "lucide-react";
import { useSafeBack } from "../utils/navigation";
import { AIAnalysisRequest, AIAnalysisResponse, runAIAnalysis, DEFAULT_AI_RESPONSE, HITL_LABELS } from "../services/aiService";
import { useRevenueContext } from "../contexts/RevenueContext";
import { publishEvent } from "../utils/eventBus";
import { mockTickets } from "../types/legacy";
import { mockAssets, mockTechnicians, mockSLAContract, VendorAsset } from "../types/legacy";

// ─── Design tokens (preserved exactly) ────────────────────────────────────────
const blue      = "#2563EB";
const blueDark  = "#1D4ED8";
const blueMid   = "#3B82F6";
const blueTint  = "#EFF6FF";
const blueRing  = "rgba(37,99,235,0.12)";
const green     = "#16A34A";
const greenT    = "#DCFCE7";
const orange    = "#EA580C";
const orangeT   = "#FFF7ED";
const purple    = "#7C3AED";
const purpleT   = "#F5F3FF";
const red       = "#DC2626";
const redT      = "#FEF2F2";
const amber     = "#D97706";
const amberT    = "#FFFBEB";
const ink       = "#0F172A";
const inkSec    = "#475569";
const inkMut    = "#64748B";
const inkFaint  = "#94A3B8";
const bg        = "#F8FAFC";
const card      = "#FFFFFF";
const border    = "#E2E8F0";
const divider   = "#F1F5F9";
const inter     = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
const blueShadow = "0 4px 20px rgba(37,99,235,0.22), 0 1px 4px rgba(0,0,0,0.08)";

// ─── Form config ───────────────────────────────────────────────────────────────
const CATEGORIES = ["HVAC", "Power", "IT", "Plumbing", "Security", "Civil", "Electrical", "Mechanical", "Fire Safety", "Elevators"];
const PRIORITIES = [
  { value: "Critical", color: red,    tint: redT    },
  { value: "High",     color: orange, tint: orangeT },
  { value: "Medium",   color: amber,  tint: amberT  },
  { value: "Low",      color: green,  tint: greenT  },
];

const VENDOR_ASSETS: VendorAsset[] = mockAssets;
const ASSET_NAMES  = VENDOR_ASSETS.map(a => a.name);
const LOCATIONS    = [...new Set(VENDOR_ASSETS.map(a => a.location))];

// ─── Business Logic ───────────────────────────────────────────────────────────
function computeSlaDeadline(priority: string): string {
  const hrs = (mockSLAContract.responseSLA as Record<string, number>)[priority] || 8;
  const deadline = new Date(Date.now() + hrs * 3600000);
  const isToday = deadline.toDateString() === new Date().toDateString();
  const timeStr = deadline.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return isToday ? `Today, ${timeStr}` : `Tomorrow, ${timeStr}`;
}

function decideRouting(priority: string, aiResult: AIAnalysisResponse | null, selectedAsset: VendorAsset | null): { route: "vendor_review" | "auto_assign"; reason: string } {
  if (priority === "Critical")
    return { route: "vendor_review", reason: "Critical priority — Vendor authorisation required" };
  if (aiResult?.safetyFlag)
    return { route: "vendor_review", reason: "Safety risk detected — Vendor review required" };
  if (aiResult && aiResult.confidence < 65)
    return { route: "vendor_review", reason: "AI confidence below threshold — human verification required" };
  if (aiResult?.requires_human_review)
    return { route: "vendor_review", reason: aiResult.hitlTriggers.map(t => HITL_LABELS[t] || t).join("; ") };
  if (selectedAsset?.category === "Electrical" && /hospital|icu|medical/i.test(selectedAsset?.location || ""))
    return { route: "vendor_review", reason: "Regulated asset — approval required" };
  return { route: "auto_assign", reason: "" };
}

function findBestTechnician(category: string, aiSkills: string[], location: string) {
  const available = mockTechnicians.filter(t => t.availability === "available");
  const skillMatch = available.filter(t =>
    t.skills.some(s =>
      aiSkills.some(sk => s.toLowerCase().includes(sk.toLowerCase())) ||
      t.skills.some(s2 => s2.toLowerCase().includes(category.toLowerCase()))
    )
  );
  const pool = skillMatch.length > 0 ? skillMatch : available;
  return [...pool].sort((a, b) => {
    const aLocal = a.location.toLowerCase().includes(location.toLowerCase().split(",")[0]) ? 1 : 0;
    const bLocal = b.location.toLowerCase().includes(location.toLowerCase().split(",")[0]) ? 1 : 0;
    if (aLocal !== bLocal) return bLocal - aLocal;
    if (b.slaAdherence !== a.slaAdherence) return b.slaAdherence - a.slaAdherence;
    return a.activeJobCount - b.activeJobCount;
  })[0] || null;
}

// ─── StatusBar ────────────────────────────────────────────────────────────────
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

// ─── Stage Progress Indicator ─────────────────────────────────────────────────
const STAGE_LABELS = ["Ticket Info", "Evidence", "Submit", "AI Review"];

function StageProgress({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0, padding:"10px 20px 14px" }}>
      {STAGE_LABELS.map((label, i) => {
        const stageNum = i + 1;
        const isDone    = stageNum < current;
        const isActive  = stageNum === current;
        const isPending = stageNum > current;
        const dotColor  = isDone ? green : isActive ? blue : border;
        const dotBg     = isDone ? greenT : isActive ? blueTint : divider;
        const lineColor = isDone ? green : border;
        return (
          <div key={stageNum} style={{ display:"flex", alignItems:"center", flex: stageNum < 4 ? 1 : undefined }}>
            <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:"4px" }}>
              <div style={{
                width:"26px", height:"26px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                backgroundColor: dotBg, border: `2px solid ${dotColor}`,
                transition:"all 0.25s ease"
              }}>
                {isDone
                  ? <CheckCircle2 size={14} color={green} />
                  : <span style={{ fontSize:"11px", fontWeight:700, color: isActive ? blue : inkFaint, fontFamily:inter }}>{stageNum}</span>
                }
              </div>
              <span style={{ fontSize:"10px", fontWeight: isActive ? 700 : 500, color: isActive ? blue : isPending ? inkFaint : inkMut, fontFamily:inter, whiteSpace:"nowrap" as const }}>
                {label}
              </span>
            </div>
            {stageNum < 4 && (
              <div style={{ flex:1, height:"2px", backgroundColor: lineColor, margin:"0 6px", marginBottom:"14px", borderRadius:"1px", transition:"background-color 0.25s ease" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, required, children, error }: { label: string; required?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <div style={{ marginBottom:"16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"4px", marginBottom:"6px" }}>
        <span style={{ fontSize:"12.5px", fontWeight:600, color:inkSec, fontFamily:inter }}>{label}</span>
        {required && <span style={{ fontSize:"12px", color:red, fontWeight:700 }}>*</span>}
      </div>
      {children}
      {error && (
        <div style={{ display:"flex", alignItems:"center", gap:"4px", marginTop:"5px" }}>
          <AlertCircle size={12} color={red} />
          <span style={{ fontSize:"11.5px", color:red, fontFamily:inter }}>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─── Text input ───────────────────────────────────────────────────────────────
function TextInput({ value, onChange, placeholder, hasError, icon }: { value:string; onChange:(v:string)=>void; placeholder?:string; hasError?:boolean; icon?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      {icon && <div style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>{icon}</div>}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width:"100%", height:"46px", borderRadius:"12px",
          padding: icon ? "0 14px 0 38px" : "0 14px",
          border: hasError ? `1.5px solid ${red}` : focused ? `2px solid ${blue}` : `1.5px solid ${border}`,
          boxShadow: focused ? `0 0 0 3px ${blueRing}` : "none",
          backgroundColor: focused ? card : bg,
          fontSize:"14px", color:ink, fontFamily:inter, outline:"none",
          transition:"all 0.18s ease", boxSizing:"border-box" as const
        }}
      />
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
function TextArea({ value, onChange, placeholder, hasError }: { value:string; onChange:(v:string)=>void; placeholder?:string; hasError?:boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width:"100%", borderRadius:"12px", padding:"12px 14px",
        border: hasError ? `1.5px solid ${red}` : focused ? `2px solid ${blue}` : `1.5px solid ${border}`,
        boxShadow: focused ? `0 0 0 3px ${blueRing}` : "none",
        backgroundColor: focused ? card : bg,
        fontSize:"14px", color:ink, fontFamily:inter, outline:"none", resize:"none",
        transition:"all 0.18s ease", boxSizing:"border-box" as const
      }}
    />
  );
}

// ─── Select dropdown ──────────────────────────────────────────────────────────
function Select({ value, onChange, options, placeholder, hasError }: { value:string; onChange:(v:string)=>void; options:string[]; placeholder?:string; hasError?:boolean }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width:"100%", height:"46px", borderRadius:"12px", padding:"0 14px",
        border: hasError ? `1.5px solid ${red}` : `1.5px solid ${border}`,
        backgroundColor: bg, fontSize:"14px", color: value ? ink : inkFaint,
        fontFamily:inter, outline:"none", appearance:"auto", boxSizing:"border-box" as const
      }}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Priority selector ────────────────────────────────────────────────────────
function PrioritySelector({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  return (
    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" as const }}>
      {PRIORITIES.map(p => (
        <button key={p.value} type="button" onClick={() => onChange(p.value)} style={{
          flex:1, height:"38px", borderRadius:"10px", border:"none",
          backgroundColor: value === p.value ? p.tint : divider,
          cursor:"pointer", fontFamily:inter, fontSize:"13px", fontWeight:600,
          color: value === p.value ? p.color : inkMut,
          outline: value === p.value ? `2px solid ${p.color}` : "none",
          outlineOffset:"2px", transition:"all 0.15s ease"
        }}>
          {p.value}
        </button>
      ))}
    </div>
  );
}

// ─── AI Row helper ────────────────────────────────────────────────────────────
function AIRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:"8px" }}>
      <div style={{ width:"22px", height:"22px", borderRadius:"6px", backgroundColor:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>{icon}</div>
      <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.55)", fontFamily:inter, width:"90px", flexShrink:0, paddingTop:"2px" }}>{label}</span>
      <span style={{ fontSize:"12px", fontWeight:500, color:"rgba(255,255,255,0.9)", fontFamily:inter, flex:1, lineHeight:1.4 }}>{value || "—"}</span>
    </div>
  );
}

// ─── Risk bar ─────────────────────────────────────────────────────────────────
function RiskBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
      <span style={{ fontSize:"10.5px", color:"rgba(255,255,255,0.5)", fontFamily:inter, width:"90px", flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, height:"5px", borderRadius:"100px", backgroundColor:"rgba(255,255,255,0.15)" }}>
        <div style={{ width:`${(score/5)*100}%`, height:"100%", borderRadius:"100px", backgroundColor:color, transition:"width 0.4s ease" }} />
      </div>
      <span style={{ fontSize:"10.5px", fontWeight:700, color:"rgba(255,255,255,0.8)", fontFamily:inter, flexShrink:0 }}>{score}/5</span>
    </div>
  );
}

// ─── AI Insight Card (Stage 3 — no Accept/Dismiss, read-only presentation) ───
interface AICardProps {
  suggestion: AIAnalysisResponse;
  source: "image" | "audio" | "text" | "multimodal";
  analyzing: boolean;
  analysisStep: string;
  completedSteps: string[];
}

function AIInsightCard({ suggestion: s, source, analyzing, analysisStep, completedSteps }: AICardProps) {
  const [progress, setProgress] = useState(0);
  const sourceLabel = source === "multimodal" ? "Multimodal Analysis" : source === "image" ? "Image Analysis" : source === "audio" ? "Audio Analysis" : "Text Analysis";

  useEffect(() => {
    if (analyzing) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { clearInterval(interval); return 100; }
          return Math.min(97, p + Math.floor(Math.random() * 5) + 3);
        });
      }, 180);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [analyzing]);

  const visibleCompleted = completedSteps.slice(-4);
  const isFinalStep = analysisStep === "Analysis Complete";
  const riskColor = s.riskLevel === "CRITICAL" ? "#FCA5A5" : s.riskLevel === "HIGH" ? "#FCD34D" : s.riskLevel === "MEDIUM" ? "#FDE68A" : "#86EFAC";
  const hasRisk = s.safetyScore > 0 || s.operationalImpact > 0 || s.escalationRisk > 0;
  const hasHITL = s.requires_human_review && s.hitlTriggers?.length > 0;
  const hasCorrection = s.correction_applied && s.original_fault_type;

  return (
    <div style={{
      borderRadius:"18px", marginBottom:"16px",
      background:"linear-gradient(150deg,#1E3A8A 0%,#1D4ED8 55%,#2563EB 100%)",
      boxShadow:"0 6px 24px rgba(29,78,216,0.28), 0 1px 4px rgba(0,0,0,0.1)",
      overflow:"hidden", position:"relative"
    }}>
      <div style={{ position:"absolute", top:"-24px", right:"-24px", width:"100px", height:"100px", borderRadius:"50%", backgroundColor:"rgba(255,255,255,0.05)" }} />
      <div style={{ position:"absolute", bottom:"-16px", left:"10px", width:"60px", height:"60px", borderRadius:"50%", backgroundColor:"rgba(255,255,255,0.04)" }} />

      {/* Header */}
      <div style={{ padding:"14px 16px 12px", display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"34px", height:"34px", borderRadius:"10px", flexShrink:0, backgroundColor:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Sparkles size={17} color="white" />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:"13px", fontWeight:700, color:"white", fontFamily:inter }}>AI Fault Analysis</p>
          <p style={{ fontSize:"10.5px", color:"rgba(255,255,255,0.6)", fontFamily:inter }}>{sourceLabel} · 10xDS Intelligence Engine</p>
        </div>
        {!analyzing && (
          <div style={{ backgroundColor:"rgba(74,222,128,0.2)", border:"1px solid rgba(74,222,128,0.4)", borderRadius:"8px", padding:"3px 9px" }}>
            <span style={{ fontSize:"10.5px", fontWeight:700, color:"#4ADE80", fontFamily:inter }}>Complete</span>
          </div>
        )}
      </div>

      {analyzing ? (
        <div style={{ padding:"4px 16px 16px", display:"flex", flexDirection:"column", gap:0 }}>
          {visibleCompleted.map((step, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"10px", paddingBottom:"8px" }}>
              <div style={{ width:"16px", height:"16px", borderRadius:"50%", flexShrink:0, backgroundColor:"rgba(74,222,128,0.25)", border:"1.5px solid rgba(74,222,128,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:"10px", color:"#4ADE80", lineHeight:1 }}>✓</span>
              </div>
              <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.45)", fontFamily:inter }}>{step}</span>
            </div>
          ))}
          {analysisStep && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:"12px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                {isFinalStep
                  ? <div style={{ width:"16px", height:"16px", borderRadius:"50%", flexShrink:0, backgroundColor:"rgba(74,222,128,0.3)", border:"1.5px solid rgba(74,222,128,0.8)", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:"10px", color:"#4ADE80", lineHeight:1 }}>✓</span></div>
                  : <div style={{ width:"16px", height:"16px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"white", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
                }
                <span style={{ fontSize:"13px", fontWeight:700, fontFamily:inter, color: isFinalStep ? "#4ADE80" : "white" }}>{analysisStep}</span>
              </div>
              <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.9)", fontWeight:700, fontFamily:inter }}>{progress}%</span>
            </div>
          )}
          <div style={{ width:"100%", height:"6px", borderRadius:"100px", backgroundColor:"rgba(255,255,255,0.15)", overflow:"hidden" }}>
            <div style={{ width:`${progress}%`, height:"100%", background: isFinalStep ? "linear-gradient(90deg,#4ADE80,#22C55E)" : "linear-gradient(90deg,#60A5FA,#FFFFFF)", transition:"width 0.25s ease", borderRadius:"100px" }} />
          </div>
        </div>
      ) : (
        <>
          {/* HITL Banner */}
          {hasHITL && (
            <div style={{ margin:"0 16px 12px", borderRadius:"12px", backgroundColor:"rgba(251,191,36,0.18)", border:"1px solid rgba(251,191,36,0.35)", padding:"10px 12px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                <AlertTriangle size={14} color="#FCD34D" />
                <span style={{ fontSize:"12px", fontWeight:700, color:"#FDE68A", fontFamily:inter }}>Manual Vendor Review Required</span>
              </div>
              <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.6)", fontFamily:inter, marginBottom:"6px" }}>This ticket requires Vendor approval before a technician is dispatched.</p>
              {s.hitlTriggers.map((t, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"6px", marginBottom:"3px" }}>
                  <span style={{ fontSize:"10px", color:"#FCD34D", marginTop:"1px" }}>•</span>
                  <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.65)", fontFamily:inter }}>{HITL_LABELS[t] || t}</span>
                </div>
              ))}
              {s.detectedKeywords && s.detectedKeywords.length > 0 && (
                <p style={{ fontSize:"11px", color:"rgba(253,230,138,0.75)", fontFamily:inter, marginTop:"4px" }}>Keywords detected: {s.detectedKeywords.join(", ")}</p>
              )}
            </div>
          )}

          {/* Auto-Correction Banner */}
          {hasCorrection && (
            <div style={{ margin:"0 16px 12px", borderRadius:"12px", backgroundColor:"rgba(37,99,235,0.25)", border:"1px solid rgba(96,165,250,0.4)", padding:"10px 12px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                <RotateCcw size={13} color="#60A5FA" />
                <span style={{ fontSize:"12px", fontWeight:700, color:"#93C5FD", fontFamily:inter }}>AI Auto-Corrected Fault Type</span>
              </div>
              <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.55)", fontFamily:inter }}>Original: <span style={{ fontFamily:"monospace", color:"#FCA5A5" }}>{s.original_fault_type}</span></p>
              <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.55)", fontFamily:inter }}>Corrected: <span style={{ fontFamily:"monospace", color:"#86EFAC" }}>{s.faultCategory}</span></p>
            </div>
          )}

          <div style={{ height:"1px", backgroundColor:"rgba(255,255,255,0.12)", marginBottom:"12px" }} />

          {/* Core predictions */}
          <div style={{ padding:"0 16px 12px", display:"flex", flexDirection:"column" as const, gap:"10px" }}>
            <AIRow icon={<Monitor size={14} color="rgba(255,255,255,0.85)" />}   label="Equipment"      value={s.equipment} />
            <AIRow icon={<Database size={14} color="rgba(255,255,255,0.85)" />}  label="Domain"         value={s.domain} />
            <AIRow icon={<Tag size={14} color="rgba(255,255,255,0.85)" />}        label="Fault Category"  value={s.faultCategory} />
            <AIRow icon={<ShieldAlert size={14} color="rgba(255,255,255,0.85)" />} label="Predicted Issue" value={s.predictedIssue} />
            <AIRow icon={<Search size={14} color="rgba(255,255,255,0.85)" />}    label="Root Cause"     value={s.rootCause} />

            {/* Priority chip */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:"22px", height:"22px", borderRadius:"6px", backgroundColor:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Zap size={13} color="rgba(255,255,255,0.85)" /></div>
              <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.55)", fontFamily:inter, width:"90px", flexShrink:0 }}>Suggested Priority</span>
              <span style={{ fontSize:"12px", fontWeight:700, fontFamily:inter, backgroundColor:"rgba(255,255,255,0.15)", borderRadius:"8px", padding:"2px 10px",
                color: s.priority === "Critical" ? "#FCA5A5" : s.priority === "High" ? "#FCD34D" : s.priority === "Low" ? "#86EFAC" : "#FDE68A"
              }}>{s.priority}</span>
            </div>

            {/* Severity */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:"22px", height:"22px", borderRadius:"6px", backgroundColor:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Flame size={13} color="rgba(255,255,255,0.85)" /></div>
              <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.55)", fontFamily:inter, width:"90px", flexShrink:0 }}>Severity</span>
              <span style={{ fontSize:"12px", fontWeight:600, fontFamily:inter, color:"rgba(255,255,255,0.9)" }}>{s.severity}</span>
            </div>

            {/* Confidence bar */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:"22px", height:"22px", borderRadius:"6px", backgroundColor:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Activity size={13} color="rgba(255,255,255,0.85)" /></div>
              <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.55)", fontFamily:inter, width:"90px", flexShrink:0 }}>Confidence</span>
              <div style={{ flex:1, display:"flex", alignItems:"center", gap:"8px" }}>
                <div style={{ flex:1, height:"6px", borderRadius:"100px", backgroundColor:"rgba(255,255,255,0.15)" }}>
                  <div style={{ width:`${s.confidence}%`, height:"100%", borderRadius:"100px",
                    background: s.confidence >= 85 ? "linear-gradient(90deg,#4ADE80,#22C55E)" : s.confidence >= 70 ? "linear-gradient(90deg,#FCD34D,#F59E0B)" : "linear-gradient(90deg,#FCA5A5,#EF4444)"
                  }} />
                </div>
                <span style={{ fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,0.9)", fontFamily:inter, flexShrink:0 }}>{s.confidence}%</span>
              </div>
            </div>

            <AIRow icon={<Brain size={14} color="rgba(255,255,255,0.85)" />} label="Reasoning" value={s.reasoning} />
          </div>

          {/* Extended predictions */}
          <div style={{ height:"1px", backgroundColor:"rgba(255,255,255,0.1)", margin:"0 16px 12px" }} />
          <div style={{ padding:"0 16px 12px", display:"flex", flexDirection:"column" as const, gap:"10px" }}>
            <AIRow icon={<Wrench size={14} color="rgba(255,255,255,0.85)" />}  label="Required Skills" value={s.requiredSkills?.join(", ")} />
            <AIRow icon={<Package size={14} color="rgba(255,255,255,0.85)" />} label="Spare Parts"     value={s.suggestedParts?.length ? s.suggestedParts.join(", ") : "None identified"} />
            <AIRow icon={<Clock size={14} color="rgba(255,255,255,0.85)" />}   label="Est. Resolution" value={s.estimatedHours ? `${s.estimatedHours} hrs` : "—"} />
            <AIRow icon={<Calendar size={14} color="rgba(255,255,255,0.85)" />} label="Recommended SLA" value={s.recommendedSLA} />
          </div>

          {/* Risk Panel */}
          {hasRisk && (
            <>
              <div style={{ height:"1px", backgroundColor:"rgba(255,255,255,0.1)", margin:"0 16px 12px" }} />
              <div style={{ padding:"0 16px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                    <Shield size={13} color="rgba(255,255,255,0.7)" />
                    <span style={{ fontSize:"11.5px", fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:inter }}>Risk Assessment (0–5)</span>
                  </div>
                  <span style={{ fontSize:"10.5px", fontWeight:700, fontFamily:inter, backgroundColor:"rgba(255,255,255,0.12)", borderRadius:"6px", padding:"2px 8px", color:riskColor }}>
                    {s.riskLevel} RISK
                  </span>
                </div>
                <div style={{ display:"flex", flexDirection:"column" as const, gap:"8px" }}>
                  <RiskBar label="Safety Risk"        score={s.safetyScore}       color="#FCA5A5" />
                  <RiskBar label="Operational Impact" score={s.operationalImpact}  color="#FCD34D" />
                  <RiskBar label="Escalation Risk"    score={s.escalationRisk}     color="#FDE68A" />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Technician Assignment Card ───────────────────────────────────────────────
function TechnicianCard({ tech, routing }: { tech: ReturnType<typeof findBestTechnician>; routing: ReturnType<typeof decideRouting> }) {
  const isVendorReview = routing.route === "vendor_review";
  return (
    <div style={{ borderRadius:"14px", backgroundColor:card, border:`1px solid ${border}`, boxShadow:cardShadow, padding:"14px", marginBottom:"16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
        <Building2 size={14} color={isVendorReview ? orange : green} />
        <span style={{ fontSize:"12.5px", fontWeight:700, color:ink, fontFamily:inter }}>Dispatch Routing</span>
        <div style={{ marginLeft:"auto", backgroundColor: isVendorReview ? orangeT : greenT, borderRadius:"8px", padding:"2px 10px" }}>
          <span style={{ fontSize:"11px", fontWeight:700, color: isVendorReview ? orange : green, fontFamily:inter }}>
            {isVendorReview ? "Vendor Review" : "Auto-Assign"}
          </span>
        </div>
      </div>

      {isVendorReview ? (
        <div style={{ backgroundColor:amberT, borderRadius:"10px", padding:"10px 12px", border:`1px solid rgba(217,119,6,0.2)` }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px" }}>
            <AlertTriangle size={13} color={amber} />
            <span style={{ fontSize:"11.5px", fontWeight:600, color:amber, fontFamily:inter }}>Requires Vendor Approval</span>
          </div>
          <p style={{ fontSize:"11px", color:inkSec, fontFamily:inter, lineHeight:1.4 }}>{routing.reason}</p>
        </div>
      ) : tech ? (
        <div style={{ backgroundColor:greenT, borderRadius:"10px", padding:"10px 12px", border:`1px solid rgba(22,163,74,0.2)`, display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ width:"36px", height:"36px", borderRadius:"50%", backgroundColor:green, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontSize:"13px", fontWeight:700, color:"white", fontFamily:inter }}>{tech.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>
          </div>
          <div>
            <p style={{ fontSize:"12.5px", fontWeight:700, color:ink, fontFamily:inter }}>{tech.name}</p>
            <p style={{ fontSize:"11px", color:inkMut, fontFamily:inter }}>{tech.role}</p>
            <p style={{ fontSize:"10.5px", color:green, fontFamily:inter, fontWeight:600 }}>✓ Available · SLA adherence {tech.slaAdherence}%</p>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor:blueTint, borderRadius:"10px", padding:"10px 12px", border:`1px solid rgba(37,99,235,0.15)` }}>
          <p style={{ fontSize:"11.5px", color:inkSec, fontFamily:inter }}>Technician will be automatically assigned by the Vendor after approval.</p>
        </div>
      )}
    </div>
  );
}

// ─── SLA Preview Card ─────────────────────────────────────────────────────────
function SLAPreviewCard({ priority, slaDeadline }: { priority: string; slaDeadline: string }) {
  const responseHrs  = (mockSLAContract.responseSLA  as Record<string,number>)[priority] || 8;
  const resolutionHrs = (mockSLAContract.resolutionSLA as Record<string,number>)[priority] || 24;
  const urgency = priority === "Critical" ? red : priority === "High" ? orange : priority === "Medium" ? amber : green;

  return (
    <div style={{ borderRadius:"14px", backgroundColor:card, border:`1px solid ${border}`, boxShadow:cardShadow, padding:"14px", marginBottom:"16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
        <Calendar size={14} color={blue} />
        <span style={{ fontSize:"12.5px", fontWeight:700, color:ink, fontFamily:inter }}>SLA Commitment</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column" as const, gap:"6px" }}>
        {[
          { label:"Response Required", value:`within ${responseHrs}h` },
          { label:"Resolution Target",  value:`within ${resolutionHrs}h` },
          { label:"Response Deadline",  value:slaDeadline, highlight:true },
        ].map(row => (
          <div key={row.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:"12px", color:inkMut, fontFamily:inter }}>{row.label}</span>
            <span style={{ fontSize:"12px", fontWeight:700, color: row.highlight ? urgency : ink, fontFamily:inter }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Confirm Overwrite Modal (preserved) ──────────────────────────────────────
interface ConfirmOverwriteProps { fields: string[]; onKeep: () => void; onOverwrite: () => void; }
function ConfirmOverwriteModal({ fields, onKeep, onOverwrite }: ConfirmOverwriteProps) {
  return (
    <div style={{ position:"absolute", inset:0, backgroundColor:"rgba(15,23,42,0.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:"24px", paddingBottom:"100px" }}>
      <div style={{ backgroundColor:card, borderRadius:"20px", padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,0.25)", width:"100%", maxWidth:"320px" }}>
        <div style={{ width:"52px", height:"52px", borderRadius:"14px", backgroundColor:amberT, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
          <AlertCircle size={26} color={amber} />
        </div>
        <h3 style={{ fontSize:"16px", fontWeight:800, color:ink, fontFamily:inter, textAlign:"center", marginBottom:"8px" }}>Overwrite Existing Values?</h3>
        <p style={{ fontSize:"13px", color:inkMut, fontFamily:inter, textAlign:"center", marginBottom:"12px", lineHeight:1.5 }}>These fields already have values:</p>
        <div style={{ backgroundColor:bg, borderRadius:"10px", padding:"10px 14px", marginBottom:"20px" }}>
          {fields.map(f => (
            <div key={f} style={{ display:"flex", alignItems:"center", gap:"6px", paddingBottom:"4px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", backgroundColor:amber, flexShrink:0 }} />
              <span style={{ fontSize:"12.5px", fontWeight:600, color:inkSec, fontFamily:inter }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          <button type="button" onClick={onKeep} style={{ flex:1, height:"44px", borderRadius:"12px", backgroundColor:divider, border:`1px solid ${border}`, color:inkSec, fontSize:"13.5px", fontWeight:700, fontFamily:inter, cursor:"pointer" }}>Keep Existing</button>
          <button type="button" onClick={onOverwrite} style={{ flex:1, height:"44px", borderRadius:"12px", background:`linear-gradient(135deg,${blue},${blueDark})`, border:"none", color:"white", fontSize:"13.5px", fontWeight:700, fontFamily:inter, cursor:"pointer", boxShadow:blueShadow }}>Overwrite All</button>
        </div>
      </div>
    </div>
  );
}

// Success Overlay removed, integrated into Stage 4

// ─── Navigation Bar (stage footer) ───────────────────────────────────────────
function StageNav({ onBack, onNext, nextLabel, nextDisabled, submitting }: {
  onBack?: () => void; onNext?: () => void; nextLabel: string;
  nextDisabled?: boolean; submitting?: boolean;
}) {
  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 16px 28px", backgroundColor:card, borderTop:`1px solid ${border}`, display:"flex", gap:"10px", zIndex:10 }}>
      {onBack && (
        <button type="button" onClick={onBack} style={{ flex:1, height:"50px", borderRadius:"14px", border:`1.5px solid ${border}`, backgroundColor:bg, color:inkSec, fontSize:"14px", fontWeight:600, fontFamily:inter, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
          <ArrowLeft size={16} color={inkSec} /> Back
        </button>
      )}
      {onNext && (
        <button type="button" onClick={onNext} disabled={nextDisabled || submitting} style={{
          flex: onBack ? 2 : 1, height:"50px", borderRadius:"14px", border:"none",
          background: nextDisabled || submitting ? "#94A3B8" : `linear-gradient(135deg,${blue},${blueDark})`,
          color:"white", fontSize:"14px", fontWeight:700, fontFamily:inter,
          cursor: nextDisabled || submitting ? "not-allowed" : "pointer",
          boxShadow: nextDisabled || submitting ? "none" : blueShadow,
          display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
          transition:"all 0.2s ease"
        }}>
          {submitting ? "Submitting…" : nextLabel}
          {!submitting && !nextDisabled && <ArrowRight size={16} color="white" />}
        </button>
      )}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RaiseTicketScreen() {
  const navigate   = useNavigate();
  const routerLoc  = useRouterLocation();
  const safeBack   = useSafeBack();
  const { updateOpportunityStatus } = useRevenueContext();

  const prefillState = (routerLoc.state as any)?.prefill as {
    title?: string; category?: string; asset?: string; assetId?: string;
    priority?: string; description?: string; location?: string;
  } | undefined;
  const sourceOppId = (routerLoc.state as any)?.sourceOppId as number | undefined;

  // ── Stage ──
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);

  // ── Form state ──
  const [title,       setTitle]       = useState("");
  const [category,    setCategory]    = useState("");
  const [asset,       setAsset]       = useState("");
  const [description, setDescription] = useState("");
  const [location,    setLocation]    = useState("");
  const [floor,       setFloor]       = useState("");
  const [imageFile,   setImageFile]   = useState<{ url: string; name: string } | null>(null);
  const [audioFile,   setAudioFile]   = useState<{ url: string; name: string } | null>(null);
  const [errors,      setErrors]      = useState<Record<string,string>>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [successId,   setSuccessId]   = useState<string | null>(null);

  // ── AI state ──
  const [aiResult,     setAiResult]     = useState<AIAnalysisResponse | null>(null);
  const [aiSource,     setAiSource]     = useState<"image"|"audio"|"text"|"multimodal">("text");
  const [aiAnalyzing,  setAiAnalyzing]  = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showValidationBanner, setShowValidationBanner] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const stage1ScrollRef = useRef<HTMLDivElement>(null);

  // ── Derived ──
  const selectedAsset = VENDOR_ASSETS.find(a => a.name === asset) || null;
  const routing       = decideRouting(aiResult?.priority || "Medium", aiResult, selectedAsset);
  const assignedTech  = routing.route === "auto_assign"
    ? findBestTechnician(category, aiResult?.requiredSkills || [], location) : null;
  const slaDeadline   = aiResult?.priority ? computeSlaDeadline(aiResult.priority) : "";

  // ── Pre-fill ──
  useEffect(() => {
    if (prefillState) {
      if (prefillState.title)       setTitle(prefillState.title);
      if (prefillState.category)    setCategory(prefillState.category);
      if (prefillState.asset)       setAsset(prefillState.asset);
      if (prefillState.description) setDescription(prefillState.description);
      if (prefillState.location)    setLocation(prefillState.location);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-fill location from asset ──
  useEffect(() => {
    if (selectedAsset) {
      if (!location) setLocation(selectedAsset.location);
      if (!floor && selectedAsset.floor) setFloor(selectedAsset.floor);
      if (!category) setCategory(selectedAsset.category);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  const clearError = (field: string) =>
    setErrors(prev => { const n = {...prev}; delete n[field]; return n; });

  // ── Stage 1 validation ──
  const validateStage1 = () => {
    const e: Record<string,string> = {};
    if (!title.trim())                                                         e.title       = "Title is required";
    if (!category)                                                             e.category    = "Please select a category";
    if (!description.trim())                                                   e.description = "Description is required";
    if (description.trim().length > 0 && description.trim().length < 15)      e.description = "Description must be at least 15 characters";
    if (!location)                                                             e.location    = "Please select a location";
    return e;
  };

  // ── 12-step AI pipeline ──
  const PIPELINE: { msg: string }[] = [
    { msg: "Upload received"                    },
    { msg: "Validating evidence..."             },
    { msg: "Analyzing image..."                 },
    { msg: "Extracting visual features..."      },
    { msg: "Parsing fault description..."       },
    { msg: "Matching known fault patterns..."   },
    { msg: "Identifying equipment type..."      },
    { msg: "Predicting fault category..."       },
    { msg: "Assessing severity & risk..."       },
    { msg: "Computing required skills..."       },
    { msg: "Calculating SLA recommendation..."  },
    { msg: "Analysis Complete"                  },
  ];

  const STEP_DURATION = 280; // ms per step

  const runAnalysis = () => {
    const srcCount = [!!description.trim(), !!imageFile, !!audioFile].filter(Boolean).length;
    const src = srcCount > 1 ? "multimodal" : imageFile ? "image" : audioFile ? "audio" : "text";
    setAiSource(src as any);
    setAiResult(null);
    setCompletedSteps([]);
    setAiAnalyzing(true);
    setAnalysisStep(PIPELINE[0].msg);

    let cursor = 0;
    PIPELINE.forEach(step => {
      setTimeout(() => setAnalysisStep(step.msg), cursor);
      setTimeout(() => setCompletedSteps(prev => [...prev, step.msg]), cursor + STEP_DURATION);
      cursor += STEP_DURATION;
    });

    setTimeout(async () => {
      const res = await runAIAnalysis({
        description, hasImage: !!imageFile, hasAudio: !!audioFile,
        assetId: selectedAsset?.id, assetCategory: selectedAsset?.category || category, location, priority: "Medium",
      } as AIAnalysisRequest);
      setAiResult(res);
      setAiAnalyzing(false);
      finalizeTicket(res);
    }, cursor + 200);
  };

  // ── Stage transitions ──
  const goStage1to2 = () => {
    const e = validateStage1();
    if (Object.keys(e).length) {
      setErrors(e);
      setShowValidationBanner(true);
      // Scroll to top so the error banner is visible
      stage1ScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors({});
    setShowValidationBanner(false);
    setStage(2);
  };

  const goStage2to3 = () => {
    setStage(3);
  };

  const goStage3to4 = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStage(4);
      runAnalysis();
    }, 800);
  };

  // ── Image upload ──
  const handleImageFile = (f: File) => {
    const valid = ["image/jpeg", "image/jpg", "image/png"];
    if (!valid.includes(f.type)) { alert("Please upload a JPG or PNG image."); return; }
    if (f.size > 10 * 1024 * 1024) { alert("File size must be less than 10MB."); return; }
    setImageFile({ url: URL.createObjectURL(f), name: f.name });
    setAudioFile(null);
  };

  // ── Finalize Submit (after AI runs) ──
  const finalizeTicket = (res: AIAnalysisResponse) => {
      const finalPriority = res.priority || "Medium";
      const newId = `TKT-${(Date.now() % 100000).toString().padStart(5, "0")}`;
      const slaResponse   = (mockSLAContract.responseSLA   as Record<string,number>)[finalPriority] || 8;
      const slaResolution = (mockSLAContract.resolutionSLA as Record<string,number>)[finalPriority] || 24;
      const slaDeadlineISO = new Date(Date.now() + slaResponse * 3600000).toISOString();
      
      const finalRouting = decideRouting(finalPriority, res, selectedAsset);
      const finalAssignedTech = finalRouting.route === "auto_assign"
        ? findBestTechnician(category, res.requiredSkills || [], location) : null;

      mockTickets[newId] = {
        id: newId, title: title.trim(), category, location,
        reportedTime: "Just now",
        priority: finalPriority as any,
        status: finalRouting.route === "vendor_review" ? "Open" : "In Progress",
        assetId: selectedAsset?.id || prefillState?.assetId || "AST-UNKNOWN",
        technicianId: finalAssignedTech?.id || "", slaId: "SLA-001",
        aiId: newId, timelineId: "",
      };

      publishEvent({
        type: "TICKET_CREATED",
        payload: {
          ticket: {
            id: newId,
            assetId: selectedAsset?.id || prefillState?.assetId || "AST-UNKNOWN",
            assetName: selectedAsset?.name || asset,
            category, priority: finalPriority, title: title.trim(),
            location: [location, floor].filter(Boolean).join(" › "),
            status: finalRouting.route === "vendor_review" ? "Pending Review" : "Approved",
            slaDeadline: slaDeadlineISO, slaResponseHrs: slaResponse, slaResolutionHrs: slaResolution,
            imageUrl: imageFile?.url,
            aiAnalysis: {
              faultType: res.faultCategory || res.predictedIssue || "",
              severity: res.severity, confidence: (res.confidence || 0) / 100,
              reasoning: res.reasoning || "", safetyFlag: res.safetyFlag || false,
              suggestedSkill: res.requiredSkills?.[0] || "",
              suggestedTechnicianName: finalAssignedTech?.name || "",
              suggestedPriority: res.priority, suggestedSLA: res.recommendedSLA || "",
              estimatedHours: res.estimatedHours || 0, hitlTriggers: res.hitlTriggers || [],
            },
            routing: finalRouting, assignedTechnicianId: finalAssignedTech?.id, assignedTechnicianName: finalAssignedTech?.name,
          }
        }
      });

      if (finalPriority === "Critical") {
        publishEvent({ type: "SLA_WARNING", payload: { ticketId: newId, urgency: "critical", timeRemaining: `${slaResponse}h` } });
      }

      if (sourceOppId !== undefined) updateOpportunityStatus(sourceOppId, "Action Started", newId);

      setSuccessId(newId);
  };

  // ── Stage header info ──
  const stageInfo = {
    1: { title: "Ticket Information",  sub: "Describe the issue and affected asset" },
    2: { title: "Evidence",            sub: "Attach photos or a voice note (optional)" },
    3: { title: "Submit Ticket",       sub: "Review your ticket details before submitting" },
    4: { title: "AI Analysis",         sub: "Analysing your submitted request" },
  }[stage];

  return (
    <div style={{ width:"390px", height:"844px", display:"flex", flexDirection:"column", backgroundColor:bg, overflow:"hidden", fontFamily:inter, position:"relative" }}>
      {/* Hidden file inputs — visually hidden so refs remain clickable in all browsers */}
      <input type="file" ref={imageInputRef} accept="image/jpeg,image/jpg,image/png" style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, zIndex: -1 }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
      />
      <input type="file" ref={audioInputRef} accept="audio/mp3,audio/wav,audio/x-m4a,audio/m4a,audio/*" style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, zIndex: -1 }}
        onChange={e => { const f = e.target.files?.[0]; if (f) { setAudioFile({ url: URL.createObjectURL(f), name: f.name }); setImageFile(null); } e.target.value = ""; }}
      />
      <StatusBar />

      {/* ── Fixed Header ── */}
      <div style={{ background:`linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`, padding:"10px 20px 0", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
          <button type="button" onClick={() => stage === 1 ? safeBack("/my-tickets") : setStage(s => (s - 1) as any)} style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:"10px", padding:"6px 12px 6px 9px", cursor:"pointer", fontSize:"12.5px", fontWeight:600, color:"white", fontFamily:inter }}>
            <ArrowLeft size={15} color="white" /> {stage === 1 ? "Cancel" : "Back"}
          </button>
          <div style={{ backgroundColor:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.22)", borderRadius:"100px", padding:"4px 12px" }}>
            <span style={{ fontSize:"12px", fontWeight:700, color:"white", fontFamily:inter }}>New Request</span>
          </div>
        </div>
        <div style={{ paddingBottom:"4px" }}>
          <h1 style={{ fontSize:"18px", fontWeight:800, color:"white", letterSpacing:"-0.025em", fontFamily:inter, marginBottom:"2px" }}>{stageInfo.title}</h1>
          <p style={{ fontSize:"11.5px", color:"rgba(255,255,255,0.65)", fontFamily:inter }}>{stageInfo.sub}</p>
        </div>

        {/* Stage Progress — white background tab below header gradient */}
        <div style={{ backgroundColor:card, borderRadius:"12px 12px 0 0", marginTop:"8px" }}>
          <StageProgress current={stage} />
        </div>
      </div>

      {/* ── Stage Content ── */}

      {/* STAGE 1 — Ticket Information */}
      {stage === 1 && (
        <>
          <div ref={stage1ScrollRef} style={{ flex:1, overflowY:"auto", scrollbarWidth:"none", padding:"18px 16px 100px" }}>

            {/* Validation error banner */}
            {showValidationBanner && Object.keys(errors).length > 0 && (
              <div style={{ backgroundColor:redT, border:`1.5px solid ${red}`, borderRadius:"12px", padding:"11px 14px", marginBottom:"14px", display:"flex", alignItems:"flex-start", gap:"10px" }}>
                <AlertCircle size={16} color={red} style={{ flexShrink:0, marginTop:"1px" }} />
                <div>
                  <p style={{ fontSize:"12.5px", fontWeight:700, color:red, fontFamily:inter, marginBottom:"4px" }}>Please fix the following before continuing:</p>
                  {Object.values(errors).map((msg, i) => (
                    <p key={i} style={{ fontSize:"12px", color:red, fontFamily:inter }}>• {msg}</p>
                  ))}
                </div>
              </div>
            )}
            <Field label="Ticket Title" required error={errors.suggestedTitle}>
              <TextInput
                value={title} onChange={v => { setTitle(v); clearError("title"); }}
                placeholder="Describe the issue briefly…"
                hasError={!!errors.suggestedTitle}
                icon={<FileText size={15} color={inkFaint} />}
              />
            </Field>

            <div style={{ display:"flex", gap:"10px" }}>
              <div style={{ flex:1 }}>
                <Field label="Category" required error={errors.suggestedCategory}>
                  <Select value={category} onChange={v => { setCategory(v); clearError("category"); }} options={CATEGORIES} placeholder="Select…" hasError={!!errors.suggestedCategory} />
                </Field>
              </div>
              <div style={{ flex:1 }}>
                <Field label="Asset">
                  <Select value={asset} onChange={setAsset} options={ASSET_NAMES} placeholder="Select…" />
                </Field>
              </div>
            </div>

            {selectedAsset?.activeTicketId && (
              <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 12px", backgroundColor:amberT, borderRadius:"10px", border:`1px solid rgba(217,119,6,0.2)`, marginBottom:"14px", marginTop:"-8px" }}>
                <AlertTriangle size={13} color={amber} />
                <span style={{ fontSize:"11.5px", color:amber, fontFamily:inter, fontWeight:600 }}>Active ticket already exists for this asset</span>
              </div>
            )}

            <Field label="Description" required error={errors.description}>
              <TextArea value={description} onChange={v => { setDescription(v); clearError("description"); }} placeholder="Provide detailed information about the issue… (minimum 15 characters)" hasError={!!errors.description} />
            </Field>

            <div style={{ display:"flex", gap:"10px" }}>
              <div style={{ flex:2 }}>
                <Field label="Location" required error={errors.location}>
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                      <MapPin size={15} color={inkFaint} />
                    </div>
                    <select value={location} onChange={e => { setLocation(e.target.value); clearError("location"); }} style={{ width:"100%", height:"46px", borderRadius:"12px", padding:"0 14px 0 38px", border: errors.location ? `1.5px solid ${red}` : `1.5px solid ${border}`, backgroundColor:bg, fontSize:"14px", color: location ? ink : inkFaint, fontFamily:inter, outline:"none", appearance:"auto", boxSizing:"border-box" as const }}>
                      <option value="">Select location…</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </Field>
              </div>
              <div style={{ flex:1 }}>
                <Field label="Floor / Zone">
                  <TextInput value={floor} onChange={setFloor} placeholder="e.g. Floor 3" />
                </Field>
              </div>
            </div>
          </div>

          <StageNav nextLabel="Next: Add Evidence" onNext={goStage1to2} />
        </>
      )}

      {/* STAGE 2 — Evidence */}
      {stage === 2 && (
        <>
          <div style={{ flex:1, overflowY:"auto", scrollbarWidth:"none", padding:"18px 16px 100px" }}>

            {/* Guidance card */}
            <div style={{ backgroundColor:blueTint, borderRadius:"14px", padding:"14px", border:`1px solid rgba(37,99,235,0.15)`, marginBottom:"20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                <Info size={14} color={blue} />
                <span style={{ fontSize:"12.5px", fontWeight:700, color:blue, fontFamily:inter }}>Why Add Evidence?</span>
              </div>
              <p style={{ fontSize:"12px", color:inkSec, fontFamily:inter, lineHeight:1.5 }}>
                Evidence improves AI accuracy by up to 40%. A clear photo of the fault or a short voice description helps the AI correctly classify the fault and recommend the right technician.
              </p>
            </div>

            {/* Image attachment */}
            <div style={{ marginBottom:"16px" }}>
              <span style={{ fontSize:"12.5px", fontWeight:600, color:inkSec, fontFamily:inter, display:"block", marginBottom:"10px" }}>📷 Photo Evidence</span>
              {imageFile ? (
                <div style={{ borderRadius:"14px", border:`1.5px solid ${blue}`, backgroundColor:blueTint, overflow:"hidden", boxShadow:cardShadow }}>
                  <img src={imageFile.url} alt="Evidence" style={{ width:"100%", height:"160px", objectFit:"cover", display:"block" }} />
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px" }}>
                    <span style={{ fontSize:"12.5px", fontWeight:600, color:blue, fontFamily:inter, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const, flex:1 }}>{imageFile.name}</span>
                    <button type="button" onClick={() => setImageFile(null)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", marginLeft:"10px" }}>
                      <X size={16} color={red} />
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={(e) => { e.preventDefault(); imageInputRef.current?.click(); }} style={{ width:"100%", height:"110px", borderRadius:"14px", border:`2px dashed ${border}`, backgroundColor:bg, cursor:"pointer", display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", gap:"6px" }}>
                  <div style={{ width:"40px", height:"40px", borderRadius:"12px", backgroundColor:divider, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Paperclip size={20} color={inkFaint} />
                  </div>
                  <span style={{ fontSize:"13px", fontWeight:600, color:inkMut, fontFamily:inter }}>Tap to upload a photo</span>
                  <span style={{ fontSize:"11px", color:inkFaint, fontFamily:inter }}>JPG / PNG · max 10MB</span>
                </button>
              )}
            </div>

            {/* Audio attachment */}
            <div style={{ marginBottom:"16px" }}>
              <span style={{ fontSize:"12.5px", fontWeight:600, color:inkSec, fontFamily:inter, display:"block", marginBottom:"10px" }}>🎤 Voice Note</span>
              {audioFile ? (
                <div style={{ display:"flex", alignItems:"center", gap:"12px", backgroundColor:card, borderRadius:"14px", border:`1.5px solid ${blue}`, padding:"14px", boxShadow:cardShadow }}>
                  <div style={{ width:"44px", height:"44px", borderRadius:"12px", backgroundColor:blueTint, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Mic size={20} color={blue} />
                  </div>
                  <div style={{ flex:1, overflow:"hidden" }}>
                    <span style={{ fontSize:"13px", fontWeight:600, color:ink, fontFamily:inter, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{audioFile.name}</span>
                    <span style={{ fontSize:"11px", color:inkMut, fontFamily:inter }}>Audio attached · ready for AI analysis</span>
                  </div>
                  <button type="button" onClick={() => setAudioFile(null)} style={{ background:"none", border:"none", cursor:"pointer" }}>
                    <X size={16} color={red} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={(e) => { e.preventDefault(); audioInputRef.current?.click(); }} style={{ width:"100%", height:"82px", borderRadius:"14px", border:`2px dashed ${border}`, backgroundColor:bg, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"12px" }}>
                  <div style={{ width:"40px", height:"40px", borderRadius:"12px", backgroundColor:divider, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Mic size={20} color={inkFaint} />
                  </div>
                  <div style={{ textAlign:"left" as const }}>
                    <span style={{ fontSize:"13px", fontWeight:600, color:inkMut, fontFamily:inter, display:"block" }}>Upload a voice note</span>
                    <span style={{ fontSize:"11px", color:inkFaint, fontFamily:inter }}>MP3, WAV, M4A</span>
                  </div>
                </button>
              )}
            </div>

            {/* Skip note */}
            {!imageFile && !audioFile && (
              <div style={{ textAlign:"center" as const, padding:"4px 0 8px" }}>
                <span style={{ fontSize:"12px", color:inkFaint, fontFamily:inter }}>Evidence is optional. AI will analyse based on your description.</span>
              </div>
            )}
          </div>

          <StageNav onBack={() => setStage(1)} onNext={goStage2to3} nextLabel="Next: Review" />
        </>
      )}

      {/* STAGE 3 — Submit Ticket */}
      {stage === 3 && (
        <>
          <div style={{ flex:1, overflowY:"auto", scrollbarWidth:"none", padding:"18px 16px 100px" }}>
            <div style={{ borderRadius:"14px", backgroundColor:card, border:`1px solid ${border}`, boxShadow:cardShadow, padding:"14px", marginBottom:"16px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                <FileText size={14} color={blue} />
                <span style={{ fontSize:"12.5px", fontWeight:700, color:ink, fontFamily:inter }}>Ticket Details</span>
              </div>
              {[
                { label:"Title",    value: title },
                { label:"Asset",    value: selectedAsset?.name || asset || "General" },
                { label:"Location", value: [location, floor].filter(Boolean).join(" › ") },
                { label:"Category", value: category },
              ].map(row => (
                <div key={row.label} style={{ display:"flex", alignItems:"flex-start", gap:"8px", marginBottom:"6px" }}>
                  <span style={{ fontSize:"11.5px", color:inkMut, fontFamily:inter, width:"64px", flexShrink:0 }}>{row.label}</span>
                  <span style={{ fontSize:"12px", fontWeight:500, color:ink, fontFamily:inter, flex:1 }}>{row.value || "—"}</span>
                </div>
              ))}
            </div>

            {/* Attachments Summary */}
            {(imageFile || audioFile) && (
              <div style={{ borderRadius:"14px", backgroundColor:card, border:`1px solid ${border}`, boxShadow:cardShadow, padding:"14px", marginBottom:"16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                  <Paperclip size={14} color={blue} />
                  <span style={{ fontSize:"12.5px", fontWeight:700, color:ink, fontFamily:inter }}>Attachments</span>
                </div>
                {imageFile && (
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:audioFile ? "8px" : 0 }}>
                    <div style={{ width:"24px", height:"24px", borderRadius:"6px", backgroundColor:blueTint, display:"flex", alignItems:"center", justifyContent:"center" }}><FileText size={12} color={blue} /></div>
                    <span style={{ fontSize:"11.5px", color:ink, fontFamily:inter, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{imageFile.name}</span>
                  </div>
                )}
                {audioFile && (
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ width:"24px", height:"24px", borderRadius:"6px", backgroundColor:blueTint, display:"flex", alignItems:"center", justifyContent:"center" }}><Mic size={12} color={blue} /></div>
                    <span style={{ fontSize:"11.5px", color:ink, fontFamily:inter, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{audioFile.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <StageNav
            onBack={() => setStage(2)}
            onNext={goStage3to4}
            nextLabel="Submit Ticket"
            submitting={submitting}
          />
        </>
      )}

      {/* STAGE 4 — AI Analysis */}
      {stage === 4 && (
        <>
          <div style={{ flex:1, overflowY:"auto", scrollbarWidth:"none", padding:"18px 16px 110px" }}>

            {/* Success Banner */}
            {successId && (
              <div style={{ backgroundColor:greenT, border:`1px solid rgba(22,163,74,0.2)`, borderRadius:"12px", padding:"12px 14px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"10px" }}>
                <CheckCircle size={20} color={green} />
                <div>
                  <p style={{ fontSize:"13px", fontWeight:700, color:green, fontFamily:inter, marginBottom:"2px" }}>Ticket Submitted Successfully</p>
                  <p style={{ fontSize:"11.5px", color:inkSec, fontFamily:inter }}>ID: <span style={{ fontWeight:700 }}>{successId}</span></p>
                </div>
              </div>
            )}

            {/* AI Card */}
            <AIInsightCard
              suggestion={aiResult || DEFAULT_AI_RESPONSE}
              source={aiSource}
              analyzing={aiAnalyzing}
              analysisStep={analysisStep}
              completedSteps={completedSteps}
            />

            {/* Only show cards after AI is done */}
            {!aiAnalyzing && aiResult && (
              <>
                {/* Technician Assignment Card */}
                <TechnicianCard tech={assignedTech} routing={routing} />

                {/* SLA Commitment Card */}
                {aiResult.priority && <SLAPreviewCard priority={aiResult.priority} slaDeadline={slaDeadline} />}

                {/* Completion Actions */}
                <div style={{ display:"flex", flexDirection:"column" as const, gap:"10px", marginTop:"20px" }}>
                  <button type="button" onClick={() => successId && navigate(`/ticket-details/${successId}`, { replace:true })} style={{ width:"100%", height:"46px", borderRadius:"12px", background:`linear-gradient(135deg,${blue},${blueDark})`, border:"none", color:"white", fontSize:"14px", fontWeight:700, fontFamily:inter, cursor:"pointer", boxShadow:blueShadow }}>
                    View Ticket Details
                  </button>
                  <button type="button" onClick={() => successId && navigate("/my-tickets", { replace:true, state: { newTicket: { id:successId, title, asset: asset||"General", location, priority: aiResult?.priority || "Medium", category, status:"Open", createdAt:"Just now", progress:0 } } })} style={{ width:"100%", height:"44px", borderRadius:"12px", backgroundColor:divider, border:`1px solid ${border}`, color:inkSec, fontSize:"14px", fontWeight:600, fontFamily:inter, cursor:"pointer" }}>
                    View My Tickets
                  </button>
                </div>
              </>
            )}

            {/* Waiting message while AI runs */}
            {aiAnalyzing && (
              <div style={{ textAlign:"center" as const, padding:"16px 0" }}>
                <p style={{ fontSize:"12.5px", color:inkMut, fontFamily:inter }}>Please wait while AI analyses your request…</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

