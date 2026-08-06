import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Bell, CheckCircle2, Clock, AlertTriangle, MessageSquare, Wrench, FileText, Map, Bot, Search, Trash2, ShieldAlert, ArrowLeft
} from "lucide-react";

// --- Design Tokens ---
const blue = "#2563EB";
const blueDark = "#1D4ED8";
const blueTint = "#EFF6FF";
const green = "#16A34A";
const greenT = "#DCFCE7";
const amber = "#D97706";
const amberT = "#FFFBEB";
const red = "#DC2626";
const redT = "#FEF2F2";
const purple = "#7C3AED";
const purpleT = "#F5F3FF";
const teal = "#0891B2";
const tealT = "#ECFEFF";
const ink = "#0F172A";
const inkSec = "#475569";
const inkMut = "#64748B";
const inkFaint = "#94A3B8";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

import { useTechnician, NotificationItem, FilterType } from "../../contexts/TechnicianContext";

export const getNotificationIconAndColor = (n: NotificationItem) => {
  if (n.type === "urgent" || n.priority === "critical") return { icon: AlertTriangle, c: red, bg: redT };
  if (n.type === "ai") return { icon: Bot, c: purple, bg: purpleT };
  if (n.type === "vendor") return { icon: Wrench, c: teal, bg: tealT };
  if (n.type === "customer") return { icon: MessageSquare, c: blue, bg: blueTint };
  if (n.type === "assignments") return { icon: FileText, c: blue, bg: blueTint };
  if (n.type === "completed") return { icon: CheckCircle2, c: green, bg: greenT };
  if (n.type === "route") return { icon: Map, c: amber, bg: amberT };
  return { icon: Bell, c: inkMut, bg: divider };
};

export const handleNotificationAction = (n: NotificationItem, navigate: any, markRead: (id: string) => void) => {
  markRead(n.id);
  const id = n.jobId; 
  if (!id) return;
  switch(n.actionType) {
    case "new_job":
    case "reassigned":
    case "pm_task":
    case "warranty":
    case "amc":
      navigate(`/tech/jobs/${id}`);
      break;
    case "vendor_msg":
      navigate(`/tech/jobs/${id}`, { state: { scrollTo: "vendorMessage" } });
      break;
    case "sla_warn":
      navigate(`/tech/jobs/${id}`, { state: { highlight: "sla" } });
      break;
    case "customer_comment":
      navigate(`/tech/jobs/${id}`, { state: { scrollTo: "comments" } });
      break;
    case "wo_update":
      navigate(`/tech/work-order/${id}`);
      break;
    case "cancelled":
      navigate(`/tech/jobs/${id}`, { state: { showCancelled: true } });
      break;
    case "route_change":
      navigate(`/tech/jobs/${id}`, { state: { scrollTo: "route" } });
      break;
    case "ai_rec":
      navigate("/tech/ai", { state: { jobId: id, fault: n.title, asset: n.assetName } });
      break;
    case "report_approved":
      navigate(`/tech/report/${id}`);
      break;
    default:
      navigate(`/tech/jobs/${id}`);
  }
};

