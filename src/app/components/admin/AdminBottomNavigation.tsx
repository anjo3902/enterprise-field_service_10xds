import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Building2, Briefcase, Users, Settings } from "lucide-react";

export function AdminBottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const TABS = [
    { id: "dashboard", icon: LayoutDashboard, label: "Platform", route: "/admin/dashboard" },
    { id: "organizations", icon: Building2, label: "Tenants", route: "/admin/organizations" },
    { id: "vendors", icon: Briefcase, label: "Vendors", route: "/admin/vendors" },
    { id: "users", icon: Users, label: "Users", route: "/admin/users" },
    { id: "settings", icon: Settings, label: "Config", route: "/admin/settings" },
  ];

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith("/admin/organizations")) return "organizations";
    if (path.startsWith("/admin/vendors")) return "vendors";
    if (path.startsWith("/admin/users")) return "users";
    if (path === "/admin/dashboard" || path.startsWith("/admin/analytics") || path.startsWith("/admin/platform")) return "dashboard";
    
    // SLA, AI Config, Security, Audit, License, Notifications, Profile, Settings all fall under Config
    return "settings";
  };

  const currentTab = getActiveTab();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 24px 22px",
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid #E2E8F0",
        flexShrink: 0,
      }}
    >
      {TABS.map((tab) => {
        const isActive = currentTab === tab.id;
        const Icon = tab.icon;
        
        // Admin active color is standard blue now
        const activeColor = "#0052CC"; 
        const activeBg = "#E6F0FF";
        
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.route)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              background: "none",
              border: "none",
              padding: "4px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "28px",
                borderRadius: "16px",
                backgroundColor: isActive ? activeBg : "transparent",
                transition: "background-color 0.2s ease",
              }}
            >
              <Icon
                size={20}
                color={isActive ? activeColor : "#64748B"}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? activeColor : "#64748B",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
