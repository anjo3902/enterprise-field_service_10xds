import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { 
  MessageSquare, Mail, Phone, FileText, 
  ChevronDown, ChevronUp, BookOpen, Clock, AlertCircle, Info, Bug, Star
} from "lucide-react";

const blue = "#2563EB";
const blueTint = "#EFF6FF";
const green = "#16A34A";
const greenTint = "#F0FDF4";
const ink = "#0F172A";
const inkSec = "#475569";
const inkFaint = "#94A3B8";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

const faqs = [
  { q: "How does ticket assignment work?", a: "Tickets are automatically routed to vendors based on their service region, category matches, and current SLA performance. You can review pending tickets in the 'Awaiting Review' queue and either approve or reject them within 4 hours." },
  { q: "How is SLA calculated?", a: "SLA compliance is measured by the percentage of tickets resolved within the contracted resolution time (e.g., 24 hours for High priority). The AI Assistant actively monitors tickets and flags those at risk." },
  { q: "How does technician assignment work?", a: "Once a ticket is approved, you can assign it to an available technician from your pool. Technicians receive real-time notifications on their device and can log their start/end times directly via the app." },
  { q: "How do AMC renewals work?", a: "The system tracks all assets under your Annual Maintenance Contracts. Notifications are sent 30 days prior to expiry, allowing you to proactively reach out to customers for renewal negotiations." }
];

const SupportSection = ({ title, children }: any) => (
  <div style={{ marginBottom: "24px" }}>
    <h3 style={{ fontSize: "13px", fontWeight: 700, color: inkFaint, fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 16px" }}>
      {title}
    </h3>
    <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, overflow: "hidden", boxShadow: cardShadow }}>
      {children}
    </div>
  </div>
);

const ActionRow = ({ icon: Icon, title, subtitle, onClick, color = blue, isLast = false }: any) => (
  <div onClick={onClick} style={{ display: "flex", alignItems: "center", padding: "16px", borderBottom: isLast ? "none" : `1px solid ${divider}`, cursor: "pointer" }}>
    <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px", flexShrink: 0 }}>
      <Icon size={18} color={color} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: "15px", fontWeight: 600, color: ink, fontFamily: inter }}>{title}</div>
      {subtitle && <div style={{ fontSize: "13px", color: inkSec, fontFamily: inter, marginTop: "2px" }}>{subtitle}</div>}
    </div>
  </div>
);

export default function VendorHelpSupport() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);



  return (
    <MobileLayout backgroundColor={bg} showBottomNav={false}>
      <BackHeader title="Help & Support" fallbackRoute="/vendor/settings" />

      <div style={{ padding: "20px 16px 40px" }}>
        
        {/* Contact Support */}
        <SupportSection title="Contact Support">
          <ActionRow icon={MessageSquare} title="Live Chat" subtitle="Typical reply under 2 mins" onClick={() => navigate("/vendor/settings/chat")} />
          <ActionRow icon={FileText} title="Create Support Ticket" subtitle="For complex inquiries" color="#9333EA" onClick={() => navigate("/vendor/settings/ticket")} />
          <ActionRow icon={Mail} title="Email Support" subtitle="support@10xds.com" color="#D97706" onClick={() => {}} />
          <ActionRow icon={Phone} title="Call Support" subtitle="+971 800 10XDS (Available 24/7)" color="#16A34A" isLast={true} onClick={() => {}} />
        </SupportSection>

        {/* Knowledge Base */}
        <SupportSection title="Knowledge Base (FAQ)">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} style={{ borderBottom: idx === faqs.length - 1 ? "none" : `1px solid ${divider}` }}>
                <div 
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <BookOpen size={16} color={inkSec} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: ink, fontFamily: inter, lineHeight: 1.4 }}>
                      {faq.q}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp size={20} color={inkSec} style={{ flexShrink: 0 }} /> : <ChevronDown size={20} color={inkSec} style={{ flexShrink: 0 }} />}
                </div>
                {isOpen && (
                  <div style={{ padding: "0 16px 16px 60px", fontSize: "13.5px", color: inkSec, fontFamily: inter, lineHeight: 1.5 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </SupportSection>

        {/* Technical Info */}
        <SupportSection title="Technical Information">
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", color: inkSec, fontFamily: inter, display: "flex", alignItems: "center", gap: "8px" }}>
                <Info size={16} /> Application Version
              </span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: ink, fontFamily: inter }}>v2.4.1</span>
            </div>
            <div style={{ height: "1px", backgroundColor: divider }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", color: inkSec, fontFamily: inter, display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} /> Build Number
              </span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: ink, fontFamily: inter }}>#89240</span>
            </div>
            <div style={{ height: "1px", backgroundColor: divider }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", color: inkSec, fontFamily: inter, display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={16} /> Last Update
              </span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: ink, fontFamily: inter }}>Yesterday, 02:00 AM</span>
            </div>
          </div>
        </SupportSection>



      </div>
    </MobileLayout>
  );
}
