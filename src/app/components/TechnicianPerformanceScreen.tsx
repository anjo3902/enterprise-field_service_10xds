import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAnalyticsContext } from '../contexts/AnalyticsContext';
import { MobileLayout } from './ui/MobileLayout';
import { handleBackNavigation } from '../utils/navigation';
import { 
  ArrowLeft, Search, Filter, ArrowDownUp, 
  User, CheckCircle2, AlertTriangle, Clock, 
  Star, Briefcase, TrendingUp, TrendingDown,
  X, Check
} from 'lucide-react';

// --- Tokens ---
const blue = "#2563EB"; const blueDark = "#1D4ED8"; const blueMid = "#3B82F6"; const blueTint = "#EFF6FF";
const green = "#16A34A"; const greenT = "#DCFCE7";
const orange = "#EA580C"; const orangeT = "#FFF7ED";
const red = "#DC2626"; const redT = "#FEF2F2";
const amber = "#D97706"; const amberT = "#FFFBEB";
const ink = "#0F172A"; const inkSec = "#475569"; const inkMut = "#64748B"; const inkFaint = "#94A3B8";
const bg = "#F8FAFC"; const card = "#FFFFFF"; const border = "#E2E8F0"; const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

// Removed static mock data in favor of useAnalyticsContext

function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3, 5, 7, 9].map((h, i) => <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white" }} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <div style={{ width: "22px", height: "11px", borderRadius: "2px", border: "1.5px solid white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, right: "3px", backgroundColor: "white", borderRadius: "1px" }} />
          </div>
          <div style={{ width: "2px", height: "5px", borderRadius: "1px", backgroundColor: "white" }} />
        </div>
      </div>
    </div>
  );
}

type SortOption = "Highest SLA" | "Lowest SLA" | "Most Active" | "Fastest Resolution";
type FilterState = {
  department: string | null;
  performance: string | null;
  availability: string | null;
  skill: string | null;
};

