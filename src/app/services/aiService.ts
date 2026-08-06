import { AIAnalysis } from "../types/legacy";

const DELAY = 300;

// ─── Request ────────────────────────────────────────────────────────────────
export interface AIAnalysisRequest {
  title?: string;
  desc?: string;
  description?: string;
  image?: string;
  audio?: string;
  hasImage?: boolean;
  hasAudio?: boolean;
  // Extended — enterprise fields
  assetId?: string;
  assetCategory?: string;
  location?: string;
  priority?: string;
}

// ─── Response (Enterprise FSM) ───────────────────────────────────────────────
export interface AIAnalysisResponse {
  // ── Core (preserved) ──────────────────────────────────────────────────────
  category: string;
  asset: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  location?: string;
  confidence: number;            // 0–100
  equipment?: string;
  domain?: string;
  faultCategory?: string;
  predictedIssue?: string;
  rootCause?: string;
  severity?: "Critical" | "High" | "Medium" | "Low";
  reasoning?: string;
  missingInfo?: string[];
  suggestedTitle?: string;
  suggestedCategory?: string;
  suggestedAsset?: string;

  // ── Extended Prediction ───────────────────────────────────────────────────
  requiredSkills: string[];      // e.g. ["HVAC", "Refrigeration"]
  suggestedParts: string[];      // e.g. ["Capacitor 25µF", "Refrigerant R-410A"]
  estimatedHours: number;        // e.g. 2.5
  recommendedSLA: string;        // e.g. "Critical: 1h response / 4h resolution"

  // ── Risk Assessment ───────────────────────────────────────────────────────
  safetyFlag: boolean;
  safetyScore: number;           // 0–5
  operationalImpact: number;     // 0–5
  escalationRisk: number;        // 0–5
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  // ── HITL (Human-in-the-Loop) ──────────────────────────────────────────────
  requires_human_review: boolean;
  hitlTriggers: string[];        // CRITICAL_SEVERITY | LOW_CONFIDENCE | SAFETY_ESCALATION | REGULATED_ASSET | UNLISTED_FAULT
  detectedKeywords?: string[];   // safety keywords found in description

  // ── Auto-Correction ───────────────────────────────────────────────────────
  correction_applied: boolean;
  original_fault_type?: string;

  // ── Image vs Description severity split ───────────────────────────────────
  image_severity?: "Critical" | "High" | "Medium" | "Low";
  description_severity?: "Critical" | "High" | "Medium" | "Low";
  image_reasoning?: string;
  description_reasoning?: string;
}

// ─── HITL Trigger Label Map ──────────────────────────────────────────────────
export const HITL_LABELS: Record<string, string> = {
  LOW_CONFIDENCE:         "AI confidence below threshold — human verification required",
  CRITICAL_SEVERITY:      "Critical severity — Vendor authorisation required before dispatch",
  SAFETY_ESCALATION:      "Safety risk detected — immediate Vendor review required",
  REGULATED_ASSET:        "Regulated asset (medical / electrical infrastructure) — approval required",
  UNLISTED_FAULT:         "Fault type not in standard library — admin review recommended",
};

// ─── Smart Mock Response Library ─────────────────────────────────────────────
// Each category returns a distinct, realistic AI response so the Decision Engine
// demonstrates different routing paths during demos.

