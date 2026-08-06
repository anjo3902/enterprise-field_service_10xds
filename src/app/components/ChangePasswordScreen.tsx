import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import { ArrowLeft, Lock, Eye, EyeOff, Check } from "lucide-react";

const blue = "#2563EB";
const blueMid = "#3B82F6";
const ink = "#0F172A";
const inkMut = "#64748B";
const inkFaint = "#94A3B8";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const red = "#EF4444";
const green = "#10B981";

const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3, 5, 7, 9].map((h, i) => <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white", opacity: i < 4 ? 1 : 0.4 }} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <div style={{ width: "22px", height: "11px", borderRadius: "2px", border: "1.5px solid white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, right: "3px", backgroundColor: "white", borderRadius: "1px" }} />
          </div>
          <div style={{ width: "2px", height: "5px", borderRadius: "1px", backgroundColor: "white" }} />
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  const navigate = useNavigate();
  return (
    <div style={{ background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <button
          type="button"
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}
          onClick={() => handleBackNavigation(navigate, '/settings')}
        >
          <ArrowLeft size={15} color="white" /> Back
        </button>
      </div>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, marginBottom: "4px" }}>Change Password</h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>Update your account security</p>
      </div>
    </div>
  );
}

export default function ChangePasswordScreen() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Simulate saving password locally
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      navigate("/settings");
    }, 2000);
  };

  const InputField = ({ label, value, setValue, show, setShow, placeholder }: any) => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter, marginBottom: "8px" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "12px", top: "12px" }}><Lock size={18} color={inkFaint} /></div>
        <input 
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={{ width: "100%", height: "44px", padding: "0 40px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: bg, fontSize: "14px", color: ink, fontFamily: inter, outline: "none" }}
        />
        <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: "12px", top: "12px", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {show ? <EyeOff size={18} color={inkMut} /> : <Eye size={18} color={inkMut} />}
        </button>
      </div>
    </div>
  );

  return (
    <MobileLayout
      header={<><StatusBar /><PageHeader /></>}
      showBottomNav={false}
      modals={
        success && (
          <div style={{ position: "absolute", bottom: "40px", left: "20px", right: "20px", backgroundColor: green, color: "white", padding: "16px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 10px 25px rgba(16,185,129,0.3)", animation: "slideUp 0.3s ease", zIndex: 1000 }}>
            <Check size={20} color="white" />
            <span style={{ fontSize: "14px", fontWeight: 600, fontFamily: inter }}>Password changed successfully!</span>
          </div>
        )
      }
    >
      <div style={{ padding: "24px 20px" }}>
        <div style={{ backgroundColor: card, borderRadius: "20px", padding: "20px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
          {error && (
            <div style={{ backgroundColor: `${red}10`, color: red, padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, fontFamily: inter, marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <InputField label="Current Password" value={currentPassword} setValue={setCurrentPassword} show={showCurrent} setShow={setShowCurrent} placeholder="Enter current password" />
            <InputField label="New Password" value={newPassword} setValue={setNewPassword} show={showNew} setShow={setShowNew} placeholder="Enter new password" />
            <InputField label="Confirm Password" value={confirmPassword} setValue={setConfirmPassword} show={showConfirm} setShow={setShowConfirm} placeholder="Confirm new password" />

            <button type="submit" style={{ width: "100%", height: "48px", borderRadius: "12px", backgroundColor: blue, color: "white", border: "none", fontSize: "15px", fontWeight: 700, fontFamily: inter, cursor: "pointer", marginTop: "12px" }}>
              Save New Password
            </button>
          </form>
        </div>
      </div>
    </MobileLayout>
  );
}
