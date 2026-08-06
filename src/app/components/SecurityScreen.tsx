import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Shield, ShieldAlert, Phone, Key, Activity, Info, ChevronRight, AlertTriangle } from "lucide-react";
import { MobileLayout } from "./ui/MobileLayout";
import { Sect } from "./HomeDashboard";
import { handleBackNavigation } from "../utils/navigation";
import { BackHeader } from "./navigation/BackHeader";

const inter = '"Inter", sans-serif';

// Colors (matching design system)
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#F1F5F9";
const ink = "#0F172A";
const inkSec = "#334155";
const inkMut = "#64748B";
const inkFaint = "#94A3B8";

const blue = "#2563EB";
const blueTint = "#EFF6FF";
const blueShadow = "0 6px 20px rgba(37,99,235,0.18)";

const red = "#EF4444";
const redT = "#FEF2F2";
const amber = "#F59E0B";
const amberT = "#FFFBEB";
const green = "#10B981";
const greenT = "#ECFDF5";

export function SecurityScreen() {
  const navigate = useNavigate();

  return (
    <MobileLayout
      header={
        <BackHeader 
          title="Security Console" 
          subtitle="Monitor and manage incidents" 
          fallbackRoute="/dashboard" 
        />
      }
    >
      <div style={{ padding: "20px", paddingBottom: "100px" }}>
        
        {/* Security Overview */}
        <div style={{
          backgroundColor: blue, borderRadius: "20px", padding: "20px",
          color: "white", marginBottom: "24px", boxShadow: blueShadow,
          display: "flex", flexDirection: "column", gap: "12px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={22} color="white" />
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, fontFamily: inter }}>System Status</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: inter }}>All security protocols active</p>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px" }}>
            <div>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", fontFamily: inter, marginBottom: "2px" }}>Threat Level</p>
              <p style={{ fontSize: "15px", fontWeight: 800, fontFamily: inter }}>Low</p>
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", fontFamily: inter, marginBottom: "2px" }}>Active Alerts</p>
              <p style={{ fontSize: "15px", fontWeight: 800, fontFamily: inter }}>2</p>
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", fontFamily: inter, marginBottom: "2px" }}>Last Scan</p>
              <p style={{ fontSize: "15px", fontWeight: 800, fontFamily: inter }}>10m ago</p>
            </div>
          </div>
        </div>

        {/* Active Incidents */}
        <div style={{ marginBottom: "24px" }}>
          <Sect title="Active Incidents" />
          <div style={{ backgroundColor: card, borderRadius: "16px", padding: "16px", border: `1px solid ${border}`, marginBottom: "12px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShieldAlert size={18} color={red} />
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "4px" }}>Unauthorized Access Attempt</p>
              <p style={{ fontSize: "12.5px", color: inkSec, fontFamily: inter, lineHeight: 1.5, marginBottom: "8px" }}>Failed login from unknown IP address detected at Server Room B.</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: red, backgroundColor: redT, padding: "2px 8px", borderRadius: "4px", fontFamily: inter }}>Critical</span>
                <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>Today, 09:42 AM</span>
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: card, borderRadius: "16px", padding: "16px", border: `1px solid ${border}`, display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: amberT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertTriangle size={18} color={amber} />
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "4px" }}>Firewall Rule Updated</p>
              <p style={{ fontSize: "12.5px", color: inkSec, fontFamily: inter, lineHeight: 1.5, marginBottom: "8px" }}>Network admin modified inbound rules. Verification recommended.</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: amber, backgroundColor: amberT, padding: "2px 8px", borderRadius: "4px", fontFamily: inter }}>Warning</span>
                <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>Yesterday, 04:15 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Access Logs */}
        <div style={{ marginBottom: "24px" }}>
          <Sect title="Access Logs" action="View All" onActionClick={() => navigate('/security/logs')} />
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, overflow: "hidden" }}>
            {[
              { name: "John David", role: "Admin", action: "Logged In", time: "10 mins ago" },
              { name: "Sarah Connor", role: "Technician", action: "Accessed Server Room", time: "1 hour ago" },
              { name: "System Update", role: "Automated", action: "Patch Applied", time: "2 hours ago" },
            ].map((log, i) => (
              <div key={i} style={{ padding: "14px 16px", borderBottom: i < 2 ? `1px solid ${border}` : "none", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Key size={16} color={inkMut} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13.5px", fontWeight: 600, color: ink, fontFamily: inter }}>{log.name}</p>
                  <p style={{ fontSize: "11.5px", color: inkMut, fontFamily: inter }}>{log.action} • {log.role}</p>
                </div>
                <span style={{ fontSize: "11.5px", color: inkFaint, fontFamily: inter }}>{log.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div style={{ marginBottom: "24px" }}>
          <Sect title="Emergency Contacts" />
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, backgroundColor: card, borderRadius: "16px", padding: "16px", border: `1px solid ${border}`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <Phone size={18} color={blue} />
              </div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "4px" }}>IT Helpdesk</p>
              <p style={{ fontSize: "11.5px", color: blue, fontWeight: 600, fontFamily: inter }}>+1 (800) 123-4567</p>
            </div>
            <div style={{ flex: 1, backgroundColor: card, borderRadius: "16px", padding: "16px", border: `1px solid ${border}`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <ShieldAlert size={18} color={red} />
              </div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "4px" }}>Security Chief</p>
              <p style={{ fontSize: "11.5px", color: red, fontWeight: 600, fontFamily: inter }}>+1 (800) 911-0000</p>
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div style={{ backgroundColor: blueTint, borderRadius: "16px", padding: "16px", border: `1px solid ${blue}20`, display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "6px", backgroundColor: blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Info size={14} color="white" />
          </div>
          <div>
            <p style={{ fontSize: "13.5px", fontWeight: 700, color: blue, fontFamily: inter, marginBottom: "4px" }}>Security Tip</p>
            <p style={{ fontSize: "12px", color: inkSec, fontFamily: inter, lineHeight: 1.5 }}>Always verify the identity of technicians requesting access to restricted areas like Server Room A and B.</p>
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