const MOCK_RESPONSES: Record<string, AIAnalysisResponse> = {

  HVAC: {
    category: "HVAC",
    asset: "HVAC Unit – C4",
    priority: "Critical",
    confidence: 94,
    equipment: "Centrifugal Chiller",
    domain: "Mechanical / HVAC",
    faultCategory: "Refrigerant System",
    predictedIssue: "Compressor Malfunction — Complete Cooling Loss",
    rootCause: "Refrigerant leak causing compressor overload and thermal shutdown",
    severity: "Critical",
    reasoning: "Combination of temperature spike data, visual evidence of oil staining near compressor seals, and reported noise pattern strongly indicates refrigerant leak leading to compressor failure.",
    suggestedTitle: "Critical HVAC Cooling Failure — Compressor Overheating",
    suggestedCategory: "HVAC",
    suggestedAsset: "HVAC Unit – C4",
    requiredSkills: ["HVAC", "Refrigeration", "Chiller Systems"],
    suggestedParts: ["Refrigerant R-410A (2 kg)", "Compressor Capacitor 25µF", "Expansion Valve"],
    estimatedHours: 3.5,
    recommendedSLA: "Critical: 1h response · 4h resolution",
    safetyFlag: false,
    safetyScore: 2,
    operationalImpact: 5,
    escalationRisk: 3,
    riskLevel: "HIGH",
    requires_human_review: true,
    hitlTriggers: ["CRITICAL_SEVERITY"],
    detectedKeywords: [],
    correction_applied: false,
    image_severity: "Critical",
    description_severity: "High",
    image_reasoning: "Oil staining visible near compressor housing, indicating seal failure.",
    description_reasoning: "Description mentions complete cooling loss and unusual clicking noise consistent with compressor fault.",
    missingInfo: [],
  },

  Electrical: {
    category: "Electrical",
    asset: "Generator G-12",
    priority: "High",
    confidence: 82,
    equipment: "Standby Generator",
    domain: "Electrical / Power",
    faultCategory: "Power Distribution",
    predictedIssue: "MCB Trip — Repeated Overload on Phase 2",
    rootCause: "Phase imbalance causing repeated MCB trips; likely failing load bank or wiring fault",
    severity: "High",
    reasoning: "Reported intermittent power cuts and MCB trip pattern suggest phase imbalance. Confidence is high due to clear symptom match with historical fault patterns.",
    suggestedTitle: "Generator Phase Imbalance — Repeated MCB Trip",
    suggestedCategory: "Electrical",
    suggestedAsset: "Generator G-12",
    requiredSkills: ["Electrical", "Generators", "Switchgear"],
    suggestedParts: ["MCB 63A 3-Phase", "Load Bank Resistor", "Phase Balancing Relay"],
    estimatedHours: 2.0,
    recommendedSLA: "High: 4h response · 12h resolution",
    safetyFlag: false,
    safetyScore: 3,
    operationalImpact: 4,
    escalationRisk: 2,
    riskLevel: "MEDIUM",
    requires_human_review: false,
    hitlTriggers: [],
    detectedKeywords: [],
    correction_applied: true,
    original_fault_type: "GENERAL_ELECTRICAL_FAULT",
    image_severity: "High",
    description_severity: "High",
    image_reasoning: "Burn marks visible on Phase 2 terminal — consistent with overload.",
    description_reasoning: "User reports repeated tripping every 2-3 hours, indicating sustained overload condition.",
    missingInfo: [],
  },

  Plumbing: {
    category: "Plumbing",
    asset: "Loading Pump LP-2",
    priority: "Medium",
    confidence: 88,
    equipment: "Centrifugal Pump",
    domain: "Plumbing / Water Systems",
    faultCategory: "Pipe Leak / Corrosion",
    predictedIssue: "Internal Pipe Corrosion — Slow Water Leak",
    rootCause: "Age-related corrosion of galvanised pipe joints causing slow but continuous water loss",
    severity: "Medium",
    reasoning: "Water staining pattern and reduced pump pressure readings indicate slow leak from corroded joint rather than acute burst. Confidence is high based on asset age and maintenance history.",
    suggestedTitle: "Pump Pipe Corrosion — Water Leak Detected",
    suggestedCategory: "Plumbing",
    suggestedAsset: "Loading Pump LP-2",
    requiredSkills: ["Plumbing", "Pump Maintenance", "Water Systems"],
    suggestedParts: ["Galvanised Pipe Joint 2-inch", "PTFE Tape", "Pipe Clamp Set"],
    estimatedHours: 1.5,
    recommendedSLA: "Medium: 8h response · 24h resolution",
    safetyFlag: false,
    safetyScore: 1,
    operationalImpact: 2,
    escalationRisk: 1,
    riskLevel: "LOW",
    requires_human_review: false,
    hitlTriggers: [],
    detectedKeywords: [],
    correction_applied: false,
    image_severity: "Medium",
    description_severity: "Medium",
    image_reasoning: "White mineral deposits and water staining visible around pump outlet flange.",
    description_reasoning: "User reports reduced water pressure and intermittent dripping consistent with slow leak.",
    missingInfo: [],
  },

  "Fire Safety": {
    category: "Fire Safety",
    asset: "Fire Panel FP-01",
    priority: "Critical",
    confidence: 71,
    equipment: "Addressable Fire Panel",
    domain: "Fire Safety / Life Safety Systems",
    faultCategory: "False Alarm / Sensor Fault",
    predictedIssue: "Intermittent False Alarm — Zone 3 Smoke Detector Fault",
    rootCause: "Dust contamination in photoelectric smoke detector triggering false activations",
    severity: "High",
    reasoning: "Pattern of Zone 3 alarms during low-humidity periods is consistent with contaminated photoelectric detector. Confidence at 71% due to inability to rule out actual smoke source without on-site inspection.",
    suggestedTitle: "Fire Panel False Alarm — Zone 3 Detector Fault",
    suggestedCategory: "Fire Safety",
    suggestedAsset: "Fire Panel FP-01",
    requiredSkills: ["Fire Safety", "Suppression Systems", "Alarms"],
    suggestedParts: ["Photoelectric Detector SD-851", "Detector Chamber Cleaning Kit"],
    estimatedHours: 1.0,
    recommendedSLA: "Critical: 1h response · 4h resolution",
    safetyFlag: true,
    safetyScore: 5,
    operationalImpact: 4,
    escalationRisk: 5,
    riskLevel: "CRITICAL",
    requires_human_review: true,
    hitlTriggers: ["SAFETY_ESCALATION", "LOW_CONFIDENCE"],
    detectedKeywords: ["alarm", "fire", "smoke"],
    correction_applied: false,
    image_severity: "High",
    description_severity: "High",
    image_reasoning: "Control panel showing active fault on Zone 3 with no corresponding visual smoke source.",
    description_reasoning: "Keywords: alarm, fire, smoke detected. Safety escalation triggered automatically.",
    missingInfo: [],
  },

  Elevators: {
    category: "Elevators",
    asset: "Elevator EL-2",
    priority: "High",
    confidence: 79,
    equipment: "Passenger Elevator (Traction)",
    domain: "Elevators / Lifting Equipment",
    faultCategory: "Mechanical — Door System",
    predictedIssue: "Door Closing Mechanism Failure — Safety Bypass Risk",
    rootCause: "Worn door clutch assembly preventing full door closure; safety relay intermittently bypassed",
    severity: "High",
    reasoning: "Reported door stalling pattern, combined with motor current spike data, is consistent with worn door clutch. This is a known failure mode for this model after 3+ years of operation.",
    suggestedTitle: "Elevator Door Closure Failure — Safety System Risk",
    suggestedCategory: "Elevators",
    suggestedAsset: "Elevator EL-2",
    requiredSkills: ["Elevators", "Lifting Equipment"],
    suggestedParts: ["Door Clutch Assembly (Otis Gen2)", "Door Motor Drive Belt", "Safety Relay Contact Set"],
    estimatedHours: 4.0,
    recommendedSLA: "High: 4h response · 12h resolution",
    safetyFlag: false,
    safetyScore: 3,
    operationalImpact: 3,
    escalationRisk: 2,
    riskLevel: "MEDIUM",
    requires_human_review: false,
    hitlTriggers: [],
    detectedKeywords: [],
    correction_applied: false,
    image_severity: "Medium",
    description_severity: "High",
    image_reasoning: "Visual inspection shows door track misalignment and visible wear on clutch pads.",
    description_reasoning: "User reports door stalling at 80% closure — consistent with clutch slippage.",
    missingInfo: [],
  },

  DEFAULT: {
    category: "General",
    asset: "Unknown Asset",
    priority: "Medium",
    confidence: 58,
    equipment: "Unidentified Equipment",
    domain: "General Maintenance",
    faultCategory: "Unclassified Fault",
    predictedIssue: "Fault pattern does not match known categories — manual assessment required",
    rootCause: "Insufficient data for confident root cause identification",
    severity: "Medium",
    reasoning: "Evidence provided does not strongly match any known fault pattern in the library. Recommend Vendor review before dispatching a technician.",
    suggestedTitle: "General Maintenance Issue — Manual Review Required",
    suggestedCategory: "General",
    suggestedAsset: "",
    requiredSkills: ["General Maintenance"],
    suggestedParts: [],
    estimatedHours: 2.0,
    recommendedSLA: "Medium: 8h response · 24h resolution",
    safetyFlag: false,
    safetyScore: 1,
    operationalImpact: 2,
    escalationRisk: 1,
    riskLevel: "LOW",
    requires_human_review: true,
    hitlTriggers: ["LOW_CONFIDENCE", "UNLISTED_FAULT"],
    detectedKeywords: [],
    correction_applied: false,
    missingInfo: [],
  },
};

