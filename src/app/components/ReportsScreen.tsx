import { handleBackNavigation } from "../utils/navigation";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Bell, User, Search, X, Filter,
  Home, FileText, Database, Bot, Sparkles, MoreHorizontal,
  Download, Calendar, Send, Plus, Clock,
  ChevronRight, BarChart3, Shield, TrendingUp,
  Settings2, Archive, CheckCircle2, Zap,
  Edit3, Trash2, Info, FileSpreadsheet
} from "lucide-react";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const blue=  "#2563EB"; const blueDark="#1D4ED8"; const blueMid="#3B82F6"; const blueTint="#EFF6FF"; const blueRing="rgba(37,99,235,0.12)";
const green= "#16A34A"; const greenT=  "#DCFCE7";
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

import { useReports, Report, Schedule } from "../contexts/ReportsContext";
import { ReportCard } from "./ReportCard";

const CATEGORIES=[
  {label:"Operational Reports",desc:"Service requests & performance",icon:BarChart3,color:blue,tint:blueTint,count:24},
  {label:"Asset Reports",desc:"Health & maintenance logs",icon:Settings2,color:green,tint:greenT,count:18},
  {label:"SLA Reports",desc:"Compliance & breach analysis",icon:Shield,color:orange,tint:orangeT,count:12},
  {label:"Revenue Reports",desc:"AMC & opportunities",icon:TrendingUp,color:purple,tint:purpleT,count:9},
  {label:"Custom Reports",desc:"Build your own report",icon:Plus,color:amber,tint:amberT,count:6},
  {label:"Scheduled Reports",desc:"Automated delivery",icon:Calendar,color:teal,tint:tealT,count:8},
];

const FILTER_DEFS=[
  {label:"All",color:blue,tint:blueTint},{label:"Operational",color:blue,tint:blueTint},
  {label:"Asset",color:green,tint:greenT},{label:"SLA",color:orange,tint:orangeT},
  {label:"Revenue",color:purple,tint:purpleT},{label:"Custom",color:amber,tint:amberT},
];

