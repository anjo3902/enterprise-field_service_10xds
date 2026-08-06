import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Home, FileText, Database, Sparkles, MoreHorizontal,
  Activity, TrendingUp, Shield, BarChart3, Bell, User, Settings2, X
} from "lucide-react";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const orange   = "#EA580C";
const orangeT  = "#FFF7ED";
const purple   = "#7C3AED";
const purpleT  = "#F5F3FF";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const teal     = "#0891B2";
const tealT    = "#ECFEFF";

const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const inkFaint = "#94A3B8";

const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";

const inter    = "'Inter', 'Roboto', sans-serif";

// ─── More Drawer ──────────────────────────────────────────────────────────────
const MORE_ITEMS = [
  { icon: Activity,   label: "Machine\nHealth",    color: purple, tint: purpleT  },
  { icon: TrendingUp, label: "Revenue\nIntelligence", color: orange, tint: orangeT },
  { icon: Shield,     label: "SLA\nTracker",       color: blue,   tint: blueTint },
  { icon: BarChart3,  label: "Analytics",          color: green,  tint: greenT   },
  { icon: FileText,   label: "Reports",            color: red,    tint: redT     },
  { icon: Bell,       label: "Notifications",      color: amber,  tint: amberT   },
  { icon: User,       label: "Profile",            color: inkMut, tint: divider  },
  { icon: Settings2,  label: "Settings",           color: teal,   tint: tealT    },
];

function MoreDrawer({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const DRAWER_ROUTES: Record<string, string> = {
    "Machine\nHealth": "/machine-health",
    "Revenue\nIntelligence": "/revenue-intelligence",
    "SLA\nTracker": "/sla-tracker",
    "Analytics": "/analytics",
    "Reports": "/reports",
    "Notifications": "/notifications",
    "Profile": "/profile",
    "Settings": "/settings",
    // Preserving unrouted functionality if it exists
  };
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
          <p style={{ fontSize: "14.5px", fontWeight: 800, color: ink, fontFamily: inter, letterSpacing: "-0.01em" }}>
            More Options
          </p>
          <p style={{ fontSize: "10.5px", color: inkFaint, fontFamily: inter, marginTop: "1px" }}>
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

      {/* 4-column icon grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px 4px" }}>
        {MORE_ITEMS.map((item) => {
          const lines = item.label.split("\n");
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                const route = DRAWER_ROUTES[item.label];
                if (route && location.pathname !== route) { navigate(route); onClose(); }
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

// ─── Main Bottom Navigation ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: Home,          label: "Home",     key: "home",    badge: 0  },
  { icon: FileText,      label: "Tickets",  key: "tickets", badge: 3  },
  { icon: Database,      label: "Assets",   key: "assets",  badge: 0  },
  { icon: Sparkles,      label: "AI Assist",key: "ai",      badge: 0  },
  { icon: MoreHorizontal,label: "More",     key: "more",    badge: 0  },
];

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState("home");
  const [moreOpen, setMoreOpen] = useState(false);

  const KEY_ROUTES: Record<string, string> = {
    home: "/dashboard",
    tickets: "/my-tickets",
    assets: "/assets",
    ai: "/ai-assistant",
  };

  useEffect(() => {
    const moreRoutes = ["/machine-health", "/revenue-intelligence", "/sla-tracker", "/analytics", "/reports", "/notifications", "/profile", "/settings"];
    const isMoreRouteActive = moreRoutes.some(r => location.pathname.startsWith(r));

    if (location.pathname.startsWith("/dashboard")) {
      setActive("home");
    } else if (location.pathname.startsWith("/my-tickets")) {
      setActive("tickets");
    } else if (location.pathname.startsWith("/assets")) {
      setActive("assets");
    } else if (location.pathname.startsWith("/ai-assistant")) {
      setActive("ai");
    } else if (isMoreRouteActive) {
      setActive("more");
    } else {
      setActive("home");
    }
  }, [location.pathname]);

  const handlePress = (key: string) => {
    if (key === "more") {
      setMoreOpen((p) => !p);
    } else {
      setActive(key);
      setMoreOpen(false);
      if (KEY_ROUTES[key] && location.pathname !== KEY_ROUTES[key]) navigate(KEY_ROUTES[key]);
    }
  };

  return (
    <div style={{ flexShrink: 0, position: "relative", zIndex: 100 }}>
      {/* More drawer — slides in above the nav bar */}
      <div style={{
        position: "absolute", bottom: "68px", left: 0, right: 0,
        pointerEvents: moreOpen ? "auto" : "none",
        opacity: moreOpen ? 1 : 0,
        transform: moreOpen ? "translateY(0)" : "translateY(100%)",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {moreOpen && <MoreDrawer onClose={() => setMoreOpen(false)} />}
      </div>

      {/* ── Navigation bar ── */}
      <div style={{
        height: "68px",
        backgroundColor: card,
        borderTop: `1px solid ${border}`,
        boxShadow: "0 -6px 28px rgba(0,0,0,0.09), 0 -1px 3px rgba(0,0,0,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-around",
        padding: "0 4px",
      }}>
        {NAV_ITEMS.map((item) => {
          const isMore   = item.key === "more";
          const isActive = isMore ? moreOpen || active === "more" : active === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handlePress(item.key)}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "3px",
                background: "none", border: "none", cursor: "pointer",
                padding: "4px 2px", position: "relative",
                fontFamily: inter, minHeight: "68px",
              }}
            >
              {/* MD3 pill indicator */}
              {isActive && (
                <div style={{
                  position: "absolute", top: "10px",
                  width: "62px", height: "32px",
                  borderRadius: "100px",
                  backgroundColor: blueTint,
                  transition: "all 0.22s ease",
                }} />
              )}

              {/* Icon + badge wrapper */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <item.icon
                  size={22}
                  color={isActive ? blue : inkFaint}
                  style={{ display: "block", transition: "color 0.18s" }}
                />
                {/* Notification badge */}
                {item.badge > 0 && !isActive && (
                  <div style={{
                    position: "absolute", top: "-5px", right: "-7px",
                    minWidth: "16px", height: "16px", borderRadius: "100px",
                    backgroundColor: red, border: "1.5px solid white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px",
                  }}>
                    <span style={{ fontSize: "8px", fontWeight: 800, color: "white", lineHeight: 1 }}>
                      {item.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: "9.5px",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? blue : inkFaint,
                position: "relative", zIndex: 1,
                letterSpacing: "0.01em",
                transition: "color 0.18s",
                fontFamily: inter,
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
