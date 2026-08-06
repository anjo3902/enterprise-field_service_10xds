import React, { useState } from "react";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { Eye, EyeOff, Check, X as XIcon } from "lucide-react";

const blue = "#2563EB";
const green = "#16A34A";
const red = "#DC2626";
const ink = "#0F172A";
const inkSec = "#475569";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

const PasswordInput = ({ label, value, onChange, show, setShow }: any) => (
  <div style={{ marginBottom: "16px", position: "relative" }}>
    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </label>
    <input
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "14px 44px 14px 16px",
        backgroundColor: card,
        border: `1px solid ${border}`,
        borderRadius: "12px",
        fontSize: "15px", fontWeight: 500, color: ink,
        fontFamily: inter, outline: "none",
        transition: "border 0.2s"
      }}
    />
    <button 
      type="button" 
      onClick={() => setShow(!show)}
      style={{ position: "absolute", right: "12px", top: "34px", background: "none", border: "none", cursor: "pointer", color: inkSec }}
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
);

export default function VendorChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const validationRules = [
    { label: "Minimum 8 characters", test: (p: string) => p.length >= 8 },
    { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
    { label: "Number", test: (p: string) => /[0-9]/.test(p) },
    { label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const getStrength = (p: string) => {
    if (!p) return 0;
    let score = 0;
    if (p.length > 7) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0-4
  };

  const strength = getStrength(newPassword);
  let strengthColor = border;
  if (strength === 1) strengthColor = red;
  else if (strength === 2) strengthColor = "#D97706";
  else if (strength === 3) strengthColor = blue;
  else if (strength === 4) strengthColor = green;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) return setError("Please enter your current password.");
    if (validationRules.some(rule => !rule.test(newPassword))) {
      return setError("New password does not meet all requirements.");
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (currentPassword === newPassword) {
      return setError("New password cannot be the same as your current password.");
    }

    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 4000);
    }, 1000);
  };



  return (
    <MobileLayout backgroundColor={bg} showBottomNav={false}>
      <BackHeader title="Change Password" fallbackRoute="/vendor/settings" />

      <div style={{ padding: "20px 16px 40px" }}>
        
        {success && (
          <div style={{ padding: "12px 16px", backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", color: green, fontSize: "13px", fontWeight: 600, fontFamily: inter, marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Check size={16} /> Password updated successfully.
          </div>
        )}

        {error && (
          <div style={{ padding: "12px 16px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "12px", color: red, fontSize: "13px", fontWeight: 600, fontFamily: inter, marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
            <XIcon size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ backgroundColor: card, borderRadius: "20px", padding: "20px", boxShadow: cardShadow, border: `1px solid ${border}` }}>
          
          <PasswordInput label="Current Password" value={currentPassword} onChange={setCurrentPassword} show={showCurrent} setShow={setShowCurrent} />
          
          <div style={{ height: "1px", backgroundColor: border, margin: "24px 0" }} />

          <PasswordInput label="New Password" value={newPassword} onChange={setNewPassword} show={showNew} setShow={setShowNew} />
          
          {/* Strength Indicator */}
          {newPassword.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ flex: 1, height: "4px", borderRadius: "2px", backgroundColor: i <= strength ? strengthColor : border, transition: "background-color 0.3s" }} />
                ))}
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {validationRules.map((rule, idx) => {
                  const passed = rule.test(newPassword);
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: passed ? green : inkSec, fontFamily: inter }}>
                      {passed ? <Check size={12} /> : <div style={{ width: "12px", height: "12px", borderRadius: "50%", border: `1px solid ${border}` }} />}
                      {rule.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <PasswordInput label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} setShow={setShowConfirm} />

          <button 
            type="submit" 
            disabled={isSaving}
            style={{ 
              width: "100%", padding: "16px", marginTop: "16px",
              backgroundColor: blue, color: card, border: "none", borderRadius: "14px", 
              fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer", 
              display: "flex", alignItems: "center", justifyContent: "center", opacity: isSaving ? 0.7 : 1 
            }}
          >
            {isSaving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </MobileLayout>
  );
}
