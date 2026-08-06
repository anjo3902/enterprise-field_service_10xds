import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import { ArrowLeft, Send, User } from "lucide-react";

const blue = "#2563EB";
const blueMid = "#3B82F6";
const ink = "#0F172A";
const inkMut = "#64748B";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";

const inter = "'Inter', 'Roboto', sans-serif";

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
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <User size={20} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "white", letterSpacing: "-0.01em", fontFamily: inter, margin: 0 }}>Live Support</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: "#10B981" }} />
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontFamily: inter }}>Agent is online</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveChatScreen() {
  const [messages, setMessages] = useState([
    { text: "Hello! Welcome to 10xDS Support. How can I help you today?", isUser: false, time: "9:42 AM" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { text: input, isUser: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setInput("");

    // Simulate agent reply
    setTimeout(() => {
      setMessages(prev => [...prev, { text: "Thank you for reaching out. Let me check that for you.", isUser: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }, 1500);
  };

  return (
    <MobileLayout header={<><StatusBar /><PageHeader /></>} showBottomNav={false}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: bg }}>
        
        <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ textAlign: "center", fontSize: "12px", color: inkMut, fontFamily: inter, marginBottom: "8px" }}>Today</div>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.isUser ? "flex-end" : "flex-start" }}>
              <div style={{ 
                maxWidth: "75%", 
                padding: "12px 16px", 
                borderRadius: "16px", 
                backgroundColor: msg.isUser ? blue : card,
                color: msg.isUser ? "white" : ink,
                border: msg.isUser ? "none" : `1px solid ${border}`,
                boxShadow: msg.isUser ? "0 4px 12px rgba(37,99,235,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
                borderBottomRightRadius: msg.isUser ? "4px" : "16px",
                borderBottomLeftRadius: msg.isUser ? "16px" : "4px"
              }}>
                <p style={{ margin: 0, fontSize: "14px", fontFamily: inter, lineHeight: 1.4 }}>{msg.text}</p>
                <div style={{ fontSize: "11px", color: msg.isUser ? "rgba(255,255,255,0.7)" : inkMut, textAlign: "right", marginTop: "4px" }}>{msg.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 20px 24px", backgroundColor: card, borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", gap: "12px" }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            style={{ flex: 1, height: "48px", borderRadius: "24px", backgroundColor: bg, border: `1px solid ${border}`, padding: "0 20px", fontSize: "14px", color: ink, fontFamily: inter, outline: "none" }}
          />
          <button 
            onClick={handleSend}
            style={{ width: "48px", height: "48px", borderRadius: "24px", backgroundColor: blue, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Send size={20} color="white" />
          </button>
        </div>

      </div>
    </MobileLayout>
  );
}
