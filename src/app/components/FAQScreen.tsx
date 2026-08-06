import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

const blue = "#2563EB";
const blueMid = "#3B82F6";
const ink = "#0F172A";
const inkMut = "#64748B";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";

const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0 }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3, 5, 7, 9].map((h, i) => <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white", opacity: i < 4 ? 1 : 0.4 }} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <div style={{ width: "22px", height: "11px", borderRadius: "2px", border: "1.5px solid white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, right: "3px", backgroundColor: "white", borderRadius: "1px" }} />
          </div>
          <div style={{ width: "2px", height: "5px", borderRadius: "1px", backgroundColor: "white" }} />
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  const navigate = useNavigate();
  return (
    <div style={{ background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <button
          type="button"
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter }}
          onClick={() => handleBackNavigation(navigate, '/settings')}
        >
          <ArrowLeft size={15} color="white" /> Back
        </button>
      </div>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, marginBottom: "4px" }}>FAQ</h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>Frequently Asked Questions</p>
      </div>
    </div>
  );
}

const faqs = [
  { question: "How do I reset my password?", answer: "To reset your password, go to Settings > Security > Change Password and follow the instructions." },
  { question: "How can I contact support?", answer: "You can reach out to our support team via Live Chat or by submitting a ticket in Settings > Support." },
  { question: "How do I generate a report?", answer: "Navigate to the Reports screen from the Dashboard and select 'Generate Report'. Choose your category and export format." },
  { question: "Where can I find my assigned tickets?", answer: "All assigned tickets are available in the 'My Tickets' section located in the main navigation menu." },
  { question: "Can I use the app offline?", answer: "Basic reading functions are cached for offline use, but creating new tickets or generating reports requires an active internet connection." }
];

export default function FAQScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <MobileLayout header={<><StatusBar /><PageHeader /></>} showBottomNav={false}>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, overflow: "hidden" }}>
              <button 
                type="button" 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, paddingRight: "16px" }}>{faq.question}</span>
                {openIndex === i ? <ChevronUp size={20} color={inkMut} /> : <ChevronDown size={20} color={inkMut} />}
              </button>
              {openIndex === i && (
                <div style={{ padding: "0 16px 16px 16px" }}>
                  <p style={{ fontSize: "14px", color: inkMut, fontFamily: inter, lineHeight: 1.5, margin: 0 }}>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