function StatusBar(){return(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px 6px",backgroundColor:"#0052CC",flexShrink:0}}><span style={{fontSize:"12px",fontWeight:600,color:"white",fontFamily:inter}}>9:41</span><div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{display:"flex",alignItems:"flex-end",gap:"2px"}}>{[3,5,7,9].map((h,i)=><div key={i} style={{width:"3px",height:`${h}px`,borderRadius:"1px",backgroundColor:"white"}}/>)}</div><div style={{display:"flex",alignItems:"center",gap:"2px"}}><div style={{width:"22px",height:"11px",borderRadius:"2px",border:"1.5px solid white",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",inset:0,right:"3px",backgroundColor:"white",borderRadius:"1px"}}/></div><div style={{width:"2px",height:"5px",borderRadius:"1px",backgroundColor:"white"}}/></div></div></div>);}

function PageHeader({total}:{total:number}){
  const navigate = useNavigate();
  return(<div style={{background:`linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`,padding:"10px 20px 18px",flexShrink:0}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
      <button type="button" style={{display:"inline-flex",alignItems:"center",gap:"5px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:"10px",padding:"6px 12px 6px 9px",cursor:"pointer",fontSize:"12.5px",fontWeight:600,color:"white",fontFamily:inter}} onClick={() => handleBackNavigation(navigate, '/dashboard')}><ArrowLeft size={15} color="white"/>Back</button>
    </div>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
      <div><h1 style={{fontSize:"20px",fontWeight:800,color:"white",letterSpacing:"-0.025em",fontFamily:inter,marginBottom:"3px"}}>Reports</h1><p style={{fontSize:"12px",color:"rgba(255,255,255,0.65)",fontFamily:inter}}>Generate, schedule and export enterprise reports</p></div>
      <div style={{backgroundColor:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:"100px",padding:"4px 12px"}}><span style={{fontSize:"12px",fontWeight:700,color:"white",fontFamily:inter}}>{total} total</span></div>
    </div>
  </div>);
}

function StatsStrip({total, scheduled, thisWeek, pending}:{total:number, scheduled:number, thisWeek:number, pending:number}){
  const stats=[{label:"Total Reports",value:total.toString(),color:blue},{label:"Scheduled",value:scheduled.toString(),color:green},{label:"This Week",value:thisWeek.toString(),color:orange},{label:"Pending",value:pending.toString(),color:amber}];
  return(<div style={{backgroundColor:card,borderBottom:`1px solid ${border}`,padding:"12px 20px",flexShrink:0,display:"flex",gap:"0"}}>
    {stats.map((s,i)=>(<div key={s.label} style={{flex:1,textAlign:"center",borderRight:i<stats.length-1?`1px solid ${divider}`:"none",padding:"0 6px"}}>
      <p style={{fontSize:"17px",fontWeight:800,color:s.color,fontFamily:inter,letterSpacing:"-0.03em",marginBottom:"2px"}}>{s.value}</p>
      <p style={{fontSize:"9.5px",color:inkFaint,fontFamily:inter,fontWeight:500}}>{s.label}</p>
    </div>))}
  </div>);}


function QuickActions({onGenerate, onSchedule}:{onGenerate:()=>void; onSchedule:()=>void}){
  const actions=[
    {icon:Plus,label:"Generate Report",sub:"Create now",color:blue,tint:blueTint, onClick: onGenerate},
    {icon:Calendar,label:"Schedule Report",sub:"Automated",color:green,tint:greenT, onClick: onSchedule}
  ];
  return(<div style={{display:"flex",gap:"12px"}}>
    {actions.map(a=>(<button key={a.label} type="button" onClick={a.onClick} style={{flex:1,backgroundColor:card,borderRadius:"16px",padding:"16px 12px",boxShadow:cardShadow,border:`1px solid ${border}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"10px",fontFamily:inter}}>
      <div style={{width:"44px",height:"44px",borderRadius:"12px",backgroundColor:a.tint,border:`1px solid ${a.color}22`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 8px ${a.color}20`}}><a.icon size={20} color={a.color}/></div>
      <div style={{textAlign:"center"}}><p style={{fontSize:"13.5px",fontWeight:700,color:ink,fontFamily:inter,lineHeight:1.3}}>{a.label}</p><p style={{fontSize:"11px",color:inkMut,fontFamily:inter,marginTop:"2px"}}>{a.sub}</p></div>
    </button>))}
  </div>);}



function ScheduleCard({schedule, onEdit, onDelete}:{schedule:Schedule; onEdit:()=>void; onDelete:()=>void}){
  return(<div style={{backgroundColor:card,borderRadius:"16px",boxShadow:cardShadow,border:`1px solid ${border}`,marginBottom:"10px",overflow:"hidden",display:"flex",opacity:schedule.enabled?1:0.6}}>
    <div style={{width:"4px",backgroundColor:schedule.color,flexShrink:0}}/>
    <div style={{flex:1,padding:"12px 13px 11px"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"8px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"38px",height:"38px",borderRadius:"11px",backgroundColor:schedule.tint,border:`1px solid ${schedule.color}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><Calendar size={18} color={schedule.color}/></div>
          <div>
            <p style={{fontSize:"13px",fontWeight:700,color:ink,fontFamily:inter,lineHeight:1.3}}>{schedule.reportType} Report</p>
            <p style={{fontSize:"10.5px",color:inkFaint,fontFamily:inter}}>{schedule.frequency} at {schedule.deliveryTime}</p>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
          <span style={{fontSize:"9px",fontWeight:700,color:schedule.enabled?green:inkMut,backgroundColor:schedule.enabled?greenT:divider,borderRadius:"100px",padding:"2px 7px",fontFamily:inter}}>{schedule.enabled?"Active":"Paused"}</span>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:`1px solid ${divider}`,paddingTop:"9px"}}>
        <span style={{fontSize:"10px",color:inkSec,fontFamily:inter,display:"flex",alignItems:"center",gap:"4px"}}><User size={12} color={inkFaint}/> {schedule.recipients}</span>
        <div style={{display:"flex",gap:"6px"}}>
          <button type="button" onClick={onEdit} style={{height:"28px",borderRadius:"8px",padding:"0 10px",backgroundColor:divider,border:"none",color:inkSec,fontSize:"11px",fontWeight:600,fontFamily:inter,cursor:"pointer"}}>Edit</button>
          <button type="button" onClick={onDelete} style={{height:"28px",borderRadius:"8px",padding:"0 10px",backgroundColor:redT,border:`1px solid ${red}25`,color:red,fontSize:"11px",fontWeight:600,fontFamily:inter,cursor:"pointer"}}>Delete</button>
        </div>
      </div>
    </div>
  </div>);}



const generateSummary = (reports: Report[]) => {
  const types = new Set(reports.map(r => r.type));
  let highlights = [];
  let risks = [];
  let trends = [];
  let actions = [];
  let conclusion = "";

  if (types.has("SLA") || types.has("Operational")) {
    highlights.push("SLA compliance maintained at 98.7% across operational teams, exceeding the quarterly target by 1.2%.");
    risks.push("2 critical operational tasks breached SLA due to unexpected HVAC failures in Zone B.");
    trends.push("Service request volume stabilized after a 23% spike earlier this month.");
    actions.push("Deploy predictive maintenance sensors in Zone B to mitigate future HVAC failures.");
  }
  
  if (types.has("Revenue") || types.has("Analytics")) {
    highlights.push("Revenue opportunities identified: ₹8.4 Lakhs from expiring AMCs and immediate warranty renewals.");
    trends.push("Quarter-over-quarter revenue intelligence indicates a 15% upward trend in predictive renewals.");
    actions.push("Assign key account managers to the top 10 expiring AMC contracts immediately.");
  }
  
  if (types.has("Asset") || types.has("Technician")) {
    risks.push("Aging power systems (Generators A and C) show 14% efficiency drop, risking unplanned downtime.");
    highlights.push("Technician productivity improved by 8% following the new automated dispatch protocol.");
    actions.push("Schedule deep maintenance for Generators A and C during the upcoming low-load weekend.");
    trends.push("Asset downtime reduced by 4 hours per week on average compared to last month.");
  }

  if (highlights.length === 0) {
    highlights.push("All systems operating within normal parameters. No major anomalies detected.");
    trends.push("Steady performance observed across monitored systems.");
    risks.push("No immediate operational or revenue risks identified.");
    actions.push("Continue standard monitoring and reporting protocols.");
    conclusion = "The current reporting period reflects a stable operational environment with standard performance metrics. Continued adherence to baseline protocols is recommended.";
  } else {
    conclusion = "Overall performance is strong with notable improvements in SLA compliance and revenue identification. Immediate attention to aging asset risks and AMC renewals will secure continuous operational excellence.";
  }

  return {
    highlights: highlights.slice(0, 3),
    risks: risks.slice(0, 2),
    trends: trends.slice(0, 2),
    actions: actions.slice(0, 2),
    conclusion
  };
};

function AIExecutiveSummary({reports, onExport, onEmail}:{reports:Report[]; onExport:()=>void; onEmail:()=>void}){
  const summary = useMemo(() => generateSummary(reports), [reports]);
  
  const Section = ({title, items, color}:{title:string, items:string[], color:string}) => (
    <div style={{marginBottom:"16px"}}>
      <p style={{fontSize:"11px",fontWeight:600,color,fontFamily:inter,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"8px"}}>{title}</p>
      {items.map((p,i)=>(<div key={i} style={{display:"flex",alignItems:"flex-start",gap:"8px",marginBottom:i<items.length-1?"6px":"0"}}>
        <div style={{width:"4px",height:"4px",borderRadius:"50%",backgroundColor:color,marginTop:"6px",flexShrink:0,opacity:0.6}}/>
        <p style={{fontSize:"12px",color:"rgba(255,255,255,0.85)",fontFamily:inter,lineHeight:1.45,flex:1}}>{p}</p>
      </div>))}
    </div>
  );

  return(<div style={{borderRadius:"18px",background:`linear-gradient(150deg,#1E3A8A 0%,${blue} 100%)`,padding:"20px 20px 18px",marginBottom:"10px",boxShadow:blueShadow,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:"-24px",right:"-24px",width:"100px",height:"100px",borderRadius:"50%",backgroundColor:"rgba(255,255,255,0.05)"}}/>
    <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
      <div style={{width:"38px",height:"38px",borderRadius:"11px",backgroundColor:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}><Sparkles size={18} color="white"/></div>
      <div style={{flex:1}}><p style={{fontSize:"15px",fontWeight:700,color:"white",fontFamily:inter}}>Executive Summary</p><p style={{fontSize:"11px",color:"rgba(255,255,255,0.6)",fontFamily:inter}}>AI Generated insights from {reports.length} report{reports.length===1?"":"s"}</p></div>
    </div>
    
    <div style={{height:"1px",backgroundColor:"rgba(255,255,255,0.1)",marginBottom:"16px"}}/>
    
    {summary.highlights.length > 0 && <Section title="Key Highlights" items={summary.highlights} color="#93C5FD" />}
    {summary.risks.length > 0 && <Section title="Major Risks" items={summary.risks} color="#FCA5A5" />}
    {summary.trends.length > 0 && <Section title="Performance Trends" items={summary.trends} color="#D8B4FE" />}
    {summary.actions.length > 0 && <Section title="Recommended Actions" items={summary.actions} color="#86EFAC" />}
    
    <div style={{marginBottom:"20px",backgroundColor:"rgba(255,255,255,0.08)",padding:"12px",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.1)"}}>
      <p style={{fontSize:"11px",fontWeight:600,color:"#FDE047",fontFamily:inter,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"6px"}}>Executive Conclusion</p>
      <p style={{fontSize:"12px",color:"rgba(255,255,255,0.9)",fontFamily:inter,lineHeight:1.5,fontStyle:"italic"}}>"{summary.conclusion}"</p>
    </div>

    <div style={{display:"flex",gap:"8px"}}>
      <button type="button" onClick={onExport} style={{flex:1,height:"40px",borderRadius:"11px",backgroundColor:"rgba(255,255,255,0.14)",border:"1.5px solid rgba(255,255,255,0.28)",color:"white",fontSize:"12px",fontWeight:600,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"5px"}}><Download size={14}/>Export PDF</button>
      <button type="button" onClick={onEmail} style={{flex:1,height:"40px",borderRadius:"11px",backgroundColor:"white",color:blueDark,fontSize:"12px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"5px"}}><Send size={14}/>Email Report</button>
    </div>
  </div>);
}

export function ReportsScreen(){
  const navigate = useNavigate();
  const [q,setQ]=useState(""); const [f,setF]=useState("All");
  const [sortAsc, setSortAsc] = useState(false);
  const [previewReport, setPreviewReport] = useState<Report|null>(null);
  const [shareReport, setShareReport] = useState<Report|null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string|null>(null);
  const { reports: recentReports, schedules, addReport, updateReport, deleteReport, addSchedule, updateSchedule, deleteSchedule, exportReport } = useReports();
  
  const [viewMode, setViewMode] = useState<"Recent" | "Scheduled">("Recent");
  
  const [actionReport, setActionReport] = useState<Report|null>(null);
  const [detailsReport, setDetailsReport] = useState<Report|null>(null);
  const [renameReport, setRenameReport] = useState<Report|null>(null);
  const [renameInput, setRenameInput] = useState("");

  const [genCategory, setGenCategory] = useState("Operational");
  const [genDateRange, setGenDateRange] = useState("Last 7 Days");
  const [genFormat, setGenFormat] = useState("PDF");
  const [isGenerating, setIsGenerating] = useState(false);

  const [schId, setSchId] = useState<number|null>(null);
  const [schType, setSchType] = useState("Operational");
  const [schFreq, setSchFreq] = useState("Daily");
  const [schRecipients, setSchRecipients] = useState("");
  const [schFormat, setSchFormat] = useState("PDF");
  const [schTime, setSchTime] = useState("09:00 AM");
  const [schEnabled, setSchEnabled] = useState(true);

  const [showEmailSummary, setShowEmailSummary] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [emailSubject, setEmailSubject] = useState("AI Executive Summary - Management Report");
  const [emailMessage, setEmailMessage] = useState("Please find the generated AI Executive Summary attached for your review. It covers Key Highlights, Risks, Performance Trends, and Recommended Actions.");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };
  (window as any).showToast = showToast;

  const handleDownload = async (report: Report | null, format: "PDF" | "Excel" | "CSV" = "PDF") => {
    showToast(`Generating ${format}...`);
    await exportReport(report, format);
    showToast(`${format} exported successfully!`);
  };

  const filtered=recentReports.filter(r=>{
    const qm=!q.trim()||r.name.toLowerCase().includes(q.toLowerCase());
    const fm=f==="All"||r.type===f||(f==="Operational"&&r.type==="Operational");
    return qm&&fm;
  });

  const sorted = [...filtered].sort((a,b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  const counts:Record<string,number>={All:recentReports.length,Operational:recentReports.filter(r=>r.type==="Operational").length,Asset:recentReports.filter(r=>r.type==="Asset").length,SLA:recentReports.filter(r=>r.type==="SLA").length,Revenue:recentReports.filter(r=>r.type==="Revenue").length,Custom:recentReports.filter(r=>r.type==="Custom").length};

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const categoryColors:Record<string, {color:string, tint:string}> = {
        "Operational": {color: blue, tint: blueTint},
        "Asset": {color: green, tint: greenT},
        "SLA": {color: orange, tint: orangeT},
        "Revenue": {color: purple, tint: purpleT},
        "Technician": {color: amber, tint: amberT},
        "Analytics": {color: teal, tint: tealT}
      };
      
      const newReport: Report = {
        id: Date.now(),
        name: `${genCategory} Report - ${genDateRange}`,
        type: genCategory,
        generated: "Just now",
        size: "1.1 MB",
        color: categoryColors[genCategory]?.color || blue,
        tint: categoryColors[genCategory]?.tint || blueTint,
        icon: FileText
      };
      
      addReport(newReport);
      setShowGenerateModal(false);
      showToast(`${newReport.name} generated successfully`);
      
      if (genFormat !== "Preview") {
        handleDownload(newReport, genFormat as "PDF" | "Excel" | "CSV");
      }
      
      setIsGenerating(false);
    }, 1500);
  };

  const handleOpenScheduleNew = () => {
    setSchId(null);
    setSchType("Operational");
    setSchFreq("Daily");
    setSchRecipients("");
    setSchFormat("PDF");
    setSchTime("09:00 AM");
    setSchEnabled(true);
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = () => {
    const categoryColors:Record<string, {color:string, tint:string}> = {
      "Operational": {color: blue, tint: blueTint},
      "Asset": {color: green, tint: greenT},
      "SLA": {color: orange, tint: orangeT},
      "Revenue": {color: purple, tint: purpleT},
      "Technician": {color: amber, tint: amberT},
      "Analytics": {color: teal, tint: tealT}
    };
    
    if (schId) {
      updateSchedule(schId, {
        reportType: schType, frequency: schFreq, recipients: schRecipients || "None", format: schFormat, deliveryTime: schTime, enabled: schEnabled, color: categoryColors[schType]?.color || blue, tint: categoryColors[schType]?.tint || blueTint
      });
      showToast("Schedule updated successfully");
    } else {
      addSchedule({
        id: Date.now(), reportType: schType, frequency: schFreq, recipients: schRecipients || "None", format: schFormat, deliveryTime: schTime, enabled: schEnabled, color: categoryColors[schType]?.color || blue, tint: categoryColors[schType]?.tint || blueTint
      });
      showToast("Schedule created successfully");
    }
    setShowScheduleModal(false);
  };

  const handleEditSchedule = (s: Schedule) => {
    setSchId(s.id);
    setSchType(s.reportType);
    setSchFreq(s.frequency);
    setSchRecipients(s.recipients === "None" ? "" : s.recipients);
    setSchFormat(s.format);
    setSchTime(s.deliveryTime);
    setSchEnabled(s.enabled);
    setShowScheduleModal(true);
  };

  const handleDeleteSchedule = (id: number) => {
    deleteSchedule(id);
    showToast("Schedule deleted");
  };
  
  const handleDeleteReport = (id: number) => {
    deleteReport(id);
    showToast("Report deleted");
  };

  const handleRenameSave = () => {
    if (renameReport && renameInput.trim()) {
      updateReport(renameReport.id, { name: renameInput.trim() });
      showToast("Report renamed");
      setRenameReport(null);
    }
  };

  const handleShare = (report: Report | null) => {
    setPreviewReport(null);
    setShareReport(report || { id: 0, name: "AI Executive Summary", type: "Summary", generated: "Just now", size: "0.1 MB", color: blue, tint: blueTint, icon: Sparkles });
  };

  return(
    <MobileLayout
      header={
        <>
          <StatusBar/><PageHeader total={recentReports.length}/><StatsStrip total={recentReports.length} scheduled={schedules.length} thisWeek={recentReports.length} pending={0}/>
          <div style={{backgroundColor:card,padding:"12px 20px 0",flexShrink:0}}>
            <div style={{height:"46px",borderRadius:"13px",backgroundColor:bg,border:`1.5px solid ${border}`,boxShadow:cardShadow,display:"flex",alignItems:"center",gap:"10px",padding:"0 14px"}}>
              <Search size={16} color={inkFaint} style={{flexShrink:0}}/>
              <input type="text" placeholder="Search reports..." value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:"13.5px",color:ink,fontFamily:inter}}/>
              {q&&<button type="button" onClick={()=>setQ("")} style={{width:"22px",height:"22px",borderRadius:"50%",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={12} color={inkMut}/></button>}
            </div>
          </div>
          <div style={{backgroundColor:card,borderBottom:`1px solid ${border}`,padding:"10px 20px 12px",flexShrink:0}}>
            <div style={{display:"flex",gap:"7px",overflowX:"auto",scrollbarWidth:"none"}}>
              {FILTER_DEFS.map(fd=>{const on=f===fd.label;return(<button key={fd.label} type="button" onClick={()=>setF(fd.label)} style={{display:"inline-flex",alignItems:"center",gap:"5px",height:"32px",borderRadius:"100px",padding:"0 12px",backgroundColor:on?fd.color:card,border:`1.5px solid ${on?fd.color:border}`,cursor:"pointer",flexShrink:0,boxShadow:on?`0 2px 8px ${fd.color}30`:"none",transition:"all 0.15s",fontFamily:inter}}><span style={{fontSize:"12px",fontWeight:600,color:on?"white":inkSec,whiteSpace:"nowrap"}}>{fd.label}</span><span style={{fontSize:"10px",fontWeight:700,color:on?"rgba(255,255,255,0.75)":inkFaint,backgroundColor:on?"rgba(255,255,255,0.2)":divider,borderRadius:"100px",padding:"1px 6px"}}>{counts[fd.label]??0}</span></button>);})}
            </div>
          </div>
        </>
      }
      modals={
        <>
          {/* ── PDF Preview Modal ── */}
          {previewReport && (
            <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.8)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",flexDirection:"column"}} onClick={()=>setPreviewReport(null)}>
              
              <div style={{height:"60px",backgroundColor:"#1E293B",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <button type="button" onClick={()=>setPreviewReport(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color="white"/></button>
                  <span style={{fontSize:"14px",fontWeight:600,color:"white",fontFamily:inter,maxWidth:"180px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{previewReport.name}.pdf</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <button type="button" onClick={()=>handleShare(previewReport)} style={{background:"none",border:"none",cursor:"pointer"}}><Send size={18} color="white"/></button>
                  <button type="button" onClick={()=>{handleDownload(previewReport); setPreviewReport(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><Download size={18} color="white"/></button>
                </div>
              </div>
              
              <div style={{flex:1,padding:"20px",display:"flex",justifyContent:"center",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
                {/* Mock PDF Document */}
                <div style={{width:"100%",maxWidth:"600px",backgroundColor:"white",borderRadius:"4px",padding:"30px 20px",boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:`2px solid ${ink}`,paddingBottom:"16px",marginBottom:"20px"}}>
                    <div>
                      <h1 style={{fontSize:"18px",fontWeight:800,color:ink,fontFamily:inter,marginBottom:"4px"}}>{previewReport.name}</h1>
                      <p style={{fontSize:"11px",color:inkSec,fontFamily:inter}}>{previewReport.generated}</p>
                    </div>
                    <div style={{width:"40px",height:"40px",backgroundColor:blue,borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center"}}><FileText size={20} color="white"/></div>
                  </div>
                  <p style={{fontSize:"11px",color:inkSec,fontFamily:inter,lineHeight:1.6,marginBottom:"20px"}}>
                    This is a mock PDF preview for the {previewReport.type} report. In a real environment, this view would render actual PDF content or a web-based report visualization using a library like react-pdf.
                  </p>
                  <div style={{width:"100%",height:"150px",backgroundColor:divider,borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"16px"}}><BarChart3 size={32} color={inkMut}/></div>
                  <div style={{width:"100%",height:"12px",backgroundColor:divider,borderRadius:"4px",marginBottom:"8px"}}/>
                  <div style={{width:"80%",height:"12px",backgroundColor:divider,borderRadius:"4px",marginBottom:"8px"}}/>
                  <div style={{width:"90%",height:"12px",backgroundColor:divider,borderRadius:"4px"}}/>
                </div>
              </div>
            </div>
          )}

          {/* ── Share Modal ── */}
          {shareReport && (
            <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShareReport(null)}>
              <div style={{width:"100%",maxWidth:"480px",backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px 20px 30px",boxShadow:"0 -8px 32px rgba(0,0,0,0.12)"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                  <h3 style={{fontSize:"17px",fontWeight:800,color:ink,fontFamily:inter}}>Share Report</h3>
                  <button type="button" onClick={()=>setShareReport(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={inkSec}/></button>
                </div>
                
                <div style={{marginBottom:"20px"}}>
                  <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Email to:</p>
                  <input 
                    type="text" 
                    placeholder="Enter email addresses..."
                    style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none",boxSizing:"border-box"}}
                  />
                </div>

                <button type="button" onClick={()=>{
                  showToast("Report sent successfully");
                  setShareReport(null);
                }} style={{width:"100%",height:"44px",borderRadius:"12px",background:`linear-gradient(135deg,${blue},${blueDark})`,border:"none",color:"white",fontSize:"14px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                  <Send size={16} /> Send Report
                </button>
              </div>
            </div>
          )}

          {/* ── Generate Report Modal ── */}
          {showGenerateModal && (
            <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>!isGenerating && setShowGenerateModal(false)}>
              <div style={{width:"100%",maxWidth:"480px",backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px 20px 30px",boxShadow:"0 -8px 32px rgba(0,0,0,0.12)", position: "relative", overflow: "hidden"}} onClick={e=>e.stopPropagation()}>
                
                {isGenerating && (
                  <div style={{position:"absolute",inset:0,backgroundColor:"rgba(255,255,255,0.8)",backdropFilter:"blur(2px)",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div style={{width:"40px",height:"40px",borderRadius:"50%",border:`3px solid ${divider}`,borderTopColor:blue,animation:"spin 1s linear infinite"}}/>
                    <p style={{fontSize:"14px",fontWeight:700,color:ink,fontFamily:inter,marginTop:"16px"}}>Generating Report...</p>
                    <p style={{fontSize:"12px",color:inkSec,fontFamily:inter,marginTop:"4px"}}>Crunching numbers</p>
                  </div>
                )}

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                  <h3 style={{fontSize:"17px",fontWeight:800,color:ink,fontFamily:inter}}>Generate Report</h3>
                  <button type="button" onClick={()=>setShowGenerateModal(false)} style={{background:"none",border:"none",cursor:"pointer"}} disabled={isGenerating}><X size={20} color={inkSec}/></button>
                </div>
                
                <div style={{marginBottom:"16px"}}>
                  <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Report Category:</p>
                  <select value={genCategory} onChange={e=>setGenCategory(e.target.value)} disabled={isGenerating} style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none"}}>
                    <option>Operational</option>
                    <option>Asset</option>
                    <option>SLA</option>
                    <option>Revenue</option>
                    <option>Technician</option>
                    <option>Analytics</option>
                  </select>
                </div>
                
                <div style={{marginBottom:"16px"}}>
                  <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Date Range:</p>
                  <select value={genDateRange} onChange={e=>setGenDateRange(e.target.value)} disabled={isGenerating} style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none"}}>
                    <option>Today</option>
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Custom Range</option>
                  </select>
                </div>
                
                <div style={{marginBottom:"20px"}}>
                  <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Output Format:</p>
                  <select value={genFormat} onChange={e=>setGenFormat(e.target.value)} disabled={isGenerating} style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none"}}>
                    <option>PDF</option>
                    <option>Excel</option>
                    <option>CSV</option>
                    <option>Preview</option>
                  </select>
                </div>

                <button type="button" onClick={handleGenerate} disabled={isGenerating} style={{width:"100%",height:"44px",borderRadius:"12px",background:`linear-gradient(135deg,${blue},${blueDark})`,border:"none",color:"white",fontSize:"14px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",opacity:isGenerating?0.7:1}}>
                  <Bot size={16} /> Generate Now
                </button>
              </div>
            </div>
          )}

          {/* ── Schedule Report Modal ── */}
          {showScheduleModal && (
            <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowScheduleModal(false)}>
              <div style={{width:"100%",maxWidth:"480px",backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px 20px 30px",boxShadow:"0 -8px 32px rgba(0,0,0,0.12)", maxHeight: "90vh", overflowY: "auto"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                  <h3 style={{fontSize:"17px",fontWeight:800,color:ink,fontFamily:inter}}>{schId ? "Edit Schedule" : "Schedule Report"}</h3>
                  <button type="button" onClick={()=>setShowScheduleModal(false)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={inkSec}/></button>
                </div>
                
                <div style={{marginBottom:"16px"}}>
                  <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Report Type:</p>
                  <select value={schType} onChange={e=>setSchType(e.target.value)} style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none"}}>
                    <option>Operational</option>
                    <option>Asset</option>
                    <option>SLA</option>
                    <option>Revenue</option>
                    <option>Technician</option>
                    <option>Analytics</option>
                  </select>
                </div>
                
                <div style={{marginBottom:"16px"}}>
                  <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Frequency:</p>
                  <select value={schFreq} onChange={e=>setSchFreq(e.target.value)} style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none"}}>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>

                <div style={{marginBottom:"16px"}}>
                  <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Recipients (Email IDs):</p>
                  <input type="text" value={schRecipients} onChange={e=>setSchRecipients(e.target.value)} placeholder="e.g. manager@domain.com" style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none",boxSizing:"border-box"}}/>
                </div>

                <div style={{display:"flex", gap:"12px", marginBottom:"16px"}}>
                  <div style={{flex:1}}>
                    <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Output Format:</p>
                    <select value={schFormat} onChange={e=>setSchFormat(e.target.value)} style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none"}}>
                      <option>PDF</option>
                      <option>Excel</option>
                      <option>CSV</option>
                    </select>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Delivery Time:</p>
                    <select value={schTime} onChange={e=>setSchTime(e.target.value)} style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none"}}>
                      <option>08:00 AM</option>
                      <option>09:00 AM</option>
                      <option>12:00 PM</option>
                      <option>05:00 PM</option>
                    </select>
                  </div>
                </div>

                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"24px", padding:"12px 16px", backgroundColor:bg, borderRadius:"12px", border:`1px solid ${border}`}}>
                  <div>
                    <p style={{fontSize:"13.5px",fontWeight:700,color:ink,fontFamily:inter,lineHeight:1.2}}>Enable Schedule</p>
                    <p style={{fontSize:"11px",color:inkSec,fontFamily:inter}}>Automatically generate and send</p>
                  </div>
                  <div onClick={()=>setSchEnabled(!schEnabled)} style={{width:"40px",height:"24px",borderRadius:"12px",backgroundColor:schEnabled?green:inkMut,position:"relative",cursor:"pointer",transition:"background-color 0.2s"}}>
                    <div style={{width:"20px",height:"20px",borderRadius:"50%",backgroundColor:"white",position:"absolute",top:"2px",left:schEnabled?"18px":"2px",transition:"left 0.2s",boxShadow:"0 2px 4px rgba(0,0,0,0.1)"}}/>
                  </div>
                </div>

                <button type="button" onClick={handleSaveSchedule} style={{width:"100%",height:"44px",borderRadius:"12px",background:`linear-gradient(135deg,${green},#15803D)`,border:"none",color:"white",fontSize:"14px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                  <Calendar size={16} /> Save Schedule
                </button>
              </div>
            </div>
          )}

          {/* ── Toast Notification ── */}
          {toastMsg && (
            <div style={{position:"absolute", bottom:"80px", left:"50%", transform:"translateX(-50%)", backgroundColor:ink, color:"white", padding:"12px 24px", borderRadius:"100px", fontSize:"13px", fontWeight:600, fontFamily:inter, zIndex:2000, boxShadow:"0 4px 12px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", gap:"8px", animation:"slideUp 0.3s ease"}}>
              <CheckCircle2 size={16} color={green}/>
              {toastMsg}
            </div>
          )}

          {/* ── Action Menu Bottom Sheet ── */}
          {actionReport && (
            <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setActionReport(null)}>
              <div style={{width:"100%",maxWidth:"480px",backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px 20px 30px",boxShadow:"0 -8px 32px rgba(0,0,0,0.12)"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",borderBottom:`1px solid ${divider}`,paddingBottom:"12px"}}>
                  <h3 style={{fontSize:"16px",fontWeight:800,color:ink,fontFamily:inter,maxWidth:"80%",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{actionReport.name}</h3>
                  <button type="button" onClick={()=>setActionReport(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={inkSec}/></button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  <button type="button" onClick={()=>{setDetailsReport(actionReport); setActionReport(null);}} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",backgroundColor:bg,border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
                    <Info size={18} color={blue}/> <span style={{fontSize:"14px",fontWeight:600,color:ink,fontFamily:inter,flex:1}}>View Details</span>
                  </button>
                  <button type="button" onClick={()=>{handleDownload(actionReport, "PDF"); setActionReport(null);}} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",backgroundColor:bg,border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
                    <Download size={18} color={blue}/> <span style={{fontSize:"14px",fontWeight:600,color:ink,fontFamily:inter,flex:1}}>Download PDF</span>
                  </button>
                  <button type="button" onClick={()=>{handleDownload(actionReport, "Excel"); setActionReport(null);}} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",backgroundColor:bg,border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
                    <FileSpreadsheet size={18} color={green}/> <span style={{fontSize:"14px",fontWeight:600,color:ink,fontFamily:inter,flex:1}}>Download Excel</span>
                  </button>
                  <button type="button" onClick={()=>{handleDownload(actionReport, "CSV"); setActionReport(null);}} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",backgroundColor:bg,border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
                    <FileText size={18} color={orange}/> <span style={{fontSize:"14px",fontWeight:600,color:ink,fontFamily:inter,flex:1}}>Download CSV</span>
                  </button>
                  <button type="button" onClick={()=>{setShareReport(actionReport); setActionReport(null);}} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",backgroundColor:bg,border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
                    <Send size={18} color={inkSec}/> <span style={{fontSize:"14px",fontWeight:600,color:ink,fontFamily:inter,flex:1}}>Share Report</span>
                  </button>
                  <button type="button" onClick={()=>{setRenameInput(actionReport.name); setRenameReport(actionReport); setActionReport(null);}} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",backgroundColor:bg,border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
                    <Edit3 size={18} color={inkSec}/> <span style={{fontSize:"14px",fontWeight:600,color:ink,fontFamily:inter,flex:1}}>Rename</span>
                  </button>
                  <button type="button" onClick={()=>{handleDeleteReport(actionReport.id); setActionReport(null);}} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",backgroundColor:redT,border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
                    <Trash2 size={18} color={red}/> <span style={{fontSize:"14px",fontWeight:600,color:red,fontFamily:inter,flex:1}}>Delete Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Report Details Modal ── */}
          {detailsReport && (
            <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setDetailsReport(null)}>
              <div style={{width:"100%",maxWidth:"480px",backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px 20px 30px",boxShadow:"0 -8px 32px rgba(0,0,0,0.12)"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
                  <div style={{display:"flex",gap:"12px"}}>
                    <div style={{width:"44px",height:"44px",borderRadius:"12px",backgroundColor:detailsReport.tint,display:"flex",alignItems:"center",justifyContent:"center"}}><detailsReport.icon size={22} color={detailsReport.color}/></div>
                    <div>
                      <h3 style={{fontSize:"16px",fontWeight:800,color:ink,fontFamily:inter,marginBottom:"4px"}}>{detailsReport.name}</h3>
                      <span style={{fontSize:"11px",fontWeight:600,color:detailsReport.color,backgroundColor:detailsReport.tint,borderRadius:"6px",padding:"2px 8px",fontFamily:inter}}>{detailsReport.type}</span>
                    </div>
                  </div>
                  <button type="button" onClick={()=>setDetailsReport(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={inkSec}/></button>
                </div>
                <div style={{backgroundColor:bg,borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"12px",color:inkSec,fontFamily:inter}}>Generated</span><span style={{fontSize:"12px",fontWeight:600,color:ink,fontFamily:inter}}>{detailsReport.generated}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"12px",color:inkSec,fontFamily:inter}}>File Size</span><span style={{fontSize:"12px",fontWeight:600,color:ink,fontFamily:inter}}>{detailsReport.size}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"12px",color:inkSec,fontFamily:inter}}>Scheduled</span><span style={{fontSize:"12px",fontWeight:600,color:ink,fontFamily:inter}}>{detailsReport.scheduled ? "Yes" : "No"}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"12px",color:inkSec,fontFamily:inter}}>Status</span><span style={{fontSize:"12px",fontWeight:600,color:green,fontFamily:inter}}>Available</span></div>
                </div>
                <div style={{display:"flex", gap:"10px", marginTop:"20px"}}>
                  <button type="button" onClick={() => {handleDownload(detailsReport, "PDF"); setDetailsReport(null);}} style={{flex:1,height:"40px",borderRadius:"10px",backgroundColor:blueTint,border:`1px solid ${blue}30`,color:blue,fontSize:"13px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                    <Download size={14}/> PDF
                  </button>
                  <button type="button" onClick={() => {handleDownload(detailsReport, "Excel"); setDetailsReport(null);}} style={{flex:1,height:"40px",borderRadius:"10px",backgroundColor:greenT,border:`1px solid ${green}30`,color:green,fontSize:"13px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                    <FileSpreadsheet size={14}/> Excel
                  </button>
                  <button type="button" onClick={() => {handleDownload(detailsReport, "CSV"); setDetailsReport(null);}} style={{flex:1,height:"40px",borderRadius:"10px",backgroundColor:orangeT,border:`1px solid ${orange}30`,color:orange,fontSize:"13px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                    <FileText size={14}/> CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Rename Report Modal ── */}
          {renameReport && (
            <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setRenameReport(null)}>
              <div style={{width:"100%",maxWidth:"480px",backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px 20px 30px",boxShadow:"0 -8px 32px rgba(0,0,0,0.12)"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                  <h3 style={{fontSize:"17px",fontWeight:800,color:ink,fontFamily:inter}}>Rename Report</h3>
                  <button type="button" onClick={()=>setRenameReport(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={inkSec}/></button>
                </div>
                <div style={{marginBottom:"20px"}}>
                  <input type="text" value={renameInput} onChange={e=>setRenameInput(e.target.value)} style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none",boxSizing:"border-box"}}/>
                </div>
                <button type="button" onClick={handleRenameSave} style={{width:"100%",height:"44px",borderRadius:"12px",background:`linear-gradient(135deg,${blue},${blueDark})`,border:"none",color:"white",fontSize:"14px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* ── Email Summary Modal ── */}
          {showEmailSummary && (
            <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowEmailSummary(false)}>
              <div style={{width:"100%",maxWidth:"480px",backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px 20px 30px",boxShadow:"0 -8px 32px rgba(0,0,0,0.12)"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
                  <h3 style={{fontSize:"17px",fontWeight:800,color:ink,fontFamily:inter}}>Email Executive Report</h3>
                  <button type="button" onClick={()=>setShowEmailSummary(false)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={inkSec}/></button>
                </div>
                
                <div style={{marginBottom:"16px"}}>
                  <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>To:</p>
                  <input type="text" value={emailRecipients} onChange={e=>setEmailRecipients(e.target.value)} placeholder="management@company.com" style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none",boxSizing:"border-box"}}/>
                </div>
                
                <div style={{marginBottom:"16px"}}>
                  <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Subject:</p>
                  <input type="text" value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none",boxSizing:"border-box"}}/>
                </div>

                <div style={{marginBottom:"20px"}}>
                  <p style={{fontSize:"12px",fontWeight:600,color:inkSec,fontFamily:inter,marginBottom:"6px"}}>Message:</p>
                  <textarea value={emailMessage} onChange={e=>setEmailMessage(e.target.value)} style={{width:"100%",height:"80px",padding:"12px 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none",boxSizing:"border-box",resize:"none"}}/>
                </div>

                <div style={{display:"flex", gap:"12px"}}>
                  <button type="button" onClick={()=>{
                    setPreviewReport({
                      id: 999, name: "AI Executive Summary", type: "Summary", generated: "Just now", size: "0.5 MB", color: blue, tint: blueTint, icon: Sparkles
                    });
                  }} style={{flex:1,height:"44px",borderRadius:"12px",backgroundColor:bg,border:`1px solid ${border}`,color:ink,fontSize:"14px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    Preview
                  </button>
                  <button type="button" onClick={()=>{
                    showToast("Email sent successfully!");
                    setShowEmailSummary(false);
                  }} style={{flex:2,height:"44px",borderRadius:"12px",background:`linear-gradient(135deg,${blue},${blueDark})`,border:"none",color:"white",fontSize:"14px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                    <Send size={16} /> Send Email
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
      <div style={{padding:"16px 16px 8px"}}><QuickActions onGenerate={()=>setShowGenerateModal(true)} onSchedule={handleOpenScheduleNew}/></div>
      <div style={{padding:"8px 16px 8px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px",marginTop:"6px"}}>
          <div style={{display:"flex",backgroundColor:divider,borderRadius:"100px",padding:"4px"}}>
            <button type="button" onClick={()=>setViewMode("Recent")} style={{height:"30px",borderRadius:"100px",padding:"0 16px",backgroundColor:viewMode==="Recent"?"white":"transparent",border:"none",boxShadow:viewMode==="Recent"?"0 2px 6px rgba(0,0,0,0.06)":"none",color:viewMode==="Recent"?ink:inkSec,fontSize:"12.5px",fontWeight:600,fontFamily:inter,cursor:"pointer",transition:"all 0.2s"}}>Recent Reports</button>
            <button type="button" onClick={()=>setViewMode("Scheduled")} style={{height:"30px",borderRadius:"100px",padding:"0 16px",backgroundColor:viewMode==="Scheduled"?"white":"transparent",border:"none",boxShadow:viewMode==="Scheduled"?"0 2px 6px rgba(0,0,0,0.06)":"none",color:viewMode==="Scheduled"?ink:inkSec,fontSize:"12.5px",fontWeight:600,fontFamily:inter,cursor:"pointer",transition:"all 0.2s"}}>Scheduled</button>
          </div>
          {viewMode==="Recent" && (
            <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
              <button type="button" onClick={() => setSortAsc(!sortAsc)} style={{background:"none",border:"none",fontSize:"11px",color:inkSec,fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"}}>
                Sort {sortAsc ? "↑" : "↓"}
              </button>
              <button type="button" onClick={() => navigate('/reports/library')} style={{background:"none",border:"none",color:blue,fontSize:"12px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",gap:"2px"}}>
                View All <ChevronRight size={14}/>
              </button>
            </div>
          )}
        </div>
        
        {viewMode === "Recent" ? (
          <>
            {sorted.length===0?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:"40px",gap:"12px"}}><div style={{width:"64px",height:"64px",borderRadius:"20px",backgroundColor:divider,display:"flex",alignItems:"center",justifyContent:"center"}}><Archive size={28} color={inkFaint}/></div><p style={{fontSize:"15px",fontWeight:700,color:ink,fontFamily:inter}}>No reports found</p></div>
            ):sorted.map(r=><ReportCard key={r.id} report={r} onPreview={()=>setPreviewReport(r)} onDownloadPDF={()=>handleDownload(r)} onOpenActions={()=>setActionReport(r)} onDetails={()=>setDetailsReport(r)} />)}
          </>
        ) : (
          <>
            {schedules.length===0?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:"40px",gap:"12px"}}><div style={{width:"64px",height:"64px",borderRadius:"20px",backgroundColor:divider,display:"flex",alignItems:"center",justifyContent:"center"}}><Calendar size={28} color={inkFaint}/></div><p style={{fontSize:"15px",fontWeight:700,color:ink,fontFamily:inter}}>No active schedules</p></div>
            ):schedules.map(s=><ScheduleCard key={s.id} schedule={s} onEdit={()=>handleEditSchedule(s)} onDelete={()=>handleDeleteSchedule(s.id)} />)}
          </>
        )}
      </div>
      <div style={{padding:"8px 16px 24px"}}>
        <AIExecutiveSummary 
          reports={sorted} 
          onExport={() => handleDownload({
            id: 999, name: "AI Executive Summary", type: "Summary", generated: "Just now", size: "0.5 MB", color: blue, tint: blueTint, icon: Sparkles
          }, "PDF")} 
          onEmail={() => setShowEmailSummary(true)}
        />
      </div>
    </MobileLayout>
  );
}
