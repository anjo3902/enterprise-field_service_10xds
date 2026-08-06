import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, FileText, Sparkles, Search, UserPlus, CheckCircle2,
  Navigation, MapPin, Wrench, CheckCircle, Clock, Users, Bot, Package, Shield, AlertTriangle
} from "lucide-react";
import { useSafeBack } from "../utils/navigation";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import React, { useState } from "react";
import { useVendor } from "../contexts/VendorContext";
import { buildTimelineFromTicket } from "../utils/slaAdapter";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const blue = "#2563EB"; const blueDark = "#1D4ED8"; const blueMid = "#3B82F6"; const blueTint = "#EFF6FF";
const blueRing = "rgba(37,99,235,0.12)";
const green = "#16A34A"; const greenT = "#DCFCE7";
const orange = "#EA580C"; const orangeT = "#FFF7ED";
const purple = "#7C3AED"; const purpleT = "#F5F3FF";
const amber = "#D97706"; const amberT = "#FFFBEB";
const teal = "#0D9488"; const tealT = "#CCFBF1";
const red = "#DC2626"; const redT = "#FEE2E2";
const ink = "#0F172A"; const inkSec = "#475569"; const inkMut = "#64748B"; const inkFaint = "#94A3B8";
const bg = "#F8FAFC"; const card = "#FFFFFF"; const border = "#E2E8F0"; const divider = "#F1F5F9";
const inter = "'Inter','Roboto',sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)";

// ─── Status Bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px 6px", backgroundColor:"#0052CC", flexShrink:0 }}>
      <span style={{ fontSize:"12px", fontWeight:600, color:"white", fontFamily:inter }}>9:41</span>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:"2px" }}>
          {[3,5,7,9].map((h,i) => <div key={i} style={{ width:"3px",height:`${h}px`,borderRadius:"1px",backgroundColor:"white" }}/>)}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"2px" }}>
          <div style={{ width:"22px",height:"11px",borderRadius:"2px",border:"1.5px solid white",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",inset:0,right:"3px",backgroundColor:"white",borderRadius:"1px" }}/>
          </div>
          <div style={{ width:"2px",height:"5px",borderRadius:"1px",backgroundColor:"white" }}/>
        </div>
      </div>
    </div>
  );
}

const IconMap: Record<string, React.ElementType> = {
  FileText, Sparkles, Search, UserPlus, CheckCircle2,
  Navigation, MapPin, Wrench, CheckCircle, Clock,
  Users, Bot, Package, Shield, AlertTriangle
};

