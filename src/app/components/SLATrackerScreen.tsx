import { handleBackNavigation } from "../utils/navigation";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  ArrowLeft, Bell, User, Search, X, Filter,
  Home, FileText, Database, Bot, Sparkles, MoreHorizontal,
  AlertTriangle, CheckCircle2, Clock, Shield,
  ChevronRight, Users, Activity, Zap, TrendingDown,
  History, ArrowRight, MapPin
} from "lucide-react";
import { useVendor } from "../contexts/VendorContext";
import { SLAItem, useSLACountdown } from "../utils/slaAdapter";
import { useSharedSLA, SLAFilterType } from "../hooks/useSharedSLA";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const blue=  "#2563EB"; const blueDark="#1D4ED8"; const blueMid="#3B82F6"; const blueTint="#EFF6FF"; const blueRing="rgba(37,99,235,0.12)";
const green= "#16A34A"; const greenT=  "#DCFCE7";
const orange="#EA580C"; const orangeT= "#FFF7ED";
const purple="#7C3AED"; const purpleT= "#F5F3FF";
const red=   "#DC2626"; const redT=    "#FEF2F2";
const amber= "#D97706"; const amberT=  "#FFFBEB";
const ink="#0F172A"; const inkSec="#475569"; const inkMut="#64748B"; const inkFaint="#94A3B8";
const bg="#F8FAFC"; const card="#FFFFFF"; const border="#E2E8F0"; const divider="#F1F5F9";
const inter="'Inter','Roboto',sans-serif";
const cardShadow="0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)";
const blueShadow="0 4px 20px rgba(37,99,235,0.22),0 1px 4px rgba(0,0,0,0.08)";

type SLAStatus="Near Breach"|"Immediate Attention Required"|"On Track"|"Needs Supervisor Review"|"Breached"|"Escalated";
type Priority="Critical"|"High"|"Medium"|"Low";

// SLAItem type is now imported from slaAdapter — VendorContext is the source of truth

const FILTER_DEFS=[
  {label:"All",color:blue,tint:blueTint},{label:"Near Breach",color:orange,tint:orangeT},
  {label:"Breached",color:red,tint:redT},{label:"On Track",color:green,tint:greenT},
  {label:"Escalated",color:purple,tint:purpleT},
];

const URGENCY_COLOR:Record<string,string>={critical:red,warning:amber,ok:green,breached:red};
const STATUS_P:Record<SLAStatus,{color:string;tint:string}>={
  "Near Breach":{color:orange,tint:orangeT},"Immediate Attention Required":{color:red,tint:redT},
  "On Track":{color:green,tint:greenT},"Needs Supervisor Review":{color:amber,tint:amberT},"Breached":{color:red,tint:redT},
  "Escalated":{color:purple,tint:purpleT},
};
const PRIORITY_P:Record<Priority,{color:string;tint:string}>={
  Critical:{color:red,tint:redT},High:{color:orange,tint:orangeT},Medium:{color:amber,tint:amberT},Low:{color:green,tint:greenT},
};

