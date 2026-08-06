import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { BottomNavigation } from "./ui/BottomNavigation";
import { MobileLayout } from "./ui/MobileLayout";
import { handleBackNavigation } from "../utils/navigation";
import {
  ArrowLeft, Search, Bot, Sparkles, TrendingUp,
  Cpu, Database, Shield, BarChart3, Paperclip, Mic, Send, ChevronRight, X
} from "lucide-react";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueDark = "#1D4ED8";
const blueMid  = "#3B82F6";
const blueTint = "#EFF6FF";

const green    = "#16A34A";
const greenT   = "#DCFCE7";
const orange   = "#EA580C";
const orangeT  = "#FFF7ED";
const purple   = "#7C3AED";
const purpleT  = "#F5F3FF";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";

const ink      = "#0F172A";
const inkB     = "#1E293B";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const inkFaint = "#94A3B8";

const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";

const inter    = "'Inter', 'Roboto', sans-serif";

const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 20px 6px", backgroundColor: "#0052CC", flexShrink: 0
    }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "white", fontFamily: inter }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
          {[3, 5, 7, 9].map((h, i) => (
            <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "1px", backgroundColor: "white", opacity: i < 4 ? 1 : 0.4 }} />
          ))}
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

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader() {
  const navigate = useNavigate();
  return (
    <div style={{ background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "10px 20px 18px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <button
          type="button"
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer",
            fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter
          }}
          onClick={() => handleBackNavigation(navigate, '/dashboard')}
        >
          <ArrowLeft size={15} color="white" /> Back
        </button>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" style={{
            width: "32px", height: "32px", borderRadius: "10px",
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
          }}>
            <Search size={15} color="white" />
          </button>
        </div>
      </div>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: inter, marginBottom: "4px" }}>
          AI Assistant
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: inter }}>
          10xDS Intelligence
        </p>
      </div>
    </div>
  );
}

// ─── Quick AI Actions ─────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "Diagnose Machine", icon: Cpu, color: purple, tint: purpleT },
  { label: "Asset Lookup", icon: Database, color: blue, tint: blueTint },
  { label: "Analyze SLA Risk", icon: Shield, color: red, tint: redT },
  { label: "Revenue Options", icon: TrendingUp, color: green, tint: greenT },
];

