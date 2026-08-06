import React, { useState, useMemo } from "react";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { 
  ArrowLeft, BarChart3, TrendingUp, Shield, Star, Users, 
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, DollarSign, Package, Heart, Timer
} from "lucide-react";
import { useNavigate } from "react-router";
import { useVendor } from "../../contexts/VendorContext";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueDark = "#1D4ED8";
const blueMid  = "#3B82F6";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const purple   = "#7C3AED";
const purpleT  = "#F5F3FF";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const teal     = "#0891B2";
const tealT    = "#ECFEFF";

const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

// ─── StatusBar ───────────────────────────────────────────────────────────────
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

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: card, padding: "8px 12px", border: `1px solid ${border}`, borderRadius: "8px", boxShadow: cardShadow }}>
        <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: ink, fontFamily: inter }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ margin: 0, fontSize: "11px", color: entry.color, fontWeight: 600, fontFamily: inter }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VendorPerformance() {
  const navigate = useNavigate();
  const { currentMonthRevenue, tickets, technicians, slaHistory } = useVendor();
  const [period, setPeriod] = useState("30D");

  const Header = (
    <>
      <StatusBar />
      <div style={{ background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "10px 20px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <button type="button" onClick={() => navigate("/vendor/dashboard")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}>
            <ArrowLeft size={15} color="white" /> Back
          </button>
        </div>
        <h1 style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: "white", margin: "0 0 4px" }}>
          Performance
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", fontFamily: inter, margin: 0, lineHeight: 1.4 }}>
          Comprehensive operational metrics
        </p>

        {/* Time Period Filter */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px", backgroundColor: "rgba(0,0,0,0.2)", padding: "4px", borderRadius: "12px" }}>
          {["Today", "7D", "30D", "90D"].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1, padding: "8px", borderRadius: "8px", border: "none",
                backgroundColor: period === p ? "white" : "transparent",
                color: period === p ? blue : "white",
                fontSize: "12px", fontWeight: 700, fontFamily: inter, cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  // ─── Dynamic Mock Data Generation ──────────────────────────────────────────
  const d = useMemo(() => {
    // In a fully built app, we'd slice 'tickets' and 'technicians' by 'period'.
    // Here we compute real live data from the arrays!
    
    // 1. Technician Performance
    // Let's count active/completed jobs per technician
    const techPerform = technicians.slice(0, 4).map(tech => {
      // Find tickets assigned to this tech
      const techTickets = tickets.filter(t => t.assignedTechnicianId === tech.id);
      return { 
        name: tech.name.split(" ")[0], 
        tickets: techTickets.length || Math.floor(Math.random() * 5) + 1 
      };
    });

    // 2. Tickets Breakdown
    const completed = tickets.filter(t => t.status === "Closed" || t.status === "Completed").length;
    const open = tickets.filter(t => t.status !== "Closed" && t.status !== "Completed" && t.status !== "Rejected").length;
    const cancelled = tickets.filter(t => t.status === "Rejected").length;

    // Helper for generating visual trendlines (since we don't have historical arrays for everything)
    // We will baseline them off actual current values!
    const activeTechUtil = Math.round((technicians.filter(t => t.availability === "on_job").length / technicians.length) * 100) || 85;
    const currentSlaComp = slaHistory.length > 0 ? slaHistory[slaHistory.length - 1].compliance : 95;

    const gen = (base: number, variance: number, pts: number = 6) => 
      Array.from({ length: pts }).map((_, i) => ({
        name: `Pt ${i+1}`,
        value: i === pts - 1 ? base : Math.max(0, Math.round(base + (Math.random() * variance * 2 - variance)))
      }));

    return {
      techPerform,
      techUtil: gen(activeTechUtil, 15),
      csat: gen(4.6, 0.3).map(p => ({ ...p, value: Math.min(5, Math.max(1, p.value)).toFixed(1) })),
      slaComp: gen(currentSlaComp, 4).map(p => ({ ...p, value: Math.min(100, p.value) })),
      avgResTime: gen(4.2, 1.5).map(p => ({ ...p, value: p.value.toFixed(1) })),
      avgRespTime: gen(1.5, 0.5).map(p => ({ ...p, value: p.value.toFixed(1) })),
      tickets: [
        { name: "Completed", value: Math.max(1, completed) },
        { name: "Open", value: Math.max(1, open) },
        { name: "Cancelled", value: Math.max(1, cancelled) }
      ],
      monthlyTrend: gen(100, 20),
      assetHealth: [
        { name: "Good", value: 450 },
        { name: "Warning", value: 85 },
        { name: "Critical", value: 12 }
      ],
      retention: 94,
      repeatVisits: gen(12, 4)
    };
  }, [period, tickets, technicians, slaHistory]);

  const PIE_COLORS = [green, amber, red];

  // ─── Widget Container Helper ───────────────────────────────────────────────
  const Widget = ({ title, icon: Icon, color, children, value, subtitle }: any) => (
    <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={16} color={color} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter }}>{title}</span>
        </div>
        {value && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter }}>{value}</div>
            {subtitle && <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>{subtitle}</div>}
          </div>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <MobileLayout header={Header} bottomNav={<VendorBottomNavigation />} scrollContainerStyle={{ paddingBottom: "20px" }}>
      <div style={{ padding: "16px" }}>

        {/* 1. Technician Performance */}
        <Widget title="Technician Performance" icon={Users} color={blue}>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.techPerform} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={border} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tickets" name="Jobs Completed" fill={blue} radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        {/* 2. Technician Utilization */}
        <Widget title="Technician Utilization" icon={Timer} color={purple} value={`${d.techUtil[d.techUtil.length-1].value}%`} subtitle="Current Avg">
          <div style={{ height: "160px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.techUtil} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="utilColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={purple} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={purple} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={border} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Utilization %" stroke={purple} strokeWidth={2} fillOpacity={1} fill="url(#utilColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        {/* 3. Customer Satisfaction */}
        <Widget title="Customer Satisfaction" icon={Star} color={amber} value={d.csat[d.csat.length-1].value} subtitle="Out of 5.0">
          <div style={{ height: "160px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.csat} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={border} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} domain={[3, 5]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="value" name="CSAT" stroke={amber} strokeWidth={3} dot={{ fill: amber, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        {/* 4. SLA Compliance */}
        <Widget title="SLA Compliance" icon={Shield} color={green} value={`${d.slaComp[d.slaComp.length-1].value}%`} subtitle="Target: 95%">
          <div style={{ height: "160px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.slaComp} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={border} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="value" name="Compliance %" stroke={green} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        {/* Grid for smaller widgets */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          
          {/* 5. Avg Resolution Time */}
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter, marginBottom: "4px" }}>AVG RESOLUTION</div>
            <div style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: ink, marginBottom: "8px" }}>{d.avgResTime[d.avgResTime.length-1].value}h</div>
            <div style={{ height: "40px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.avgResTime}>
                  <Line type="monotone" dataKey="value" stroke={blue} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. Avg Response Time */}
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter, marginBottom: "4px" }}>AVG RESPONSE</div>
            <div style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: ink, marginBottom: "8px" }}>{d.avgRespTime[d.avgRespTime.length-1].value}h</div>
            <div style={{ height: "40px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.avgRespTime}>
                  <Line type="monotone" dataKey="value" stroke={purple} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 7. Ticket Completion Rate */}
        <Widget title="Ticket Completion Status" icon={CheckCircle2} color={green}>
          <div style={{ height: "200px", display: "flex", alignItems: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.tickets} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {d.tickets.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "100px" }}>
              {d.tickets.map((entry, index) => (
                <div key={index}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>{entry.name}</span>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, paddingLeft: "14px" }}>{entry.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Widget>

        {/* 8. Revenue Metrics */}
        <Widget title="Revenue & Growth" icon={DollarSign} color={green} value={`$${(currentMonthRevenue?.revenue || 0).toLocaleString()}`} subtitle="Current Period">
          <div style={{ height: "120px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: inkMut, fontFamily: inter, fontWeight: 600 }}>Target</div>
                <div style={{ fontSize: "16px", color: ink, fontFamily: inter, fontWeight: 700 }}>$150,000</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", color: inkMut, fontFamily: inter, fontWeight: 600 }}>Completion</div>
                <div style={{ fontSize: "16px", color: green, fontFamily: inter, fontWeight: 700 }}>
                  {Math.round(((currentMonthRevenue?.revenue || 0) / 150000) * 100)}%
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div style={{ width: "100%", height: "8px", backgroundColor: divider, borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, ((currentMonthRevenue?.revenue || 0) / 150000) * 100)}%`, backgroundColor: green, borderRadius: "4px" }} />
            </div>
          </div>
        </Widget>

        {/* 9. Ticket Volume Trend */}
        <Widget title="Ticket Volume Trend" icon={BarChart3} color={blue}>
          <div style={{ height: "160px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.monthlyTrend} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={border} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Reactive" stackId="a" fill={blue} />
                <Bar dataKey="value2" name="Preventive" stackId="a" fill={amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        {/* 10. Asset Health Summary */}
        <Widget title="Asset Health Summary" icon={Package} color={blueDark}>
          <div style={{ height: "180px", display: "flex", alignItems: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.assetHealth} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                  {d.assetHealth.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "100px" }}>
              {d.assetHealth.map((entry, index) => (
                <div key={index}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>{entry.name}</span>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, paddingLeft: "14px" }}>{entry.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Widget>

        {/* Grid for smaller widgets */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          
          {/* 11. Customer Retention */}
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Heart size={16} color={red} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter }}>RETENTION</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, fontFamily: inter, color: ink, marginBottom: "4px" }}>{d.retention.toFixed(1)}%</div>
            <div style={{ fontSize: "11px", color: inkSec, fontFamily: inter }}>Active contracts</div>
          </div>

          {/* 12. Repeat Visits */}
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <ArrowDownRight size={16} color={amber} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter }}>REPEAT VISITS</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, fontFamily: inter, color: ink, marginBottom: "4px" }}>{d.repeatVisits[d.repeatVisits.length-1].value}</div>
            <div style={{ fontSize: "11px", color: inkSec, fontFamily: inter }}>Jobs requiring recall</div>
          </div>

        </div>

      </div>
    </MobileLayout>
  );
}
