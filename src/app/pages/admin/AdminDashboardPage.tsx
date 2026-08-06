import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { adminTokens as tokens } from "../../theme/adminTokens";
import {
  Bell, Building2, Briefcase, HardHat, ShieldCheck, ChevronRight,
  UserPlus, ClipboardList, Bot, CreditCard, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Info, Shield, PlusCircle, Activity
} from "lucide-react";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const {
    organizations, vendors, users, platformKpis, platformAlerts,
    adminNotifications, license, auditLog, aiModels
  } = useAdminContext();

  // Active counts
  const activeOrgs = organizations.filter(o => o.status === 'Active').length;
  const activeVendors = vendors.filter(v => v.status === 'Active').length;
  const activeTechs = users.filter(u => u.role === 'technician' && u.status === 'Active').length;
  const totalTechs = users.filter(u => u.role === 'technician').length;

  const slaCompliance = platformKpis.slaCompliance;
  const slaColor = slaCompliance >= 90 ? "#16A34A" : slaCompliance >= 70 ? "#D97706" : "#DC2626";
  const slaIconColor = slaCompliance >= 90 ? "#16A34A" : slaCompliance >= 70 ? "#D97706" : "#DC2626";

  const unreadAlertsCount = adminNotifications.filter(n => !n.isRead).length;
  const unreadCritical = adminNotifications.filter(n => !n.isRead && n.severity === 'critical').length;
  const unreadWarning = adminNotifications.filter(n => !n.isRead && n.severity === 'warning').length;

  // Sorting vendors by SLA
  const topVendors = [...vendors].sort((a, b) => b.slaCompliance - a.slaCompliance).slice(0, 3);
  const recentAudit = [...auditLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 3);
  const aiAvgAccuracy = aiModels.reduce((acc, m) => acc + m.accuracy, 0) / aiModels.length;

  const Header = () => (
    <div style={{
      background: "linear-gradient(160deg, #0052CC 0%, #2563EB 55%, #3B82F6 100%)",
      padding: "16px 20px 24px",
      flexShrink: 0
    }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.03em", margin: "0 0 2px 0", fontFamily: "'Inter', sans-serif" }}>
            System Admin
          </h1>
          <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.75)", margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Platform Command Center
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/notifications')}
            style={{
              position: "relative",
              width: "36px", height: "36px",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0
            }}
          >
            <Bell size={18} color="white" />
            {unreadAlertsCount > 0 && (
              <div style={{
                position: "absolute", top: -2, right: -2,
                backgroundColor: tokens.red,
                color: "white", fontSize: "10px", fontWeight: 700,
                width: "16px", height: "16px", borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid #0052CC"
              }}>
                {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
              </div>
            )}
          </button>
          <div 
            onClick={() => navigate('/admin/profile')}
            style={{
            width: "36px", height: "36px",
            borderRadius: "18px",
            background: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: tokens.primary, fontSize: "13px", fontWeight: 700,
            border: "2px solid rgba(255,255,255,0.2)",
            cursor: "pointer"
          }}>
            SA
          </div>
        </div>
      </div>

      {/* Platform Pulse Banner */}
      <div style={{
        backgroundColor: "rgba(10, 10, 26, 0.4)",
        borderRadius: "12px",
        padding: "14px 16px",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)"
      }}>
        <div className="flex items-center gap-2 mb-2">
          <Activity size={16} color="white" />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "white", fontFamily: "'Inter', sans-serif" }}>Platform Pulse</span>
        </div>
        {unreadCritical === 0 && unreadWarning === 0 ? (
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 size={16} color={tokens.green} />
            <span style={{ fontSize: "12.5px", color: tokens.greenTint, fontWeight: 500 }}>All Systems Operational ✓</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {unreadCritical > 0 && (
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/admin/notifications')}>
                <div style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: tokens.red }} />
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {unreadCritical} critical alert{unreadCritical > 1 ? 's' : ''} require attention
                </span>
              </div>
            )}
            {unreadWarning > 0 && (
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/admin/notifications')}>
                <div style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: tokens.orange }} />
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {unreadWarning} warning{unreadWarning > 1 ? 's' : ''} reported
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<Header />}
    >
      <div style={{ padding: "20px 16px 30px", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Section 1: Platform Health KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div onClick={() => navigate('/admin/organizations')} style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer" }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: tokens.primaryTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={16} color={tokens.primary} />
              </div>
              <ChevronRight size={16} color={tokens.inkMut} />
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: tokens.ink, marginBottom: "2px" }}>{activeOrgs}</div>
            <div style={{ fontSize: "12px", color: tokens.inkSec, fontWeight: 500 }}>Organizations</div>
          </div>
          
          <div onClick={() => navigate('/admin/vendors')} style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer" }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: tokens.tealTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Briefcase size={16} color={tokens.teal} />
              </div>
              <ChevronRight size={16} color={tokens.inkMut} />
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: tokens.ink, marginBottom: "2px" }}>{activeVendors}</div>
            <div style={{ fontSize: "12px", color: tokens.inkSec, fontWeight: 500 }}>Approved Vendors</div>
          </div>

          <div onClick={() => navigate('/admin/users')} style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer" }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: tokens.greenTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <HardHat size={16} color={tokens.green} />
              </div>
              <ChevronRight size={16} color={tokens.inkMut} />
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: tokens.ink, marginBottom: "2px" }}>{activeTechs} <span style={{ fontSize: "14px", color: tokens.inkMut, fontWeight: 500 }}>/ {totalTechs}</span></div>
            <div style={{ fontSize: "12px", color: tokens.inkSec, fontWeight: 500 }}>Active Techs</div>
          </div>

          <div onClick={() => navigate('/admin/analytics')} style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer" }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: slaCompliance >= 90 ? tokens.greenTint : tokens.redTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={16} color={slaIconColor} />
              </div>
              <ChevronRight size={16} color={tokens.inkMut} />
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: tokens.ink, marginBottom: "2px" }}>{slaCompliance.toFixed(1)}%</div>
            <div style={{ fontSize: "12px", color: tokens.inkSec, fontWeight: 500 }}>SLA Compliance</div>
          </div>
        </div>

        {/* Section 3: Platform Alerts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink, margin: 0 }}>Platform Alerts</h2>
            <button onClick={() => navigate('/admin/notifications')} style={{ fontSize: "12px", color: tokens.primary, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              View All
            </button>
          </div>
          {platformAlerts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {platformAlerts.map(alert => {
                const isCritical = alert.severity === 'critical';
                const isWarning = alert.severity === 'warning';
                return (
                  <div key={alert.id} onClick={() => navigate(alert.navigationTarget || '/admin/notifications')} style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "14px", display: "flex", alignItems: "flex-start", gap: "12px", border: `1px solid ${tokens.border}`, cursor: "pointer" }}>
                    <div style={{ marginTop: "4px" }}>
                      {isCritical ? <AlertTriangle size={18} color={tokens.red} /> : isWarning ? <Info size={18} color={tokens.orange} /> : <Info size={18} color={tokens.primary} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13.5px", fontWeight: 600, color: tokens.ink, marginBottom: "2px" }}>{alert.title}</div>
                      <div style={{ fontSize: "12px", color: tokens.inkSec, marginBottom: "4px" }}>{alert.description}</div>
                      <div style={{ fontSize: "11px", color: tokens.inkFaint }}>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <ChevronRight size={16} color={tokens.inkMut} style={{ marginTop: "2px" }} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "24px", textAlign: "center", border: `1px dashed ${tokens.border}` }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "20px", backgroundColor: tokens.greenTint, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <CheckCircle2 size={20} color={tokens.green} />
              </div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink, margin: "0 0 4px" }}>No active alerts</p>
              <p style={{ fontSize: "12.5px", color: tokens.inkSec, margin: 0 }}>Platform is running smoothly.</p>
            </div>
          )}
        </div>

        {/* Section 4: Quick Actions */}
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink, margin: "0 0 12px" }}>Quick Actions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { label: "Add Tenant", icon: Building2, color: tokens.primary, bg: tokens.primaryTint, route: "/admin/organizations" },
              { label: "Onboard Vendor", icon: Briefcase, color: tokens.teal, bg: tokens.tealTint, route: "/admin/vendors" },
              { label: "Create User", icon: UserPlus, color: tokens.purple, bg: tokens.purpleTint, route: "/admin/users" },
              { label: "Audit Log", icon: ClipboardList, color: tokens.amber, bg: tokens.amberTint, route: "/admin/audit" },
              { label: "AI Config", icon: Bot, color: tokens.green, bg: tokens.greenTint, route: "/admin/ai-config" },
              { label: "License", icon: CreditCard, color: tokens.orange, bg: tokens.orangeTint, route: "/admin/license" }
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.route)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "12px 14px", backgroundColor: tokens.card,
                  borderRadius: "12px", border: `1px solid ${tokens.border}`,
                  cursor: "pointer", textAlign: "left"
                }}
              >
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: action.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <action.icon size={14} color={action.color} />
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.ink }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 5: Analytics Summary */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink, margin: 0 }}>Analytics Summary</h2>
            <ChevronRight size={16} color={tokens.inkMut} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "13px", color: tokens.inkSec }}>Total Tickets</span>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>{platformKpis.totalTickets}</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: tokens.green, display: "flex", alignItems: "center", backgroundColor: tokens.greenTint, padding: "2px 6px", borderRadius: "10px" }}><TrendingUp size={10} style={{marginRight:"2px"}}/> 12%</span>
              </div>
            </div>
            <div style={{ height: "1px", backgroundColor: tokens.border }} />
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "13px", color: tokens.inkSec }}>Avg Resolution</span>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>4.2 hrs</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: tokens.green, display: "flex", alignItems: "center", backgroundColor: tokens.greenTint, padding: "2px 6px", borderRadius: "10px" }}><TrendingDown size={10} style={{marginRight:"2px"}}/> 5%</span>
              </div>
            </div>
            <div style={{ height: "1px", backgroundColor: tokens.border }} />
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "13px", color: tokens.inkSec }}>AI Accuracy</span>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>{aiAvgAccuracy.toFixed(1)}%</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: tokens.green, display: "flex", alignItems: "center", backgroundColor: tokens.greenTint, padding: "2px 6px", borderRadius: "10px" }}><TrendingUp size={10} style={{marginRight:"2px"}}/> 1%</span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/admin/analytics')} style={{ width: "100%", marginTop: "16px", padding: "10px", backgroundColor: tokens.primaryTint, color: tokens.primary, border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            View Full Analytics
          </button>
        </div>

        {/* Section 6: Vendor Leaderboard */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink, margin: 0 }}>Top Vendors (SLA)</h2>
            <button onClick={() => navigate('/admin/analytics')} style={{ fontSize: "12px", color: tokens.primary, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              View All
            </button>
          </div>
          <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "12px" }}>
            {topVendors.map((vendor, index) => (
              <div key={vendor.id} className="flex items-center justify-between" style={{ paddingBottom: index < 2 ? "12px" : 0, borderBottom: index < 2 ? `1px solid ${tokens.border}` : "none" }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: "24px", height: "24px", borderRadius: "12px", backgroundColor: index === 0 ? "#FEF08A" : index === 1 ? "#E2E8F0" : "#FED7AA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: tokens.ink }}>
                    #{index + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{vendor.name}</div>
                    <div style={{ fontSize: "11.5px", color: tokens.inkSec }}>{vendor.technicianCount} Techs</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "13px", fontWeight: 700, color: vendor.slaCompliance >= 90 ? tokens.green : tokens.orange }}>{vendor.slaCompliance.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 7: Platform Usage */}
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink, margin: "0 0 12px" }}>Platform Usage</h2>
          <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "Organizations", used: license.usage.organizations.used, total: license.usage.organizations.total },
                { label: "Vendors", used: license.usage.vendors.used, total: license.usage.vendors.total },
                { label: "Users", used: license.usage.users.used, total: license.usage.users.total },
                { label: "Storage (GB)", used: license.usage.storageGb.used, total: license.usage.storageGb.total }
              ].map((item, i) => {
                const pct = (item.used / item.total) * 100;
                const barColor = pct >= 95 ? tokens.red : pct >= 80 ? tokens.orange : tokens.primary;
                return (
                  <div key={i}>
                    <div className="flex justify-between items-end mb-2">
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.ink }}>{item.label}</span>
                      <span style={{ fontSize: "11.5px", color: tokens.inkSec }}>{item.used} / {item.total}</span>
                    </div>
                    <div style={{ height: "6px", backgroundColor: tokens.primaryTint, borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", backgroundColor: barColor, width: `${pct}%`, borderRadius: "3px", transition: "width 0.3s ease" }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={() => navigate('/admin/license')} style={{ width: "100%", marginTop: "20px", padding: "10px", backgroundColor: "transparent", color: tokens.inkSec, border: `1px solid ${tokens.border}`, borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Manage License
            </button>
          </div>
        </div>

        {/* Section 8: Recent Audit Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink, margin: 0 }}>Recent Activity</h2>
            <button onClick={() => navigate('/admin/audit')} style={{ fontSize: "12px", color: tokens.primary, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Full Log
            </button>
          </div>
          <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            {recentAudit.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {recentAudit.map((log, idx) => {
                  const isLast = idx === recentAudit.length - 1;
                  return (
                    <div key={log.id} style={{ display: "flex", gap: "12px", position: "relative" }}>
                      {!isLast && <div style={{ position: "absolute", top: "24px", bottom: "-16px", left: "15px", width: "2px", backgroundColor: tokens.border }} />}
                      <div style={{ width: "32px", height: "32px", borderRadius: "16px", backgroundColor: tokens.bg, border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                        <Shield size={14} color={tokens.inkMut} />
                      </div>
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : "4px" }}>
                        <div style={{ fontSize: "13px", color: tokens.ink, fontWeight: 500, lineHeight: 1.4 }}>{log.actionDescription}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span style={{ fontSize: "11px", color: tokens.inkFaint }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span style={{ fontSize: "10px", color: tokens.border }}>•</span>
                          <span style={{ fontSize: "11px", color: tokens.inkMut }}>{log.actorName}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: tokens.inkSec, margin: 0 }}>No recent activity.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
