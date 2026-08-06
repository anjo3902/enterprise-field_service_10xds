import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Search, Filter, Key, CheckCircle2, AlertTriangle, Monitor, Smartphone, Globe, ShieldAlert, X } from "lucide-react";
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

// Mock Data
const MOCK_LOGS = [
  { id: "1", user: "John David", role: "Admin", action: "Logged In", time: "10 mins ago", date: "25 Jun 2026, 09:31 AM", device: "MacBook Pro", location: "Dubai, UAE", type: "SSO", status: "Success" },
  { id: "2", user: "Sarah Connor", role: "Technician", action: "Accessed Server Room", time: "1 hour ago", date: "25 Jun 2026, 08:42 AM", device: "iPhone 14", location: "On-site (Zone B)", type: "Biometric", status: "Success" },
  { id: "3", user: "System Update", role: "Automated", action: "Patch Applied", time: "2 hours ago", date: "25 Jun 2026, 07:15 AM", device: "System", location: "Cloud Server", type: "Automated", status: "Success" },
  { id: "4", user: "Unknown User", role: "Unknown", action: "Failed Login", time: "5 hours ago", date: "25 Jun 2026, 04:22 AM", device: "Windows PC", location: "Unknown IP", type: "Password", status: "Failed" },
  { id: "5", user: "Mike Smith", role: "Supervisor", action: "Exported Reports", time: "1 day ago", date: "24 Jun 2026, 02:15 PM", device: "iPad Pro", location: "Abu Dhabi, UAE", type: "Password", status: "Success" },
  { id: "6", user: "Alice Walker", role: "Technician", action: "Password Reset", time: "1 day ago", date: "24 Jun 2026, 11:05 AM", device: "Android Device", location: "Dubai, UAE", type: "Email Link", status: "Warning" },
];

