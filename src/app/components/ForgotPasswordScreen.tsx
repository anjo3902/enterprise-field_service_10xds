import { handleBackNavigation } from "../utils/navigation";
import { useNavigate } from "react-router";
import { useState } from "react";
import { ArrowLeft, Mail, Shield, RefreshCw, CheckCircle2, ChevronRight } from "lucide-react";
import { MobileLayout } from "./ui/MobileLayout";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: Props) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [error, setError] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSend = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password reset email sent!");
      setStep("success");
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1800);
  };

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
          <div className="flex items-end gap-0.5">
            {[3, 5, 7, 9].map((h, i) => (
              <div
                key={i}
                className="rounded-sm bg-white"
                style={{ width: "3px", height: `${h}px`, opacity: i < 3 ? 1 : 0.4 }}
              />
            ))}
          </div>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M8 9.5C8.83 9.5 9.5 10.17 9.5 11S8.83 12.5 8 12.5 6.5 11.83 6.5 11 7.17 9.5 8 9.5z" fill="white"/>
            <path d="M8 6.5C9.93 6.5 11.68 7.28 12.95 8.55L14.37 7.13C12.72 5.48 10.47 4.5 8 4.5S3.28 5.48 1.63 7.13L3.05 8.55C4.32 7.28 6.07 6.5 8 6.5z" fill="white"/>
          </svg>
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
            <div className="rounded-sm bg-white" style={{ width: "2px", height: "5px" }} />
          </div>
        </div>
      </div>

      {/* Header */}
      <div
        className="flex flex-col px-6 pt-5 pb-10 flex-shrink-0"
        style={{
          background: "linear-gradient(160deg, #0052CC 0%, #0065FF 60%, #2684FF 100%)",
        }}
      >
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "10px",
            padding: "7px 14px 7px 10px",
            cursor: "pointer",
            color: "white",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "'Roboto', sans-serif",
            letterSpacing: "0.01em",
            backdropFilter: "blur(8px)",
            marginBottom: "28px",
            width: "fit-content",
          }}
        >
          <ArrowLeft size={16} color="white" />
          Back to Sign In
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div
            style={{
              width: "28px",
              height: "4px",
              borderRadius: "100px",
              backgroundColor: "white",
              opacity: 1,
            }}
          />
          <div
            style={{
              width: step === "success" ? "28px" : "14px",
              height: "4px",
              borderRadius: "100px",
              backgroundColor: "white",
              opacity: step === "success" ? 1 : 0.35,
              transition: "all 0.4s ease",
            }}
          />
        </div>

        {/* Icon + heading */}
        <div className="flex items-center gap-4 mb-2">
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Mail size={24} color="white" />
          </div>
          <div>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: "3px",
              }}
            >
              Account Recovery
            </p>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {step === "success" ? "Check your inbox" : "Forgot Password?"}
            </h1>
          </div>
        </div>
      </div>

      {/* Main card */}
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

          {step === "form" ? (
            <>
              {/* Description */}
              <p
                style={{
                  fontSize: "14.5px",
                  color: "#44526A",
                  lineHeight: 1.6,
                  marginBottom: "28px",
                }}
              >
                Enter the email address associated with your 10xDS ESM account. We'll send a secure reset link to your inbox.
              </p>

              {/* Email field */}
              <div className="mb-2">
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
                  Work Email Address
                </label>
                <div
                  className="flex items-center gap-3 px-4"
                  style={{
                    height: "52px",
                    backgroundColor: emailFocused ? "#F0F4FF" : "#F7F8FA",
                    borderRadius: "12px",
                    border: error
                      ? "2px solid #DE350B"
                      : emailFocused
                      ? "2px solid #0052CC"
                      : "1.5px solid #DFE1E6",
                    transition: "all 0.2s ease",
                    boxShadow: emailFocused && !error
                      ? "0 0 0 3px rgba(0,82,204,0.1)"
                      : error
                      ? "0 0 0 3px rgba(222,53,11,0.08)"
                      : "none",
                  }}
                >
                  <Mail
                    size={18}
                    color={error ? "#DE350B" : emailFocused ? "#0052CC" : "#8590A2"}
                    style={{ flexShrink: 0, transition: "color 0.2s" }}
                  />
                  <input
                    type="email"
                    placeholder="your@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    autoFocus
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
                  {isValidEmail && !error && (
                    <CheckCircle2 size={18} color="#36B37E" style={{ flexShrink: 0 }} />
                  )}
                </div>

                {/* Error message */}
                {error && (
                  <div
                    className="flex items-center gap-1.5 mt-2"
                  >
                    <div
                      style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        backgroundColor: "#DE350B",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: "12px", color: "#DE350B", fontWeight: 500 }}>
                      {error}
                    </span>
                  </div>
                )}
              </div>

              {/* Security note */}
              <div
                className="flex items-start gap-3 p-3 mb-8 mt-4"
                style={{
                  backgroundColor: "#F3F6FF",
                  borderRadius: "10px",
                  border: "1px solid #DCE4FF",
                }}
              >
                <Shield size={15} color="#0052CC" style={{ flexShrink: 0, marginTop: "1px" }} />
                <p style={{ fontSize: "12px", color: "#344563", lineHeight: 1.55 }}>
                  For security, reset links expire after{" "}
                  <span style={{ fontWeight: 600, color: "#0052CC" }}>30 minutes</span>.
                  Only one active link is allowed per account at a time.
                </p>
              </div>

              {/* Send Reset Link button */}
              <button
                type="button"
                onClick={handleSend}
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
                      <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                      <path d="M10 2a8 8 0 0 1 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    Sending reset link...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <ChevronRight size={18} />
                  </>
                )}
              </button>

              {/* Back to sign in text link */}
              <button
                type="button"
                onClick={onBack}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "14px",
                  color: "#44526A",
                  fontFamily: "'Roboto', sans-serif",
                  cursor: "pointer",
                  textAlign: "center",
                  width: "100%",
                  padding: "8px",
                }}
              >
                Remember your password?{" "}
                <span style={{ color: "#0052CC", fontWeight: 600 }}>Sign in</span>
              </button>

              <div className="flex-1" />

              {/* Help section */}
              <div
                className="p-4 mt-6"
                style={{
                  backgroundColor: "#F7F8FA",
                  borderRadius: "12px",
                  border: "1px solid #EBECF0",
                }}
              >
                <p style={{ fontSize: "12px", color: "#626F86", marginBottom: "8px", fontWeight: 600 }}>
                  Need help?
                </p>
                <p style={{ fontSize: "12px", color: "#8590A2", lineHeight: 1.6 }}>
                  Contact your IT administrator or reach support at{" "}
                  <span style={{ color: "#0052CC", fontWeight: 500 }}>support@10xds.com</span>
                </p>
              </div>
            </>
          ) : (
            /* ── SUCCESS STATE ── */
            <div className="flex flex-col items-center flex-1">

              {/* Success illustration */}
              <div className="relative flex items-center justify-center mb-8" style={{ marginTop: "8px" }}>
                {/* Outer pulse ring */}
                <div
                  style={{
                    position: "absolute",
                    width: "160px",
                    height: "160px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,82,204,0.06)",
                    animation: "pulse-ring 2.4s ease-out infinite",
                  }}
                />
                {/* Middle ring */}
                <div
                  style={{
                    position: "absolute",
                    width: "128px",
                    height: "128px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,82,204,0.09)",
                    animation: "pulse-ring 2.4s ease-out 0.4s infinite",
                  }}
                />
                {/* Main circle */}
                <div
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #0065FF 0%, #0052CC 100%)",
                    boxShadow: "0 8px 32px rgba(0,82,204,0.4), 0 2px 8px rgba(0,0,0,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {/* Envelope illustration */}
                  <svg width="52" height="42" viewBox="0 0 52 42" fill="none">
                    {/* Envelope body */}
                    <rect x="2" y="8" width="48" height="32" rx="4" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="2"/>
                    {/* Envelope flap */}
                    <path d="M2 12 L26 27 L50 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    {/* Check badge */}
                    <circle cx="40" cy="10" r="10" fill="#36B37E"/>
                    <path d="M35 10 L38.5 13.5 L45 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Success heading */}
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#091E42",
                  letterSpacing: "-0.02em",
                  textAlign: "center",
                  marginBottom: "10px",
                }}
              >
                Reset link sent!
              </h2>

              {/* Success description */}
              <p
                style={{
                  fontSize: "14.5px",
                  color: "#44526A",
                  lineHeight: 1.65,
                  textAlign: "center",
                  marginBottom: "6px",
                }}
              >
                We've sent a password reset link to
              </p>
              <div
                className="flex items-center gap-2 px-4 py-2 mb-8"
                style={{
                  backgroundColor: "#F0F4FF",
                  borderRadius: "100px",
                  border: "1.5px solid #C1D0FF",
                }}
              >
                <Mail size={14} color="#0052CC" />
                <span
                  style={{
                    fontSize: "14px",
                    color: "#0052CC",
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                  }}
                >
                  {email || "your@company.com"}
                </span>
              </div>

              {/* Steps guide */}
              <div
                className="w-full p-5 mb-6"
                style={{
                  backgroundColor: "#F7F8FA",
                  borderRadius: "16px",
                  border: "1px solid #EBECF0",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#44526A",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: "14px",
                  }}
                >
                  Next Steps
                </p>
                {[
                  { num: "1", text: "Open the email in your inbox", sub: "Check spam/junk if not visible" },
                  { num: "2", text: "Click the secure reset link", sub: "Link expires in 30 minutes" },
                  { num: "3", text: "Create a strong new password", sub: "Min. 12 chars with symbols" },
                ].map((item) => (
                  <div key={item.num} className="flex items-start gap-3 mb-3 last:mb-0">
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #0065FF 0%, #0052CC 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "white" }}>
                        {item.num}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#091E42", marginBottom: "1px" }}>
                        {item.text}
                      </p>
                      <p style={{ fontSize: "11.5px", color: "#8590A2" }}>{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resend */}
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                style={{
                  width: "100%",
                  height: "50px",
                  borderRadius: "12px",
                  border: "2px solid #DFE1E6",
                  background: "transparent",
                  color: isLoading ? "#8590A2" : "#0052CC",
                  fontSize: "15px",
                  fontWeight: 600,
                  fontFamily: "'Roboto', sans-serif",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  transition: "all 0.2s ease",
                  marginBottom: "12px",
                }}
              >
                {isLoading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                      <circle cx="10" cy="10" r="8" stroke="#C1C7D0" strokeWidth="2.5" />
                      <path d="M10 2a8 8 0 0 1 8 8" stroke="#0052CC" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw size={15} />
                    Resend Reset Link
                  </>
                )}
              </button>

              {/* Back to sign in */}
              <button
                type="button"
                onClick={onBack}
                style={{
                  width: "100%",
                  height: "52px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #0065FF 0%, #0052CC 60%, #003DA8 100%)",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: 600,
                  fontFamily: "'Roboto', sans-serif",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 16px rgba(0,82,204,0.35), 0 1px 3px rgba(0,0,0,0.12)",
                }}
              >
                <ArrowLeft size={17} />
                Back to Sign In
              </button>

              <div className="flex-1" />
            </div>
          )}

          {/* Footer — always visible */}
          <div className="flex flex-col items-center gap-2 pt-6 pb-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 mb-1"
              style={{
                backgroundColor: "#F3F6FF",
                borderRadius: "100px",
                border: "1px solid #DCE4FF",
              }}
            >
              <Shield size={11} color="#0052CC" />
              <span style={{ fontSize: "10.5px", color: "#0052CC", fontWeight: 600, letterSpacing: "0.03em" }}>
                256-bit SSL Encrypted
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "#B3BAC5", fontWeight: 400, letterSpacing: "0.02em" }}>
              10xDS Enterprise Service Management
            </p>
            <p style={{ fontSize: "11px", color: "#C1C7D0", fontWeight: 400 }}>
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
        @keyframes pulse-ring {
          0% { transform: scale(0.85); opacity: 0.7; }
          70% { transform: scale(1); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </MobileLayout>
  );
}
