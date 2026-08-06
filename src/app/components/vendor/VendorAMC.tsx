import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor, VendorAsset } from "../../contexts/VendorContext";
import { publishEvent } from "../../utils/eventBus";
import {
  ArrowLeft, Calendar, FileText, CheckCircle2, Search, X, ShieldAlert, BadgeDollarSign, Mail
} from "lucide-react";

const blue = "#2563EB", blueMid = "#3B82F6", blueTint = "#EFF6FF", green = "#16A34A", greenT = "#DCFCE7", amber = "#D97706", amberT = "#FFFBEB", red = "#DC2626", redT = "#FEF2F2", ink = "#0F172A", inkSec = "#475569", inkMut = "#64748B", bg = "#F8FAFC", card = "#FFFFFF", border = "#E2E8F0", divider = "#F1F5F9", inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

function ContractDocumentSheet({ amc, onClose, onDownload }: { amc: any, onClose: () => void, onDownload: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.65)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "40px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter }}>Contract Details</h3>
            <p style={{ fontSize: "12px", color: inkMut, margin: 0, fontFamily: inter }}>{amc.id}</p>
          </div>
          <button type="button" onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "100px", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={18} color={inkMut} /></button>
        </div>
        
        <div style={{ backgroundColor: bg, borderRadius: "12px", padding: "16px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>Asset</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{amc.asset.name}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>Model</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{amc.asset.model}</span>
          </div>
          <div style={{ height: "1px", backgroundColor: divider }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>Start Date</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{new Date(Date.now() - 300 * 86400000).toLocaleDateString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>Expiry Date</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{new Date(amc.expiryDate).toLocaleDateString()}</span>
          </div>
          <div style={{ height: "1px", backgroundColor: divider }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: inkSec, fontFamily: inter }}>Annual Value</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: green, fontFamily: inter }}>$2,500/yr</span>
          </div>
        </div>

        <button type="button" onClick={onDownload} style={{ width: "100%", height: "50px", borderRadius: "12px", backgroundColor: ink, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" }}>
          <FileText size={18} color="white" />
          <span style={{ fontSize: "15px", fontWeight: 700, color: "white", fontFamily: inter }}>Download PDF</span>
        </button>
      </div>
    </div>
  );
}

function QuoteSheet({ amc, onClose, onSubmit }: { amc: any, onClose: () => void, onSubmit: (amount: number, requiresPhysicalService: boolean) => void }) {
  const [amount, setAmount] = useState("2500");
  const [requiresPhysicalService, setRequiresPhysicalService] = useState(false);
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.65)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "40px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter }}>Create Quotation</h3>
            <p style={{ fontSize: "12px", color: inkMut, margin: 0, fontFamily: inter }}>{amc.asset.name}</p>
          </div>
          <button type="button" onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "100px", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={18} color={inkMut} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: inkSec, fontFamily: inter, display: "block", marginBottom: "6px" }}>Renewal Amount ($)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: "100%", height: "44px", borderRadius: "10px", border: `1px solid ${border}`, padding: "0 14px", fontSize: "14px", fontFamily: inter, boxSizing: "border-box", color: ink }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", cursor: "pointer" }} onClick={() => setRequiresPhysicalService(!requiresPhysicalService)}>
            <div style={{ width: "20px", height: "20px", borderRadius: "6px", border: `1.5px solid ${requiresPhysicalService ? blue : border}`, backgroundColor: requiresPhysicalService ? blue : card, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {requiresPhysicalService && <CheckCircle2 size={14} color="white" />}
            </div>
            <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter }}>Requires Physical Service (e.g. onsite inspection)</span>
          </div>
          <button type="button" onClick={() => onSubmit(Number(amount), requiresPhysicalService)} style={{ width: "100%", height: "50px", borderRadius: "12px", backgroundColor: blue, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", marginTop: "10px" }}>
            <BadgeDollarSign size={18} color="white" />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "white", fontFamily: inter }}>Submit Quote</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailSheet({ amc, onClose, onSubmit }: { amc: any, onClose: () => void, onSubmit: () => void }) {
  const [subject, setSubject] = useState(`AMC Renewal Reminder - ${amc.asset.name}`);
  const [body, setBody] = useState(`Dear Customer,\n\nThis is a friendly reminder that the AMC for your ${amc.asset.name} is expiring soon on ${new Date(amc.expiryDate).toLocaleDateString()}.\n\nPlease let us know if you would like to proceed with the renewal.\n\nBest regards,\nAcme Facility Services`);
  
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.65)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "40px", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter }}>Contact Customer</h3>
            <p style={{ fontSize: "12px", color: inkMut, margin: 0, fontFamily: inter }}>{amc.asset.name}</p>
          </div>
          <button type="button" onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "100px", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={18} color={inkMut} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: inkSec, fontFamily: inter, display: "block", marginBottom: "6px" }}>Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: "100%", height: "44px", borderRadius: "10px", border: `1px solid ${border}`, padding: "0 14px", fontSize: "14px", fontFamily: inter, boxSizing: "border-box", color: ink }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: inkSec, fontFamily: inter, display: "block", marginBottom: "6px" }}>Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} style={{ width: "100%", borderRadius: "10px", border: `1px solid ${border}`, padding: "10px 14px", fontSize: "13px", fontFamily: inter, boxSizing: "border-box", color: ink, resize: "none" }} />
          </div>
          <button type="button" onClick={onSubmit} style={{ width: "100%", height: "50px", borderRadius: "12px", backgroundColor: blue, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", marginTop: "10px" }}>
            <Mail size={18} color="white" />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "white", fontFamily: inter }}>Send Email</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorAMC() {
  const navigate = useNavigate();
  const { vendor, amcRenewals, getAssetById, customers, advanceAMCWorkflow, updateAMCPhysicalService } = useVendor();
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [filter, setFilter] = useState<"All" | "Expiring Soon" | "Active">("All");
  
  const [selectedAMC, setSelectedAMC] = useState<any>(null);
  const [showQuoteSheet, setShowQuoteSheet] = useState(false);
  const [showEmailSheet, setShowEmailSheet] = useState(false);
  const [showDocumentSheet, setShowDocumentSheet] = useState(false);

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || "Unknown Customer";

  const renewals = useMemo(() => {
    let list = amcRenewals.map(r => {
      const asset = getAssetById(r.assetId);
      const days = Math.ceil((new Date(r.expiryDate).getTime() - Date.now()) / 86400000);
      return { ...r, asset, days };
    }).filter(r => r.asset !== undefined) as (typeof amcRenewals[0] & { asset: VendorAsset, days: number })[];

    if (filter === "Expiring Soon") {
      list = list.filter(r => r.days <= 30 && r.days >= 0);
    } else if (filter === "Active") {
      list = list.filter(r => r.days > 30);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.asset.name.toLowerCase().includes(q) || r.asset.id.toLowerCase().includes(q));
    }

    return list.sort((a, b) => a.days - b.days);
  }, [amcRenewals, getAssetById, search, filter]);

  const expiringCount = amcRenewals.filter(r => {
    const days = Math.ceil((new Date(r.expiryDate).getTime() - Date.now()) / 86400000);
    return days <= 30 && days >= 0;
  }).length;

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleGenerateQuote = (amount: number, requiresPhysicalService: boolean) => {
    if (!selectedAMC) return;
    publishEvent({
      type: "AMC_QUOTATION_SUBMITTED",
      payload: { assetId: selectedAMC.assetId, amount: amount, vendorId: vendor.id }
    });
    updateAMCPhysicalService(selectedAMC.id, requiresPhysicalService);
    advanceAMCWorkflow(selectedAMC.id, "Quote Generated");
    setShowQuoteSheet(false);
    flash(`Quotation of $${amount} generated for ${selectedAMC.asset.name}`);
  };

  const handleSendEmail = () => {
    if (selectedAMC) advanceAMCWorkflow(selectedAMC.id, "Waiting Approval");
    setShowEmailSheet(false);
    flash("Quote sent to client for approval.");
  };

  return (
    <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`,
        padding: "50px 20px 24px", flexShrink: 0, position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <button type="button" style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "10px", padding: "6px 12px 6px 9px",
            cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter,
          }} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} color="white" /> Back
          </button>
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: inter, marginBottom: "4px" }}>
          Client AMC Requests
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", fontFamily: inter }}>
          Manage Annual Maintenance Contracts
        </p>

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <div style={{ flex: 1, height: "44px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", padding: "0 14px", gap: "10px" }}>
            <Search size={18} color="white" />
            <input 
              type="text" 
              placeholder="Search contracts..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", fontSize: "14px", color: "white", outline: "none", fontFamily: inter }}
              className="placeholder-white-50"
            />
            {search && <X size={16} color="white" style={{ cursor: "pointer" }} onClick={() => setSearch("")} />}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        
        {successMsg && (
          <div style={{ backgroundColor: greenT, border: `1px solid ${green}40`, borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} color={green} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: green, fontFamily: inter }}>{successMsg}</span>
          </div>
        )}

        {expiringCount > 0 && (
          <div style={{ backgroundColor: amberT, borderRadius: "12px", padding: "14px", marginBottom: "16px", border: `1px solid ${amber}30` }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <ShieldAlert size={20} color={amber} style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 800, color: amber, margin: "0 0 4px", fontFamily: inter }}>Action Required</h4>
                <p style={{ fontSize: "12.5px", color: "#B45309", margin: "0 0 10px", fontFamily: inter, lineHeight: 1.4 }}>
                  You have <b>{expiringCount}</b> contracts expiring in the next 30 days. Renew them to secure <b>$12,500</b> in recurring revenue.
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setFilter("Expiring Soon")} style={{ padding: "6px 12px", borderRadius: "6px", backgroundColor: amber, border: "none", color: "white", fontSize: "11px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>View Expiring</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "16px" }}>
          {["All", "Expiring Soon", "Active"].map(f => (
            <button key={f} type="button" onClick={() => setFilter(f as any)}
              style={{ padding: "8px 16px", borderRadius: "100px", backgroundColor: filter === f ? blue : card, border: `1px solid ${filter === f ? blue : border}`, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: filter === f ? `0 4px 12px ${blue}40` : "none", transition: "all 0.2s" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: filter === f ? "white" : inkSec, fontFamily: inter }}>{f}</span>
            </button>
          ))}
        </div>

        {renewals.length > 0 ? renewals.map(r => (
          <div key={r.id} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, padding: "16px", marginBottom: "12px", boxShadow: cardShadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: blue, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: inter }}>{getCustomerName(r.asset.customerId)}</div>
                  <div style={{ padding: "2px 6px", borderRadius: "100px", backgroundColor: r.days <= 30 ? redT : amberT, fontSize: "9px", fontWeight: 700, color: r.days <= 30 ? red : amber, fontFamily: inter, textTransform: "uppercase" }}>
                    {r.days <= 30 ? "High Priority" : "Medium Priority"}
                  </div>
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: ink, margin: "0 0 2px", fontFamily: inter, letterSpacing: "-0.01em" }}>{r.asset.name}</h3>
                <p style={{ fontSize: "12px", color: inkSec, margin: 0, fontFamily: inter }}>AMC Ref: {r.id}</p>
              </div>
              <button type="button" onClick={() => { setSelectedAMC(r); setShowDocumentSheet(true); }} style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", transition: "all 0.2s" }}>
                <FileText size={16} color={blue} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <div style={{ flex: 1, backgroundColor: bg, borderRadius: "8px", padding: "10px", border: `1px solid ${border}` }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: inkMut, fontFamily: inter, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Requested</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: ink, fontFamily: inter }}>{new Date(Date.now() - 2 * 86400000).toLocaleDateString()}</span>
              </div>
              <div style={{ flex: 1, backgroundColor: r.days <= 30 ? redT : amberT, borderRadius: "8px", padding: "10px", border: `1px solid ${r.days <= 30 ? red : amber}30` }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: r.days <= 30 ? red : amber, fontFamily: inter, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Time Left</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: r.days <= 30 ? red : amber, fontFamily: inter }}>{r.days} Days Remaining</span>
              </div>
            </div>

            <div style={{ backgroundColor: bg, borderRadius: "8px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter, textTransform: "uppercase" }}>Current Status</span>
                <div style={{ fontSize: "12px", fontWeight: 700, color: ink, fontFamily: inter }}>{(r as any).status}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: inkMut, fontFamily: inter, textTransform: "uppercase" }}>Vendor Action</span>
                <div style={{ fontSize: "11px", fontWeight: 700, color: blue, fontFamily: inter }}>
                  {(r as any).status === "Request Received" ? "Review Request" : 
                   (r as any).status === "Review" ? "Generate Quote" :
                   (r as any).status === "Quote Generated" ? "Send to Client" :
                   (r as any).status === "Waiting Approval" ? "Awaiting Client" :
                   (r as any).status === "Approved" ? ((r as any).requiresPhysicalService ? "Schedule Technician" : "Activate Contract") :
                   (r as any).status === "Schedule Technician" ? "Activate Contract" :
                   (r as any).status === "Activate Contract" ? "Generate Invoice" :
                   (r as any).status === "Generate Invoice" ? "Mark Completed" : "Contract Active"}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: "#F5F3FF", borderRadius: "8px", padding: "10px 12px", border: "1px solid #EDE9FE", marginBottom: "16px", display: "flex", gap: "8px" }}>
              <div style={{ marginTop: "2px" }}>
                <ShieldAlert size={14} color="#7C3AED" />
              </div>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#7C3AED", fontFamily: inter, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>AI Suggestion</span>
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#5B21B6", fontFamily: inter, lineHeight: 1.3, display: "block" }}>
                  Propose a 3-year renewal contract based on asset lifecycle and historical maintenance costs.
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {(r as any).status === "Request Received" && (
                <button onClick={() => advanceAMCWorkflow(r.id, "Review")} style={{ flex: 1, height: "40px", borderRadius: "10px", backgroundColor: blue, color: "white", border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
                  Review Request
                </button>
              )}
              {(r as any).status === "Review" && (
                <button onClick={() => { setSelectedAMC(r); setShowQuoteSheet(true); }} style={{ flex: 1, height: "40px", borderRadius: "10px", backgroundColor: blue, color: "white", border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}>
                  <BadgeDollarSign size={16} /> Generate Quote
                </button>
              )}
              {(r as any).status === "Quote Generated" && (
                <button onClick={() => { setSelectedAMC(r); setShowEmailSheet(true); }} style={{ flex: 1, height: "40px", borderRadius: "10px", backgroundColor: blue, color: "white", border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}>
                  <Mail size={16} color="white" /> Send to Client
                </button>
              )}
              {(r as any).status === "Waiting Approval" && (
                <>
                  <button onClick={() => advanceAMCWorkflow(r.id, "Approved")} style={{ flex: 1, height: "40px", borderRadius: "10px", backgroundColor: green, color: "white", border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}>
                    Simulate Client Approve
                  </button>
                  <button style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: divider, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "not-allowed" }}>
                    <Mail size={16} color={inkSec} />
                  </button>
                </>
              )}
              {(r as any).status === "Approved" && (
                <button onClick={() => advanceAMCWorkflow(r.id, (r as any).requiresPhysicalService ? "Schedule Technician" : "Activate Contract")} style={{ flex: 1, height: "40px", borderRadius: "10px", backgroundColor: blue, color: "white", border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
                  {(r as any).requiresPhysicalService ? "Schedule Technician" : "Activate Contract"}
                </button>
              )}
              {(r as any).status === "Schedule Technician" && (
                <button onClick={() => advanceAMCWorkflow(r.id, "Activate Contract")} style={{ flex: 1, height: "40px", borderRadius: "10px", backgroundColor: blue, color: "white", border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
                  Activate Contract
                </button>
              )}
              {(r as any).status === "Activate Contract" && (
                <button onClick={() => { advanceAMCWorkflow(r.id, "Generate Invoice"); flash("Contract activated successfully."); }} style={{ flex: 1, height: "40px", borderRadius: "10px", backgroundColor: blue, color: "white", border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
                  Generate Invoice
                </button>
              )}
              {(r as any).status === "Generate Invoice" && (
                <button onClick={() => advanceAMCWorkflow(r.id, "Completed")} style={{ flex: 1, height: "40px", borderRadius: "10px", backgroundColor: blue, color: "white", border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "pointer" }}>
                  Mark Completed
                </button>
              )}
              {(r as any).status === "Completed" && (
                <button onClick={() => flash("Contract already active.")} style={{ width: "100%", height: "40px", borderRadius: "10px", backgroundColor: divider, color: inkSec, border: "none", fontSize: "13px", fontWeight: 700, fontFamily: inter, cursor: "not-allowed" }}>
                  Contract Active
                </button>
              )}
            </div>
          </div>
        )) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <FileText size={32} color={inkMut} style={{ marginBottom: "16px" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, fontFamily: inter, margin: "0 0 8px" }}>No contracts found</h3>
            <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: 0 }}>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .placeholder-white-50::placeholder { color: rgba(255,255,255,0.6); }
      `}} />
      {showQuoteSheet && selectedAMC && (
        <QuoteSheet 
          amc={selectedAMC} 
          onClose={() => setShowQuoteSheet(false)} 
          onSubmit={handleGenerateQuote} 
        />
      )}
      {showEmailSheet && selectedAMC && (
        <EmailSheet 
          amc={selectedAMC} 
          onClose={() => setShowEmailSheet(false)} 
          onSubmit={handleSendEmail} 
        />
      )}
      {showDocumentSheet && selectedAMC && (
        <ContractDocumentSheet 
          amc={selectedAMC} 
          onClose={() => setShowDocumentSheet(false)} 
          onDownload={() => {
            setShowDocumentSheet(false);
            flash("Contract PDF downloaded successfully.");
          }}
        />
      )}
    </MobileLayout>
  );
}
