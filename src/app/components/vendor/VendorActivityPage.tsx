import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor, VendorTicket, ReassignmentEvent, Priority } from "../../contexts/VendorContext";
import {
  Activity, Clock, CheckCircle2, XCircle, AlertTriangle,
  User, Shield, Bot, RefreshCw, Edit2, X, ChevronDown, ChevronRight,
  ClipboardList, Info, ArrowRight, ArrowLeft, Calendar, Zap
} from "lucide-react";

const blue="#2563EB",blueTint="#EFF6FF",green="#16A34A",greenT="#DCFCE7",red="#DC2626",redT="#FEF2F2",amber="#D97706",amberT="#FFFBEB",purple="#7C3AED",purpleT="#F5F3FF",teal="#0891B2",tealT="#ECFEFF",ink="#0F172A",inkSec="#475569",inkMut="#64748B",inkFaint="#94A3B8",bg="#F8FAFC",card="#FFFFFF",border="#E2E8F0",divider="#F1F5F9",inter="'Inter','Roboto',sans-serif",cardShadow="0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

function fmtDate(iso:string){const d=new Date(iso);const now=new Date();const diff=now.getTime()-d.getTime();if(diff<60000)return"Just now";if(diff<3600000)return`${Math.floor(diff/60000)}m ago`;if(diff<86400000)return`${Math.floor(diff/3600000)}h ago`;return d.toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}
function prioColor(p:string){if(p==="Critical")return{color:red,bg:redT};if(p==="High")return{color:amber,bg:amberT};if(p==="Medium")return{color:blue,bg:blueTint};return{color:inkMut,bg:divider};}
function statusColor(s:string){if(s==="Pending Review")return{color:amber,bg:amberT};if(s==="Approved"||s==="Assigned")return{color:blue,bg:blueTint};if(s==="In Progress"||s==="Work Order Generated")return{color:purple,bg:purpleT};if(s==="Completed"||s==="Closed")return{color:green,bg:greenT};if(s==="Rejected"||s==="Escalated")return{color:red,bg:redT};return{color:inkMut,bg:divider};}
function triggerMeta(t:string){const map:Record<string,{label:string;color:string;bg:string}>={low_confidence:{label:"Low Confidence",color:amber,bg:amberT},invalid_image:{label:"Invalid Image",color:red,bg:redT},unlisted_fault:{label:"Unlisted Fault",color:amber,bg:amberT},critical_requires_verification:{label:"Critical — Needs Verification",color:red,bg:redT},safety_escalation:{label:"Safety Escalation",color:red,bg:redT}};return map[t.toLowerCase().replace(/ /g,"_")]||{label:t,color:inkMut,bg:divider};}

function reassignmentStatusColor(s:string){if(s==="completed")return{color:green,bg:greenT};if(s==="requested")return{color:amber,bg:amberT};if(s==="processing")return{color:blue,bg:blueTint};if(s==="rejected")return{color:red,bg:redT};return{color:inkMut,bg:divider};}

