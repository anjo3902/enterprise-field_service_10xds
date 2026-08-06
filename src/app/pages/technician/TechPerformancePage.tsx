import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useTechnician } from "../../contexts/TechnicianContext";
import { 
  ArrowLeft, BarChart3, TrendingUp, Shield, Star, Award, 
  Clock, CheckCircle2, AlertTriangle, Zap, Wrench, Activity, Search
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue     = "#2563EB";
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

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: card, padding: "8px 12px", border: `1px solid ${border}`, borderRadius: "8px", boxShadow: cardShadow }}>
        <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: ink, fontFamily: inter }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ margin: 0, fontSize: "11px", color: entry.color || blue, fontWeight: 600, fontFamily: inter }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TechPerformancePage() {
  const navigate = useNavigate();
  const { performance, jobs, pmTasks, workOrders, profile } = useTechnician();
  const [period, setPeriod] = useState("Month");

  // Dynamic derivations
  const d = useMemo(() => {
    // Multipliers to simulate data changes for different periods
    const mult = period === "Today" ? 0.05 : period === "Week" ? 0.25 : period === "Quarter" ? 3 : 1;
    // Slight variance for percentages
    const variance = period === "Today" ? 0.92 : period === "Week" ? 0.96 : period === "Quarter" ? 1.02 : 1;

    // Generate trend points anchored to current metric
    const genTrend = (base: number, varRange: number, pts: number = 6) => 
      Array.from({ length: pts }).map((_, i) => ({
        name: `P${i+1}`,
        value: i === pts - 1 ? base * variance : Math.max(0, Math.round(base * variance + (Math.random() * varRange * 2 - varRange)))
      }));

    // Data points based on context
    const baseCompleted = jobs.filter(j => j.status === "Completed" || j.status === "Closed").length || performance.jobsCompleted;
    const completedJobs = Math.max(1, Math.round(baseCompleted * mult));
    
    // Open jobs are current state, so they don't scale with period length. Add slight jitter for realism.
    const baseOpen = jobs.filter(j => j.status !== "Completed" && j.status !== "Closed" && j.status !== "Rejected").length || profile.activeJobCount;
    const openJobs = Math.max(1, Math.round(baseOpen * (1 + (Math.random() * 0.2 - 0.1))));
    
    // PMs and AMCs
    const pmCount = Math.max(1, Math.round((pmTasks.filter(t => t.type === "Routine").length || 8) * mult));
    const amcCount = Math.max(1, Math.round((pmTasks.filter(t => t.type === "AMC").length || 4) * mult));
    const emergencyCount = Math.max(1, Math.round((jobs.filter(j => j.priority === "Critical" || j.priority === "High").length || 2) * mult));
    const warrantyCount = Math.max(1, Math.round((jobs.filter(j => j.title && j.title.includes("Warranty")).length || 1) * mult));

    const ticketsDistribution = [
      { name: "Emergency", value: emergencyCount },
      { name: "PM Tasks", value: pmCount },
      { name: "Standard", value: Math.max(1, completedJobs - emergencyCount) },
      { name: "AMC Visits", value: amcCount }
    ];

    const monthlyHistory = performance.monthlyHistory.map(m => ({
      name: m.month,
      jobs: Math.max(1, Math.round(m.jobs * mult)),
      sla: Math.min(100, m.sla * variance)
    })).reverse();

    return {
      completedJobs,
      openJobs,
      pmVisits: pmCount,
      warrantyInspections: warrantyCount,
      amcVisits: amcCount,
      emergencyRepairs: emergencyCount,

      slaComplianceTrend: genTrend(performance.slaCompliance, 4).map(p => ({ ...p, value: Math.min(100, p.value) })),
      csatTrend: genTrend(performance.customerRating, 0.3).map(p => ({ ...p, value: Math.min(5, Math.max(1, p.value)).toFixed(1) })),
      firstTimeFix: Math.min(100, Math.round(performance.firstTimeFix * variance)),
      ftfTrend: genTrend(performance.firstTimeFix, 3).map(p => ({ ...p, value: Math.min(100, p.value) })),
      
      avgCompletionTime: (performance.avgCompletionHrs * (1 / variance)).toFixed(1),
      avgTravelTime: (0.8 * (1 / variance)).toFixed(1),
      
      monthlyHistory,
      ticketsDistribution
    };
  }, [performance, jobs, pmTasks, profile, period]);

  const PIE_COLORS = [red, amber, blue, green];

  const Header = (
    <div style={{ background: `linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)`, padding: "20px 20px 20px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <button type="button" onClick={() => navigate("/tech/home")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}>
          <ArrowLeft size={15} color="white" /> Back
        </button>
      </div>
      <h1 style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: "white", margin: "0 0 4px" }}>
        My Performance
      </h1>
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", fontFamily: inter, margin: 0, lineHeight: 1.4 }}>
        Personal performance overview
      </p>

      {/* Time Period Filter */}
      <div style={{ display: "flex", gap: "8px", marginTop: "16px", backgroundColor: "rgba(0,0,0,0.2)", padding: "4px", borderRadius: "12px" }}>
        {["Today", "Week", "Month", "Quarter"].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              flex: 1, padding: "8px", borderRadius: "8px", border: "none",
              backgroundColor: period === p ? "white" : "transparent",
              color: period === p ? ink : "white",
              fontSize: "12px", fontWeight: 700, fontFamily: inter, cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <MobileLayout header={Header} showBottomNav={false} scrollContainerStyle={{ paddingBottom: "20px", backgroundColor: bg }}>
      <div style={{ padding: "16px" }}>

        {/* ── Summary KPIs Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <CheckCircle2 size={16} color={blue} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter }}>COMPLETED</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, fontFamily: inter, color: ink, marginBottom: "4px" }}>{d.completedJobs}</div>
            <div style={{ fontSize: "11px", color: green, fontFamily: inter, fontWeight: 600 }}>+2 this week</div>
          </div>

          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Shield size={16} color={green} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter }}>SLA COMPLIANCE</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, fontFamily: inter, color: ink, marginBottom: "4px" }}>{performance.slaCompliance}%</div>
            <div style={{ fontSize: "11px", color: green, fontFamily: inter, fontWeight: 600 }}>+1.2% from last month</div>
          </div>

          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Star size={16} color={amber} fill={amber} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter }}>RATING</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, fontFamily: inter, color: ink, marginBottom: "4px" }}>{performance.customerRating.toFixed(1)}</div>
            <div style={{ fontSize: "11px", color: inkSec, fontFamily: inter, fontWeight: 500 }}>Out of 5.0</div>
          </div>

          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Zap size={16} color={purple} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter }}>FTF RATE</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, fontFamily: inter, color: ink, marginBottom: "4px" }}>{performance.firstTimeFix}%</div>
            <div style={{ fontSize: "11px", color: inkSec, fontFamily: inter, fontWeight: 500 }}>First-time fix rate</div>
          </div>

        </div>

        {/* ── Job Type Breakdown ── */}
        <Widget title="Job Breakdown" icon={BarChart3} color={blue}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            <div style={{ backgroundColor: bg, padding: "12px", borderRadius: "12px", border: `1px solid ${border}` }}>
              <div style={{ fontSize: "12px", color: inkMut, fontWeight: 600, fontFamily: inter }}>Active Jobs</div>
              <div style={{ fontSize: "18px", color: blue, fontWeight: 800, fontFamily: inter }}>{d.openJobs}</div>
            </div>
            <div style={{ backgroundColor: bg, padding: "12px", borderRadius: "12px", border: `1px solid ${border}` }}>
              <div style={{ fontSize: "12px", color: inkMut, fontWeight: 600, fontFamily: inter }}>Emergency</div>
              <div style={{ fontSize: "18px", color: red, fontWeight: 800, fontFamily: inter }}>{d.emergencyRepairs}</div>
            </div>
            <div style={{ backgroundColor: bg, padding: "12px", borderRadius: "12px", border: `1px solid ${border}` }}>
              <div style={{ fontSize: "12px", color: inkMut, fontWeight: 600, fontFamily: inter }}>PM Visits</div>
              <div style={{ fontSize: "18px", color: amber, fontWeight: 800, fontFamily: inter }}>{d.pmVisits}</div>
            </div>
            <div style={{ backgroundColor: bg, padding: "12px", borderRadius: "12px", border: `1px solid ${border}` }}>
              <div style={{ fontSize: "12px", color: inkMut, fontWeight: 600, fontFamily: inter }}>AMC Visits</div>
              <div style={{ fontSize: "18px", color: green, fontWeight: 800, fontFamily: inter }}>{d.amcVisits}</div>
            </div>
          </div>

          <div style={{ height: "180px", display: "flex", alignItems: "center", marginTop: "16px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.ticketsDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                  {d.ticketsDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "120px" }}>
              {d.ticketsDistribution.map((entry, index) => (
                <div key={index}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>{entry.name}</span>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, paddingLeft: "14px" }}>{entry.value} ({Math.round((entry.value / d.completedJobs) * 100)}%)</div>
                </div>
              ))}
            </div>
          </div>
        </Widget>

        {/* ── Performance Trends ── */}
        <Widget title="Monthly Workload" icon={TrendingUp} color={purple}>
          <div style={{ height: "180px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.monthlyHistory} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={border} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="jobs" name="Total Jobs" fill={purple} radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        <Widget title="SLA Compliance Trend" icon={Shield} color={green} value={`${performance.slaCompliance}%`} subtitle="Target: 95%">
          <div style={{ height: "160px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.slaComplianceTrend} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={border} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: inkMut }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="value" name="Compliance %" stroke={green} strokeWidth={3} dot={{ fill: green, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        {/* Grid for Smaller Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter, marginBottom: "4px", textTransform: "uppercase" }}>Avg Completion</div>
            <div style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: ink, marginBottom: "4px" }}>{d.avgCompletionTime}h</div>
            <div style={{ fontSize: "11px", color: inkSec, fontFamily: inter }}>Per ticket</div>
          </div>
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: inkMut, fontFamily: inter, marginBottom: "4px", textTransform: "uppercase" }}>Avg Travel</div>
            <div style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, color: ink, marginBottom: "4px" }}>{d.avgTravelTime}h</div>
            <div style={{ fontSize: "11px", color: inkSec, fontFamily: inter }}>Between sites</div>
          </div>
        </div>

        {/* ── AI Insights ── */}
        <div style={{ backgroundColor: "#F5F3FF", borderRadius: "16px", border: `1px solid #7C3AED30`, padding: "20px", marginBottom: "16px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-20px", right: "-10px", opacity: 0.1 }}>
            <Activity size={120} color="#7C3AED" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", position: "relative", zIndex: 1 }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #7C3AED, #4F46E5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={14} color="white" />
            </div>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#4C1D95", fontFamily: inter, letterSpacing: "-0.01em" }}>AI Performance Insights</span>
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: "13.5px", color: "#4C1D95", fontFamily: inter, lineHeight: 1.6, position: "relative", zIndex: 1, fontWeight: 500 }}>
            <li>You resolve HVAC jobs <strong>18% faster</strong> than average.</li>
            <li>Your first-time fix rate improved by <strong>6%</strong> this quarter.</li>
            <li>Most repeat issues occur on Generator systems.</li>
            <li style={{ marginTop: "8px", color: "#6D28D9" }}><strong>Recommended training:</strong> Advanced Chiller Diagnostics</li>
          </ul>
        </div>

        {/* ── Achievements ── */}
        <Widget title="Achievements" icon={Award} color={amber}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {[
              { icon: CheckCircle2, title: "100 Jobs", sub: "Completed", color: blue, bg: blueTint },
              { icon: Shield, title: "30 Days", sub: "No SLA Breach", color: green, bg: greenT },
              { icon: Star, title: "Top Rated", sub: "Technician", color: amber, bg: amberT },
            ].map((a, i) => (
              <div key={i} style={{ width: "100%", aspectRatio: "1", padding: "8px 4px", borderRadius: "16px", backgroundColor: a.bg, border: `1px solid ${a.color}30`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", boxSizing: "border-box", overflow: "hidden" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", flexShrink: 0 }}>
                  <a.icon size={18} color={a.color} />
                </div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: a.color, fontFamily: inter, lineHeight: 1.1, wordBreak: "break-word", padding: "0 2px", width: "100%" }}>{a.title}</div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: a.color, fontFamily: inter, opacity: 0.8, marginTop: "2px", wordBreak: "break-word", padding: "0 2px", width: "100%" }}>{a.sub}</div>
              </div>
            ))}
          </div>
        </Widget>

        {/* ── Certifications ── */}
        <Widget title="Skills & Certifications" icon={Wrench} color={blue}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
            {profile.skills.map(s => (
              <div key={s} style={{ padding: "6px 12px", borderRadius: "100px", backgroundColor: bg, border: `1px solid ${border}`, fontSize: "12px", color: inkSec, fontFamily: inter, fontWeight: 500 }}>
                {s}
              </div>
            ))}
          </div>

          <div style={{ height: "1px", backgroundColor: divider, margin: "0 -16px 16px" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {profile.certifications.map(c => (
              <div key={c} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: amberT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Award size={16} color={amber} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter }}>{c}</div>
                  <div style={{ fontSize: "12px", color: inkMut, fontFamily: inter, marginTop: "2px" }}>Valid until Dec 2026</div>
                </div>
              </div>
            ))}
          </div>
        </Widget>

        {/* ── Recent Customer Feedback ── */}
        <Widget title="Recent Customer Feedback" icon={Star} color={amber}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { name: "Al-Mansoor Trading", asset: "HVAC Unit C4", rating: 5, date: "2 days ago", comment: "Excellent and quick service. Very professional." },
              { name: "Tech Park Building", asset: "Generator Alpha", rating: 5, date: "1 week ago", comment: "Resolved the issue perfectly on the first visit." },
              { name: "Downtown Mall", asset: "Chiller System", rating: 4, date: "2 weeks ago", comment: "Good work, but arrived slightly later than expected due to traffic." },
            ].map((f, i) => (
              <div key={i} style={{ borderBottom: i === 2 ? "none" : `1px solid ${divider}`, paddingBottom: i === 2 ? 0 : "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{f.name}</span>
                  <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>{f.date}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <div style={{ display: "flex" }}>
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} size={12} color={idx < f.rating ? amber : border} fill={idx < f.rating ? amber : "none"} />
                    ))}
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: inkSec, fontFamily: inter }}>• {f.asset}</span>
                </div>
                <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: 0, lineHeight: 1.4 }}>"{f.comment}"</p>
              </div>
            ))}
          </div>
        </Widget>

        {/* ── Activity Timeline ── */}
        <Widget title="Recent Milestones" icon={Clock} color={inkSec}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0", position: "relative" }}>
            <div style={{ position: "absolute", left: "11px", top: "10px", bottom: "10px", width: "2px", backgroundColor: divider, zIndex: 0 }} />
            
            {[
              { title: "Completed HVAC Repair", desc: "TKT-0012 resolved ahead of SLA", time: "Today, 14:30", type: "job", color: blue },
              { title: "Received 5-Star Rating", desc: "Feedback from Al-Mansoor Trading", time: "Yesterday", type: "rating", color: amber },
              { title: "Completed PM Visit", desc: "Quarterly check for Generator Alpha", time: "2 days ago", type: "pm", color: green },
              { title: "Training Completed", desc: "Advanced Chiller Systems", time: "Last Week", type: "training", color: purple },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", gap: "16px", position: "relative", zIndex: 1, paddingBottom: i === 3 ? 0 : "24px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "12px", backgroundColor: card, border: `2px solid ${m.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "4px", backgroundColor: m.color }} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter }}>{m.title}</div>
                  <div style={{ fontSize: "13px", color: inkSec, fontFamily: inter, marginTop: "2px", marginBottom: "4px" }}>{m.desc}</div>
                  <div style={{ fontSize: "11px", color: inkMut, fontFamily: inter, fontWeight: 500 }}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Widget>

      </div>
    </MobileLayout>
  );
}
