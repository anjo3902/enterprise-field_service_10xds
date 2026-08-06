import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { MobileLayout } from './ui/MobileLayout';
import { useAnalyticsContext } from '../contexts/AnalyticsContext';
import { handleBackNavigation } from '../utils/navigation';
import { 
  ArrowLeft, User, PhoneCall, FileText, 
  CheckCircle2, AlertTriangle, Clock, TrendingUp,
  TrendingDown, Star, MessageSquare, Briefcase,
  History, Calendar
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

export function TechnicianDetailsScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useAnalyticsContext();
  const tech = data.techs.find(t => t.id === id);

  if (!tech) {
    return (
      <MobileLayout>
        <StatusBar />
        <div style={{ padding: "20px", textAlign: "center", marginTop: "40px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter }}>Technician Not Found</h2>
          <button onClick={() => navigate(-1)} style={{ marginTop: "20px", padding: "10px 20px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontWeight: 700, fontFamily: inter }}>Go Back</button>
        </div>
      </MobileLayout>
    );
  }

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

  const pc = getSLAColor(tech.slaPct);
  const pb = getSLAColorBg(tech.slaPct);

  const mockFeedback = data.rawTickets
    .filter(t => t.technician === tech.name && t.status === "Resolved")
    .slice(0, 3) // show max 3 recent
    .map((t, idx) => ({
      id: t.id,
      customer: `Department: ${t.costCategory}`,
      rating: t.csat,
      comment: t.csat >= 4 ? "Very professional and fixed the issue effectively." : (t.csat === 3 ? "Average service, took a bit long." : "Poor service, issue not fully resolved."),
      date: t.date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})
    }));

  const mockAssignments = data.rawTickets
    .filter(t => t.technician === tech.name && t.status === "Pending")
    .map(t => ({
      id: t.id,
      issue: `Maintenance Request - ${t.costCategory}`,
      priority: Math.random() > 0.7 ? "Critical" : "Medium",
      status: "In Progress"
    }));

  return (
    <MobileLayout
      showBottomNav={false}
      backgroundColor={bg}
      header={
        <>
          <StatusBar />
          <div style={{ background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <button type="button" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}>
                <ArrowLeft size={15} color="white" /> Back
              </button>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "60px", height: "60px", borderRadius: "16px", backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "20px", fontWeight: 800, color: blue, fontFamily: inter }}>{tech.name.split(" ").map(n => n[0]).join("")}</span>
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, margin: "0 0 4px" }}>{tech.name}</h1>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontFamily: inter, margin: 0 }}>{tech.department} • {tech.skillLevel} • {tech.availability}</p>
              </div>
            </div>
          </div>
        </>
      }
    >
      <div style={{ padding: "20px" }}>
        
        {/* Key Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          <div style={{ backgroundColor: card, borderRadius: "16px", padding: "16px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "8px", backgroundColor: pb, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={14} color={pc} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: inkSec, fontFamily: inter }}>SLA Score</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
              <span style={{ fontSize: "28px", fontWeight: 800, color: ink, fontFamily: inter, lineHeight: 1 }}>{tech.slaPct}%</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: pc, fontFamily: inter, paddingBottom: "4px" }}>{tech.slaPct >= 95 ? "Excellent" : "Needs Review"}</span>
            </div>
          </div>
          
          <div style={{ backgroundColor: card, borderRadius: "16px", padding: "16px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "8px", backgroundColor: amberT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Star size={14} color={amber} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: inkSec, fontFamily: inter }}>Rating</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
              <span style={{ fontSize: "28px", fontWeight: 800, color: ink, fontFamily: inter, lineHeight: 1 }}>{tech.customerRating}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: inkMut, fontFamily: inter, paddingBottom: "4px" }}>/ 5.0</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "20px", boxShadow: cardShadow }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 16px", fontFamily: inter }}>Performance Summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "12px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>Completed Tickets</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={14} color={green} />
                <p style={{ fontSize: "15px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{tech.completedTickets}</p>
              </div>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>SLA Breaches</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertTriangle size={14} color={tech.escalations > 0 ? red : inkMut} />
                <p style={{ fontSize: "15px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{tech.escalations}</p>
              </div>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>Avg Resolution</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} color={blue} />
                <p style={{ fontSize: "15px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{tech.avgResolutionTime}</p>
              </div>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: inkMut, margin: "0 0 4px", fontFamily: inter }}>Current Workload</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Briefcase size={14} color={amber} />
                <p style={{ fontSize: "15px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{tech.workload}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Assignments */}
        <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "20px", boxShadow: cardShadow }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: 0, fontFamily: inter }}>Current Assignments</h2>
            <span style={{ fontSize: "12px", fontWeight: 700, color: blue, backgroundColor: blueTint, padding: "4px 8px", borderRadius: "100px", fontFamily: inter }}>{tech.activeTickets} Active</span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {tech.activeTickets > 0 ? mockAssignments.map(assignment => (
              <div key={assignment.id} style={{ padding: "12px", borderRadius: "12px", backgroundColor: bg, border: `1px solid ${border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: inkMut, fontFamily: inter }}>{assignment.id}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: assignment.priority === "Critical" ? red : amber, backgroundColor: assignment.priority === "Critical" ? redT : amberT, padding: "2px 6px", borderRadius: "4px", fontFamily: inter }}>{assignment.priority}</span>
                </div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 8px", fontFamily: inter }}>{assignment.issue}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={12} color={inkSec} />
                  <span style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{assignment.status}</span>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: "13px", color: inkMut, fontFamily: inter, margin: 0, textAlign: "center", padding: "12px 0" }}>No active assignments.</p>
            )}
          </div>
        </div>

        {/* Customer Feedback */}
        <div style={{ backgroundColor: card, borderRadius: "20px", border: `1px solid ${border}`, padding: "20px", marginBottom: "20px", boxShadow: cardShadow }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: ink, margin: "0 0 16px", fontFamily: inter }}>Recent Feedback</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {mockFeedback.map((fb, idx) => (
              <div key={fb.id} style={{ paddingBottom: idx < mockFeedback.length - 1 ? "16px" : "0", borderBottom: idx < mockFeedback.length - 1 ? `1px solid ${divider}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{fb.customer}</span>
                  <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>{fb.date}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "2px", marginBottom: "6px" }}>
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} size={12} color={star <= fb.rating ? amber : divider} fill={star <= fb.rating ? amber : divider} />
                  ))}
                </div>
                <p style={{ fontSize: "13px", color: inkSec, margin: 0, fontFamily: inter, lineHeight: 1.5 }}>"{fb.comment}"</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
