import React, { useState } from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { Fingerprint, CheckCircle, XCircle } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function AccessLogsPage() {
  const [filter, setFilter] = useState("All");

  // Mock access logs for visual demo (AdminContext doesn't have explicit access logs array besides audit/failed logins)
  const logs = [
    { id: 1, user: "Sarah Jenkins", role: "Org Admin", action: "Login Success", method: "SSO", device: "Chrome / macOS", ip: "192.168.1.45", location: "New York, USA", time: new Date(Date.now() - 1000*60*5).toISOString(), status: "success" },
    { id: 2, user: "Mike Ross", role: "Technician", action: "Login Failed", method: "Password", device: "Safari / iOS", ip: "10.0.0.12", location: "Chicago, USA", time: new Date(Date.now() - 1000*60*15).toISOString(), status: "failed" },
    { id: 3, user: "Admin User", role: "System Admin", action: "Export Data", method: "Session", device: "Firefox / Windows", ip: "172.16.0.4", location: "London, UK", time: new Date(Date.now() - 1000*60*45).toISOString(), status: "success" },
  ];

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Access Logs" fallbackRoute="/admin/security" showBackButton={true} />}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {["All", "Success", "Failed", "Warnings"].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "16px",
                border: `1px solid ${filter === f ? tokens.primary : tokens.border}`,
                backgroundColor: filter === f ? "#E6F0FF" : tokens.card,
                color: filter === f ? tokens.primary : tokens.inkSec,
                fontSize: "13px",
                fontWeight: filter === f ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex flex-col gap-3">
          {logs.map(log => (
            <div key={log.id} style={{ backgroundColor: tokens.card, borderRadius: "12px", padding: "16px", border: `1px solid ${tokens.border}` }}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Fingerprint size={16} color={tokens.inkMut} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: tokens.ink }}>{log.user}</div>
                    <div style={{ fontSize: "11px", color: tokens.inkSec }}>{log.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {log.status === 'success' ? <CheckCircle size={14} color={tokens.green} /> : <XCircle size={14} color={tokens.red} />}
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "12px", backgroundColor: tokens.bg, borderRadius: "8px", border: `1px solid ${tokens.border}` }}>
                <div>
                  <div style={{ fontSize: "11px", color: tokens.inkMut }}>Action</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: tokens.ink }}>{log.action} ({log.method})</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: tokens.inkMut }}>Time</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: tokens.ink }}>{new Date(log.time).toLocaleTimeString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: tokens.inkMut }}>Origin</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: tokens.ink }}>{log.ip}</div>
                  <div style={{ fontSize: "11px", color: tokens.inkSec }}>{log.location}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: tokens.inkMut }}>Device</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: tokens.ink }}>{log.device}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </MobileLayout>
  );
}
