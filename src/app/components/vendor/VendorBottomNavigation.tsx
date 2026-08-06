import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useVendor } from "../../contexts/VendorContext";
import { Home, Activity, Package, Bot, MoreHorizontal, Users, Bell, User, X } from "lucide-react";

const blue = "#2563EB";
const blueTint = "#EFF6FF";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const ink = "#0F172A";
const inkSec = "#475569";
const inkMut = "#64748B";
const inkFaint = "#94A3B8";
const inter = "'Inter', 'Roboto', sans-serif";

function VendorMoreDrawer({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const MORE_ITEMS = [
    { icon: Users, label: "Technicians", route: "/vendor/technicians", color: "#9333EA", tint: "#FAF5FF" }, // Purple
    { icon: Bell,  label: "Notifications", route: "/vendor/notifications", color: "#D97706", tint: "#FFFBEB" }, // Amber
    { icon: User,  label: "Profile", route: "/vendor/settings", color: "#475569", tint: "#F8FAFC" }, // Slate
  ];

  return (
    <div style={{
      backgroundColor: card,
      borderRadius: "24px 24px 0 0",
      boxShadow: "0 -12px 48px rgba(0,0,0,0.14), 0 -2px 8px rgba(0,0,0,0.06)",
      padding: "0 20px 16px",
    }}>
      {/* Drag handle */}
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 14px" }}>
        <div style={{ width: "40px", height: "4px", borderRadius: "100px", backgroundColor: border }} />
      </div>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "14.5px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.01em", margin: 0 }}>
            More Options
          </p>
          <p style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter, marginTop: "1px", marginBottom: 0 }}>
            Navigate to additional modules
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "30px", height: "30px", borderRadius: "50%",
            backgroundColor: divider, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={14} color={inkMut} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: border, marginBottom: "14px" }} />

      {/* Icon grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px 4px" }}>
        {MORE_ITEMS.map((item) => {
          const lines = item.label.split("\n");
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (location.pathname !== item.route) { navigate(item.route); onClose(); }
              }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "7px",
                padding: "10px 4px 9px",
                backgroundColor: "transparent", border: "none",
                cursor: "pointer", borderRadius: "14px", fontFamily: inter,
              }}
            >
              <div style={{
                width: "46px", height: "46px", borderRadius: "14px",
                backgroundColor: item.tint,
                border: `1.5px solid ${item.color}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 2px 8px ${item.color}18`,
              }}>
                <item.icon size={21} color={item.color} />
              </div>
              <span style={{
                fontSize: "9.5px", fontWeight: 600, color: inkSec,
                textAlign: "center", lineHeight: 1.35, fontFamily: inter,
              }}>
                {lines.map((l, i) => (
                  <span key={i} style={{ display: "block" }}>{l}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VendorBottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadActivityCount, unreadNotificationCount } = useVendor();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const tabs = [
    { key: "dashboard", icon: Home, label: "Home", path: "/vendor/dashboard" },
    { key: "activity", icon: Activity, label: "Activity", path: "/vendor/activity" },
    { key: "assets", icon: Package, label: "Assets", path: "/vendor/assets" },
    { key: "assistant", icon: Bot, label: "AI", path: "/vendor/assistant" },
    { key: "more", icon: MoreHorizontal, label: "More", path: "" },
  ];

  return (
    <div style={{ flexShrink: 0, position: "relative", zIndex: 100 }}>
      {/* More drawer — slides in above the nav bar */}
      <div style={{
        position: "absolute", bottom: "68px", left: 0, right: 0,
        pointerEvents: isMoreOpen ? "auto" : "none",
        opacity: isMoreOpen ? 1 : 0,
        transform: isMoreOpen ? "translateY(0)" : "translateY(100%)",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {isMoreOpen && <VendorMoreDrawer onClose={() => setIsMoreOpen(false)} />}
      </div>

      <div style={{ height: "68px", backgroundColor: card, borderTop: `1px solid ${border}`, boxShadow: "0 -6px 28px rgba(0,0,0,0.09)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 4px" }}>
        {tabs.map(tab => {
            const isMore = tab.key === "more";
            const isActive = isMore 
              ? isMoreOpen || ["/vendor/technicians", "/vendor/notifications", "/vendor/settings"].some(p => location.pathname.startsWith(p))
              : location.pathname.startsWith(tab.path);
              
            const Icon = tab.icon;
            return (
              <button key={tab.key} type="button" 
                onClick={() => {
                  if (isMore) {
                    setIsMoreOpen(true);
                  } else {
                    navigate(tab.path);
                  }
                }}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", background: "none", border: "none", cursor: "pointer", padding: "4px 2px", position: "relative", minHeight: "68px" }}>
                {isActive && <div style={{ position: "absolute", top: "10px", width: "62px", height: "32px", borderRadius: "100px", backgroundColor: blueTint }} />}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Icon size={22} color={isActive ? blue : inkFaint} />
                  {tab.key === "activity" && unreadActivityCount > 0 && (
                    <div style={{ position: "absolute", top: "-2px", right: "-6px", backgroundColor: "#EF4444", color: "white", fontSize: "9px", fontWeight: 800, width: "16px", height: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
                      {unreadActivityCount}
                    </div>
                  )}
                  {tab.key === "more" && (unreadNotificationCount || 0) > 0 && (
                    <div style={{ position: "absolute", top: "-2px", right: "-6px", backgroundColor: "#EF4444", color: "white", fontSize: "9px", fontWeight: 800, width: "16px", height: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
                      {unreadNotificationCount}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: "9.5px", fontWeight: isActive ? 700 : 500, color: isActive ? blue : inkFaint, position: "relative", zIndex: 1, fontFamily: inter }}>{tab.label}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
