import React, { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { useVendor } from "../../contexts/VendorContext";
import { Paperclip, Check, ChevronRight } from "lucide-react";

const blue = "#2563EB";
const green = "#16A34A";
const ink = "#0F172A";
const inkSec = "#475569";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

const SelectField = ({ label, value, onChange, options }: any) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </label>
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "14px 40px 14px 16px",
          backgroundColor: card,
          border: `1px solid ${border}`,
          borderRadius: "12px",
          fontSize: "15px", fontWeight: 500, color: ink,
          fontFamily: inter, outline: "none", appearance: "none"
        }}
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronRight size={16} color={inkSec} style={{ position: "absolute", right: "16px", top: "16px", pointerEvents: "none", transform: "rotate(90deg)" }} />
    </div>
  </div>
);

export default function VendorCreateTicket() {
  const navigate = useNavigate();
  const { createSupportTicket, supportTickets } = useVendor();

  const [category, setCategory] = useState("Technical Issue");
  const [priority, setPriority] = useState("Medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    
    // Simulate network delay
    setTimeout(() => {
      createSupportTicket({
        category,
        priority,
        subject,
        description
      });
      
      setIsSubmitting(false);
      setSuccess(true);
      
      // Auto-return after showing success message
      setTimeout(() => {
        navigate("/vendor/settings/help");
      }, 2000);
    }, 1500);
  };



  return (
    <MobileLayout backgroundColor={bg} showBottomNav={false}>
      <BackHeader title="Create Support Request" fallbackRoute="/vendor/settings/help" />

      <div style={{ padding: "20px 16px 40px" }}>
        
        {success ? (
          <div style={{ backgroundColor: card, borderRadius: "20px", padding: "40px 20px", boxShadow: cardShadow, border: `1px solid ${border}`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "32px", backgroundColor: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <Check size={32} color={green} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: ink, margin: "0 0 8px", fontFamily: inter }}>Request Submitted!</h3>
            <p style={{ fontSize: "14.5px", color: inkSec, fontFamily: inter, lineHeight: 1.5, margin: 0 }}>
              Your support ticket has been created successfully. Our team will get back to you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ backgroundColor: card, borderRadius: "20px", padding: "20px", boxShadow: cardShadow, border: `1px solid ${border}` }}>
            
            <SelectField 
              label="Issue Category" 
              value={category} 
              onChange={setCategory} 
              options={["Technical Issue", "Billing & Payments", "Account Management", "SLA Dispute", "Other"]} 
            />

            <SelectField 
              label="Priority Level" 
              value={priority} 
              onChange={setPriority} 
              options={["Low", "Medium", "High", "Critical"]} 
            />

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                style={{
                  width: "100%", padding: "14px 16px",
                  backgroundColor: card, border: `1px solid ${border}`, borderRadius: "12px",
                  fontSize: "15px", fontWeight: 500, color: ink, fontFamily: inter, outline: "none"
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Provide detailed information to help us resolve this quickly..."
                rows={5}
                style={{
                  width: "100%", padding: "14px 16px",
                  backgroundColor: card, border: `1px solid ${border}`, borderRadius: "12px",
                  fontSize: "15px", fontWeight: 500, color: ink, fontFamily: inter, outline: "none",
                  resize: "vertical", minHeight: "120px"
                }}
              />
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setAttachedFile(e.target.files[0]);
                }
              }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", 
                  color: blue, fontSize: "14px", fontWeight: 600, fontFamily: inter, cursor: "pointer", padding: 0
                }}>
                <Paperclip size={16} /> Attach Files or Screenshots
              </button>
              
              {attachedFile && (
                <div style={{ fontSize: "12px", color: inkSec, fontFamily: inter, display: "flex", alignItems: "center", gap: "6px", backgroundColor: divider, padding: "4px 8px", borderRadius: "8px" }}>
                  <Check size={14} color={green} /> {attachedFile.name.length > 15 ? attachedFile.name.substring(0, 15) + "..." : attachedFile.name}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || !subject.trim() || !description.trim()}
              style={{ 
                width: "100%", padding: "16px",
                backgroundColor: blue, color: card, border: "none", borderRadius: "14px", 
                fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer", 
                display: "flex", alignItems: "center", justifyContent: "center", opacity: (isSubmitting || !subject.trim() || !description.trim()) ? 0.7 : 1 
              }}
            >
              {isSubmitting ? "Submitting Request..." : "Submit Ticket"}
            </button>
          </form>
        )}

        {/* Existing Tickets list below the form */}
        {supportTickets && supportTickets.length > 0 && !success && (
          <div style={{ marginTop: "32px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "16px" }}>Recent Requests</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {supportTickets.map(ticket => (
                <div key={ticket.id} style={{ backgroundColor: card, borderRadius: "16px", padding: "16px", border: `1px solid ${border}`, boxShadow: cardShadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: blue, fontFamily: inter }}>{ticket.id}</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: ticket.status === "Closed" ? inkSec : green, backgroundColor: ticket.status === "Closed" ? "#F1F5F9" : "#F0FDF4", padding: "2px 8px", borderRadius: "100px", textTransform: "uppercase", fontFamily: inter }}>{ticket.status}</span>
                  </div>
                  <div style={{ fontSize: "14.5px", fontWeight: 600, color: ink, fontFamily: inter, marginBottom: "4px" }}>{ticket.subject}</div>
                  <div style={{ fontSize: "12px", color: inkSec, fontFamily: inter }}>{new Date(ticket.timestamp).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </MobileLayout>
  );
}
