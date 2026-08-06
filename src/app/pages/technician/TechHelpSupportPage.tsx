import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { 
  MessageSquare, Mail, Phone, FileText, 
  ChevronDown, ChevronUp, BookOpen, Clock, AlertCircle, Info
} from "lucide-react";

const blue = "#2563EB";
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
  { q: "How are jobs assigned to me?", a: "Jobs are dispatched dynamically based on your real-time location, primary skills, and current workload. High-priority tickets may be assigned automatically by the AI system." },
  { q: "What should I do if a job takes longer than expected?", a: "Update your status in the app and communicate with the dispatcher. The system will automatically recalculate SLAs and potentially re-route your next assignments." },
  { q: "How do I request specific parts for a repair?", a: "In the active job details, navigate to the 'Materials' section and submit a parts request. You will be notified when the parts are available for pickup at the nearest depot." },
  { q: "What happens if I miss an SLA deadline?", a: "The AI system proactively flags at-risk jobs. If an SLA is breached, it impacts your performance metrics, but you can always add exception notes in the service report to explain unavoidable delays." }
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

export default function TechHelpSupportPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<"chat" | "issue" | "email" | "phone" | null>(null);

  const renderModal = () => {
    if (!activeModal) return null;

    let content = null;
    let title = "";

    if (activeModal === "chat") {
      title = "Live Chat with Dispatcher";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "16px", backgroundColor: divider, borderRadius: "12px", fontSize: "13px", color: inkSec, fontFamily: inter, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, color: ink, display: "block", marginBottom: "4px" }}>Dispatcher (Sarah)</span>
            Hello! I see you are currently on-route to Ticket #TKT-003. How can I assist you today?
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <input type="text" placeholder="Type your message..." style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, fontSize: "14px", outline: "none", fontFamily: inter }} />
            <button onClick={() => setActiveModal(null)} style={{ padding: "0 20px", backgroundColor: blue, color: "white", borderRadius: "10px", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>Send</button>
          </div>
        </div>
      );
    } else if (activeModal === "issue") {
      title = "Report Technical Issue";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input type="text" placeholder="Issue Subject (e.g. Sync failed)" style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, fontSize: "14px", outline: "none", fontFamily: inter }} />
          <textarea rows={4} placeholder="Describe the issue you are experiencing..." style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, fontSize: "14px", outline: "none", fontFamily: inter, resize: "none" }} />
          <button onClick={() => setActiveModal(null)} style={{ width: "100%", padding: "14px", backgroundColor: "#9333EA", color: "white", borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "15px", cursor: "pointer", marginTop: "8px" }}>Submit Report</button>
        </div>
      );
    } else if (activeModal === "email") {
      title = "Email IT Support";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "28px", backgroundColor: "#D9770615", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
            <Mail size={24} color="#D97706" />
          </div>
          <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: 0, lineHeight: 1.5 }}>
            You will be redirected to your default email client to send a message to: <strong style={{ color: ink }}>it.support@10xds.com</strong>
          </p>
          <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "16px" }}>
            <button onClick={() => setActiveModal(null)} style={{ flex: 1, padding: "14px", backgroundColor: divider, color: ink, borderRadius: "10px", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            <button onClick={() => setActiveModal(null)} style={{ flex: 1, padding: "14px", backgroundColor: "#D97706", color: "white", borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>Open Mail</button>
          </div>
        </div>
      );
    } else if (activeModal === "phone") {
      title = "Emergency Hotline";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "28px", backgroundColor: "#16A34A15", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
            <Phone size={24} color="#16A34A" />
          </div>
          <p style={{ fontSize: "14px", color: inkSec, fontFamily: inter, margin: 0, lineHeight: 1.5 }}>
            Call the 24/7 dispatcher hotline at <br/><strong style={{ color: ink, fontSize: "16px" }}>+971 800 10XDS</strong>
          </p>
          <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "16px" }}>
            <button onClick={() => setActiveModal(null)} style={{ flex: 1, padding: "14px", backgroundColor: divider, color: ink, borderRadius: "10px", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            <button onClick={() => setActiveModal(null)} style={{ flex: 1, padding: "14px", backgroundColor: "#16A34A", color: "white", borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>Call Now</button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", animation: "fadeIn 0.3s" }} onClick={() => setActiveModal(null)} />
        <div style={{ position: "relative", backgroundColor: card, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px 32px", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: "0 -10px 40px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", maxHeight: "85%", overflowY: "auto" }}>
          <div style={{ width: "40px", height: "4px", backgroundColor: border, borderRadius: "2px", margin: "0 auto 20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
          </div>
          <div>{content}</div>
        </div>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        `}</style>
      </div>
    );
  };

  return (
    <MobileLayout backgroundColor={bg} showBottomNav={false}>
      <BackHeader title="Help & Support" fallbackRoute="/tech/profile" />

      <div style={{ padding: "20px 16px 40px" }}>
        
        {/* Contact Support */}
        <SupportSection title="Contact Support">
          <ActionRow icon={MessageSquare} title="Live Chat with Dispatcher" subtitle="Typical reply under 1 min" onClick={() => setActiveModal("chat")} />
          <ActionRow icon={FileText} title="Report Technical Issue" subtitle="App bugs or sync issues" color="#9333EA" onClick={() => setActiveModal("issue")} />
          <ActionRow icon={Mail} title="Email IT Support" subtitle="it.support@10xds.com" color="#D97706" onClick={() => setActiveModal("email")} />
          <ActionRow icon={Phone} title="Emergency Hotline" subtitle="+971 800 10XDS (24/7)" color="#16A34A" isLast={true} onClick={() => setActiveModal("phone")} />
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
                    <span style={{ fontSize: "14px", fontWeight: 600, color: ink, fontFamily: inter, lineHeight: 1.4, flex: 1 }}>
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
      
      {/* Interactive Modal */}
      {renderModal()}
    </MobileLayout>
  );
}
