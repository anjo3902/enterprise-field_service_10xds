import React, { useState, useRef, useEffect } from "react";
import {
  Bot, ShieldAlert, PenTool, BookOpen, Wrench, Settings, Search,
  Mic, Paperclip, Send, ChevronLeft, RefreshCw, Trash2,
  Zap, Copy, ArrowLeft, Square
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";

// --- Design Tokens ---
const blue = "#2563EB";
const blueDark = "#1D4ED8";
const blueTint = "#EFF6FF";
const green = "#16A34A";
const amber = "#D97706";
const amberT = "#FFFBEB";
const red = "#DC2626";
const redT = "#FEF2F2";
const ink = "#0F172A";
const inkSec = "#475569";
const inkMut = "#64748B";
const bg = "#F8FAFC";
const card = "#FFFFFF";
const border = "#E2E8F0";
const divider = "#F1F5F9";
const inter = "'Inter', 'Roboto', sans-serif";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type?: 'text' | 'file';
  text?: string;
  fileName?: string;
  fileSize?: string;
  timestamp: string;
  isTyping?: boolean;
}

export function TechAIAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { jobId?: string; fault?: string; asset?: string } | null;

  // Use state context if provided, else general mode.
  const isContextual = !!state?.jobId;
  const contextJobId = state?.jobId || "TKT-0003";
  const contextFault = state?.fault || "HVAC unit not cooling";
  const contextAsset = state?.asset || "Central AC Unit - Roof";

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let full = '';
        for (let i = 0; i < event.results.length; ++i) {
           full += event.results[i][0].transcript;
        }
        setInput(full);
      };
      
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = (event: any) => {
         console.error('Speech recognition error', event.error);
         setIsRecording(false);
      };
    }
  }, [setInput]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleMicClick = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      } else {
        // Fallback if not supported
        setInput("What are the standard safety protocols for this job?");
      }
    } else {
      if (recognitionRef.current) {
        try {
          setInput("");
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (e) {
          console.error(e);
        }
      } else {
        setIsRecording(true);
      }
    }
  };

  const handleFileUpload = (file: File) => {
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'user', 
      type: 'file', 
      fileName: file.name, 
      fileSize: (file.size / 1024).toFixed(1) + " KB",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        text: `I've successfully received and analyzed "${file.name}". Based on the document, everything looks within standard parameters.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    }, 2000);
  };

  const handleSend = (text: string) => {
    const val = text.trim();
    if (!val) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: val,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Here is the requested information for "${val}". Based on standard 10xDS procedures, ensure you follow safety guidelines before proceeding.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
  };

  const handleClear = () => setMessages([]);

  const QuickCard = ({ icon: Icon, title, desc, prompt, color = blue }: any) => (
    <button
      onClick={() => handleSend(prompt)}
      style={{
        display: "flex", flexDirection: "column", gap: "8px", backgroundColor: card, border: `1px solid ${border}`,
        borderRadius: "12px", padding: "12px", textAlign: "left", cursor: "pointer", flex: "1 1 calc(50% - 6px)", minWidth: "140px"
      }}
    >
      <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 700, color: ink }}>{title}</p>
        <p style={{ margin: 0, fontSize: "11px", color: inkMut, lineHeight: 1.3 }}>{desc}</p>
      </div>
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", backgroundColor: bg, fontFamily: inter }}>
      
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${blueDark} 0%, ${blue} 100%)`, flexShrink: 0, padding: "16px 20px" }}>
        <div style={{ marginBottom: "16px", marginTop: "4px" }}>
          <button type="button" onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "12px", color: "white", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "15px", fontWeight: 600, fontFamily: inter }}>
            <ArrowLeft size={18} />
            Back
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.3)" }}>
              <Bot size={22} color="white" />
            </div>
            <div style={{ position: "absolute", bottom: -2, right: -2, width: "12px", height: "12px", backgroundColor: "#4ADE80", borderRadius: "50%", border: `2px solid ${blue}` }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: "0 0 2px", fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.03em", fontFamily: inter }}>Technician AI</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.8)", fontWeight: 500, fontFamily: inter }}>Ready to assist</p>
          </div>
          {messages.length > 0 && (
            <button onClick={handleClear} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={18} color="white" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Contextual Job Card (if applicable) */}
            {isContextual && (
              <div style={{ backgroundColor: blueTint, borderRadius: "12px", border: `1px solid ${blue}30`, padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Wrench size={16} color={blue} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: blue }}>Job Context Loaded</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: ink }}><strong style={{ color: inkSec }}>ID:</strong> #{contextJobId}</p>
                  <p style={{ margin: 0, fontSize: "13px", color: ink }}><strong style={{ color: inkSec }}>Fault:</strong> {contextFault}</p>
                  <p style={{ margin: 0, fontSize: "13px", color: ink }}><strong style={{ color: inkSec }}>Asset:</strong> {contextAsset}</p>
                </div>
                <div style={{ marginTop: "12px", backgroundColor: amberT, border: `1px solid ${amber}30`, borderRadius: "8px", padding: "10px", display: "flex", gap: "8px" }}>
                  <ShieldAlert size={16} color={amber} style={{ flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: "11px", color: "#92400E", lineHeight: 1.4 }}>High voltage equipment. Ensure lock-out/tag-out procedures are followed.</p>
                </div>
              </div>
            )}

            {!isContextual && (
              <div style={{ textAlign: "center", margin: "10px 0" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: ink, margin: "0 0 8px" }}>How can I help you today?</h2>
                <p style={{ fontSize: "13px", color: inkMut, margin: 0, padding: "0 20px" }}>I can analyze fault codes, suggest repair steps, and help draft service notes.</p>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 700, color: inkSec, textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Assistance</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                <QuickCard icon={Zap} title="Diagnose Fault" desc="Analyze symptoms & codes" prompt="How do I diagnose a sudden power failure on this asset?" color={amber} />
                <QuickCard icon={PenTool} title="Repair Guide" desc="Step-by-step instructions" prompt="Show me the standard repair procedure for replacing the control board." color={blue} />
                <QuickCard icon={ShieldAlert} title="Safety Check" desc="Review hazards" prompt="What are the critical safety precautions for this repair?" color={red} />
                <QuickCard icon={BookOpen} title="Service Notes" desc="Generate report summary" prompt="Help me generate a professional service report summary based on my findings." color={green} />
              </div>
            </div>

            {/* Specialized Tools */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 700, color: inkSec, textTransform: "uppercase", letterSpacing: "0.05em" }}>Specialized Tools</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button onClick={() => handleSend("List the required tools and spare parts for this job.")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: card, border: `1px solid ${border}`, borderRadius: "10px", padding: "12px 16px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Settings size={18} color={inkMut} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: ink }}>Required Tools & Parts</span>
                  </div>
                  <ChevronLeft size={16} color={border} style={{ transform: "rotate(180deg)" }} />
                </button>
                <button onClick={() => handleSend("Perform a root cause analysis for the observed fault.")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: card, border: `1px solid ${border}`, borderRadius: "10px", padding: "12px 16px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Search size={18} color={inkMut} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: ink }}>Root Cause Analysis</span>
                  </div>
                  <ChevronLeft size={16} color={border} style={{ transform: "rotate(180deg)" }} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === 'user' ? "flex-end" : "flex-start", width: "100%" }}>
                <div style={{
                  maxWidth: "85%",
                  backgroundColor: msg.role === 'user' ? blue : card,
                  border: msg.role === 'user' ? "none" : `1px solid ${border}`,
                  borderRadius: msg.role === 'user' ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "12px 16px",
                  boxShadow: msg.role === 'user' ? `0 4px 12px ${blue}30` : "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  {msg.type === 'file' ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Paperclip size={16} color="white" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "white", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg.fileName}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>{msg.fileSize}</div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: msg.role === 'user' ? "#FFF" : ink }}>
                      {msg.text}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", padding: "0 4px" }}>
                  <span style={{ fontSize: "10px", color: inkMut }}>{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <>
                      <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Copy size={12} color={inkMut} />
                      </button>
                      <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                        <RefreshCw size={12} color={inkMut} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", alignSelf: "flex-start", backgroundColor: card, border: `1px solid ${border}`, borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
                <div style={{ width: "6px", height: "6px", backgroundColor: inkMut, borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both" }} />
                <div style={{ width: "6px", height: "6px", backgroundColor: inkMut, borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "0.2s" }} />
                <div style={{ width: "6px", height: "6px", backgroundColor: inkMut, borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "0.4s" }} />
                <style>{`
                  @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
                `}</style>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: "12px 16px", backgroundColor: card, borderTop: `1px solid ${border}`, zIndex: 10 }}>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
            e.target.value = '';
          }}
        />
        {messages.length > 0 && !isTyping && (
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", scrollbarWidth: "none" }}>
            <button onClick={() => handleSend("Explain that in simpler terms.")} style={{ whiteSpace: "nowrap", flexShrink: 0, padding: "6px 12px", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: "16px", fontSize: "12px", color: inkSec, cursor: "pointer" }}>Explain simpler</button>
            <button onClick={() => handleSend("What tools do I need for this?")} style={{ whiteSpace: "nowrap", flexShrink: 0, padding: "6px 12px", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: "16px", fontSize: "12px", color: inkSec, cursor: "pointer" }}>Required tools</button>
            <button onClick={() => handleSend("Show safety precautions.")} style={{ whiteSpace: "nowrap", flexShrink: 0, padding: "6px 12px", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: "16px", fontSize: "12px", color: inkSec, cursor: "pointer" }}>Safety precautions</button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: "24px", padding: "6px 6px 6px 16px" }}>
          {isRecording ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "4.5px 0" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "4px", backgroundColor: red, animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: "14px", color: red, fontFamily: inter, fontWeight: 500 }}>Recording...</span>
              <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }`}</style>
            </div>
          ) : (
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Ask AI assistant..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "14px", fontFamily: inter, color: ink }}
            />
          )}
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", padding: "6px", cursor: "pointer", display: "flex" }}>
            <Paperclip size={18} color={inkMut} />
          </button>
          {isRecording ? (
            <button type="button" onClick={handleMicClick} style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
              <Square size={16} color={red} fill={red} />
            </button>
          ) : input.trim() ? (
            <button 
              type="button"
              onClick={() => handleSend(input)}
              style={{ width: "36px", height: "36px", borderRadius: "18px", backgroundColor: blue, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", transition: "background-color 0.2s" }}
            >
              <Send size={16} color="white" style={{ marginLeft: "-2px", marginTop: "2px" }} />
            </button>
          ) : (
            <button type="button" onClick={handleMicClick} style={{ background: "none", border: "none", padding: "6px 8px 6px 6px", cursor: "pointer", display: "flex" }}>
              <Mic size={18} color={inkMut} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
