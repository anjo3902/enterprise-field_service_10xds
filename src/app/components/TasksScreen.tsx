import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Search, Filter, CalendarClock, User, CheckCircle2, Clock, AlertTriangle, ChevronRight, LayoutList } from "lucide-react";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import { BackHeader } from "./navigation/BackHeader";

const inter = '"Inter", sans-serif';

const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#F1F5F9";
const ink = "#0F172A";
const inkSec = "#334155";
const inkMut = "#64748B";
const inkFaint = "#94A3B8";

const blue = "#2563EB";
const blueTint = "#EFF6FF";
const red = "#EF4444";
const redT = "#FEF2F2";
const amber = "#F59E0B";
const amberT = "#FFFBEB";
const green = "#10B981";
const greenT = "#ECFDF5";
const purple = "#8B5CF6";

// Mock Data
const MOCK_TASKS = [
  { id: "T1", title: "Quarterly HVAC Maintenance", assignee: "Rahul Sharma", deadline: "Today, 02:00 PM", progress: 80, tag: "Maintenance", status: "In Progress", priority: "High" },
  { id: "T2", title: "Server Rack Rewiring", assignee: "John David", deadline: "Today, 04:30 PM", progress: 20, tag: "Infrastructure", status: "Pending", priority: "Medium" },
  { id: "T3", title: "Generator Fuel Check", assignee: "Priya Nair", deadline: "Tomorrow, 09:00 AM", progress: 0, tag: "Inspection", status: "Pending", priority: "Low" },
  { id: "T4", title: "Security Audit - Zone C", assignee: "Mike Smith", deadline: "Tomorrow, 11:30 AM", progress: 0, tag: "Security", status: "Pending", priority: "Critical" },
  { id: "T5", title: "Water Pump Calibration", assignee: "Ali Khan", deadline: "28 Jun, 10:00 AM", progress: 100, tag: "Plumbing", status: "Completed", priority: "Medium" },
  { id: "T6", title: "CCTV Firmware Update", assignee: "Sarah Connor", deadline: "29 Jun, 03:00 PM", progress: 100, tag: "IT", status: "Completed", priority: "Low" },
];

export function TasksScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"Today" | "Tomorrow" | "This Week" | "Completed">("Today");

  const filterTasks = () => {
    switch (activeTab) {
      case "Today": return MOCK_TASKS.filter(t => t.deadline.startsWith("Today"));
      case "Tomorrow": return MOCK_TASKS.filter(t => t.deadline.startsWith("Tomorrow"));
      case "This Week": return MOCK_TASKS.filter(t => !t.deadline.startsWith("Today") && !t.deadline.startsWith("Tomorrow") && t.status !== "Completed");
      case "Completed": return MOCK_TASKS.filter(t => t.status === "Completed");
    }
  };

  const tasks = filterTasks();

  return (
    <MobileLayout
      header={
        <BackHeader 
          title="Upcoming Tasks" 
          fallbackRoute="/dashboard" 
        />
      }
    >
      <div style={{ minHeight: "100vh", backgroundColor: bg, paddingBottom: "100px" }}>
        
        {/* Header Stats */}
        <div style={{ backgroundColor: blue, padding: "20px", color: "white" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, fontFamily: inter, marginBottom: "16px" }}>Task Overview</h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <Clock size={14} color="rgba(255,255,255,0.8)" />
                <span style={{ fontSize: "12px", fontFamily: inter, color: "rgba(255,255,255,0.8)" }}>Pending</span>
              </div>
              <p style={{ fontSize: "20px", fontWeight: 700, fontFamily: inter }}>4</p>
            </div>
            <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <CheckCircle2 size={14} color="rgba(255,255,255,0.8)" />
                <span style={{ fontSize: "12px", fontFamily: inter, color: "rgba(255,255,255,0.8)" }}>Completed</span>
              </div>
              <p style={{ fontSize: "20px", fontWeight: 700, fontFamily: inter }}>12</p>
            </div>
            <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <LayoutList size={14} color="rgba(255,255,255,0.8)" />
                <span style={{ fontSize: "12px", fontFamily: inter, color: "rgba(255,255,255,0.8)" }}>Total</span>
              </div>
              <p style={{ fontSize: "20px", fontWeight: 700, fontFamily: inter }}>16</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", overflowX: "auto", padding: "16px 20px", gap: "10px", scrollbarWidth: "none" }}>
          {(["Today", "Tomorrow", "This Week", "Completed"] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{
              padding: "8px 16px", borderRadius: "100px", cursor: "pointer",
              backgroundColor: activeTab === tab ? blue : card,
              color: activeTab === tab ? "white" : inkSec,
              fontSize: "13px", fontWeight: 600, fontFamily: inter,
              boxShadow: activeTab === tab ? `0 4px 12px ${blue}40` : "0 1px 2px rgba(0,0,0,0.05)",
              border: activeTab === tab ? "none" : `1px solid ${border}`,
              whiteSpace: "nowrap"
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div style={{ padding: "0 20px" }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: inkMut, fontFamily: inter, fontSize: "14px" }}>
              No tasks found for {activeTab.toLowerCase()}.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {tasks.map(task => {
                const barColor = task.progress > 70 ? green : task.progress > 35 ? blue : amber;
                
                return (
                  <div key={task.id} style={{
                    backgroundColor: card, borderRadius: "16px", padding: "16px",
                    border: `1px solid ${border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: ink, lineHeight: 1.3, fontFamily: inter }}>{task.title}</p>
                      <span style={{ fontSize: "10px", fontWeight: 600, color: blue, backgroundColor: blueTint, borderRadius: "100px", padding: "3px 8px", flexShrink: 0, fontFamily: inter }}>{task.tag}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: `linear-gradient(140deg, ${purple}, #9F7AEA)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <User size={10} color="white" />
                        </div>
                        <span style={{ fontSize: "12px", color: inkSec, fontFamily: inter, fontWeight: 500 }}>{task.assignee}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <CalendarClock size={12} color={inkFaint} />
                        <span style={{ fontSize: "12px", color: inkFaint, fontFamily: inter }}>{task.deadline}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>Priority: <span style={{ fontWeight: 600, color: task.priority === "Critical" ? red : task.priority === "High" ? amber : blue }}>{task.priority}</span></span>
                      <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: border }} />
                      <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>Status: <span style={{ fontWeight: 600, color: inkSec }}>{task.status}</span></span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ flex: 1, height: "6px", borderRadius: "3px", backgroundColor: border, overflow: "hidden" }}>
                        <div style={{ width: `${task.progress}%`, height: "100%", backgroundColor: barColor, borderRadius: "3px", transition: "width 0.5s ease" }} />
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: inkSec, width: "32px", textAlign: "right", fontFamily: inter, fontVariantNumeric: "tabular-nums" }}>{task.progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
