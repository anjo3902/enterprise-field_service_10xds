import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ticketService } from "../services/ticketService";
import { subscribeToEvent } from "../utils/eventBus";
import { Ticket } from "../types/legacy";
import type { Asset } from "../contexts/AssetContext";
import {
  ArrowLeft, Bell, User, Wind,
  Building2, CalendarDays, CalendarClock, Shield,
  MapPin, Clock, Wrench, FileText, AlertTriangle,
  CheckCircle2, Home, Database, Bot, ChevronRight,
  Activity, History, Settings2,
} from "lucide-react";
import { useAssetContext } from "../contexts/AssetContext";

// ─── Design tokens — exact mirror across all asset screens ────────────────────
const blue     = "#2563EB";
const blueDark = "#1D4ED8";
const blueMid  = "#3B82F6";
const blueTint = "#EFF6FF";
const blueRing = "rgba(37,99,235,0.12)";

const green    = "#16A34A";
const greenT   = "#DCFCE7";
const orange   = "#EA580C";
const orangeT  = "#FFF7ED";
const purple   = "#7C3AED";
const purpleT  = "#F5F3FF";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const teal     = "#0891B2";
const tealT    = "#ECFEFF";

const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const inkFaint = "#94A3B8";

const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";

const inter      = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
const blueShadow = "0 4px 20px rgba(37,99,235,0.22), 0 1px 4px rgba(0,0,0,0.08)";

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0,
    }}>
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

