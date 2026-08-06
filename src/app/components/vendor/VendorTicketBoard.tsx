import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor, VendorTicket, Priority } from "../../contexts/VendorContext";
import { slaCardDisplay } from "../../utils/slaEngine";
import {
  Search, SlidersHorizontal, ChevronRight, ClipboardList,
  User, AlertTriangle, Clock, ArrowUpDown, X, Plus, ArrowLeft
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const orange   = "#EA580C";
const orangeT  = "#FFF7ED";
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

type FilterType = "Pending Review" | "All" | "Open" | "In Progress" | "Escalated" | "Completed" | "Breached" | "Unassigned";
type SortType = "Newest First" | "Oldest First" | "Priority" | "SLA Deadline" | "Customer Name";

const PRIORITY_COLORS: Record<Priority, { color: string; tint: string }> = {
  Critical: { color: red,    tint: redT    },
  High:     { color: orange, tint: orangeT },
  Medium:   { color: amber,  tint: amberT  },
  Low:      { color: green,  tint: greenT  },
};

const PRIORITY_ORDER: Record<Priority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// getSLARemaining removed — using unified slaEngine.slaCardDisplay

// ─── Ticket Card ──────────────────────────────────────────────────────────────
function VendorTicketCard({ ticket, onView }: { ticket: VendorTicket; onView: () => void }) {
  const prioColors = PRIORITY_COLORS[ticket.priority];
  const sla = slaCardDisplay(ticket.slaDeadline, ticket.slaStatus, ticket.status);

  return (
    <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter }}>{ticket.id}</span>
            <div style={{ padding: "2px 6px", borderRadius: "6px", backgroundColor: prioColors.tint, border: `1px solid ${prioColors.color}30`, fontSize: "10px", fontWeight: 700, color: prioColors.color, fontFamily: inter, textTransform: "uppercase" }}>
              {ticket.priority}
            </div>
            {!ticket.assignedTechnicianId && (
              <div style={{ padding: "2px 6px", borderRadius: "6px", backgroundColor: divider, border: `1px solid ${border}`, fontSize: "10px", fontWeight: 700, color: inkMut, fontFamily: inter, textTransform: "uppercase" }}>
                Unassigned
              </div>
            )}
          </div>
          <span style={{ fontSize: "12px", fontWeight: 600, color: blue, fontFamily: inter }}>{ticket.customerName}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: sla.isBreached ? redT : "transparent", padding: sla.isBreached ? "2px 6px" : 0, borderRadius: "6px" }}>
            <Clock size={12} color={sla.color} />
            <span style={{ fontSize: "11px", fontWeight: 600, color: sla.color, fontFamily: inter }}>{sla.text}</span>
          </div>
        </div>
      </div>

      <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: "0 0 12px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        <strong>Issue:</strong> {ticket.title}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "12px", backgroundColor: ticket.assignedTechnicianId ? blueTint : divider, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User size={12} color={ticket.assignedTechnicianId ? blue : inkMut} />
          </div>
          <span style={{ fontSize: "12px", color: ticket.assignedTechnicianId ? inkSec : inkMut, fontFamily: inter, fontWeight: 500 }}>
            {ticket.assignedTechnicianName || "No technician assigned"}
          </span>
        </div>
        <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>
          {formatDate(ticket.createdAt)}
        </span>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        {ticket.status === "Pending Review" ? (
          <button type="button" onClick={onView} style={{ flex: 1, height: "36px", borderRadius: "8px", backgroundColor: amber, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}>
            <ClipboardList size={14} color="white" />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "white", fontFamily: inter }}>Review Now</span>
          </button>
        ) : (
          <button type="button" onClick={onView} style={{ flex: 1, height: "36px", borderRadius: "8px", backgroundColor: blue, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}>
            <ClipboardList size={14} color="white" />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "white", fontFamily: inter }}>View Details</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Filter & Sort Modal ──────────────────────────────────────────────────────
