import { handleBackNavigation } from "../utils/navigation";
import { useNavigate, useSearchParams } from "react-router";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { useState } from "react";
import {
  ArrowLeft, Bell, User, Zap,
  Home, FileText, Database, Bot,
  AlertTriangle, CheckCircle2, Activity,
  TrendingDown, ChevronRight, Sparkles,
  Clock, Shield, Settings2, Wrench,
  CalendarClock, BarChart3,
} from "lucide-react";

import {
  useMachineHealthContext,
  Machine,
} from "../contexts/MachineHealthContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueDark = "#1D4ED8";
const blueMid  = "#3B82F6";
const blueTint = "#EFF6FF";

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

// ─── Data ─────────────────────────────────────────────────────────────────────
const MONTHLY = [
  { month: "Aug", value: 88 },
  { month: "Sep", value: 85 },
  { month: "Oct", value: 82 },
  { month: "Nov", value: 78 },
  { month: "Dec", value: 75 },
  { month: "Jan", value: 74 },
];
function useCurrentMachine(): Machine {
  const { machines } = useMachineHealthContext();
  const [searchParams] = useSearchParams();

  const machineName = searchParams.get("machine");
  const id = searchParams.get("id");

  const machine = machines.find(
    (m) => m.id === id || m.name === machineName
  );

  if (machine) {
    return machine;
  }

  if (machines.length > 0) {
    return machines[0];
  }

  throw new Error("Machine not found");
}

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3,5,7,9].map((h,i)=><div key={i} style={{ width:"3px", height:`${h}px`, borderRadius:"1px", backgroundColor:"white" }}/>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <div style={{ width:"22px", height:"11px", borderRadius:"2px", border:"1.5px solid white", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, right:"3px", backgroundColor:"white", borderRadius:"1px" }}/>
          </div>
          <div style={{ width:"2px", height:"5px", borderRadius:"1px", backgroundColor:"white" }}/>
        </div>
      </div>
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader() {
  const navigate = useNavigate();
  return (
    <div style={{ background:`linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding:"10px 20px 18px", flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
        <button type="button" style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:"10px", padding:"6px 12px 6px 9px", cursor:"pointer", fontSize:"12.5px", fontWeight:600, color:"white", fontFamily:inter }} onClick={() => handleBackNavigation(navigate, '/machine-health')}>
          <ArrowLeft size={15} color="white"/> Back
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ position:"relative" }}>
            <button type="button" style={{ width:"36px", height:"36px", borderRadius:"10px", backgroundColor:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <Bell size={17} color="white"/>
            </button>
            <div style={{ position:"absolute", top:"6px", right:"6px", width:"7px", height:"7px", borderRadius:"50%", backgroundColor:red, border:"1.5px solid #0052CC" }}/>
          </div>
          <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"linear-gradient(140deg,#334155,#1E293B)", display:"flex", alignItems:"center", justifyContent:"center", border:"1.5px solid rgba(255,255,255,0.2)" }}>
            <span style={{ fontSize:"12px", fontWeight:700, color:"white", fontFamily:inter }}>AC</span>
          </div>
        </div>
      </div>
      <h1 style={{ fontSize:"20px", fontWeight:800, color:"white", letterSpacing:"-0.025em", fontFamily:inter, marginBottom:"3px" }}>Health Analytics</h1>
      <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.65)", fontFamily:inter }}>AI-powered health score visualization</p>
    </div>
  );
}

// ─── Sect heading ─────────────────────────────────────────────────────────────
function Sect({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <p style={{ fontSize:"15px", fontWeight:800, color:ink, letterSpacing:"-0.02em", fontFamily:inter }}>{title}</p>
      {sub && <p style={{ fontSize:"11px", color:inkFaint, fontFamily:inter, marginTop:"2px" }}>{sub}</p>}
    </div>
  );
}

// ─── Large circular gauge ─────────────────────────────────────────────────────
function LargeGauge() {
  const machine = useCurrentMachine();
  const { health: HEALTH, status: STATUS, name: MACHINE, id: MACHINE_ID, iconColor, iconTint, icon: Icon } = machine;
  // Gauge geometry — 270° arc gap at bottom
  const cx = 130, cy = 128, r = 90, sw = 16;
  const FULL = 2 * Math.PI * r;          // 565.49
  const ARC  = FULL * 0.75;              // 270° = 424.12
  const GAP  = FULL - ARC;               // 90°  = 141.37

  // Zone lengths along the 270° arc
  const redLen   = ARC * 0.40;           // 0-40%   = 169.65
  const ambLen   = ARC * 0.30;           // 40-70%  = 127.24
  const grnLen   = ARC * 0.30;           // 70-100% = 127.24

  // Value arc
  const valLen   = ARC * (HEALTH / 100); 
  const valColor = iconColor;                

  // Small r for inner tick marks
  const rInner = r - sw * 0.5 - 2;      // ≈ 74
  const rOuter = r + sw * 0.5 + 4;      // ≈ 98

  return (
    <div style={{ backgroundColor:card, borderRadius:"20px", boxShadow:cardShadow, border:`1px solid ${border}`, padding:"22px 16px 20px", marginBottom:"10px" }}>
      {/* Machine context chip */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"16px" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", backgroundColor:iconTint, borderRadius:"100px", padding:"5px 14px 5px 9px", border:`1px solid ${iconColor}28` }}>
          <div style={{ width:"22px", height:"22px", borderRadius:"7px", backgroundColor:iconTint, border:`1px solid ${iconColor}30`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon size={12} color={iconColor}/>
          </div>
          <span style={{ fontSize:"12px", fontWeight:600, color:iconColor, fontFamily:inter }}>{MACHINE}</span>
          <div style={{ width:"3px", height:"3px", borderRadius:"50%", backgroundColor:`${iconColor}60` }}/>
          <span style={{ fontSize:"11px", color:`${iconColor}90`, fontFamily:inter }}>{MACHINE_ID}</span>
        </div>
      </div>

      {/* SVG gauge */}
      <div style={{ display:"flex", justifyContent:"center" }}>
        <svg width="260" height="216" viewBox="0 0 260 216" style={{ display:"block", overflow:"visible" }}>
          <defs>
            <linearGradient id="valGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={iconColor}/>
              <stop offset="100%" stopColor={iconColor === amber ? orange : iconColor === red ? "#991B1B" : "#15803D"}/>
            </linearGradient>
          </defs>

          {/* ── Zone background arcs ── */}
          {/* Red zone: 0-40%, starts at rotate(135°) */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={red} strokeWidth={sw}
            strokeOpacity="0.18"
            strokeDasharray={`${redLen} ${FULL - redLen}`}
            transform={`rotate(135 ${cx} ${cy})`}
          />
          {/* Amber zone: 40-70%, starts after red = rotate(135+108)=rotate(243°) */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={amber} strokeWidth={sw}
            strokeOpacity="0.18"
            strokeDasharray={`${ambLen} ${FULL - ambLen}`}
            transform={`rotate(243 ${cx} ${cy})`}
          />
          {/* Green zone: 70-100%, starts after amber = rotate(243+81)=rotate(324°) */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={green} strokeWidth={sw}
            strokeOpacity="0.18"
            strokeDasharray={`${grnLen} ${FULL - grnLen}`}
            transform={`rotate(324 ${cx} ${cy})`}
          />

          {/* ── Value arc ── */}
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="url(#valGrad)"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${valLen} ${FULL - valLen}`}
            transform={`rotate(135 ${cx} ${cy})`}
          />

          {/* ── Zone boundary ticks ── */}
          {/* 40% boundary: at rotate(243°) from right = x,y computed from center */}
          {[
            { angle: 243, label: "40%" },
            { angle: 324, label: "70%" },
          ].map(({ angle, label }) => {
            const rad = (angle * Math.PI) / 180;
            const tx = cx + (r + sw + 8) * Math.cos(rad);
            const ty = cy + (r + sw + 8) * Math.sin(rad);
            return (
              <text key={angle} x={tx} y={ty} textAnchor="middle" fontSize="8.5"
                fill={inkFaint} fontFamily={inter} dominantBaseline="middle">
                {label}
              </text>
            );
          })}

          {/* ── Arc end labels ── */}
          {/* Start label "0" at 135° */}
          <text x={cx + (r + sw + 10) * Math.cos(135 * Math.PI / 180)}
                y={cy + (r + sw + 10) * Math.sin(135 * Math.PI / 180)}
                textAnchor="middle" fontSize="9" fill={red} fontFamily={inter}
                fontWeight="700" dominantBaseline="middle">
            0%
          </text>
          {/* End label "100%" at 45° */}
          <text x={cx + (r + sw + 10) * Math.cos(45 * Math.PI / 180)}
                y={cy + (r + sw + 10) * Math.sin(45 * Math.PI / 180)}
                textAnchor="middle" fontSize="9" fill={green} fontFamily={inter}
                fontWeight="700" dominantBaseline="middle">
            100%
          </text>

          {/* ── Zone labels ── */}
          <text x={cx + (r + sw + 10) * Math.cos(168 * Math.PI / 180)}
                y={cy + (r + sw + 10) * Math.sin(168 * Math.PI / 180)}
                textAnchor="middle" fontSize="8" fill={red} fontFamily={inter}
                fontWeight="600" dominantBaseline="middle">Critical</text>
          <text x={cx + (r + sw + 10) * Math.cos(270 * Math.PI / 180)}
                y={cy + (r + sw + 10) * Math.sin(270 * Math.PI / 180)}
                textAnchor="middle" fontSize="8" fill={amber} fontFamily={inter}
                fontWeight="600" dominantBaseline="middle">Warning</text>
          <text x={cx + (r + sw + 10) * Math.cos(10 * Math.PI / 180)}
                y={cy + (r + sw + 10) * Math.sin(10 * Math.PI / 180)}
                textAnchor="middle" fontSize="8" fill={green} fontFamily={inter}
                fontWeight="600" dominantBaseline="middle">Healthy</text>

          {/* ── Background & Value arc ── */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={iconColor} strokeWidth={sw} strokeOpacity="0.18" strokeDasharray={`${ARC} ${FULL - ARC}`} transform={`rotate(135 ${cx} ${cy})`}/>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#valGrad)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${valLen} ${FULL - valLen}`} transform={`rotate(135 ${cx} ${cy})`}/>

          <circle cx={cx} cy={cy} r={r - sw - 6} fill={iconTint} fillOpacity="0.35"/>
          <circle cx={cx} cy={cy} r={r - sw - 14} fill={iconTint} fillOpacity="0.55"/>

          <text x={cx} y={cy - 14} textAnchor="middle" fontSize="44" fontWeight="800" fill={ink} fontFamily={inter} letterSpacing="-0.04em">{HEALTH}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="13" fontWeight="700" fill={iconColor} fontFamily={inter}>{STATUS}</text>
        </svg>
      </div>
    </div>
  );
}

// ─── Stats 2×2 grid ───────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon:Icon, color, tint }: {
  label:string; value:string; sub:string;
  icon:React.ElementType; color:string; tint:string;
}) {
  return (
    <div style={{
      flex:1, backgroundColor:card, borderRadius:"18px",
      boxShadow:cardShadow, border:`1px solid ${border}`,
      padding:"14px 14px 12px",
      background:`radial-gradient(circle at 10% 15%, ${tint} 0%, ${card} 65%)`,
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:"-14px", right:"-14px", width:"52px", height:"52px", borderRadius:"50%", backgroundColor:tint, opacity:0.7 }}/>
      <div style={{ width:"34px", height:"34px", borderRadius:"10px", backgroundColor:tint, border:`1px solid ${color}22`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"10px" }}>
        <Icon size={16} color={color}/>
      </div>
      <p style={{ fontSize:"21px", fontWeight:800, color:ink, letterSpacing:"-0.04em", lineHeight:1, fontFamily:inter, marginBottom:"3px" }}>{value}</p>
      <p style={{ fontSize:"10.5px", fontWeight:600, color:inkMut, fontFamily:inter, marginBottom:"2px" }}>{label}</p>
      <p style={{ fontSize:"9.5px", color:color, fontFamily:inter, fontWeight:600 }}>{sub}</p>
    </div>
  );
}

// ─── 7-day trend area chart ───────────────────────────────────────────────────
function TrendChart() {
  const machine = useCurrentMachine();
  const { name: MACHINE, trend: TREND_7D, iconColor } = machine;
  const TREND_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  const CW = 358, CH = 180;
  const PAD = { t: 20, b: 30, l: 30, r: 20 };
  const iW = CW - PAD.l - PAD.r;
  const iH = CH - PAD.t - PAD.b;

  const lo=Math.min(...TREND_7D)-2, hi=Math.max(...TREND_7D)+2;
  const toX=(i:number)=>PAD.l+(i/(TREND_7D.length-1))*iW;
  const toY=(v:number)=>PAD.t+iH-((v-lo)/(hi-lo))*iH;

  const pts = TREND_7D.map((v,i)=>`${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const areaPts = `${toX(0)},${PAD.t+iH} ${pts} ${toX(TREND_7D.length-1)},${PAD.t+iH}`;
  const lastX=toX(TREND_7D.length-1), lastY=toY(TREND_7D[TREND_7D.length-1]);

  return (
    <div style={{ backgroundColor:card, borderRadius:"18px", boxShadow:cardShadow, border:`1px solid ${border}`, padding:"16px", marginBottom:"10px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
        <div>
          <p style={{ fontSize:"13.5px", fontWeight:700, color:ink, fontFamily:inter, marginBottom:"2px" }}>Health Score Trend</p>
          <p style={{ fontSize:"10.5px", color:inkFaint, fontFamily:inter }}>Last 7 days · {MACHINE}</p>
        </div>
        <div style={{ backgroundColor:blueTint, borderRadius:"100px", padding:"3px 10px", border:`1px solid ${blue}22` }}>
          <span style={{ fontSize:"10px", fontWeight:700, color:blue, fontFamily:inter }}>Live</span>
        </div>
      </div>

      <svg width="100%" height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ display:"block", overflow:"visible" }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={iconColor} stopOpacity="0.22"/>
            <stop offset="100%" stopColor={iconColor} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[75, 80, 85].map(v=>(
          <g key={v}>
            <line x1={PAD.l} y1={toY(v)} x2={CW-PAD.r} y2={toY(v)} stroke={divider} strokeWidth="1" strokeDasharray="3 3"/>
            <text x={PAD.l-4} y={toY(v)+4} textAnchor="end" fontSize="8" fill={inkFaint} fontFamily={inter}>{v}</text>
          </g>
        ))}
        <polygon points={areaPts} fill="url(#trendFill)"/>
        <polyline points={pts} fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={lastX} cy={lastY} r="4" fill={iconColor}/>
        <circle cx={lastX} cy={lastY} r="7" fill={iconColor} fillOpacity="0.2"/>
        {TREND_DAYS.map((d,i)=>(
          <text key={d} x={toX(i)} y={CH-4} textAnchor="middle" fontSize="8.5" fill={i===6?iconColor:inkFaint} fontWeight={i===6?"700":"400"} fontFamily={inter}>{d}</text>
        ))}
        <line x1={PAD.l} y1={CH-PAD.b} x2={CW-PAD.r} y2={CH-PAD.b} stroke={border} strokeWidth="1"/>
      </svg>
    </div>
  );
}

// ─── Monthly bar chart ────────────────────────────────────────────────────────
function MonthlyChart() {
  const W=310, H=100;
  const PAD={t:8, b:22, l:28, r:8};
  const iW=W-PAD.l-PAD.r, iH=H-PAD.t-PAD.b;
  const barW=(iW/MONTHLY.length)*0.55;
  const barGap=iW/MONTHLY.length;
  const toY=(v:number)=>PAD.t+iH-(v/100)*iH;
  const barH=(v:number)=>(v/100)*iH;
  const barColor=(v:number)=>v>=80?green:v>=60?amber:red;

  return (
    <div style={{ backgroundColor:card, borderRadius:"18px", boxShadow:cardShadow, border:`1px solid ${border}`, padding:"16px 16px 14px", marginBottom:"10px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
        <div>
          <p style={{ fontSize:"13.5px", fontWeight:700, color:ink, fontFamily:inter, marginBottom:"2px" }}>Monthly Health Score</p>
          <p style={{ fontSize:"10.5px", color:inkFaint, fontFamily:inter }}>Aug 2025 – Jan 2026</p>
        </div>
        <span style={{ fontSize:"9.5px", fontWeight:700, color:amber, backgroundColor:amberT, borderRadius:"100px", padding:"3px 9px", border:`1px solid ${amber}22`, fontFamily:inter }}>Declining</span>
      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }}>
        {[25,50,75,100].map(v=>(
          <g key={v}>
            <line x1={PAD.l} y1={toY(v)} x2={W-PAD.r} y2={toY(v)} stroke={divider} strokeWidth="1" strokeDasharray="3 3"/>
            <text x={PAD.l-4} y={toY(v)+4} textAnchor="end" fontSize="8" fill={inkFaint} fontFamily={inter}>{v}</text>
          </g>
        ))}
        {MONTHLY.map((m,i)=>{
          const bx=PAD.l+i*barGap+(barGap-barW)/2;
          const by=toY(m.value);
          const bh=barH(m.value);
          const c=barColor(m.value);
          const isLast=i===MONTHLY.length-1;
          return (
            <g key={m.month}>
              <rect x={bx} y={by} width={barW} height={bh} rx="4"
                fill={c} fillOpacity={isLast?1:0.55}/>
              {isLast&&<rect x={bx} y={by} width={barW} height={bh} rx="4" fill={`url(#barGrad)`} fillOpacity="0.4"/>}
              <text x={bx+barW/2} y={H-5} textAnchor="middle" fontSize="8.5"
                fill={isLast?amber:inkFaint} fontWeight={isLast?"700":"400"} fontFamily={inter}>
                {m.month}
              </text>
              {isLast&&(
                <text x={bx+barW/2} y={by-4} textAnchor="middle" fontSize="8.5"
                  fill={c} fontWeight="700" fontFamily={inter}>{m.value}%</text>
              )}
            </g>
          );
        })}
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <line x1={PAD.l} y1={H-PAD.b} x2={W-PAD.r} y2={H-PAD.b} stroke={border} strokeWidth="1"/>
      </svg>
    </div>
  );
}