// ─── Compact blue sub-page header ────────────────────────────────────────────
function PageHeader() {
  const navigate = useNavigate();
  return (
    <div style={{
      background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
      padding: "10px 20px 18px",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <button type="button" style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "10px", padding: "6px 12px 6px 9px",
          cursor: "pointer", fontSize: "12.5px", fontWeight: 600,
          color: "white", fontFamily: inter,
        }} onClick={() => handleBackNavigation(navigate, '/assets')}>
          <ArrowLeft size={15} color="white" />
          Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ position: "relative" }}>
            <button type="button" style={{
              width: "36px", height: "36px", borderRadius: "10px",
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <Bell size={17} color="white" />
            </button>
            <div style={{
              position: "absolute", top: "6px", right: "6px",
              width: "7px", height: "7px", borderRadius: "50%",
              backgroundColor: red, border: "1.5px solid #0052CC",
            }} />
          </div>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(140deg, #334155, #1E293B)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid rgba(255,255,255,0.2)",
          }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "white", fontFamily: inter }}>AC</span>
          </div>
        </div>
      </div>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", lineHeight: 1.15, fontFamily: inter, marginBottom: "3px" }}>
          Asset Details
        </h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: inter }}>
          Full asset profile and service history
        </p>
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ title, icon: Icon }: { title: string; icon?: React.ElementType }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
      {Icon && (
        <div style={{
          width: "24px", height: "24px", borderRadius: "7px",
          background: `linear-gradient(135deg, ${blue}, ${blueDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={12} color="white" />
        </div>
      )}
      <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, letterSpacing: "-0.01em" }}>{title}</span>
      <div style={{ flex: 1, height: "1px", backgroundColor: border }} />
    </div>
  );
}

// ─── Asset Summary Hero Card ──────────────────────────────────────────────────
function AssetSummaryCard({ asset }: { asset: Asset }) {
  const healthPct = asset.health;
   const Icon = asset.icon;
   const healthColor =
  asset.health >= 80
    ? green
    : asset.health >= 60
    ? amber
    : red;
const r = 40;
const sw = 9;
const C = 2 * Math.PI * r;
const dash = (healthPct / 100) * C;
  
  

  return (
    
    <div style={{
      backgroundColor: card, borderRadius: "20px",
      boxShadow: cardShadow, border: `1px solid ${border}`,
      overflow: "hidden", marginBottom: "10px",
    }}>
      {/* Gradient hero top */}
      <div style={{
        height: "96px",
        background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
        position: "relative",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}>
        <div style={{ position: "absolute", top: "-18px", right: "-18px", width: "90px", height: "90px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", top: "14px", left: "24px", width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.04)" }} />

        {/* Floating icon circle */}
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          backgroundColor: tealT,
          border: `3.5px solid ${card}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", bottom: "-40px",
          boxShadow: `0 6px 24px rgba(8,145,178,0.25), 0 2px 8px rgba(0,0,0,0.12)`,
        }}>
          <Icon size={34} color={asset.iconColor} />

        </div>
      </div>

      {/* White content area */}
      <div style={{ padding: "50px 20px 20px", textAlign: "center" }}>
        {/* Name */}
        <h2 style={{
          fontSize: "18px", fontWeight: 800, color: ink,
          letterSpacing: "-0.025em", lineHeight: 1.2,
          fontFamily: inter, marginBottom: "6px",
        }}>
          {asset.name}
        </h2>

        {/* ID + Category */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "14px" }}>
          <span style={{ fontSize: "11.5px", fontWeight: 700, color: inkFaint, fontFamily: inter, letterSpacing: "0.02em" }}>
            {asset.assetId}
          </span>
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", backgroundColor: border }} />
          <span style={{
            fontSize: "11px", fontWeight: 600, color: inkSec,
            backgroundColor: divider, borderRadius: "6px",
            padding: "2px 8px", fontFamily: inter,
          }}>
           {asset.category} 
          </span>
        </div>

        {/* Status + Health row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
          padding: "14px 16px",
          backgroundColor: bg, borderRadius: "14px", border: `1px solid ${border}`,
        }}>
          {/* Health donut */}
          <div style={{ position: "relative", width: "88px", height: "88px", flexShrink: 0 }}>
            <svg width="88" height="88" viewBox="0 0 88 88" style={{ display: "block" }}>
              <circle cx="44" cy="44" r={r} fill="none" stroke={divider} strokeWidth={sw} />
              <circle
                cx="44" cy="44" r={r}
                fill="none" stroke={healthColor} strokeWidth={sw}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
                transform="rotate(-90 44 44)"
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: 800, color: healthColor, fontFamily: inter, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {healthPct}%
              </span>
              <span style={{ fontSize: "8.5px", color: inkFaint, fontFamily: inter, fontWeight: 600, marginTop: "2px" }}>Health</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "1px", height: "60px", backgroundColor: healthColor }} />

          {/* Status info */}
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%",backgroundColor: healthColor, boxShadow: `0 0 0 3px ${green}28` }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: healthColor, fontFamily: inter }}>{asset.status}</span>
            </div>
            <div style={{ marginBottom: "5px" }}>
              <p style={{ fontSize: "10px", color: inkFaint, fontFamily: inter }}>Uptime</p>
              <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{asset.health}%</p>
            </div>
            <div>
              <p style={{ fontSize: "10px", color: inkFaint, fontFamily: inter }}>Incidents (30d)</p>
              <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────
interface InfoRowProps {
  icon: React.ElementType; iconColor: string; iconTint: string;
  label: string; value: string; valueColor?: string;
  badge?: { text: string; color: string; tint: string };
  last?: boolean;
}
function InfoRow({ icon: Icon, iconColor, iconTint, label, value, valueColor, badge, last }: InfoRowProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "14px",
      padding: "13px 16px",
      borderBottom: last ? "none" : `1px solid ${divider}`,
    }}>
      <div style={{
        width: "36px", height: "36px", borderRadius: "11px",
        backgroundColor: iconTint, border: `1px solid ${iconColor}20`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={17} color={iconColor} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "11px", fontWeight: 500, color: inkFaint, fontFamily: inter, marginBottom: "2px" }}>
          {label}
        </p>
        <p style={{ fontSize: "13.5px", fontWeight: 600, color: valueColor || ink, fontFamily: inter }}>
          {value}
        </p>
      </div>
      {badge && (
        <span style={{
          fontSize: "9.5px", fontWeight: 700, color: badge.color,
          backgroundColor: badge.tint, borderRadius: "100px",
          padding: "3px 9px", fontFamily: inter,
          border: `1px solid ${badge.color}22`, flexShrink: 0,
        }}>
          {badge.text}
        </span>
      )}
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: card, borderRadius: "18px",
      boxShadow: cardShadow, border: `1px solid ${border}`,
      overflow: "hidden", marginBottom: "10px",
    }}>
      {children}
    </div>
  );
}

