import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ChevronRight,
  Shield,
  Cpu,
  BarChart3,
  Wrench,
  Building2,
  Briefcase,
  Settings,
} from "lucide-react";
import { MobileLayout } from "./ui/MobileLayout";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

export function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }
      
      // RoleRoute in App.tsx will intercept this and re-route if necessary based on user role
      navigate("/dashboard");
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Shield, label: "SLA Monitoring" },
    { icon: Cpu, label: "AI Troubleshoot" },
    { icon: Wrench, label: "Technician Dispatch" },
    { icon: BarChart3, label: "Asset Management" },
  ];

  return (
    <MobileLayout
      backgroundColor="#F0F4FF"
      showBottomNav={false}
      scrollContainerStyle={{ padding: 0 }}
      header={null}
    >
      {/* Android Status Bar */}
      <div
        className="flex items-center justify-between px-6 pt-3 pb-1 flex-shrink-0"
        style={{ backgroundColor: "#0052CC" }}
      >
        <span
          className="text-white"
          style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.02em" }}
        >
          9:41
        </span>
        <div className="flex items-center gap-1.5">
          {/* Signal bars */}
          <div className="flex items-end gap-0.5">
            {[3, 5, 7, 9].map((h, i) => (
              <div
                key={i}
                className="rounded-sm bg-white"
                style={{ width: "3px", height: `${h}px`, opacity: i < 3 ? 1 : 0.4 }}
              />
            ))}
          </div>
          {/* WiFi icon */}
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M8 9.5C8.83 9.5 9.5 10.17 9.5 11S8.83 12.5 8 12.5 6.5 11.83 6.5 11 7.17 9.5 8 9.5z" fill="white"/>
            <path d="M8 6.5C9.93 6.5 11.68 7.28 12.95 8.55L14.37 7.13C12.72 5.48 10.47 4.5 8 4.5S3.28 5.48 1.63 7.13L3.05 8.55C4.32 7.28 6.07 6.5 8 6.5z" fill="white"/>
            <path d="M8 3.5C10.76 3.5 13.23 4.64 15 6.5L16.42 5.08C14.27 2.77 11.3 1.5 8 1.5S1.73 2.77 -.42 5.08L1 6.5C2.77 4.64 5.24 3.5 8 3.5z" fill="white" opacity="0.6"/>
          </svg>
          {/* Battery */}
          <div className="flex items-center gap-0.5">
            <div
              className="rounded-sm border border-white relative overflow-hidden"
              style={{ width: "22px", height: "11px" }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 rounded-sm"
                style={{ width: "75%", backgroundColor: "white" }}
              />
            </div>
            <div
              className="rounded-sm bg-white"
              style={{ width: "2px", height: "5px" }}
            />
          </div>
        </div>
      </div>

      {/* Header gradient */}
      <div
        className="flex flex-col items-center pt-8 pb-10 px-6 flex-shrink-0"
        style={{
          background: "linear-gradient(160deg, #0052CC 0%, #0065FF 60%, #2684FF 100%)",
        }}
      >
        {/* Logo container */}
        <div
          className="flex items-center justify-center mb-5"
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            backgroundColor: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            border: "1.5px solid rgba(255,255,255,0.3)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          {/* 10xDS stylized logo mark */}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="12" width="8" height="24" rx="2" fill="white" opacity="0.9"/>
            <rect x="18" y="6" width="8" height="36" rx="2" fill="white"/>
            <rect x="30" y="18" width="12" height="6" rx="3" fill="white" opacity="0.7"/>
            <rect x="30" y="28" width="12" height="6" rx="3" fill="white" opacity="0.5"/>
            <circle cx="36" cy="10" r="5" fill="white" opacity="0.85"/>
            <text x="33.5" y="13.5" fontSize="7" fontWeight="700" fill="#0052CC" fontFamily="Roboto">x</text>
          </svg>
        </div>

        {/* Brand name */}
        <div className="text-center mb-1">
          <span
            className="text-white"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            10xDS
          </span>
        </div>
        <h1
          className="text-white text-center mb-1"
          style={{
            fontSize: "17px",
            fontWeight: 600,
            letterSpacing: "0.01em",
            lineHeight: 1.3,
          }}
        >
          Enterprise Service Management
        </h1>

        {/* Feature chips */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1"
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: "100px",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Icon size={11} color="rgba(255,255,255,0.9)" />
              <span
                style={{
                  fontSize: "10.5px",
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main login card */}
      <div
        className="flex-1 flex flex-col mx-4 -mt-5 relative"
        style={{
          backgroundColor: "white",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -4px 24px rgba(0,82,204,0.08), 0 2px 48px rgba(0,0,0,0.06)",
          zIndex: 10,
        }}
      >
        <div className="px-6 pt-8 pb-6 flex flex-col flex-1">
          {/* Welcome section */}
          <div className="mb-7">
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#091E42",
                letterSpacing: "-0.02em",
                marginBottom: "6px",
              }}
            >
              Welcome back
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#626F86",
                fontWeight: 400,
                lineHeight: 1.5,
              }}
            >
              Sign in to manage services, assets, and maintenance workflows.
            </p>
          </div>

          {/* Email field */}
          <div className="mb-4">
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#44526A",
                marginBottom: "6px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Email Address
            </label>
            <div
              className="flex items-center gap-3 px-4"
              style={{
                height: "52px",
                backgroundColor: emailFocused ? "#F0F4FF" : "#F7F8FA",
                borderRadius: "12px",
                border: emailFocused
                  ? "2px solid #0052CC"
                  : "1.5px solid #DFE1E6",
                transition: "all 0.2s ease",
                boxShadow: emailFocused
                  ? "0 0 0 3px rgba(0,82,204,0.1)"
                  : "none",
              }}
            >
              <Mail
                size={18}
                color={emailFocused ? "#0052CC" : "#8590A2"}
                style={{ flexShrink: 0, transition: "color 0.2s" }}
              />
              <input
                type="email"
                placeholder="your@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "15px",
                  color: "#091E42",
                  fontFamily: "'Roboto', sans-serif",
                }}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="mb-5">
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#44526A",
                marginBottom: "6px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Password
            </label>
            <div
              className="flex items-center gap-3 px-4"
              style={{
                height: "52px",
                backgroundColor: passwordFocused ? "#F0F4FF" : "#F7F8FA",
                borderRadius: "12px",
                border: passwordFocused
                  ? "2px solid #0052CC"
                  : "1.5px solid #DFE1E6",
                transition: "all 0.2s ease",
                boxShadow: passwordFocused
                  ? "0 0 0 3px rgba(0,82,204,0.1)"
                  : "none",
              }}
            >
              <Lock
                size={18}
                color={passwordFocused ? "#0052CC" : "#8590A2"}
                style={{ flexShrink: 0, transition: "color 0.2s" }}
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "15px",
                  color: "#091E42",
                  fontFamily: "'Roboto', sans-serif",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  flexShrink: 0,
                  background: "none",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "6px",
                }}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#8590A2" />
                ) : (
                  <Eye size={18} color="#8590A2" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me + Forgot Password row */}
          <div className="flex items-center justify-between mb-7">
            <label
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setRememberMe(!rememberMe)}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "5px",
                  border: rememberMe ? "none" : "2px solid #C1C7D0",
                  backgroundColor: rememberMe ? "#0052CC" : "transparent",
                  transition: "all 0.18s ease",
                  boxShadow: rememberMe
                    ? "0 2px 6px rgba(0,82,204,0.35)"
                    : "none",
                }}
              >
                {rememberMe && (
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                    <path
                      d="M1 4L4.5 7.5L11 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span
                style={{
                  fontSize: "13.5px",
                  color: "#44526A",
                  fontWeight: 400,
                  userSelect: "none",
                }}
              >
                Remember me
              </span>
            </label>

            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              style={{
                background: "none",
                border: "none",
                fontSize: "13.5px",
                color: "#0052CC",
                fontWeight: 600,
                cursor: "pointer",
                padding: "0",
                fontFamily: "'Roboto', sans-serif",
                letterSpacing: "0.01em",
              }}
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In button */}
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            style={{
              width: "100%",
              height: "52px",
              borderRadius: "12px",
              border: "none",
              background: isLoading
                ? "linear-gradient(135deg, #5B8DEF 0%, #3D72DC 100%)"
                : "linear-gradient(135deg, #0065FF 0%, #0052CC 60%, #003DA8 100%)",
              color: "white",
              fontSize: "16px",
              fontWeight: 600,
              fontFamily: "'Roboto', sans-serif",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(0,82,204,0.35), 0 1px 3px rgba(0,0,0,0.12)",
              transition: "all 0.2s ease",
              letterSpacing: "0.02em",
              marginBottom: "16px",
            }}
          >
            {isLoading ? (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  style={{ animation: "spin 0.8s linear infinite" }}
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M10 2a8 8 0 0 1 8 8"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ChevronRight size={18} />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div
              style={{
                flex: 1,
                height: "1px",
                backgroundColor: "#EBECF0",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                color: "#97A0AF",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              New to platform?
            </span>
            <div
              style={{
                flex: 1,
                height: "1px",
                backgroundColor: "#EBECF0",
              }}
            />
          </div>

          {/* Create Account button */}
          <button
            type="button"
            onClick={() => navigate("/register")}
            style={{
              width: "100%",
              height: "50px",
              borderRadius: "12px",
              border: "2px solid #DFE1E6",
              background: "transparent",
              color: "#0052CC",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "'Roboto', sans-serif",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
              letterSpacing: "0.01em",
            }}
          >
            Create Account
          </button>

          {/* SSO hint */}
          <p
            className="text-center mt-5"
            style={{
              fontSize: "12px",
              color: "#97A0AF",
              lineHeight: 1.5,
            }}
          >
            Enterprise SSO available via your organization's identity provider.{" "}
            <span style={{ color: "#0052CC", fontWeight: 500, cursor: "pointer" }}>
              Learn more
            </span>
          </p>

          {/* ── Demo Role Selector ── */}
          <div className="mt-8 mb-2">
            <div className="flex items-center gap-3 mb-4">
              <div style={{ flex: 1, height: "1px", backgroundColor: "#EBECF0" }} />
              <span style={{ fontSize: "11px", color: "#97A0AF", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                or demo as
              </span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#EBECF0" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "40px", borderRadius: "8px", border: "1px solid #DFE1E6", backgroundColor: "#F7F8FA", color: "#44526A", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                <Building2 size={15} color="#0052CC" /> Organization
              </button>
              <button
                type="button"
                onClick={() => navigate("/vendor/dashboard")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "40px", borderRadius: "8px", border: "1px solid #DFE1E6", backgroundColor: "#F7F8FA", color: "#44526A", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                <Briefcase size={15} color="#0052CC" /> Vendor
              </button>
              <button
                type="button"
                onClick={() => navigate("/tech/home")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "40px", borderRadius: "8px", border: "1px solid #DFE1E6", backgroundColor: "#F7F8FA", color: "#44526A", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                <Wrench size={15} color="#0052CC" /> Technician
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "40px", borderRadius: "8px", border: "1px solid #E0E7FF", backgroundColor: "#EEF2FF", color: "#4F46E5", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
              >
                <Settings size={15} color="#4F46E5" /> System Admin
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: "11px", color: "#4F46E5", marginTop: "8px", fontWeight: 500 }}>
              Platform Owner
            </p>
          </div>

          <div className="flex-1" />

          {/* Footer */}
          <div className="flex flex-col items-center gap-2 pt-6 pb-2">
            {/* Security badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 mb-1"
              style={{
                backgroundColor: "#F3F6FF",
                borderRadius: "100px",
                border: "1px solid #DCE4FF",
              }}
            >
              <Shield size={11} color="#0052CC" />
              <span
                style={{
                  fontSize: "10.5px",
                  color: "#0052CC",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                }}
              >
                256-bit SSL Encrypted
              </span>
            </div>

            <p
              style={{
                fontSize: "11px",
                color: "#B3BAC5",
                fontWeight: 400,
                letterSpacing: "0.02em",
              }}
            >
              10xDS Enterprise Service Management
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "#C1C7D0",
                fontWeight: 400,
              }}
            >
              Version 4.2.1 (Build 20260625) · © 2026 10xDS
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </MobileLayout>
  );
}
