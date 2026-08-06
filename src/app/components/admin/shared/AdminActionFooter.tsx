import React, { ReactNode } from "react";
import { adminTokens as tokens } from "../../../theme/adminTokens";

interface AdminActionFooterProps {
  children: ReactNode;
}

export function AdminActionFooter({ children }: AdminActionFooterProps) {
  return (
    <>
      {/* Spacer to ensure the last form field is reachable when scrolled to the bottom */}
      <div style={{ height: "80px", flexShrink: 0 }} />
      <div style={{
        position: "absolute",
        bottom: "83px", // Height of AdminBottomNavigation
        left: 0,
        right: 0,
        padding: "16px 20px", 
        backgroundColor: "white",
        borderTop: `1px solid ${tokens.border}`,
        display: "flex",
        gap: "12px",
        zIndex: 50,
      }}>
        {children}
      </div>
    </>
  );
}
