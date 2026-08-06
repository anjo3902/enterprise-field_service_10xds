import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor, VendorTicket, Priority } from "../../contexts/VendorContext";
import { useSLACountdown, slaCardDisplay } from "../../utils/slaEngine";
import {
  ClipboardList, AlertTriangle, CheckCircle2, Clock, Users,
  Search, X, Bell, Bot, Shield, Edit2, XCircle,
  Activity, MapPin, User, TrendingUp, Package, ArrowRight, Info
} from "lucide-react";

const blue="#2563EB",blueTint="#EFF6FF",green="#16A34A",greenT="#DCFCE7",red="#DC2626",redT="#FEF2F2",amber="#D97706",amberT="#FFFBEB",purple="#7C3AED",purpleT="#F5F3FF",teal="#0891B2",tealT="#ECFEFF",ink="#0F172A",inkSec="#475569",inkMut="#64748B",inkFaint="#94A3B8",bg="#F8FAFC",card="#FFFFFF",border_="E2E8F0",divider="#F1F5F9",inter="'Inter','Roboto',sans-serif",cardShadow="0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
const border = `#${border_}`;

function fmtDate(iso:string){return new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}
function prioColor(p:string){if(p==="Critical")return{color:red,bg:redT};if(p==="High")return{color:amber,bg:amberT};if(p==="Medium")return{color:blue,bg:blueTint};return{color:inkMut,bg:divider};}
function statusColor(s:string){if(s==="Pending Review")return{color:amber,bg:amberT};if(s==="Approved"||s==="Assigned"||s==="Technician Accepted")return{color:blue,bg:blueTint};if(s==="In Progress"||s==="Work Order Generated")return{color:purple,bg:purpleT};if(s==="Completed"||s==="Closed")return{color:green,bg:greenT};if(s==="Rejected"||s==="Escalated")return{color:red,bg:redT};return{color:inkMut,bg:divider};}
function triggerMeta(t:string){const map:Record<string,{label:string;color:string;bg:string}>={low_confidence:{label:"Low Confidence",color:amber,bg:amberT},invalid_image:{label:"Invalid Image",color:red,bg:redT},unlisted_fault:{label:"Unlisted Fault",color:amber,bg:amberT},critical_requires_verification:{label:"Critical — Needs Verification",color:red,bg:redT},safety_escalation:{label:"Safety Escalation",color:red,bg:redT}};return map[t.toLowerCase().replace(/ /g,"_")]||{label:t,color:inkMut,bg:divider};}

