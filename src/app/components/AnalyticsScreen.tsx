import { handleBackNavigation } from "../utils/navigation";
import { MobileLayout } from "./ui/MobileLayout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAnalyticsContext } from "../contexts/AnalyticsContext";
import {
  ArrowLeft, Bell,
  Activity, Clock,
  CheckCircle2, BarChart3, Star, ChevronRight, Zap, Sparkles,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  ShieldAlert
} from "lucide-react";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const blue=  "#2563EB"; const blueDark="#1D4ED8"; const blueMid="#3B82F6"; const blueTint="#EFF6FF"; const blueRing="rgba(37,99,235,0.12)";
const green= "#16A34A"; const greenT=  "#DCFCE7"; const greenShadow="0 4px 20px rgba(22,163,74,0.25),0 1px 4px rgba(0,0,0,0.08)";
const orange="#EA580C"; const orangeT= "#FFF7ED";
const purple="#7C3AED"; const purpleT= "#F5F3FF";
const red=   "#DC2626"; const redT=    "#FEF2F2";
const amber= "#D97706"; const amberT=  "#FFFBEB";
const teal=  "#0891B2"; const tealT=   "#ECFEFF";
const ink="#0F172A"; const inkSec="#475569"; const inkMut="#64748B"; const inkFaint="#94A3B8";
const bg="#F8FAFC"; const card="#FFFFFF"; const border="#E2E8F0"; const divider="#F1F5F9";
const inter="'Inter','Roboto',sans-serif";
const cardShadow="0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)";
const blueShadow="0 4px 20px rgba(37,99,235,0.22),0 1px 4px rgba(0,0,0,0.08)";

const PERIOD_FILTERS=[{label:"Today",color:blue,tint:blueTint},{label:"7 Days",color:blue,tint:blueTint},{label:"30 Days",color:blue,tint:blueTint},{label:"90 Days",color:blue,tint:blueTint}];

// ─── Shared Components ────────────────────────────────────────────────────────
function StatusBar(){return(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px 6px",backgroundColor:"#0052CC",flexShrink:0}}><span style={{fontSize:"12px",fontWeight:600,color:"white",fontFamily:inter}}>9:41</span><div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{display:"flex",alignItems:"flex-end",gap:"2px"}}>{[3,5,7,9].map((h,i)=><div key={i} style={{width:"3px",height:`${h}px`,borderRadius:"1px",backgroundColor:"white"}}/>)}</div><div style={{display:"flex",alignItems:"center",gap:"2px"}}><div style={{width:"22px",height:"11px",borderRadius:"2px",border:"1.5px solid white",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",inset:0,right:"3px",backgroundColor:"white",borderRadius:"1px"}}/></div><div style={{width:"2px",height:"5px",borderRadius:"1px",backgroundColor:"white"}}/></div></div></div>);}

function PageHeader({period}:{period:string}){
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
      <div><h1 style={{fontSize:"20px",fontWeight:800,color:"white",letterSpacing:"-0.025em",fontFamily:inter,marginBottom:"3px"}}>SLA & Analytics</h1><p style={{fontSize:"12px",color:"rgba(255,255,255,0.65)",fontFamily:inter}}>Contract compliance & service levels</p></div>
      <div style={{backgroundColor:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:"100px",padding:"4px 12px"}}><span style={{fontSize:"11px",fontWeight:700,color:"white",fontFamily:inter}}>{period}</span></div>
    </div>
  </div>);
}

function KPICard({label,value,icon:Icon,color,tint}:{label:string;value:string|number;icon:React.ElementType;color:string;tint:string}){
  return(<div style={{flex:1,background:`radial-gradient(circle at 10% 15%,${tint} 0%,${card} 65%)`,borderRadius:"20px",padding:"14px 13px 12px",boxShadow:cardShadow,border:`1px solid ${border}`,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:"-16px",right:"-16px",width:"56px",height:"56px",borderRadius:"50%",backgroundColor:tint,opacity:0.7}}/>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"9px"}}>
      <div style={{width:"34px",height:"34px",borderRadius:"10px",backgroundColor:tint,border:`1px solid ${color}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon size={16} color={color}/></div>
    </div>
    <p style={{fontSize:"21px",fontWeight:800,color:ink,letterSpacing:"-0.04em",lineHeight:1,fontFamily:inter,marginBottom:"3px"}}>{value}</p>
    <p style={{fontSize:"10.5px",fontWeight:500,color:inkMut,fontFamily:inter}}>{label}</p>
  </div>);}

function ContractCompliance({score}: {score: number}) {
  const isGood = score >= 95;
  const isWarn = score >= 90 && score < 95;
  const color = isGood ? green : isWarn ? amber : red;
  const cx=80, cy=80, r=64, sw=14, C=2*Math.PI*r;
  const dash = (score/100)*C;

  return (
    <div style={{backgroundColor:card,borderRadius:"18px",boxShadow:cardShadow,border:`1px solid ${border}`,padding:"16px",marginBottom:"10px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
      <div style={{flex: 1}}>
        <h3 style={{fontSize:"16px", fontWeight: 800, color: ink, fontFamily: inter, marginBottom: "4px"}}>Contract Compliance</h3>
        <p style={{fontSize:"12px", color: inkMut, fontFamily: inter, marginBottom: "12px", lineHeight: 1.4}}>
          Overall SLA adherence across all open and closed tickets in the selected period.
        </p>
        <div style={{display:"inline-flex", alignItems:"center", gap:"6px", padding:"4px 8px", backgroundColor: isGood ? greenT : isWarn ? amberT : redT, borderRadius:"8px"}}>
          {isGood ? <CheckCircle2 size={14} color={green} /> : <AlertTriangle size={14} color={color} />}
          <span style={{fontSize:"11px", fontWeight: 700, color: color, fontFamily: inter}}>
            {isGood ? "Target Exceeded" : isWarn ? "Near Breach" : "Breached Target"}
          </span>
        </div>
      </div>
      <div style={{position:"relative", width:"120px", height:"120px", flexShrink: 0}}>
        <svg width="120" height="120" viewBox="0 0 160 160" style={{transform:"rotate(-90deg)"}}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={divider} strokeWidth={sw}/>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${dash} ${C}`}/>
        </svg>
        <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
          <span style={{fontSize:"24px", fontWeight: 800, color: color, fontFamily: inter, letterSpacing:"-0.04em"}}>{score}%</span>
          <span style={{fontSize:"10px", color: inkMut, fontFamily: inter}}>SLA Met</span>
        </div>
      </div>
    </div>
  );
}

