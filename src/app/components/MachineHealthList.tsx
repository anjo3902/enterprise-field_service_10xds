import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Search } from "lucide-react";
import { MobileLayout } from "./ui/MobileLayout";
import { useMachineHealthContext } from "../contexts/MachineHealthContext";
import { SearchBar, MachineCard } from "./MachineHealthDashboard";
import MachineHealthFilterPanel from "./MachineHealthFilterPanel";
import { handleBackNavigation } from "../utils/navigation";

const blue = "#2563EB";
const blueMid = "#3B82F6";
const ink = "#0F172A";
const inkSec = "#475569";
const inkMut = "#64748B";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

function ListPageHeader() {
  const navigate = useNavigate();
  return (
    <div style={{
      background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
      padding: "16px 20px 18px", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "4px" }}>
        <button type="button" onClick={() => handleBackNavigation(navigate, '/machine-health')} style={{
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "10px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0
        }}>
          <ArrowLeft size={16} color="white" />
        </button>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: inter, marginBottom: "2px" }}>
            All Machines
          </h1>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>
            Complete list of monitored equipment
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MachineHealthList() {
  const { filteredMachines, clearFilters } = useMachineHealthContext();
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  return (
    <>
      <MobileLayout
        header={
          <>
            <ListPageHeader />
            <SearchBar onFilterClick={() => setFilterPanelOpen(true)} />
          </>
        }
      >
        <div style={{ padding: "18px 20px" }}>
          {filteredMachines.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "16px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Search size={28} color={inkMut} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "8px" }}>No machines found</h3>
              <p style={{ fontSize: "13.5px", color: inkSec, fontFamily: inter, marginBottom: "20px" }}>Try adjusting your search or filters to find what you're looking for.</p>
              <button type="button" onClick={clearFilters} style={{
                backgroundColor: card, border: `1px solid ${border}`, borderRadius: "12px",
                padding: "10px 20px", fontSize: "13px", fontWeight: 600, color: ink,
                fontFamily: inter, cursor: "pointer", boxShadow: cardShadow
              }}>
                Reset Filters
              </button>
            </div>
          ) : (
            filteredMachines.map(m => <MachineCard key={m.id} machine={m} />)
          )}
        </div>
      </MobileLayout>

      <MachineHealthFilterPanel open={filterPanelOpen} onOpenChange={setFilterPanelOpen} />
    </>
  );
}
