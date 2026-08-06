import { handleBackNavigation } from "../utils/navigation";
import { useNavigate } from "react-router";
import { useState, useRef } from "react";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ChevronRight,
  CheckCircle2,
  Users,
} from "lucide-react";
import { MobileLayout } from "./ui/MobileLayout";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

const ORG_SIZES = [
  "1 – 10 employees",
  "11 – 50 employees",
  "51 – 200 employees",
  "201 – 500 employees",
  "501 – 1,000 employees",
  "1,000 – 5,000 employees",
  "5,000+ employees",
];

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          background: "linear-gradient(135deg, #0065FF 0%, #0052CC 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} color="white" />
      </div>
      <span
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#091E42",
          letterSpacing: "0.04em",
          textTransform: "uppercase" as const,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: "1px", backgroundColor: "#EBECF0" }} />
    </div>
  );
}

interface FieldProps {
  label: string;
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  valid?: boolean;
  rightSlot?: React.ReactNode;
}

function Field({
  label, icon: Icon, type = "text", placeholder,
  value, onChange, error, valid, rightSlot,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="mb-4">
      <label
        style={{
          display: "block",
          fontSize: "11.5px",
          fontWeight: 600,
          color: "#44526A",
          marginBottom: "5px",
          letterSpacing: "0.04em",
          textTransform: "uppercase" as const,
        }}
      >
        {label}
      </label>
      <div
        className="flex items-center gap-3 px-4"
        style={{
          height: "50px",
          backgroundColor: error ? "#FFF8F6" : focused ? "#F0F4FF" : "#F7F8FA",
          borderRadius: "12px",
          border: error
            ? "2px solid #DE350B"
            : focused
            ? "2px solid #0052CC"
            : "1.5px solid #DFE1E6",
          transition: "all 0.2s ease",
          boxShadow: focused && !error
            ? "0 0 0 3px rgba(0,82,204,0.1)"
            : error
            ? "0 0 0 3px rgba(222,53,11,0.07)"
            : "none",
        }}
      >
        <Icon size={16} color={error ? "#DE350B" : focused ? "#0052CC" : "#8590A2"} style={{ flexShrink: 0, transition: "color 0.2s" }} />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "14.5px",
            color: "#091E42",
            fontFamily: "'Roboto', sans-serif",
          }}
        />
        {rightSlot}
        {valid && !error && !rightSlot && (
          <CheckCircle2 size={16} color="#36B37E" style={{ flexShrink: 0 }} />
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#DE350B", flexShrink: 0 }} />
          <span style={{ fontSize: "11.5px", color: "#DE350B", fontWeight: 500 }}>{error}</span>
        </div>
      )}
    </div>
  );
}

