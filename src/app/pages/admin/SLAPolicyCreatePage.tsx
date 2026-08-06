import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { AdminActionFooter } from "../../components/admin/shared/AdminActionFooter";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function SLAPolicyCreatePage() {
  const navigate = useNavigate();

  const [bizHours, setBizHours] = useState("24/7");

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Create SLA Policy" fallbackRoute="/admin/sla" />}>
      <div style={{ padding: "20px 16px 80px", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Section 1 - Identity */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Policy Identity</h2>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Policy Name</label>
            <input type="text" placeholder="e.g. Platinum Service Tier" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Description</label>
            <textarea placeholder="Brief description of when to use this policy..." rows={3} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, resize: "none" }} />
          </div>
        </div>

        {/* Section 2 - Priority Matrix */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Priority Matrix (Hours)</h2>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={{ paddingBottom: "8px", color: tokens.inkSec }}>Priority</th>
                  <th style={{ paddingBottom: "8px", color: tokens.inkSec }}>Resp</th>
                  <th style={{ paddingBottom: "8px", color: tokens.inkSec }}>Resolv</th>
                  <th style={{ paddingBottom: "8px", color: tokens.inkSec }}>Esc</th>
                </tr>
              </thead>
              <tbody>
                {['Critical', 'High', 'Medium', 'Low'].map(prio => (
                  <tr key={prio}>
                    <td style={{ padding: "8px 0", fontWeight: 600 }}>{prio}</td>
                    <td style={{ padding: "8px 4px" }}><input type="number" defaultValue={2} style={{ width: "40px", padding: "6px", borderRadius: "4px", border: `1px solid ${tokens.border}` }} /></td>
                    <td style={{ padding: "8px 4px" }}><input type="number" defaultValue={8} style={{ width: "40px", padding: "6px", borderRadius: "4px", border: `1px solid ${tokens.border}` }} /></td>
                    <td style={{ padding: "8px 4px" }}><input type="number" defaultValue={4} style={{ width: "40px", padding: "6px", borderRadius: "4px", border: `1px solid ${tokens.border}` }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3 - Business Hours */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Business Hours</h2>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Operating Mode</label>
            <select value={bizHours} onChange={(e) => setBizHours(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white" }}>
              <option value="24/7">24/7 (Always On)</option>
              <option value="business_hours">Business Hours Only</option>
            </select>
          </div>
          {bizHours === 'business_hours' && (
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Timezone</label>
              <select style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white" }}>
                <option>UTC (Default)</option>
                <option>America/New_York</option>
                <option>Asia/Dubai</option>
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Holiday Dates (YYYY-MM-DD)</label>
            <input type="text" placeholder="e.g. 2026-12-25, 2026-01-01" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
        </div>

        {/* Section 4 - Escalation */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Escalation Rules</h2>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Escalate To Role</label>
            <select style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white" }}>
              <option value="vendor_manager">Vendor Manager</option>
              <option value="org_admin">Organization Admin</option>
              <option value="system_admin">System Admin</option>
            </select>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Notification Channels</label>
            <select multiple style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: "white", minHeight: "80px" }}>
              <option value="email">Email</option>
              <option value="push">Push Notification</option>
              <option value="sms">SMS / Text</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Pre-Breach Warning (Time % elapsed)</label>
            <input type="number" defaultValue={75} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
        </div>

        <AdminActionFooter>
          <button onClick={() => navigate('/admin/sla')} style={{ width: "100%", padding: "14px", backgroundColor: tokens.primary, border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 600, color: "white", cursor: "pointer" }}>
            Save SLA Policy
          </button>
        </AdminActionFooter>

      </div>
    </MobileLayout>
  );
}
