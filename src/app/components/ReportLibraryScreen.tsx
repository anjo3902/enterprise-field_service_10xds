import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import { useReports, Report } from "../contexts/ReportsContext";
import { ReportCard } from "./ReportCard";
import { 
  ArrowLeft, Search, Filter, X, Download, FileText, Send, Info, Edit3, Trash2, 
  CheckCircle2, Sparkles, FileSpreadsheet, Star, ChevronDown, Archive, BarChart3
} from "lucide-react";

const blue="#2563EB"; const blueDark="#1D4ED8"; const blueTint="#EFF6FF";
const green="#16A34A"; const greenT="#DCFCE7";
const red="#DC2626"; const redT="#FEF2F2";
const orange="#EA580C"; const orangeT="#FFF7ED";
const ink="#0F172A"; const inkSec="#475569"; const inkMut="#64748B"; const inkFaint="#94A3B8";
const bg="#F8FAFC"; const card="#FFFFFF"; const border="#E2E8F0"; const divider="#F1F5F9";
const inter="'Inter','Roboto',sans-serif";

export function ReportLibraryScreen() {
  const navigate = useNavigate();
  const { reports, updateReport, deleteReport, exportReport } = useReports();
  
  const [q, setQ] = useState("");
  const [f, setF] = useState("All");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [toastMsg, setToastMsg] = useState<string|null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const [previewReport, setPreviewReport] = useState<Report|null>(null);
  const [actionReport, setActionReport] = useState<Report|null>(null);
  const [detailsReport, setDetailsReport] = useState<Report|null>(null);
  const [shareReport, setShareReport] = useState<Report|null>(null);
  const [renameReport, setRenameReport] = useState<Report|null>(null);
  const [renameInput, setRenameInput] = useState("");

  const filtered = reports.filter(r => {
    const qm = !q.trim() || r.name.toLowerCase().includes(q.toLowerCase());
    const fm = f === "All" || r.type === f || (f === "Operational" && r.type === "Operational");
    return qm && fm;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") {
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else if (sortBy === "size") {
      const sizeA = parseFloat(a.size);
      const sizeB = parseFloat(b.size);
      return sortAsc ? sizeA - sizeB : sizeB - sizeA;
    } else {
      return sortAsc ? a.id - b.id : b.id - a.id;
    }
  });

  const displayed = sorted.slice(0, page * ITEMS_PER_PAGE);

  const handleDownload = async (report: Report | null, format: "PDF" | "Excel" | "CSV" = "PDF") => {
    showToast(`Generating ${format}...`);
    await exportReport(report, format);
    showToast(`${format} exported successfully!`);
  };

  return (
    <MobileLayout
      header={
        <div style={{backgroundColor:"#0052CC",padding:"12px 20px 20px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px",marginTop:"12px"}}>
            <button type="button" onClick={() => handleBackNavigation(navigate, '/reports')} style={{width:"36px",height:"36px",borderRadius:"10px",backgroundColor:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><ArrowLeft size={18} color="white"/></button>
            <h1 style={{fontSize:"19px",fontWeight:800,color:"white",fontFamily:inter,margin:0,flex:1}}>Report Library</h1>
          </div>
          
          <div style={{height:"46px",borderRadius:"13px",backgroundColor:"white",display:"flex",alignItems:"center",gap:"10px",padding:"0 14px",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
            <Search size={16} color={inkFaint} style={{flexShrink:0}}/>
            <input type="text" placeholder="Search reports..." value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:"14px",color:ink,fontFamily:inter}}/>
            {q && <button type="button" onClick={()=>setQ("")} style={{width:"22px",height:"22px",borderRadius:"50%",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={12} color={inkMut}/></button>}
          </div>
        </div>
      }
      modals={
        <>
          {toastMsg && (
            <div style={{position:"absolute", bottom:"80px", left:"50%", transform:"translateX(-50%)", backgroundColor:ink, color:"white", padding:"12px 24px", borderRadius:"100px", fontSize:"13px", fontWeight:600, fontFamily:inter, zIndex:2000, boxShadow:"0 4px 12px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", gap:"8px", animation:"slideUp 0.3s ease"}}>
              <CheckCircle2 size={16} color={green}/>
              {toastMsg}
            </div>
          )}

          {actionReport && (
            <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setActionReport(null)}>
              <div style={{width:"100%",maxWidth:"480px",backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px 20px 30px",boxShadow:"0 -8px 32px rgba(0,0,0,0.12)"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",borderBottom:`1px solid ${divider}`,paddingBottom:"12px"}}>
                  <h3 style={{fontSize:"16px",fontWeight:800,color:ink,fontFamily:inter,maxWidth:"80%",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{actionReport.name}</h3>
                  <button type="button" onClick={()=>setActionReport(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={inkSec}/></button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  <button type="button" onClick={()=>{updateReport(actionReport.id, {favorite: !actionReport.favorite}); setActionReport(null); showToast(actionReport.favorite ? "Removed from favorites" : "Added to favorites");}} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",backgroundColor:bg,border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
                    <Star size={18} color={actionReport.favorite ? "#EAB308" : inkSec} fill={actionReport.favorite ? "#EAB308" : "none"}/> <span style={{fontSize:"14px",fontWeight:600,color:ink,fontFamily:inter,flex:1}}>{actionReport.favorite ? "Unfavorite" : "Favorite"}</span>
                  </button>
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
                  <button type="button" onClick={()=>{deleteReport(actionReport.id); setActionReport(null); showToast("Report deleted");}} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",backgroundColor:redT,border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
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
                <button type="button" onClick={() => { updateReport(renameReport.id, {name: renameInput.trim()}); setRenameReport(null); showToast("Report renamed"); }} style={{width:"100%",height:"44px",borderRadius:"12px",background:`linear-gradient(135deg,${blue},${blueDark})`,border:"none",color:"white",fontSize:"14px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  Save Changes
                </button>
              </div>
            </div>
          )}
          
          {/* ── PDF Preview Modal ── */}
          {previewReport && (
            <div style={{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.8)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",flexDirection:"column"}} onClick={()=>setPreviewReport(null)}>
              <div style={{height:"60px",backgroundColor:"#1E293B",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <button type="button" onClick={()=>setPreviewReport(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color="white"/></button>
                  <span style={{fontSize:"14px",fontWeight:600,color:"white",fontFamily:inter,maxWidth:"180px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{previewReport.name}.pdf</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <button type="button" onClick={()=>{setPreviewReport(null); setShareReport(previewReport);}} style={{background:"none",border:"none",cursor:"pointer"}}><Send size={18} color="white"/></button>
                  <button type="button" onClick={()=>{handleDownload(previewReport); setPreviewReport(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><Download size={18} color="white"/></button>
                </div>
              </div>
              <div style={{flex:1,padding:"20px",display:"flex",justifyContent:"center",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
                <div style={{width:"100%",maxWidth:"600px",backgroundColor:"white",borderRadius:"4px",padding:"30px 20px",boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:`2px solid ${ink}`,paddingBottom:"16px",marginBottom:"20px"}}>
                    <div>
                      <h1 style={{fontSize:"18px",fontWeight:800,color:ink,fontFamily:inter,marginBottom:"4px"}}>{previewReport.name}</h1>
                      <p style={{fontSize:"11px",color:inkSec,fontFamily:inter}}>{previewReport.generated}</p>
                    </div>
                    <div style={{width:"40px",height:"40px",backgroundColor:blue,borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center"}}><FileText size={20} color="white"/></div>
                  </div>
                  <p style={{fontSize:"11px",color:inkSec,fontFamily:inter,lineHeight:1.6,marginBottom:"20px"}}>
                    This is a mock PDF preview for the {previewReport.type} report.
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
                  <input type="text" placeholder="Enter email addresses..." style={{width:"100%",height:"44px",padding:"0 14px",backgroundColor:bg,borderRadius:"9px",border:`1px solid ${border}`,fontSize:"13px",color:ink,fontFamily:inter,outline:"none",boxSizing:"border-box"}}/>
                </div>
                <button type="button" onClick={()=>{showToast("Report sent successfully"); setShareReport(null);}} style={{width:"100%",height:"44px",borderRadius:"12px",background:`linear-gradient(135deg,${blue},${blueDark})`,border:"none",color:"white",fontSize:"14px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                  <Send size={16} /> Send Report
                </button>
              </div>
            </div>
          )}
        </>
      }
    >
      <div style={{padding:"16px 20px"}}>
        {/* Advanced Filters & Sorting */}
        <div style={{display:"flex",gap:"10px",marginBottom:"20px",overflowX:"auto",scrollbarWidth:"none",paddingBottom:"5px"}}>
          <select value={f} onChange={e=>setF(e.target.value)} style={{height:"36px",padding:"0 12px",backgroundColor:card,borderRadius:"100px",border:`1px solid ${border}`,fontSize:"13px",fontWeight:600,color:ink,fontFamily:inter,outline:"none",boxShadow:"0 1px 2px rgba(0,0,0,0.05)"}}>
            <option value="All">All Categories</option>
            <option value="Operational">Operational</option>
            <option value="Asset">Asset</option>
            <option value="SLA">SLA</option>
            <option value="Revenue">Revenue</option>
          </select>
          <div style={{display:"flex",alignItems:"center",backgroundColor:card,borderRadius:"100px",border:`1px solid ${border}`,padding:"0 6px",boxShadow:"0 1px 2px rgba(0,0,0,0.05)"}}>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} style={{height:"34px",padding:"0 6px",backgroundColor:"transparent",border:"none",fontSize:"13px",fontWeight:600,color:ink,fontFamily:inter,outline:"none"}}>
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
            <button type="button" onClick={()=>setSortAsc(!sortAsc)} style={{width:"26px",height:"26px",borderRadius:"50%",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",marginLeft:"4px"}}>
              <span style={{fontSize:"12px",fontWeight:700}}>{sortAsc ? "↑" : "↓"}</span>
            </button>
          </div>
        </div>

        {/* Report List */}
        {displayed.length === 0 ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:"60px",gap:"12px"}}>
            <div style={{width:"72px",height:"72px",borderRadius:"24px",backgroundColor:card,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(0,0,0,0.05)",border:`1px solid ${border}`}}><Archive size={32} color={inkFaint}/></div>
            <p style={{fontSize:"16px",fontWeight:700,color:ink,fontFamily:inter}}>No reports found</p>
            <p style={{fontSize:"13px",color:inkSec,fontFamily:inter,textAlign:"center"}}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          displayed.map(r => (
            <ReportCard 
              key={r.id} 
              report={r} 
              onPreview={() => setPreviewReport(r)} 
              onDownloadPDF={() => handleDownload(r)} 
              onOpenActions={() => setActionReport(r)} 
              onDetails={() => setDetailsReport(r)} 
            />
          ))
        )}

        {displayed.length < sorted.length && (
          <button 
            type="button" 
            onClick={() => setPage(p => p + 1)} 
            style={{width:"100%",height:"48px",borderRadius:"12px",backgroundColor:card,border:`1px solid ${border}`,color:blue,fontSize:"14px",fontWeight:700,fontFamily:inter,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.02)"}}
          >
            Load More ({sorted.length - displayed.length} remaining)
          </button>
        )}
      </div>
    </MobileLayout>
  );
}
