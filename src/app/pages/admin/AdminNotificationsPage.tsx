import React, { useState } from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { Bell, ShieldAlert, Cpu, Building2, CheckCircle2 } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function AdminNotificationsPage() {
  const { adminNotifications } = useAdminContext();
  const [filter, setFilter] = useState("All");

  const getIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'security': return <ShieldAlert size={16} color={tokens.red} />;
      case 'ai': return <Cpu size={16} color={tokens.orange} />;
      case 'platform': return <Bell size={16} color={tokens.primary} />;
      default: return <Building2 size={16} color={tokens.inkSec} />;
    }
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="Inbox" fallbackRoute="/admin/dashboard" showBackButton={true} rightActions={
        <button style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
          <CheckCircle2 size={18} />
        </button>
      } />}
    >
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "30px" }}>
        
        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {["All", "Unread", "Security", "AI", "System"].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "16px",
                border: `1px solid ${filter === f ? tokens.primary : tokens.border}`,
                backgroundColor: filter === f ? "#E6F0FF" : tokens.card,
                color: filter === f ? tokens.primary : tokens.inkSec,
                fontSize: "13px",
                fontWeight: filter === f ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex flex-col gap-2">
          {adminNotifications.map(notif => (
            <div key={notif.id} style={{ backgroundColor: notif.isRead ? tokens.bg : tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}`, position: "relative", overflow: "hidden", cursor: "pointer" }}>
              {!notif.isRead && (
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: tokens.primary }} />
              )}
              <div className="flex gap-3">
                <div style={{ marginTop: "2px" }}>
                  {getIcon(notif.category)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex justify-between items-start mb-1">
                    <h3 style={{ fontSize: "14px", fontWeight: notif.isRead ? 600 : 700, color: tokens.ink, margin: 0 }}>{notif.title}</h3>
                    <span style={{ fontSize: "11px", color: tokens.inkMut }}>{new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: notif.isRead ? tokens.inkSec : tokens.ink, margin: "0", lineHeight: 1.4 }}>
                    {notif.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </MobileLayout>
  );
}
