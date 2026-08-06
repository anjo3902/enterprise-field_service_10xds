import React, { useState, useEffect, useRef } from "react";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { Send, User, Bot, HelpCircle } from "lucide-react";

const blue = "#2563EB";
const blueTint = "#EFF6FF";
const ink = "#0F172A";
const inkSec = "#475569";
const inkMut = "#64748B";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

type Message = {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
};

export default function VendorLiveChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: "Hello! Welcome to 10xDS Vendor Support. How can I assist you today?", sender: "bot", timestamp: new Date(Date.now() - 60000).toISOString() }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickReplies = [
    "How to assign a technician?",
    "Check SLA status",
    "AMC Renewal Process",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text, sender: "user", timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      let reply = "I understand. I'm connecting you to a human support agent who can help with that. Please hold on.";
      
      if (text.toLowerCase().includes("technician")) {
        reply = "To assign a technician, go to the Tickets tab, select an approved ticket, and tap 'Assign Technician'. You can see your available technicians there.";
      } else if (text.toLowerCase().includes("sla")) {
        reply = "You can view your real-time SLA compliance on your Dashboard. If a ticket is at risk, it will be flagged with a warning indicator.";
      } else if (text.toLowerCase().includes("amc")) {
        reply = "AMC renewals will show up as Business Priority notifications 30 days before they expire. You can renew them in the Assets module.";
      }

      const botMsg: Message = { id: (Date.now() + 1).toString(), text: reply, sender: "bot", timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <MobileLayout backgroundColor={bg} showBottomNav={false} scrollContainerStyle={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <BackHeader title="Live Chat Support" fallbackRoute="/vendor/settings/help" />

      {/* Chat History */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {messages.map(msg => {
          const isUser = msg.sender === "user";
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-end", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "14px", backgroundColor: isUser ? "#F1F5F9" : blueTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {isUser ? <User size={14} color={inkSec} /> : <Bot size={14} color={blue} />}
              </div>
              <div style={{
                maxWidth: "75%", padding: "12px 16px",
                backgroundColor: isUser ? blue : card,
                color: isUser ? card : ink,
                borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                border: isUser ? "none" : `1px solid ${border}`,
                boxShadow: isUser ? "0 4px 12px rgba(37,99,235,0.2)" : cardShadow,
                fontSize: "14.5px", fontFamily: inter, lineHeight: 1.4
              }}>
                {msg.text}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "14px", backgroundColor: blueTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bot size={14} color={blue} />
            </div>
            <div style={{
              padding: "12px 16px", backgroundColor: card, borderRadius: "16px 16px 16px 4px", border: `1px solid ${border}`,
              display: "flex", gap: "4px"
            }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: inkMut, animation: "pulse 1.5s infinite" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: inkMut, animation: "pulse 1.5s infinite 0.2s" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: inkMut, animation: "pulse 1.5s infinite 0.4s" }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick Replies */}
      {messages.length === 1 && !isTyping && (
        <div style={{ padding: "0 16px 12px", display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none" }}>
          {quickReplies.map(qr => (
            <button key={qr} type="button" onClick={() => handleSend(qr)} style={{
              flexShrink: 0, padding: "8px 16px", backgroundColor: card, border: `1px solid ${blue}40`, borderRadius: "100px",
              color: blue, fontSize: "13px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px"
            }}>
              <HelpCircle size={14} /> {qr}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div style={{ padding: "12px 16px", backgroundColor: card, borderTop: `1px solid ${divider}` }}>
        <form 
          onSubmit={e => { e.preventDefault(); handleSend(input); }} 
          style={{ display: "flex", gap: "8px", alignItems: "center" }}
        >
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{
              flex: 1, padding: "14px 16px", backgroundColor: "#F8FAFC", border: `1px solid ${border}`,
              borderRadius: "24px", fontSize: "14.5px", fontFamily: inter, outline: "none",
              color: ink
            }}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            style={{
              width: "48px", height: "48px", borderRadius: "24px", backgroundColor: input.trim() ? blue : "#E2E8F0",
              color: card, border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() ? "pointer" : "default", flexShrink: 0, transition: "background-color 0.2s"
            }}
          >
            <Send size={18} style={{ marginLeft: "2px" }} />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </MobileLayout>
  );
}
