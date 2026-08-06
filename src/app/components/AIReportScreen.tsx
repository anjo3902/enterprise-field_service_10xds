import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { MobileLayout } from './ui/MobileLayout';
import { handleBackNavigation } from '../utils/navigation';
import { useAnalyticsContext } from '../contexts/AnalyticsContext';
import { 
  ArrowLeft, Sparkles, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle2, Zap, Users, 
  Activity, DollarSign, Target, ListChecks,
  AlertCircle
} from 'lucide-react';

// --- Tokens ---
const blue = "#2563EB"; const blueDark = "#1D4ED8"; const blueMid = "#3B82F6"; const blueTint = "#EFF6FF";
const green = "#16A34A"; const greenT = "#DCFCE7";
const orange = "#EA580C"; const orangeT = "#FFF7ED";
const red = "#DC2626"; const redT = "#FEF2F2";
const amber = "#D97706"; const amberT = "#FFFBEB";
const purple = "#9333EA"; const purpleT = "#F3E8FF";
const ink = "#0F172A"; const inkSec = "#475569"; const inkMut = "#64748B"; const inkFaint = "#94A3B8";
const bg = "#F8FAFC"; const card = "#FFFFFF"; const border = "#E2E8F0"; const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
const blueShadow = "0 8px 24px rgba(37,99,235,0.25)";

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