// ─── Health progress card ─────────────────────────────────────────────────────
function CurrentHealthCard({ asset }: { asset: Asset }) {

const metrics = [
{
label: "Health Score",
value: `${asset.health}%`,
color: green,
bar: asset.health
},
{
label: "Efficiency",
value: `${Math.min(asset.health + 2,100)}%`,
color: blue,
bar: Math.min(asset.health + 2,100)
},
{
label: "Load Factor",
value: `${Math.max(asset.health - 20,30)}%`,
color: amber,
bar: Math.max(asset.health - 20,30)
}
];

  return (
    <SectionCard>
      {metrics.map((m, i) => (
        <div key={m.label} style={{
          padding: "14px 16px",
          borderBottom: i < metrics.length - 1 ? `1px solid ${divider}` : "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: inkSec, fontFamily: inter }}>{m.label}</span>
            <span style={{ fontSize: "16px", fontWeight: 800, color: m.color, fontFamily: inter, letterSpacing: "-0.03em" }}>
              {m.value}
            </span>
          </div>
          <div style={{ height: "6px", backgroundColor: divider, borderRadius: "100px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${m.bar}%`,
              background: m.color === green
                ? `linear-gradient(90deg, ${green}, #4ADE80)`
                : m.color === blue
                ? `linear-gradient(90deg, ${blue}, ${blueMid})`
                : `linear-gradient(90deg, ${amber}, #FCD34D)`,
              borderRadius: "100px",
            }} />
          </div>
        </div>
      ))}
    </SectionCard>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────
function QuickBtn({
  icon: Icon, label, color, tint, pressed, onPress, onRelease, onClick,
}: {
  icon: React.ElementType; label: string; color: string; tint: string;
  pressed: boolean; onPress: () => void; onRelease: () => void; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onClick={onClick}
      style={{
        flex: 1, backgroundColor: pressed ? tint : card,
        borderRadius: "16px", padding: "14px 8px 12px",
        border: `1.5px solid ${pressed ? color + "40" : border}`,
        cursor: "pointer", display: "flex", flexDirection: "column",
        alignItems: "center", gap: "8px",
        boxShadow: pressed ? "none" : cardShadow,
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "all 0.14s ease",
        fontFamily: inter,
      }}
    >
      <div style={{
        width: "44px", height: "44px", borderRadius: "13px",
        backgroundColor: tint, border: `1.5px solid ${color}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 3px 10px ${color}22`,
      }}>
        <Icon size={20} color={color} />
      </div>
      <span style={{ fontSize: "11px", fontWeight: 700, color: pressed ? color : inkSec, fontFamily: inter, textAlign: "center", lineHeight: 1.3 }}>
        {label}
      </span>
    </button>
  );
}
function getExpiryStatus(date?: string) {
  if (!date)
    return {
      text: "Unknown",
      color: inkMut,
      tint: divider,
    };

  const today = new Date();
  const expiry = new Date(date);

  const daysRemaining = Math.ceil(
    (expiry.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysRemaining <= 0)
    return {
      text: "Expired",
      color: red,
      tint: redT,
    };

  if (daysRemaining <= 30)
    return {
      text: "Expiring Soon",
      color: amber,
      tint: amberT,
    };

  return {
    text: "Active",
    color: green,
    tint: greenT,
  };
}
export function AssetDetails() {
  const navigate = useNavigate();
  const { assetId } = useParams();

const { assets } = useAssetContext();

  const [historyPressed, setHistoryPressed]     = useState(false);
  const [schedulePressed, setSchedulePressed]   = useState(false);

  const [loading, setLoading] = useState(true);

 const asset = assets.find(
  a => a.assetId.trim().toUpperCase() === (assetId ?? "").trim().toUpperCase()
);

const warrantyBadge = getExpiryStatus(asset?.warrantyExpiry);
const amcBadge = getExpiryStatus(asset?.amcExpiry);
  const [history, setHistory] = useState<Ticket[]>([]);

  useEffect(() => {
    let active = true;

    async function loadData() {

      if (!assetId || assetId === "undefined") {
        if (active) {
          navigate('/assets', { replace: true });
        }
        return;
      }

      // Only show full-screen loader if we don't have an asset yet
      if (!asset && active) setLoading(true);
try {
  const allTickets = await ticketService.getAllTickets();

  if (active) {
    setHistory(
      allTickets
        .filter((t) => t.assetId === assetId)
        .sort((a, b) => b.id.localeCompare(a.id))
    );
  }
} catch (error) {
  console.error("Failed to fetch asset data:", error);
}
        
       finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();

    return () => {
      active = false;
    };
  }, [assetId, navigate, asset, assets]);

  useEffect(() => {
    return subscribeToEvent((event) => {
      if (event.type === 'WORK_ORDER_COMPLETED' && event.payload.assetId === assetId) {
        setHistory(prev => {
          const newTicket = {
            id: event.payload.ticketId,
            title: event.payload.title || "Maintenance Completed",
            category: event.payload.category || "Preventive Maintenance",
            location: "",
            reportedTime: "Just now",
            priority: "Medium" as const,
            status: "Resolved" as const,
            assetId: event.payload.assetId,
            technicianId: "",
            slaId: "",
            aiId: "",
            timelineId: ""
          };
          return [newTicket, ...prev.filter(t => t.id !== newTicket.id)];
        });
      }
    });
  }, [assetId]);

  if (loading && !asset) {
    return (
      <MobileLayout
        header={<StatusBar />}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: `3px solid ${blueTint}`, borderTopColor: blue, animation: "spin 1s linear infinite" }} />
        </div>
      </MobileLayout>
    );
  }

  if (!asset) {
    return (
      <MobileLayout
        header={<StatusBar />}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "20px", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <AlertTriangle size={32} color={red} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 8px", fontFamily: inter }}>Asset Not Found</h2>
          <p style={{ fontSize: "14px", color: inkMut, textAlign: "center", margin: "0 0 24px", fontFamily: inter, lineHeight: 1.5 }}>
            The asset ID <strong style={{ color: ink }}>{assetId}</strong> does not exist.
          </p>
          <button 
            type="button" 
            onClick={() => handleBackNavigation(navigate, "/assets")}
            style={{ height: "48px", padding: "0 24px", borderRadius: "12px", backgroundColor: blue, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: `0 4px 20px rgba(37,99,235,0.22)` }}
          >
            Back to Assets
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      header={
        <>
          {/* ── Fixed top chrome ── */}
          <StatusBar />
          <PageHeader />
        </>
      }
      scrollContainerStyle={{ padding: "12px 16px 100px" }}
    >
      {/* ── Scrollable body ── */}

        {/* ── Asset Summary Hero Card ── */}
        <AssetSummaryCard asset={asset} />

        {/* ── Asset Information ── */}
        <div style={{ marginBottom: "10px" }}>
          <SectionHeading title="Asset Information" icon={Database} />
          <SectionCard>
            <InfoRow icon={Building2}    iconColor={blue}   iconTint={blueTint} label="Vendor"          value={asset.vendor}/>
            <InfoRow
  icon={CalendarDays}
  iconColor={green}
  iconTint={greenT}
  label="Purchase Date"
  value={asset.purchaseDate || "-"}
/>

<InfoRow
  icon={CalendarDays}
  iconColor={teal}
  iconTint={tealT}
  label="Installation Date"
  value={asset.installationDate || "-"}
/>
            <InfoRow icon={Shield}       iconColor={green}  iconTint={greenT}   label="Warranty Expiry"  value={asset.warrantyExpiry || "-"}
             badge={warrantyBadge} />
            <InfoRow icon={FileText}     iconColor={amber}  iconTint={amberT}   label="AMC Expiry"       value={asset.amcExpiry || "-"}
              badge={amcBadge} />
           <InfoRow
    icon={MapPin}
    iconColor={purple}
    iconTint={purpleT}
    label="Current Location"
    value={asset.location}
    last
/>
</SectionCard>
        </div>

        {/* ── Current Health ── */}
        <div style={{ marginBottom: "10px" }}>
          <SectionHeading title="Current Health" icon={Activity} />
          <CurrentHealthCard asset={asset} />
        </div>

        {/* ── Service Information ── */}
        <div style={{ marginBottom: "10px" }}>
          <SectionHeading title="Service Information" icon={Wrench} />
          <SectionCard>
            <InfoRow icon={Clock}         iconColor={blue}   iconTint={blueTint} label="Last Service Date"       value={asset.lastService} />
            <InfoRow icon={CalendarClock} iconColor={green}  iconTint={greenT}   label="Next Scheduled Service"  value="12 April 2026"
              badge={{ text: "Upcoming", color: blue, tint: blueTint }} />
            <InfoRow icon={Building2}     iconColor={teal}   iconTint={tealT}    label="Assigned Vendor"         value={asset.vendor} />
          
            <InfoRow icon={User}          iconColor={purple} iconTint={purpleT}  label="Assigned Technician"     value="Rahul Sharma" last />
          </SectionCard>
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ marginBottom: "10px" }}>
          <SectionHeading title="Quick Actions" icon={Settings2} />
          <div style={{ display: "flex", gap: "10px" }}>
            <QuickBtn
              icon={History} label="View History"
              onClick={() => navigate('/assets/history')}
              color={blue} tint={blueTint}
              pressed={historyPressed}
              onPress={() => setHistoryPressed(true)}
              onRelease={() => setHistoryPressed(false)}
            />
            <QuickBtn
              icon={CalendarClock} label={"Schedule\nMaintenance"}
              color={teal} tint={tealT}
              pressed={schedulePressed}
              onPress={() => setSchedulePressed(true)}
              onRelease={() => setSchedulePressed(false)}
              onClick={() => {
                navigate('/raise-ticket', {
                  state: {
                    prefill: {
                      title: `Maintenance Request - ${asset.name}`,
                      category: "Preventive Maintenance",
                      asset: asset.name,
                      assetId: asset.assetId,
                      priority: "Medium",
                      description: "Scheduled from Asset Details."
                    }
                  }
                });
              }}
            />
          </div>
        </div>

        {/* ── Recent Service History Preview ── */}
        <div style={{ marginBottom: "10px" }}>
          <SectionHeading title="Recent Service History" icon={History} />
          <SectionCard>
            {history.length === 0 ? (
              <p style={{ padding: "16px", fontSize: "13px", color: inkMut, fontFamily: inter, textAlign: "center" }}>No service history found.</p>
            ) : (
              history.slice(0, 3).map((h, i, arr) => {
                const isCompleted = h.status === "Closed" || h.status === "Resolved";
                const color = isCompleted ? green : blue;
                const tint = isCompleted ? greenT : blueTint;
                const HIcon = isCompleted ? CheckCircle2 : Wrench;

                return (
                  <div key={h.id} style={{
                    display: "flex", alignItems: "flex-start", gap: "12px",
                    padding: "13px 16px",
                    borderBottom: i < arr.length - 1 ? `1px solid ${divider}` : "none",
                  }}>
                    {/* Spine */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "9px",
                        backgroundColor: tint, border: `1px solid ${color}20`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <HIcon size={15} color={color} />
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{ width: "1.5px", height: "100%", backgroundColor: border, marginTop: "6px", minHeight: "12px" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingTop: "2px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: color, backgroundColor: tint, borderRadius: "100px", padding: "2px 7px", fontFamily: inter }}>
                          {h.status}
                        </span>
                        <span style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter }}>{h.reportedTime || "Recently"}</span>
                      </div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "2px" }}>{h.title}</p>
                      <p style={{ fontSize: "12px", color: inkSec, fontFamily: inter, lineHeight: 1.5 }}>{h.category}</p>
                    </div>
                  </div>
                );
              })
            )}
          </SectionCard>
        </div>

        <div style={{ height: "16px" }} />
    </MobileLayout>
  );
}

