import React from "react";
import { Clock, MoreHorizontal, Download } from "lucide-react";
import { Report } from "../contexts/ReportsContext";

const blue="#2563EB"; const blueTint="#EFF6FF";
const green="#16A34A"; const greenT="#DCFCE7";
const ink="#0F172A"; const inkSec="#475569"; const inkMut="#64748B"; const inkFaint="#94A3B8";
const bg="#F8FAFC"; const card="#FFFFFF"; const border="#E2E8F0"; const divider="#F1F5F9";
const inter="'Inter','Roboto',sans-serif";
const cardShadow="0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)";

export function ReportCard({
  report, 
  onPreview, 
  onDownloadPDF, 
  onOpenActions, 
  onDetails
}: {
  report: Report; 
  onPreview: () => void; 
  onDownloadPDF: () => void; 
  onOpenActions: () => void; 
  onDetails: () => void;
}) {
  return (
    <div onClick={onDetails} style={{backgroundColor:card,borderRadius:"16px",boxShadow:cardShadow,border:`1px solid ${border}`,marginBottom:"10px",overflow:"hidden",display:"flex",cursor:"pointer",position:"relative"}}>
      <div style={{width:"4px",backgroundColor:report.color,flexShrink:0}}/>
      {report.favorite && (
        <div style={{position:"absolute",top:0,right:0,width:"0",height:"0",borderTop:"24px solid #FDE047",borderLeft:"24px solid transparent"}}/>
      )}
      <div style={{flex:1,padding:"12px 13px 11px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:"10px",marginBottom:"8px"}}>
          <div style={{width:"38px",height:"38px",borderRadius:"11px",backgroundColor:report.tint,border:`1px solid ${report.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <report.icon size={18} color={report.color}/>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px",marginBottom:"2px"}}>
              <p style={{fontSize:"13px",fontWeight:700,color:ink,fontFamily:inter,lineHeight:1.3,flex:1}}>{report.name}</p>
              <button type="button" onClick={(e)=>{e.stopPropagation(); onOpenActions();}} style={{background:"none",border:"none",cursor:"pointer",padding:"0 0 0 10px",color:inkMut,zIndex:2}}>
                <MoreHorizontal size={16}/>
              </button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"4px"}}>
              <span style={{fontSize:"10px",fontWeight:600,color:report.color,backgroundColor:report.tint,borderRadius:"5px",padding:"1px 6px",fontFamily:inter}}>{report.type}</span>
              <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                <Clock size={10} color={inkFaint}/>
                <span style={{fontSize:"10.5px",color:inkFaint,fontFamily:inter}}>{report.generated}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:`1px solid ${divider}`,paddingTop:"9px"}}>
          <span style={{fontSize:"10.5px",color:inkFaint,fontFamily:inter}}>{report.size}</span>
          <div style={{display:"flex",gap:"6px"}}>
            <button type="button" onClick={(e)=>{e.stopPropagation(); onPreview();}} style={{height:"28px",borderRadius:"8px",padding:"0 10px",backgroundColor:divider,border:"none",color:inkSec,fontSize:"11px",fontWeight:600,fontFamily:inter,cursor:"pointer",zIndex:2}}>Preview</button>
            <button type="button" onClick={(e)=>{e.stopPropagation(); onDownloadPDF();}} style={{height:"28px",borderRadius:"8px",padding:"0 10px",backgroundColor:blueTint,border:`1px solid ${blue}25`,color:blue,fontSize:"11px",fontWeight:600,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",gap:"4px",zIndex:2}}><Download size={12}/>PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}