function SectionCard({ title, icon: Icon, color, children, highlight = false }: { title: string, icon: React.ElementType, color: string, children: React.ReactNode, highlight?: boolean }) {
  return (
    <div style={{ backgroundColor: highlight ? `${color}0A` : card, borderRadius: "20px", boxShadow: cardShadow, border: `1px solid ${highlight ? color : border}`, padding: "20px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "10px", backgroundColor: `${color}1A`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={color} />
        </div>
        <h2 style={{ fontSize: "16px", fontWeight: 800, color: ink, fontFamily: inter, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function AIReportScreen() {
  const navigate = useNavigate();
  const { period, data } = useAnalyticsContext();

  // Derive dynamic insights from data
  const report = useMemo(() => {
    const { kpi, techs, costData, rawTickets, csat } = data;

    // 1. Executive Summary
    const execSummary = `Over the past ${period}, the organization handled ${kpi.totalRequests} service requests with an average response time of ${kpi.avgResponse.toFixed(1)} hours. The overall resolution rate stands at ${kpi.resRate}%, marking a ${Math.abs(kpi.resTrend)}% ${kpi.resTrend >= 0 ? 'increase' : 'decrease'} from the previous period. Customer satisfaction is currently at ${kpi.avgCsat.toFixed(1)}/5.0.`;

    // 2. Key Operational Findings
    const findings = [];
    if (kpi.reqTrend > 10) findings.push(`Ticket volume has surged by ${kpi.reqTrend}% compared to the previous period.`);
    else if (kpi.reqTrend < -10) findings.push(`Ticket volume has decreased by ${Math.abs(kpi.reqTrend)}% compared to the previous period.`);
    
    if (kpi.avgResponse > 2) findings.push(`Average response time (${kpi.avgResponse.toFixed(1)}h) is currently exceeding the 2-hour target.`);
    else findings.push(`Response times are healthy, averaging ${kpi.avgResponse.toFixed(1)}h across all tickets.`);
    
    if (csat.unsatisfied > 10) findings.push(`Customer dissatisfaction is at ${csat.unsatisfied}%, indicating potential service quality issues.`);

    // 3. Top Risks
    const risks = [];
    const highWorkloadTechs = techs.filter(t => t.workload > 80);
    if (highWorkloadTechs.length > 0) {
      risks.push({ title: "Technician Burnout Risk", desc: `${highWorkloadTechs.length} technician(s) operating at >80% capacity.`, level: "High" });
    }
    if (kpi.resRate < 85) {
      risks.push({ title: "Resolution Backlog", desc: `Resolution rate dropped to ${kpi.resRate}%, building a backlog of pending tickets.`, level: "Medium" });
    }
    const totalBreaches = techs.reduce((acc, t) => acc + t.escalations, 0);
    if (totalBreaches > 5) {
      risks.push({ title: "SLA Compliance Drop", desc: `${totalBreaches} SLA breaches recorded in this period.`, level: "High" });
    }
    if (risks.length === 0) {
      risks.push({ title: "No Critical Risks", desc: "Operations are running smoothly within acceptable parameters.", level: "Low" });
    }

    // 4. Trend Analysis
    const trendAnalysis = `Service demand is trending ${kpi.reqTrend >= 0 ? 'upwards' : 'downwards'} (${kpi.reqTrend >= 0 ? '+' : ''}${kpi.reqTrend}%). Resolution efficiency is ${kpi.respTrend <= 0 ? 'improving' : 'declining'}, with response times changing by ${kpi.respTrend > 0 ? '+' : ''}${kpi.respTrend}% over the last cycle.`;

    // 5. Department Performance
    const deptMap: Record<string, { resolved: number, pending: number }> = {};
    techs.forEach(t => {
      if (!deptMap[t.department]) deptMap[t.department] = { resolved: 0, pending: 0 };
      deptMap[t.department].resolved += t.completedTickets;
      deptMap[t.department].pending += t.activeTickets;
    });
    const depts = Object.keys(deptMap).map(d => {
      const total = deptMap[d].resolved + deptMap[d].pending;
      return {
        name: d,
        rate: total > 0 ? Math.round((deptMap[d].resolved / total) * 100) : 0,
        volume: total
      };
    }).sort((a,b) => b.rate - a.rate);

    // 6. Technician Performance Summary
    const topTech = techs[0];
    const bottomTech = techs[techs.length - 1];

    // 7. SLA Risk Prediction
    const pendingTickets = techs.reduce((acc, t) => acc + t.activeTickets, 0);
    const slaPrediction = pendingTickets > 10 ? 
      `High risk of SLA breaches in the next 24 hours due to ${pendingTickets} pending tickets in the queue.` : 
      `SLA compliance is projected to remain stable with only ${pendingTickets} active tickets currently queued.`;

    // 8. Asset Health Correlation
    const topCost = costData[0];
    const assetHealth = topCost ? 
      `${topCost.cat} systems are generating the highest maintenance volume, costing ₹${topCost.v}L in this period. This suggests underlying asset degradation.` :
      `Maintenance costs are evenly distributed across systems.`;

    // 9. Revenue Impact
    const totalCost = costData.reduce((acc, c) => acc + c.v, 0);
    const revenueImpact = `Total maintenance expenditure for this period is ₹${totalCost.toFixed(1)}L. A ${kpi.resTrend < 0 ? 'drop' : 'gain'} in resolution rates directly impacts operational downtime costs.`;

    // 10. Recommended Actions
    const actions = [];
    if (highWorkloadTechs.length > 0) actions.push(`Rebalance ticket assignments away from ${highWorkloadTechs.map(t=>t.name).join(", ")}.`);
    if (topCost) actions.push(`Conduct a preventative maintenance sweep on ${topCost.cat} assets to reduce reactive repair costs.`);
    if (kpi.avgResponse > 2) actions.push(`Implement auto-triage for low-priority tickets to reduce average response times.`);
    if (actions.length === 0) actions.push("Continue current operational cadence. No immediate corrective actions required.");

    // 11. Priority Matrix (Simplified to High Urgency list)
    const priorityMatrix = rawTickets
      .filter(t => t.status === "Pending" && t.responseTime > 3)
      .slice(0, 3)
      .map(t => ({ id: t.id, issue: `${t.costCategory} Issue`, tech: t.technician }));

    return {
      execSummary, findings, risks, trendAnalysis, depts, topTech, bottomTech, 
      slaPrediction, assetHealth, revenueImpact, actions, priorityMatrix
    };
  }, [data, period]);

  return (
    <MobileLayout
      showBottomNav={false}
      backgroundColor={bg}
      header={
        <>
          <StatusBar />
          <div style={{ background: `linear-gradient(160deg, #1E3A8A 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "10px 20px 24px", flexShrink: 0, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", position: "relative", zIndex: 1 }}>
              <button type="button" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}>
                <ArrowLeft size={15} color="white" /> Back
              </button>
              <div style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "100px", padding: "4px 12px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "white", fontFamily: inter }}>{period}</span>
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", position: "relative", zIndex: 1 }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={20} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, margin: "0 0 4px" }}>AI Operational Report</h1>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontFamily: inter, margin: 0, lineHeight: 1.4 }}>Comprehensive analysis & forecasting powered by 10xDS Intelligence</p>
              </div>
            </div>
          </div>
        </>
      }
    >
      <div style={{ padding: "20px" }}>
        
        {/* Executive Summary */}
        <SectionCard title="Executive Summary" icon={Activity} color={blue} highlight>
          <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, lineHeight: 1.6, margin: 0 }}>
            {report.execSummary}
          </p>
        </SectionCard>

        {/* Key Operational Findings */}
        <SectionCard title="Key Operational Findings" icon={Target} color={purple}>
          <ul style={{ margin: 0, paddingLeft: "20px", color: inkSec, fontSize: "14px", fontFamily: inter, lineHeight: 1.6 }}>
            {report.findings.map((f, i) => <li key={i} style={{ marginBottom: "8px" }}>{f}</li>)}
          </ul>
        </SectionCard>

        {/* Top Risks */}
        <SectionCard title="Top Risks Identified" icon={AlertTriangle} color={red}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {report.risks.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", borderRadius: "12px", backgroundColor: r.level === 'High' ? redT : (r.level === 'Medium' ? amberT : greenT), border: `1px solid ${r.level === 'High' ? `${red}40` : (r.level === 'Medium' ? `${amber}40` : `${green}40`)}` }}>
                <AlertCircle size={16} color={r.level === 'High' ? red : (r.level === 'Medium' ? amber : green)} style={{ marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: "0 0 4px", fontFamily: inter }}>{r.title}</h4>
                  <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter, lineHeight: 1.4 }}>{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Trend Analysis */}
        <SectionCard title="Trend Analysis" icon={TrendingUp} color={blue}>
          <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, lineHeight: 1.6, margin: 0 }}>
            {report.trendAnalysis}
          </p>
        </SectionCard>

        {/* Department Performance */}
        <SectionCard title="Department Performance" icon={Users} color={orange}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {report.depts.map((d, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>{d.name}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: d.rate >= 80 ? green : amber, fontFamily: inter }}>{d.rate}% Res.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1, height: "6px", backgroundColor: divider, borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${d.rate}%`, height: "100%", backgroundColor: d.rate >= 80 ? green : amber, borderRadius: "3px" }} />
                  </div>
                  <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter, width: "40px", textAlign: "right" }}>{d.volume} tkt</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Technician Summary */}
        <SectionCard title="Technician Performance" icon={CheckCircle2} color={green}>
          {report.topTech && (
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: inkMut, margin: "0 0 6px", fontFamily: inter, fontWeight: 600 }}>TOP PERFORMER</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderRadius: "12px", backgroundColor: bg, border: `1px solid ${border}` }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 2px", fontFamily: inter }}>{report.topTech.name}</p>
                  <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>{report.topTech.completedTickets} resolved • {report.topTech.slaPct}% SLA</p>
                </div>
                <div style={{ width: "32px", height: "32px", borderRadius: "16px", backgroundColor: greenT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={16} color={green} />
                </div>
              </div>
            </div>
          )}
          {report.bottomTech && report.bottomTech.activeTickets > 0 && (
            <div>
              <p style={{ fontSize: "12px", color: inkMut, margin: "0 0 6px", fontFamily: inter, fontWeight: 600 }}>NEEDS ASSISTANCE</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderRadius: "12px", backgroundColor: bg, border: `1px solid ${border}` }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 2px", fontFamily: inter }}>{report.bottomTech.name}</p>
                  <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>{report.bottomTech.activeTickets} pending • {report.bottomTech.workload}% load</p>
                </div>
                <div style={{ width: "32px", height: "32px", borderRadius: "16px", backgroundColor: amberT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingDown size={16} color={amber} />
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* SLA Risk Prediction */}
        <SectionCard title="SLA Risk Prediction" icon={Zap} color={amber}>
          <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, lineHeight: 1.6, margin: 0 }}>
            {report.slaPrediction}
          </p>
        </SectionCard>

        {/* Asset Health Correlation */}
        <SectionCard title="Asset Health Correlation" icon={Activity} color={blue}>
          <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, lineHeight: 1.6, margin: 0 }}>
            {report.assetHealth}
          </p>
        </SectionCard>

        {/* Revenue Impact */}
        <SectionCard title="Revenue Impact" icon={DollarSign} color={green}>
          <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, lineHeight: 1.6, margin: 0 }}>
            {report.revenueImpact}
          </p>
        </SectionCard>

        {/* Recommended Actions */}
        <SectionCard title="Recommended Actions" icon={ListChecks} color={purple}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {report.actions.map((act, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "10px", backgroundColor: purpleT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: purple, fontFamily: inter }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: "14px", color: ink, fontFamily: inter, lineHeight: 1.5, margin: 0 }}>{act}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Priority Matrix */}
        <SectionCard title="Priority Matrix (High Urgency)" icon={AlertCircle} color={red}>
          {report.priorityMatrix.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {report.priorityMatrix.map((t, i) => (
                <div key={i} style={{ padding: "12px", borderRadius: "10px", backgroundColor: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: ink, margin: "0 0 2px", fontFamily: inter }}>{t.id}</p>
                    <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>{t.issue}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: red, backgroundColor: redT, padding: "4px 8px", borderRadius: "100px", fontFamily: inter }}>Critical</span>
                    <p style={{ fontSize: "11px", color: inkMut, margin: "4px 0 0", fontFamily: inter }}>Assigned to {t.tech.split(" ")[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: 0 }}>No high-urgency pending tickets identified.</p>
          )}
        </SectionCard>

        <div style={{ height: "40px" }} />
      </div>
    </MobileLayout>
  );
}
