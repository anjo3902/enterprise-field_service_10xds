import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { AdminActionFooter } from "../../components/admin/shared/AdminActionFooter";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { CheckCircle, Loader2 } from "lucide-react";

export default function UserCreatePage() {
  const navigate = useNavigate();

  const [role, setRole] = useState("org_admin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [assignment, setAssignment] = useState("");

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = () => {
    setError("");
    if (!firstName.trim() || !lastName.trim()) return setError("First and Last name are required.");
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return setError("A valid Email Address is required.");
    if (!phone.trim()) return setError("Phone Number is required.");
    
    if (email === "admin@10xds.com" || email === "test@test.com") {
      return setError("A user with this email already exists.");
    }

    if (role !== "system_admin" && !assignment) {
      return setError("Please select an organization or vendor assignment.");
    }

    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => navigate('/admin/users'), 1500);
    }, 1000);
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Create User" fallbackRoute="/admin/users" />}>
      <div style={{ padding: "20px 16px 80px" }}>
        
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}`, marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Personal Details</h2>
          
          {error && (
            <div style={{ backgroundColor: "#FEF2F2", padding: "12px", borderRadius: "12px", border: "1px solid #FECACA", marginBottom: "16px", color: tokens.red, fontSize: "13px", fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>First Name</label>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Last Name</label>
            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
        </div>

        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Role & Assignment</h2>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Platform Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white" }}>
              <option value="org_admin">Organization Admin</option>
              <option value="vendor_manager">Vendor Manager</option>
              <option value="technician">Technician</option>
              <option value="system_admin">System Admin</option>
            </select>
          </div>

          {role === 'org_admin' && (
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Assign to Organization</label>
              <select value={assignment} onChange={e => setAssignment(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white" }}>
                <option value="">Select an Organization...</option>
                <option value="Acme Corp">Acme Corp</option>
                <option value="Global Industries">Global Industries</option>
              </select>
            </div>
          )}

          {(role === 'vendor_manager' || role === 'technician') && (
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Assign to Vendor</label>
              <select value={assignment} onChange={e => setAssignment(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white" }}>
                <option value="">Select a Vendor...</option>
                <option value="FixIt HVAC Services">FixIt HVAC Services</option>
                <option value="Spark Electricals">Spark Electricals</option>
              </select>
            </div>
          )}

          {role === 'system_admin' && (
            <div style={{ padding: "12px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", marginTop: "12px" }}>
              <span style={{ fontSize: "12px", color: "#991B1B", fontWeight: 500 }}>
                System Admins have unrestricted access to all platform features, tenants, and vendor data.
              </span>
            </div>
          )}
        </div>

        <AdminActionFooter>
          <button disabled={isSaving} onClick={handleSubmit} style={{ width: "100%", padding: "14px", backgroundColor: isSaving ? tokens.inkMut : tokens.primary, border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 600, color: "white", cursor: isSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {isSaving && <Loader2 size={18} className="animate-spin" />}
            Create User Account
          </button>
        </AdminActionFooter>

      </div>

      {showToast && (
        <div style={{
          position: "absolute", bottom: "100px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: tokens.green, color: "white", padding: "12px 24px",
          borderRadius: "30px", display: "flex", alignItems: "center", gap: "8px",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)", animation: "fadeInUp 0.3s ease-out", zIndex: 1000
        }}>
          <CheckCircle size={18} color="white" />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>User created successfully</span>
        </div>
      )}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </MobileLayout>
  );
}
