import React, { createContext, useContext, useState, useMemo } from 'react';

export interface Ticket {
  id: string;
  date: Date;
  status: "Resolved" | "Pending";
  responseTime: number; // in hours
  csat: number; // 1-5
  technician: string;
  costCategory: "HVAC" | "Electrical" | "IT" | "Plumbing";
  costValue: number;
}

import { supabase } from '../lib/supabase';

export type AnalyticsData = {
  kpi: {
    totalRequests: number; reqTrend: number;
    avgResponse: number; respTrend: number;
    resRate: number; resTrend: number;
    avgCsat: number; csatTrend: number;
  };
  charts: {
    trendPoints: number[]; trendLabels: string[];
    barData: {m:string; v:number}[];
  };
  techs: {
    id: string; name: string; department: string; skillLevel: string; availability: string;
    completed: number; pending: number; avgResponseTime: number; totalResponseTime: number; 
    csatSum: number; csatCount: number; breaches: number;
    rate: number;
    avgResolutionTime: string;
    avgResolutionMinutes: number;
    customerRating: number;
    slaPct: number;
    escalations: number;
    activeTickets: number;
    completedTickets: number;
    workload: number;
  }[];
  costData: {cat: string; v: number}[];
  csat: {
    score: number;
    totalReviews: number;
    satisfied: number;
    neutral: number;
    unsatisfied: number;
  };
  insights: {text: string; type: string}[];
  rawTickets: Ticket[];
};

interface AnalyticsContextType {
  period: string;
  setPeriod: (period: string) => void;
  data: AnalyticsData;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [periodLabel, setPeriodLabel] = useState("30 Days");
  const [rawTickets, setRawTickets] = useState<Ticket[]>([]);

  React.useEffect(() => {
    const fetchTickets = async () => {
      const { data } = await supabase.from('tickets').select('*').limit(500);
      if (data) {
        setRawTickets(data.map((t: any) => ({
          id: t.id,
          date: new Date(t.created_at),
          status: t.status === 'resolved' || t.status === 'closed' ? "Resolved" : "Pending",
          responseTime: 2, // Default or computed
          csat: 5,
          technician: t.assigned_to || "Unassigned",
          costCategory: "HVAC", // Default or derived
          costValue: 1.0
        })));
      }
    };
    fetchTickets();
  }, []);