// ─── Default (legacy compat) ──────────────────────────────────────────────────
export const DEFAULT_AI_RESPONSE: AIAnalysisResponse = MOCK_RESPONSES.HVAC;

// ─── Main analysis function ───────────────────────────────────────────────────
export const runAIAnalysis = async (req: AIAnalysisRequest): Promise<AIAnalysisResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Select response based on assetCategory first, then description keyword matching
      const cat = req.assetCategory || req.desc || req.description || "";
      let response: AIAnalysisResponse;

      if (/hvac|chiller|cooling|air.?con|refriger|compressor/i.test(cat) || req.assetCategory === "HVAC") {
        response = { ...MOCK_RESPONSES.HVAC };
      } else if (/electric|power|generator|voltage|mcb|switchgear|wiring|ups/i.test(cat) || req.assetCategory === "Electrical") {
        response = { ...MOCK_RESPONSES.Electrical };
      } else if (/plumb|water|pump|pipe|leak|drain|flood/i.test(cat) || req.assetCategory === "Plumbing") {
        response = { ...MOCK_RESPONSES.Plumbing };
      } else if (/fire|smoke|alarm|suppress|sprinkler|halon/i.test(cat) || req.assetCategory === "Fire Safety") {
        response = { ...MOCK_RESPONSES["Fire Safety"] };
      } else if (/elevator|lift|escalat|lifting/i.test(cat) || req.assetCategory === "Elevators") {
        response = { ...MOCK_RESPONSES.Elevators };
      } else {
        response = { ...MOCK_RESPONSES.DEFAULT };
      }

      // Adjust missingInfo dynamically — caller can override post-resolve
      response.missingInfo = [];

      resolve(response);
    }, 2500); // simulate AI thinking time
  });
};

// ─── Legacy AI analysis service (ticket details screen) ───────────────────────
export const aiService = {
  getAIAnalysis: async (id: string): Promise<AIAnalysis | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockAIAnalyses[id] || null);
      }, DELAY);
    });
  }
};

