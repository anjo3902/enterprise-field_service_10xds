import React from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import { ArrowLeft, BookOpen, Settings2, Shield, Search } from "lucide-react";

const blue = "#2563EB";
const blueMid = "#3B82F6";
const ink = "#0F172A";
const inkMut = "#64748B";
const inkSec = "#475569";
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
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, marginBottom: "4px" }}>User Guide</h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>Documentation & Manual</p>
      </div>
    </div>
  );
}

const sections = [
  {
    title: "Getting Started",
    icon: BookOpen,
    content: "Welcome to 10xDS Enterprise. Start by familiarizing yourself with the Dashboard where you can see a high-level overview of SLA trackers, Machine Health, and Recent Reports. Navigation is available at the bottom of the screen."
  },
  {
    title: "Navigating Tickets",
    icon: Search,
    content: "The 'My Tickets' page lists all open tasks assigned to you. You can update statuses directly from the list or tap a ticket for full details. High priority tickets are highlighted with an AI insight tag."
  },
  {
    title: "Configuration & Preferences",
    icon: Settings2,
    content: "Use the Settings page to manage your Language, Timezone, and Notification preferences. Updates are saved locally and immediately applied without a page reload."
  },
  {
    title: "Security Measures",
    icon: Shield,
    content: "Ensure your account is protected by enabling Two-Factor Authentication (2FA) and regularly updating your password from the Security panel."
  }
];

export default function UserGuideScreen() {
  return (
    <MobileLayout header={<><StatusBar /><PageHeader /></>} showBottomNav={false}>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={idx} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: `${blue}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color={blue} />
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: ink, fontFamily: inter, margin: 0 }}>{section.title}</h3>
                </div>
                <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, lineHeight: 1.5, margin: 0 }}>
                  {section.content}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
}
