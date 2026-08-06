import { handleBackNavigation } from "../utils/navigation";
import { useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Mail, Shield, RefreshCw, ChevronRight, Edit3 } from "lucide-react";
import { MobileLayout } from "./ui/MobileLayout";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

interface Props {
  email?: string;
  onBack: () => void;
  onNext: () => void;
}

export function VerifyEmailScreen({ email = "admin@company.com", onBack, onNext }: Props) {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const [shakeError, setShakeError] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");
    if (digit && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        inputs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    pasted.split("").forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    const nextEmpty = pasted.length < 6 ? pasted.length : 5;
    inputs.current[nextEmpty]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter all 6 digits of the verification code.");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }
    setError("");
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup"
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Email verified!");
      onNext();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setIsResending(true);
    setOtp(["", "", "", "", "", ""]);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Verification code resent.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resend.");
    } finally {
      setIsResending(false);
      setCountdown(30);
      setCanResend(false);
      inputs.current[0]?.focus();
    }
  };

  const filledCount = otp.filter(Boolean).length;

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
              <div key={i} className="rounded-sm bg-white" style={{ width: "3px", height: `${h}px`, opacity: i < 3 ? 1 : 0.4 }} />
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <div className="rounded-sm border border-white relative overflow-hidden" style={{ width: "22px", height: "11px" }}>
              <div className="absolute left-0 top-0 bottom-0 rounded-sm" style={{ width: "75%", backgroundColor: "white" }} />
            </div>
            <div className="rounded-sm bg-white" style={{ width: "2px", height: "5px" }} />
          </div>
        </div>
      </div>

      {/* Gradient Header */}
      <div
        className="flex flex-col px-6 pt-5 pb-12 flex-shrink-0"
        style={{ background: "linear-gradient(160deg, #0052CC 0%, #0065FF 60%, #2684FF 100%)" }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "10px", padding: "7px 14px 7px 10px",
            cursor: "pointer", color: "white", fontSize: "13px", fontWeight: 600,
            fontFamily: "'Roboto', sans-serif", marginBottom: "20px", width: "fit-content",
          }}
        >
          <ArrowLeft size={16} color="white" />
          Back
        </button>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                height: "4px", borderRadius: "100px", backgroundColor: "white",
                opacity: s <= 2 ? 1 : 0.3,
                width: s === 2 ? "32px" : s < 2 ? "20px" : "14px",
                transition: "all 0.3s ease",
              }}
            />
          ))}
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", fontWeight: 600, marginLeft: "4px" }}>Step 2 of 3</span>
        </div>

        <div className="flex items-center gap-4">
          <div
            style={{
              width: "52px", height: "52px", borderRadius: "14px",
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <Mail size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: "3px" }}>
              Email Verification
            </p>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "white", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Verify Your Email
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
        }}
      >
        <div className="px-6 pt-8 pb-6 flex flex-col flex-1">

          {/* Email sent to */}
          <div
            className="flex items-start gap-3 p-4 mb-7"
            style={{ backgroundColor: "#F3F6FF", borderRadius: "14px", border: "1.5px solid #C1D0FF" }}
          >
            <div
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, #0065FF 0%, #0052CC 100%)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Mail size={18} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "12px", color: "#44526A", marginBottom: "3px", fontWeight: 500 }}>
                Verification code sent to
              </p>
              <p style={{ fontSize: "14px", color: "#0052CC", fontWeight: 700, wordBreak: "break-all" }}>
                {email}
              </p>
              <p style={{ fontSize: "11.5px", color: "#8590A2", marginTop: "3px" }}>
                Check your inbox and spam folder
              </p>
            </div>
          </div>

          {/* OTP label */}
          <p
            style={{
              fontSize: "12px", fontWeight: 700, color: "#44526A",
              letterSpacing: "0.06em", textTransform: "uppercase" as const,
              marginBottom: "14px", textAlign: "center",
            }}
          >
            Enter 6-digit verification code
          </p>

          {/* OTP boxes */}
          <div
            className="flex justify-center gap-2 mb-3"
            style={{ animation: shakeError ? "shake 0.4s ease" : "none" }}
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onFocus={(e) => e.target.select()}
                style={{
                  width: "48px",
                  height: "56px",
                  textAlign: "center",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: digit ? "#091E42" : "#C1C7D0",
                  fontFamily: "'Roboto', sans-serif",
                  backgroundColor: digit ? "#F0F4FF" : "#F7F8FA",
                  border: digit
                    ? "2px solid #0052CC"
                    : error
                    ? "2px solid #DE350B"
                    : "1.5px solid #DFE1E6",
                  borderRadius: "12px",
                  outline: "none",
                  transition: "all 0.15s ease",
                  boxShadow: digit ? "0 0 0 3px rgba(0,82,204,0.1)" : "none",
                  caretColor: "#0052CC",
                }}
              />
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-3">
            {otp.map((digit, i) => (
              <div
                key={i}
                style={{
                  width: digit ? "20px" : "6px",
                  height: "6px",
                  borderRadius: "100px",
                  backgroundColor: digit ? "#0052CC" : "#EBECF0",
                  transition: "all 0.2s ease",
                }}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#DE350B" }} />
              <span style={{ fontSize: "12px", color: "#DE350B", fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* Expiry note */}
          <p style={{ fontSize: "12px", color: "#97A0AF", textAlign: "center", marginBottom: "20px" }}>
            Code expires in{" "}
            <span style={{ color: "#0052CC", fontWeight: 600 }}>10 minutes</span>
          </p>

          {/* Verify button */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={isLoading || filledCount < 6}
            style={{
              width: "100%", height: "52px", borderRadius: "12px", border: "none",
              background: filledCount === 6 && !isLoading
                ? "linear-gradient(135deg, #0065FF 0%, #0052CC 60%, #003DA8 100%)"
                : "linear-gradient(135deg, #A8C4FF 0%, #7EABF0 100%)",
              color: "white", fontSize: "16px", fontWeight: 600,
              fontFamily: "'Roboto', sans-serif",
              cursor: filledCount === 6 && !isLoading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: filledCount === 6 ? "0 4px 16px rgba(0,82,204,0.35), 0 1px 3px rgba(0,0,0,0.12)" : "none",
              transition: "all 0.25s ease",
              letterSpacing: "0.02em", marginBottom: "14px",
            }}
          >
            {isLoading ? (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                  <path d="M10 2a8 8 0 0 1 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Verifying...
              </>
            ) : (
              <>
                Verify Email
                <ChevronRight size={18} />
              </>
            )}
          </button>

          {/* Resend + Change Email row */}
          <div className="flex items-center justify-between gap-2 mb-6">
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || isResending}
              style={{
                flex: 1, height: "44px", borderRadius: "10px",
                border: canResend ? "1.5px solid #DFE1E6" : "1.5px solid #EBECF0",
                background: "transparent",
                color: canResend ? "#0052CC" : "#97A0AF",
                fontSize: "13px", fontWeight: 600,
                fontFamily: "'Roboto', sans-serif",
                cursor: canResend ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                transition: "all 0.2s",
              }}
            >
              {isResending ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                    <circle cx="10" cy="10" r="8" stroke="#C1C7D0" strokeWidth="2.5" />
                    <path d="M10 2a8 8 0 0 1 8 8" stroke="#0052CC" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  Resending...
                </>
              ) : canResend ? (
                <>
                  <RefreshCw size={13} />
                  Resend Code
                </>
              ) : (
                <>
                  <RefreshCw size={13} />
                  Resend in {countdown}s
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onBack}
              style={{
                flex: 1, height: "44px", borderRadius: "10px",
                border: "1.5px solid #DFE1E6",
                background: "transparent",
                color: "#44526A",
                fontSize: "13px", fontWeight: 600,
                fontFamily: "'Roboto', sans-serif",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              <Edit3 size={13} />
              Change Email
            </button>
          </div>

          {/* Information card */}
          <div
            className="p-4 mb-2"
            style={{ backgroundColor: "#F7F8FA", borderRadius: "14px", border: "1px solid #EBECF0" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                style={{
                  width: "22px", height: "22px", borderRadius: "6px",
                  background: "linear-gradient(135deg, #0065FF 0%, #0052CC 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
              </div>
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#091E42" }}>Account Activation</span>
            </div>
            <p style={{ fontSize: "12px", color: "#626F86", lineHeight: 1.65 }}>
              Your organization account will become active after successful email verification. Once verified, you can configure your workspace and invite team members.
            </p>
          </div>

          <div className="flex-1" />

          {/* Footer */}
          <div className="flex flex-col items-center gap-2 pt-5 pb-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1" style={{ backgroundColor: "#F3F6FF", borderRadius: "100px", border: "1px solid #DCE4FF" }}>
              <Shield size={11} color="#0052CC" />
              <span style={{ fontSize: "10.5px", color: "#0052CC", fontWeight: 600, letterSpacing: "0.03em" }}>Secure verification · Encrypted communication</span>
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
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </MobileLayout>
  );
}
