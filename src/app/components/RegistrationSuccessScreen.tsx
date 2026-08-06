import { handleBackNavigation } from "../utils/navigation";
import { useNavigate } from "react-router";
import { useState } from "react";
import { Shield, ArrowLeft } from "lucide-react";
import { MobileLayout } from "./ui/MobileLayout";

interface Props {
  orgName?: string;
  onContinue: () => void;
  onBackToLogin: () => void;
}

const FEATURES = [
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    label: "Raise Service Requests",
    description: "Submit and track maintenance issues in real time",
    color: "#0052CC",
    bg: "#EBF2FF",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
      </svg>
    ),
    label: "Monitor Assets",
    description: "Real-time asset health and lifecycle tracking",
    color: "#0747A6",
    bg: "#DEEBFF",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/>
      </svg>
    ),
    label: "View Machine Health",
    description: "AI-powered predictive maintenance analytics",
    color: "#006644",
    bg: "#E3FCEF",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    label: "Track SLA Performance",
    description: "Monitor service agreements and escalation rules",
    color: "#403294",
    bg: "#EAE6FF",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a8 8 0 0 1 8 8v12l-4-4-4 4-4-4-4 4V10a8 8 0 0 1 8-8z"/>
      </svg>
    ),
    label: "Access AI Assistant",
    description: "Intelligent troubleshooting and vendor recommendations",
    color: "#BF2600",
    bg: "#FFEBE6",
  },
];

