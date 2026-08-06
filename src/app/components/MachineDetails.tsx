import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { 
  ArrowLeft, Activity, Clock, FileText, Wrench, 
  AlertTriangle, Shield, CheckCircle2,
  Thermometer, Zap, Settings, AlertCircle, PlayCircle, Box,
  FileBarChart, User, Plus
} from "lucide-react";
import { MobileLayout } from "./ui/MobileLayout";
import { useMachineHealthContext } from "../contexts/MachineHealthContext";
import { handleBackNavigation } from "../utils/navigation";

const blue = "#2563EB";
const blueMid = "#3B82F6";
const blueTint = "#EFF6FF";
const ink = "#0F172A";
const inkSec = "#475569";
const inkMut = "#64748B";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

const green = "#16A34A";
const greenT = "#DCFCE7";
const amber = "#D97706";
const amberT = "#FFFBEB";
const red = "#DC2626";
const redT = "#FEF2F2";
const purple = "#7C3AED";
const purpleT = "#F5F3FF";

export default function MachineDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { machines } = useMachineHealthContext();
  
  const machine = machines.find(m => m.id === id);

  if (!machine) {
    return (
      <MobileLayout
        header={
          <div style={{
            backgroundColor: blue,
            padding: "16px 20px 18px", flexShrink: 0,
          }}>
            <button type="button" onClick={() => handleBackNavigation(navigate, '/machine-health')} style={{
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "10px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0
            }}>
              <ArrowLeft size={16} color="white" />
            </button>
          </div>
        }
      >
        <div style={{ padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginTop: "40px" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "20px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertCircle size={36} color={inkMut} />
          </div>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: ink, fontFamily: inter, marginBottom: "8px" }}>Machine Not Found</h2>
            <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, lineHeight: 1.5 }}>
              The machine you are looking for (ID: {id}) could not be found or you don't have access to view it.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", marginTop: "12px" }}>
            <button type="button" onClick={() => handleBackNavigation(navigate, '/machine-health')} style={{
              padding: "14px", borderRadius: "14px", backgroundColor: blue, border: "none",
              fontSize: "15px", fontWeight: 700, color: "white", fontFamily: inter, cursor: "pointer"
            }}>
              Return to Machine Health
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} style={{
              padding: "14px", borderRadius: "14px", backgroundColor: card, border: `1.5px solid ${border}`,
              fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter, cursor: "pointer"
            }}>
              Go Home
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const statusColor = machine.status === 'Critical' ? red : machine.status === 'Warning' ? amber : green;
  const statusTint = machine.status === 'Critical' ? redT : machine.status === 'Warning' ? amberT : greenT;

  const MetricBlock = ({ icon: Icon, label, value, color }: any) => (
    <div style={{ flex: 1, backgroundColor: divider, padding: "12px", borderRadius: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <Icon size={14} color={color || inkSec} />
        <span style={{ fontSize: "11px", color: inkSec, fontFamily: inter, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter }}>{value}</div>
    </div>
  );

  return (
    <MobileLayout
      header={
        <div style={{
          background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
          padding: "16px 20px 18px", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
            <button type="button" onClick={() => handleBackNavigation(navigate, '/machine-health')} style={{
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "10px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0
            }}>
              <ArrowLeft size={16} color="white" />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "18px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: inter, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {machine.name}
              </h1>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>
                {machine.id} · {machine.category}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <div style={{
              flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "12px",
              padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px", border: "1px solid rgba(255,255,255,0.2)"
            }}>
              <Activity size={18} color="white" />
              <div>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>Health Score</p>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "white", fontFamily: inter }}>{machine.health}%</p>
              </div>
            </div>
            <div style={{
              flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "12px",
              padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px", border: "1px solid rgba(255,255,255,0.2)"
            }}>
              <Clock size={18} color="white" />
              <div>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>Uptime</p>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "white", fontFamily: inter }}>{machine.uptime}</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div style={{ padding: "20px" }}>
        
        {/* Status Alert */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px", padding: "14px",
          backgroundColor: statusTint, borderRadius: "14px", border: `1px solid ${statusColor}30`,
          marginBottom: "20px"
        }}>
          {machine.status === 'Healthy' ? <CheckCircle2 size={24} color={statusColor} /> : <AlertTriangle size={24} color={statusColor} />}
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: statusColor, fontFamily: inter, marginBottom: "2px" }}>
              Status: {machine.status}
            </h3>
            <p style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>
              {machine.status === 'Healthy' ? 'Machine is operating within normal parameters.' : `Attention required. ${machine.incidents} active incidents.`}
            </p>
          </div>
        </div>

        {/* Machine Information */}
        <div style={{
          backgroundColor: card, borderRadius: "16px", boxShadow: cardShadow,
          border: `1px solid ${border}`, overflow: "hidden", marginBottom: "20px"
        }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${divider}` }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter }}>Machine Information</h3>
          </div>
          <div style={{ padding: "0 18px" }}>
            <div style={{ display: "flex", padding: "14px 0", borderBottom: `1px solid ${divider}` }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "11px", color: inkSec, fontFamily: inter, marginBottom: "2px" }}>Location</p>
                <p style={{ fontSize: "13.5px", fontWeight: 600, color: ink, fontFamily: inter }}>{machine.location}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "11px", color: inkSec, fontFamily: inter, marginBottom: "2px" }}>Vendor</p>
                <p style={{ fontSize: "13.5px", fontWeight: 600, color: ink, fontFamily: inter }}>{machine.vendor}</p>
              </div>
            </div>
            <div style={{ display: "flex", padding: "14px 0", borderBottom: `1px solid ${divider}` }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "11px", color: inkSec, fontFamily: inter, marginBottom: "2px" }}>Installation Date</p>
                <p style={{ fontSize: "13.5px", fontWeight: 600, color: ink, fontFamily: inter }}>{machine.installationDate}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "11px", color: inkSec, fontFamily: inter, marginBottom: "2px" }}>Warranty</p>
                <p style={{ fontSize: "13.5px", fontWeight: 600, color: ink, fontFamily: inter }}>{machine.warranty}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Metrics */}
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: ink, fontFamily: inter, marginBottom: "12px", paddingLeft: "4px" }}>Live Metrics</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <MetricBlock icon={Thermometer} label="Temperature" value={machine.temperature} color={red} />
          <MetricBlock icon={Activity} label="Vibration" value={machine.vibration} color={blue} />
        </div>
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
          <MetricBlock icon={Zap} label="Power Cons." value={machine.powerConsumption} color={amber} />
          <MetricBlock icon={PlayCircle} label="Runtime" value={machine.uptime} color={green} />
        </div>

        {/* AI Diagnosis */}
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: ink, fontFamily: inter, marginBottom: "12px", paddingLeft: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Settings size={18} color={purple} /> AI Diagnosis
        </h3>
        <div style={{
          backgroundColor: purpleT, borderRadius: "16px", border: `1px solid ${purple}30`,
          padding: "16px", marginBottom: "24px"
        }}>
          <p style={{ fontSize: "13.5px", color: ink, fontFamily: inter, fontWeight: 600, marginBottom: "12px", lineHeight: 1.4 }}>
            {machine.aiDiagnosis}
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "12px", borderBottom: `1px solid ${purple}20` }}>
            <span style={{ fontSize: "12px", color: inkSec, fontFamily: inter, fontWeight: 500 }}>Predicted Failure Risk:</span>
            <span style={{ fontSize: "12px", color: machine.status === 'Healthy' ? green : machine.status === 'Warning' ? amber : red, fontFamily: inter, fontWeight: 700 }}>
              {machine.failureRisk}
            </span>
          </div>

          {machine.detectedIssues.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", color: inkSec, fontFamily: inter, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Detected Issues</span>
              <ul style={{ paddingLeft: "16px", margin: "6px 0 0 0", color: ink, fontSize: "13px", fontFamily: inter, fontWeight: 500 }}>
                {machine.detectedIssues.map((iss, i) => <li key={i} style={{ marginBottom: "4px" }}>{iss}</li>)}
              </ul>
            </div>
          )}

          {machine.recommendedActions.length > 0 && (
            <div>
              <span style={{ fontSize: "11px", color: inkSec, fontFamily: inter, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recommended Actions</span>
              <ul style={{ paddingLeft: "16px", margin: "6px 0 0 0", color: ink, fontSize: "13px", fontFamily: inter, fontWeight: 500 }}>
                {machine.recommendedActions.map((act, i) => <li key={i} style={{ marginBottom: "4px" }}>{act}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Support & Inventory */}
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: ink, fontFamily: inter, marginBottom: "12px", paddingLeft: "4px" }}>Maintenance & Support</h3>
        <div style={{
          backgroundColor: card, borderRadius: "16px", boxShadow: cardShadow,
          border: `1px solid ${border}`, overflow: "hidden", marginBottom: "24px"
        }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${divider}`, display: "flex", alignItems: "center", gap: "10px" }}>
            <User size={16} color={inkSec} />
            <div>
              <p style={{ fontSize: "11px", color: inkSec, fontFamily: inter, marginBottom: "2px" }}>Assigned Technician</p>
              <p style={{ fontSize: "13.5px", fontWeight: 600, color: ink, fontFamily: inter }}>{machine.assignedTechnician}</p>
            </div>
          </div>
          <div style={{ padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <Box size={16} color={inkSec} style={{ marginTop: "2px" }} />
            <div>
              <p style={{ fontSize: "11px", color: inkSec, fontFamily: inter, marginBottom: "6px" }}>Spare Parts Inventory</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {machine.spareParts.map((part, i) => (
                  <span key={i} style={{ padding: "4px 8px", backgroundColor: divider, borderRadius: "6px", fontSize: "11.5px", fontWeight: 500, color: inkSec, fontFamily: inter }}>
                    {part}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>



        <div style={{ height: "40px" }} />
      </div>
    </MobileLayout>
  );
}