export function TechnicianPerformanceScreen() {
  const navigate = useNavigate();
  const { period, data } = useAnalyticsContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeModal, setActiveModal] = useState<"Filter" | "Sort" | null>(null);
  
  const [sortBy, setSortBy] = useState<SortOption>("Highest SLA");
  const [filters, setFilters] = useState<FilterState>({
    department: null,
    performance: null,
    availability: null,
    skill: null
  });

  const getSLAColor = (pct: number) => {
    if (pct >= 95) return green;
    if (pct >= 85) return amber;
    return red;
  };
  const getSLAColorBg = (pct: number) => {
    if (pct >= 95) return greenT;
    if (pct >= 85) return amberT;
    return redT;
  };

  const filteredAndSortedTechs = useMemo(() => {
    let result = [...data.techs];
    
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.department.toLowerCase().includes(q));
    }
    
    // Filters
    if (filters.department) result = result.filter(t => t.department === filters.department);
    if (filters.skill) result = result.filter(t => t.skillLevel === filters.skill);
    if (filters.availability) result = result.filter(t => t.availability === filters.availability);
    if (filters.performance) {
      if (filters.performance === "High (>95%)") result = result.filter(t => t.slaPct >= 95);
      if (filters.performance === "Medium (85-94%)") result = result.filter(t => t.slaPct >= 85 && t.slaPct < 95);
      if (filters.performance === "Low (<85%)") result = result.filter(t => t.slaPct < 85);
    }
    
    // Sort
    switch (sortBy) {
      case "Highest SLA":
        result.sort((a, b) => b.slaPct - a.slaPct);
        break;
      case "Lowest SLA":
        result.sort((a, b) => a.slaPct - b.slaPct);
        break;
      case "Most Active":
        result.sort((a, b) => b.activeTickets - a.activeTickets);
        break;
      case "Fastest Resolution":
        result.sort((a, b) => a.avgResolutionMinutes - b.avgResolutionMinutes);
        break;
    }
    
    return result;
  }, [searchQuery, filters, sortBy, data.techs]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <MobileLayout
      showBottomNav={false}
      backgroundColor={bg}
      header={
        <>
          <StatusBar />
          <div style={{ background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <button type="button" onClick={() => handleBackNavigation(navigate, '/sla-tracker')} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}>
                <ArrowLeft size={15} color="white" /> Back
              </button>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
              <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, margin: "0 0 6px" }}>Technician Performance</h1>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontFamily: inter, margin: 0 }}>Track and analyze SLA metrics across your team</p>
              </div>
              <div style={{backgroundColor:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:"100px",padding:"4px 12px"}}><span style={{fontSize:"11px",fontWeight:700,color:"white",fontFamily:inter}}>{period}</span></div>
            </div>
          </div>
          
          {/* Search & Actions Bar */}
          <div style={{ padding: "16px 20px", backgroundColor: bg, borderBottom: `1px solid ${border}`, display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <div style={{ position: "absolute", left: "12px", top: "0", bottom: "0", display: "flex", alignItems: "center" }}>
                <Search size={16} color={inkMut} />
              </div>
              <input 
                type="text" 
                placeholder="Search technicians..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", height: "40px", backgroundColor: card, border: `1px solid ${border}`, borderRadius: "12px", padding: "0 12px 0 36px", fontSize: "14px", color: ink, fontFamily: inter, outline: "none" }}
              />
            </div>
            <button type="button" onClick={() => setActiveModal("Filter")} style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: activeFilterCount > 0 ? blueTint : card, border: `1px solid ${activeFilterCount > 0 ? blue : border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
              <Filter size={16} color={activeFilterCount > 0 ? blue : inkSec} />
              {activeFilterCount > 0 && (
                <div style={{ position: "absolute", top: "-4px", right: "-4px", width: "16px", height: "16px", borderRadius: "8px", backgroundColor: blue, color: "white", fontSize: "10px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: inter }}>
                  {activeFilterCount}
                </div>
              )}
            </button>
            <button type="button" onClick={() => setActiveModal("Sort")} style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: card, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ArrowDownUp size={16} color={inkSec} />
            </button>
          </div>
        </>
      }
      modals={
        <>
          {/* Sort Modal */}
          {activeModal === "Sort" && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", zIndex: 999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => setActiveModal(null)}>
              <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 30px", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
                <div style={{ width: "40px", height: "4px", backgroundColor: divider, borderRadius: "2px", margin: "0 auto 20px" }} />
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 16px", fontFamily: inter }}>Sort By</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(["Highest SLA", "Lowest SLA", "Most Active", "Fastest Resolution"] as SortOption[]).map(opt => (
                    <div key={opt} onClick={() => { setSortBy(opt); setActiveModal(null); }} style={{ padding: "14px 16px", borderRadius: "12px", backgroundColor: sortBy === opt ? blueTint : "transparent", border: `1px solid ${sortBy === opt ? blue : border}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                      <span style={{ fontSize: "14px", fontWeight: sortBy === opt ? 700 : 500, color: sortBy === opt ? blue : ink, fontFamily: inter }}>{opt}</span>
                      {sortBy === opt && <Check size={16} color={blue} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filter Modal */}
          {activeModal === "Filter" && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", zIndex: 999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => setActiveModal(null)}>
              <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 30px", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                <div style={{ width: "40px", height: "4px", backgroundColor: divider, borderRadius: "2px", margin: "0 auto 20px" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <h2 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: 0, fontFamily: inter }}>Filter Technicians</h2>
                  <button type="button" onClick={() => setFilters({ department: null, performance: null, availability: null, skill: null })} style={{ background: "none", border: "none", color: blue, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>Reset</button>
                </div>
                
                {/* Filter Sections */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  
                  {/* Performance */}
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Performance Level</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {["High (>95%)", "Medium (85-94%)", "Low (<85%)"].map(opt => (
                        <div key={opt} onClick={() => setFilters(prev => ({ ...prev, performance: prev.performance === opt ? null : opt }))} style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: filters.performance === opt ? blueTint : bg, border: `1px solid ${filters.performance === opt ? blue : border}`, fontSize: "13px", fontWeight: 600, color: filters.performance === opt ? blue : inkSec, fontFamily: inter, cursor: "pointer" }}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Department</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {["HVAC", "Electrical", "Network", "Plumbing", "Security"].map(opt => (
                        <div key={opt} onClick={() => setFilters(prev => ({ ...prev, department: prev.department === opt ? null : opt }))} style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: filters.department === opt ? blueTint : bg, border: `1px solid ${filters.department === opt ? blue : border}`, fontSize: "13px", fontWeight: 600, color: filters.department === opt ? blue : inkSec, fontFamily: inter, cursor: "pointer" }}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 12px", fontFamily: inter }}>Availability</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {["Available", "On Site", "Busy", "Offline"].map(opt => (
                        <div key={opt} onClick={() => setFilters(prev => ({ ...prev, availability: prev.availability === opt ? null : opt }))} style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: filters.availability === opt ? blueTint : bg, border: `1px solid ${filters.availability === opt ? blue : border}`, fontSize: "13px", fontWeight: 600, color: filters.availability === opt ? blue : inkSec, fontFamily: inter, cursor: "pointer" }}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                </div>

                <button type="button" onClick={() => setActiveModal(null)} style={{ width: "100%", height: "48px", borderRadius: "14px", backgroundColor: blue, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", marginTop: "24px" }}>
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </>
      }
    >
      <div style={{ padding: "20px" }}>
        {filteredAndSortedTechs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "32px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <User size={32} color={inkMut} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: ink, margin: "0 0 8px", fontFamily: inter }}>No Technicians Found</h3>
            <p style={{ fontSize: "14px", color: inkMut, margin: 0, fontFamily: inter }}>Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          filteredAndSortedTechs.map((tech) => {
            const pc = getSLAColor(tech.slaPct);
            const pb = getSLAColorBg(tech.slaPct);
            return (
              <div key={tech.id} onClick={() => navigate(`/technician-performance/${tech.id}`)} style={{ backgroundColor: card, borderRadius: "20px", boxShadow: cardShadow, border: `1px solid ${border}`, padding: "16px", marginBottom: "16px", cursor: "pointer" }}>
                
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: `linear-gradient(135deg, ${blue}, ${blueDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "white", fontFamily: inter }}>{tech.name.split(" ").map(n => n[0]).join("")}</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter }}>{tech.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{tech.department} • {tech.skillLevel}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: pb, padding: "4px 8px", borderRadius: "100px", marginBottom: "4px" }}>
                      {tech.slaPct >= 95 ? <CheckCircle2 size={12} color={pc} /> : <AlertTriangle size={12} color={pc} />}
                      <span style={{ fontSize: "13px", fontWeight: 800, color: pc, fontFamily: inter }}>{tech.slaPct}%</span>
                    </div>
                    <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 600 }}>SLA Score</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px", padding: "12px", backgroundColor: bg, borderRadius: "12px", border: `1px solid ${border}` }}>
                  <div>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>Resolved</p>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{tech.completedTickets}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>Active</p>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: blue, margin: 0, fontFamily: inter }}>{tech.activeTickets}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>Avg Time</p>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{tech.avgResolutionTime}</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Star size={14} color={amber} fill={amber} />
                      <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{tech.customerRating}</span>
                    </div>
                    {tech.escalations > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <TrendingUp size={14} color={red} />
                        <span style={{ fontSize: "13px", fontWeight: 700, color: red, fontFamily: inter }}>{tech.escalations} Esc.</span>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: inkSec, fontFamily: inter }}>Load</span>
                    <div style={{ width: "40px", height: "6px", backgroundColor: divider, borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${tech.workload}%`, backgroundColor: tech.workload > 80 ? red : tech.workload > 50 ? amber : green, borderRadius: "3px" }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </MobileLayout>
  );
}
