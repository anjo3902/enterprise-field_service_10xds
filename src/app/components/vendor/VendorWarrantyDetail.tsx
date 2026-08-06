import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor, WarrantyWorkflowStatus, Priority, TechAvailability } from "../../contexts/VendorContext";
import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, ShieldCheck, FileCheck, Info, Users
} from "lucide-react";

const blue = "#2563EB", blueTint = "#EFF6FF", green = "#16A34A", greenT = "#DCFCE7", amber = "#D97706", amberT = "#FFFBEB", red = "#DC2626", redT = "#FEF2F2", ink = "#0F172A", inkSec = "#475569", inkMut = "#64748B", bg = "#F8FAFC", card = "#FFFFFF", border = "#E2E8F0", divider = "#F1F5F9", purple = "#7C3AED", purpleT = "#F5F3FF", inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

// Helper for UI styling of states
function getStatusStyle(status: WarrantyWorkflowStatus) {
  if (status === "Activated") return { color: green, bg: greenT };
  if (status === "Rejected" || status === "Expired") return { color: red, bg: redT };
  if (status === "New Request" || status === "Inspection Required" || status === "Under Review") return { color: amber, bg: amberT };
  return { color: blue, bg: blueTint };
}

export default function VendorWarrantyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { warrantyRenewals, getAssetById, advanceWarrantyWorkflow, activateWarrantyContract, technicians } = useVendor();

  // Responsive button component
  const ActionButton = ({ onClick, icon: Icon, label, bgColor, color, outline, disabled }: any) => {
    const [pressed, setPressed] = useState(false);
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        onPointerDown={() => !disabled && setPressed(true)}
        onPointerUp={() => !disabled && setPressed(false)}
        onPointerLeave={() => !disabled && setPressed(false)}
        style={{
          width: "100%", height: "44px", borderRadius: "10px", 
          backgroundColor: outline ? "transparent" : bgColor,
          color: color, 
          border: outline ? `1px solid ${color}40` : "none",
          fontSize: "14px", fontWeight: 700, fontFamily: inter, 
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", 
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transform: pressed ? "scale(0.97)" : "scale(1)",
          transition: "all 0.1s ease"
        }}
      >
        {Icon && <Icon size={16} />} {label}
      </button>
    );
  };

  const warranty = useMemo(() => warrantyRenewals.find(r => r.id === id), [warrantyRenewals, id]);
  const asset = useMemo(() => warranty ? getAssetById(warranty.assetId) : null, [warranty, getAssetById]);

  const [successMsg, setSuccessMsg] = useState("");
  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3500); };

  // Quote Builder State
  const [quoteYears, setQuoteYears] = useState("1");
  const [quoteCost, setQuoteCost] = useState("");
  const [quoteCoverage, setQuoteCoverage] = useState("Parts and Labor");

  // Inspection Assigment State
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [selectedTech, setSelectedTech] = useState("");

  if (!warranty || !asset) {
    return (
      <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />}>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <h2 style={{ fontFamily: inter, color: ink }}>Warranty Not Found</h2>
          <button onClick={() => navigate(-1)} style={{ padding: "10px 20px", borderRadius: "8px", backgroundColor: blue, color: "white", border: "none" }}>Go Back</button>
        </div>
      </MobileLayout>
    );
  }

  const s = getStatusStyle(warranty.status);
  const isExpiringSoon = Math.ceil((new Date(warranty.currentExpiryDate).getTime() - Date.now()) / 86400000) <= 30;

  const handleApproveForQuotation = () => {
    advanceWarrantyWorkflow(warranty.id, "Under Review");
    flash("Moved to quotation builder.");
  };

  const handleRejectRequest = () => {
    advanceWarrantyWorkflow(warranty.id, "Rejected");
    flash("Warranty extension request rejected.");
  };

  const handleRequireInspection = () => {
    advanceWarrantyWorkflow(warranty.id, "Inspection Required", { inspection: { required: true, completed: false } });
    flash("Physical inspection required before quoting.");
  };

  const handleGenerateQuote = () => {
    if (!quoteCost) { flash("Please enter a cost."); return; }
    advanceWarrantyWorkflow(warranty.id, "Quotation Generated", {
      quotation: {
        durationYears: Number(quoteYears),
        cost: Number(quoteCost),
        coverage: quoteCoverage,
        exclusions: "Consumables, negligence",
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString()
      }
    });
    flash("Quotation generated successfully.");
  };

  const handleSendQuote = () => {
    advanceWarrantyWorkflow(warranty.id, "Quotation Sent");
    flash("Quotation sent to client.");
  };

  const handleSimulateApproval = () => {
    advanceWarrantyWorkflow(warranty.id, "Customer Approved");
    flash("Customer has approved the quotation.");
  };

  const handleActivateContract = () => {
    activateWarrantyContract(warranty.id);
    flash("Contract activated successfully! Asset expiry updated.");
  };

  const handleAssignTech = () => {
    if(!selectedTech) return;
    const tech = technicians.find(t=>t.id===selectedTech);
    if(!tech) return;
    advanceWarrantyWorkflow(warranty.id, "Inspection Scheduled", {
      inspection: { required: true, completed: false, technicianId: tech.id, technicianName: tech.name, scheduledDate: new Date(Date.now() + 86400000).toISOString() }
    });
    setShowAssignSheet(false);
    flash("Technician assigned for inspection.");
  };

  const handleCompleteInspection = () => {
    advanceWarrantyWorkflow(warranty.id, "Inspection Completed", {
      inspection: { ...warranty.inspection!, completed: true, notes: "Asset is in good health." }
    });
    flash("Inspection completed. Ready for quotation.");
  };

  return (
    <MobileLayout backgroundColor={bg} bottomNav={<VendorBottomNavigation />}>
      {/* Header */}
      <div style={{ backgroundColor: card, borderBottom: `1px solid ${border}`, padding: "20px", position: "sticky", top: 0, zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "14px", fontWeight: 600, color: inkMut, fontFamily: inter }} onClick={() => navigate(-1)}>
            <ArrowLeft size={18} color={inkMut} /> Back
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: inkMut, fontFamily: inter, letterSpacing: "0.05em" }}>{warranty.id}</span>
              <div style={{ padding: "2px 8px", borderRadius: "100px", backgroundColor: s.bg, fontSize: "10px", fontWeight: 700, color: s.color, fontFamily: inter }}>{warranty.status}</div>
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 800, color: ink, letterSpacing: "-0.02em", fontFamily: inter, margin: 0 }}>{asset.name}</h1>
          </div>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={20} color={blue} />
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

        {/* AI Recommendation Panel */}
        {warranty.aiRecommendation && (
          <div style={{ backgroundColor: purpleT, borderRadius: "16px", padding: "16px", border: `1px solid ${purple}40`, marginBottom: "16px", display: "flex", gap: "10px" }}>
            <div style={{ marginTop: "2px" }}><AlertTriangle size={18} color={purple} /></div>
            <div>
              <h4 style={{ fontSize: "11px", fontWeight: 800, color: purple, margin: "0 0 4px", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Analysis</h4>
              <p style={{ fontSize: "13px", color: "#5B21B6", margin: 0, fontFamily: inter, lineHeight: 1.4, fontWeight: 500 }}>
                {warranty.aiRecommendation.text}
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Action Section based on FSM State */}
        <div style={{ backgroundColor: card, borderRadius: "16px", padding: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, marginBottom: "16px" }}>
          
          {/* Stage 1: New Request */}
          {warranty.status === "New Request" && (
            <>
              <h3 style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 12px" }}>Eligibility Verification</h3>
              <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: "0 0 16px", lineHeight: 1.4 }}>
                Review the asset's health and history to determine if it is eligible for a warranty extension without physical inspection.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <ActionButton onClick={handleApproveForQuotation} icon={ShieldCheck} label="Approve for Quotation" bgColor={blue} color="white" />
                <ActionButton onClick={handleRequireInspection} icon={Users} label="Require Physical Inspection" bgColor={amber} color="white" />
                <ActionButton onClick={handleRejectRequest} label="Reject Request" bgColor={redT} color={red} outline />
              </div>
            </>
          )}

          {/* Stage 3 (Conditional): Inspection */}
          {(warranty.status === "Inspection Required" || warranty.status === "Inspection Scheduled") && (
            <>
              <h3 style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 12px" }}>Physical Inspection</h3>
              {warranty.status === "Inspection Required" ? (
                <>
                  <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: "0 0 16px", lineHeight: 1.4 }}>
                    A physical inspection is required before a quotation can be generated. Assign a technician to proceed.
                  </p>
                  <ActionButton onClick={() => setShowAssignSheet(true)} icon={Users} label="Assign Technician" bgColor={blue} color="white" />
                </>
              ) : (
                <>
                  <div style={{ backgroundColor: bg, borderRadius: "10px", padding: "12px", border: `1px solid ${border}`, marginBottom: "16px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: inkMut, textTransform: "uppercase", margin: "0 0 4px", fontFamily: inter }}>Assigned Technician</p>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: ink, margin: 0, fontFamily: inter }}>{warranty.inspection?.technicianName}</p>
                  </div>
                  <ActionButton onClick={handleCompleteInspection} icon={CheckCircle2} label="Complete Inspection" bgColor={green} color="white" />
                </>
              )}
            </>
          )}

          {/* Stage 2 & 4: Quotation Builder */}
          {(warranty.status === "Under Review" || warranty.status === "Inspection Completed") && (
            <>
              <h3 style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 12px" }}>Quotation Builder</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: inkSec, fontFamily: inter, display: "block", marginBottom: "6px" }}>Extension Duration (Years)</label>
                  <input type="number" value={quoteYears} onChange={e => setQuoteYears(e.target.value)} style={{ width: "100%", height: "44px", borderRadius: "10px", border: `1px solid ${border}`, padding: "0 14px", fontSize: "14px", fontFamily: inter, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: inkSec, fontFamily: inter, display: "block", marginBottom: "6px" }}>Total Cost ($)</label>
                  <input type="number" value={quoteCost} onChange={e => setQuoteCost(e.target.value)} placeholder="e.g., 4500" style={{ width: "100%", height: "44px", borderRadius: "10px", border: `1px solid ${border}`, padding: "0 14px", fontSize: "14px", fontFamily: inter, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: inkSec, fontFamily: inter, display: "block", marginBottom: "6px" }}>Coverage Type</label>
                  <select value={quoteCoverage} onChange={e => setQuoteCoverage(e.target.value)} style={{ width: "100%", height: "44px", borderRadius: "10px", border: `1px solid ${border}`, padding: "0 14px", fontSize: "14px", fontFamily: inter, boxSizing: "border-box", backgroundColor: "white" }}>
                    <option value="Parts and Labor">Parts and Labor</option>
                    <option value="Parts Only">Parts Only</option>
                    <option value="Labor Only">Labor Only</option>
                    <option value="Comprehensive">Comprehensive (Includes PM)</option>
                  </select>
                </div>
              </div>
              <ActionButton onClick={handleGenerateQuote} icon={FileCheck} label="Generate Quotation" bgColor={blue} color="white" />
            </>
          )}

          {/* Stage 5: Quotation Sent / Customer Approval */}
          {(warranty.status === "Quotation Generated" || warranty.status === "Quotation Sent" || warranty.status === "Customer Approved") && warranty.quotation && (
            <>
              <h3 style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 12px" }}>Quotation Details</h3>
              <div style={{ backgroundColor: bg, borderRadius: "10px", padding: "12px", border: `1px solid ${border}`, marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", margin: "0 0 4px", fontFamily: inter }}>Duration</p>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>{warranty.quotation.durationYears} Year(s)</p>
                </div>
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", margin: "0 0 4px", fontFamily: inter }}>Cost</p>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: green, margin: 0, fontFamily: inter }}>${warranty.quotation.cost.toLocaleString()}</p>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: inkMut, textTransform: "uppercase", margin: "0 0 4px", fontFamily: inter }}>Coverage</p>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: ink, margin: 0, fontFamily: inter }}>{warranty.quotation.coverage}</p>
                </div>
              </div>

              {warranty.status === "Quotation Generated" && (
                <ActionButton onClick={handleSendQuote} icon={FileCheck} label="Send to Customer" bgColor={blue} color="white" />
              )}
              {warranty.status === "Quotation Sent" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ backgroundColor: amberT, borderRadius: "10px", padding: "12px", border: `1px solid ${amber}40`, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Clock size={16} color={amber} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: amber, fontFamily: inter }}>Waiting for customer approval...</span>
                  </div>
                  <ActionButton onClick={handleSimulateApproval} icon={CheckCircle2} label="Simulate Customer Approval" bgColor={green} color="white" />
                </div>
              )}
              {warranty.status === "Customer Approved" && (
                <ActionButton onClick={handleActivateContract} icon={ShieldCheck} label="Activate Warranty Contract" bgColor={blue} color="white" />
              )}
            </>
          )}

          {/* Stage 6: Activated */}
          {warranty.status === "Activated" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "28px", backgroundColor: greenT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <CheckCircle2 size={32} color={green} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 8px" }}>Contract Activated</h3>
              <p style={{ fontSize: "13px", color: inkSec, fontFamily: inter, margin: "0 0 16px", lineHeight: 1.4 }}>
                The warranty contract has been officially activated. The asset's expiry date has been updated across the system.
              </p>
              <div style={{ backgroundColor: bg, borderRadius: "10px", padding: "12px", border: `1px solid ${border}`, display: "inline-block" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: inkMut, textTransform: "uppercase", margin: "0 0 4px", fontFamily: inter }}>New Expiry Date</p>
                <p style={{ fontSize: "15px", fontWeight: 800, color: green, margin: 0, fontFamily: inter }}>{new Date(warranty.currentExpiryDate).toLocaleDateString()}</p>
              </div>
            </div>
          )}

        </div>

        {/* Timeline Component */}
        <div style={{ backgroundColor: card, borderRadius: "16px", padding: "16px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
          <h3 style={{ fontSize: "15px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 16px" }}>Request Timeline</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {warranty.timeline.map((event, index) => {
              const isLast = index === warranty.timeline.length - 1;
              const evtStyle = getStatusStyle(event.status);
              return (
                <div key={index} style={{ display: "flex", gap: "12px", position: "relative" }}>
                  {!isLast && <div style={{ position: "absolute", left: "11px", top: "24px", bottom: "-16px", width: "2px", backgroundColor: divider }} />}
                  <div style={{ width: "24px", height: "24px", borderRadius: "12px", backgroundColor: evtStyle.bg, border: `2px solid ${evtStyle.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "4px", backgroundColor: evtStyle.color }} />
                  </div>
                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : "4px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 4px", fontFamily: inter }}>{event.status}</p>
                    <p style={{ fontSize: "11px", color: inkMut, margin: 0, fontFamily: inter }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAssignSheet && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.65)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => setShowAssignSheet(false)}>
          <div style={{ backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "40px" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 16px", fontFamily: inter }}>Assign Technician</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {technicians.filter(t => t.availability === "available").map(t => (
                <div key={t.id} onClick={() => setSelectedTech(t.id)} style={{ padding: "12px", borderRadius: "10px", border: `2px solid ${selectedTech === t.id ? blue : border}`, backgroundColor: selectedTech === t.id ? blueTint : card, cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "16px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: inkMut, fontFamily: inter }}>{t.name.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: ink, margin: "0 0 2px", fontFamily: inter }}>{t.name}</p>
                    <p style={{ fontSize: "11px", color: inkMut, margin: 0, fontFamily: inter }}>{t.skills.join(", ")}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleAssignTech} disabled={!selectedTech} style={{ width: "100%", height: "44px", borderRadius: "10px", backgroundColor: selectedTech ? blue : divider, color: selectedTech ? "white" : inkMut, border: "none", fontSize: "14px", fontWeight: 700, fontFamily: inter, cursor: selectedTech ? "pointer" : "not-allowed" }}>
              Confirm Assignment
            </button>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
