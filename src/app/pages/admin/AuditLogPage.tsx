import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { Search, Download, Shield, Settings, Server, Key, ChevronRight } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminEmptyState } from "../../components/admin/shared/AdminEmptyState";

export default function AuditLogPage() {
  const navigate = useNavigate();
  const { auditLog } = useAdminContext();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'info': return "#3B82F6";
      case 'warning': return "#EA580C";
      case 'critical': return "#DC2626";
      default: return tokens.inkMut;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'auth': return <Key size={14} color={tokens.inkMut} />;
      case 'operational': return <Server size={14} color={tokens.inkMut} />;
      case 'configuration': return <Settings size={14} color={tokens.inkMut} />;
      case 'security': return <Shield size={14} color={tokens.inkMut} />;
      default: return null;
    }
  };

  const filteredLogs = auditLog.filter(log => {
    const matchesSearch = log.actionDescription.toLowerCase().includes(search.toLowerCase()) || 
                          log.actorName.toLowerCase().includes(search.toLowerCase()) ||
                          log.entityId.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || log.actionCategory === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="Audit Log" subtitle="Immutable Record" fallbackRoute="/admin/dashboard" showBackButton={true} rightActions={
        <button style={{ background: "transparent", border: "none", color: "white", padding: "8px", cursor: "pointer" }}>
          <Download size={18} />
        </button>
      } />}
    >
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "30px" }}>
        
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: "12px", padding: "0 14px", height: "48px" }}>
          <Search size={18} color={tokens.inkMut} />
          <input 
            type="text" 
            placeholder="Search events, users, entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", color: tokens.ink, background: "transparent" }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {["All", "Auth", "Operational", "Configuration", "Security"].map(f => (
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
        <div className="flex flex-col gap-3">
          {filteredLogs.slice(0, page * PAGE_SIZE).map(log => (
            <div key={log.id} onClick={() => navigate(`/admin/audit/${log.id}`)} style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}`, cursor: "pointer" }}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getSeverityColor(log.severity) }} />
                  <span style={{ fontSize: "11px", color: tokens.inkSec }}>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md">
                  {getCategoryIcon(log.actionCategory)}
                  <span style={{ fontSize: "10px", fontWeight: 600, color: tokens.inkSec, textTransform: "capitalize" }}>{log.actionCategory}</span>
                </div>
              </div>
              
              <div style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink, marginBottom: "8px", lineHeight: 1.4 }}>
                {log.actionDescription}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${tokens.border}` }}>
                <div className="flex flex-col">
                  <span style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec }}>{log.actorName}</span>
                  <span style={{ fontSize: "10px", color: tokens.inkMut }}>{log.actorRole.replace('_', ' ')}</span>
                </div>
                <ChevronRight size={18} color={tokens.border} />
              </div>
            </div>
          ))}
          
          {filteredLogs.length === 0 && (
            <AdminEmptyState 
              icon={<Search size={24} />}
              title="No audit logs found"
              description="Try adjusting your search or filters."
            />
          )}
          
          {filteredLogs.length > page * PAGE_SIZE && (
            <button 
              onClick={() => setPage(page + 1)}
              style={{
                marginTop: "8px",
                padding: "14px",
                backgroundColor: "white",
                border: `1px solid ${tokens.border}`,
                borderRadius: "12px",
                color: tokens.inkSec,
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%"
              }}
            >
              Load More
            </button>
          )}
        </div>

      </div>
    </MobileLayout>
  );
}
