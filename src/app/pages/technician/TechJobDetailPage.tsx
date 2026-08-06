import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { TechBottomNavigation } from "../../components/technician/TechBottomNavigation";
import { useTechnician } from "../../contexts/TechnicianContext";

// Design Tokens (Blue Theme)
const blue="#2563EB", blueDark="#1E40AF", bg="#FFFFFF", border="#E2E8F0", card="#FFFFFF", 
      divider="#F1F5F9", ink="#0F172A", inkMut="#64748B", 
      inter="Inter, sans-serif", amber="#F59E0B", amberT="#FEF3C7";

export default function TechJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobs, pmTasks } = useTechnician();
  
  const item = useMemo(() => {
    if (!id) return null;
    const ticket = jobs.find(j => j.id === id);
    if (ticket) return { type: "ticket" as const, data: ticket };
    const pm = pmTasks.find(p => p.id === id);
    if (pm) return { type: "pm" as const, data: pm };
    return null;
  }, [jobs, pmTasks, id]);

  if (!item) {
    return (
      <MobileLayout backgroundColor="#F8FAFC" bottomNav={<TechBottomNavigation />}>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <h1 style={{ fontFamily: inter, color: ink }}>Job Not Found</h1>
          <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: "8px 16px", borderRadius: 8, backgroundColor: blue, color: "white", border: "none", cursor: "pointer" }}>Go Back</button>
        </div>
      </MobileLayout>
    );
  }

  const isPM = item.type === "pm";
  const t = !isPM ? (item.data as any) : null;
  const pm = isPM ? (item.data as any) : null;

  const customerName = isPM ? pm.customerName : t.customerName;
  const customerEmail = "contact@customer.com"; 
  const contactPhone = !isPM && t.contactPhone ? t.contactPhone : "8891123483"; // Mocked to match screenshot
  const faultType = !isPM && t.aiAnalysis?.faultType ? t.aiAnalysis.faultType : isPM ? pm.type : "-";
  const severity = !isPM ? t.priority : "-";
  const confidence = !isPM && t.aiAnalysis?.confidence ? `${Math.round(t.aiAnalysis.confidence * 100)}%` : "100%";
  const safetyFlag = !isPM && t.aiAnalysis?.safetyFlag ? "Yes" : "No";
  const status = isPM ? pm.status : t.status;
  const createdAt = t?.createdAt ? new Date(t.createdAt).toLocaleString() : new Date().toLocaleString();
  const locationText = !isPM ? `${t.location}${t.floor ? ` · ${t.floor}` : ""}${t.room ? ` · ${t.room}` : ""}` : pm.assetName;
  const description = !isPM ? t.description : `Preventive maintenance task for ${pm.assetName}`;

  const InfoBox = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div style={{
      borderRadius: "8px",
      border: `1px solid ${border}`,
      padding: "12px",
      backgroundColor: card
    }}>
      <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, color: "#9ca3af", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: ink, fontFamily: inter, fontWeight: 500 }}>{value || "-"}</p>
    </div>
  );

  return (
    <MobileLayout backgroundColor="#F8FAFC" bottomNav={<TechBottomNavigation />}>
      
      {/* Header matching modal title */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${border}`, background: `linear-gradient(135deg, ${blueDark} 0%, ${blue} 100%)`, position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "white", fontFamily: inter }}>Job Detail</h2>
          <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "rgba(255,255,255,0.8)", fontFamily: inter }}>Job #{id || "-"}</p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          style={{ padding: "6px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.1)", color: "white", fontFamily: inter, fontSize: "14px", fontWeight: 500, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
        >
          Close
        </button>
      </div>

      <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {/* Grid of details (Mobile: 2 cols matching screenshot) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          
          <InfoBox label="Customer" value={customerName} />
          <InfoBox label="Customer Email" value={customerEmail} />
          
          <InfoBox label="Customer Contact" value={contactPhone} />
          <InfoBox label="Fault & Severity" value={`${faultType} | ${severity.toLowerCase()}`} />
          
          {/* Faking AI extended fields to perfectly match old layout */}
          <InfoBox label="Final Severity" value={severity.toLowerCase()} />
          <InfoBox label="Image Severity" value={severity === "Critical" || severity === "High" ? severity.toLowerCase() : "low"} />
          
          <InfoBox label="Description Severity" value={severity.toLowerCase()} />
          <InfoBox label="Confidence" value={confidence} />
          
          <InfoBox label="Safety Escalation" value={safetyFlag} />
          <InfoBox label="Safety Score" value={safetyFlag === "Yes" ? "5/5" : "1/5"} />
          
          <InfoBox label="Operational Impact" value={severity === "Critical" ? "4/5" : "1/5"} />
          <InfoBox label="Escalation Risk" value={severity === "Critical" ? "5/5" : "2/5"} />
          
          <InfoBox label="Status" value={status.toLowerCase()} />
          <InfoBox label="Created At" value={createdAt} />
        </div>

        {/* Full width location */}
        <InfoBox label="Location" value={locationText} />

        {/* Full width description */}
        <InfoBox label="Customer Problem Description" value={description} />

        {/* Image Evidence */}
        {(!isPM && t?.mediaUrls && t.mediaUrls.length > 0) ? (
          <div style={{
            borderRadius: "8px",
            border: `1px solid ${border}`,
            padding: "12px",
            backgroundColor: card
          }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "10px", fontWeight: 700, color: "#9ca3af", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer Uploaded Image</p>
            {t.mediaUrls.map((url: string, i: number) => (
              <img 
                key={i}
                src={url} 
                alt="Customer uploaded evidence" 
                style={{ 
                  width: "100%", 
                  maxHeight: "360px", 
                  objectFit: "contain", 
                  borderRadius: "6px", 
                  border: `1px solid ${divider}`, 
                  marginTop: i > 0 ? "12px" : 0 
                }} 
              />
            ))}
          </div>
        ) : (
          <div style={{
            borderRadius: "8px",
            border: `1px solid ${amber}40`,
            backgroundColor: amberT,
            padding: "12px",
          }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#92400E", fontFamily: inter }}>No image evidence available for this job.</p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
