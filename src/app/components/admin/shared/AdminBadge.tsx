import React from "react";
import { adminTokens } from "../../../theme/adminTokens";

type BadgeStatus = "active" | "archived" | "healthy" | "degraded" | "critical" | "warning" | "success" | "neutral" | string;

interface AdminBadgeProps {
  status: BadgeStatus;
  label?: string;
  style?: React.CSSProperties;
}

export function AdminBadge({ status, label, style }: AdminBadgeProps) {
  const s = status.toLowerCase();
  let color = adminTokens.inkMut;
  let bg = adminTokens.inkMut + "15";

  if (s === 'active' || s === 'healthy' || s === 'success') {
    color = adminTokens.green;
    bg = adminTokens.green + "15";
  } else if (s === 'archived' || s === 'neutral') {
    color = adminTokens.inkSec;
    bg = adminTokens.inkMut + "15";
  } else if (s === 'degraded' || s === 'warning') {
    color = adminTokens.orange;
    bg = adminTokens.orange + "15";
  } else if (s === 'critical' || s === 'error') {
    color = adminTokens.red;
    bg = adminTokens.red + "15";
  }

  return (
    <span style={{ 
      fontSize: "11px", 
      fontWeight: 600, 
      padding: "4px 8px", 
      borderRadius: "12px", 
      backgroundColor: bg, 
      color: color,
      textTransform: "capitalize",
      ...style 
    }}>
      {label || status}
    </span>
  );
}
