import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { useVendor, PMTask } from "../../contexts/VendorContext";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import {
  Calendar, CheckCircle2, AlertTriangle, Clock, 
  Settings2, ChevronRight, User, Package, ShieldAlert
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

type FilterType = "All" | "New Requests" | "Planning" | "Active Field Work" | "Pending Review" | "Completed" | "Overdue";

function PMCard({ task, onClick }: { task: PMTask; onClick: () => void; }) {
  const statusMap: Record<string, { label: string; color: string; tint: string }> = {
    "Requested": { label: "Requested", color: blue, tint: blueTint },
    "Pending Review": { label: "Pending Review", color: amber, tint: amberT },
    "Approved": { label: "Approved", color: green, tint: greenT },
    "Planning": { label: "Planning", color: blue, tint: blueTint },
    "Work Order Created": { label: "WO Created", color: blue, tint: blueTint },
    "Technician Assigned": { label: "Assigned", color: blue, tint: blueTint },
    "Accepted": { label: "Tech Accepted", color: amber, tint: amberT },
    "Travelling": { label: "Travelling", color: amber, tint: amberT },
    "Arrived": { label: "Arrived", color: green, tint: greenT },
    "Maintenance Started": { label: "Started", color: green, tint: greenT },
    "Inspection": { label: "Inspection", color: amber, tint: amberT },
    "Checklist In Progress": { label: "In Progress", color: amber, tint: amberT },
    "Waiting Customer Confirmation": { label: "Waiting Conf", color: amber, tint: amberT },
    "Completed": { label: "Completed", color: green, tint: greenT },
    "Overdue": { label: "Overdue", color: red, tint: redT },
  };
  const sc = statusMap[task.status] || { label: task.status, color: inkMut, tint: divider };

  const getActionText = (status: string) => {
    switch (status) {
      case "Requested": return "Review Request";
      case "Pending Review": return "Continue Review";
      case "Approved": return "Start Planning";
      case "Planning": return "Generate Work Order";
      case "Work Order Created": return "Assign Technician";
      case "Waiting Customer Confirmation": return "View Service Report";
      case "Completed": return "View Details";
      case "Overdue": return "Address Overdue";
      default: return "Manage Task";
    }
  };

  return (
    <div onClick={onClick} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${task.status === "Overdue" ? red : border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: blue, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: inter }}>{task.customerName || "Unknown Client"}</div>
            <div style={{ padding: "2px 6px", borderRadius: "100px", backgroundColor: task.status === "Overdue" ? redT : amberT, fontSize: "9px", fontWeight: 700, color: task.status === "Overdue" ? red : amber, fontFamily: inter, textTransform: "uppercase" }}>
              {task.status === "Overdue" ? "High Priority" : "Medium Priority"}
            </div>
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter }}>{task.assetName}</h3>
          <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>PM Ref: {task.id}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "8px", backgroundColor: task.status === "Overdue" ? redT : sc.tint, border: `1px solid ${task.status === "Overdue" ? red : "transparent"}` }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: task.status === "Overdue" ? red : sc.color, fontFamily: inter }}>
            {sc.label}
          </span>
        </div>
      </div>
      
      <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
        <div style={{ flex: 1, backgroundColor: bg, borderRadius: "8px", padding: "10px", border: `1px solid ${border}` }}>
          <span style={{ fontSize: "10px", fontWeight: 600, color: inkMut, fontFamily: inter, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Generated</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: ink, fontFamily: inter }}>{new Date(Date.now() - 5 * 86400000).toLocaleDateString()}</span>
        </div>
        <div style={{ flex: 1, backgroundColor: task.status === "Overdue" ? redT : bg, borderRadius: "8px", padding: "10px", border: `1px solid ${task.status === "Overdue" ? red : border}` }}>
          <span style={{ fontSize: "10px", fontWeight: 600, color: task.status === "Overdue" ? red : inkMut, fontFamily: inter, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Time Left</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: task.status === "Overdue" ? red : ink, fontFamily: inter }}>{task.status === "Overdue" ? "Overdue" : new Date(task.dueDate).toLocaleDateString()}</span>
        </div>
      </div>
      
      {task.aiRecommendation && (
        <div style={{ backgroundColor: "#F5F3FF", borderRadius: "8px", padding: "10px 12px", border: "1px solid #EDE9FE", display: "flex", gap: "8px", marginTop: "4px" }}>
          <div style={{ marginTop: "2px" }}>
            <ShieldAlert size={14} color="#7C3AED" />
          </div>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#7C3AED", fontFamily: inter, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>AI Insight</span>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "#5B21B6", fontFamily: inter, lineHeight: 1.3, display: "block" }}>
              {task.aiRecommendation}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: bg, borderRadius: "10px", border: `1px solid ${border}`, marginTop: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <User size={14} color={task.assignedTechnicianId ? inkSec : inkMut} />
          <span style={{ fontSize: "12px", color: task.assignedTechnicianId ? inkSec : inkMut, fontFamily: inter }}>
            {task.assignedTechnicianName || "Unassigned"}
          </span>
        </div>
        {task.workOrderId && (
          <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600 }}>
            {task.workOrderId}
          </div>
        )}
      </div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        style={{ width: "100%", height: "36px", borderRadius: "8px", backgroundColor: task.status === "Completed" ? divider : blueTint, color: task.status === "Completed" ? inkSec : blue, border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer", marginTop: "4px" }}>
        {getActionText(task.status)}
      </button>
    </div>
  );
}

