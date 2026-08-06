import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { useVendor } from "../../contexts/VendorContext";
import { ArrowLeft, Search, X, Users, ClipboardList, Package, Zap, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const blue = "#2563EB";
const blueTint = "#EFF6FF";
const green = "#16A34A";
const greenT = "#DCFCE7";
const red = "#DC2626";
const amber = "#D97706";
const ink = "#0F172A";
const inkSec = "#475569";
const inkMut = "#64748B";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

type Tab = "All" | "Tickets" | "Customers" | "Assets" | "Technicians";

export default function VendorGlobalSearch() {
  const navigate = useNavigate();
  const { customers, tickets, assets, technicians } = useVendor();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { tickets: [], customers: [], assets: [], technicians: [] };

    return {
      tickets: tickets.filter(t => t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q)),
      customers: customers.filter(c => c.name.toLowerCase().includes(q) || c.contactPerson.toLowerCase().includes(q)),
      assets: assets.filter(a => a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.model.toLowerCase().includes(q)),
      technicians: technicians.filter(t => t.name.toLowerCase().includes(q) || t.role.toLowerCase().includes(q))
    };
  }, [query, tickets, customers, assets, technicians]);

  const totalResults = results.tickets.length + results.customers.length + results.assets.length + results.technicians.length;

  const renderTicket = (t: any) => (
    <div key={t.id} onClick={() => navigate(`/vendor/tickets/${t.id}`)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", backgroundColor: card, borderRadius: "12px", border: `1px solid ${border}`, marginBottom: "8px", cursor: "pointer" }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <ClipboardList size={20} color={blue} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter }}>{t.id}</span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: t.status === "Completed" ? green : amber, backgroundColor: t.status === "Completed" ? greenT : "#FFFBEB", padding: "2px 6px", borderRadius: "6px", fontFamily: inter }}>{t.status.toUpperCase()}</span>
        </div>
        <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</p>
      </div>
    </div>
  );

  const renderCustomer = (c: any) => (
    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", backgroundColor: card, borderRadius: "12px", border: `1px solid ${border}`, marginBottom: "8px" }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "20px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Users size={20} color={inkMut} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 4px", fontFamily: inter }}>{c.name}</h4>
        <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>{c.contactEmail}</p>
      </div>
    </div>
  );

  const renderAsset = (a: any) => (
    <div key={a.id} onClick={() => navigate(`/vendor/assets/${a.id}`)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", backgroundColor: card, borderRadius: "12px", border: `1px solid ${border}`, marginBottom: "8px", cursor: "pointer" }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Package size={20} color={inkMut} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 4px", fontFamily: inter }}>{a.name}</h4>
        <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>{a.model} • {a.id}</p>
      </div>
    </div>
  );

  const renderTechnician = (t: any) => (
    <div key={t.id} onClick={() => navigate(`/vendor/technicians/${t.id}`)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", backgroundColor: card, borderRadius: "12px", border: `1px solid ${border}`, marginBottom: "8px", cursor: "pointer" }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "20px", backgroundColor: t.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: inter, flexShrink: 0 }}>
        {t.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 4px", fontFamily: inter }}>{t.name}</h4>
        <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>{t.role}</p>
      </div>
    </div>
  );

  return (
    <MobileLayout backgroundColor={bg}>
      <div style={{ backgroundColor: card, paddingTop: "44px", paddingBottom: "12px", paddingLeft: "16px", paddingRight: "16px", borderBottom: `1px solid ${border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button type="button" onClick={() => navigate(-1)} style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <ArrowLeft size={18} color={inkSec} />
          </button>
          <div style={{ flex: 1, height: "40px", borderRadius: "12px", backgroundColor: divider, display: "flex", alignItems: "center", padding: "0 12px", gap: "8px" }}>
            <Search size={18} color={inkMut} />
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Search customers, tickets, assets..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", fontSize: "15px", color: ink, outline: "none", fontFamily: inter }}
            />
            {query && <X size={16} color={inkMut} style={{ cursor: "pointer" }} onClick={() => setQuery("")} />}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", overflowX: "auto", gap: "8px", marginTop: "16px", scrollbarWidth: "none" }}>
          {(["All", "Tickets", "Customers", "Assets", "Technicians"] as Tab[]).map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{ padding: "6px 16px", borderRadius: "100px", backgroundColor: activeTab === tab ? ink : card, border: `1px solid ${activeTab === tab ? ink : border}`, color: activeTab === tab ? "white" : inkSec, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer", whiteSpace: "nowrap" }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        {!query ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Search size={32} color={inkMut} style={{ marginBottom: "12px", opacity: 0.5 }} />
            <p style={{ fontSize: "14px", color: inkMut, fontFamily: inter, margin: 0 }}>Type above to search across your entire vendor workspace.</p>
          </div>
        ) : totalResults === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: "14px", color: inkMut, fontFamily: inter, margin: 0 }}>No results found for "{query}"</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {(activeTab === "All" || activeTab === "Tickets") && results.tickets.length > 0 && (
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: inkSec, margin: "0 0 12px", fontFamily: inter }}>TICKETS</h3>
                {results.tickets.map(renderTicket)}
              </div>
            )}
            {(activeTab === "All" || activeTab === "Customers") && results.customers.length > 0 && (
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: inkSec, margin: "0 0 12px", fontFamily: inter }}>CUSTOMERS</h3>
                {results.customers.map(renderCustomer)}
              </div>
            )}
            {(activeTab === "All" || activeTab === "Assets") && results.assets.length > 0 && (
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: inkSec, margin: "0 0 12px", fontFamily: inter }}>ASSETS</h3>
                {results.assets.map(renderAsset)}
              </div>
            )}
            {(activeTab === "All" || activeTab === "Technicians") && results.technicians.length > 0 && (
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: inkSec, margin: "0 0 12px", fontFamily: inter }}>TECHNICIANS</h3>
                {results.technicians.map(renderTechnician)}
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