// The enterprise illustration SVG
function SuccessIllustration() {
  return (
    <svg width="240" height="200" viewBox="0 0 240 200" fill="none">
      {/* Background glow */}
      <ellipse cx="120" cy="160" rx="90" ry="20" fill="rgba(0,82,204,0.07)" />

      {/* Main building */}
      <rect x="72" y="70" width="96" height="100" rx="6" fill="white" stroke="#C1D0FF" strokeWidth="1.5"/>
      <rect x="72" y="70" width="96" height="18" rx="6" fill="#0052CC"/>
      <rect x="72" y="82" width="96" height="6" fill="#0052CC"/>

      {/* Building windows grid */}
      {[0,1,2,3].map(col => [0,1,2,3].map(row => (
        <rect
          key={`w-${col}-${row}`}
          x={82 + col * 20}
          y={98 + row * 17}
          width="11"
          height="10"
          rx="2"
          fill={col === 1 && row === 1 ? "#FFC400" : col === 3 && row === 0 ? "#36B37E" : "#EBF2FF"}
          stroke="#C1D0FF"
          strokeWidth="0.5"
        />
      )))}

      {/* Door */}
      <rect x="107" y="148" width="26" height="22" rx="3" fill="#EBF2FF" stroke="#C1D0FF" strokeWidth="1"/>
      <circle cx="130" cy="160" r="1.5" fill="#8590A2"/>

      {/* Left wing */}
      <rect x="36" y="98" width="40" height="72" rx="4" fill="white" stroke="#DFE1E6" strokeWidth="1.2"/>
      <rect x="36" y="98" width="40" height="12" rx="4" fill="#2684FF" opacity="0.8"/>
      {[0,1].map(col => [0,1,2].map(row => (
        <rect key={`lw-${col}-${row}`} x={41 + col * 17} y={116 + row * 15} width="10" height="9" rx="2" fill="#EBF2FF" stroke="#C1D0FF" strokeWidth="0.5"/>
      )))}

      {/* Right wing */}
      <rect x="164" y="98" width="40" height="72" rx="4" fill="white" stroke="#DFE1E6" strokeWidth="1.2"/>
      <rect x="164" y="98" width="40" height="12" rx="4" fill="#2684FF" opacity="0.8"/>
      {[0,1].map(col => [0,1,2].map(row => (
        <rect key={`rw-${col}-${row}`} x={169 + col * 17} y={116 + row * 15} width="10" height="9" rx="2" fill="#EBF2FF" stroke="#C1D0FF" strokeWidth="0.5"/>
      )))}

      {/* Ground line */}
      <rect x="30" y="170" width="180" height="2" rx="1" fill="#EBECF0"/>

      {/* Success badge - large circle */}
      <circle cx="120" cy="52" r="30" fill="white" stroke="#C1D0FF" strokeWidth="2"/>
      <circle cx="120" cy="52" r="24" fill="url(#successGrad)"/>
      {/* Checkmark */}
      <path d="M109 52 L116 59 L131 44" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Orbiting module nodes */}
      {/* Top-left node */}
      <circle cx="68" cy="30" r="12" fill="white" stroke="#DEEBFF" strokeWidth="1.5"/>
      <circle cx="68" cy="30" r="8" fill="#0052CC" opacity="0.1"/>
      <path d="M64 30h8M68 26v8" stroke="#0052CC" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="79" y1="36" x2="92" y2="45" stroke="#C1D0FF" strokeWidth="1" strokeDasharray="2 2"/>

      {/* Top-right node */}
      <circle cx="172" cy="30" r="12" fill="white" stroke="#E3FCEF" strokeWidth="1.5"/>
      <circle cx="172" cy="30" r="8" fill="#36B37E" opacity="0.12"/>
      <path d="M168 32 L171 35 L176 27" stroke="#36B37E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="161" y1="36" x2="148" y2="45" stroke="#C1D0FF" strokeWidth="1" strokeDasharray="2 2"/>

      {/* Bottom-right module */}
      <rect x="178" y="130" width="36" height="24" rx="6" fill="white" stroke="#DEEBFF" strokeWidth="1.2"/>
      <rect x="182" y="135" width="12" height="3" rx="1.5" fill="#0052CC" opacity="0.6"/>
      <rect x="182" y="141" width="20" height="2" rx="1" fill="#EBECF0"/>
      <rect x="182" y="146" width="16" height="2" rx="1" fill="#EBECF0"/>
      <line x1="178" y1="142" x2="164" y2="142" stroke="#C1D0FF" strokeWidth="1" strokeDasharray="2 2"/>

      {/* Bottom-left module */}
      <rect x="26" y="130" width="36" height="24" rx="6" fill="white" stroke="#E3FCEF" strokeWidth="1.2"/>
      <circle cx="38" cy="140" r="5" fill="#36B37E" opacity="0.15"/>
      <circle cx="38" cy="140" r="3" fill="#36B37E" opacity="0.5"/>
      <rect x="45" y="137" width="12" height="2" rx="1" fill="#EBECF0"/>
      <rect x="45" y="142" width="9" height="2" rx="1" fill="#EBECF0"/>
      <line x1="62" y1="142" x2="72" y2="142" stroke="#C1D0FF" strokeWidth="1" strokeDasharray="2 2"/>

      {/* AI spark top */}
      <circle cx="120" cy="6" r="6" fill="#FFC400" opacity="0.9"/>
      <path d="M120 3v6M117 6h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="120" y1="12" x2="120" y2="22" stroke="#C1D0FF" strokeWidth="1" strokeDasharray="2 2"/>

      {/* Floating data dots */}
      <circle cx="50" cy="72" r="3" fill="#0052CC" opacity="0.3"/>
      <circle cx="190" cy="72" r="3" fill="#36B37E" opacity="0.3"/>
      <circle cx="30" cy="110" r="2" fill="#FFC400" opacity="0.4"/>
      <circle cx="210" cy="110" r="2" fill="#0052CC" opacity="0.4"/>

      <defs>
        <linearGradient id="successGrad" x1="96" y1="28" x2="144" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0065FF"/>
          <stop offset="100%" stopColor="#003DA8"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function RegistrationSuccessScreen({ orgName = "Your Organization", onContinue, onBackToLogin }: Props) {
  const navigate = useNavigate();
  const [dashLoading, setDashLoading] = useState(false);

  const handleContinue = () => {
    setDashLoading(true);
    setTimeout(() => {
      setDashLoading(false);
      onContinue();
    }, 1800);
  };

  return (
    <MobileLayout
      backgroundColor="#F0F4FF"
      showBottomNav={false}
      scrollContainerStyle={{ padding: 0 }}
      header={null}
    >
      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 pt-3 pb-1 flex-shrink-0" style={{ backgroundColor: "#0052CC" }}>
        <span className="text-white" style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.02em" }}>9:41</span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-end gap-0.5">
            {[3, 5, 7, 9].map((h, i) => (
              <div key={i} className="rounded-sm bg-white" style={{ width: "3px", height: `${h}px`, opacity: 1 }} />
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <div className="rounded-sm border border-white relative overflow-hidden" style={{ width: "22px", height: "11px" }}>
              <div className="absolute left-0 top-0 bottom-0 rounded-sm" style={{ width: "95%", backgroundColor: "white" }} />
            </div>
            <div className="rounded-sm bg-white" style={{ width: "2px", height: "5px" }} />
          </div>
        </div>
      </div>

      {/* Gradient Header — celebration style */}
      <div
        className="flex flex-col px-6 pt-5 pb-12 flex-shrink-0"
        style={{ background: "linear-gradient(160deg, #0052CC 0%, #0065FF 60%, #2684FF 100%)" }}
      >
        {/* Completed step indicator */}
        <div className="flex items-center gap-2 mb-5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                height: "4px", borderRadius: "100px", backgroundColor: "white",
                opacity: 1, width: "28px",
              }}
            />
          ))}
          <div
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              backgroundColor: "rgba(54,179,126,0.25)",
              border: "1px solid rgba(54,179,126,0.5)",
              borderRadius: "100px",
              padding: "2px 8px",
              marginLeft: "4px",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 12 9" fill="none">
              <path d="M1 4L4.5 7.5L11 1" stroke="#57D9A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: "10px", color: "#57D9A3", fontWeight: 700, letterSpacing: "0.06em" }}>COMPLETE</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            style={{
              width: "52px", height: "52px", borderRadius: "14px",
              backgroundColor: "rgba(54,179,126,0.2)",
              border: "1.5px solid rgba(54,179,126,0.5)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#57D9A3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: "3px" }}>
              Registration Complete
            </p>
            <h1 style={{ fontSize: "19px", fontWeight: 700, color: "white", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Organization Registered!
            </h1>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div
        className="flex-1 flex flex-col mx-4 -mt-5 relative"
        style={{
          backgroundColor: "white",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -4px 24px rgba(0,82,204,0.08), 0 2px 48px rgba(0,0,0,0.06)",
          zIndex: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 24px 24px",
            scrollbarWidth: "none",
          }}
        >
          {/* Illustration */}
          <div
            className="flex justify-center mb-5"
            style={{
              padding: "20px 10px",
              backgroundColor: "#F3F6FF",
              borderRadius: "18px",
              border: "1px solid #DCE4FF",
            }}
          >
            <SuccessIllustration />
          </div>

          {/* Heading */}
          <h2
            style={{
              fontSize: "20px", fontWeight: 700, color: "#091E42",
              letterSpacing: "-0.02em", textAlign: "center", marginBottom: "8px",
            }}
          >
            Organization Registered Successfully
          </h2>
          <p
            style={{
              fontSize: "13.5px", color: "#626F86", lineHeight: 1.65,
              textAlign: "center", marginBottom: "20px",
            }}
          >
            <span style={{ fontWeight: 600, color: "#0052CC" }}>{orgName}</span> has been created and verified. You can now access the Enterprise Service Management platform.
          </p>

          {/* Dashboard initialized card */}
          <div
            className="flex items-center gap-3 p-4 mb-5"
            style={{
              backgroundColor: "#E3FCEF",
              borderRadius: "12px",
              border: "1px solid #ABF5D1",
            }}
          >
            <div
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                backgroundColor: "#36B37E",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#006644" }}>Dashboard Initialized</p>
              <p style={{ fontSize: "11.5px", color: "#36B37E", marginTop: "2px" }}>Your workspace is configured and ready</p>
            </div>
          </div>

          {/* Features you can access */}
          <div
            className="mb-5"
            style={{ backgroundColor: "#F7F8FA", borderRadius: "16px", border: "1px solid #EBECF0", overflow: "hidden" }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid #EBECF0" }}
            >
              <div
                style={{
                  width: "22px", height: "22px", borderRadius: "6px",
                  background: "linear-gradient(135deg, #0065FF 0%, #0052CC 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#091E42", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
                You can now access
              </span>
            </div>
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < FEATURES.length - 1 ? "1px solid #F4F5F7" : "none" }}
              >
                <div
                  style={{
                    width: "30px", height: "30px", borderRadius: "8px",
                    backgroundColor: f.color,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#091E42" }}>{f.label}</p>
                  <p style={{ fontSize: "11px", color: "#8590A2" }}>{f.description}</p>
                </div>
                <div
                  style={{
                    width: "18px", height: "18px", borderRadius: "50%",
                    backgroundColor: "#36B37E",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <svg width="9" height="7" viewBox="0 0 12 9" fill="none">
                    <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Continue to Dashboard */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={dashLoading}
            style={{
              width: "100%", height: "52px", borderRadius: "12px", border: "none",
              background: dashLoading
                ? "linear-gradient(135deg, #5B8DEF 0%, #3D72DC 100%)"
                : "linear-gradient(135deg, #0065FF 0%, #0052CC 60%, #003DA8 100%)",
              color: "white", fontSize: "16px", fontWeight: 600,
              fontFamily: "'Roboto', sans-serif",
              cursor: dashLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: "0 4px 16px rgba(0,82,204,0.35), 0 1px 3px rgba(0,0,0,0.12)",
              transition: "all 0.2s ease",
              letterSpacing: "0.02em", marginBottom: "12px",
            }}
          >
            {dashLoading ? (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                  <path d="M10 2a8 8 0 0 1 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Launching Dashboard...
              </>
            ) : (
              <>
                Continue to Dashboard
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </>
            )}
          </button>

          {/* Back to Login */}
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              width: "100%", height: "50px", borderRadius: "12px",
              border: "2px solid #DFE1E6", background: "transparent",
              color: "#44526A", fontSize: "15px", fontWeight: 600,
              fontFamily: "'Roboto', sans-serif", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "all 0.2s ease", marginBottom: "4px",
            }}
          >
            <ArrowLeft size={16} color="#44526A" />
            Back to Login
          </button>

          {/* Footer */}
          <div className="flex flex-col items-center gap-2 pt-6 pb-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1" style={{ backgroundColor: "#F3F6FF", borderRadius: "100px", border: "1px solid #DCE4FF" }}>
              <Shield size={11} color="#0052CC" />
              <span style={{ fontSize: "10.5px", color: "#0052CC", fontWeight: 600, letterSpacing: "0.03em" }}>Welcome to 10xDS Enterprise Service Management</span>
            </div>
            <p style={{ fontSize: "11px", color: "#B3BAC5", fontWeight: 400, letterSpacing: "0.02em" }}>
              10xDS Enterprise Service Management
            </p>
            <p style={{ fontSize: "11px", color: "#C1C7D0", fontWeight: 400 }}>Version 4.2.1 · © 2026 10xDS</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </MobileLayout>
  );
}
