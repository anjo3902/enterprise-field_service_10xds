import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useSafeBack } from "../utils/navigation";
import { publishEvent } from "../utils/eventBus";
import { MobileLayout } from "./ui/MobileLayout";
import {
  ArrowLeft, CalendarClock, ShieldCheck, AlertTriangle, FileText, Download,
  CheckCircle2, DollarSign, Clock
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
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
const blueShadow = "0 4px 20px rgba(37,99,235,0.22), 0 1px 4px rgba(0,0,0,0.08)";

type RenewalStatus = "Critical" | "At Risk" | "Upcoming";

interface RenewalItem {
  id: string;
  assetName: string;
  type: string;
  vendor: string;
  cost: string;
  date: string;
  days: number;
  status: RenewalStatus;
}


export function AssetRenewalDetailsScreen() {
  const { id } = useParams();
  const safeBack = useSafeBack();
  const navigate = useNavigate();
  const { assets } = useAssetContext();

const today = new Date();
const renewals: RenewalItem[] = assets.flatMap((asset) => {
  const list: RenewalItem[] = [];

  // Warranty
  if (asset.warrantyExpiry) {
    const expiry = new Date(asset.warrantyExpiry);
    const days = Math.ceil(
      (expiry.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
    );

    if (days >= 0) {
      list.push({
        id: `${asset.assetId}-warranty`,
        assetName: asset.name,
        type: "Warranty Expiry",
        vendor: asset.vendor,
        cost: "-",
        date: expiry.toLocaleDateString(),
        days,
        status:
          days <= 30
            ? "Critical"
            : days <= 90
            ? "At Risk"
            : "Upcoming",
      });
    }
  }

  // AMC
  if (asset.amcExpiry) {
    const expiry = new Date(asset.amcExpiry);
    const days = Math.ceil(
      (expiry.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
    );

    if (days >= 0) {
      list.push({
        id: `${asset.assetId}-amc`,
        assetName: asset.name,
        type: "AMC Renewal",
        vendor: asset.vendor,
        cost: "-",
        date: expiry.toLocaleDateString(),
        days,
        status:
          days <= 30
            ? "Critical"
            : days <= 90
            ? "At Risk"
            : "Upcoming",
      });
    }
  }

  return list;
});

const data = renewals.find((r) => r.id === id);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!data) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:inter, flexDirection:"column", gap:"10px" }}>
        <p>Renewal not found.</p>
        <button onClick={() => safeBack('/assets/renewals')} style={{ padding:"8px 16px", borderRadius:"8px", border:"none", backgroundColor:blue, color:"white", cursor:"pointer" }}>Go Back</button>
      </div>
    );
  }

  const s = {
    Critical:  { bg: redT,    color: red,    icon: <AlertTriangle size={24} color={red} /> },
    "At Risk": { bg: amberT,  color: amber,  icon: <CalendarClock size={24} color={amber} /> },
    Upcoming:  { bg: blueTint,color: blue,   icon: <ShieldCheck size={24} color={blue} /> },
  }[data.status as "Critical" | "At Risk" | "Upcoming"];

  const handleRenew = () => {
    setLoading(true);
    setTimeout(() => {
      if (data.type === "AMC Renewal" || data.type === "Subscription") {
        publishEvent({
          type: 'AMC_RENEWAL_REQUESTED',
          payload: { assetId: id || "UNKNOWN", assetName: data.assetName, requestedBy: "Organization" }
        });
      } else {
        publishEvent({
          type: 'WARRANTY_EXTENSION_REQUESTED',
          payload: { assetId: id || "UNKNOWN", assetName: data.assetName }
        });
      }
      setLoading(false);
      setSuccess(true);
      setTimeout(() => navigate('/assets/renewals'), 1500);
    }, 1200);
  };

  return (
    <MobileLayout
      header={
        <div style={{ padding: "14px 20px 10px", backgroundColor: card, borderBottom: `1px solid ${border}` }}>
          <button onClick={() => safeBack('/assets/renewals')} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", fontSize: "14px", fontWeight: 600, color: blue, cursor: "pointer", fontFamily: inter }}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      }
      scrollContainerStyle={{ padding: "20px" }}
      fab={
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: card, borderTop: `1px solid ${border}`, padding: "16px 20px 30px", boxShadow: "0 -4px 16px rgba(0,0,0,0.05)" }}>
          <button onClick={handleRenew} disabled={loading || success} style={{
            width: "100%", height: "50px", borderRadius: "14px", border: "none",
            background: success ? green : `linear-gradient(135deg, ${blue}, ${blueDark})`,
            color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: blueShadow, transition: "all 0.2s"
          }}>
            {loading ? <Clock size={18} className="spin" /> : success ? <CheckCircle2 size={18} /> : <DollarSign size={18} />}
            {loading ? "Processing..." : success ? "Renewed Successfully" : "Process Renewal"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "20px", backgroundColor: s.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
          {s.icon}
        </div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: ink, fontFamily: inter, textAlign: "center", marginBottom: "6px", letterSpacing: "-0.02em" }}>{data.assetName}</h1>
        <div style={{ backgroundColor: s.bg, borderRadius: "100px", padding: "4px 12px", border: `1px solid ${s.color}30` }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: s.color, fontFamily: inter }}>{data.days} days remaining</span>
        </div>
      </div>

      <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "12px" }}>Renewal Details</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: inkMut, fontFamily: inter }}>Type</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{data.type}</span>
          </div>
          <div style={{ height: "1px", backgroundColor: divider }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: inkMut, fontFamily: inter }}>Vendor</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{data.vendor}</span>
          </div>
          <div style={{ height: "1px", backgroundColor: divider }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: inkMut, fontFamily: inter }}>Est. Cost</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{data.cost}</span>
          </div>
          <div style={{ height: "1px", backgroundColor: divider }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: inkMut, fontFamily: inter }}>Expiry Date</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{data.date}</span>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", marginBottom: "100px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "12px" }}>Documents</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", backgroundColor: bg, borderRadius: "10px", border: `1px solid ${divider}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={18} color={blue} />
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>Previous Contract</p>
              <p style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>PDF • 1.2 MB</p>
            </div>
          </div>
          <button style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "white", border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Download size={14} color={inkSec} />
          </button>
        </div>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </MobileLayout>
  );
}