// ─── Single Timeline Card Component ───────────────────────────────────────────
function TimelineCard({ item, isLast }: { item: any; isLast: boolean }) {
  const isPending = item.state === "pending";
  const isCurrent = item.state === "current";
  const displayColor = isPending ? inkMut : item.color;
  const displayTint = isPending ? divider : item.tint;
  
  const IconComponent = IconMap[item.iconName] || FileText;

  return (
    <div style={{ display: "flex", gap: "12px", paddingBottom: isLast ? 0 : "4px" }}>
      
      {/* Left spine column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "38px", flexShrink: 0 }}>
        {/* Icon circle */}
        <div style={{
          width: "38px", height: "38px", borderRadius: "12px",
          backgroundColor: displayTint,
          border: `1.5px solid ${displayColor}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: isCurrent ? `0 0 0 3px ${blueRing}` : `0 2px 8px ${displayColor}20`,
          zIndex: 1,
        }}>
          <IconComponent size={18} color={displayColor} />
        </div>
        {/* Connector line */}
        {!isLast && (
          <div style={{
            width: "2px", flex: 1,
            background: isPending ? divider : `linear-gradient(180deg, ${displayColor}40, ${border})`,
            marginTop: "6px", minHeight: "24px",
            borderRadius: "1px",
          }} />
        )}
      </div>

      {/* Right card content */}
      <div style={{
        flex: 1,
        backgroundColor: card,
        borderRadius: "16px",
        boxShadow: cardShadow,
        border: `1px solid ${border}`,
        overflow: "hidden",
        marginBottom: isLast ? 0 : "10px",
        opacity: isPending ? 0.6 : 1
      }}>
        {/* Colored accent top strip */}
        <div style={{ height: "3px", background: isPending ? divider : `linear-gradient(90deg, ${displayColor}, ${displayColor}60)` }} />

        <div style={{ padding: "12px 14px 13px" }}>
          {/* Row 1: status badge + time */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
            <span style={{
              fontSize: "12px", fontWeight: 700, color: displayColor,
              backgroundColor: displayTint, borderRadius: "100px",
              padding: "4px 10px", flexShrink: 0,
              border: `1px solid ${displayColor}22`, fontFamily: inter, letterSpacing: "0.02em",
            }}>
              {item.status}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <Clock size={12} color={isPending ? inkFaint : inkSec} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: isPending ? inkFaint : inkSec, fontFamily: inter }}>{item.time}</span>
            </div>
          </div>

          {/* Description */}
          <p style={{
            fontSize: "12.5px", color: isPending ? inkMut : inkSec, fontFamily: inter,
            lineHeight: 1.6, margin: 0,
          }}>
            {item.desc}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function TicketTimelineScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const safeBack = useSafeBack();
  const ticketId = id || "";
  const vendor = useVendor();

  // Derive ticket directly from VendorContext — single source of truth
  const ticket = vendor.getTicketById(ticketId);
  const events = ticket ? buildTimelineFromTicket(ticket) : [];

  if (!ticket) {
    return (
      <MobileLayout
        header={
          <>
            <StatusBar />
            <div style={{ background:`linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`, padding:"10px 20px 18px", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                <button 
                  type="button" 
                  onClick={() => safeBack("/dashboard")}
                  style={{ display:"inline-flex",alignItems:"center",gap:"5px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:"10px",padding:"6px 12px 6px 9px",cursor:"pointer",fontSize:"12.5px",fontWeight:600,color:"white",fontFamily:inter }}
                >
                  <ArrowLeft size={15} color="white"/> Back
                </button>
              </div>
              <h1 style={{ fontSize:"20px",fontWeight:800,color:"white",letterSpacing:"-0.025em",fontFamily:inter,margin:0 }}>Timeline</h1>
            </div>
          </>
        }
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "20px", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <AlertTriangle size={32} color={red} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 8px", fontFamily: inter }}>Ticket Not Found</h2>
          <p style={{ fontSize: "14px", color: inkMut, textAlign: "center", margin: "0 0 24px", fontFamily: inter, lineHeight: 1.5 }}>
            The ticket ID <strong style={{ color: ink }}>{ticketId}</strong> does not exist.
          </p>
          <button 
            type="button" 
            onClick={() => safeBack("/dashboard")}
            style={{ height: "48px", padding: "0 24px", borderRadius: "12px", backgroundColor: blue, border: "none", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", boxShadow: `0 4px 20px rgba(37,99,235,0.22)` }}
          >
            Back to Dashboard
          </button>
        </div>
      </MobileLayout>
    );
  }

  const displayedEvents = events;

  return (
    <MobileLayout
      header={
        <>
          <StatusBar />
          {/* ── Header ── */}
          <div style={{ background: `linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`, padding:"10px 20px 18px", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
              <button 
                type="button" 
                onClick={() => safeBack(`/ticket-details/${ticketId}`)}
                style={{ display:"inline-flex",alignItems:"center",gap:"5px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:"10px",padding:"6px 12px 6px 9px",cursor:"pointer",fontSize:"12.5px",fontWeight:600,color:"white",fontFamily:inter }}
              >
                <ArrowLeft size={15} color="white"/> Back
              </button>
              <div style={{ backgroundColor:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.22)", borderRadius:"100px", padding:"4px 12px" }}>
                <span style={{ fontSize:"12px", fontWeight:700, color:"white", fontFamily:inter }}>{ticketId}</span>
              </div>
            </div>
            <div>
              <h1 style={{ fontSize:"20px",fontWeight:800,color:"white",letterSpacing:"-0.025em",fontFamily:inter,margin:0 }}>Ticket Timeline</h1>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: inter, margin: "4px 0 0" }}>
                Real-time status tracking
              </p>
            </div>
          </div>
        </>
      }
      scrollContainerStyle={{ padding:"20px", paddingBottom:"100px" }}
    >
      {/* ── Scroll Area ── */}
        {displayedEvents.map((item, i) => (
          <TimelineCard key={item.id} item={item} isLast={i === displayedEvents.length - 1} />
        ))}
        <div style={{ height: "20px" }} />
    </MobileLayout>
  );
}