function QuickActionPills() {
  return (
    <div style={{
      display: "flex", gap: "12px", overflowX: "auto", padding: "16px 20px",
      scrollbarWidth: "none", msOverflowStyle: "none"
    }}>
      {QUICK_ACTIONS.map((action, idx) => (
        <button key={idx} type="button" style={{
          display: "flex", alignItems: "center", gap: "8px",
          backgroundColor: card, border: `1px solid ${border}`,
          borderRadius: "100px", padding: "8px 14px 8px 8px", flexShrink: 0,
          boxShadow: "0 2px 6px rgba(0,0,0,0.03)", cursor: "pointer"
        }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%",
            backgroundColor: action.tint, display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <action.icon size={14} color={action.color} />
          </div>
          <span style={{ fontSize: "12.5px", fontWeight: 600, color: ink, fontFamily: inter }}>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Suggested Prompts ────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  "Show unhealthy machines",
  "Predict next asset failure",
  "Which SLA is at risk?",
  "Generate executive summary"
];

function SuggestedPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div style={{ padding: "0", marginBottom: "16px" }}>
      <p style={{ fontSize: "12px", fontWeight: 700, color: inkMut, fontFamily: inter, marginBottom: "12px" }}>
        Suggested Prompts
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button key={idx} type="button" onClick={() => onSelect(prompt)} style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            backgroundColor: divider, border: `1px solid ${border}`,
            borderRadius: "100px", padding: "8px 14px", cursor: "pointer",
            transition: "all 0.2s"
          }}>
            <Sparkles size={12} color={blue} />
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: ink, fontFamily: inter }}>{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AIContextCard({ title, subtitle, icon: Icon, color, tint, health, risk, confidence, recommendedAction, actions }: any) {
  return (
    <div style={{
      backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`,
      boxShadow: cardShadow, padding: "16px", marginTop: "12px", width: "100%", boxSizing: "border-box"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "12px", backgroundColor: tint,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: ink, fontFamily: inter, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
          <p style={{ fontSize: "12px", color: inkMut, fontFamily: inter, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</p>
        </div>
      </div>
      
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {health && (
          <div style={{ backgroundColor: divider, borderRadius: "8px", padding: "6px 10px", flex: 1, minWidth: "70px" }}>
            <p style={{ fontSize: "10px", color: inkMut, fontFamily: inter, marginBottom: "2px" }}>Health</p>
            <p style={{ fontSize: "13px", fontWeight: 700, color: ink, fontFamily: inter }}>{health}</p>
          </div>
        )}
        {risk && (
          <div style={{ backgroundColor: risk === "High" ? redT : (risk === "Medium" ? amberT : greenT), borderRadius: "8px", padding: "6px 10px", flex: 1, minWidth: "70px" }}>
            <p style={{ fontSize: "10px", color: risk === "High" ? red : (risk === "Medium" ? amber : green), fontFamily: inter, marginBottom: "2px" }}>Risk</p>
            <p style={{ fontSize: "13px", fontWeight: 700, color: risk === "High" ? red : (risk === "Medium" ? amber : green), fontFamily: inter }}>{risk}</p>
          </div>
        )}
        {confidence && (
          <div style={{ backgroundColor: blueTint, borderRadius: "8px", padding: "6px 10px", flex: 1, minWidth: "70px" }}>
            <p style={{ fontSize: "10px", color: blue, fontFamily: inter, marginBottom: "2px" }}>Confidence</p>
            <p style={{ fontSize: "13px", fontWeight: 700, color: blue, fontFamily: inter }}>{confidence}</p>
          </div>
        )}
      </div>

      {recommendedAction && (
        <div style={{ marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${border}` }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: inkSec, fontFamily: inter, marginBottom: "4px" }}>Recommended Action</p>
          <p style={{ fontSize: "13px", color: ink, fontFamily: inter, lineHeight: 1.4 }}>{recommendedAction}</p>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {actions.map((act: string, idx: number) => (
            <button key={idx} type="button" style={{
              backgroundColor: idx === 0 ? blue : "transparent",
              color: idx === 0 ? "white" : blue,
              border: `1px solid ${blue}`,
              borderRadius: "100px", padding: "6px 12px",
              fontSize: "12px", fontWeight: 600, fontFamily: inter,
              cursor: "pointer", transition: "all 0.2s"
            }}>
              {act}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<any[]>([
    {
      id: 1, sender: "ai", text: "Hello! I'm your Enterprise AI Assistant.\n\nI can help manage assets, troubleshoot equipment, analyze reports, monitor SLA risks, recommend revenue opportunities, and answer operational questions.",
      time: "Just now"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const [audioAttachment, setAudioAttachment] = useState<{url: string, name: string} | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim() && !imageAttachment && !audioAttachment) return;
    setMessages(prev => [...prev, { id: Date.now(), sender: "user", text, time: "Now", image: imageAttachment, audio: audioAttachment }]);
    setInput("");
    setImageAttachment(null);
    setAudioAttachment(null);
    setIsTyping(true);
    if (isRecording) toggleRecording();
    
    // Simulate AI response based on mock flow
    setTimeout(() => {
      let aiResponseText = "I've analyzed the system data.";
      let contextData = null;

      if (text.toLowerCase().includes("sla")) {
        aiResponseText = "AI predicts 3 requests will breach SLA in 30 minutes based on technician location, workload, and traffic. I recommend auto-assigning SR-10429 to the nearest available team.";
        contextData = { title: "SLA Risk High", subtitle: "3 requests nearing breach", risk: "High", confidence: "89%", recommendedAction: "Auto-assign SR-10429 to nearest team", actions: ["Assign Ticket", "View SLA Map"], icon: Shield, color: red, tint: redT };
      } else if (text.toLowerCase().includes("unhealthy machines") || text.toLowerCase().includes("failure")) {
        aiResponseText = "Generator G-04 is showing abnormal vibration signatures. AI predicts a failure within 10 days if filters and belts are not replaced.";
        contextData = { title: "Generator G-04", subtitle: "Abnormal vibration detected", health: "72%", risk: "Medium", confidence: "94%", recommendedAction: "Replace filters within 10 days", actions: ["View Asset", "Create Ticket", "Schedule Maintenance"], icon: Cpu, color: amber, tint: amberT };
      } else if (text.toLowerCase().includes("executive summary")) {
        aiResponseText = "Here is the executive summary for this month. Overall performance is up by 12% and MTTR has decreased by 4.5 hours. However, we have 6 pending AMC renewals that need attention.";
        contextData = { title: "Monthly Summary", subtitle: "Performance & Renewals", health: "Up 12%", risk: "Low", confidence: "98%", recommendedAction: "Review 6 pending AMC renewals", actions: ["View Report", "Manage AMCs"], icon: BarChart3, color: blue, tint: blueTint };
      } else {
        aiResponseText = "I've logged your request. You can use one of the quick actions below to explore specific operational insights, or ask me another question.";
      }

      setIsTyping(false);
      const newMsgId = Date.now() + 1;
      setMessages(prev => [...prev, { id: newMsgId, sender: "ai", text: "", time: "Now", contextData: null }]);
      
      let i = 0;
      const interval = setInterval(() => {
        setMessages(prev => prev.map(msg => {
          if (msg.id === newMsgId) {
            return { ...msg, text: aiResponseText.slice(0, i + 1), contextData: (i === aiResponseText.length - 1) ? contextData : null };
          }
          return msg;
        }));
        i++;
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        if (i === aiResponseText.length) {
          clearInterval(interval);
        }
      }, 20); // 20ms per char
    }, 1200);
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { id: Date.now(), sender: "ai", text: "Voice input is not supported in your current browser environment. Please type your message instead.", time: "Now" }]);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map(result => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        clearInterval(timerRef.current);
        if (event.error === 'not-allowed') {
          setMessages(prev => [...prev, { id: Date.now(), sender: "ai", text: "Microphone access was denied. Please check your browser permissions to use voice input.", time: "Now" }]);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        clearInterval(timerRef.current);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <MobileLayout
      header={
        <>
          <StatusBar />
          <PageHeader />
        </>
      }
      scrollContainerStyle={{ display: "flex", flexDirection: "column", paddingBottom: "0" }}
    >
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", display: "flex", flexDirection: "column", paddingBottom: "20px" }}>
        
        {/* Welcome AI Gradient Hero */}
        <div style={{ padding: "18px 20px 6px" }}>
          <div style={{
            background: `linear-gradient(135deg, ${inkB}, #0F172A)`,
            borderRadius: "16px", padding: "18px 20px",
            boxShadow: `0 8px 24px rgba(15,23,42,0.25), inset 0 1px 1px rgba(255,255,255,0.1)`,
            border: `1px solid rgba(255,255,255,0.08)`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, right: 0, width: "120px", height: "120px",
              background: `radial-gradient(circle at top right, rgba(124,58,237,0.2), transparent 70%)`,
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", position: "relative" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "12px",
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bot size={22} color="white" />
              </div>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "white", fontFamily: inter }}>10xDS Assistant</p>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Sparkles size={11} color="#C4B5FD" />
                  <p style={{ fontSize: "11px", color: "#C4B5FD", fontFamily: inter, fontWeight: 600 }}>Powered by AI</p>
                </div>
              </div>
            </div>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", lineHeight: 1.5, fontFamily: inter, position: "relative" }}>
              How can I help you optimize your operations today?
            </p>
          </div>
        </div>

        <QuickActionPills />

        {/* Chat History */}
        <div style={{ flex: 1, padding: "10px 20px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div key={msg.id} style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "80%",
                display: "flex", gap: "10px", alignItems: "flex-end"
              }}>
                {!isUser && (
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%", backgroundColor: blueTint,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    <Bot size={16} color={blue} />
                  </div>
                )}
                
                <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", width: "100%" }}>
                  <div style={{
                    backgroundColor: isUser ? blue : card,
                    color: isUser ? "white" : ink,
                    padding: (msg.image && !msg.text) ? "6px" : "12px 16px",
                    borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    border: isUser ? "none" : `1px solid ${border}`,
                    boxShadow: isUser ? `0 4px 12px ${blue}30` : cardShadow,
                    fontSize: "14.5px", lineHeight: 1.5, fontFamily: inter,
                    whiteSpace: "pre-wrap"
                  }}>
                    {msg.image && (
                      <img src={msg.image} alt="Attachment" style={{ width: "100%", maxWidth: "220px", borderRadius: "12px", marginBottom: msg.text ? "10px" : 0 }} />
                    )}
                    {msg.audio && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: msg.text ? "10px" : 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: isUser ? "rgba(255,255,255,0.15)" : divider, padding: "10px", borderRadius: "12px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: isUser ? "white" : blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Mic size={16} color={isUser ? blue : "white"} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: isUser ? "white" : ink, fontFamily: inter, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.audio.name}</span>
                            <audio controls src={msg.audio.url} style={{ height: "28px", marginTop: "4px", width: "200px" }} />
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.text && <span>{msg.text}</span>}
                  </div>
                  
                  {/* Context Card rendering for AI */}
                  {!isUser && msg.contextData && (
                    <AIContextCard {...msg.contextData} />
                  )}

                  <span style={{ fontSize: "10px", fontWeight: 500, color: inkFaint, fontFamily: inter, marginTop: "6px" }}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}

          {messages.length === 1 && !isTyping && (
            <SuggestedPrompts onSelect={handleSend} />
          )}

          {isTyping && (
            <div style={{
              alignSelf: "flex-start",
              display: "flex", alignItems: "center", gap: "6px",
              backgroundColor: card, padding: "14px 18px",
              borderRadius: "18px 18px 18px 4px", border: `1px solid ${border}`,
              boxShadow: cardShadow,
            }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: inkFaint, animation: "pulse 1.5s infinite" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: inkFaint, animation: "pulse 1.5s infinite 0.2s" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: inkFaint, animation: "pulse 1.5s infinite 0.4s" }} />
              <style>{`
                @keyframes pulse {
                  0%, 100% { transform: scale(1); opacity: 0.5; }
                  50% { transform: scale(1.2); opacity: 1; }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      <AIAssistantInputFab 
        imageAttachment={imageAttachment} setImageAttachment={setImageAttachment} 
        audioAttachment={audioAttachment} setAudioAttachment={setAudioAttachment} 
        fileInputRef={fileInputRef} isRecording={isRecording} recordingTime={recordingTime} 
        input={input} setInput={setInput} handleSend={handleSend} toggleRecording={toggleRecording}
        isTyping={isTyping}
      />
    </MobileLayout>
  );
}

const AIAssistantInputFab = ({ 
  imageAttachment, setImageAttachment, audioAttachment, setAudioAttachment, 
  fileInputRef, isRecording, recordingTime, input, setInput, handleSend, toggleRecording, isTyping
}: any) => (
  <div style={{
    position: "relative",
    padding: "12px 20px", backgroundColor: card,
    borderTop: `1px solid ${border}`, flexShrink: 0,
    display: "flex", flexDirection: "column", gap: "10px"
  }}>
        {imageAttachment && (
          <div style={{ position: "relative", display: "inline-block", alignSelf: "flex-start" }}>
            <img src={imageAttachment} alt="Preview" style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "12px", border: `1px solid ${border}` }} />
            <button type="button" onClick={() => setImageAttachment(null)} style={{
              position: "absolute", top: "-6px", right: "-6px", width: "22px", height: "22px", borderRadius: "50%",
              backgroundColor: ink, color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
            }}>
              <X size={12} />
            </button>
          </div>
        )}
        {audioAttachment && (
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "10px", backgroundColor: divider, padding: "8px 12px", borderRadius: "12px", border: `1px solid ${border}`, alignSelf: "flex-start" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mic size={16} color="white" />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: ink, fontFamily: inter, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{audioAttachment.name}</span>
              <span style={{ fontSize: "11px", color: inkMut, fontFamily: inter }}>Audio File</span>
            </div>
            <button type="button" onClick={() => setAudioAttachment(null)} style={{
              position: "absolute", top: "-6px", right: "-6px", width: "22px", height: "22px", borderRadius: "50%",
              backgroundColor: ink, color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
            }}>
              <X size={12} />
            </button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,audio/mp3,audio/wav,audio/x-m4a,audio/m4a,audio/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.type.startsWith("image/")) {
                  setImageAttachment(URL.createObjectURL(file));
                  setAudioAttachment(null);
                } else if (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|m4a)$/i)) {
                  setAudioAttachment({ url: URL.createObjectURL(file), name: file.name });
                  setImageAttachment(null);
                }
              }
              e.target.value = "";
            }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{
            width: "36px", height: "36px", borderRadius: "50%",
            backgroundColor: divider, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
          }}>
            <Paperclip size={16} color={inkMut} />
          </button>
          
          <div style={{
            flex: 1, backgroundColor: isRecording ? redT : divider, borderRadius: "20px",
            border: `1px solid ${isRecording ? red : border}`, display: "flex", alignItems: "center",
            padding: "0 16px", height: "42px", transition: "all 0.2s"
          }}>
            {isRecording ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: red, animation: "pulse 1.5s infinite" }} />
                <span style={{ fontSize: "14px", color: red, fontFamily: inter, fontWeight: 500, flex: 1 }}>
                  Listening...
                </span>
                <span style={{ fontSize: "12px", color: red, fontFamily: inter, fontWeight: 600 }}>
                  00:{recordingTime.toString().padStart(2, '0')}
                </span>
              </div>
            ) : (
              <textarea
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isTyping) handleSend(input);
                  }
                }}
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: "14px", color: ink, fontFamily: inter, resize: "none",
                  padding: "12px 0", maxHeight: "100px", overflowY: "auto"
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                }}
              />
            )}
            <button type="button" onClick={toggleRecording} style={{
              background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center"
            }}>
              <Mic size={16} color={isRecording ? red : inkMut} />
            </button>
          </div>

          <button type="button" 
            onClick={() => { if (!isTyping) handleSend(input); }} 
            disabled={isTyping}
            style={{
            width: "42px", height: "42px", borderRadius: "50%",
            backgroundColor: (input.trim() || imageAttachment || audioAttachment) && !isTyping ? blue : divider, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: isTyping ? "not-allowed" : "pointer",
            transition: "all 0.2s"
          }}>
            <Send size={16} color={(input.trim() || imageAttachment || audioAttachment) && !isTyping ? "white" : inkFaint} />
          </button>
        </div>
    </div>
);
