import React, { useState } from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { Bell, Smartphone, Mail, Settings, Edit } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function NotificationEnginePage() {

  const [rules, setRules] = useState([
    { id: 1, event: "SLA Near Breach", roles: ["Vendor Manager", "Org Admin"], email: true, push: true, sms: true, enabled: true },
    { id: 2, event: "Ticket Created", roles: ["Technician"], email: false, push: true, sms: false, enabled: true },
    { id: 3, event: "AI Security Alert", roles: ["System Admin"], email: true, push: true, sms: true, enabled: true },
    { id: 4, event: "License Threshold", roles: ["System Admin"], email: true, push: false, sms: false, enabled: false },
  ]);

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const toggleChannel = (id: number, channel: 'email' | 'push' | 'sms') => {
    setRules(rules.map(r => r.id === id ? { ...r, [channel]: !r[channel] } : r));
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Notification Rules" fallbackRoute="/admin/platform" showBackButton={true} />}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "30px" }}>
        
        {rules.map(rule => (
          <div key={rule.id} style={{ backgroundColor: tokens.card, borderRadius: "12px", border: `1px solid ${tokens.border}`, opacity: rule.enabled ? 1 : 0.6 }}>
            <div style={{ padding: "16px", borderBottom: `1px solid ${tokens.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 4px", color: tokens.ink }}>{rule.event}</h3>
                <div style={{ fontSize: "11px", color: tokens.inkSec }}>Recipients: {rule.roles.join(', ')}</div>
              </div>
              <div 
                onClick={() => toggleRule(rule.id)}
                style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: rule.enabled ? tokens.green : tokens.border, display: "flex", alignItems: "center", padding: "2px", justifyContent: rule.enabled ? "flex-end" : "flex-start", transition: "all 0.2s", cursor: "pointer" }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
              </div>
            </div>
            
            <div style={{ padding: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: tokens.inkSec, marginBottom: "8px" }}>Delivery Channels</div>
              <div className="flex gap-2 mb-4">
                 <button 
                   onClick={() => toggleChannel(rule.id, 'email')}
                   style={{ flex: 1, padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", backgroundColor: rule.email ? tokens.primary + "15" : tokens.bg, border: `1px solid ${rule.email ? tokens.primary : tokens.border}`, color: rule.email ? tokens.primary : tokens.inkMut, borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                 >
                   <Mail size={14} /> Email
                 </button>
                 <button 
                   onClick={() => toggleChannel(rule.id, 'push')}
                   style={{ flex: 1, padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", backgroundColor: rule.push ? tokens.primary + "15" : tokens.bg, border: `1px solid ${rule.push ? tokens.primary : tokens.border}`, color: rule.push ? tokens.primary : tokens.inkMut, borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                 >
                   <Bell size={14} /> Push
                 </button>
                 <button 
                   onClick={() => toggleChannel(rule.id, 'sms')}
                   style={{ flex: 1, padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", backgroundColor: rule.sms ? tokens.primary + "15" : tokens.bg, border: `1px solid ${rule.sms ? tokens.primary : tokens.border}`, color: rule.sms ? tokens.primary : tokens.inkMut, borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                 >
                   <Smartphone size={14} /> SMS
                 </button>
              </div>

              <button style={{ width: "100%", padding: "10px", backgroundColor: "white", border: `1px solid ${tokens.border}`, borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: tokens.ink, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}>
                 <Edit size={14} /> Edit Message Template
              </button>
            </div>
          </div>
        ))}
        
      </div>
    </MobileLayout>
  );
}