export function TechNotifications() {
  const navigate = useNavigate();
  const { notifications, unreadNotificationCount: unreadCount, markAllNotificationsRead: handleMarkAllRead, markNotificationRead: handleMarkRead, dismissNotification } = useTechnician();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filters: { label: string; key: FilterType }[] = [
    { label: "All", key: "all" },
    { label: "Unread", key: "unread" },
    { label: "Assignments", key: "assignments" },
    { label: "Urgent", key: "urgent" },
    { label: "AI", key: "ai" },
    { label: "Vendor", key: "vendor" },
    { label: "Customer", key: "customer" },
    { label: "Completed", key: "completed" },
  ];

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissNotification(id);
  };

  const handleAction = (n: NotificationItem) => handleNotificationAction(n, navigate, handleMarkRead);
  const getIconAndColor = (n: NotificationItem) => getNotificationIconAndColor(n);

  const filteredNotifs = useMemo(() => {
    let list = notifications;
    if (activeFilter !== "all") {
      if (activeFilter === "unread") {
        list = list.filter(n => !n.isRead);
      } else {
        list = list.filter(n => n.type === activeFilter || (activeFilter === "urgent" && n.priority === "high"));
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.description.toLowerCase().includes(q) ||
        (n.jobId && n.jobId.toLowerCase().includes(q))
      );
    }
    return list;
  }, [notifications, activeFilter, searchQuery]);

  const groupedNotifs = useMemo(() => {
    const groups: { today: NotificationItem[], yesterday: NotificationItem[], earlier: NotificationItem[] } = {
      today: [], yesterday: [], earlier: []
    };
    
    const now = new Date();
    const todayStr = now.toDateString();
    
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    filteredNotifs.forEach(n => {
      const dStr = new Date(n.timestamp).toDateString();
      if (dStr === todayStr) groups.today.push(n);
      else if (dStr === yesterdayStr) groups.yesterday.push(n);
      else groups.earlier.push(n);
    });

    return groups;
  }, [filteredNotifs]);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: bg, fontFamily: inter }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${blueDark} 0%, ${blue} 100%)`, flexShrink: 0, padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
          <div>
            <button 
              onClick={() => navigate(-1)}
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", color: "white", padding: "6px 12px", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>Notifications</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
              You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead}
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", color: "white", padding: "6px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <CheckCircle2 size={12} /> Mark All Read
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "12px", padding: "0 12px", gap: "8px", height: "42px", border: "1px solid rgba(255,255,255,0.2)" }}>
          <Search size={16} color="rgba(255,255,255,0.8)" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px", color: "white", fontFamily: inter }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ backgroundColor: card, borderBottom: `1px solid ${border}`, flexShrink: 0, overflowX: "auto", scrollbarWidth: "none", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: "8px", minWidth: "max-content", padding: "12px 0" }}>
          {filters.map(f => {
            const isActive = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                style={{
                  padding: "6px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: inter, transition: "all 0.2s",
                  backgroundColor: isActive ? blue : bg,
                  color: isActive ? "white" : inkMut,
                  border: `1px solid ${isActive ? blue : border}`
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {filteredNotifs.length === 0 ? (
          <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "40px 20px", textAlign: "center", marginTop: "20px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Bell size={24} color={inkFaint} />
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: ink }}>All Caught Up</h3>
            <p style={{ margin: 0, fontSize: "13px", color: inkMut, lineHeight: 1.5 }}>You don't have any notifications matching this filter.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {groupedNotifs.today.length > 0 && (
              <div>
                <h2 style={{ fontSize: "13px", fontWeight: 700, color: inkSec, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 4px" }}>Today</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {groupedNotifs.today.map(n => <NotificationCard key={n.id} notif={n} onAction={() => handleAction(n)} onDismiss={(e) => handleDismiss(n.id, e)} />)}
                </div>
              </div>
            )}
            {groupedNotifs.yesterday.length > 0 && (
              <div>
                <h2 style={{ fontSize: "13px", fontWeight: 700, color: inkSec, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 4px" }}>Yesterday</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {groupedNotifs.yesterday.map(n => <NotificationCard key={n.id} notif={n} onAction={() => handleAction(n)} onDismiss={(e) => handleDismiss(n.id, e)} />)}
                </div>
              </div>
            )}
            {groupedNotifs.earlier.length > 0 && (
              <div>
                <h2 style={{ fontSize: "13px", fontWeight: 700, color: inkSec, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 4px" }}>Earlier</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {groupedNotifs.earlier.map(n => <NotificationCard key={n.id} notif={n} onAction={() => handleAction(n)} onDismiss={(e) => handleDismiss(n.id, e)} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  function NotificationCard({ notif, onAction, onDismiss }: { notif: NotificationItem, onAction: () => void, onDismiss: (e: React.MouseEvent) => void }) {
    const { icon: Icon, c, bg: icnBg } = getIconAndColor(notif);
    
    return (
      <div 
        onClick={onAction}
        style={{ 
          backgroundColor: notif.isRead ? card : blueTint, 
          borderRadius: "14px", 
          border: `1px solid ${notif.isRead ? border : `${blue}40`}`, 
          boxShadow: cardShadow, 
          padding: "16px", 
          display: "flex", 
          gap: "12px", 
          cursor: "pointer",
          position: "relative",
          transition: "all 0.2s"
        }}
      >
        {!notif.isRead && (
          <div style={{ position: "absolute", top: "16px", right: "16px", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: blue }} />
        )}
        
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: icnBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={20} color={c} />
        </div>
        
        <div style={{ flex: 1, minWidth: 0, paddingRight: notif.isRead ? "0" : "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: notif.isRead ? 600 : 700, color: ink, fontFamily: inter, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{notif.title}</h4>
          </div>
          
          <p style={{ margin: "0 0 8px", fontSize: "12.5px", color: notif.isRead ? inkSec : ink, lineHeight: 1.45, fontFamily: inter }}>
            {notif.description}
          </p>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", color: inkMut, fontFamily: inter }}>{formatTime(notif.timestamp)}</span>
              {notif.jobId && (
                <>
                  <span style={{ fontSize: "10px", color: border }}>•</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: blue, fontFamily: inter }}>{notif.jobId}</span>
                </>
              )}
            </div>
            
            <button onClick={onDismiss} style={{ background: "none", border: "none", padding: "4px", cursor: "pointer", display: "flex", opacity: 0.6 }}>
              <Trash2 size={14} color={inkMut} />
            </button>
          </div>
        </div>
      </div>
    );
  }
}