export default function VendorMaintenance() {
  const navigate = useNavigate();
  const { pmTasks } = useVendor();

  const [filter, setFilter] = useState<FilterType>("New Requests");

  const filteredTasks = useMemo(() => {
    let res = pmTasks;
    if (filter !== "All") {
      res = res.filter(t => {
        if (filter === "New Requests") return t.status === "Requested" || t.status === "Pending Review";
        if (filter === "Planning") return ["Approved", "Planning", "Work Order Created", "Technician Assigned", "Rescheduled"].includes(t.status);
        if (filter === "Active Field Work") return ["Accepted", "Travelling", "Arrived", "Maintenance Started", "Inspection", "Checklist In Progress"].includes(t.status);
        if (filter === "Pending Review") return t.status === "Waiting Customer Confirmation";
        if (filter === "Completed") return ["Completed", "Cancelled", "Rejected"].includes(t.status);
        if (filter === "Overdue") return t.status === "Overdue";
        return true;
      });
    }
    
    // Sort logic
    res = [...res].sort((a, b) => {
      if (a.status === "Overdue" && b.status !== "Overdue") return -1;
      if (b.status === "Overdue" && a.status !== "Overdue") return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return res;
  }, [pmTasks, filter]);

  const stats = {
    total: pmTasks.length,
    newRequests: pmTasks.filter(t => t.status === "Requested" || t.status === "Pending Review").length,
    planning: pmTasks.filter(t => ["Approved", "Planning", "Work Order Created", "Technician Assigned", "Rescheduled"].includes(t.status)).length,
    active: pmTasks.filter(t => ["Accepted", "Travelling", "Arrived", "Maintenance Started", "Inspection", "Checklist In Progress"].includes(t.status)).length,
    review: pmTasks.filter(t => t.status === "Waiting Customer Confirmation").length,
    completed: pmTasks.filter(t => ["Completed", "Cancelled", "Rejected"].includes(t.status)).length,
    overdue: pmTasks.filter(t => t.status === "Overdue").length,
  };

  return (
    <MobileLayout bottomNav={<VendorBottomNavigation />} backgroundColor={bg} header={<BackHeader title="Preventive Maintenance" fallbackRoute="/vendor/dashboard" />}>
      <div style={{ backgroundColor: card, borderBottom: `1px solid ${border}`, padding: "16px 0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none", padding: "0 20px" }}>
          {[
            { label: "New Requests", count: stats.newRequests },
            { label: "Planning", count: stats.planning },
            { label: "Active Field Work", count: stats.active },
            { label: "Pending Review", count: stats.review },
            { label: "Completed", count: stats.completed },
            { label: "Overdue", count: stats.overdue },
            { label: "All", count: stats.total },
          ].map(f => (
            <button key={f.label} type="button" onClick={() => setFilter(f.label as FilterType)}
              style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: filter === f.label ? ink : bg, border: `1px solid ${filter === f.label ? ink : border}`, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: filter === f.label ? "white" : inkSec, fontFamily: inter }}>{f.label}</span>
              <div style={{ padding: "2px 6px", borderRadius: "10px", backgroundColor: filter === f.label ? "rgba(255,255,255,0.2)" : divider, fontSize: "10px", fontWeight: 700, color: filter === f.label ? "white" : inkMut, fontFamily: inter }}>
                {f.count}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px 20px" }}>
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <PMCard 
              key={task.id} 
              task={task} 
              onClick={() => navigate(`/vendor/maintenance/${task.id}`)}
            />
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "32px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Settings2 size={32} color={inkMut} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 8px" }}>No PM tasks found</h3>
            <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: 0 }}>Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