// ─── HITL Review Card ─────────────────────────────────────────────────────────
function PendingReviewCard({ticket,onApprove,onModify,onReject,onView}:{ticket:VendorTicket;onApprove:()=>void;onModify:()=>void;onReject:()=>void;onView:()=>void}){
  const p=prioColor(ticket.priority);
  const triggers:string[]=ticket.aiAnalysis?.hitlTriggers||["low_confidence"];
  return(
    <div style={{backgroundColor:card,borderRadius:"14px",border:`2px solid ${amber}40`,boxShadow:cardShadow,padding:"14px",marginBottom:"10px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
        <div>
          <span style={{fontSize: "9.5px", fontWeight: 700, color: inkFaint, fontFamily: inter, letterSpacing: "0.05em"}}>{ticket.id}</span>
          <span style={{display:"inline-flex",alignItems:"center",gap:"4px",marginLeft:"8px",padding: "2px 8px", borderRadius: "100px", backgroundColor: amberT, fontSize: "9px", fontWeight: 700,color:amber,fontFamily:inter}}>
            <AlertTriangle size={10} color={amber}/> Pending Review
          </span>
        </div>
        <div style={{padding: "2px 7px", borderRadius: "100px", backgroundColor: p.bg, fontSize: "9px", fontWeight: 700,color:p.color,fontFamily:inter,textTransform:"uppercase"}}>{ticket.priority}</div>
      </div>

      <p style={{fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 10px", lineHeight: 1.3}}>{ticket.title}</p>

      {/* AI info row */}
      <div style={{display:"flex",gap:"8px",marginBottom:"10px",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:"4px",alignItems:"center",padding:"4px 8px",backgroundColor:purpleT,borderRadius:"6px"}}>
          <Bot size={12} color={purple}/>
          <span style={{fontSize:"11px",fontWeight:600,color:purple,fontFamily:inter}}>AI: {ticket.aiAnalysis?.severity||ticket.priority}</span>
        </div>
        <div style={{display:"flex",gap:"4px",alignItems:"center",padding:"4px 8px",backgroundColor:bg,borderRadius:"6px",border:`1px solid ${border}`}}>
          <span style={{fontSize:"11px",fontWeight:600,color:inkMut,fontFamily:inter}}>{ticket.aiAnalysis?`${Math.round(ticket.aiAnalysis.confidence*100)}% confidence`:"N/A"}</span>
        </div>
        {ticket.aiAnalysis?.safetyFlag&&<div style={{display:"flex",gap:"4px",alignItems:"center",padding:"4px 8px",backgroundColor:redT,borderRadius:"6px"}}><Shield size={12} color={red}/><span style={{fontSize:"11px",fontWeight:700,color:red,fontFamily:inter}}>Safety Flag</span></div>}
      </div>

      {/* HITL triggers */}
      <div style={{display:"flex",gap:"6px",marginBottom:"12px",flexWrap:"wrap"}}>
        {triggers.map((t,i)=>{const m=triggerMeta(t);return(<div key={i} style={{padding: "3px 8px", borderRadius: "100px", backgroundColor: m.bg, fontSize: "9px", fontWeight: 700,color:m.color,fontFamily:inter}}>{m.label}</div>);})}
      </div>

      {/* Action buttons */}
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        <button type="button" onClick={onApprove} style={{width:"100%",height:"40px",borderRadius:"10px",backgroundColor:green,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",cursor:"pointer"}}><CheckCircle2 size={16} color="white"/><span style={{fontSize:"13px",fontWeight:700,color:"white",fontFamily:inter}}>Approve</span></button>
        <div style={{display:"flex",gap:"8px"}}>
          <button type="button" onClick={onModify} style={{flex:1,height:"38px",borderRadius:"10px",backgroundColor:amber,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px",cursor:"pointer"}}><Edit2 size={14} color="white"/><span style={{fontSize:"12px",fontWeight:700,color:"white",fontFamily:inter}}>Modify</span></button>
          <button type="button" onClick={onReject} style={{flex:1,height:"38px",borderRadius:"10px",backgroundColor:red,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px",cursor:"pointer"}}><XCircle size={14} color="white"/><span style={{fontSize:"12px",fontWeight:700,color:"white",fontFamily:inter}}>Reject</span></button>
          <button type="button" onClick={onView} style={{flex:1,height:"38px",borderRadius:"10px",border:`1px solid ${border}`,backgroundColor:card,display:"flex",alignItems:"center",justifyContent:"center",gap:"4px",cursor:"pointer"}}><ClipboardList size={14} color={inkMut}/><span style={{fontSize:"12px",fontWeight:700,color:inkSec,fontFamily:inter}}>Detail</span></button>
        </div>
      </div>
    </div>
  );
}

// ─── Finalized Ticket Card ────────────────────────────────────────────────────
function FinalizedCard({ticket,onView}:{ticket:VendorTicket;onView:()=>void}){
  const s=statusColor(ticket.status),p=prioColor(ticket.priority);
  return(
    <div style={{backgroundColor:card,borderRadius:"12px",border:`1px solid ${border}`,boxShadow:cardShadow,padding:"12px",marginBottom:"8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
          <span style={{fontSize:"12px",fontWeight:700,color:ink,fontFamily:inter}}>{ticket.id}</span>
          <div style={{padding:"2px 7px",borderRadius:"5px",backgroundColor:p.bg,fontSize:"9px",fontWeight:700,color:p.color,fontFamily:inter,textTransform:"uppercase"}}>{ticket.priority}</div>
          <div style={{padding:"2px 7px",borderRadius:"5px",backgroundColor:s.bg,fontSize:"9px",fontWeight:700,color:s.color,fontFamily:inter}}>{ticket.status}</div>
        </div>
        <span style={{fontSize:"10px",color:inkFaint,fontFamily:inter}}>{fmtDate(ticket.updatedAt)}</span>
      </div>
      <p style={{fontSize:"12px",color:inkSec,fontFamily:inter,margin:"0 0 8px",lineHeight:1.4}}>{ticket.title}</p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
          <User size={11} color={inkFaint}/>
          <span style={{fontSize:"11px",color:inkMut,fontFamily:inter}}>{ticket.assignedTechnicianName||"Unassigned"}</span>
        </div>
        <button type="button" onClick={onView} style={{padding:"4px 12px",borderRadius:"8px",border:`1px solid ${border}`,backgroundColor:bg,fontSize:"11px",fontWeight:700,color:blue,fontFamily:inter,cursor:"pointer"}}>View Details</button>
      </div>
    </div>
  );
}

// ─── Reassignment Card ────────────────────────────────────────────────────────
function ReassignmentCard({event,onApprove,onReject,onView}:{event:ReassignmentEvent;onApprove:()=>void;onReject:()=>void;onView:()=>void}){
  const sc=reassignmentStatusColor(event.status);
  const isRequested=event.status==="requested";
  return(
    <div style={{backgroundColor:card,borderRadius:"12px",border:`1px solid ${isRequested?amber+"60":border}`,boxShadow:cardShadow,padding:"12px",marginBottom:"8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"3px"}}>
            <span style={{fontSize:"12px",fontWeight:800,color:ink,fontFamily:inter}}>{event.requestId}</span>
            <div style={{padding:"2px 7px",borderRadius:"5px",backgroundColor:sc.bg,fontSize:"9px",fontWeight:700,color:sc.color,fontFamily:inter,textTransform:"capitalize"}}>{event.status}</div>
          </div>
          <span style={{fontSize:"10px",color:inkFaint,fontFamily:inter}}>{fmtDate(event.timestamp)}</span>
        </div>
        <div style={{width:"28px",height:"28px",borderRadius:"8px",backgroundColor:isRequested?amberT:greenT,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <RefreshCw size={14} color={isRequested?amber:green}/>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px",backgroundColor:bg,borderRadius:"8px",padding:"8px 10px"}}>
        <div style={{flex:1}}>
          <p style={{fontSize:"9px",fontWeight:700,color:inkFaint,textTransform:"uppercase",margin:"0 0 2px",fontFamily:inter}}>From</p>
          <p style={{fontSize:"12px",fontWeight:600,color:ink,margin:0,fontFamily:inter}}>{event.previousTechnicianName}</p>
        </div>
        <ArrowRight size={14} color={inkFaint}/>
        <div style={{flex:1}}>
          <p style={{fontSize:"9px",fontWeight:700,color:inkFaint,textTransform:"uppercase",margin:"0 0 2px",fontFamily:inter}}>To</p>
          <p style={{fontSize:"12px",fontWeight:600,color:ink,margin:0,fontFamily:inter}}>{event.newTechnicianName||"Pending"}</p>
        </div>
      </div>

      <div style={{marginBottom:"10px"}}>
        <span style={{fontSize:"11px",fontWeight:600,color:inkMut,fontFamily:inter}}>Reason: </span>
        <span style={{fontSize:"11px",color:inkSec,fontFamily:inter}}>{event.reason.replace(/_/g," ")}</span>
        {event.notes&&<><br/><span style={{fontSize:"10px",color:inkFaint,fontFamily:inter}}>{event.notes}</span></>}
      </div>

      {event.slaImpact&&event.slaImpact.reassignmentDurationMinutes>0&&(
        <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
          {[{label:"Approval Delay",val:`${event.slaImpact.approvalDelayMinutes}m`},{label:"Processing",val:`${event.slaImpact.processingDurationMinutes}m`},{label:"Total",val:`${event.slaImpact.reassignmentDurationMinutes}m`}].map(x=>(
            <div key={x.label} style={{flex:1,backgroundColor:bg,borderRadius:"6px",padding:"6px 8px",border:`1px solid ${border}`,textAlign:"center"}}>
              <p style={{fontSize:"8px",fontWeight:700,color:inkFaint,textTransform:"uppercase",margin:"0 0 2px",fontFamily:inter}}>{x.label}</p>
              <p style={{fontSize:"12px",fontWeight:800,color:ink,margin:0,fontFamily:inter}}>{x.val}</p>
            </div>
          ))}
        </div>
      )}

      {isRequested ? (
        <div style={{display:"flex",gap:"8px"}}>
          <button type="button" onClick={onApprove} style={{flex:1,height:"38px",borderRadius:"10px",backgroundColor:green,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px",cursor:"pointer"}}><CheckCircle2 size={14} color="white"/><span style={{fontSize:"12px",fontWeight:700,color:"white",fontFamily:inter}}>Approve</span></button>
          <button type="button" onClick={onReject} style={{flex:1,height:"38px",borderRadius:"10px",backgroundColor:red,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px",cursor:"pointer"}}><XCircle size={14} color="white"/><span style={{fontSize:"12px",fontWeight:700,color:"white",fontFamily:inter}}>Reject</span></button>
          <button type="button" onClick={onView} style={{flex:1,height:"38px",borderRadius:"10px",border:`1px solid ${border}`,backgroundColor:card,display:"flex",alignItems:"center",justifyContent:"center",gap:"4px",cursor:"pointer"}}><ClipboardList size={14} color={inkMut}/><span style={{fontSize:"12px",fontWeight:700,color:inkSec,fontFamily:inter}}>Detail</span></button>
        </div>
      ) : (
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button type="button" onClick={onView} style={{padding:"6px 12px",borderRadius:"8px",border:`1px solid ${border}`,backgroundColor:bg,fontSize:"11px",fontWeight:700,color:blue,fontFamily:inter,cursor:"pointer"}}>View Details</button>
        </div>
      )}
    </div>
  );
}

// ─── Modify Sheet (inline) ────────────────────────────────────────────────────
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
          <span style={{fontSize:"12px",color:amber,fontFamily:inter}}>Correct the AI output before approval. Reject only for invalid or spam requests.</span>
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

// ─── Reject Sheet ─────────────────────────────────────────────────────────────
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

// ─── Detail Sheet ─────────────────────────────────────────────────────────────
function DetailSheet({ticket,onClose}:{ticket:VendorTicket;onClose:()=>void}){
  const p=prioColor(ticket.priority),s=statusColor(ticket.status);
  return(
    <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.65)",zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 20px 16px",borderBottom:`1px solid ${border}`,flexShrink:0}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
              <span style={{fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em",color:ink,fontFamily:inter}}>{ticket.id}</span>
              <div style={{padding: "2px 8px", borderRadius: "100px", backgroundColor: p.bg, fontSize: "9px", fontWeight: 700,color:p.color,fontFamily:inter,textTransform:"uppercase"}}>{ticket.priority}</div>
              <div style={{padding: "2px 8px", borderRadius: "100px", backgroundColor: s.bg, fontSize: "9px", fontWeight: 700,color:s.color,fontFamily:inter}}>{ticket.status}</div>
            </div>
            <p style={{fontSize:"12px",color:inkMut,fontFamily:inter,margin:0}}>{ticket.category} · {ticket.customerName}</p>
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
          {ticket.notes.length>0&&(
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
        </div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({title,count,color,icon:Icon}:{title:string;count:number;color:string;icon:React.ElementType}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px",marginTop:"4px"}}>
      <div style={{width:"32px",height:"32px",borderRadius:"10px",backgroundColor:color+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon size={16} color={color}/></div>
      <div>
        <h2 style={{fontSize:"15px",fontWeight:800,color:ink,fontFamily:inter,margin:0}}>{title}</h2>
        <p style={{fontSize:"11px",color:inkMut,fontFamily:inter,margin:0}}>{count} item{count!==1?"s":""}</p>
      </div>
    </div>
  );
}

// ─── Summary Pill Row ─────────────────────────────────────────────────────────
function SummaryPills({items}:{items:{label:string;value:number;color:string;bg:string}[]}){
  return(
    <div style={{display:"flex",gap:"6px",marginBottom:"14px",overflowX:"auto",paddingBottom:"4px"}}>
      {items.map(x=>(
        <div key={x.label} style={{flexShrink:0,padding:"6px 12px",borderRadius:"100px",backgroundColor:x.bg,border:`1px solid ${x.color}30`,display:"flex",alignItems:"center",gap:"5px"}}>
          <span style={{fontSize:"13px",fontWeight:800,color:x.color,fontFamily:inter}}>{x.value}</span>
          <span style={{fontSize:"11px",fontWeight:600,color:x.color,fontFamily:inter}}>{x.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Activity Page ───────────────────────────────────────────────────────
export default function VendorActivityPage(){
  const navigate=useNavigate();
  const{
    tickets,pendingReviewTickets,finalizedTickets,
    reassignmentEvents,reassignmentSummary,
    approveForAssignment,modifyAndApprove,rejectTicket,
    approveReassignment,rejectReassignment,
    activity,markAllActivityRead,
  }=useVendor();

  const[activeTab,setActiveTab]=useState<"review"|"finalized"|"reassignment"|"timeline">("review");
  const[selectedTicket,setSelectedTicket]=useState<VendorTicket|null>(null);
  const[modifyTicket,setModifyTicket]=useState<VendorTicket|null>(null);
  const[rejectTicketState,setRejectTicketState]=useState<VendorTicket|null>(null);
  const[detailTicket,setDetailTicket]=useState<VendorTicket|null>(null);
  const[successMsg,setSuccessMsg]=useState("");

  const flash=(msg:string)=>{setSuccessMsg(msg);setTimeout(()=>setSuccessMsg(""),3500);};

  const handleApprove=(t:VendorTicket)=>{approveForAssignment(t.id);flash("Ticket approved. Assign a technician.");};
  const handleModifySubmit=(priority:Priority,category:string,notes:string)=>{if(!modifyTicket)return;modifyAndApprove(modifyTicket.id,priority,category,notes);setModifyTicket(null);flash("Ticket modified and approved.");};
  const handleRejectSubmit=(reason:string,notes:string)=>{if(!rejectTicketState)return;rejectTicket(rejectTicketState.id,reason,notes);setRejectTicketState(null);flash("Ticket rejected and logged.");};

  // summary
  const reviewSummary=[
    {label:"Pending",value:pendingReviewTickets.length,color:amber,bg:amberT},
  ];
  const finalSummary=[
    {label:"Completed",value:finalizedTickets.filter(t=>t.status==="Completed"||t.status==="Closed").length,color:green,bg:greenT},
    {label:"Rejected",value:finalizedTickets.filter(t=>t.status==="Rejected").length,color:red,bg:redT},
  ];
  const reassignSummary=[
    {label:"Requested",value:reassignmentSummary.byStatus.requested,color:amber,bg:amberT},
    {label:"Completed",value:reassignmentSummary.byStatus.completed,color:green,bg:greenT},
    {label:"Rejected",value:reassignmentSummary.byStatus.rejected,color:red,bg:redT},
  ];

  const tabs=[
    {key:"review",label:"HITL Queue",badge:pendingReviewTickets.length,badgeColor:amber},
    {key:"finalized",label:"Finalized",badge:0,badgeColor:""},
    {key:"reassignment",label:"Reassignment",badge:reassignmentSummary.byStatus.requested,badgeColor:amber},
    {key:"timeline",label:"Timeline",badge:0,badgeColor:""},
  ] as const;

  return(
    <MobileLayout bottomNav={<VendorBottomNavigation/>} backgroundColor={bg} header={
      <div style={{ backgroundColor: blue, paddingTop: "44px", paddingBottom: "16px", paddingLeft: "20px", paddingRight: "20px", position: "sticky", top: 0, zIndex: 10 }}>
        <button
          type="button"
          onClick={() => navigate("/vendor/dashboard")}
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer",
            fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter,
            marginBottom: "16px"
          }}
        >
          <ArrowLeft size={15} color="white" /> Back
        </button>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
          <div>
            <p style={{fontSize: "12.5px", color: "rgba(255,255,255,0.8)", fontFamily: inter, margin: "0 0 2px", fontWeight: 500}}>Activity &amp; Review</p>
            <h1 style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color:"white",margin:0 }}>Operations Feed</h1>
          </div>
          {pendingReviewTickets.length>0&&(
            <div style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 12px",borderRadius:"100px",backgroundColor:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)"}}>
              <AlertTriangle size={14} color="white"/>
              <span style={{fontSize:"12px",fontWeight:700,color:"white",fontFamily:inter}}>{pendingReviewTickets.length} Pending</span>
            </div>
          )}
        </div>
      </div>
    }>
      <div style={{ padding: "16px 0 0" }}>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none", padding: "0 20px 16px" }}>
          {tabs.map(tab=>(
            <button key={tab.key} type="button" onClick={()=>setActiveTab(tab.key as any)}
              style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: activeTab === tab.key ? blue : card, border: `1px solid ${activeTab === tab.key ? blue : border}`, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: activeTab === tab.key ? `0 4px 12px ${blue}40` : "none", flexShrink: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: activeTab === tab.key ? "white" : inkSec, fontFamily: inter }}>{tab.label}</span>
              {tab.badge>0&&<div style={{ padding: "2px 6px", borderRadius: "10px", backgroundColor: activeTab === tab.key ? "rgba(255,255,255,0.2)" : divider, fontSize: "10px", fontWeight: 700, color: activeTab === tab.key ? "white" : inkMut, fontFamily: inter }}>{tab.badge}</div>}
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:"0 20px 20px"}}>
        {successMsg&&(
          <div style={{backgroundColor:greenT,border:`1px solid ${green}40`,borderRadius:"12px",padding:"12px 16px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"8px"}}>
            <CheckCircle2 size={16} color={green}/>
            <span style={{fontSize:"13px",fontWeight:600,color:green,fontFamily:inter}}>{successMsg}</span>
          </div>
        )}

        {/* ── HITL Queue Tab ── */}
        {activeTab==="review"&&(
          <>
            <SectionHeader title="Pending Human Review" count={pendingReviewTickets.length} color={amber} icon={AlertTriangle}/>
            <SummaryPills items={reviewSummary}/>
            {pendingReviewTickets.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",backgroundColor:card,borderRadius:"16px",border:`1px solid ${border}`}}>
                <CheckCircle2 size={32} color={green} style={{marginBottom:"12px"}}/>
                <h3 style={{fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em",color:ink,fontFamily:inter,margin:"0 0 6px"}}>All Clear!</h3>
                <p style={{fontSize:"13px",color:inkSec,fontFamily:inter,margin:0}}>No pending HITL reviews right now.</p>
              </div>
            ):(
              pendingReviewTickets.map(t=>(
                <PendingReviewCard key={t.id} ticket={t}
                  onApprove={()=>handleApprove(t)}
                  onModify={()=>setModifyTicket(t)}
                  onReject={()=>setRejectTicketState(t)}
                  onView={()=>setDetailTicket(t)}/>
              ))
            )}
          </>
        )}

        {/* ── Finalized Tab ── */}
        {activeTab==="finalized"&&(
          <>
            <SectionHeader title="Finalized Requests" count={finalizedTickets.length} color={green} icon={CheckCircle2}/>
            <SummaryPills items={finalSummary}/>
            {finalizedTickets.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",backgroundColor:card,borderRadius:"16px",border:`1px solid ${border}`}}>
                <ClipboardList size={32} color={inkFaint} style={{marginBottom:"12px"}}/>
                <p style={{fontSize:"13px",color:inkSec,fontFamily:inter,margin:0}}>No finalized requests yet.</p>
              </div>
            ):(
              finalizedTickets.map(t=><FinalizedCard key={t.id} ticket={t} onView={()=>setDetailTicket(t)}/>)
            )}
          </>
        )}

        {/* ── Reassignment Tab ── */}
        {activeTab==="reassignment"&&(
          <>
            <SectionHeader title="Reassignment Activity" count={reassignmentSummary.totalEvents} color={teal} icon={RefreshCw}/>
            <SummaryPills items={reassignSummary}/>
            {/* summary cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"16px"}}>
              {[{label:"Total",value:reassignmentSummary.totalEvents,color:blue,tint:blueTint},{label:"Completed",value:reassignmentSummary.byStatus.completed,color:green,tint:greenT},{label:"Requested",value:reassignmentSummary.byStatus.requested,color:amber,tint:amberT}].map(x=>(
                <div key={x.label} style={{backgroundColor:card,borderRadius:"12px",border:`1px solid ${border}`,padding:"10px 12px",boxShadow:cardShadow}}>
                  <div style={{width:"24px",height:"24px",borderRadius:"6px",backgroundColor:x.tint,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"6px"}}><RefreshCw size={12} color={x.color}/></div>
                  <p style={{fontSize:"18px",fontWeight:800,color:ink,margin:"0 0 2px",fontFamily:inter}}>{x.value}</p>
                  <p style={{fontSize:"10px",fontWeight:700,color:inkMut,textTransform:"uppercase",margin:0,fontFamily:inter}}>{x.label}</p>
                </div>
              ))}
            </div>
            {reassignmentEvents.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",backgroundColor:card,borderRadius:"16px",border:`1px solid ${border}`}}>
                <RefreshCw size={32} color={inkFaint} style={{marginBottom:"12px"}}/>
                <p style={{fontSize:"13px",color:inkSec,fontFamily:inter,margin:0}}>No reassignment events yet.</p>
              </div>
            ):(
              reassignmentEvents.map(e=><ReassignmentCard key={e.id} event={e} onApprove={()=>approveReassignment(e.id)} onReject={()=>rejectReassignment(e.id)} onView={() => { const t = tickets.find(x => x.id === e.requestId); if (t) setDetailTicket(t); }}/>)
            )}
          </>
        )}

        {/* ── Timeline Tab ── */}
        {activeTab==="timeline"&&(
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
              <SectionHeader title="Activity Timeline" count={activity.length} color={blue} icon={Activity}/>
              <button type="button" onClick={()=>markAllActivityRead()} style={{padding:"4px 12px",borderRadius:"8px",border:`1px solid ${border}`,backgroundColor:card,fontSize:"11px",fontWeight:700,color:blue,fontFamily:inter,cursor:"pointer"}}>Mark All Read</button>
            </div>
            {activity.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",backgroundColor:card,borderRadius:"16px",border:`1px solid ${border}`}}>
                <Activity size={32} color={inkFaint} style={{marginBottom:"12px"}}/>
                <p style={{fontSize:"13px",color:inkSec,fontFamily:inter,margin:0}}>No activity yet.</p>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {activity.map(a=>{
                  const typeColors:Record<string,{color:string;bg:string;icon:React.ElementType}>={
                    ticket_assigned:{color:blue,bg:blueTint,icon:User},
                    ticket_reviewed:{color:green,bg:greenT,icon:CheckCircle2},
                    ticket_rejected:{color:red,bg:redT,icon:XCircle},
                    ticket_resolved:{color:green,bg:greenT,icon:CheckCircle2},
                    ticket_escalated:{color:amber,bg:amberT,icon:AlertTriangle},
                    work_order_created:{color:purple,bg:purpleT,icon:ClipboardList},
                  };
                  const meta=typeColors[a.type]||{color:inkMut,bg:divider,icon:Activity};
                  const Icon=meta.icon;
                  return(
                    <div key={a.id} style={{backgroundColor:a.read?card:blueTint,borderRadius:"12px",border:`1px solid ${a.read?border:blue+"30"}`,padding:"12px 14px",display:"flex",gap:"10px",alignItems:"flex-start"}}>
                      <div style={{width:"32px",height:"32px",borderRadius:"8px",backgroundColor:meta.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Icon size={15} color={meta.color}/>
                      </div>
                      <div style={{flex:1}}>
                        <p style={{fontSize:"13px",fontWeight:600,color:ink,margin:"0 0 4px",fontFamily:inter}}>{a.message}</p>
                        <span style={{fontSize:"10px",color:inkFaint,fontFamily:inter}}>{fmtDate(a.timestamp)}</span>
                      </div>
                      {!a.read&&<div style={{width:"8px",height:"8px",borderRadius:"4px",backgroundColor:blue,flexShrink:0,marginTop:"4px"}}/>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {modifyTicket&&<ModifySheet ticket={modifyTicket} onClose={()=>setModifyTicket(null)} onSubmit={handleModifySubmit}/>}
      {rejectTicketState&&<RejectSheet ticket={rejectTicketState} onClose={()=>setRejectTicketState(null)} onSubmit={handleRejectSubmit}/>}
      {detailTicket&&<DetailSheet ticket={detailTicket} onClose={()=>setDetailTicket(null)}/>}
    </MobileLayout>
  );
}