export function SecurityAccessLogsScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  
  // Temp states for the modal
  const [tempStatusFilter, setTempStatusFilter] = useState("All");
  const [tempTypeFilter, setTempTypeFilter] = useState("All");

  const openFilter = () => {
    setTempStatusFilter(statusFilter);
    setTempTypeFilter(typeFilter);
    setIsFilterOpen(true);
  };

  const applyFilter = () => {
    setStatusFilter(tempStatusFilter);
    setTypeFilter(tempTypeFilter);
    setIsFilterOpen(false);
  };

  const resetFilter = () => {
    setStatusFilter("All");
    setTypeFilter("All");
    setTempStatusFilter("All");
    setTempTypeFilter("All");
    setIsFilterOpen(false);
  };

  const filteredLogs = MOCK_LOGS.filter(l => {
    const matchesSearch = !searchQuery || l.user.toLowerCase().includes(searchQuery.toLowerCase()) || l.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || l.status === statusFilter;
    const matchesType = typeFilter === "All" || l.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <MobileLayout
      header={
        <BackHeader 
          title="Access Logs" 
          subtitle="Review security events" 
          fallbackRoute="/security" 
        />
      }
    >
      <div style={{ padding: "20px", paddingBottom: "100px", minHeight: "100vh", backgroundColor: bg }}>
        
        {/* Search & Filter */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <div style={{
            flex: 1, height: "46px", borderRadius: "14px", backgroundColor: card,
            border: `1.5px solid ${border}`, display: "flex", alignItems: "center", padding: "0 14px", gap: "10px"
          }}>
            <Search size={18} color={inkFaint} />
            <input
              type="text"
              placeholder="Search users or actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "13.5px", color: ink, fontFamily: inter }}
            />
          </div>
          <button onClick={openFilter} style={{
            width: "46px", height: "46px", borderRadius: "14px", backgroundColor: (statusFilter !== "All" || typeFilter !== "All") ? blueTint : card,
            border: `1.5px solid ${(statusFilter !== "All" || typeFilter !== "All") ? `${blue}40` : border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            position: "relative"
          }}>
            <Filter size={18} color={(statusFilter !== "All" || typeFilter !== "All") ? blue : inkSec} />
            {(statusFilter !== "All" || typeFilter !== "All") && (
              <div style={{ position: "absolute", top: "10px", right: "10px", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: blue }} />
            )}
          </button>
        </div>

        {/* Logs List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredLogs.map((log) => {
            const isFailed = log.status === "Failed";
            const isWarning = log.status === "Warning";
            const StatusIcon = isFailed ? ShieldAlert : (isWarning ? AlertTriangle : CheckCircle2);
            const statusColor = isFailed ? red : (isWarning ? amber : green);
            const statusBg = isFailed ? redT : (isWarning ? amberT : greenT);

            const DeviceIcon = log.device.includes("Mac") || log.device.includes("Windows") || log.device.includes("System") ? Monitor : Smartphone;

            return (
              <div key={log.id} style={{
                backgroundColor: card, borderRadius: "16px", padding: "16px",
                border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: "12px"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "10px", backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Key size={18} color={inkMut} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "2px" }}>{log.user}</p>
                    <p style={{ fontSize: "12px", color: inkMut, fontFamily: inter }}>{log.action} • {log.role}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: statusBg, padding: "4px 8px", borderRadius: "6px" }}>
                    <StatusIcon size={12} color={statusColor} />
                    <span style={{ fontSize: "11px", fontWeight: 600, color: statusColor, fontFamily: inter }}>{log.status}</span>
                  </div>
                </div>

                <div style={{ height: "1px", backgroundColor: border }} />

                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Globe size={14} color={inkFaint} />
                    <span style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{log.location}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <DeviceIcon size={14} color={inkFaint} />
                    <span style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{log.device}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>Login Type: <span style={{ fontWeight: 600, color: inkSec }}>{log.type}</span></span>
                  <span style={{ fontSize: "11px", color: inkFaint, fontFamily: inter }}>{log.date}</span>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {isFilterOpen && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => setIsFilterOpen(false)}>
          <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px", animation: "slideUp 0.3s ease-out" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, margin: 0 }}>Filter Access Logs</h3>
              <button onClick={() => setIsFilterOpen(false)} style={{ background: "none", border: "none", display: "flex", cursor: "pointer" }}>
                <X size={20} color={inkMut} />
              </button>
            </div>

            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: inkSec, fontFamily: inter, marginBottom: "10px" }}>Status</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["All", "Success", "Failed", "Warning"].map(s => (
                  <button key={s} onClick={() => setTempStatusFilter(s)} style={{
                    padding: "8px 16px", borderRadius: "100px", cursor: "pointer",
                    backgroundColor: tempStatusFilter === s ? blue : card,
                    color: tempStatusFilter === s ? "white" : inkSec,
                    fontSize: "12.5px", fontWeight: 600, fontFamily: inter,
                    border: tempStatusFilter === s ? "none" : `1px solid ${border}`,
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: inkSec, fontFamily: inter, marginBottom: "10px" }}>Login Type</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["All", "SSO", "Biometric", "Password", "Automated"].map(t => (
                  <button key={t} onClick={() => setTempTypeFilter(t)} style={{
                    padding: "8px 16px", borderRadius: "100px", cursor: "pointer",
                    backgroundColor: tempTypeFilter === t ? blue : card,
                    color: tempTypeFilter === t ? "white" : inkSec,
                    fontSize: "12.5px", fontWeight: 600, fontFamily: inter,
                    border: tempTypeFilter === t ? "none" : `1px solid ${border}`,
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button type="button" onClick={resetFilter} style={{ flex: 1, height: "46px", borderRadius: "14px", background: card, border: `1.5px solid ${border}`, color: ink, fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>Reset</button>
              <button type="button" onClick={applyFilter} style={{ flex: 2, height: "46px", borderRadius: "14px", background: blue, border: "none", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.2)" }}>Apply Filters</button>
            </div>
          </div>
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </div>
      )}
    </MobileLayout>
  );
}
