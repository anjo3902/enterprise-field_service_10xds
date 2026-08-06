import React from "react";
import { useNavigate, useLocation } from "react-router";
import { useTechnician } from "../../contexts/TechnicianContext";
import { Home, ClipboardList, Bot, Bell, User } from "lucide-react";

const blue = "#2563EB";
const blueTint = "#EFF6FF";
const card = "#FFFFFF";
const border = "#E2E8F0";
const inkFaint = "#94A3B8";
const inter = "'Inter', 'Roboto', sans-serif";

export function TechBottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadNotificationCount, activeJob } = useTechnician();

  const tabs = [
    { key: "home", icon: Home, label: "Home", path: "/tech/home" },
    { key: "jobs", icon: ClipboardList, label: "Jobs", path: "/tech/jobs", badge: activeJob ? 1 : 0 },
    { key: "ai", icon: Bot, label: "AI", path: "/tech/ai" },
    { key: "notifications", icon: Bell, label: "Notif", path: "/tech/notifications", badge: unreadNotificationCount },
    { key: "profile", icon: User, label: "Profile", path: "/tech/profile" },
  ];

  return (
    <div style={{ flexShrink: 0, position: "relative", zIndex: 40 }}>
      <div style={{ height: "68px", backgroundColor: card, borderTop: `1px solid ${border}`, boxShadow: "0 -6px 28px rgba(0,0,0,0.09)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 4px" }}>
        {tabs.map(tab => {
          const isActive = location.pathname.startsWith(tab.path);
          const Icon = tab.icon;
          
          return (
            <button key={tab.key} type="button" 
              onClick={() => navigate(tab.path)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", background: "none", border: "none", cursor: "pointer", padding: "4px 2px", position: "relative", minHeight: "68px" }}>
              {isActive && <div style={{ position: "absolute", top: "10px", width: "62px", height: "32px", borderRadius: "100px", backgroundColor: blueTint }} />}
              <div style={{ position: "relative", zIndex: 1 }}>
                <Icon size={22} color={isActive ? blue : inkFaint} />
                {tab.badge > 0 && (
                  <div style={{ position: "absolute", top: "-2px", right: "-6px", backgroundColor: "#EF4444", color: "white", fontSize: "9px", fontWeight: 800, width: "16px", height: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
                    {tab.badge}
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