// ─── AI Health Insights card ──────────────────────────────────────────────────
function AIHealthCard() {
  const recs = [
    { icon: Wrench,    color: amber, text: "Schedule preventive maintenance within 7 days to prevent further health degradation." },
    { icon: Activity,  color: red,   text: "Inspect fuel system and cooling components for signs of wear or contamination." },
    { icon: Shield,    color: green, text: "Monitor load distribution — reduce peak load to extend component life." },
  ];
  return (
    <div style={{
      borderRadius:"18px",
      background:`linear-gradient(150deg, #1E3A8A 0%, ${blue} 100%)`,
      padding:"16px 16px 14px", marginBottom:"10px",
      boxShadow:`0 6px 24px rgba(29,78,216,0.28), 0 1px 4px rgba(0,0,0,0.1)`,
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:"-24px", right:"-24px", width:"90px", height:"90px", borderRadius:"50%", backgroundColor:"rgba(255,255,255,0.05)" }}/>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
        <div style={{ width:"34px", height:"34px", borderRadius:"10px", backgroundColor:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Sparkles size={16} color="white"/>
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:"13.5px", fontWeight:700, color:"white", fontFamily:inter }}>AI Recommendations</p>
          <p style={{ fontSize:"10.5px", color:"rgba(255,255,255,0.6)", fontFamily:inter }}>Based on health score analysis</p>
        </div>
        <div style={{ backgroundColor:"rgba(255,255,255,0.15)", borderRadius:"100px", padding:"3px 9px", border:"1px solid rgba(255,255,255,0.2)" }}>
          <span style={{ fontSize:"9px", fontWeight:700, color:"white", letterSpacing:"0.06em", fontFamily:inter }}>LIVE</span>
        </div>
      </div>
      <div style={{ height:"1px", backgroundColor:"rgba(255,255,255,0.1)", marginBottom:"12px" }}/>
      {recs.map((r,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", marginBottom:i<recs.length-1?"11px":"14px" }}>
          <div style={{ width:"28px", height:"28px", borderRadius:"8px", backgroundColor:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <r.icon size={14} color="white"/>
          </div>
          <p style={{ fontSize:"12.5px", color:"rgba(255,255,255,0.88)", fontFamily:inter, lineHeight:1.55, flex:1, paddingTop:"4px" }}>{r.text}</p>
        </div>
      ))}
      <button type="button" style={{ width:"100%", height:"40px", borderRadius:"11px", backgroundColor:"rgba(255,255,255,0.14)", border:"1.5px solid rgba(255,255,255,0.28)", color:"white", fontSize:"13px", fontWeight:600, fontFamily:inter, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
        View All Recommendations <ChevronRight size={14}/>
      </button>
    </div>
  );
}

// ─── Predictive Maintenance card ──────────────────────────────────────────────
function PredictiveMaintCard() {
  const confidence = 94;
  return (
    <div style={{ backgroundColor:card, borderRadius:"18px", boxShadow:cardShadow, border:`1px solid ${border}`, overflow:"hidden", marginBottom:"10px" }}>
      <div style={{ height:"3px", background:`linear-gradient(90deg, ${amber}, #FCD34D)` }}/>
      <div style={{ padding:"14px 16px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"12px" }}>
          <div style={{ width:"38px", height:"38px", borderRadius:"12px", background:`linear-gradient(135deg, ${amber}, #F59E0B)`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 12px ${amber}35`, flexShrink:0 }}>
            <CalendarClock size={19} color="white"/>
          </div>
          <div>
            <p style={{ fontSize:"13.5px", fontWeight:700, color:ink, fontFamily:inter }}>Predictive Maintenance</p>
            <p style={{ fontSize:"10.5px", color:inkFaint, fontFamily:inter }}>AI-generated prediction</p>
          </div>
          <span style={{ fontSize:"9.5px", fontWeight:700, color:amber, backgroundColor:amberT, borderRadius:"100px", padding:"3px 9px", border:`1px solid ${amber}22`, fontFamily:inter, marginLeft:"auto", flexShrink:0 }}>Urgent</span>
        </div>
        <div style={{ backgroundColor:amberT, borderRadius:"12px", padding:"12px 14px", border:`1px solid ${amber}22`, marginBottom:"12px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
            <p style={{ fontSize:"11.5px", color:inkSec, fontFamily:inter }}>Next Maintenance Due</p>
            <span style={{ fontSize:"14px", fontWeight:800, color:amber, fontFamily:inter, letterSpacing:"-0.03em" }}>8 days</span>
          </div>
          <p style={{ fontSize:"10.5px", color:inkMut, fontFamily:inter }}>Estimated date: 02 February 2026</p>
        </div>
        {[
          { label:"AI Confidence",      value:`${confidence}%`, pct:confidence, color:green },
          { label:"Degradation Rate",   value:"1.2% / week",    pct:48,         color:orange },
        ].map((m)=>(
          <div key={m.label} style={{ marginBottom:"10px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
              <span style={{ fontSize:"11.5px", color:inkSec, fontFamily:inter }}>{m.label}</span>
              <span style={{ fontSize:"11.5px", fontWeight:700, color:m.color, fontFamily:inter }}>{m.value}</span>
            </div>
            <div style={{ height:"5px", backgroundColor:divider, borderRadius:"100px", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${m.pct}%`, backgroundColor:m.color, borderRadius:"100px" }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Estimated remaining life card ───────────────────────────────────────────
function RemainingLifeCard() {
  const machine = useCurrentMachine();
  const { name: MACHINE } = machine;
  const totalLife = 15; // years
  const usedYears = 2.8;
  const remaining = totalLife - usedYears;
  const usedPct = (usedYears / totalLife) * 100;

  return (
    <div style={{ backgroundColor:card, borderRadius:"18px", boxShadow:cardShadow, border:`1px solid ${border}`, padding:"16px 16px 14px", marginBottom:"10px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px" }}>
        <div style={{ width:"38px", height:"38px", borderRadius:"12px", background:`linear-gradient(135deg, ${purple}, #8B5CF6)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 12px ${purple}35` }}>
          <BarChart3 size={19} color="white"/>
        </div>
        <div>
          <p style={{ fontSize:"13.5px", fontWeight:700, color:ink, fontFamily:inter }}>Estimated Remaining Life</p>
          <p style={{ fontSize:"10.5px", color:inkFaint, fontFamily:inter }}>AI projection · {MACHINE}</p>
        </div>
      </div>

      {/* Large remaining years display */}
      <div style={{ textAlign:"center", backgroundColor:purpleT, borderRadius:"14px", padding:"16px", border:`1px solid ${purple}20`, marginBottom:"14px" }}>
        <p style={{ fontSize:"10px", color:inkFaint, fontFamily:inter, fontWeight:500, marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>Remaining Useful Life</p>
        <p style={{ fontSize:"36px", fontWeight:800, color:purple, fontFamily:inter, letterSpacing:"-0.05em", lineHeight:1 }}>
          {remaining.toFixed(1)}
          <span style={{ fontSize:"16px", fontWeight:600, color:inkMut }}> yrs</span>
        </p>
        <p style={{ fontSize:"10.5px", color:inkMut, fontFamily:inter, marginTop:"4px" }}>Projected end: March 2038</p>
      </div>

      {/* Life depletion bar */}
      <div style={{ marginBottom:"14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
          <span style={{ fontSize:"11.5px", color:inkSec, fontFamily:inter }}>Life Consumed</span>
          <span style={{ fontSize:"11.5px", fontWeight:700, color:ink, fontFamily:inter }}>{usedYears} / {totalLife} yrs</span>
        </div>
        <div style={{ height:"8px", backgroundColor:divider, borderRadius:"100px", overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${usedPct}%`,
            background:`linear-gradient(90deg, ${green}, ${amber})`,
            borderRadius:"100px",
          }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
          <span style={{ fontSize:"9.5px", color:green, fontFamily:inter, fontWeight:600 }}>Installed: Mar 2023</span>
          <span style={{ fontSize:"9.5px", color:inkFaint, fontFamily:inter }}>{usedPct.toFixed(0)}% consumed</span>
        </div>
      </div>

      {/* Parameter rows */}
      {[
        { label:"Operating Hours",    value:"3,240 hrs" },
        { label:"Design Life",        value:"15 years"  },
        { label:"Degradation Factor", value:"1.2x"      },
      ].map((p, i, arr) => (
        <div key={p.label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom: i < arr.length-1 ? `1px solid ${divider}` : "none" }}>
          <span style={{ fontSize:"12px", color:inkSec, fontFamily:inter }}>{p.label}</span>
          <span style={{ fontSize:"12px", fontWeight:700, color:ink, fontFamily:inter }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function HealthScoreVisualization() {
  const navigate = useNavigate();
  const machine = useCurrentMachine();
  return (
    <MobileLayout
      header={
        <>
          <StatusBar/>
          <PageHeader/>
        </>
      }
    >
      {/* ── Scrollable Body ── */}

        {/* ── Large circular gauge ── */}
        <div style={{ padding:"14px 16px 6px" }}>
          <LargeGauge/>
        </div>

        {/* ── Stats 2×2 ── */}
        <div style={{ padding:"8px 16px 6px" }}>
          <Sect title="Performance Metrics" sub="Current month statistics"/>
          <div style={{ display:"flex", gap:"10px", marginBottom:"10px" }}>
            <StatCard label="Failure Count"  value={String(machine.incidents)}      sub="This month" icon={AlertTriangle}  color={red}    tint={redT}    />
            <StatCard
  label="Downtime Hours"
  value="Not Available"
  sub="Cumulative"
  icon={Clock}
  color={orange}
  tint={orangeT}
/>
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            <StatCard
  label="Maint. Freq."
  value="Not Available"
  sub="Per month"
  icon={Settings2}
  color={blue}
  tint={blueTint}
/>
            <StatCard label="Risk Level"    value={machine.failureRisk}     sub="AI assessed" icon={Shield}         color={amber}  tint={amberT}  />
          </div>
        </div>

        {/* ── Health Trend ── */}
        <div style={{ padding:"14px 16px 4px" }}>
          <TrendChart/>
        </div>

        {/* ── Monthly Chart ── */}
        <div style={{ padding:"6px 16px 4px" }}>
          <MonthlyChart/>
        </div>

        {/* ── AI Recommendations ── */}
        <div style={{ padding:"14px 16px 4px" }}>
          <Sect title="AI Health Insights" sub="Powered by 10xDS Intelligence"/>
          <AIHealthCard/>
        </div>

        {/* ── Predictive Maintenance ── */}
        <div style={{ padding:"6px 16px 4px" }}>
          <Sect title="Predictive Maintenance" sub="AI-generated schedule"/>
          <PredictiveMaintCard/>
        </div>

        {/* ── Remaining Life ── */}
        <div style={{ padding:"6px 16px 4px" }}>
          <Sect title="Estimated Remaining Life" sub="Based on current health trajectory"/>
          <RemainingLifeCard/>
        </div>

        <div style={{ height:"20px" }}/>
    </MobileLayout>
  );
}
