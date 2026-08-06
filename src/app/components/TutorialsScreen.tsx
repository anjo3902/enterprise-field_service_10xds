import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import { ArrowLeft, PlayCircle } from "lucide-react";

const blue = "#2563EB";
const blueMid = "#3B82F6";
const ink = "#0F172A";
const inkMut = "#64748B";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";

const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3, 5, 7, 9].map((h, i) => <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white", opacity: i < 4 ? 1 : 0.4 }} />)}
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

function PageHeader() {
  const navigate = useNavigate();
  return (
    <div style={{ background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <button
          type="button"
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}
          onClick={() => handleBackNavigation(navigate, '/settings')}
        >
          <ArrowLeft size={15} color="white" /> Back
        </button>
      </div>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, marginBottom: "4px" }}>Video Tutorials</h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>Learn how to use the app</p>
      </div>
    </div>
  );
}

const tutorials = [
  { title: "Dashboard Overview", duration: "2:15", thumbColor: "#F59E0B" },
  { title: "Resolving Tickets", duration: "4:30", thumbColor: "#10B981" },
  { title: "Generating Reports", duration: "3:45", thumbColor: "#8B5CF6" },
  { title: "Account & Settings", duration: "1:50", thumbColor: "#EC4899" }
];

export default function TutorialsScreen() {
  const [playing, setPlaying] = useState<number | null>(null);

  return (
    <MobileLayout header={<><StatusBar /><PageHeader /></>} showBottomNav={false}>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {tutorials.map((tut, i) => {
            const isPlaying = playing === i;
            return (
            <div key={i} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, overflow: "hidden", display: "flex", cursor: "pointer", position: "relative" }} onClick={() => setPlaying(isPlaying ? null : i)}>
              <div style={{ width: "100px", height: "80px", backgroundColor: tut.thumbColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PlayCircle size={32} color="rgba(255,255,255,0.8)" />
              </div>
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 4px 0" }}>{tut.title}</h3>
                <p style={{ fontSize: "13px", color: inkMut, fontFamily: inter, margin: 0 }}>{tut.duration}</p>
              </div>
              {isPlaying && (
                <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "14px", fontWeight: 600, fontFamily: inter }}>
                  Playing video...
                </div>
              )}
            </div>
          )})}
        </div>
      </div>
    </MobileLayout>
  );
}
