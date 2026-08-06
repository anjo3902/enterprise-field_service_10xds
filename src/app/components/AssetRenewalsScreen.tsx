import { useState } from "react";
import { useNavigate } from "react-router";
import { useSafeBack } from "../utils/navigation";
import { MobileLayout } from "./ui/MobileLayout";
import {
  ArrowLeft, Search, CalendarClock, AlertTriangle, ShieldCheck, Filter
} from "lucide-react";
import { useAssetContext } from "../contexts/AssetContext";

const blue = "#2563EB";
const blueDark = "#1D4ED8";
const blueMid = "#3B82F6";
const blueTint = "#EFF6FF";
const red = "#DC2626";
const redT = "#FEF2F2";
const amber = "#D97706";
const amberT = "#FFFBEB";
const green = "#16A34A";
const greenT = "#DCFCE7";
const ink = "#0F172A";
const inkSec = "#475569";
const inkMut = "#64748B";
const inkFaint = "#94A3B8";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

type RenewalStatus = "Critical" | "At Risk" | "Upcoming";

interface RenewalItem {
  id: string;
  assetName: string;
  type: string;
  days: number;
  status: RenewalStatus;
  date: string;
}


function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3, 5, 7, 9].map((h, i) => (
            <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white" }} />
          ))}
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

function Header() {
  const safeBack = useSafeBack();
  return (
    <div style={{
      background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
      padding: "10px 20px 20px", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "14px" }}>
        <button type="button" style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "10px", padding: "6px 12px 6px 9px",
          cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter,
        }} onClick={() => safeBack('/assets')}>
          <ArrowLeft size={15} color="white" /> Back
        </button>
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: inter, marginBottom: "2px" }}>
        Upcoming Renewals
      </h1>
      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>
        Manage expirations and contracts
      </p>
    </div>
  );
}

function RenewalCard({ item }: { item: RenewalItem }) {
  const navigate = useNavigate();
  const s = {
    Critical:  { bg: redT,    border: "#FECACA", color: red,    icon: <AlertTriangle size={16} color={red} /> },
    "At Risk": { bg: amberT,  border: "#FDE68A", color: amber,  icon: <CalendarClock size={16} color={amber} /> },
    Upcoming:  { bg: blueTint,border: "#BFDBFE", color: blue,   icon: <ShieldCheck size={16} color={blue} /> },
  }[item.status];

  return (
    <div onClick={() => navigate(`/assets/renewals/${item.id}`)} style={{
      backgroundColor: card, borderRadius: "16px",
      border: `1px solid ${s.border}`, boxShadow: cardShadow,
      padding: "14px 16px", marginBottom: "12px",
      display: "flex", alignItems: "center", gap: "14px", cursor: "pointer"
    }}>
      <div style={{
        width: "44px", height: "44px", borderRadius: "12px",
        backgroundColor: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {s.icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, lineHeight: 1.3 }}>{item.assetName}</p>
        <p style={{ fontSize: "11.5px", color: inkMut, fontFamily: inter, marginTop: "2px" }}>{item.type} • {item.date}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
        <div style={{
          backgroundColor: s.bg, borderRadius: "100px", padding: "3px 9px", border: `1px solid ${s.color}25`,
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: s.color, fontFamily: inter }}>{item.days} days</span>
        </div>
        <span style={{ fontSize: "10px", fontWeight: 700, color: s.color, fontFamily: inter }}>{item.status.toUpperCase()}</span>
      </div>
    </div>
  );
}

export function AssetRenewalsScreen() {
  const { assets } = useAssetContext();
  const [query, setQuery] = useState("");
  const today = new Date();

const renewals: RenewalItem[] = assets.flatMap((asset) => {
  const items: RenewalItem[] = [];

  // Warranty
  if (asset.warrantyExpiry) {
    const expiry = new Date(asset.warrantyExpiry);
    const days = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (days >= 0) {
      items.push({
        id: `${asset.assetId}-warranty`,
        assetName: asset.name,
        type: "Warranty Expiry",
        days,
        status:
          days <= 30
            ? "Critical"
            : days <= 90
            ? "At Risk"
            : "Upcoming",
        date: expiry.toLocaleDateString(),
      });
    }
  }

  // AMC
  if (asset.amcExpiry) {
    const expiry = new Date(asset.amcExpiry);
    const days = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (days >= 0) {
      items.push({
        id: `${asset.assetId}-amc`,
        assetName: asset.name,
        type: "AMC Renewal",
        days,
        status:
          days <= 30
            ? "Critical"
            : days <= 90
            ? "At Risk"
            : "Upcoming",
        date: expiry.toLocaleDateString(),
      });
    }
  }

  return items;
});

renewals.sort((a, b) => a.days - b.days);

const filtered = renewals.filter((r) =>
  r.assetName.toLowerCase().includes(query.toLowerCase())
);




  return (
    <MobileLayout
      header={
        <>
          <StatusBar />
          <Header />
          <div style={{ backgroundColor: bg, padding: "12px 20px 10px", flexShrink: 0 }}>
            <div style={{
              height: "46px", borderRadius: "13px", backgroundColor: card, border: `1.5px solid ${border}`,
              display: "flex", alignItems: "center", gap: "10px", padding: "0 14px",
            }}>
              <Search size={16} color={inkFaint} />
              <input
                type="text"
                placeholder="Search renewals..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "13.5px", color: ink, fontFamily: inter }}
              />
              <Filter size={15} color={inkFaint} />
            </div>
          </div>
        </>
      }
      scrollContainerStyle={{ padding: "6px 20px 100px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: inkSec, fontFamily: inter }}>{filtered.length} pending renewals</span>
      </div>
      {filtered.map(r => <RenewalCard key={r.id} item={r} />)}
    </MobileLayout>
  );
}
