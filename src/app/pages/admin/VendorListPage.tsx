import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { useAdminContext } from "../../contexts/AdminContext";
import { BackHeader } from "../../components/navigation/BackHeader";
import { Search, Filter, Plus, Briefcase, MapPin, ShieldCheck, Star, ChevronRight, User } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";
import { AdminBadge } from "../../components/admin/shared/AdminBadge";
import { AdminEmptyState } from "../../components/admin/shared/AdminEmptyState";

export default function VendorListPage() {
  const navigate = useNavigate();
  const { vendors } = useAdminContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("Name");
  
  const [serviceFilter, setServiceFilter] = useState("All Services");
  const [regionFilter, setRegionFilter] = useState("All Regions");

  const filteredVendors = useMemo(() => {
    let result = vendors.filter(vendor => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            vendor.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            vendor.serviceTypes.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === "All" || vendor.status === statusFilter;
      const matchesService = serviceFilter === "All Services" || vendor.serviceTypes.includes(serviceFilter);
      const matchesRegion = regionFilter === "All Regions" || vendor.serviceRegions?.includes(regionFilter);
      
      return matchesSearch && matchesStatus && matchesService && matchesRegion;
    });

    switch(sortBy) {
      case "Name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "SLA Rate":
        result.sort((a, b) => b.slaCompliance - a.slaCompliance);
        break;
      case "Star Rating":
        result.sort((a, b) => b.starRating - a.starRating);
        break;
      case "Newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [vendors, searchQuery, statusFilter, serviceFilter, regionFilter, sortBy]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return '#16A34A';
      case 'Suspended': return '#DC2626';
      case 'Pending Approval': return '#D97706';
      default: return '#64748B';
    }
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg}
      
      header={<BackHeader title="Vendors" subtitle={`${vendors.length} Service Partners`} fallbackRoute="/admin/dashboard" showBackButton={true} rightActions={
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} style={{ background: showFilters ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)", border: "none", width: 36, height: 36, borderRadius: 18, color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}>
            <Filter size={18} />
          </button>
          <button onClick={() => navigate('/admin/vendors/create')} style={{ background: "white", border: "none", width: 36, height: 36, borderRadius: 18, color: tokens.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
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
            placeholder="Search vendors, ID, service type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", color: tokens.ink, background: "transparent" }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {["All", "Active", "Pending Approval", "Suspended"].map(filter => (
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
        
        {showFilters && (
          <div style={{ backgroundColor: tokens.card, padding: "12px", borderRadius: "12px", border: `1px solid ${tokens.border}`, display: "flex", flexWrap: "wrap", gap: "8px", animation: "fadeIn 0.2s" }}>
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={{ flex: "1 1 calc(50% - 4px)", padding: "10px", borderRadius: "8px", border: `1px solid ${tokens.border}`, outline: "none", fontSize: "13px" }}>
               <option value="All Services">All Services</option>
               <option value="HVAC">HVAC</option>
               <option value="Plumbing">Plumbing</option>
               <option value="Electrical">Electrical</option>
               <option value="Janitorial">Janitorial</option>
            </select>
            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} style={{ flex: "1 1 calc(50% - 4px)", padding: "10px", borderRadius: "8px", border: `1px solid ${tokens.border}`, outline: "none", fontSize: "13px" }}>
               <option value="All Regions">All Regions</option>
               <option value="North America">North America</option>
               <option value="Europe">Europe</option>
               <option value="Asia">Asia</option>
            </select>
            {(serviceFilter !== "All Services" || regionFilter !== "All Regions") && (
              <button 
                onClick={() => { setServiceFilter("All Services"); setRegionFilter("All Regions"); }}
                style={{ flex: "1 1 100%", padding: "10px", backgroundColor: "#FEF2F2", color: tokens.red, border: `1px solid #FECACA`, borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                Reset Dropdown Filters
              </button>
            )}
          </div>
        )}

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredVendors.length > 0 ? (
            filteredVendors.map(vendor => (
              <div 
                key={vendor.id} 
                onClick={() => navigate(`/admin/vendors/${vendor.id}`)}
                style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: `1px solid ${tokens.border}`, cursor: "pointer", position: "relative", overflow: "hidden" }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: getStatusColor(vendor.status) }} />
                
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div style={{ width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "#F8FAFC", border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.primary, fontWeight: 700, fontSize: "14px" }}>
                      {vendor.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 style={{ fontSize: "15px", fontWeight: 700, color: tokens.ink, margin: 0 }}>{vendor.name}</h3>
                        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#F1F5F9", color: tokens.inkMut, fontFamily: "monospace" }}>{vendor.id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {vendor.serviceTypes.map(t => (
                          <span key={t} style={{ fontSize: "10px", backgroundColor: "#F1F5F9", color: tokens.inkSec, padding: "2px 6px", borderRadius: "4px", fontWeight: 500 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <AdminBadge status={vendor.status} />
                </div>

                <div style={{ height: "1px", backgroundColor: tokens.border, margin: "12px 0" }} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5" title="Technicians">
                      <User size={14} color={tokens.inkMut} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec }}>{vendor.technicianCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="SLA Compliance">
                      <ShieldCheck size={14} color={tokens.inkMut} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: vendor.slaCompliance >= vendor.slaTarget ? tokens.green : "#EA580C" }}>{vendor.slaCompliance}%</span>
                    </div>
                    <div className="flex items-center gap-1" title="Rating">
                      <Star size={14} color="#EAB308" fill="#EAB308" />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec }}>{vendor.starRating}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} color={tokens.border} />
                </div>
              </div>
            ))
          ) : (
            <AdminEmptyState 
              icon={<Briefcase size={24} />}
              title="No vendors found"
              description="Start by onboarding your first service partner."
              action={
                <button onClick={() => navigate('/admin/vendors/create')} style={{ padding: "12px 24px", backgroundColor: tokens.primary, color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <Plus size={16} /> Onboard Vendor
                </button>
              }
            />
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
