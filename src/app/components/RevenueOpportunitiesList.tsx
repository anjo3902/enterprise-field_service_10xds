import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { handleBackNavigation } from "../utils/navigation";
import { MobileLayout } from "./ui/MobileLayout";
import { useRevenueContext, Opportunity } from "../contexts/RevenueContext";
import {
  blue, blueMid, inter, ink, inkFaint, divider,
  SearchBar, OpportunityCard, FilterSheet, SortSheet, OpportunityDetailsSheet,
} from "./RevenueIntelligenceScreen";

export function RevenueOpportunitiesList() {
  const navigate = useNavigate();
  const { filteredOpportunities, sortOrder } = useRevenueContext();

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [viewOpp, setViewOpp] = useState<Opportunity | null>(null);

  return (
    <MobileLayout
      header={
        <>
          <div style={{ background: `linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`, padding: "16px 20px 18px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "4px" }}>
              <button type="button" onClick={() => handleBackNavigation(navigate, '/revenue-intelligence')} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <ArrowLeft size={16} color="white" />
              </button>
              <div>
                <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: inter, marginBottom: "2px" }}>All Recommendations</h1>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>AI-identified operational savings</p>
              </div>
            </div>
          </div>
          <SearchBar onFilterClick={() => setFilterOpen(true)} />
        </>
      }
      modals={
        <>
          <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} />
          <SortSheet open={sortOpen} onClose={() => setSortOpen(false)} />
          <OpportunityDetailsSheet opp={viewOpp} onClose={() => setViewOpp(null)} />
        </>
      }
    >
      <div style={{ padding: "14px 16px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <p style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter }}>{filteredOpportunities.length} Recommendations</p>
          <span onClick={() => setSortOpen(true)} style={{ fontSize: "11px", color: blue, fontWeight: 600, fontFamily: inter, cursor: "pointer" }}>
            Sort: {sortOrder} ↓
          </span>
        </div>
        {filteredOpportunities.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "60px", gap: "12px" }}>
            <TrendingUp size={40} color={inkFaint} />
            <p style={{ fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter }}>No recommendations match filters</p>
          </div>
        ) : (
          filteredOpportunities.map(o => <OpportunityCard key={o.id} opp={o} onView={() => setViewOpp(o)} />)
        )}
      </div>
      <div style={{ height: "40px" }} />
    </MobileLayout>
  );
}
