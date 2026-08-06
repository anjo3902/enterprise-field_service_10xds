import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { TechBottomNavigation } from "./TechBottomNavigation";
import { useTechnician } from "../../contexts/TechnicianContext";
import { JobCard, toJobItem, pmToJobItem } from "./TechJobList";
import { getNotificationIconAndColor, handleNotificationAction } from "./TechNotifications";
import { useSLACountdown } from "../../utils/slaEngine";
import {
  Wrench, CheckCircle2, Clock, AlertTriangle, Bell, Bot,
  MapPin, User, Package, ArrowRight, ChevronRight, Zap,
  Activity, Shield, Star, TrendingUp, ClipboardList,
  Calendar, Wifi, Battery, Signal, Settings2, PlayCircle,
  Target, Navigation2, MessageSquare
} from "lucide-react";

// ─── Design tokens (exact match to VendorDashboard) ──────────────────────────
const blue="#2563EB",blueTint="#EFF6FF",blueDark="#1E40AF",
  green="#16A34A",greenT="#DCFCE7",
  red="#DC2626",redT="#FEF2F2",
  amber="#D97706",amberT="#FFFBEB",
  purple="#7C3AED",purpleT="#F5F3FF",
  teal="#0891B2",tealT="#ECFEFF",
  ink="#0F172A",inkSec="#475569",inkMut="#64748B",inkFaint="#94A3B8",
  bg="#F8FAFC",card="#FFFFFF",border="#E2E8F0",divider="#F1F5F9",
  inter="'Inter','Roboto',sans-serif",
  cardShadow="0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

// getSLA removed — using unified slaEngine.useSLACountdown

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function prioColor(p: string) {
  if (p === "Critical") return { color: red, bg: redT };
  if (p === "High") return { color: amber, bg: amberT };
  if (p === "Medium") return { color: blue, bg: blueTint };
  return { color: inkMut, bg: divider };
}
function statusColor(s: string) {
  if (s === "In Progress") return { color: purple, bg: purpleT };
  if (s === "Assigned" || s === "Technician Accepted") return { color: blue, bg: blueTint };
  if (s === "Travelling") return { color: amber, bg: amberT };
  if (s === "Arrived" || s === "Checked In") return { color: green, bg: greenT };
  if (s === "Completed") return { color: green, bg: greenT };
  return { color: inkMut, bg: divider };
}
function availabilityColor(a: string) {
  if (a === "available") return { label: "Available", color: green, bg: greenT };
  if (a === "on_job") return { label: "On Job", color: purple, bg: purpleT };
  if (a === "unavailable") return { label: "Busy", color: red, bg: redT };
  return { label: "Off Duty", color: inkMut, bg: divider };
}

// ─── StatusBar ────────────────────────────────────────────────────────────────
function StatusBar({ dark = false }: { dark?: boolean }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(id); }, []);
  const c = dark ? "rgba(255,255,255,0.9)" : ink;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 6px", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 700, color: c, fontFamily: inter }}>
        {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <Signal size={12} color={c} /><Wifi size={12} color={c} /><Battery size={14} color={c} />
      </div>
    </div>
  );
}

// ─── SLA Countdown (live via unified engine) ────────────────────────────────
function SLABadge({ deadline, vendorSlaStatus, ticketStatus }: { deadline: string; vendorSlaStatus?: string; ticketStatus?: string }) {
  const sla = useSLACountdown(deadline, vendorSlaStatus, ticketStatus);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: sla.bg, padding: "3px 8px", borderRadius: "8px" }}>
      <Clock size={11} color={sla.color} />
      <span style={{ fontSize: "11px", fontWeight: 700, color: sla.color, fontFamily: inter }}>{sla.remaining}</span>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 16, radius = 8 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: radius, background: "linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
      <span style={{ fontSize: "13px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.01em" }}>{title}</span>
      {action && (
        <button type="button" onClick={onAction} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: blue, fontFamily: inter }}>{action}</span>
          <ChevronRight size={12} color={blue} />
        </button>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color, tint, icon: Icon, onClick }: {
  label: string; value: string | number; sub?: string; color: string; tint: string; icon: React.ElementType; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{ backgroundColor: card, borderRadius: "14px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "13px 12px", cursor: onClick ? "pointer" : "default", display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <div style={{ width: "26px", height: "26px", borderRadius: "8px", backgroundColor: tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={13} color={color} />
        </div>
        <span style={{ fontSize: "9.5px", fontWeight: 600, color: inkMut, fontFamily: inter }}>{label}</span>
      </div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.04em", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: "9.5px", color: inkFaint, fontFamily: inter }}>{sub}</div>}
    </div>
  );
}

