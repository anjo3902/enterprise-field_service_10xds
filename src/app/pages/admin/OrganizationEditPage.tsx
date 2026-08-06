import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { AdminActionFooter } from "../../components/admin/shared/AdminActionFooter";
import { useAdminContext } from "../../contexts/AdminContext";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function OrganizationEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organizations } = useAdminContext();
  
  const org = organizations.find(o => o.id === id);

  const [name, setName] = useState(org?.name || "");
  const [region, setRegion] = useState(org?.region || "");
  const [adminName, setAdminName] = useState(org?.adminName || "");
  const [adminEmail, setAdminEmail] = useState(org?.adminEmail || "");

  if (!org) return <div>Not found</div>;

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Edit Organization" fallbackRoute={`/admin/organizations/${id}`} />}>
      <div style={{ padding: "20px 16px" }}>
        
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}`, marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>General Info</h2>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Organization Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Region</label>
            <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
        </div>

        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Primary Admin</h2>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Full Name</label>
            <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Email</label>
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${tokens.border}` }} />
          </div>
        </div>

        <AdminActionFooter>
          <button 
            onClick={() => navigate(`/admin/organizations/${id}`)}
            style={{ width: "100%", padding: "14px", backgroundColor: tokens.primary, color: "white", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
          >
            Save Changes
          </button>
        </AdminActionFooter>

      </div>
    </MobileLayout>
  );
}
