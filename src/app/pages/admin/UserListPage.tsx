import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { Search, Filter, Plus, User, Briefcase, Building2, ShieldCheck, ChevronRight } from "lucide-react";
import type { AdminUser } from "../../types/legacy";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminEmptyState } from "../../components/admin/shared/AdminEmptyState";

export default function UserListPage() {
  const navigate = useNavigate();
  const { users, organizations, vendors } = useAdminContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");

  const filteredUsers = useMemo(() => {
    let result = users.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                            user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const roleMap: Record<string, string> = {
        'org_admin': 'Org Admin',
        'vendor_manager': 'Vendor Manager',
        'technician': 'Technician',
        'system_admin': 'System Admin'
      };
      
      const matchesRole = roleFilter === "All" || roleMap[user.role] === roleFilter;
      const matchesStatus = statusFilter === "All" || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    result.sort((a, b) => a.firstName.localeCompare(b.firstName));
    return result;
  }, [users, searchQuery, roleFilter, statusFilter]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'system_admin': return { bg: tokens.purpleTint, color: tokens.purple, label: "System Admin" };
      case 'org_admin': return { bg: tokens.primaryTint, color: tokens.primary, label: "Org Admin" };
      case 'vendor_manager': return { bg: tokens.cyanTint, color: "#0891B2", label: "Vendor Mgr" };
      case 'technician': return { bg: tokens.greenTint, color: tokens.green, label: "Technician" };
      default: return { bg: tokens.borderLight, color: tokens.inkMut, label: "User" };
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return '#16A34A';
      case 'Inactive': return '#64748B';
      case 'Locked': return '#DC2626';
      default: return '#64748B';
    }
  };

  const getEntityName = (user: AdminUser) => {
    if (user.role === 'system_admin') return "10xDS Platform";
    if (user.assignedEntityType === 'org') {
      return organizations.find(o => o.id === user.assignedEntityId)?.name || "Unknown Org";
    }
    if (user.assignedEntityType === 'vendor') {
      return vendors.find(v => v.id === user.assignedEntityId)?.name || "Unknown Vendor";
    }
    return "Unassigned";
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="Users" subtitle={`${users.length} Accounts`} fallbackRoute="/admin/dashboard" showBackButton={true} rightActions={
        <div className="flex gap-2">
          <button onClick={() => navigate('/admin/users/create')} style={{ background: "white", border: "none", width: 36, height: 36, borderRadius: 18, color: tokens.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Plus size={18} />
          </button>
        </div>
      } />}
    >
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: "12px", padding: "0 14px", height: "48px" }}>
          <Search size={18} color={tokens.inkMut} />
          <input 
            type="text" 
            placeholder="Search by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", color: tokens.ink, background: "transparent" }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {["All", "Org Admin", "Vendor Manager", "Technician", "System Admin"].map(filter => (
            <button 
              key={filter}
              onClick={() => setRoleFilter(filter)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "16px",
                border: `1px solid ${roleFilter === filter ? tokens.primary : tokens.border}`,
                backgroundColor: roleFilter === filter ? "#E6F0FF" : tokens.card,
                color: roleFilter === filter ? tokens.primary : tokens.inkSec,
                fontSize: "13px",
                fontWeight: roleFilter === filter ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {filter}
            </button>
          ))}
        </div>
        
        <div style={{ display: "flex", gap: "8px" }}>
          {["All", "Active", "Inactive", "Locked"].map(status => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                flex: 1,
                padding: "4px",
                borderRadius: "8px",
                border: `1px solid ${statusFilter === status ? tokens.inkSec : tokens.border}`,
                backgroundColor: statusFilter === status ? tokens.inkSec : tokens.card,
                color: statusFilter === status ? "white" : tokens.inkSec,
                fontSize: "12px",
                fontWeight: statusFilter === status ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => {
              const roleBadge = getRoleBadge(user.role);
              return (
                <div 
                  key={user.id} 
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}`, cursor: "pointer", position: "relative", overflow: "hidden" }}
                >
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: getStatusColor(user.status) }} />
                  
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div style={{ width: "40px", height: "40px", borderRadius: "20px", backgroundColor: roleBadge.bg, color: roleBadge.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px" }}>
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink, margin: 0 }}>{user.firstName} {user.lastName}</h3>
                        </div>
                        <div style={{ fontSize: "13px", color: tokens.inkSec, marginTop: "2px" }}>{user.email}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px", backgroundColor: roleBadge.bg, color: roleBadge.color }}>
                      {roleBadge.label}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 500, padding: "3px 8px", borderRadius: "4px", backgroundColor: "#F1F5F9", color: tokens.inkSec, display: "flex", alignItems: "center", gap: "4px" }}>
                      {user.assignedEntityType === 'org' ? <Building2 size={10} /> : user.assignedEntityType === 'vendor' ? <Briefcase size={10} /> : <ShieldCheck size={10} />}
                      {getEntityName(user)}
                    </span>
                  </div>
                  
                  <div style={{ height: "1px", backgroundColor: tokens.border, margin: "12px 0" }} />

                  <div className="flex items-center justify-between">
                    <div style={{ fontSize: "12px", color: tokens.inkMut }}>
                      Last login: {new Date(user.lastLogin).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <div style={{ width: "8px", height: "8px", borderRadius: "4px", backgroundColor: getStatusColor(user.status) }} />
                      <span style={{ fontSize: "12px", fontWeight: 500, color: tokens.inkSec }}>{user.status}</span>
                      <ChevronRight size={16} color={tokens.border} style={{ marginLeft: "4px" }} />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <AdminEmptyState 
              icon={<User size={24} />}
              title="No users found"
              description="Try adjusting your search or filters."
            />
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