// ─── AI Recommendation Card ───────────────────────────────────────────────────
function AICard({ icon: Icon, title, body, color, tint, onClick }: { icon: React.ElementType; title: string; body: string; color: string; tint: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ backgroundColor: card, borderRadius: "14px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "13px", marginBottom: "8px", display: "flex", gap: "10px", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "11.5px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 3px" }}>{title}</p>
        <p style={{ fontSize: "10.5px", color: inkSec, fontFamily: inter, margin: 0, lineHeight: 1.45 }}>{body}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TechHome() {
  const navigate = useNavigate();
  const { profile, performance, jobs, pmTasks, notifications, activeJob, unreadNotificationCount, markNotificationRead } = useTechnician();
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t); }, []);

  // Derived stats
  const assignedJobs = useMemo(() => jobs.filter(j => ["Assigned", "Technician Accepted", "Travelling", "Arrived", "Checked In"].includes(j.status) && j.id !== activeJob?.id), [jobs, activeJob]);
  const completedToday = useMemo(() => jobs.filter(j => j.status === "Completed" && new Date(j.updatedAt).toDateString() === new Date().toDateString()), [jobs]);
  const slaAtRisk = useMemo(() => jobs.filter(j => j.slaStatus === "at_risk" || j.slaStatus === "breached"), [jobs]);
  const activeJobItem = useMemo(() => activeJob ? (activeJob.id?.startsWith("PM-") ? pmToJobItem(activeJob as any, 0) : toJobItem(activeJob as any, 0)) : null, [activeJob]);
  const activePM = useMemo(() => pmTasks.filter(p => ["Accepted","Travelling","Arrived","Maintenance Started","Checklist In Progress"].includes(p.status)), [pmTasks]);
  const avail = availabilityColor(profile.availability);

  const aiRecs = [
    { icon: Shield, title: "Safety Check Required", body: "TKT-0003 involves refrigerant handling. Ensure PPE kit is ready before starting.", color: red, tint: redT },
    { icon: Package, title: "Bring Spare Parts", body: "HVAC Unit C4 likely needs R-410A refrigerant. Confirm stock before dispatch.", color: amber, tint: amberT },
    { icon: Navigation2, title: "Route Advisory", body: "High traffic on Sheikh Zayed Rd. Depart 15 min early for on-time arrival.", color: purple, tint: purpleT },
    { icon: MessageSquare, title: "Customer Note", body: "Al-Mansoor Trading requested arrival before 10:00 AM for Floor 3 access.", color: teal, tint: tealT },
  ];

  const scheduleItems = useMemo(() => {
    const all = [...jobs.filter(j => !["Completed","Closed","Rejected"].includes(j.status)).slice(0, 4)];
    return all;
  }, [jobs]);

  // Sort unread first, then by date, slice top 3
  const recentNotifs = useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.isRead === b.isRead) return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return a.isRead ? 1 : -1;
    }).slice(0, 3);
  }, [notifications]);

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = (
    <div style={{ background: `linear-gradient(135deg, ${blueDark} 0%, ${blue} 100%)`, flexShrink: 0 }}>
      <StatusBar dark />
      <div style={{ padding: "4px 20px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: "11.5px", color: "rgba(255,255,255,0.7)", fontFamily: inter, fontWeight: 500 }}>Good morning 👋</p>
            <h1 style={{ margin: "2px 0 6px", fontSize: "20px", fontWeight: 800, color: "white", fontFamily: inter, letterSpacing: "-0.03em" }}>{profile.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ padding: "3px 10px", borderRadius: "100px", backgroundColor: avail.bg, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: avail.color }} />
                <span style={{ fontSize: "10px", fontWeight: 700, color: avail.color, fontFamily: inter }}>{avail.label}</span>
              </div>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontFamily: inter }}>{profile.role}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
            <button type="button" onClick={() => navigate("/tech/notifications")}
              style={{ width: "38px", height: "38px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
              <Bell size={18} color="white" />
              {unreadNotificationCount > 0 && (
                <div style={{ position: "absolute", top: "5px", right: "5px", width: "16px", height: "16px", borderRadius: "8px", backgroundColor: red, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
                  <span style={{ fontSize: "8px", fontWeight: 800, color: "white", fontFamily: inter }}>{unreadNotificationCount}</span>
                </div>
              )}
            </button>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", backgroundColor: profile.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.3)" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "white", fontFamily: inter }}>{profile.initials}</span>
            </div>
          </div>
        </div>
        {/* SLA subtitle row */}
        <div style={{ marginTop: "12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <div style={{ padding: "4px 10px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", gap: "5px" }}>
            <Wrench size={11} color="rgba(255,255,255,0.8)" />
            <span style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.85)", fontFamily: inter }}>{assignedJobs.length + (activeJob ? 1 : 0)} Active</span>
          </div>
          <div style={{ padding: "4px 10px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", gap: "5px" }}>
            <CheckCircle2 size={11} color="rgba(255,255,255,0.8)" />
            <span style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.85)", fontFamily: inter }}>{completedToday.length} Done Today</span>
          </div>
          {slaAtRisk.length > 0 && (
            <div style={{ padding: "4px 10px", borderRadius: "8px", backgroundColor: "rgba(220,38,38,0.35)", display: "flex", alignItems: "center", gap: "5px" }}>
              <AlertTriangle size={11} color="#FCA5A5" />
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#FCA5A5", fontFamily: inter }}>{slaAtRisk.length} SLA Alert</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <MobileLayout backgroundColor={bg} header={header} bottomNav={<TechBottomNavigation />}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{ padding: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            {[0,1,2,3].map(i => <div key={i} style={{ height: "90px", borderRadius: "14px", backgroundColor: card, border: `1px solid ${border}`, padding: "13px" }}><Skeleton h={12} w="60%" /><div style={{marginTop:8}}><Skeleton h={28} w="40%" /></div></div>)}
          </div>
          <Skeleton h={120} radius={16} /><div style={{marginBottom:16}}/>
          <Skeleton h={80} radius={14} /><div style={{marginBottom:16}}/>
          <Skeleton h={60} radius={14} /><div style={{marginBottom:8}}/>
          <Skeleton h={60} radius={14} />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout backgroundColor={bg} header={header} bottomNav={<TechBottomNavigation />}>
      <style>{`@keyframes pulse-ring{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ padding: "14px 16px" }}>

        {/* ── 1. Today's Summary KPIs ─────────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <SectionHeader title="Today's Summary" action="View All" onAction={() => navigate("/tech/jobs")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
            <KPICard label="Assigned Jobs" value={assignedJobs.length} sub="awaiting action" color={blue} tint={blueTint} icon={ClipboardList} onClick={() => navigate("/tech/jobs")} />
            <KPICard label="Active Job" value={activeJob ? 1 : 0} sub={activeJob ? "in progress" : "none running"} color={purple} tint={purpleT} icon={Wrench} onClick={() => navigate("/tech/jobs")} />
            <KPICard label="PM Tasks" value={activePM.length} sub="assigned to you" color={teal} tint={tealT} icon={Settings2} onClick={() => navigate("/tech/jobs")} />
            <KPICard label="Completed Today" value={completedToday.length} sub="well done!" color={green} tint={greenT} icon={CheckCircle2} onClick={() => navigate("/tech/jobs")} />
          </div>
        </div>

        {/* ── 2. Active Job Spotlight ─────────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <SectionHeader title="Active Job" action={activeJob ? "More" : undefined} onAction={() => activeJob && navigate("/tech/jobs")} />
          {activeJobItem ? (
            <JobCard
              job={activeJobItem}
              onView={() => navigate(`/tech/jobs/${activeJobItem.id}`)}
              onAI={() => navigate("/tech/ai")}
              onReassign={() => {}}
              onAction={() => {}}
              isActionLoading={false}
              isTechnicianBusy={true}
            />
          ) : (
            <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "28px 20px", textAlign: "center" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "16px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Wrench size={22} color={inkFaint} />
              </div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 5px" }}>No Active Job</p>
              <p style={{ fontSize: "11.5px", color: inkMut, fontFamily: inter, margin: "0 0 14px", lineHeight: 1.5 }}>You have no job currently in progress. Check your assigned jobs queue.</p>
              <button type="button" onClick={() => navigate("/tech/jobs")}
                style={{ padding: "8px 20px", borderRadius: "10px", backgroundColor: blueTint, border: `1px solid ${blue}30`, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: blue, fontFamily: inter }}>View Jobs</span>
                <ArrowRight size={12} color={blue} />
              </button>
            </div>
          )}
        </div>

        {/* ── 3. SLA Alerts ───────────────────────────────────────────────── */}
        {slaAtRisk.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <SectionHeader title={`⚠ SLA Alerts (${slaAtRisk.length})`} action="View Jobs" onAction={() => navigate("/tech/jobs")} />
            {slaAtRisk.map(job => {
              const p = prioColor(job.priority);
              return (
                <div key={job.id} onClick={() => navigate(`/tech/jobs/${job.id}`)} style={{ backgroundColor: card, borderRadius: "12px", border: `1px solid ${amber}40`, boxShadow: cardShadow, padding: "11px 13px", marginBottom: "7px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "3px" }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, color: inkFaint, fontFamily: inter }}>{job.id}</span>
                      <div style={{ padding: "2px 6px", borderRadius: "6px", backgroundColor: p.bg }}><span style={{ fontSize: "9px", fontWeight: 700, color: p.color, fontFamily: inter }}>{job.priority}</span></div>
                    </div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: ink, fontFamily: inter, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <User size={10} color={inkFaint} />
                      <span style={{ fontSize: "10px", color: inkMut, fontFamily: inter }}>{job.customerName}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "10px" }}>
                    <SLABadge deadline={job.slaDeadline} />
                    <ChevronRight size={14} color={inkFaint} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 4. Today's Schedule ─────────────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <SectionHeader title="Today's Schedule" action="All Jobs" onAction={() => navigate("/tech/jobs")} />
          {scheduleItems.length === 0 ? (
            <div style={{ backgroundColor: card, borderRadius: "14px", border: `1px solid ${border}`, padding: "22px", textAlign: "center" }}>
              <Calendar size={24} color={inkFaint} style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "12px", color: inkMut, fontFamily: inter, margin: 0 }}>No jobs scheduled today.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: card, borderRadius: "14px", border: `1px solid ${border}`, boxShadow: cardShadow, overflow: "hidden" }}>
              {scheduleItems.map((job, idx) => {
                const s = statusColor(job.status); const isLast = idx === scheduleItems.length - 1;
                return (
                  <div key={job.id} onClick={() => navigate(`/tech/jobs/${job.id}`)} style={{ display: "flex", gap: "12px", padding: "11px 14px", borderBottom: isLast ? "none" : `1px solid ${divider}`, cursor: "pointer", alignItems: "flex-start" }}>
                    {/* Timeline dot */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "2px", flexShrink: 0 }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: s.color, boxShadow: `0 0 0 3px ${s.bg}` }} />
                      {!isLast && <div style={{ width: "2px", flex: 1, backgroundColor: divider, marginTop: "4px", minHeight: "20px" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: ink, fontFamily: inter, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>{job.title}</p>
                        <div style={{ padding: "2px 7px", borderRadius: "6px", backgroundColor: s.bg, flexShrink: 0, marginLeft: "6px" }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: s.color, fontFamily: inter }}>{job.status}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <User size={9} color={inkFaint} />
                          <span style={{ fontSize: "10px", color: inkMut, fontFamily: inter }}>{job.customerName}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <MapPin size={9} color={inkFaint} />
                          <span style={{ fontSize: "10px", color: inkMut, fontFamily: inter, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }}>{job.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 5. AI Recommendations ───────────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <SectionHeader title="AI Recommendations" action="Open AI" onAction={() => navigate("/tech/ai", { state: { jobId: activeJob?.id, fault: "General Query", asset: activeJob?.assetName } })} />
          {activeJob ? (
            aiRecs.map((r, i) => (
              <AICard 
                key={i} 
                {...r} 
                onClick={() => navigate("/tech/ai", { state: { jobId: activeJob.id, fault: r.title, asset: activeJob.assetName } })}
              />
            ))
          ) : (
            <div style={{ backgroundColor: card, borderRadius: "14px", border: `1px solid ${border}`, padding: "22px", textAlign: "center" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "13px", backgroundColor: purpleT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <Bot size={20} color={purple} />
              </div>
              <p style={{ fontSize: "12px", fontWeight: 600, color: ink, fontFamily: inter, margin: "0 0 4px" }}>No Active Job</p>
              <p style={{ fontSize: "10.5px", color: inkMut, fontFamily: inter, margin: "0 0 12px", lineHeight: 1.5 }}>AI recommendations will appear when you have an active job in progress.</p>
              <button type="button" onClick={() => navigate("/tech/ai")} style={{ padding: "7px 16px", borderRadius: "10px", backgroundColor: purpleT, border: `1px solid ${purple}30`, cursor: "pointer" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: purple, fontFamily: inter }}>Open AI Assistant</span>
              </button>
            </div>
          )}
        </div>

        {/* ── 6. Recent Notifications ─────────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <SectionHeader title="Recent Notifications" action="View All" onAction={() => navigate("/tech/notifications")} />
          {recentNotifs.length === 0 ? (
            <div style={{ backgroundColor: card, borderRadius: "14px", border: `1px solid ${border}`, padding: "22px", textAlign: "center" }}>
              <Bell size={22} color={inkFaint} style={{ display: "block", margin: "0 auto 8px" }} />
              <p style={{ fontSize: "12px", color: inkMut, fontFamily: inter, margin: 0 }}>No notifications yet.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: card, borderRadius: "14px", border: `1px solid ${border}`, boxShadow: cardShadow, overflow: "hidden" }}>
              {recentNotifs.map((n, idx) => {
                const isLast = idx === recentNotifs.length - 1;
                const { icon: Icon, c: iconColor, bg: iconBg } = getNotificationIconAndColor(n);
                return (
                  <div key={n.id} onClick={() => handleNotificationAction(n, navigate, markNotificationRead)} style={{ display: "flex", gap: "11px", padding: "12px 14px", borderBottom: isLast ? "none" : `1px solid ${divider}`, cursor: "pointer", alignItems: "flex-start" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={15} color={iconColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 2px" }}>{n.title}</p>
                      <p style={{ fontSize: "10.5px", color: inkSec, fontFamily: inter, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.description}</p>
                      <span style={{ fontSize: "9.5px", color: inkFaint, fontFamily: inter }}>{timeAgo(n.timestamp)}</span>
                    </div>
                    {!n.isRead && <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: blue, flexShrink: 0, marginTop: "5px" }} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 7. Performance Snapshot ─────────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          {/* Force reload */}
          <SectionHeader title="My Performance" action="Full Report" onAction={() => navigate("/tech/performance")} />
          <div style={{ backgroundColor: card, borderRadius: "14px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "13px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { label: "Jobs This Month", value: performance.jobsCompleted, icon: ClipboardList, color: blue, tint: blueTint },
                { label: "SLA Compliance", value: `${performance.slaCompliance}%`, icon: Target, color: green, tint: greenT },
                { label: "Avg Completion", value: `${performance.avgCompletionHrs}h`, icon: Clock, color: amber, tint: amberT },
                { label: "Customer Rating", value: `${performance.customerRating}⭐`, icon: Star, color: purple, tint: purpleT },
              ].map(m => (
                <div key={m.label} style={{ backgroundColor: bg, borderRadius: "10px", padding: "10px 12px", border: `1px solid ${border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
                    <m.icon size={11} color={m.color} />
                    <span style={{ fontSize: "9px", fontWeight: 600, color: inkMut, fontFamily: inter }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.04em" }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 8. Quick Actions ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: "4px" }}>
          <SectionHeader title="Quick Actions" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
            {[
              { label: "View Jobs", icon: ClipboardList, color: blue, tint: blueTint, path: "/tech/jobs" },
              { label: "AI Assistant", icon: Bot, color: purple, tint: purpleT, path: "/tech/ai" },
              { label: "Notifications", icon: Bell, color: amber, tint: amberT, path: "/tech/notifications" },
              { label: "My Profile", icon: User, color: teal, tint: tealT, path: "/tech/profile" },
            ].map(q => (
              <button key={q.label} type="button" onClick={() => navigate(q.path)}
                style={{ backgroundColor: card, borderRadius: "13px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "13px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", backgroundColor: q.tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <q.icon size={15} color={q.color} />
                </div>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: ink, fontFamily: inter }}>{q.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
