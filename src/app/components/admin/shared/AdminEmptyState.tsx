import React from "react";
import { adminTokens } from "../../../theme/adminTokens";

interface AdminEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function AdminEmptyState({ icon, title, description, action }: AdminEmptyStateProps) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", backgroundColor: adminTokens.card, borderRadius: "16px", border: `1px dashed ${adminTokens.border}` }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "28px", backgroundColor: adminTokens.bg, border: `1px solid ${adminTokens.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: adminTokens.inkMut }}>
        {icon}
      </div>
      <h3 style={{ fontSize: "16px", fontWeight: 700, color: adminTokens.ink, margin: "0 0 8px" }}>{title}</h3>
      <p style={{ fontSize: "13px", color: adminTokens.inkSec, margin: "0 0 20px" }}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