function KPICard({label,value,sub,color,tint,icon:Icon,onClick}:{label:string;value:string|number;sub?:string;color:string;tint:string;icon:React.ElementType;onClick?:()=>void}){
  return(
    <div onClick={onClick} style={{backgroundColor:card,borderRadius:"16px",border:`1px solid ${border}`,boxShadow:cardShadow,padding:"14px",cursor:onClick?"pointer":"default",display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:"90px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
        <div style={{width:"28px",height:"28px",borderRadius:"8px",backgroundColor:tint,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${color}22`}}><Icon size={14} color={color}/></div>
        <span style={{fontSize: "10.5px", fontWeight: 500, color: inkMut, fontFamily: inter}}>{label}</span>
      </div>
      <div>
        <div style={{fontSize: "23px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.04em", lineHeight: 1.05}}>{value}</div>
        {sub&&<div style={{fontSize:"10.5px",color:inkFaint,fontFamily:inter,marginTop:"4px"}}>{sub}</div>}
      </div>
    </div>
  );
}

function TicketCard({ticket,onView}:{ticket:VendorTicket;onView:()=>void}){
  const sla=slaCardDisplay(ticket.slaDeadline,ticket.slaStatus,ticket.status),p=prioColor(ticket.priority),s=statusColor(ticket.status);
  return(
    <div style={{backgroundColor:card,borderRadius:"14px",border:`1px solid ${ticket.status==="Pending Review"?amber+"60":border}`,boxShadow:cardShadow,padding:"14px",marginBottom:"10px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
          <span style={{fontSize: "9.5px", fontWeight: 700, color: inkFaint, fontFamily: inter, letterSpacing: "0.05em"}}>{ticket.id}</span>
          <div style={{padding: "2px 7px", borderRadius: "100px", backgroundColor: p.bg, fontSize: "9px", fontWeight: 700,color:p.color,fontFamily:inter,textTransform:"uppercase"}}>{ticket.priority}</div>
          <div style={{padding: "2px 7px", borderRadius: "100px", backgroundColor: s.bg, fontSize: "9px", fontWeight: 700,color:s.color,fontFamily:inter}}>{ticket.status}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"4px",backgroundColor:sla.urgent?redT:"transparent",padding:sla.urgent?"2px 6px":"0",borderRadius:"6px",flexShrink:0}}>
          <Clock size={11} color={sla.color}/>
          <span style={{fontSize:"11px",fontWeight:600,color:sla.color,fontFamily:inter}}>{sla.text}</span>
        </div>
      </div>
      <p style={{fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 10px", lineHeight: 1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{ticket.title}</p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"4px"}}><User size={12} color={inkMut}/><span style={{fontSize:"11px",color:inkSec,fontFamily:inter,fontWeight:500}}>{ticket.assignedTechnicianName||"Unassigned"}</span></div>
        <div style={{display:"flex",alignItems:"center",gap:"4px"}}><MapPin size={11} color={inkFaint}/><span style={{fontSize:"11px",color:inkMut,fontFamily:inter}}>{ticket.customerName}</span></div>
        <span style={{fontSize:"10px",color:inkFaint,fontFamily:inter}}>{fmtDate(ticket.createdAt)}</span>
      </div>
      <button type="button" onClick={onView} style={{width:"100%",height:"36px",borderRadius:"10px",backgroundColor:ticket.status==="Pending Review"?amber:blue,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",cursor:"pointer"}}>
        {ticket.status==="Pending Review"?<AlertTriangle size={14} color="white"/>:<ClipboardList size={14} color="white"/>}
        <span style={{fontSize:"13px",fontWeight:700,color:"white",fontFamily:inter}}>{ticket.status==="Pending Review"?"Review Now":"View Details"}</span>
      </button>
    </div>
  );
}

function DetailSheet({ticket,onClose,onApprove,onModify,onReject}:{ticket:VendorTicket;onClose:()=>void;onApprove:()=>void;onModify:()=>void;onReject:()=>void}){
  const sla=slaCardDisplay(ticket.slaDeadline,ticket.slaStatus,ticket.status),p=prioColor(ticket.priority),s=statusColor(ticket.status);
  const isPending=ticket.status==="Pending Review";
  const triggers:string[]=ticket.aiAnalysis?.hitlTriggers||(isPending?["low_confidence"]:[]);
  return(
    <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.65)",zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 20px 16px",borderBottom:`1px solid ${border}`,flexShrink:0}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
              <span style={{fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em",color:ink,fontFamily:inter}}>{ticket.id}</span>
              <div style={{padding: "2px 8px", borderRadius: "100px", backgroundColor: p.bg, fontSize: "9px", fontWeight: 700,color:p.color,fontFamily:inter,textTransform:"uppercase"}}>{ticket.priority}</div>
              <div style={{padding: "2px 8px", borderRadius: "100px", backgroundColor: s.bg, fontSize: "9px", fontWeight: 700,color:s.color,fontFamily:inter}}>{ticket.status}</div>
            </div>
            <p style={{fontSize:"12px",color:inkMut,fontFamily:inter,margin:0}}>Request Detail &amp; AI Review</p>
          </div>
          <button type="button" onClick={onClose} style={{width:"36px",height:"36px",borderRadius:"100px",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={18} color={inkMut}/></button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"16px 20px"}}>
          {/* Severity Verdict */}
          {ticket.aiAnalysis && (
            <div style={{marginBottom:"14px"}}>
              <p style={{fontSize:"10px",fontWeight:700,color:inkMut,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 8px",fontFamily:inter}}>Severity Verdict</p>
              <div style={{display:"flex",alignItems:"center",gap:"12px",backgroundColor:bg,borderRadius:"10px",padding:"12px",border:`1px solid ${border}`}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:"10px",fontWeight:600,color:inkSec,margin:"0 0 4px",fontFamily:inter}}>AI SUGGESTION</p>
                  <div style={{display:"inline-block",padding:"2px 8px",borderRadius:"6px",backgroundColor:prioColor(ticket.aiAnalysis.severity).bg,fontSize:"11px",fontWeight:700,color:prioColor(ticket.aiAnalysis.severity).color,fontFamily:inter,textTransform:"uppercase"}}>{ticket.aiAnalysis.severity}</div>
                </div>
                <ArrowRight size={16} color={inkMut}/>
                <div style={{flex:1,textAlign:"right"}}>
                  <p style={{fontSize:"10px",fontWeight:600,color:inkSec,margin:"0 0 4px",fontFamily:inter}}>FINAL PRIORITY</p>
                  <div style={{display:"inline-block",padding:"2px 8px",borderRadius:"6px",backgroundColor:p.bg,fontSize:"11px",fontWeight:700,color:p.color,fontFamily:inter,textTransform:"uppercase"}}>{ticket.priority}</div>
                  {ticket.priority !== ticket.aiAnalysis.severity && <p style={{fontSize:"9px",fontWeight:700,color:amber,margin:"4px 0 0",fontFamily:inter}}>Updated by Admin</p>}
                </div>
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px"}}>
            {[
              {label:"Fault Type",value:ticket.aiAnalysis?.faultType || ticket.category},
              {label:"Status",value:ticket.status},
              {label:"Image Severity",value:"-"},
              {label:"Desc Severity",value:"-"},
              {label:"Confidence",value:ticket.aiAnalysis?`${Math.round(ticket.aiAnalysis.confidence*100)}%`:"-"},
              {label:"Safety Escalation",value:ticket.aiAnalysis?.safetyFlag?"Yes":"No"},
              {label:"Assigned Technician",value:ticket.assignedTechnicianName ? `${ticket.assignedTechnicianName} (ID: ${ticket.assignedTechnicianId||ticket.vendorId})` : "Unassigned"},
              {label:"Reviewed At",value:ticket.status==="Pending Review"?"-":(ticket.resolvedAt?fmtDate(ticket.resolvedAt):"-")}
            ].map(x=>(
              <div key={x.label} style={{backgroundColor:bg,borderRadius:"10px",padding:"10px 12px",border:`1px solid ${border}`}}>
                <p style={{fontSize:"9px",fontWeight:700,color:inkFaint,textTransform:"uppercase",margin:"0 0 4px",fontFamily:inter}}>{x.label}</p>
                <p style={{fontSize:"13px",fontWeight:600,color:ink,margin:0,fontFamily:inter,wordBreak:"break-word"}}>{x.value}</p>
              </div>
            ))}
          </div>

          {/* Review Notes */}
          <div style={{backgroundColor:bg,borderRadius:"12px",padding:"12px",marginBottom:"14px",border:`1px solid ${border}`}}>
            <p style={{fontSize:"10px",fontWeight:700,color:inkMut,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 8px",fontFamily:inter}}>Review Notes</p>
            <p style={{fontSize:"13px",color:ink,margin:0,fontFamily:inter,lineHeight:1.5}}>{ticket.modifiedNotes || ticket.rejectionNotes || "Auto-approved by system (no HITL required)"}</p>
          </div>

          {/* Evidence Image */}
          <div style={{backgroundColor:bg,borderRadius:"12px",padding:"12px",marginBottom:"14px",border:`1px solid ${border}`}}>
            <p style={{fontSize:"10px",fontWeight:700,color:inkMut,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 8px",fontFamily:inter}}>Evidence Image</p>
            <div style={{backgroundColor:amberT,border:`1px solid ${amber}40`,borderRadius:"8px",padding:"12px",fontSize:"12px",color:amber,fontFamily:inter,fontWeight:500}}>
              No image evidence available for this ticket.
            </div>
          </div>

          {/* AI Reasoning */}
          <div style={{backgroundColor:bg,borderRadius:"12px",padding:"12px",marginBottom:"14px",border:`1px solid ${border}`}}>
            <p style={{fontSize:"10px",fontWeight:700,color:inkMut,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 8px",fontFamily:inter}}>AI Reasoning</p>
            <p style={{fontSize:"13px",color:inkSec,margin:0,fontFamily:inter,lineHeight:1.5}}>{ticket.aiAnalysis?.reasoning||"-"}</p>
          </div>

          {/* HITL Triggers */}
          <div style={{backgroundColor:bg,borderRadius:"12px",padding:"12px",marginBottom:"14px",border:`1px solid ${border}`}}>
            <p style={{fontSize:"10px",fontWeight:700,color:inkMut,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 8px",fontFamily:inter}}>HITL Triggers</p>
            {ticket.aiAnalysis?.hitlTriggers && ticket.aiAnalysis.hitlTriggers.length > 0 ? (
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                {ticket.aiAnalysis.hitlTriggers.map((t,i)=>{
                  const m=triggerMeta(t);
                  return(<div key={i} style={{padding:"4px 8px",borderRadius:"6px",backgroundColor:m.bg,fontSize:"11px",fontWeight:700,color:m.color,fontFamily:inter}}>{m.label}</div>);
                })}
              </div>
            ) : (
              <p style={{fontSize:"12px",color:inkMut,margin:0,fontFamily:inter}}>No HITL triggers recorded.</p>
            )}
          </div>

          {/* Issue Description */}
          <div style={{backgroundColor:bg,borderRadius:"12px",padding:"12px",marginBottom:"14px",border:`1px solid ${border}`}}>
            <p style={{fontSize:"10px",fontWeight:700,color:inkMut,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 8px",fontFamily:inter}}>Issue Description</p>
            <p style={{fontSize:"13px",color:inkSec,margin:0,fontFamily:inter,lineHeight:1.5}}>{ticket.description}</p>
          </div>

          {/* Timeline */}
          {ticket.notes && ticket.notes.length>0&&(
            <div style={{backgroundColor:bg,borderRadius:"12px",padding:"12px",border:`1px solid ${border}`}}>
              <p style={{fontSize:"10px",fontWeight:700,color:inkMut,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 10px",fontFamily:inter}}>Activity Notes</p>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {ticket.notes.map((n,i)=>(
                  <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                    <div style={{width:"6px",height:"6px",borderRadius:"3px",backgroundColor:blue,flexShrink:0,marginTop:"5px"}}/>
                    <p style={{fontSize:"12px",color:inkSec,margin:0,fontFamily:inter,lineHeight:1.4}}>{n}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isPending&&(
            <div style={{display:"flex",flexDirection:"column",gap:"10px",paddingTop:"4px",paddingBottom:"16px"}}>
              <button type="button" onClick={onApprove} style={{width:"100%",height:"48px",borderRadius:"12px",backgroundColor:green,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",cursor:"pointer"}}><CheckCircle2 size={18} color="white"/><span style={{fontSize:"15px",fontWeight:700,color:"white",fontFamily:inter}}>Approve</span></button>
              <div style={{display:"flex",gap:"10px"}}>
                <button type="button" onClick={onModify} style={{flex:1,height:"44px",borderRadius:"12px",backgroundColor:amber,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",cursor:"pointer"}}><Edit2 size={16} color="white"/><span style={{fontSize:"13px",fontWeight:700,color:"white",fontFamily:inter}}>Modify &amp; Approve</span></button>
                <button type="button" onClick={onReject} style={{flex:1,height:"44px",borderRadius:"12px",backgroundColor:red,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",cursor:"pointer"}}><XCircle size={16} color="white"/><span style={{fontSize:"13px",fontWeight:700,color:"white",fontFamily:inter}}>Reject</span></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModifySheet({ticket,onClose,onSubmit}:{ticket:VendorTicket;onClose:()=>void;onSubmit:(p:Priority,c:string,n:string)=>void}){
  const[priority,setPriority]=useState<Priority>(ticket.priority);
  const[category,setCategory]=useState(ticket.category);
  const[notes,setNotes]=useState("");
  return(
    <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.65)",zIndex:300,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px",paddingBottom:"40px"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
          <div><h3 style={{fontSize:"18px",fontWeight:800,color:ink,margin:"0 0 2px",fontFamily:inter}}>Modify &amp; Approve</h3><p style={{fontSize:"12px",color:inkMut,margin:0,fontFamily:inter}}>Ticket #{ticket.id}</p></div>
          <button type="button" onClick={onClose} style={{width:"36px",height:"36px",borderRadius:"100px",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={18} color={inkMut}/></button>
        </div>
        <div style={{backgroundColor:amberT,borderRadius:"10px",padding:"10px 14px",marginBottom:"16px",border:`1px solid ${amber}40`,display:"flex",gap:"8px"}}>
          <Info size={14} color={amber} style={{flexShrink:0,marginTop:1}}/>
          <span style={{fontSize:"12px",color:amber,fontFamily:inter}}>Use this when the request is valid but AI predicted the wrong priority. Reject is only for invalid requests.</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div>
            <label style={{fontSize:"12px",fontWeight:700,color:inkSec,fontFamily:inter,display:"block",marginBottom:"6px"}}>Final Priority *</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"8px"}}>
              {(["Critical","High","Medium","Low"] as Priority[]).map(p=>{const pc=prioColor(p);return(<button key={p} type="button" onClick={()=>setPriority(p)} style={{padding:"10px 4px",borderRadius:"10px",border:`2px solid ${priority===p?pc.color:border}`,backgroundColor:priority===p?pc.bg:card,cursor:"pointer",fontFamily:inter,fontSize:"12px",fontWeight:700,color:priority===p?pc.color:inkMut}}>{p}</button>);})}
            </div>
          </div>
          <div>
            <label style={{fontSize:"12px",fontWeight:700,color:inkSec,fontFamily:inter,display:"block",marginBottom:"6px"}}>Category</label>
            <input type="text" value={category} onChange={e=>setCategory(e.target.value)} style={{width:"100%",height:"44px",borderRadius:"10px",border:`1px solid ${border}`,padding:"0 14px",fontSize:"14px",fontFamily:inter,boxSizing:"border-box",color:ink}}/>
          </div>
          <div>
            <label style={{fontSize:"12px",fontWeight:700,color:inkSec,fontFamily:inter,display:"block",marginBottom:"6px"}}>Admin Notes</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{width:"100%",borderRadius:"10px",border:`1px solid ${border}`,padding:"10px 14px",fontSize:"13px",fontFamily:inter,boxSizing:"border-box",color:ink,resize:"none"}}/>
          </div>
          <button type="button" onClick={()=>onSubmit(priority,category,notes)} style={{width:"100%",height:"50px",borderRadius:"12px",backgroundColor:amber,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",cursor:"pointer"}}><Edit2 size={18} color="white"/><span style={{fontSize:"15px",fontWeight:700,color:"white",fontFamily:inter}}>Modify &amp; Approve</span></button>
        </div>
      </div>
    </div>
  );
}

function RejectSheet({ticket,onClose,onSubmit}:{ticket:VendorTicket;onClose:()=>void;onSubmit:(r:string,n:string)=>void}){
  const reasons=["Invalid Image","Spam / Duplicate","Out of Scope","Incomplete Information","Customer No-Show"];
  const[reason,setReason]=useState("");
  const[notes,setNotes]=useState("");
  const canSubmit=!!(reason&&notes);
  return(
    <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.65)",zIndex:300,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px",paddingBottom:"40px",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
          <div><h3 style={{fontSize:"18px",fontWeight:800,color:red,margin:"0 0 2px",fontFamily:inter}}>Reject Request</h3><p style={{fontSize:"12px",color:inkMut,margin:0,fontFamily:inter}}>Ticket #{ticket.id}</p></div>
          <button type="button" onClick={onClose} style={{width:"36px",height:"36px",borderRadius:"100px",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={18} color={inkMut}/></button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div>
            <label style={{fontSize:"12px",fontWeight:700,color:inkSec,fontFamily:inter,display:"block",marginBottom:"8px"}}>Rejection Reason *</label>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {reasons.map(r=>(<button key={r} type="button" onClick={()=>setReason(r)} style={{padding:"12px 16px",borderRadius:"10px",border:`2px solid ${reason===r?red:border}`,backgroundColor:reason===r?redT:card,cursor:"pointer",fontFamily:inter,fontSize:"13px",fontWeight:600,color:reason===r?red:ink,textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between"}}>{r}{reason===r&&<CheckCircle2 size={16} color={red}/>}</button>))}
            </div>
          </div>
          <div>
            <label style={{fontSize:"12px",fontWeight:700,color:inkSec,fontFamily:inter,display:"block",marginBottom:"6px"}}>Notes *</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{width:"100%",borderRadius:"10px",border:`1px solid ${border}`,padding:"10px 14px",fontSize:"13px",fontFamily:inter,boxSizing:"border-box",color:ink,resize:"none"}}/>
          </div>
          <button type="button" onClick={()=>canSubmit&&onSubmit(reason,notes)} disabled={!canSubmit} style={{width:"100%",height:"50px",borderRadius:"12px",backgroundColor:canSubmit?red:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",cursor:canSubmit?"pointer":"not-allowed"}}><XCircle size={18} color={canSubmit?"white":inkFaint}/><span style={{fontSize:"15px",fontWeight:700,color:canSubmit?"white":inkFaint,fontFamily:inter}}>Confirm Rejection</span></button>
        </div>
      </div>
    </div>
  );
}

export default function VendorDashboard(){
  const navigate=useNavigate();
  const{tickets,kpis,vendor,unreadActivityCount,approveForAssignment,modifyAndApprove,rejectTicket,breachCount,atRiskCount,warrantyRenewals}=useVendor();
  const[search,setSearch]=useState("");
  const[filterStatus,setFilterStatus]=useState("All");
  const[selectedTicket,setSelectedTicket]=useState<VendorTicket|null>(null);
  const[showModify,setShowModify]=useState(false);
  const[showReject,setShowReject]=useState(false);
  const[successMsg,setSuccessMsg]=useState("");
  const[visibleCount,setVisibleCount]=useState(10);

  const statusFilters=["All","Pending Review","Approved","Assigned","In Progress","Completed","Closed","Rejected"];

  const filtered=useMemo(()=>{
    let list=tickets;
    if(filterStatus!=="All")list=list.filter(t=>t.status===filterStatus);
    if(search.trim()){const q=search.toLowerCase();list=list.filter(t=>t.id.toLowerCase().includes(q)||t.title.toLowerCase().includes(q)||t.customerName.toLowerCase().includes(q)||(t.assignedTechnicianName||"").toLowerCase().includes(q));}
    return list.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  },[tickets,search,filterStatus]);

  const visible=filtered.slice(0,visibleCount);

  const flash=(msg:string)=>{setSuccessMsg(msg);setTimeout(()=>setSuccessMsg(""),3500);};

  const expiringWarranties = useMemo(() => warrantyRenewals.filter(r => {
    const days = Math.ceil((new Date(r.currentExpiryDate).getTime() - Date.now()) / 86400000);
    return days <= 30 && days >= 0 && r.status !== "Activated";
  }).length, [warrantyRenewals]);

  const awaitingApprovalCount = useMemo(() => warrantyRenewals.filter(r => r.status === "Quotation Sent").length, [warrantyRenewals]);
  
  const pendingActionCount = useMemo(() => warrantyRenewals.filter(r => r.status === "New Request" || r.status === "Under Review" || r.status === "Inspection Required" || r.status === "Inspection Completed" || r.status === "Customer Approved").length, [warrantyRenewals]);
  
  const activatedTodayCount = useMemo(() => warrantyRenewals.filter(r => {
    if(r.status !== "Activated") return false;
    const activatedEvent = r.timeline.find(t => t.status === "Activated");
    if(!activatedEvent) return false;
    return new Date(activatedEvent.timestamp).toDateString() === new Date().toDateString();
  }).length, [warrantyRenewals]);

  const handleApprove=(id:string)=>{approveForAssignment(id);setSelectedTicket(null);flash("Ticket approved! Assign a technician from the Assignment Board.");};
  const handleModify=(priority:Priority,category:string,notes:string)=>{if(!selectedTicket)return;modifyAndApprove(selectedTicket.id,priority,category,notes);setShowModify(false);setSelectedTicket(null);flash("Ticket modified and approved.");};
  const handleReject=(reason:string,notes:string)=>{if(!selectedTicket)return;rejectTicket(selectedTicket.id,reason,notes);setShowReject(false);setSelectedTicket(null);flash("Ticket rejected and logged in activity feed.");};

  return(
    <MobileLayout bottomNav={<VendorBottomNavigation/>} backgroundColor={bg} header={
      <div style={{backgroundColor:blue,paddingTop:"44px",paddingBottom:"16px",paddingLeft:"20px",paddingRight:"20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
          <div>
            <p style={{fontSize: "12.5px", color: "rgba(255,255,255,0.8)", fontFamily: inter, margin: "0 0 2px", fontWeight: 500}}>Service Provider Dashboard</p>
            <h1 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: inter, color: "white", margin: 0 }}>{vendor.name}</h1>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
            <button type="button" onClick={()=>navigate("/vendor/activity")} style={{position:"relative",width:"38px",height:"38px",borderRadius:"100px",backgroundColor:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
              <Bell size={18} color="white"/>
              {unreadActivityCount>0&&<div style={{position:"absolute",top:"-3px",right:"-3px",backgroundColor:red,color:"white",fontSize:"9px",fontWeight:800,width:"16px",height:"16px",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid "+blue}}>{unreadActivityCount}</div>}
            </button>
            <button type="button" onClick={()=>navigate("/vendor/settings")} style={{width:"38px",height:"38px",borderRadius:"100px",backgroundColor:"#2B3648",border:"1px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer", color: "white", fontSize: "13px", fontWeight: 800, fontFamily: inter}}>
              <User size={20} color="white" />
            </button>
          </div>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          {breachCount>0&&<div style={{flex:1,backgroundColor:"rgba(220,38,38,0.2)",borderRadius:"8px",padding:"6px 10px",border:"1px solid rgba(220,38,38,0.3)",display:"flex",alignItems:"center",gap:"5px"}}><AlertTriangle size={12} color="#FCA5A5"/><span style={{fontSize:"11px",fontWeight:700,color:"#FCA5A5",fontFamily:inter}}>{breachCount} SLA Breached</span></div>}
          {atRiskCount>0&&<div style={{flex:1,backgroundColor:"rgba(217,119,6,0.2)",borderRadius:"8px",padding:"6px 10px",border:"1px solid rgba(217,119,6,0.3)",display:"flex",alignItems:"center",gap:"5px"}}><Clock size={12} color="#FDE68A"/><span style={{fontSize:"11px",fontWeight:700,color:"#FDE68A",fontFamily:inter}}>{atRiskCount} At Risk</span></div>}
          {breachCount===0&&atRiskCount===0&&<div style={{flex:1,backgroundColor:"rgba(22,163,74,0.2)",borderRadius:"8px",padding:"6px 10px",border:"1px solid rgba(22,163,74,0.3)",display:"flex",alignItems:"center",gap:"5px"}}><CheckCircle2 size={12} color="#86EFAC"/><span style={{fontSize:"11px",fontWeight:700,color:"#86EFAC",fontFamily:inter}}>All SLAs On Track</span></div>}
        </div>
      </div>
    }>
      <div style={{padding:"16px 16px 20px"}}>
        {successMsg&&<div style={{backgroundColor:greenT,border:`1px solid ${green}40`,borderRadius:"12px",padding:"12px 16px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"8px"}}><CheckCircle2 size={16} color={green}/><span style={{fontSize:"13px",fontWeight:600,color:green,fontFamily:inter}}>{successMsg}</span></div>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"14px"}}>
          <KPICard label="Ops Queue" value={kpis.operationalQueue} sub="Active" color={blue} tint={blueTint} icon={ClipboardList} onClick={()=>setFilterStatus("All")}/>
          <KPICard label="Pending" value={kpis.pendingHitl} sub="Awaiting review" color={amber} tint={amberT} icon={AlertTriangle} onClick={()=>setFilterStatus("Pending Review")}/>
          <KPICard label="Assigned" value={kpis.assignedTickets} sub="With technicians" color={purple} tint={purpleT} icon={Users} onClick={()=>setFilterStatus("Assigned")}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
          <div style={{backgroundColor:card,borderRadius:"14px",border:`1px solid ${border}`,padding:"12px 14px",boxShadow:cardShadow,display:"flex",gap:"10px",alignItems:"center",cursor:"pointer"}} onClick={()=>navigate("/vendor/technicians")}>
            <div style={{width:"36px",height:"36px",borderRadius:"10px",backgroundColor:tealT,display:"flex",alignItems:"center",justifyContent:"center"}}><Users size={18} color={teal}/></div>
            <div><p style={{fontSize:"9px",fontWeight:700,color:inkMut,textTransform:"uppercase",margin:"0 0 2px",fontFamily:inter}}>Technicians</p><p style={{fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em",color:ink,margin:0,fontFamily:inter}}>{kpis.activeTechnicians} <span style={{fontSize:"11px",color:inkFaint,fontWeight:500}}>on job</span></p></div>
          </div>
          <div style={{backgroundColor:card,borderRadius:"14px",border:`1px solid ${border}`,padding:"12px 14px",boxShadow:cardShadow,display:"flex",gap:"10px",alignItems:"center",cursor:"pointer"}} onClick={()=>navigate("/vendor/sla")}>
            <div style={{width:"36px",height:"36px",borderRadius:"10px",backgroundColor:greenT,display:"flex",alignItems:"center",justifyContent:"center"}}><TrendingUp size={18} color={green}/></div>
            <div><p style={{fontSize:"9px",fontWeight:700,color:inkMut,textTransform:"uppercase",margin:"0 0 2px",fontFamily:inter}}>SLA Compliance</p><p style={{fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em",color:ink,margin:0,fontFamily:inter}}>{kpis.slaCompliance}%</p></div>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px", marginTop:"8px"}}>
          <h2 style={{fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em",color:ink,fontFamily:inter,margin:0}}>Warranty Contracts</h2>
          <span style={{fontSize:"12px",color:blue,fontWeight:700,fontFamily:inter,cursor:"pointer"}} onClick={()=>navigate("/vendor/warranty")}>View All</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"20px"}}>
          <KPICard label="Expiring Soon" value={expiringWarranties} sub="Next 30 days" color={red} tint={redT} icon={AlertTriangle} onClick={()=>navigate("/vendor/warranty")}/>
          <KPICard label="Awaiting Client" value={awaitingApprovalCount} sub="Approval pending" color={amber} tint={amberT} icon={Clock} onClick={()=>navigate("/vendor/warranty")}/>
          <KPICard label="Pending Action" value={pendingActionCount} sub="Needs your review" color={blue} tint={blueTint} icon={Shield} onClick={()=>navigate("/vendor/warranty")}/>
          <KPICard label="Activated Today" value={activatedTodayCount} sub="Renewals processed" color={green} tint={greenT} icon={CheckCircle2} onClick={()=>navigate("/vendor/warranty")}/>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
          <h2 style={{fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em",color:ink,fontFamily:inter,margin:0}}>Operational Queue</h2>
          <span style={{fontSize:"12px",color:inkMut,fontFamily:inter}}>{filtered.length} tickets</span>
        </div>

        <div style={{position:"relative",marginBottom:"10px"}}>
          <Search size={16} color={inkMut} style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)"}}/>
          <input type="text" placeholder="Search ticket, customer, technician..." value={search} onChange={e=>{setSearch(e.target.value);setVisibleCount(10);}} style={{width:"100%",height:"44px",borderRadius:"12px",border:`1px solid ${border}`,paddingLeft:"40px",paddingRight:search?"40px":"14px",fontSize:"14px",fontFamily:inter,backgroundColor:card,color:ink,boxSizing:"border-box"}}/>
          {search&&<button type="button" onClick={()=>setSearch("")} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}><X size={16} color={inkMut}/></button>}
        </div>

        <div style={{display:"flex",gap:"8px",marginBottom:"14px",overflowX:"auto",paddingBottom:"4px"}}>
          {statusFilters.map(f=>(
            <button key={f} type="button" onClick={()=>{setFilterStatus(f);setVisibleCount(10);}} style={{flexShrink:0,padding:"6px 14px",borderRadius:"100px",border:`1px solid ${filterStatus===f?blue:border}`,backgroundColor:filterStatus===f?blueTint:card,fontSize:"12px",fontWeight:filterStatus===f?700:500,color:filterStatus===f?blue:inkSec,fontFamily:inter,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:"5px"}}>
              {f}{f==="Pending Review"&&kpis.pendingHitl>0&&<span style={{backgroundColor:amber,color:"white",fontSize:"9px",fontWeight:800,padding:"1px 5px",borderRadius:"10px"}}>{kpis.pendingHitl}</span>}
            </button>
          ))}
        </div>

        {visible.length>0?(
          <>
            {visible.map(t=><TicketCard key={t.id} ticket={t} onView={()=>setSelectedTicket(t)}/>)}
            {visibleCount<filtered.length&&<button type="button" onClick={()=>setVisibleCount(c=>c+10)} style={{width:"100%",height:"44px",borderRadius:"12px",border:`1px solid ${border}`,backgroundColor:card,fontSize:"14px",fontWeight:700,color:blue,fontFamily:inter,cursor:"pointer",marginTop:"4px"}}>Load More ({filtered.length-visibleCount} remaining)</button>}
          </>
        ):(
          <div style={{textAlign:"center",padding:"40px 20px",backgroundColor:card,borderRadius:"16px",border:`1px solid ${border}`}}>
            <ClipboardList size={32} color={inkFaint} style={{marginBottom:"12px"}}/>
            <h3 style={{fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em",color:ink,fontFamily:inter,margin:"0 0 6px"}}>No Tickets Found</h3>
            <p style={{fontSize:"13px",color:inkSec,fontFamily:inter,margin:0}}>Try adjusting your filter or search terms.</p>
          </div>
        )}
      </div>

      {selectedTicket&&!showModify&&!showReject&&<DetailSheet ticket={selectedTicket} onClose={()=>setSelectedTicket(null)} onApprove={()=>handleApprove(selectedTicket.id)} onModify={()=>setShowModify(true)} onReject={()=>setShowReject(true)}/>}
      {selectedTicket&&showModify&&<ModifySheet ticket={selectedTicket} onClose={()=>setShowModify(false)} onSubmit={handleModify}/>}
      {selectedTicket&&showReject&&<RejectSheet ticket={selectedTicket} onClose={()=>setShowReject(false)} onSubmit={handleReject}/>}
    </MobileLayout>
  );
}
