import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor, VendorTechnician } from "../../contexts/VendorContext";
import {
  Users, Search, Filter, Phone, Mail, MapPin, 
  CheckCircle2, AlertTriangle, Clock, ChevronRight, X, ArrowLeft, Briefcase, Star
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



function TechnicianCard({ tech, onClick }: { tech: VendorTechnician; onClick: () => void }) {
  const statusColor = tech.availability === "available" ? green : tech.availability === "on_job" ? blue : red;
  const statusTint = tech.availability === "available" ? greenT : tech.availability === "on_job" ? blueTint : redT;
  const statusLabel = tech.availability.replace("_", " ").toUpperCase();

  return (
    <div onClick={onClick} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "24px", backgroundColor: tech.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "15.5px", fontWeight: 800, letterSpacing: "-0.02em", fontFamily: inter, position: "relative" }}>
            {tech.initials}
            <div style={{ position: "absolute", bottom: "0", right: "0", width: "12px", height: "12px", borderRadius: "50%", backgroundColor: statusColor, border: `2px solid ${card}` }} />
          </div>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: ink, margin: "0 0 2px", fontFamily: inter }}>{tech.name}</h3>
            <div style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>{tech.role}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <div style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: statusTint, fontSize: "10px", fontWeight: 800, color: statusColor, fontFamily: inter, letterSpacing: "0.02em" }}>
            {statusLabel}
          </div>
          {tech.availability === "on_job" && (
            <div style={{ fontSize: "10px", fontWeight: 600, color: inkMut, fontFamily: inter, display: "flex", alignItems: "center", gap: "3px" }}>
              <Clock size={10} /> ETA: 15m
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", padding: "12px", backgroundColor: bg, borderRadius: "12px", border: `1px solid ${border}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, marginBottom: "2px" }}>ACTIVE JOBS</div>
          <div style={{ fontSize: "16px", color: ink, fontFamily: inter, fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
            <Briefcase size={14} color={inkSec} /> {tech.activeJobCount}
          </div>
        </div>
        <div style={{ width: "1px", backgroundColor: divider }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, marginBottom: "2px" }}>SLA ADHERENCE</div>
          <div style={{ fontSize: "16px", color: ink, fontFamily: inter, fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={14} color={inkSec} /> {tech.slaAdherence}%
          </div>
        </div>
        <div style={{ width: "1px", backgroundColor: divider }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600, marginBottom: "2px" }}>RATING</div>
          <div style={{ fontSize: "16px", color: ink, fontFamily: inter, fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
            <Star size={14} color={amber} fill={amber} /> {tech.rating.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VendorTechnicianList() {
  const navigate = useNavigate();
  const { technicians } = useVendor();

  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get("filter") || "All";

  const setFilter = (val: string) => {
    setSearchParams(prev => {
      if (val && val !== "All") prev.set("filter", val);
      else prev.delete("filter");
      return prev;
    }, { replace: true });
  };

  const filteredTechs = useMemo(() => {
    let res = technicians;

    if (filter === "Available") res = res.filter(t => t.availability === "available");
    else if (filter === "Busy" || filter === "On Job") res = res.filter(t => t.availability === "on_job");
    else if (filter === "On Leave") res = res.filter(t => t.availability === "off");
    else if (filter === "Overloaded") res = res.filter(t => t.activeJobCount >= 2); 
    else if (filter === "Unavailable") res = res.filter(t => t.availability === "unavailable" || t.availability === "off");

    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.role.toLowerCase().includes(q) ||
        t.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    // Sort: Available first, then On Job, then Unavailable
    const order = { "available": 1, "on_job": 2, "unavailable": 3, "off": 4 };
    res.sort((a, b) => order[a.availability] - order[b.availability]);

    return res;
  }, [technicians, filter, search]);

  const stats = {
    total: technicians.length,
    available: technicians.filter(t => t.availability === "available").length,
    busy: technicians.filter(t => t.availability === "on_job").length,
    onLeave: technicians.filter(t => t.availability === "off").length,
    overloaded: technicians.filter(t => t.activeJobCount >= 2).length,
  };

  return (
    <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />}>
      <div style={{ backgroundColor: blue, paddingTop: "44px", paddingBottom: "16px", paddingLeft: "20px", paddingRight: "20px", position: "sticky", top: 0, zIndex: 10 }}>
        <button type="button" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter, marginBottom: "16px" }}>
          <ArrowLeft size={15} color="white" /> Back
        </button>
        <div>
          <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.8)", fontFamily: inter, margin: "0 0 2px", fontWeight: 500 }}>Workforce</p>
          <h1 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: inter, color: "white", margin: "0 0 16px" }}>Technicians</h1>
        </div>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ flex: 1, height: "44px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", padding: "0 14px", gap: "10px" }}>
            <Search size={18} color="white" />
            <input 
              type="text" 
              placeholder="Search name, role, skill..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", fontSize: "14px", color: "white", outline: "none", fontFamily: inter }}
              className="placeholder-white-50"
            />
            {search && <X size={16} color="white" style={{ cursor: "pointer" }} onClick={() => setSearch("")} />}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 0 0" }}>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none", padding: "0 20px 16px" }}>
          {[
            { label: "All", count: stats.total },
            { label: "Available", count: stats.available },
            { label: "Busy", count: stats.busy },
            { label: "Overloaded", count: stats.overloaded },
            { label: "On Leave", count: stats.onLeave },
          ].map(f => (
            <button key={f.label} type="button" onClick={() => setFilter(f.label)}
              style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: filter === f.label ? blue : card, border: `1px solid ${filter === f.label ? blue : border}`, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: filter === f.label ? `0 4px 12px ${blue}40` : "none" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: filter === f.label ? "white" : inkSec, fontFamily: inter }}>{f.label}</span>
              <div style={{ padding: "2px 6px", borderRadius: "10px", backgroundColor: filter === f.label ? "rgba(255,255,255,0.2)" : divider, fontSize: "10px", fontWeight: 700, color: filter === f.label ? "white" : inkMut, fontFamily: inter }}>
                {f.count}
              </div>
            </button>
          ))}
        </div>
        </div>

        <div style={{ padding: "0 20px 20px" }}>
          {filteredTechs.length > 0 ? (
            filteredTechs.map(tech => (
            <TechnicianCard 
              key={tech.id} 
              tech={tech} 
              onClick={() => navigate(`/vendor/technicians/${tech.id}`)}
            />
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "32px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Users size={32} color={inkMut} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 8px" }}>No technicians found</h3>
            <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: 0 }}>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .placeholder-white-50::placeholder { color: rgba(255,255,255,0.6); }
      `}} />
    </MobileLayout>
  );
}