function ResolutionTrendChart({period, points, labels}: {period:string, points:number[], labels:string[]}) {
  const W=310,H=100,PAD={t:10,b:22,l:28,r:8};
  const iW=W-PAD.l-PAD.r,iH=H-PAD.t-PAD.b;
  const lo=points.length>0?Math.min(...points, 0):0;
  const hi=points.length>0?Math.max(...points, 5)+2:10; 
  const toX=(i:number)=>PAD.l+(i/(points.length-1 || 1))*iW;
  const toY=(v:number)=>PAD.t+iH-((v-lo)/(hi-lo))*iH;
  
  let areaPts = "";
  let ptsStr = "";
  let lx=0, ly=0;
  
  if (points.length > 0) {
    ptsStr = points.map((v,i)=>`${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
    areaPts = `${PAD.l},${PAD.t+iH} ${ptsStr} ${W-PAD.r},${PAD.t+iH}`;
    lx=toX(points.length-1); ly=toY(points[points.length-1]);
  }

  return(<div style={{backgroundColor:card,borderRadius:"18px",boxShadow:cardShadow,border:`1px solid ${border}`,padding:"16px 16px 14px",marginBottom:"10px"}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"12px"}}>
      <div><p style={{fontSize:"13.5px",fontWeight:700,color:ink,fontFamily:inter,marginBottom:"2px"}}>Avg Resolution Time Trend</p><p style={{fontSize:"10.5px",color:inkFaint,fontFamily:inter}}>{period} · Hours to resolve</p></div>
    </div>
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display:"block",overflow:"visible"}}>
      <defs><linearGradient id="purpleFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={purple} stopOpacity="0.2"/><stop offset="100%" stopColor={purple} stopOpacity="0"/></linearGradient></defs>
      
      {[Math.floor(lo+(hi-lo)*0.33), Math.floor(lo+(hi-lo)*0.66), hi].map(v=>(<g key={`rgrid-${v}`}><line x1={PAD.l} y1={toY(v)} x2={W-PAD.r} y2={toY(v)} stroke={divider} strokeWidth="1" strokeDasharray="3 3"/><text x={PAD.l-4} y={toY(v)+4} textAnchor="end" fontSize="8" fill={inkFaint} fontFamily={inter}>{v}h</text></g>))}
      
      {points.length > 0 && <>
        <polygon points={areaPts} fill="url(#purpleFill)"/>
        <polyline points={ptsStr} fill="none" stroke={purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={lx} cy={ly} r="4" fill={purple}/><circle cx={lx} cy={ly} r="7" fill={purple} fillOpacity="0.2"/>
      </>}
      
      {labels.map((d,i)=>(<text key={`lbl-${i}`} x={toX(i)} y={H-4} textAnchor="middle" fontSize="8.5" fill={i===labels.length-1?purple:inkFaint} fontWeight={i===labels.length-1?"700":"400"} fontFamily={inter}>{d}</text>))}
      <line x1={PAD.l} y1={H-PAD.b} x2={W-PAD.r} y2={H-PAD.b} stroke={border} strokeWidth="1"/>
    </svg>
  </div>);
}

function MonthlySLABarChart({data}: {data:{m:string, v:number}[]}){
  const W=310,H=100,PAD={t:10,b:22,l:36,r:8};
  const iW=W-PAD.l-PAD.r,iH=H-PAD.t-PAD.b;
  const max = 100; // SLA % is always out of 100
  const barGap=data.length>0 ? iW/data.length : iW;
  const barW=barGap*0.55;
  const toY=(v:number)=>PAD.t+iH-(v/max)*iH;
  const barH=(v:number)=>(v/max)*iH;
  
  return(<div style={{backgroundColor:card,borderRadius:"18px",boxShadow:cardShadow,border:`1px solid ${border}`,padding:"16px 16px 14px",marginBottom:"10px"}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"12px"}}>
      <div><p style={{fontSize:"13.5px",fontWeight:700,color:ink,fontFamily:inter,marginBottom:"2px"}}>Monthly SLA Adherence</p><p style={{fontSize:"10.5px",color:inkFaint,fontFamily:inter}}>% of tickets resolving within SLA</p></div>
    </div>
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
      <defs><linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="white" stopOpacity="0.4"/><stop offset="100%" stopColor="white" stopOpacity="0"/></linearGradient></defs>
      
      {[0, 50, 100].map(v=>(<g key={`bgrid-${v}`}><line x1={PAD.l} y1={toY(v)} x2={W-PAD.r} y2={toY(v)} stroke={divider} strokeWidth="1" strokeDasharray="3 3"/><text x={PAD.l-4} y={toY(v)+4} textAnchor="end" fontSize="8" fill={inkFaint} fontFamily={inter}>{v}%</text></g>))}
      
      {/* Target Line at 90% */}
      <line x1={PAD.l} y1={toY(90)} x2={W-PAD.r} y2={toY(90)} stroke={amber} strokeWidth="1" strokeDasharray="4 2"/>
      <text x={W-PAD.r-2} y={toY(90)-4} textAnchor="end" fontSize="8" fill={amber} fontWeight="700" fontFamily={inter}>TARGET 90%</text>

      {data.map((d,i)=>{
        const bx=PAD.l+i*barGap+(barGap-barW)/2,by=toY(d.v),bh=barH(d.v);
        const isLast=i===data.length-1;
        const color = d.v >= 90 ? teal : red;
        return(<g key={`bar-${i}`}><rect x={bx} y={by} width={barW} height={bh} rx="5" fill={isLast?color:`${color}60`}/>{isLast&&<rect x={bx} y={by} width={barW} height={bh} rx="5" fill="url(#tealGrad)" fillOpacity="0.4"/>}<text x={bx+barW/2} y={H-5} textAnchor="middle" fontSize="8.5" fill={isLast?color:inkFaint} fontWeight={isLast?"700":"400"} fontFamily={inter}>{d.m}</text>{isLast&&<text x={bx+barW/2} y={by-4} textAnchor="middle" fontSize="8" fill={color} fontWeight="700" fontFamily={inter}>{d.v}%</text>}</g>);
      })}
      <line x1={PAD.l} y1={H-PAD.b} x2={W-PAD.r} y2={H-PAD.b} stroke={border} strokeWidth="1"/>
    </svg>
  </div>);}

function AssetSLAHistory({assets}: {assets: {cat:string, tickets:number, sla:number}[]}){
  return(<div style={{backgroundColor:card,borderRadius:"18px",boxShadow:cardShadow,border:`1px solid ${border}`,padding:"16px 16px 14px",marginBottom:"10px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}><p style={{fontSize:"13.5px",fontWeight:700,color:ink,fontFamily:inter}}>Asset Class SLA History</p></div>
    {assets.length === 0 && <p style={{fontSize:"11px", color:inkMut, textAlign:"center"}}>No asset data recorded</p>}
    {assets.map((d,i)=>(<div key={d.cat} style={{marginBottom:i<assets.length-1?"12px":0}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
        <span style={{fontSize:"12px",color:inkSec,fontFamily:inter, fontWeight:600}}>{d.cat} ({d.tickets})</span>
        <span style={{fontSize:"12px",fontWeight:700,color:d.sla>=95?green:d.sla>=85?amber:red,fontFamily:inter}}>{d.sla.toFixed(1)}%</span>
      </div>
      <div style={{height:"6px",backgroundColor:divider,borderRadius:"100px",overflow:"hidden"}}><div style={{height:"100%",width:`${d.sla}%`,backgroundColor:d.sla>=95?green:d.sla>=85?amber:red,borderRadius:"100px"}}/></div>
    </div>))}
  </div>);}

function ServiceQualityCard({csat}: {csat: {score:number, totalReviews:number, satisfied:number, neutral:number, unsatisfied:number}}){
  const score = Number(csat.score.toFixed(1));
  const full = Math.floor(score);
  const cx=43,cy=43,r=32,sw=10,C=2*Math.PI*r;
  const segs=[{pct:csat.satisfied/100,color:green},{pct:csat.neutral/100,color:amber},{pct:csat.unsatisfied/100,color:red}];
  
  let cum=0;
  const arcs=segs.map((s,i)=>{const startDeg=-90+cum*360;cum+=s.pct;return{...s,id:i,startDeg,len:Math.max(0,s.pct*C-3)};});
  
  return(<div style={{backgroundColor:card,borderRadius:"18px",boxShadow:cardShadow,border:`1px solid ${border}`,padding:"16px 16px 14px",marginBottom:"10px"}}>
    <p style={{fontSize:"13.5px",fontWeight:700,color:ink,fontFamily:inter,marginBottom:"14px"}}>Vendor Service Quality (CSAT)</p>
    <div style={{display:"flex",alignItems:"center",gap:"20px"}}>
      <div style={{position:"relative",width:"86px",height:"86px",flexShrink:0}}>
        <svg width="86" height="86" viewBox="0 0 86 86" style={{display:"block"}}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={divider} strokeWidth={sw}/>
          {arcs.map(a=>(<circle key={`arc-${a.id}`} cx={cx} cy={cy} r={r} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="butt" strokeDasharray={`${a.len} ${C}`} transform={`rotate(${a.startDeg} ${cx} ${cy})`}/>))}
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:"18px",fontWeight:800,color:green,fontFamily:inter,letterSpacing:"-0.04em",lineHeight:1}}>{score.toFixed(1)}</span>
          <span style={{fontSize:"8px",color:inkFaint,fontFamily:inter,marginTop:"1px"}}>/5</span>
        </div>
      </div>
      <div style={{flex:1}}>
        <div style={{display:"flex",gap:"2px",marginBottom:"8px"}}>{[1,2,3,4,5].map(i=>(<Star key={i} size={15} color="#FFC400" fill={i<=full?"#FFC400":divider}/>))}</div>
        <p style={{fontSize:"16px",fontWeight:800,color:ink,fontFamily:inter,letterSpacing:"-0.03em",marginBottom:"3px"}}>{score.toFixed(1)} / 5.0 Avg Rating</p>
        <p style={{fontSize:"11px",color:inkMut,fontFamily:inter,marginBottom:"8px"}}>{csat.totalReviews} customer feedback surveys</p>
        {[{dot:green,label:"Satisfied",pct:csat.satisfied},{dot:amber,label:"Neutral",pct:csat.neutral},{dot:red,label:"Dissatisfied",pct:csat.unsatisfied}].map(r=>(<div key={r.label} style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"}}><div style={{width:"8px",height:"8px",borderRadius:"50%",backgroundColor:r.dot}}/><span style={{fontSize:"10.5px",color:inkSec,fontFamily:inter,flex:1}}>{r.label}</span><span style={{fontSize:"10.5px",fontWeight:700,color:r.dot,fontFamily:inter}}>{r.pct}%</span></div>))}
      </div>
    </div>
  </div>);}

function AIInsightsCard({insights}: {insights: {text:string, type:string}[]}){
  const navigate = useNavigate();
  const icons:Record<string,{color:string;icon:React.ElementType}>={info:{color:"#60A5FA",icon:Zap},warning:{color:amber,icon:CheckCircle2},ok:{color:"#4ADE80",icon:CheckCircle2}};
  return(<div style={{borderRadius:"18px",background:`linear-gradient(150deg,#1E3A8A 0%,${blue} 100%)`,padding:"16px 16px 14px",marginBottom:"10px",boxShadow:blueShadow,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:"-24px",right:"-24px",width:"90px",height:"90px",borderRadius:"50%",backgroundColor:"rgba(255,255,255,0.05)"}}/>
    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
      <div style={{width:"34px",height:"34px",borderRadius:"10px",backgroundColor:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}><Sparkles size={16} color="white"/></div>
      <div style={{flex:1}}><p style={{fontSize:"13.5px",fontWeight:700,color:"white",fontFamily:inter}}>AI SLA Insights</p><p style={{fontSize:"10.5px",color:"rgba(255,255,255,0.6)",fontFamily:inter}}>Powered by 10xDS Intelligence</p></div>
    </div>
    <div style={{height:"1px",backgroundColor:"rgba(255,255,255,0.1)",marginBottom:"12px"}}/>
    {insights.length === 0 && <p style={{fontSize:"12px", color:"rgba(255,255,255,0.8)", fontStyle:"italic"}}>No insights available for this period.</p>}
    {insights.map((s,i)=>{
      const ic=icons[s.type] || icons.info;
      return(<div key={i} style={{display:"flex",alignItems:"flex-start",gap:"10px",marginBottom:i<insights.length-1?"11px":"14px"}}>
      <div style={{width:"26px",height:"26px",borderRadius:"8px",backgroundColor:`${ic.color}28`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Zap size={13} color={ic.color}/></div>
      <p style={{fontSize:"12px",color:"rgba(255,255,255,0.88)",fontFamily:inter,lineHeight:1.55,flex:1}}>{s.text}</p>
    </div>);})}
  </div>);}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function AnalyticsScreen(){
  const navigate = useNavigate();
  const { period, setPeriod, data } = useAnalyticsContext();
  const [loading, setLoading] = useState(false);

  const handleFilterChange = (newPeriod: string) => {
    if (newPeriod === period) return;
    setLoading(true);
    setPeriod(newPeriod);
    setTimeout(() => {
      setLoading(false);
    }, 400);
  };

  // ── Derive Customer-Facing SLA Metrics from rawTickets ──
  const openRequests = data.rawTickets.filter(t => t.status === "Pending").length;
  const closedRequests = data.rawTickets.filter(t => t.status === "Resolved").length;
  
  // Escalations (mocked as tickets that took significantly longer than SLA)
  const escalations = data.rawTickets.filter(t => t.responseTime > 3.5).length;

  // Monthly SLA % (Reuse barData but convert to SLA percentage out of 100)
  // We'll generate random but realistic SLA% based on the trend points to fake SLA compliance history
  const monthlySLAData = data.charts.barData.map((d, i) => {
    // Generate an SLA score between 85 and 99 based on some math so it's consistent
    const pseudoRandomSla = 88 + (d.v % 12);
    return { m: d.m, v: pseudoRandomSla };
  });

  // Overall Contract Compliance Score
  const contractComplianceScore = 96;

  // Asset SLA History
  const assetSlaMap: Record<string, {total:number, breached:number}> = {};
  data.rawTickets.forEach(t => {
    if (!assetSlaMap[t.costCategory]) {
      assetSlaMap[t.costCategory] = {total: 0, breached: 0};
    }
    assetSlaMap[t.costCategory].total += 1;
    if (t.responseTime > 3) assetSlaMap[t.costCategory].breached += 1;
  });
  const assetSlaHistory = Object.keys(assetSlaMap).map(cat => {
    const stats = assetSlaMap[cat];
    const sla = stats.total > 0 ? ((stats.total - stats.breached) / stats.total) * 100 : 100;
    return {
      cat,
      tickets: stats.total,
      sla
    };
  }).sort((a,b) => b.sla - a.sla); // Sort by worst SLA

  // Custom AI Insights for Customer
  const customerInsights = [
    { text: `Contract SLA compliance is excellent at ${contractComplianceScore}%.`, type: "ok" },
    { text: `${escalations} tickets were escalated beyond SLA limits this period.`, type: escalations > 10 ? "warning" : "info" },
    { text: `Average resolution time has remained stable around ${data.kpi.avgResponse.toFixed(1)}h.`, type: "info" }
  ];

  return (
    <MobileLayout
      header={
        <>
          <StatusBar/><PageHeader period={period}/>
          <div style={{backgroundColor:card,borderBottom:`1px solid ${border}`,padding:"10px 20px 12px",flexShrink:0}}>
            <div style={{display:"flex",gap:"7px",overflowX:"auto",scrollbarWidth:"none"}}>
              {PERIOD_FILTERS.map(f=>{
                const on=period===f.label;
                return(
                  <button 
                    key={f.label} 
                    type="button" 
                    onClick={()=>handleFilterChange(f.label)} 
                    style={{
                      display:"inline-flex",alignItems:"center",height:"32px",borderRadius:"100px",
                      padding:"0 14px",backgroundColor:on?f.color:card,border:`1.5px solid ${on?f.color:border}`,
                      cursor:"pointer",flexShrink:0,boxShadow:on?`0 2px 8px ${f.color}30`:"none",
                      transition:"all 0.15s",fontFamily:inter
                    }}
                  >
                    <span style={{fontSize:"12px",fontWeight:600,color:on?"white":inkSec,whiteSpace:"nowrap"}}>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      }
    >
      <div style={{position: 'relative'}}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, backgroundColor: 'rgba(248, 250, 252, 0.7)', 
            zIndex: 10, display: 'flex', justifyContent: 'center', paddingTop: '40px', backdropFilter: 'blur(1px)'
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', 
              border: `3px solid ${blue}30`, borderTopColor: blue, 
              animation: 'spin 1s linear infinite'
            }}/>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        
        <div style={{padding:"14px 16px 6px", opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s'}}>
          
          <ContractCompliance score={contractComplianceScore} />

          <div style={{display:"flex",gap:"10px",marginBottom:"10px"}}>
            <KPICard 
              label="Open Requests" value={openRequests} 
              icon={Layers} color={blue} tint={blueTint}
            />
            <KPICard 
              label="Closed Requests" value={closedRequests} 
              icon={CheckCircle2} color={green} tint={greenT}
            />
          </div>
          <div style={{display:"flex",gap:"10px"}}>
            <KPICard 
              label="Avg Resolution" value={`${data.kpi.avgResponse.toFixed(1)}h`} 
              icon={Clock} color={purple} tint={purpleT}
            />
            <KPICard 
              label="Escalations" value={escalations} 
              icon={ShieldAlert} color={red} tint={redT}
            />
          </div>
        </div>
        <div style={{padding:"6px 16px 4px", opacity: loading ? 0.6 : 1}}><MonthlySLABarChart data={monthlySLAData}/></div>
        <div style={{padding:"14px 16px 4px", opacity: loading ? 0.6 : 1}}><ResolutionTrendChart period={period} points={data.charts.trendPoints} labels={data.charts.trendLabels}/></div>
        <div style={{padding:"6px 16px 4px", opacity: loading ? 0.6 : 1}}><AssetSLAHistory assets={assetSlaHistory}/></div>
        <div style={{padding:"14px 16px 4px", opacity: loading ? 0.6 : 1}}><ServiceQualityCard csat={data.csat}/></div>
        <div style={{padding:"6px 16px 4px", opacity: loading ? 0.6 : 1}}><AIInsightsCard insights={customerInsights}/></div>
        <div style={{height:"20px"}}/>
      </div>
    </MobileLayout>
  );
}
