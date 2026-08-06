import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { useVendor, VendorNotification, NotificationCategory } from "../../contexts/VendorContext";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { publishEvent } from "../../utils/eventBus";
import { 
  Bell, AlertTriangle, CheckCircle2, User, Shield, ClipboardList, Activity, 
  Settings, Briefcase, FileText, Search, X, Calendar, Package, Bot, Zap,
  TrendingUp, RefreshCw, XCircle
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const purple   = "#9333EA";
const purpleT  = "#FAF5FF";
const teal     = "#0D9488";
const tealT    = "#F0FDFA";
const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const inkFaint = "#94A3B8";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

type FilterType = "All" | "Unread" | "Operational" | "Business" | "Technicians" | "Assets" | "AI" | "Completed";

export default function VendorNotifications() {
  const navigate = useNavigate();
  const { 
    notifications, 
    markAllNotificationsRead, 
    markNotificationRead,
    dismissNotification,
    archiveNotification,
    markNotificationActionCompleted
  } = useVendor();

  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3500); };
  
  // Filter and Search logic
  const filteredNotifications = useMemo(() => {
    let list = notifications.filter(n => !n.archived && !n.dismissed);

    if (activeFilter === "Unread") list = list.filter(n => !n.read);
    else if (activeFilter === "Operational") list = list.filter(n => n.category === "operational");
    else if (activeFilter === "Business") list = list.filter(n => n.category === "business");
    else if (activeFilter === "Technicians") list = list.filter(n => n.category === "technician");
    else if (activeFilter === "Assets") list = list.filter(n => n.category === "assets");
    else if (activeFilter === "AI") list = list.filter(n => n.category === "ai");
    else if (activeFilter === "Completed") list = list.filter(n => n.actionCompleted);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.description.toLowerCase().includes(q) || 
        (n.relatedEntityId && n.relatedEntityId.toLowerCase().includes(q))
      );
    }
    
    // Sort by timestamp descending
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, activeFilter, search]);

  const filters: FilterType[] = ["All", "Unread", "Operational", "Business", "Technicians", "Assets", "AI", "Completed"];

  // Renderers
  const getCategoryConfig = (category: NotificationCategory) => {
    switch (category) {
      case "operational": return { icon: Activity, color: blue, tint: blueTint, label: "Operational" };
      case "business": return { icon: Briefcase, color: purple, tint: purpleT, label: "Business" };
      case "technician": return { icon: User, color: teal, tint: tealT, label: "Technician" };
      case "assets": return { icon: Package, color: amber, tint: amberT, label: "Asset" };
      case "ai": return { icon: Bot, color: red, tint: redT, label: "AI Insight" };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "high": return { color: red, bg: redT, label: "High Priority" };
      case "medium": return { color: amber, bg: amberT, label: "Medium Priority" };
      case "low": return { color: green, bg: greenT, label: "Low Priority" };
      default: return { color: inkMut, bg: divider, label: "Normal Priority" };
    }
  };

  // Action dispatcher
  const handleAction = (notification: VendorNotification) => {
    markNotificationRead(notification.id);
    markNotificationActionCompleted(notification.id);

    if (notification.title === "AMC Renewal Requested" || notification.title === "Warranty Extension Requested") {
      publishEvent({
        type: 'AMC_QUOTATION_SUBMITTED',
        payload: { assetId: notification.relatedEntityId!, amount: 4500, vendorId: "VEND-1" }
      });
      flash("Quotation generated & sent to Organization.");
      return;
    }
    
    if (!notification.relatedEntityId) return;

    if (notification.relatedEntityId.startsWith("TKT-")) {
      navigate(`/vendor/tickets/${notification.relatedEntityId}`);
    } else if (notification.relatedEntityId.startsWith("WO-")) {
      navigate(`/vendor/work-orders/${notification.relatedEntityId}`);
    } else if (notification.relatedEntityId.startsWith("AST-") || notification.relatedEntityId.startsWith("AMC-")) {
      navigate(`/vendor/assets`);
    } else {
      navigate(`/vendor/dashboard`);
    }
  };

  return (
    <MobileLayout bottomNav={<VendorBottomNavigation />} backgroundColor={bg}>
      <BackHeader 
        title="Notifications" 
        subtitle="Operational Center" 
        fallbackRoute="/vendor/dashboard"
        rightActions={
          <button type="button" onClick={markAllNotificationsRead} style={{ 
            background: "none", border: "none", padding: "8px 12px", borderRadius: "8px", 
            backgroundColor: "rgba(255,255,255,0.15)", color: "white", fontSize: "11.5px", 
            fontWeight: 700, fontFamily: inter, cursor: "pointer" 
          }}>
            Mark All Read
          </button>
        } 
      />

      {/* Success Msg */}
      {successMsg && (
        <div style={{ padding: "16px 16px 0", backgroundColor: "white" }}>
          <div style={{ backgroundColor: greenT, border: `1px solid ${green}40`, borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} color={green} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: green, fontFamily: inter }}>{successMsg}</span>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: "16px", backgroundColor: "white", borderBottom: `1px solid ${border}`, position: "sticky", top: "76px", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", backgroundColor: divider, borderRadius: "10px", padding: "0 12px", height: "42px" }}>
          <Search size={16} color={inkFaint} />
          <input 
            type="text" 
            placeholder="Search tickets, assets, keywords..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: "none", background: "none", flex: 1, padding: "0 10px", fontSize: "14px", fontFamily: inter, color: ink, outline: "none" }}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}>
              <X size={16} color={inkMut} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginTop: "12px", paddingBottom: "4px", scrollbarWidth: "none" }}>
          {filters.map(f => (
            <button 
              key={f}
              type="button" 
              onClick={() => setActiveFilter(f)}
              style={{
                flexShrink: 0,
                padding: "6px 12px",
                borderRadius: "100px",
                backgroundColor: activeFilter === f ? ink : card,
                border: `1px solid ${activeFilter === f ? ink : border}`,
                color: activeFilter === f ? "white" : inkMut,
                fontSize: "12px",
                fontWeight: activeFilter === f ? 600 : 500,
                fontFamily: inter,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => {
            const config = getCategoryConfig(notification.category);
            const prio = getPriorityConfig(notification.priority);
            const Icon = config.icon;

            return (
              <div 
                key={notification.id} 
                style={{ 
                  backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, 
                  boxShadow: cardShadow, padding: "16px", display: "flex", flexDirection: "column",
                  position: "relative", overflow: "hidden"
                }}
              >
                {!notification.read && (
                  <div style={{ position: "absolute", top: "16px", right: "16px", width: "8px", height: "8px", borderRadius: "4px", backgroundColor: blue }} />
                )}

                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: config.tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={20} color={config.color} />
                  </div>
                  
                  <div style={{ flex: 1, paddingRight: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: prio.color, backgroundColor: prio.bg, padding: "2px 6px", borderRadius: "100px", fontFamily: inter, textTransform: "uppercase" }}>
                        {prio.label}
                      </span>
                      <span style={{ fontSize: "10px", color: inkMut, fontFamily: inter }}>•</span>
                      <span style={{ fontSize: "10.5px", color: inkSec, fontFamily: inter, fontWeight: 500 }}>
                        {config.label}
                      </span>
                    </div>
                    
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 4px 0", lineHeight: 1.3 }}>
                      {notification.title}
                    </h3>
                    <p style={{ fontSize: "13px", color: inkMut, fontFamily: inter, margin: "0 0 8px 0", lineHeight: 1.4 }}>
                      {notification.description}
                    </p>
                    
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {notification.relatedEntityId ? (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter, backgroundColor: divider, padding: "3px 8px", borderRadius: "6px" }}>
                          {notification.relatedEntityId}
                        </span>
                      ) : <span />}
                      <span style={{ fontSize: "11px", color: inkFaint, fontFamily: inter }}>{timeAgo(notification.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${divider}`, margin: "0 -16px", paddingTop: "12px", paddingLeft: "16px", paddingRight: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <button 
                    type="button" 
                    onClick={() => handleAction(notification)}
                    style={{
                      flex: 1, backgroundColor: notification.actionCompleted ? greenT : blueTint, 
                      color: notification.actionCompleted ? green : blue, border: "none", borderRadius: "8px", 
                      height: "36px", fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                    }}
                  >
                    {notification.actionCompleted ? (
                      <><CheckCircle2 size={16} /> Completed</>
                    ) : (
                      "Review Details"
                    )}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => dismissNotification(notification.id)}
                    style={{
                      backgroundColor: card, border: `1px solid ${border}`, color: inkMut, 
                      borderRadius: "8px", width: "36px", height: "36px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                    title="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "32px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={32} color={green} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 8px" }}>All caught up!</h3>
            <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: 0 }}>You have no new notifications right now.</p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