  const data = useMemo(() => {
    let daysToKeep = 30;
    if (periodLabel === "Today") daysToKeep = 1;
    if (periodLabel === "7 Days") daysToKeep = 7;
    if (periodLabel === "90 Days") daysToKeep = 90;

    const now = new Date();
    // For "Today", we start from the beginning of today
    const cutoffDate = new Date();
    if (periodLabel === "Today") {
      cutoffDate.setHours(0,0,0,0);
    } else {
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    }

    // Previous period for trend calculation
    const prevCutoffDate = new Date(cutoffDate);
    if (periodLabel === "Today") prevCutoffDate.setDate(prevCutoffDate.getDate() - 1);
    else prevCutoffDate.setDate(prevCutoffDate.getDate() - daysToKeep);

    const currentTickets = rawTickets.filter(t => t.date >= cutoffDate && t.date <= now);
    const prevTickets = rawTickets.filter(t => t.date >= prevCutoffDate && t.date < cutoffDate);

    // KPI Metrics
    const totalRequests = currentTickets.length;
    const prevTotal = prevTickets.length;
    const reqTrend = prevTotal === 0 ? 0 : ((totalRequests - prevTotal) / prevTotal) * 100;
    
    const avgResponse = totalRequests > 0 ? currentTickets.reduce((acc, t) => acc + t.responseTime, 0) / totalRequests : 0;
    const prevAvgResponse = prevTotal > 0 ? prevTickets.reduce((acc, t) => acc + t.responseTime, 0) / prevTotal : 0;
    const respTrend = prevAvgResponse === 0 ? 0 : ((avgResponse - prevAvgResponse) / prevAvgResponse) * 100;

    const resolved = currentTickets.filter(t => t.status === "Resolved").length;
    const resRate = totalRequests > 0 ? (resolved / totalRequests) * 100 : 0;
    const prevResolved = prevTickets.filter(t => t.status === "Resolved").length;
    const prevResRate = prevTotal > 0 ? (prevResolved / prevTotal) * 100 : 0;
    const resTrend = resRate - prevResRate;

    const csatScores = currentTickets.filter(t => t.status === "Resolved").map(t => t.csat);
    const avgCsat = csatScores.length > 0 ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length : 0;
    const prevCsatScores = prevTickets.filter(t => t.status === "Resolved").map(t => t.csat);
    const prevAvgCsat = prevCsatScores.length > 0 ? prevCsatScores.reduce((a, b) => a + b, 0) / prevCsatScores.length : 0;
    const csatTrend = avgCsat - prevAvgCsat;

    // Charts: Trend Line
    let trendPoints: number[] = [];
    let trendLabels: string[] = [];
    
    if (periodLabel === "Today") {
      // Group by hours (e.g. 6 chunks of 4 hours)
      const bins = [0,0,0,0,0,0];
      currentTickets.forEach(t => {
        const h = t.date.getHours();
        bins[Math.floor(h/4)]++;
      });
      trendPoints = bins;
      trendLabels = ["12a","4a","8a","12p","4p","8p"];
    } else if (periodLabel === "7 Days") {
      // Group by last 7 days
      for (let i=6; i>=0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        trendLabels.push(d.toLocaleDateString('en-US', {weekday:'short'}));
        trendPoints.push(0);
      }
      currentTickets.forEach(t => {
        const diff = Math.floor((now.getTime() - t.date.getTime()) / (1000*3600*24));
        if (diff >= 0 && diff < 7) {
          trendPoints[6 - diff]++;
        }
      });
    } else if (periodLabel === "30 Days") {
      // Group by weeks or 5-day intervals
      for (let i=5; i>=0; i--) {
        trendLabels.push(`W${6-i}`);
        trendPoints.push(0);
      }
      currentTickets.forEach(t => {
        const diff = Math.floor((now.getTime() - t.date.getTime()) / (1000*3600*24));
        const idx = 5 - Math.floor(diff / 6);
        if (idx >= 0 && idx < 6) trendPoints[idx]++;
      });
    } else {
      // 90 days - Group by half-months or weeks
      for (let i=5; i>=0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i*15);
        trendLabels.push(d.toLocaleDateString('en-US', {month:'short', day:'numeric'}));
        trendPoints.push(0);
      }
      currentTickets.forEach(t => {
        const diff = Math.floor((now.getTime() - t.date.getTime()) / (1000*3600*24));
        const idx = 5 - Math.floor(diff / 15);
        if (idx >= 0 && idx < 6) trendPoints[idx]++;
      });
    }

    // Monthly Bar Chart Data
    let barData: {m:string; v:number}[] = [];
    if (periodLabel === "90 Days" || periodLabel === "30 Days") {
      // Group by month
      const mMap: Record<string, number> = {};
      const sortedDates = [...currentTickets].sort((a,b)=>a.date.getTime() - b.date.getTime());
      sortedDates.forEach(t => {
        const m = t.date.toLocaleDateString('en-US', {month:'short'});
        mMap[m] = (mMap[m] || 0) + 1;
      });
      barData = Object.keys(mMap).map(k => ({m: k, v: mMap[k]}));
      if (barData.length > 6) barData = barData.slice(-6); // Max 6 bars
    } else {
      // Group by day for 7 Days / Today
      barData = trendLabels.map((l, i) => ({m: l, v: trendPoints[i]}));
    }

    // Tech Productivity
    const tMap: Record<string, {
      id: string, name:string, department: string, skillLevel: string, availability: string,
      completed:number, pending:number, avgResponseTime: number, totalResponseTime: number, 
      csatSum: number, csatCount: number, breaches: number
    }> = {};
    const TECH_NAMES = ["Rahul Sharma", "Sarah Jenkins", "Michael Chang", "Ahmed Hassan"];
    TECH_NAMES.forEach((n, i) => tMap[n] = {
      id: `tech-${i+1}`, name: n, 
      department: ["HVAC", "Electrical", "Network", "Plumbing"][i % 4],
      skillLevel: ["L1", "L2", "L3"][i % 3],
      availability: ["Available", "On Site", "Busy", "Offline"][i % 4],
      completed: 0, pending: 0, avgResponseTime: 0, totalResponseTime: 0, csatSum: 0, csatCount: 0, breaches: 0
    });
    currentTickets.forEach(t => {
      if (t.status === "Resolved") {
        tMap[t.technician].completed++;
        tMap[t.technician].csatSum += t.csat;
        tMap[t.technician].csatCount++;
      } else {
        tMap[t.technician].pending++;
      }
      tMap[t.technician].totalResponseTime += t.responseTime;
      if (t.responseTime > 2) {
        tMap[t.technician].breaches++;
      }
    });
    
    const techs = Object.values(tMap).map(t => {
      const total = t.completed + t.pending;
      const avgResp = total > 0 ? t.totalResponseTime / total : 0;
      const rate = total > 0 ? Math.round((t.completed/total)*100) : 0;
      const avgCsat = t.csatCount > 0 ? t.csatSum / t.csatCount : 0;
      const slaPct = total > 0 ? Math.round(((total - t.breaches) / total) * 100) : 100;
      
      const formatTime = (hours: number) => {
        if (hours === 0) return "0m";
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
      };

      return {
        ...t,
        rate,
        avgResolutionTime: formatTime(avgResp),
        avgResolutionMinutes: Math.round(avgResp * 60),
        customerRating: Number(avgCsat.toFixed(1)),
        slaPct,
        escalations: t.breaches,
        activeTickets: t.pending,
        completedTickets: t.completed,
        workload: total > 0 ? Math.min(100, Math.round((t.pending / Math.max(1, (total / daysToKeep))) * 100)) : 0
      }
    }).sort((a,b) => b.rate - a.rate);

    // Cost Analysis
    const cMap: Record<string, number> = {};
    const COST_CATEGORIES = ["Parts", "Labor", "Travel", "External Services", "Emergency Fees", "Consumables"];
    COST_CATEGORIES.forEach(c => cMap[c] = 0);
    currentTickets.forEach(t => {
      cMap[t.costCategory] += t.costValue;
    });
    const costData = Object.keys(cMap).map(k => ({
      cat: k,
      v: Math.round(cMap[k] * 10) / 10
    })).sort((a,b) => b.v - a.v);

    // CSAT Distribution
    let satisfied=0, neutral=0, unsatisfied=0;
    csatScores.forEach(s => {
      if (s >= 4) satisfied++;
      else if (s === 3) neutral++;
      else unsatisfied++;
    });
    const totCsat = csatScores.length;

    // AI Insights
    let insights = [];
    if (periodLabel === "Today") {
      insights = [
        {text: `Urgent: Response times are ${avgResponse > 2 ? 'higher' : 'lower'} than usual today. Monitor queue.`, type: avgResponse > 2 ? 'warning' : 'ok'},
        {text: `${totalRequests} new tickets arrived today. Ensure evening shift is staffed.`, type: 'info'}
      ];
    } else if (periodLabel === "7 Days") {
      insights = [
        {text: `Service request volume ${reqTrend > 0 ? 'up' : 'down'} ${Math.abs(Math.round(reqTrend))}% vs last week.`, type: reqTrend > 0 ? 'warning' : 'ok'},
        {text: `${techs[0]?.name || 'Technicians'} maintained ${techs[0]?.rate || 0}% SLA compliance.`, type: 'ok'}
      ];
    } else {
      insights = [
        {text: `HVAC maintenance costs represent a large portion (₹${costData.find(c=>c.cat==='HVAC')?.v || 0}L). Consider PM contracts.`, type: 'info'},
        {text: `CSAT score has ${csatTrend >= 0 ? 'improved' : 'dropped'} by ${Math.abs(Number(csatTrend.toFixed(1)))} points.`, type: csatTrend >= 0 ? 'ok' : 'warning'},
        {text: `Overall resolution rate is ${resRate.toFixed(1)}% across ${totalRequests} tickets.`, type: resRate > 90 ? 'ok' : 'info'}
      ];
    }

    return {
      kpi: {
        totalRequests, reqTrend: Math.round(reqTrend),
        avgResponse, respTrend: Math.round(respTrend),
        resRate: Math.round(resRate), resTrend: Math.round(resTrend),
        avgCsat, csatTrend,
      },
      charts: {
        trendPoints, trendLabels,
        barData
      },
      techs,
      costData,
      csat: {
        score: avgCsat,
        totalReviews: totCsat,
        satisfied: totCsat > 0 ? Math.round((satisfied/totCsat)*100) : 0,
        neutral: totCsat > 0 ? Math.round((neutral/totCsat)*100) : 0,
        unsatisfied: totCsat > 0 ? Math.round((unsatisfied/totCsat)*100) : 0
      },
      insights,
      rawTickets: currentTickets
    };
  }, [periodLabel]);

  return (
    <AnalyticsContext.Provider value={{ period: periodLabel, setPeriod: setPeriodLabel, data }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error("useAnalyticsContext must be used within an AnalyticsProvider");
  }
  return context;
}