function SortModal({ currentSort, onApply, onClose }: { currentSort: SortType; onApply: (s: SortType) => void; onClose: () => void }) {
  const options: SortType[] = ["Newest First", "Oldest First", "Priority", "SLA Deadline", "Customer Name"];
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.65)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "40px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>Sort By</h3>
          <button type="button" onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "100px", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} color={inkMut} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {options.map(opt => (
            <button key={opt} type="button" onClick={() => { onApply(opt); onClose(); }} style={{ padding: "16px", borderRadius: "12px", backgroundColor: currentSort === opt ? blueTint : bg, border: `1px solid ${currentSort === opt ? blue : border}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: "15px", fontWeight: 600, color: currentSort === opt ? blue : ink, fontFamily: inter }}>{opt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdvancedFilterModal({
  priority, setPriority,
  technician, setTechnician,
  date, setDate,
  onApply, onClose, onClear
}: any) {
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.65)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "40px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>Advanced Filters</h3>
          <button type="button" onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "100px", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} color={inkMut} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "24px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter, display: "block", marginBottom: "8px" }}>Priority</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["All", "Critical", "High", "Medium", "Low"].map(p => (
                <button key={p} onClick={() => setPriority(p)} style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: priority === p ? blueTint : bg, border: `1px solid ${priority === p ? blue : border}`, color: priority === p ? blue : ink, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>{p}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter, display: "block", marginBottom: "8px" }}>Technician Assignment</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["All", "Assigned", "Unassigned"].map(t => (
                <button key={t} onClick={() => setTechnician(t)} style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: technician === t ? blueTint : bg, border: `1px solid ${technician === t ? blue : border}`, color: technician === t ? blue : ink, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter, display: "block", marginBottom: "8px" }}>Date Created</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["All Time", "Today", "Last 7 Days", "Last 30 Days"].map(d => (
                <button key={d} onClick={() => setDate(d)} style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: date === d ? blueTint : bg, border: `1px solid ${date === d ? blue : border}`, color: date === d ? blue : ink, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>{d}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onClear} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: "transparent", border: `1px solid ${border}`, color: inkSec, fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Clear All</button>
          <button onClick={onApply} style={{ flex: 1, height: "48px", borderRadius: "12px", backgroundColor: blue, border: "none", color: "white", fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Apply Filters</button>
        </div>
      </div>
    </div>
  );
}

export default function VendorTicketBoard() {
  const navigate = useNavigate();
  const { tickets, pendingReviewTickets } = useVendor();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>(pendingReviewTickets.length > 0 ? "Pending Review" : "All");
  const [sort, setSort] = useState<SortType>("SLA Deadline");
  const [showSort, setShowSort] = useState(false);
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advPriority, setAdvPriority] = useState("All");
  const [advTechnician, setAdvTechnician] = useState("All");
  const [advDate, setAdvDate] = useState("All Time");

  const filters: { label: FilterType; count: number }[] = [
    { label: "Pending Review", count: pendingReviewTickets.length },
    { label: "All", count: tickets.filter(t => t.status !== "Pending Review").length },
    { label: "Open", count: tickets.filter(t => t.status === "Approved" || t.status === "Assigned" || t.status === "Technician Accepted").length },
    { label: "In Progress", count: tickets.filter(t => t.status === "In Progress" || t.status === "Work Order Generated").length },
    { label: "Escalated", count: tickets.filter(t => t.status === "Escalated").length },
    { label: "Completed", count: tickets.filter(t => t.status === "Completed" || t.status === "Closed").length },
    { label: "Breached", count: tickets.filter(t => t.slaStatus === "breached" && t.status !== "Completed" && t.status !== "Closed").length },
    { label: "Unassigned", count: tickets.filter(t => !t.assignedTechnicianId && t.status === "Approved").length },
  ];

  const filteredTickets = useMemo(() => {
    let result = tickets;

    // Apply Tab Filter
    if (filter === "Pending Review") result = result.filter(t => t.status === "Pending Review");
    else if (filter === "All") result = result.filter(t => t.status !== "Pending Review");
    else if (filter === "Open") result = result.filter(t => t.status === "Approved" || t.status === "Assigned" || t.status === "Technician Accepted");
    else if (filter === "In Progress") result = result.filter(t => t.status === "In Progress" || t.status === "Work Order Generated");
    else if (filter === "Escalated") result = result.filter(t => t.status === "Escalated");
    else if (filter === "Completed") result = result.filter(t => t.status === "Completed" || t.status === "Closed");
    else if (filter === "Breached") result = result.filter(t => t.slaStatus === "breached" && t.status !== "Completed" && t.status !== "Closed");
    else if (filter === "Unassigned") result = result.filter(t => !t.assignedTechnicianId && t.status === "Approved");

    // Apply Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => 
        t.id.toLowerCase().includes(q) || 
        t.customerName.toLowerCase().includes(q) || 
        t.location.toLowerCase().includes(q) || 
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    // Apply Advanced Filters
    if (advPriority !== "All") result = result.filter(t => t.priority === advPriority);
    if (advTechnician === "Assigned") result = result.filter(t => !!t.assignedTechnicianId);
    if (advTechnician === "Unassigned") result = result.filter(t => !t.assignedTechnicianId);
    
    if (advDate !== "All Time") {
      const now = new Date();
      result = result.filter(t => {
        const d = new Date(t.createdAt);
        if (advDate === "Today") return d.toDateString() === now.toDateString();
        if (advDate === "Last 7 Days") return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        if (advDate === "Last 30 Days") return (now.getTime() - d.getTime()) <= 30 * 24 * 60 * 60 * 1000;
        return true;
      });
    }

    // Apply Sort
    result.sort((a, b) => {
      if (sort === "Newest First") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "Oldest First") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "Priority") return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (sort === "SLA Deadline") return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
      if (sort === "Customer Name") return a.customerName.localeCompare(b.customerName);
      return 0;
    });

    return result;
  }, [tickets, filter, search, sort, advPriority, advTechnician, advDate]);

  return (
    <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />}>
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
        <h1 style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: "white", margin: "0 0 16px" }}>
          Ticket Board
        </h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ flex: 1, height: "44px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", padding: "0 14px", gap: "10px" }}>
            <Search size={18} color="white" />
            <input 
              type="text" 
              placeholder="Search ID, customer, fault..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", fontSize: "14px", color: "white", outline: "none", fontFamily: inter }}
              className="placeholder-white-50"
            />
            {search && <X size={16} color="white" style={{ cursor: "pointer" }} onClick={() => setSearch("")} />}
          </div>
          <button type="button" onClick={() => setShowAdvancedFilters(true)} style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: cardShadow, position: "relative" }}>
            <SlidersHorizontal size={18} color={blue} />
            {(advPriority !== "All" || advTechnician !== "All" || advDate !== "All Time") && (
              <div style={{ position: "absolute", top: "8px", right: "8px", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: red }} />
            )}
          </button>
          <button type="button" onClick={() => setShowSort(true)} style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: cardShadow }}>
            <ArrowUpDown size={18} color={blue} />
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 0 0" }}>
        {/* Horizontal Filter Chips */}
        <div style={{ display: "flex", overflowX: "auto", gap: "8px", padding: "0 20px 16px", scrollbarWidth: "none" }}>
          {filters.map(f => (
            <button key={f.label} type="button" onClick={() => setFilter(f.label)}
              style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: filter === f.label ? blue : card, border: `1px solid ${filter === f.label ? blue : border}`, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: filter === f.label ? `0 4px 12px ${blue}40` : "none" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: filter === f.label ? "white" : inkSec, fontFamily: inter }}>{f.label}</span>
              <div style={{ padding: "2px 6px", borderRadius: "10px", backgroundColor: filter === f.label ? "rgba(255,255,255,0.2)" : divider, fontSize: "10px", fontWeight: 700, color: filter === f.label ? "white" : inkMut, fontFamily: inter }}>
                {f.count}
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: "0 20px 20px" }}>
          {filteredTickets.length > 0 ? (
            filteredTickets.map(ticket => (
              <VendorTicketCard 
                key={ticket.id} 
                ticket={ticket} 
                onView={() => navigate(`/vendor/tickets/${ticket.id}`)}
              />
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "32px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <ClipboardList size={32} color={inkMut} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 8px" }}>No tickets found</h3>
              <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: 0 }}>Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {showSort && <SortModal currentSort={sort} onApply={setSort} onClose={() => setShowSort(false)} />}
      {showAdvancedFilters && (
        <AdvancedFilterModal
          priority={advPriority} setPriority={setAdvPriority}
          technician={advTechnician} setTechnician={setAdvTechnician}
          date={advDate} setDate={setAdvDate}
          onApply={() => setShowAdvancedFilters(false)}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => { setAdvPriority("All"); setAdvTechnician("All"); setAdvDate("All Time"); }}
        />
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .placeholder-white-50::placeholder { color: rgba(255,255,255,0.6); }
      `}} />
    </MobileLayout>
  );
}
