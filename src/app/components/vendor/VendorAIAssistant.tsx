import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { VendorBottomNavigation } from "./VendorBottomNavigation";
import { useVendor } from "../../contexts/VendorContext";
import {
  Bot, Sparkles, TrendingUp, Users, AlertTriangle, Clock,
  Timer, Calendar, Shield, Package, BarChart3, ClipboardList, UserPlus,
  ChevronRight, Mic, Paperclip, Send, Activity, RefreshCw, Zap, ArrowLeft, Square
} from "lucide-react";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const blue     = "#2563EB";
const blueDark = "#1D4ED8";
const blueMid  = "#3B82F6";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const purple   = "#7C3AED";
const purpleT  = "#F5F3FF";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const teal     = "#0891B2";
const tealT    = "#ECFEFF";
const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const inkFaint = "#94A3B8";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const divider  = "#F1F5F9";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";



// ─── AI Context Card ──────────────────────────────────────────────────────────
function VendorAIContextCard({ title, icon: Icon, color, tint, priority, businessImpact, recommendedAction, cta, onAction }: any) {
  return (
    <div style={{ backgroundColor: card, borderRadius: "16px", border: `1px solid ${border}`, boxShadow: cardShadow, padding: "16px", marginBottom: "12px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0, marginTop: "2px" }}>
          <p style={{ fontSize: "14px", fontWeight: 800, color: ink, fontFamily: inter, margin: "0 0 2px" }}>{title}</p>
        </div>
      </div>
      
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <div style={{ backgroundColor: priority === "High" ? redT : (priority === "Medium" ? amberT : greenT), borderRadius: "8px", padding: "8px 12px", flex: 1 }}>
          <p style={{ fontSize: "10px", color: priority === "High" ? red : (priority === "Medium" ? amber : green), fontFamily: inter, marginBottom: "2px", fontWeight: 600 }}>Priority</p>
          <p style={{ fontSize: "13px", fontWeight: 800, color: priority === "High" ? red : (priority === "Medium" ? amber : green), fontFamily: inter }}>{priority}</p>
        </div>
        <div style={{ backgroundColor: divider, borderRadius: "8px", padding: "8px 12px", flex: 1 }}>
          <p style={{ fontSize: "10px", color: inkMut, fontFamily: inter, marginBottom: "2px", fontWeight: 600 }}>Business Impact</p>
          <p style={{ fontSize: "9.5px", fontWeight: 700, color: inkFaint, fontFamily: inter, letterSpacing: "0.05em" }}>{businessImpact}</p>
        </div>
      </div>

      <div style={{ marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "12px", borderRadius: "8px", border: `1px solid ${border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
          <Sparkles size={14} color={purple} />
          <p style={{ fontSize: "11px", fontWeight: 700, color: purple, fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Recommendation</p>
        </div>
        <p style={{ fontSize: "13px", color: ink, fontFamily: inter, lineHeight: 1.5, fontWeight: 500 }}>{recommendedAction}</p>
      </div>

      {cta && (
        <button type="button" onClick={onAction} style={{
          width: "100%", height: "36px", borderRadius: "10px", backgroundColor: blue, border: "none",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer"
        }}>
          <ClipboardList size={14} color="white" />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "white", fontFamily: inter }}>{cta}</span>
        </button>
      )}
    </div>
  );
}

// ─── Input Bar Component ────────────────────────────────────────────────────────
const VendorAIInputBar = ({ input, setInput, onSend, onFileUpload }: { input: string, setInput: (s: string) => void, onSend: (s: string) => void, onFileUpload: (f: File) => void }) => {
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
      
      recognitionRef.current.onend = () => {
         setIsRecording(false);
      };
      
      recognitionRef.current.onerror = (event: any) => {
         console.error('Speech recognition error', event.error);
         setIsRecording(false);
      };
    }
  }, [setInput]);

  const handleMicClick = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      } else {
        // Fallback if not supported
        setInput("Can you summarize the SLA performance for this week?");
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

  const handleSendClick = () => {
    if (input.trim()) {
      onSend(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendClick();
    }
  };

  return (
    <div style={{ backgroundColor: card, borderTop: `1px solid ${border}`, padding: "12px 16px", zIndex: 50 }}>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onFileUpload(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: "40px", height: "40px", borderRadius: "100px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
          <Paperclip size={18} color={inkMut} />
        </button>
        <div style={{ flex: 1, backgroundColor: divider, borderRadius: "20px", padding: "10px 16px", display: "flex", alignItems: "center" }}>
          {isRecording ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "4px", backgroundColor: red, animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: "14px", color: red, fontFamily: inter, fontWeight: 500 }}>Recording...</span>
            </div>
          ) : (
            <input 
              type="text" 
              placeholder="Ask the AI Assistant..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px", color: ink, fontFamily: inter }} 
            />
          )}
        </div>
        {isRecording ? (
          <button type="button" onClick={handleMicClick} style={{ width: "40px", height: "40px", borderRadius: "100px", backgroundColor: redT, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
            <Square size={16} color={red} fill={red} />
          </button>
        ) : input.trim() ? (
          <button type="button" onClick={handleSendClick} style={{ width: "40px", height: "40px", borderRadius: "100px", backgroundColor: blue, display: "flex", alignItems: "center", justifyContent: "center", border: "none", color: "white", cursor: "pointer" }}>
            <Send size={18} />
          </button>
        ) : (
          <button type="button" onClick={handleMicClick} style={{ width: "40px", height: "40px", borderRadius: "100px", backgroundColor: divider, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
            <Mic size={18} color={inkMut} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VendorAIAssistant() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const { openTickets, unassignedTickets, pendingReviewTickets, technicians, overduePMTasks, upcomingPMTasks, reassignmentEvents, assets, kpis } = useVendor();

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), role: "user", text }]);
    setInput("");
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        role: "ai", 
        text: "Based on the latest data, your SLA performance is currently at 94%, which is slightly below the 95% target. I recommend prioritizing the 2 high-severity tickets in your queue to prevent further breaches." 
      }]);
    }, 1500);
  };

  const handleFileUpload = (file: File) => {
    setMessages(prev => [...prev, { id: Date.now(), role: "user", type: "file", fileName: file.name, fileSize: (file.size / 1024).toFixed(1) + " KB" }]);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        role: "ai", 
        text: `I've successfully received and analyzed "${file.name}". Based on the document, I've updated the relevant asset records and flagged 1 anomaly for your review.` 
      }]);
    }, 2000);
  };

  const Header = (
    <div style={{ background: `linear-gradient(160deg, #0052CC 0%, ${blue} 55%, ${blueMid} 100%)`, padding: "52px 20px 20px", flexShrink: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: "12px" }}>
        <button type="button" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "6px 12px 6px 9px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "white", fontFamily: inter, marginBottom: "16px" }}>
          <ArrowLeft size={15} color="white" /> Back
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: inter, color: "white", margin: 0 }}>Operational AI</h1>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontFamily: inter, margin: 0 }}>Live operational insights</p>
            </div>
          </div>
        {pendingReviewTickets.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "100px", backgroundColor: "rgba(217,119,6,0.25)", border: "1px solid rgba(217,119,6,0.4)" }}>
            <AlertTriangle size={12} color={amber} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: amber, fontFamily: inter }}>{pendingReviewTickets.length} Pending</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );

  const generateInsights = () => {
    let newInsights: any[] = [];
    let idCounter = 1;

    // 0. Pending HITL Review (highest priority)
    if (pendingReviewTickets.length > 0) {
      newInsights.push({
        id: idCounter++,
        title: `${pendingReviewTickets.length} Ticket${pendingReviewTickets.length > 1 ? 's' : ''} Awaiting Review`,
        icon: AlertTriangle, color: amber, tint: amberT,
        priority: "High", businessImpact: "Workflow Blocked",
        recommendedAction: `${pendingReviewTickets.length} ticket(s) are in the HITL queue awaiting your approval decision. Review them to unblock the assignment pipeline.`,
        cta: "Go to Activity Tab",
        route: "/vendor/activity"
      });
    }

    // 0b. Pending Reassignment
    const pendingReassignments = reassignmentEvents.filter(e => e.status === "requested");
    if (pendingReassignments.length > 0) {
      newInsights.push({
        id: idCounter++,
        title: `${pendingReassignments.length} Reassignment Request${pendingReassignments.length > 1 ? 's' : ''} Pending`,
        icon: RefreshCw, color: teal, tint: tealT,
        priority: "High", businessImpact: "SLA Delay Risk",
        recommendedAction: `${pendingReassignments.length} technician reassignment request(s) are awaiting your approval. Delays increase SLA breach risk.`,
        cta: "Review Reassignments",
        route: "/vendor/activity"
      });
    }

    // 1. Technician Overloaded
    const overloadedTechs = technicians.filter(t => t.activeJobCount >= 2 && t.availability === "on_job");
    if (overloadedTechs.length > 0) {
      newInsights.push({
        id: idCounter++,
        title: "Technician Overload",
        icon: Users, color: red, tint: redT,
        priority: "High", businessImpact: "Burnout & Overtime Costs",
        recommendedAction: `${overloadedTechs.length} technician(s) are scheduled for multiple active jobs today. Rebalance workload to available technicians.`,
        cta: "View Technicians",
        route: "/vendor/technicians"
      });
    }

    // 2. Upcoming SLA Breach
    const atRiskTicketsList = openTickets.filter(t => t.slaStatus === "at_risk" || t.slaStatus === "breached");
    if (atRiskTicketsList.length > 0) {
      newInsights.push({
        id: idCounter++,
        title: "Upcoming SLA Breach",
        icon: Clock, color: red, tint: redT,
        priority: "High", businessImpact: "Penalty & Customer Trust",
        recommendedAction: `Ticket ${atRiskTicketsList[0].id} is at risk of breaching its resolution SLA.`,
        cta: "View Details",
        route: `/vendor/tickets/${atRiskTicketsList[0].id}`
      });
    }

    // 3. High Severity Ticket
    const criticalTickets = [...unassignedTickets, ...pendingReviewTickets].filter(t => t.priority === "Critical");
    if (criticalTickets.length > 0) {
      newInsights.push({
        id: idCounter++,
        title: "Critical Ticket Pending",
        icon: AlertTriangle, color: red, tint: redT,
        priority: "High", businessImpact: "Service Disruption",
        recommendedAction: `Ticket ${criticalTickets[0].id} (${criticalTickets[0].category}) is marked as Critical but remains unassigned.`,
        cta: "View Details",
        route: `/vendor/tickets/${criticalTickets[0].id}`
      });
    }

    // 4. Preventive Maintenance Due
    const pmDue = [...overduePMTasks, ...upcomingPMTasks].filter(pm => pm.status === "Overdue" || pm.status === "Requested");
    if (pmDue.length > 0) {
      const isOverdue = pmDue[0].status === "Overdue";
      newInsights.push({
        id: idCounter++,
        title: isOverdue ? "Delayed Maintenance" : "Upcoming Maintenance",
        icon: Calendar, color: isOverdue ? red : amber, tint: isOverdue ? redT : amberT,
        priority: isOverdue ? "High" : "Medium", businessImpact: "Equipment Failure Risk",
        recommendedAction: `PM-${pmDue[0].id} (${pmDue[0].type}) is ${isOverdue ? 'overdue' : 'due soon'}.`,
        cta: "Schedule Maintenance",
        route: "/vendor/maintenance"
      });
    }

    // 5. Skill Mismatch Detected
    const hvacTicket = unassignedTickets.find(t => t.category === "HVAC");
    const hvacTechs = technicians.filter(t => t.availability === "available" && t.skills.includes("HVAC"));
    if (hvacTicket && hvacTechs.length === 0) {
      newInsights.push({
        id: idCounter++,
        title: "Skill Mismatch Detected",
        icon: Shield, color: amber, tint: amberT,
        priority: "Medium", businessImpact: "Delayed Resolution",
        recommendedAction: `Ticket ${hvacTicket.id} requires HVAC skills, but no HVAC technicians are currently available.`,
        cta: "Review Technicians",
        route: "/vendor/technicians"
      });
    }

    // 6. High Value Customer Alert
    const importantTicket = openTickets.find(t => t.customerName === "Global Tech");
    if (importantTicket && newInsights.length < 5) {
      newInsights.push({
        id: idCounter++,
        title: "High-Value Customer Alert",
        icon: TrendingUp, color: amber, tint: amberT,
        priority: "Medium", businessImpact: "Contract Risk",
        recommendedAction: `Global Tech has an open ticket (${importantTicket.id}). Monitor closely for SLA compliance.`,
        cta: "View SLA",
        route: "/vendor/sla"
      });
    }

    // 7. Fallback Idle Time
    if (newInsights.length < 3) {
       newInsights.push({
          id: idCounter++,
          title: "Technician Idle Time",
          icon: Timer, color: amber, tint: amberT,
          priority: "Medium", businessImpact: "Resource Inefficiency",
          recommendedAction: `${technicians.filter(t => t.availability === "available").length} technicians have no active jobs assigned.`,
          cta: "View Technicians",
          route: "/vendor/technicians"
       });
    }

    return newInsights.slice(0, 5);
  };

  const insights = generateInsights();



  return (
    <MobileLayout 
      header={Header} 
      bottomNav={
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <VendorAIInputBar input={input} setInput={setInput} onSend={handleSend} onFileUpload={handleFileUpload} />
          <VendorBottomNavigation />
        </div>
      } 
      scrollContainerStyle={{ paddingBottom: "20px" }}
    >
      {messages.length > 0 ? (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ 
                maxWidth: "80%", 
                padding: "12px 16px", 
                borderRadius: "16px", 
                backgroundColor: msg.role === "user" ? blue : card,
                color: msg.role === "user" ? "white" : ink,
                border: msg.role === "user" ? "none" : `1px solid ${border}`,
                boxShadow: msg.role === "user" ? "none" : cardShadow,
                fontFamily: inter, fontSize: "14px", lineHeight: 1.5,
                borderBottomRightRadius: msg.role === "user" ? "4px" : "16px",
                borderBottomLeftRadius: msg.role === "ai" ? "4px" : "16px"
              }}>
                {msg.type === "file" ? (
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
                  msg.text
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "12px 16px", borderRadius: "16px", backgroundColor: card, border: `1px solid ${border}`, borderBottomLeftRadius: "4px", display: "flex", gap: "4px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: inkMut, animation: "pulse 1s infinite" }} />
                <div style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: inkMut, animation: "pulse 1s infinite 0.2s" }} />
                <div style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: inkMut, animation: "pulse 1s infinite 0.4s" }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Bot size={16} color={blue} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: blueDark, fontFamily: inter }}>Top Operational Insights</span>
          </div>

          {insights.map(insight => (
            <VendorAIContextCard
              key={insight.id}
              title={insight.title}
              icon={insight.icon}
              color={insight.color}
              tint={insight.tint}
              priority={insight.priority}
              businessImpact={insight.businessImpact}
              recommendedAction={insight.recommendedAction}
              cta={insight.cta}
              onAction={() => navigate(insight.route)}
            />
          ))}
        </div>
      )}
    </MobileLayout>
  );
}