function StatusBar(){return(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px 6px",backgroundColor:"#0052CC",flexShrink:0}}><span style={{fontSize:"12px",fontWeight:600,color:"white",fontFamily:inter}}>9:41</span><div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{display:"flex",alignItems:"flex-end",gap:"2px"}}>{[3,5,7,9].map((h,i)=><div key={i} style={{width:"3px",height:`${h}px`,borderRadius:"1px",backgroundColor:"white"}}/>)}</div><div style={{display:"flex",alignItems:"center",gap:"2px"}}><div style={{width:"22px",height:"11px",borderRadius:"2px",border:"1.5px solid white",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",inset:0,right:"3px",backgroundColor:"white",borderRadius:"1px"}}/></div><div style={{width:"2px",height:"5px",borderRadius:"1px",backgroundColor:"white"}}/></div></div></div>);}

function PageHeader(){
  const navigate = useNavigate();
  return(<div style={{background:`linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`,padding:"10px 20px 18px",flexShrink:0}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
      <button type="button" style={{display:"inline-flex",alignItems:"center",gap:"5px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:"10px",padding:"6px 12px 6px 9px",cursor:"pointer",fontSize:"12.5px",fontWeight:600,color:"white",fontFamily:inter}} onClick={() => handleBackNavigation(navigate, '/dashboard')}><ArrowLeft size={15} color="white"/>Back</button>
      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
        <button type="button" style={{width:"36px",height:"36px",borderRadius:"10px",backgroundColor:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.22)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Bell size={17} color="white"/></button>
        <div style={{width:"36px",height:"36px",borderRadius:"10px",background:"linear-gradient(140deg,#334155,#1E293B)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(255,255,255,0.2)"}}><span style={{fontSize:"12px",fontWeight:700,color:"white",fontFamily:inter}}>AC</span></div>
      </div>
    </div>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
      <div><h1 style={{fontSize:"20px",fontWeight:800,color:"white",letterSpacing:"-0.025em",fontFamily:inter,marginBottom:"3px"}}>SLA Tracker</h1><p style={{fontSize:"12px",color:"rgba(255,255,255,0.65)",fontFamily:inter}}>Real-time SLA compliance monitoring</p></div>
      <div style={{backgroundColor:"rgba(54,179,126,0.25)",border:"1px solid rgba(54,179,126,0.4)",borderRadius:"100px",padding:"4px 12px"}}><span style={{fontSize:"12px",fontWeight:700,color:"#57D9A3",fontFamily:inter}}>98.7% Compliant</span></div>
    </div>
  </div>);
}

export function ComplianceCard({ compliance, withinSLA, nearBreach, breached }: { compliance: number; withinSLA: number; nearBreach: number; breached: number }){
  const r=40,sw=9,C=2*Math.PI*r;
  const pct = Math.min(100, Math.max(0, compliance)) / 100;
  const dash=C*pct;
  const ringColor = compliance >= 90 ? green : compliance >= 75 ? amber : red;
  const stats=[{dot:green,label:"Within SLA",val:withinSLA.toString()},{dot:orange,label:"Near Breach",val:nearBreach.toString()},{dot:red,label:"Breached",val:breached.toString()}];
  return(<div style={{backgroundColor:card,borderRadius:"20px",boxShadow:cardShadow,border:`1px solid ${border}`,padding:"16px",marginBottom:"10px",display:"flex",alignItems:"center",gap:"16px"}}>
    <div style={{position:"relative",width:"92px",height:"92px",flexShrink:0}}>
      <svg width="92" height="92" viewBox="0 0 92 92" style={{display:"block"}}>
        <circle cx="46" cy="46" r={r} fill="none" stroke={divider} strokeWidth={sw}/>
        <circle cx="46" cy="46" r={r} fill="none" stroke={ringColor} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${dash} ${C}`} transform="rotate(-90 46 46)"/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:"16px",fontWeight:800,color:ringColor,fontFamily:inter,letterSpacing:"-0.04em",lineHeight:1}}>{compliance}%</span>
        <span style={{fontSize:"8.5px",color:inkFaint,fontFamily:inter,fontWeight:600,marginTop:"2px"}}>SLA</span>
      </div>
    </div>
    <div style={{flex:1}}>
      <p style={{fontSize:"13px",fontWeight:700,color:ink,fontFamily:inter,marginBottom:"10px"}}>Overall SLA Compliance</p>
      {stats.map((s,i)=>(<div key={s.label} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:i<2?"7px":0}}>
        <div style={{width:"9px",height:"9px",borderRadius:"50%",backgroundColor:s.dot,flexShrink:0,boxShadow:`0 0 0 2.5px ${s.dot}28`}}/>
        <span style={{fontSize:"11.5px",color:inkSec,fontFamily:inter,flex:1}}>{s.label}</span>
        <span style={{fontSize:"11.5px",fontWeight:800,color:s.dot,fontFamily:inter}}>{s.val}</span>
      </div>))}
    </div>
  </div>);}

export function SLACard({item, isHighlighted, onEscalate, onDispatch}: {item:SLAItem, isHighlighted?:boolean, onEscalate?: (item: SLAItem) => void, onDispatch?: (item: SLAItem) => void}){
  const { remaining, urgency } = useSLACountdown(item.slaDeadline, item.vendorSlaStatus, item.rawStatus);
  const uc=URGENCY_COLOR[urgency] || URGENCY_COLOR.ok;
  const sp=STATUS_P[item.status] || STATUS_P["On Track"];
  const pp=PRIORITY_P[item.priority] || PRIORITY_P.Medium;
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  return(<div ref={cardRef} style={{backgroundColor:card,borderRadius:"16px",boxShadow:isHighlighted?`0 0 0 3px ${blueRing}`:cardShadow,border:`1px solid ${isHighlighted?blue:border}`,marginBottom:"10px",overflow:"hidden",display:"flex",transition:"box-shadow 0.3s ease, border-color 0.3s ease"}}>
    <div style={{width:"4px",backgroundColor:uc,flexShrink:0}}/>
    <div style={{flex:1,padding:"12px 13px 11px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"5px",flexWrap:"wrap" as const}}>
        <span style={{fontSize:"10.5px",fontWeight:700,color:inkFaint,fontFamily:inter}}>{item.id}</span>
        <span style={{fontSize:"9px",fontWeight:700,color:pp.color,backgroundColor:pp.tint,borderRadius:"100px",padding:"2px 7px",fontFamily:inter}}>{item.priority}</span>
        <div style={{flex:1}}/>
        <span style={{fontSize:"9px",fontWeight:700,color:sp.color,backgroundColor:sp.tint,borderRadius:"100px",padding:"2px 7px",fontFamily:inter}}>{item.status}</span>
      </div>
      <p style={{fontSize:"13.5px",fontWeight:700,color:ink,fontFamily:inter,lineHeight:1.3,marginBottom:"3px"}}>{item.issue}</p>
      <p style={{fontSize:"11px",color:inkMut,fontFamily:inter,marginBottom:"8px"}}>{item.customer}</p>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"9px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
          <Clock size={12} color={uc}/><span style={{fontSize:"12.5px",fontWeight:800,color:uc,fontFamily:inter}}>{remaining} remaining</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
          <div style={{width:"18px",height:"18px",borderRadius:"6px",background:`linear-gradient(135deg,${blue},${blueDark})`,display:"flex",alignItems:"center",justifyContent:"center"}}><User size={10} color="white"/></div>
          <span style={{fontSize:"11px",color:inkSec,fontFamily:inter}}>{item.assignee}</span>
        </div>
      </div>
      <div style={{height:"4px",backgroundColor:divider,borderRadius:"100px",overflow:"hidden",marginBottom:"9px"}}>
        <div style={{height:"100%",width:`${item.progress}%`,backgroundColor:uc,borderRadius:"100px"}}/>
      </div>
      <div style={{display:"flex",gap:"6px"}}>
        <button type="button" onClick={() => navigate('/sla-details/' + item.id)} style={{flex:1,height:"30px",borderRadius:"9px",backgroundColor:blueTint,border:`1px solid ${blue}25`,color:blue,fontSize:"11px",fontWeight:700,fontFamily:inter,cursor:"pointer"}}>
          View Details
        </button>
      </div>
    </div>
  </div>);}

// AICard and TechPerformance removed as they are Vendor-only features

export function SLATrackerScreen(){
  const navigate = useNavigate();
  const vendor = useVendor();
  const { kpis, filterSLAItems } = useSharedSLA();
  const [q,setQ]=useState(""); const [f,setF]=useState<SLAFilterType>("All");
  const [activeModal, setActiveModal] = useState<"Escalate" | "Dispatch" | "Optimize" | null>(null);
  const [optState, setOptState] = useState<"idle" | "loading" | "results">("idle");
  const [selectedItem, setSelectedItem] = useState<SLAItem | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const filtered = filterSLAItems(q, f);
    
  const counts:Record<string,number>={
    "All": kpis.totalTickets,
    "Near Breach": kpis.nearBreach,
    "Breached": kpis.breached,
    "On Track": kpis.onTrack,
    "Escalated": kpis.escalated,
  };
  return(
    <MobileLayout
      header={
        <>
          <StatusBar/><PageHeader/>
          <div style={{backgroundColor:card,padding:"12px 20px 0",flexShrink:0}}>
            <div style={{height:"46px",borderRadius:"13px",backgroundColor:bg,border:`1.5px solid ${border}`,boxShadow:cardShadow,display:"flex",alignItems:"center",gap:"10px",padding:"0 14px"}}>
              <Search size={16} color={inkFaint} style={{flexShrink:0}}/>
              <input type="text" placeholder="Search tickets, customers..." value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:"13.5px",color:ink,fontFamily:inter}}/>
              {q&&<button type="button" onClick={()=>setQ("")} style={{width:"22px",height:"22px",borderRadius:"50%",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={12} color={inkMut}/></button>}
            </div>
          </div>
          <div style={{backgroundColor:card,borderBottom:`1px solid ${border}`,padding:"10px 20px 12px",flexShrink:0}}>
            <div style={{display:"flex",gap:"7px",overflowX:"auto",scrollbarWidth:"none"}}>
              {FILTER_DEFS.map(fd=>{const on=f===fd.label;return(<button key={fd.label} type="button" onClick={()=>setF(fd.label as SLAFilterType)} style={{display:"inline-flex",alignItems:"center",gap:"5px",height:"32px",borderRadius:"100px",padding:"0 12px",backgroundColor:on?fd.color:card,border:`1.5px solid ${on?fd.color:border}`,cursor:"pointer",flexShrink:0,boxShadow:on?`0 2px 8px ${fd.color}30`:"none",transition:"all 0.15s",fontFamily:inter}}>
                <span style={{fontSize:"12px",fontWeight:600,color:on?"white":inkSec,whiteSpace:"nowrap"}}>{fd.label}</span>
                <span style={{fontSize:"10px",fontWeight:700,color:on?"rgba(255,255,255,0.75)":inkFaint,backgroundColor:on?"rgba(255,255,255,0.2)":divider,borderRadius:"100px",padding:"1px 6px"}}>{counts[fd.label]??0}</span>
              </button>);})}
            </div>
          </div>
        </>
      }
      scrollContainerStyle={{ paddingBottom:"100px" }}
    >
      <div style={{padding:"14px 16px 6px"}}><ComplianceCard compliance={kpis.compliance} withinSLA={kpis.onTrack} nearBreach={kpis.nearBreach} breached={kpis.breached} /></div>
      <div style={{padding:"6px 16px 4px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px",padding:"0 0"}}>
          <p style={{fontSize:"14px",fontWeight:800,color:ink,fontFamily:inter}}>Critical SLA Alerts</p>
          <div style={{backgroundColor:redT,borderRadius:"100px",padding:"3px 10px",border:`1px solid ${red}22`}}><span style={{fontSize:"10px",fontWeight:700,color:red,fontFamily:inter}}>{filtered.length} alerts</span></div>
        </div>
        {filtered.length===0?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:"40px",gap:"12px"}}><div style={{width:"64px",height:"64px",borderRadius:"20px",backgroundColor:greenT,display:"flex",alignItems:"center",justifyContent:"center"}}><CheckCircle2 size={28} color={green}/></div><p style={{fontSize:"15px",fontWeight:700,color:ink,fontFamily:inter}}>All SLAs On Track</p><p style={{fontSize:"13px",color:inkMut,fontFamily:inter,textAlign:"center"}}>No SLA violations detected for selected filter.</p></div>
        ):filtered.map(s=><SLACard key={s.id} item={s} isHighlighted={false} />)}
      </div>
      <div style={{height:"20px"}}/>
    </MobileLayout>
  );
}
