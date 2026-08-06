import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { useVendor } from "../../contexts/VendorContext";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import {
  Calendar, Clock, User, Package, CheckSquare, 
  Square, ShieldAlert, Building2, ChevronRight, 
  ClipboardCheck, HardHat, FileText, CheckCircle2,
  XCircle, Truck, MapPin, PlayCircle, Eye
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

export default function VendorMaintenanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pmTasks, customers, getAssetById, advancePMWorkflow, togglePMChecklistItem } = useVendor();

  const task = pmTasks.find(p => p.id === id);

  if (!task) {
    return (
      <MobileLayout bottomNav={<VendorBottomNavigation />} header={<BackHeader title="Task Details" fallbackRoute="/vendor/maintenance" />}>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <h2 style={{ fontSize: "18px", color: ink, fontFamily: inter }}>Task not found</h2>
          <button onClick={() => navigate("/vendor/maintenance")} style={{ marginTop: "16px", padding: "10px 20px", borderRadius: "8px", backgroundColor: blue, color: "white", border: "none", fontSize: "14px", fontWeight: 600, fontFamily: inter }}>Back to List</button>
        </div>
      </MobileLayout>
    );
  }

  const customer = customers.find(c => c.id === task.customerId);
  const asset = getAssetById(task.assetId);

  const getStatusColor = (status: string) => {
    if (["Completed", "Arrived", "Maintenance Started", "Approved"].includes(status)) return { color: green, tint: greenT };
    if (["Requested", "Planning", "Work Order Created", "Technician Assigned"].includes(status)) return { color: blue, tint: blueTint };
    if (["Overdue", "Rejected", "Missed", "Cancelled"].includes(status)) return { color: red, tint: redT };
    return { color: amber, tint: amberT };
  };

  const sc = getStatusColor(task.status);
  const allDone = task.checklist.length > 0 && task.checklist.every(c => c.done);

  const handleAdvance = (status: string, extra?: any) => {
    advancePMWorkflow(task.id, status, extra);
  };

  const renderTimeline = () => {
    if (!task.timeline || task.timeline.length === 0) return null;
    return (
      <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Activity Timeline</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
          <div style={{ position: "absolute", left: "9px", top: "10px", bottom: "10px", width: "2px", backgroundColor: divider, zIndex: 0 }} />
          {task.timeline.map((t, i) => {
            const isLast = i === task.timeline!.length - 1;
            const tsc = getStatusColor(t.status);
            return (
              <div key={i} style={{ display: "flex", gap: "12px", position: "relative", zIndex: 1 }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "10px", backgroundColor: tsc.tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px", border: `2px solid ${card}` }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: tsc.color }} />
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: isLast ? ink : inkSec, fontFamily: inter }}>{t.status}</div>
                  <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, marginTop: "2px" }}>
                    {new Date(t.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderChecklist = () => {
    if (!["Checklist In Progress", "Waiting Customer Confirmation", "Completed"].includes(task.status)) return null;
    return (
      <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>Maintenance Checklist</h3>
          <span style={{ fontSize: "12px", fontWeight: 600, color: allDone ? green : inkSec, fontFamily: inter }}>
            {task.checklist.filter(c => c.done).length} / {task.checklist.length}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {task.checklist.map((item) => (
            <div 
              key={item.id} 
              onClick={() => task.status === "Checklist In Progress" && togglePMChecklistItem(task.id, item.id)}
              style={{ 
                display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", 
                backgroundColor: bg, borderRadius: "12px", border: `1px solid ${border}`,
                cursor: task.status === "Checklist In Progress" ? "pointer" : "default"
              }}
            >
              {item.done ? (
                <CheckSquare size={20} color={blue} style={{ flexShrink: 0 }} />
              ) : (
                <Square size={20} color={inkMut} style={{ flexShrink: 0 }} />
              )}
              <span style={{ fontSize: "13px", color: item.done ? inkSec : ink, fontFamily: inter, textDecoration: item.done ? "line-through" : "none" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderActions = () => {
    switch (task.status) {
      case "Requested":
        return (
          <button onClick={() => handleAdvance("Pending Review")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Review Request
          </button>
        );
      case "Pending Review":
        return (
          <>
            <button onClick={() => handleAdvance("Rejected")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: bg, color: red, border: `1px solid ${red}30`, fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
              Reject
            </button>
            <button onClick={() => handleAdvance("Approved")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: green, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
              Approve
            </button>
          </>
        );
      case "Approved":
        return (
          <button onClick={() => handleAdvance("Planning")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Plan Maintenance
          </button>
        );
      case "Planning":
        return (
          <button onClick={() => handleAdvance("Work Order Created", { workOrderId: `WO-${Date.now().toString().slice(-4)}` })} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Generate Work Order
          </button>
        );
      case "Work Order Created":
        return (
          <button onClick={() => handleAdvance("Technician Assigned", { assignedTechnicianId: "TEC-01", assignedTechnicianName: "Ahmed Hassan" })} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Assign Technician (Mock)
          </button>
        );
      case "Technician Assigned":
        return (
          <button onClick={() => handleAdvance("Accepted")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Simulate Tech Accept
          </button>
        );
      case "Accepted":
        return (
          <button onClick={() => handleAdvance("Travelling")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Simulate Tech Travel
          </button>
        );
      case "Travelling":
        return (
          <button onClick={() => handleAdvance("Arrived")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Arrive On Site
          </button>
        );
      case "Arrived":
        return (
          <button onClick={() => handleAdvance("Maintenance Started")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Start Maintenance
          </button>
        );
      case "Maintenance Started":
        return (
          <button onClick={() => handleAdvance("Inspection")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Begin Inspection
          </button>
        );
      case "Inspection":
        return (
          <button onClick={() => handleAdvance("Checklist In Progress")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Start Checklist
          </button>
        );
      case "Checklist In Progress":
        return (
          <button 
            disabled={!allDone}
            onClick={() => handleAdvance("Waiting Customer Confirmation")} 
            style={{ 
              flex: 1, height: "48px", borderRadius: "12px", backgroundColor: allDone ? green : divider, color: allDone ? "white" : inkMut, border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: allDone ? "pointer" : "not-allowed"
            }}>
            Generate Service Report
          </button>
        );
      case "Waiting Customer Confirmation":
        return (
          <button onClick={() => handleAdvance("Completed")} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: green, color: "white", border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            Simulate Customer Accept
          </button>
        );
      case "Completed":
        return (
          <button disabled style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: divider, color: inkSec, border: "none", fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "not-allowed" }}>
            Maintenance Complete
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <MobileLayout backgroundColor={bg} header={<BackHeader title={`Task ${task.id}`} fallbackRoute="/vendor/maintenance" />}>
      <div style={{ padding: "16px" }}>
        
        {/* ── Header Card ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: sc.tint, fontSize: "11px", fontWeight: 800, color: sc.color, fontFamily: inter, textTransform: "uppercase" }}>
              {task.status.replace(/_/g, " ")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: task.status === "Overdue" ? red : inkSec, fontFamily: inter }}>
              <Calendar size={14} /> {new Date(task.dueDate).toLocaleDateString()}
            </div>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: inter, color: ink, margin: "0 0 8px" }}>{task.type}</h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${divider}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: inkSec, fontFamily: inter }}>
              <Clock size={16} color={inkMut} /> {task.estimatedHrs}h est.
            </div>
            <div style={{ width: "1px", height: "16px", backgroundColor: divider }} />
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: inkSec, fontFamily: inter }}>
              <CheckSquare size={16} color={inkMut} /> {task.checklist.filter(c => c.done).length}/{task.checklist.length} tasks
            </div>
          </div>
        </div>

        {/* ── AI Recommendation ── */}
        {task.aiRecommendation && (
          <div style={{ backgroundColor: "#F5F3FF", borderRadius: "16px", padding: "16px", border: "1px solid #EDE9FE", marginBottom: "16px", display: "flex", gap: "12px" }}>
            <div style={{ marginTop: "2px" }}>
              <ShieldAlert size={20} color="#7C3AED" />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#7C3AED", fontFamily: inter, textTransform: "uppercase", display: "block", marginBottom: "4px" }}>AI Insight</span>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#5B21B6", fontFamily: inter, lineHeight: 1.4, display: "block" }}>
                {task.aiRecommendation}
              </span>
            </div>
          </div>
        )}

        {/* ── Details Card ── */}
        <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Details</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <Package size={16} color={inkMut} style={{ marginTop: "2px" }} />
              <div>
                <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Asset</div>
                <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>{task.assetName}</div>
                {asset && <div style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{asset.model}</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Building2 size={16} color={inkMut} style={{ marginTop: "2px" }} />
              <div>
                <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Customer</div>
                <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>{task.customerName}</div>
              </div>
            </div>
            {task.location && (
              <div style={{ display: "flex", gap: "10px" }}>
                <MapPin size={16} color={inkMut} style={{ marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Location</div>
                  <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>{task.location}</div>
                </div>
              </div>
            )}
            {task.contract && (
              <div style={{ display: "flex", gap: "10px" }}>
                <FileText size={16} color={inkMut} style={{ marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Contract</div>
                  <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>{task.contract}</div>
                </div>
              </div>
            )}
            {task.priority && (
              <div style={{ display: "flex", gap: "10px" }}>
                <ShieldAlert size={16} color={inkMut} style={{ marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Priority & Risk</div>
                  <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>
                    {task.priority} Priority {task.risk && `· ${task.risk} Risk`}
                  </div>
                </div>
              </div>
            )}
            {task.sla && (
              <div style={{ display: "flex", gap: "10px" }}>
                <Clock size={16} color={inkMut} style={{ marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>SLA</div>
                  <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>{task.sla}</div>
                </div>
              </div>
            )}
            {task.lastPM && (
              <div style={{ display: "flex", gap: "10px" }}>
                <Calendar size={16} color={inkMut} style={{ marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Maintenance Schedule</div>
                  <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>Last: {new Date(task.lastPM).toLocaleDateString()}</div>
                  {task.nextPM && <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>Next: {new Date(task.nextPM).toLocaleDateString()}</div>}
                </div>
              </div>
            )}
            {task.workOrderId && (
              <div style={{ display: "flex", gap: "10px" }}>
                <ClipboardCheck size={16} color={inkMut} style={{ marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Work Order</div>
                  <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>{task.workOrderId}</div>
                </div>
              </div>
            )}
            {task.assignedTechnicianId && (
              <div style={{ display: "flex", gap: "10px" }}>
                <HardHat size={16} color={inkMut} style={{ marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, textTransform: "uppercase" }}>Assigned To</div>
                  <div style={{ fontSize: "13px", color: ink, fontFamily: inter, fontWeight: 500 }}>{task.assignedTechnicianName}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {renderChecklist()}

        {/* ── Action Buttons (Scrollable) ── */}
        <div style={{ marginTop: "20px", marginBottom: "20px", display: "flex", gap: "12px" }}>
          {renderActions()}
        </div>

        {renderTimeline()}
      </div>
    </MobileLayout>
  );
}
