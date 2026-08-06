import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { Search, Plus, ShieldAlert, Clock, Calendar, Users, ChevronRight } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminBadge } from "../../components/admin/shared/AdminBadge";
import { AdminEmptyState } from "../../components/admin/shared/AdminEmptyState";

export default function SLAPolicyListPage() {
  const navigate = useNavigate();
  const { slaPolicies } = useAdminContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredPolicies = useMemo(() => {
    let result = slaPolicies.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [slaPolicies, searchQuery, statusFilter]);

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="SLA Policies" subtitle={`${slaPolicies.length} Templates`} fallbackRoute="/admin/dashboard" showBackButton={true} rightActions={
        <button onClick={() => navigate('/admin/sla/create')} style={{ background: "white", border: "none", width: 36, height: 36, borderRadius: 18, color: tokens.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Plus size={18} />
        </button>
      } />}
    >
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: "12px", padding: "0 14px", height: "48px" }}>
          <Search size={18} color={tokens.inkMut} />
          <input 
            type="text" 
            placeholder="Search policies, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", color: tokens.ink, background: "transparent" }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {["All", "Active", "Archived"].map(filter => (
            <button 
              key={filter}
              onClick={() => setStatusFilter(filter)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "16px",
                border: `1px solid ${statusFilter === filter ? tokens.primary : tokens.border}`,
                backgroundColor: statusFilter === filter ? "#E6F0FF" : tokens.card,
                color: statusFilter === filter ? tokens.primary : tokens.inkSec,
                fontSize: "13px",
                fontWeight: statusFilter === filter ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredPolicies.length > 0 ? (
            filteredPolicies.map(policy => (
              <div 
                key={policy.id} 
                onClick={() => navigate(`/admin/sla/${policy.id}`)}
                style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}`, cursor: "pointer", position: "relative", overflow: "hidden" }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: policy.status === 'Active' ? tokens.green : tokens.inkMut }} />
                
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink, margin: "0 0 2px" }}>{policy.name}</h3>
                    <div style={{ fontSize: "11px", fontFamily: "monospace", color: tokens.inkMut }}>{policy.id}</div>
                  </div>
                  <AdminBadge status={policy.status} />
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", backgroundColor: "#FEF2F2", color: "#B91C1C", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    <ShieldAlert size={10} /> Crit: {policy.priorityMatrix.critical.resolutionHrs}h
                  </span>
                  <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", backgroundColor: "#FFF7ED", color: "#C2410C", fontWeight: 600 }}>
                    High: {policy.priorityMatrix.high.resolutionHrs}h
                  </span>
                </div>

                <div style={{ height: "1px", backgroundColor: tokens.border, margin: "12px 0" }} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5" title="Business Hours Mode">
                      <Clock size={14} color={tokens.inkMut} />
                      <span style={{ fontSize: "12px", fontWeight: 500, color: tokens.inkSec }}>
                        {policy.businessHoursMode === "24/7" ? "24/7" : "Biz Hrs"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Assigned Vendors">
                      <Users size={14} color={tokens.inkMut} />
                      <span style={{ fontSize: "12px", fontWeight: 500, color: tokens.inkSec }}>
                        {policy.assignedVendorIds.length} Vendors
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} color={tokens.border} />
                </div>
              </div>
            ))
          ) : (
            <AdminEmptyState 
              icon={<Calendar size={24} />}
              title="No SLA Policies found"
              description="Create your first service level template."
              action={
                <button onClick={() => navigate('/admin/sla/create')} style={{ padding: "12px 24px", backgroundColor: tokens.primary, color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <Plus size={16} /> Create Policy
                </button>
              }
            />
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