export function RegisterScreen({ onBack, onNext }: Props) {
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [orgSize, setOrgSize] = useState("");
  const [sizeOpen, setSizeOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmFocused, setConfirmFocused] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const passwordStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "#DE350B", "#FF991F", "#36B37E", "#00875A"][passwordStrength];

  const handleRegister = async () => {
    const newErrors: Record<string, string> = {};
    if (!orgName) newErrors.orgName = "Organization name is required";
    if (!contactName) newErrors.contactName = "Contact person name is required";
    if (!email) newErrors.email = "Email is required";
    else if (!isEmailValid) newErrors.email = "Enter a valid business email";
    if (!mobile) newErrors.mobile = "Mobile number is required";
    if (!orgSize) newErrors.orgSize = "Select organization size";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8) newErrors.password = "Minimum 8 characters";
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!agreed) newErrors.agreed = "You must accept the terms";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: contactName.split(' ')[0],
            last_name: contactName.split(' ').slice(1).join(' '),
            org_name: orgName,
            phone: mobile,
            org_size: orgSize,
            role: 'org_admin'
          }
        }
      });

      if (error) {
        toast.error(error.message);
        return;
      }
      
      toast.success("Registration successful!");
      onNext();
    } catch (err: any) {
      toast.error(err.message || "Failed to register.");
    } finally {
      setIsLoading(false);
    }
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
        className="flex flex-col px-6 pt-5 pb-10 flex-shrink-0"
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
            fontFamily: "'Roboto', sans-serif", letterSpacing: "0.01em",
            marginBottom: "20px", width: "fit-content",
          }}
        >
          <ArrowLeft size={16} color="white" />
          Back to Sign In
        </button>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                height: "4px",
                borderRadius: "100px",
                backgroundColor: "white",
                opacity: s === 1 ? 1 : 0.3,
                width: s === 1 ? "32px" : "14px",
                transition: "all 0.3s ease",
              }}
            />
          ))}
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", fontWeight: 600, marginLeft: "4px" }}>Step 1 of 3</span>
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
            <Building2 size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: "3px" }}>
              Organization Setup
            </p>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "white", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Register Your Organization
            </h1>
          </div>
        </div>

        <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.72)", lineHeight: 1.55, marginTop: "10px" }}>
          Access AI-powered service management, asset monitoring, vendor coordination and technician dispatch.
        </p>

        {/* Notice chip */}
        <div
          className="flex items-center gap-2 mt-4 px-3 py-2"
          style={{
            backgroundColor: "rgba(255,255,255,0.12)",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.2)",
            width: "fit-content",
          }}
        >
          <Shield size={12} color="rgba(255,255,255,0.85)" />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: 600, letterSpacing: "0.02em" }}>
            For organizations only · Not for vendors or technicians
          </span>
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
          {/* Organization Details */}
          <SectionHeader icon={Building2} label="Organization Details" />

          <Field label="Organization Name" icon={Building2} placeholder="Acme Corporation" value={orgName} onChange={setOrgName} error={errors.orgName} valid={orgName.length > 2} />
          <Field label="Contact Person Name" icon={User} placeholder="John Smith" value={contactName} onChange={setContactName} error={errors.contactName} valid={contactName.length > 2} />
          <Field label="Official Business Email" icon={Mail} type="email" placeholder="admin@company.com" value={email} onChange={(v) => { setEmail(v); if (errors.email) setErrors(p => ({ ...p, email: "" })); }} error={errors.email} valid={isEmailValid} />
          <Field label="Mobile Number" icon={Phone} type="tel" placeholder="+1 (555) 000-0000" value={mobile} onChange={setMobile} error={errors.mobile} valid={mobile.length > 7} />
          <Field label="Company Address" icon={MapPin} placeholder="123 Business Ave, City, State" value={address} onChange={setAddress} />

          {/* Organization Size dropdown */}
          <div className="mb-6">
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#44526A", marginBottom: "5px", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
              Organization Size
            </label>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setSizeOpen(!sizeOpen)}
                style={{
                  width: "100%", height: "50px", borderRadius: "12px",
                  border: errors.orgSize ? "2px solid #DE350B" : sizeOpen ? "2px solid #0052CC" : "1.5px solid #DFE1E6",
                  backgroundColor: sizeOpen ? "#F0F4FF" : "#F7F8FA",
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "0 16px", cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: sizeOpen ? "0 0 0 3px rgba(0,82,204,0.1)" : "none",
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                <Users size={16} color={sizeOpen ? "#0052CC" : "#8590A2"} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: "left", fontSize: "14.5px", color: orgSize ? "#091E42" : "#8590A2" }}>
                  {orgSize || "Select organization size"}
                </span>
                <ChevronDown
                  size={16}
                  color="#8590A2"
                  style={{ flexShrink: 0, transform: sizeOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                />
              </button>

              {sizeOpen && (
                <div
                  style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                    backgroundColor: "white", borderRadius: "12px",
                    border: "1.5px solid #DFE1E6",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                    zIndex: 100, overflow: "hidden",
                  }}
                >
                  {ORG_SIZES.map((size, i) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setOrgSize(size); setSizeOpen(false); if (errors.orgSize) setErrors(p => ({ ...p, orgSize: "" })); }}
                      style={{
                        width: "100%", padding: "12px 16px",
                        display: "flex", alignItems: "center", gap: "10px",
                        background: orgSize === size ? "#F0F4FF" : "transparent",
                        border: "none",
                        borderBottom: i < ORG_SIZES.length - 1 ? "1px solid #F4F5F7" : "none",
                        cursor: "pointer", textAlign: "left",
                        fontFamily: "'Roboto', sans-serif",
                        transition: "background 0.15s",
                      }}
                    >
                      {orgSize === size && (
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#0052CC", flexShrink: 0 }} />
                      )}
                      <span style={{ fontSize: "14px", color: orgSize === size ? "#0052CC" : "#091E42", fontWeight: orgSize === size ? 600 : 400, paddingLeft: orgSize === size ? 0 : "18px" }}>
                        {size}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.orgSize && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#DE350B" }} />
                <span style={{ fontSize: "11.5px", color: "#DE350B", fontWeight: 500 }}>{errors.orgSize}</span>
              </div>
            )}
          </div>

          {/* Security Section */}
          <SectionHeader icon={Lock} label="Security" />

          {/* Create Password */}
          <div className="mb-4">
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#44526A", marginBottom: "5px", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
              Create Password
            </label>
            <PasswordField
              placeholder="Create a strong password"
              value={password}
              onChange={(v) => { setPassword(v); if (errors.password) setErrors(p => ({ ...p, password: "" })); }}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              error={errors.password}
            />
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ flex: 1, height: "3px", borderRadius: "100px", backgroundColor: i <= passwordStrength ? strengthColor : "#EBECF0", transition: "background 0.3s" }} />
                  ))}
                </div>
                <span style={{ fontSize: "11px", color: strengthColor, fontWeight: 600 }}>{strengthLabel} password</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-5">
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#44526A", marginBottom: "5px", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
              Confirm Password
            </label>
            <div
              className="flex items-center gap-3 px-4"
              style={{
                height: "50px", backgroundColor: errors.confirmPassword ? "#FFF8F6" : confirmFocused ? "#F0F4FF" : "#F7F8FA",
                borderRadius: "12px",
                border: errors.confirmPassword ? "2px solid #DE350B" : confirmFocused ? "2px solid #0052CC" : "1.5px solid #DFE1E6",
                transition: "all 0.2s ease",
                boxShadow: confirmFocused && !errors.confirmPassword ? "0 0 0 3px rgba(0,82,204,0.1)" : errors.confirmPassword ? "0 0 0 3px rgba(222,53,11,0.07)" : "none",
              }}
            >
              <Lock size={16} color={errors.confirmPassword ? "#DE350B" : confirmFocused ? "#0052CC" : "#8590A2"} style={{ flexShrink: 0 }} />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: "" })); }}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "14.5px", color: "#091E42", fontFamily: "'Roboto', sans-serif" }}
              />
              {confirmPassword && password && confirmPassword === password && (
                <CheckCircle2 size={16} color="#36B37E" style={{ flexShrink: 0 }} />
              )}
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", borderRadius: "6px" }}>
                {showConfirm ? <EyeOff size={16} color="#8590A2" /> : <Eye size={16} color="#8590A2" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#DE350B" }} />
                <span style={{ fontSize: "11.5px", color: "#DE350B", fontWeight: 500 }}>{errors.confirmPassword}</span>
              </div>
            )}
          </div>

          {/* Terms checkbox */}
          <label
            className="flex items-start gap-3 mb-6 cursor-pointer"
            onClick={() => { setAgreed(!agreed); if (errors.agreed) setErrors(p => ({ ...p, agreed: "" })); }}
          >
            <div
              style={{
                width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0, marginTop: "1px",
                border: errors.agreed ? "2px solid #DE350B" : agreed ? "none" : "2px solid #C1C7D0",
                backgroundColor: agreed ? "#0052CC" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.18s ease",
                boxShadow: agreed ? "0 2px 6px rgba(0,82,204,0.35)" : "none",
              }}
            >
              {agreed && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div>
              <span style={{ fontSize: "13px", color: "#44526A", lineHeight: 1.5, userSelect: "none" }}>
                I agree to the{" "}
                <span style={{ color: "#0052CC", fontWeight: 600 }}>Terms of Service</span>
                {" "}and{" "}
                <span style={{ color: "#0052CC", fontWeight: 600 }}>Privacy Policy</span>
              </span>
              {errors.agreed && (
                <p style={{ fontSize: "11px", color: "#DE350B", fontWeight: 500, marginTop: "2px" }}>{errors.agreed}</p>
              )}
            </div>
          </label>

          {/* Register button */}
          <button
            type="button"
            onClick={handleRegister}
            disabled={isLoading}
            style={{
              width: "100%", height: "52px", borderRadius: "12px", border: "none",
              background: isLoading
                ? "linear-gradient(135deg, #5B8DEF 0%, #3D72DC 100%)"
                : "linear-gradient(135deg, #0065FF 0%, #0052CC 60%, #003DA8 100%)",
              color: "white", fontSize: "16px", fontWeight: 600,
              fontFamily: "'Roboto', sans-serif",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: "0 4px 16px rgba(0,82,204,0.35), 0 1px 3px rgba(0,0,0,0.12)",
              transition: "all 0.2s ease",
              letterSpacing: "0.02em", marginBottom: "16px",
            }}
          >
            {isLoading ? (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                  <path d="M10 2a8 8 0 0 1 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Registering Organization...
              </>
            ) : (
              <>
                Register Organization
                <ChevronRight size={18} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            style={{
              background: "none", border: "none", fontSize: "14px", color: "#44526A",
              fontFamily: "'Roboto', sans-serif", cursor: "pointer", textAlign: "center", width: "100%", padding: "8px",
            }}
          >
            Already have an account?{" "}
            <span style={{ color: "#0052CC", fontWeight: 600 }}>Sign In</span>
          </button>

          {/* Footer */}
          <div className="flex flex-col items-center gap-2 pt-6 pb-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1" style={{ backgroundColor: "#F3F6FF", borderRadius: "100px", border: "1px solid #DCE4FF" }}>
              <Shield size={11} color="#0052CC" />
              <span style={{ fontSize: "10.5px", color: "#0052CC", fontWeight: 600, letterSpacing: "0.03em" }}>Enterprise-grade Secure Registration</span>
            </div>
            <p style={{ fontSize: "11px", color: "#B3BAC5", fontWeight: 400, letterSpacing: "0.02em", textAlign: "center" }}>
              Powered by 10xDS Enterprise Service Management
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

function PasswordField({
  placeholder, value, onChange, show, onToggle, error,
}: { placeholder: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      <div
        className="flex items-center gap-3 px-4"
        style={{
          height: "50px",
          backgroundColor: error ? "#FFF8F6" : focused ? "#F0F4FF" : "#F7F8FA",
          borderRadius: "12px",
          border: error ? "2px solid #DE350B" : focused ? "2px solid #0052CC" : "1.5px solid #DFE1E6",
          transition: "all 0.2s ease",
          boxShadow: focused && !error ? "0 0 0 3px rgba(0,82,204,0.1)" : error ? "0 0 0 3px rgba(222,53,11,0.07)" : "none",
        }}
      >
        <Lock size={16} color={error ? "#DE350B" : focused ? "#0052CC" : "#8590A2"} style={{ flexShrink: 0 }} />
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "14.5px", color: "#091E42", fontFamily: "'Roboto', sans-serif" }}
        />
        <button type="button" onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", borderRadius: "6px" }}>
          {show ? <EyeOff size={16} color="#8590A2" /> : <Eye size={16} color="#8590A2" />}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#DE350B" }} />
          <span style={{ fontSize: "11.5px", color: "#DE350B", fontWeight: 500 }}>{error}</span>
        </div>
      )}
    </>
  );
}
