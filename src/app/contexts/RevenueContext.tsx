import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";
import {
  RefreshCw, Shield, AlertTriangle, Settings2, Activity, Package,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type OppType =
  | "AMC Renewal"
  | "Warranty Expiry"
  | "Frequent Breakdown"
  | "Preventive Maintenance"
  | "Consumables Replacement"
  | "IoT Monitoring"
  | "Energy Optimization";

export type Priority = "High" | "Medium" | "Low";

export type PrimaryAction =
  | "Renew AMC"
  | "Extend Warranty"
  | "Create Work Order"
  | "Schedule Maintenance"
  | "Create Purchase Request"
  | "View Recommendations";

// Lifecycle status for each recommendation
export type OppStatus = "New" | "Action Started" | "Completed" | "Archived";

export interface Opportunity {
  id: number;
  title: string;
  type: OppType;
  priority: Priority;
  status: OppStatus;         // lifecycle state
  // Asset info — always references a real asset ID in mockDatabase
  assetId: string;
  assetName: string;
  assetCategory: string;
  location: string;
  currentStatus: string;
  // Work-order prefill fields
  woCategory: string;        // Category for the work order form
  woIssue: string;           // Short issue description for WO title
  woRecommendation: string;  // AI recommendation to prefill WO description
  // Financial
  estimatedSavings: string;
  estimatedSavingsValue: number;
  estimatedCost: string;
  estimatedCostValue: number;
  // AI
  aiConfidence: number;
  aiInsight: string;
  // Content
  desc: string;
  recommendedAction: string;
  expectedImpact: string;
  daysLeft?: number;
  // Visual
  color: string;
  tint: string;
  icon: React.ElementType;
  primaryAction: PrimaryAction;
  // Linked work order (set after "Create Work Order" is submitted)
  linkedWorkOrderId?: string;
}

// ─── Color tokens ────────────────────────────────────────────────────────────
const green  = "#16A34A"; const greenT  = "#DCFCE7";
const orange = "#EA580C"; const orangeT = "#FFF7ED";
const red    = "#DC2626"; const redT    = "#FEF2F2";
const amber  = "#D97706"; const amberT  = "#FFFBEB";
const teal   = "#0891B2"; const tealT   = "#ECFEFF";
const blue   = "#2563EB"; const blueTint = "#EFF6FF";

// ─── Canonical opportunity data (single source of truth) ─────────────────────
// Every assetId here maps to a real asset in mockDatabase.ts
export const INITIAL_OPPS: Opportunity[] = [
  {
    id: 1,
    title: "AMC Renewal Due",
    type: "AMC Renewal",
    priority: "High",
    status: "New",
    assetId: "AST-10024",
    assetName: "Air Conditioning Unit A",
    assetCategory: "HVAC",
    location: "Block C, Rooftop",
    currentStatus: "Expiring in 12 days",
    woCategory: "Contract Management",
    woIssue: "AMC contract expiring in 12 days",
    woRecommendation: "Renew the Annual Maintenance Contract before expiry to avoid emergency repair costs and service disruptions during peak cooling season.",
    estimatedSavings: "₹52,000",
    estimatedSavingsValue: 52000,
    estimatedCost: "₹18,000",
    estimatedCostValue: 18000,
    aiConfidence: 94,
    aiInsight: "AI detected that the AMC for Air Conditioning Unit A (AST-10024) expires in 12 days. Historical data shows that assets without active AMC contracts experience 3.4× higher emergency repair costs. Renewing now avoids potential service disruption during peak cooling season.",
    desc: "AMC expires in 12 days. Renewal prevents service gap and emergency repair costs.",
    recommendedAction: "Renew the Annual Maintenance Contract before expiry to avoid emergency repair costs and service disruptions during peak season.",
    expectedImpact: "Avoiding emergency repair costs of ₹52,000 annually. Guaranteed SLA-backed response time maintained.",
    daysLeft: 12,
    color: orange, tint: orangeT, icon: RefreshCw, primaryAction: "Renew AMC",
  },
  {
    id: 2,
    title: "Warranty Expiring Soon",
    type: "Warranty Expiry",
    priority: "Medium",
    status: "New",
    assetId: "AST-10341",
    assetName: "HVAC Chiller Unit",
    assetCategory: "HVAC",
    location: "Rooftop, Block D",
    currentStatus: "Warranty expires in 6 days",
    woCategory: "Warranty Management",
    woIssue: "Warranty expiring in 6 days",
    woRecommendation: "Extend the warranty before it lapses to cover parts and labour for the next 12 months at a fixed cost.",
    estimatedSavings: "₹38,000",
    estimatedSavingsValue: 38000,
    estimatedCost: "₹14,000",
    estimatedCostValue: 14000,
    aiConfidence: 89,
    aiInsight: "HVAC Chiller Unit (AST-10341) has been operational for 28 months. Warranty expires in 6 days. AI analysis shows HVAC assets in this usage tier have a 62% probability of requiring major repair within 18 months. Extended warranty coverage significantly reduces this financial risk.",
    desc: "Warranty expires in 6 days. Extended coverage reduces unexpected repair risk significantly.",
    recommendedAction: "Extend the warranty before it lapses to cover parts and labour for the next 12 months at a fixed cost.",
    expectedImpact: "Protection against unplanned repair costs estimated at ₹38,000. Guaranteed parts availability for 12 months.",
    daysLeft: 6,
    color: amber, tint: amberT, icon: Shield, primaryAction: "Extend Warranty",
  },
  {
    id: 3,
    title: "Frequent HVAC Failures",
    type: "Frequent Breakdown",
    priority: "High",
    status: "New",
    assetId: "AST-10024",
    assetName: "Air Conditioning Unit A",
    assetCategory: "HVAC",
    location: "Block C, Rooftop",
    currentStatus: "5 failures in last 30 days",
    woCategory: "Corrective Maintenance",
    woIssue: "Repeated compressor overheating — 5 incidents in 30 days",
    woRecommendation: "Replace compressor capacitor. Schedule during next maintenance window to avoid emergency downtime. AI Recommendation: Replace compressor capacitor. Estimated Cost: ₹45,000. Expected Savings: ₹2,30,000.",
    estimatedSavings: "₹2,30,000",
    estimatedSavingsValue: 230000,
    estimatedCost: "₹45,000",
    estimatedCostValue: 45000,
    aiConfidence: 97,
    aiInsight: "AI detected 5 compressor overheating events in the last 30 days on Air Conditioning Unit A (AST-10024). Failure probability is 86% within the next 45 days. Replacing the compressor capacitor now avoids approximately ₹2.3 Lakhs in cumulative downtime and emergency repair costs. Continued operation risks thermal breach.",
    desc: "5 compressor overheating events in 30 days. Failure probability at 86%. Urgent action needed.",
    recommendedAction: "Create a Work Order for compressor capacitor replacement. Schedule during next maintenance window.",
    expectedImpact: "Prevents estimated ₹2.3 Lakhs in emergency repair and downtime costs. Eliminates thermal breach risk.",
    color: red, tint: redT, icon: AlertTriangle, primaryAction: "Create Work Order",
  },
  {
    id: 4,
    title: "Preventive Maintenance Overdue",
    type: "Preventive Maintenance",
    priority: "Medium",
    status: "New",
    assetId: "AST-10088",
    assetName: "Generator G-04",
    assetCategory: "Power Systems",
    location: "Block B, Level 1",
    currentStatus: "PM overdue by 25 days",
    woCategory: "Preventive Maintenance",
    woIssue: "Scheduled PM overdue by 25 days — fuel system and bearing inspection needed",
    woRecommendation: "Schedule a Preventive Maintenance visit immediately. Inspect fuel system, battery, cooling circuit and bearing vibration.",
    estimatedSavings: "₹82,000",
    estimatedSavingsValue: 82000,
    estimatedCost: "₹12,000",
    estimatedCostValue: 12000,
    aiConfidence: 91,
    aiInsight: "Generator G-04 (AST-10088) was last serviced 87 days ago — 25 days beyond its scheduled PM interval. AI analysis predicts a 34% increase in failure probability for every additional week without service. Scheduling PM now avoids projected ₹82,000 in unplanned repair and fuel wastage costs over the next quarter.",
    desc: "PM overdue by 25 days. AI predicts 34% increased failure risk per additional week of delay.",
    recommendedAction: "Schedule a Preventive Maintenance visit immediately. AI recommends inspection of fuel system, battery, and cooling circuit.",
    expectedImpact: "Avoids ₹82,000 in projected unplanned repairs. Restores expected equipment lifespan and fuel efficiency.",
    daysLeft: 0,
    color: blue, tint: blueTint, icon: Settings2, primaryAction: "Schedule Maintenance",
  },
  {
    id: 5,
    title: "IoT Monitoring Recommended",
    type: "IoT Monitoring",
    priority: "Medium",
    status: "New",
    assetId: "AST-10156",
    assetName: "Water Pump Station",
    assetCategory: "Water Systems",
    location: "Basement, Level B2",
    currentStatus: "No monitoring active",
    woCategory: "Installation",
    woIssue: "No real-time monitoring — 2 undetected failures in past year",
    woRecommendation: "Install IoT sensors and subscribe to AI Health Monitoring. Enable vibration, temperature and pressure alerts.",
    estimatedSavings: "₹28,000",
    estimatedSavingsValue: 28000,
    estimatedCost: "₹6,000",
    estimatedCostValue: 6000,
    aiConfidence: 82,
    aiInsight: "Water Pump Station (AST-10156) has had 2 undetected failures in the past year due to absence of real-time monitoring. Installing IoT sensors would have reduced downtime by an estimated 74% in both incidents. AI recommends IoT sensor installation and subscription to AI health monitoring for early fault detection.",
    desc: "No monitoring active on critical pump. IoT sensors could have prevented 2 recent failures.",
    recommendedAction: "Install IoT sensors and subscribe to AI Health Monitoring. Enable vibration, temperature and pressure alerts.",
    expectedImpact: "74% reduction in undetected downtime. ₹28,000 annual savings from early fault intervention.",
    color: blue, tint: blueTint, icon: Activity, primaryAction: "View Recommendations",
  },
  {
    id: 6,
    title: "Consumables Replacement Due",
    type: "Consumables Replacement",
    priority: "Low",
    status: "New",
    assetId: "AST-10088",
    assetName: "Generator G-04",
    assetCategory: "Power Systems",
    location: "Block B, Level 1",
    currentStatus: "Filters & lubricants overdue",
    woCategory: "Procurement",
    woIssue: "Filters, lubricants and drive belts overdue by 18 operating days",
    woRecommendation: "Create a Purchase Request for replacement consumables: HVAC filters (×6), compressor lubricant (×4 cans), drive belt set.",
    estimatedSavings: "₹26,000",
    estimatedSavingsValue: 26000,
    estimatedCost: "₹8,500",
    estimatedCostValue: 8500,
    aiConfidence: 88,
    aiInsight: "AI analysis of runtime hours shows that filters, lubricants and drive belts on Generator G-04 (AST-10088) are overdue for replacement by 18 operating days. Delayed replacement risks increased fuel consumption (up to 12%) and premature wear on the alternator windings.",
    desc: "Filters, lubricants and belts overdue by 18 operating days. Risk of increased fuel consumption.",
    recommendedAction: "Create a Purchase Request for replacement consumables: HVAC filters (×6), compressor lubricant (×4 cans), drive belt set.",
    expectedImpact: "Prevents ₹26,000 in accelerated wear and fuel overconsumption costs per quarter.",
    daysLeft: 10,
    color: teal, tint: tealT, icon: Package, primaryAction: "Create Purchase Request",
  },
];

// ─── Filter / Sort types ──────────────────────────────────────────────────────
export interface RevenueFilters {
  type: Set<string>;
  priority: Set<string>;
  category: Set<string>;
  savingsRange: Set<string>;
  confidence: Set<string>;
}

export type SortOrder =
  | "Highest Savings"
  | "Lowest Cost"
  | "Highest Priority"
  | "Highest Confidence"
  | "Most Urgent"
  | "Newest Recommendation";

// ─── Context ──────────────────────────────────────────────────────────────────
interface RevenueContextValue {
  // Live mutable state
  opportunities: Opportunity[];
  activeOpportunities: Opportunity[];  // excludes Completed/Archived
  filteredOpportunities: Opportunity[];
  updateOpportunityStatus: (id: number, status: OppStatus, linkedWorkOrderId?: string) => void;
  // Search / filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filters: RevenueFilters;
  setFilters: (f: RevenueFilters) => void;
  sortOrder: SortOrder;
  setSortOrder: (s: SortOrder) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  // Live KPIs (computed from activeOpportunities)
  liveTotal: number;
  liveSavings: string;
  liveHighPriority: number;
  liveAvgConfidence: number;
}

const defaultFilters: RevenueFilters = {
  type: new Set(),
  priority: new Set(),
  category: new Set(),
  savingsRange: new Set(),
  confidence: new Set(),
};

const RevenueContext = createContext<RevenueContextValue | undefined>(undefined);

export function RevenueProvider({ children }: { children: ReactNode }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<RevenueFilters>(defaultFilters);
  const [sortOrder, setSortOrder] = useState<SortOrder>("Highest Savings");

  const clearFilters = () => setFilters(defaultFilters);

  // Update a single opportunity's status (and optionally link a work order ID)
  const updateOpportunityStatus = (id: number, status: OppStatus, linkedWorkOrderId?: string) => {
    setOpportunities(prev =>
      prev.map(o =>
        o.id === id
          ? { ...o, status, ...(linkedWorkOrderId ? { linkedWorkOrderId } : {}) }
          : o
      )
    );
  };

  // Active = not completed or archived — used in Home Dashboard count
  const activeOpportunities = useMemo(
    () => opportunities.filter(o => o.status !== "Completed" && o.status !== "Archived"),
    [opportunities]
  );

  // Live KPIs derived from active opportunities
  const liveTotal = activeOpportunities.length;
  const liveSavingsValue = activeOpportunities.reduce((s, o) => s + o.estimatedSavingsValue, 0);
  const liveSavings = liveSavingsValue >= 100000
    ? `₹${(liveSavingsValue / 100000).toFixed(1)} Lakhs`
    : `₹${(liveSavingsValue / 1000).toFixed(0)}K`;
  const liveHighPriority = activeOpportunities.filter(o => o.priority === "High").length;
  const liveAvgConfidence = activeOpportunities.length > 0
    ? Math.round(activeOpportunities.reduce((s, o) => s + o.aiConfidence, 0) / activeOpportunities.length)
    : 0;

  const activeFilterCount = useMemo(() =>
    filters.type.size + filters.priority.size + filters.category.size +
    filters.savingsRange.size + filters.confidence.size,
    [filters]);

  const filteredOpportunities = useMemo(() => {
    // Only show active opportunities in the filtered list
    let result = activeOpportunities;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.assetName.toLowerCase().includes(q) ||
        o.assetId.toLowerCase().includes(q) ||
        o.assetCategory.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q) ||
        o.desc.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q)
      );
    }

    if (filters.type.size > 0) {
      result = result.filter(o => Array.from(filters.type).some(ft => o.type.includes(ft)));
    }
    if (filters.priority.size > 0) {
      result = result.filter(o => filters.priority.has(o.priority));
    }
    if (filters.category.size > 0) {
      result = result.filter(o => filters.category.has(o.assetCategory));
    }
    if (filters.savingsRange.size > 0) {
      result = result.filter(o => {
        const v = o.estimatedSavingsValue;
        if (filters.savingsRange.has("< ₹25K") && v < 25000) return true;
        if (filters.savingsRange.has("₹25K–₹1L") && v >= 25000 && v <= 100000) return true;
        if (filters.savingsRange.has("> ₹1L") && v > 100000) return true;
        return false;
      });
    }
    if (filters.confidence.size > 0) {
      result = result.filter(o => {
        if (filters.confidence.has("≥ 90%") && o.aiConfidence >= 90) return true;
        if (filters.confidence.has("75–90%") && o.aiConfidence >= 75 && o.aiConfidence < 90) return true;
        if (filters.confidence.has("< 75%") && o.aiConfidence < 75) return true;
        return false;
      });
    }

    result = [...result];
    switch (sortOrder) {
      case "Highest Savings":     result.sort((a, b) => b.estimatedSavingsValue - a.estimatedSavingsValue); break;
      case "Lowest Cost":         result.sort((a, b) => a.estimatedCostValue - b.estimatedCostValue); break;
      case "Highest Priority": {
        const p = { High: 3, Medium: 2, Low: 1 };
        result.sort((a, b) => p[b.priority] - p[a.priority]);
        break;
      }
      case "Highest Confidence":  result.sort((a, b) => b.aiConfidence - a.aiConfidence); break;
      case "Most Urgent":         result.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)); break;
      case "Newest Recommendation": result.sort((a, b) => b.id - a.id); break;
    }
    return result;
  }, [activeOpportunities, searchQuery, filters, sortOrder]);

  return (
    <RevenueContext.Provider value={{
      opportunities, activeOpportunities, filteredOpportunities,
      updateOpportunityStatus,
      searchQuery, setSearchQuery,
      filters, setFilters,
      sortOrder, setSortOrder,
      clearFilters, activeFilterCount,
      liveTotal, liveSavings, liveHighPriority, liveAvgConfidence,
    }}>
      {children}
    </RevenueContext.Provider>
  );
}

export function useRevenueContext() {
  const ctx = useContext(RevenueContext);
  if (!ctx) throw new Error("useRevenueContext must be used within RevenueProvider");
  return ctx;
}

// ─── Static constants for initial snapshot (used only in legacy references) ──
export const OPPS_SAVINGS_DISPLAY = "₹4.3 Lakhs";
export const OPPS_HIGH_PRIORITY   = INITIAL_OPPS.filter(o => o.priority === "High").length;
export const OPPS_TOTAL           = INITIAL_OPPS.length;
