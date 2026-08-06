import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useSafeBack } from "../../utils/navigation";

const inter = '"Inter", sans-serif';
const blue = "#2563EB";
const blueMid = "#3B82F6";

export interface BackHeaderProps {
  title: string;
  subtitle?: string;
  fallbackRoute: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  rightActions?: React.ReactNode;
  bottomRightContent?: React.ReactNode;
  variant?: "default" | "admin";
  breadcrumbs?: { label: string; path: string }[];
}

export function BackHeader({
  title,
  subtitle,
  fallbackRoute,
  showBackButton = true,
  onBackClick,
  rightActions,
  bottomRightContent,
  variant = "default",
  breadcrumbs,
}: BackHeaderProps) {
  const safeBack = useSafeBack();
  const navigate = useNavigate();

  const backgroundStyle = variant === "admin" 
    ? "linear-gradient(160deg,#1E1B4B 0%,#3730A3 50%,#4F46E5 100%)"
    : `linear-gradient(160deg,#0052CC 0%,${blue} 55%,${blueMid} 100%)`;

  return (
    <div style={{ background: backgroundStyle, padding: "10px 20px 18px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", minHeight: "36px" }}>
        {showBackButton ? (
          <button
            type="button"
            aria-label="Go back"
            onClick={onBackClick ? onBackClick : () => safeBack(fallbackRoute)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer",
              fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter
            }}
          >
            <ArrowLeft size={15} color="white" /> Back
          </button>
        ) : (
          <div /> // Spacer
        )}
        
        {rightActions && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {rightActions}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  <button 
                    onClick={() => navigate(crumb.path)}
                    style={{ 
                      background: "none", border: "none", padding: 0, 
                      color: "rgba(255,255,255,0.7)", fontSize: "12px", 
                      fontFamily: inter, cursor: "pointer", fontWeight: 500
                    }}
                  >
                    {crumb.label}
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>/</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          <h1 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: inter, color: "white", marginBottom: subtitle ? "3px" : "0", marginTop: "0" }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: inter, margin: 0 }}>
              {subtitle}
            </p>
          )}
        </div>
        
        {bottomRightContent && (
          <div>
            {bottomRightContent}
          </div>
        )}
      </div>
    </div>
  );
}
