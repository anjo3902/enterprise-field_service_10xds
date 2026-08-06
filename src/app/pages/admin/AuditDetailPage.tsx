import React from "react";
import { useParams } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { useAdminContext } from "../../contexts/AdminContext";
import { ShieldCheck, Server, Key, User, Monitor, Globe } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function AuditDetailPage() {
  const { id } = useParams();
  const { auditLog } = useAdminContext();
  
  const log = auditLog.find(l => l.id === id);

  if (!log) return <div>Not found</div>;

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Audit Event" fallbackRoute="/admin/audit" />}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Core Event */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "20px", border: `1px solid ${tokens.border}` }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div style={{ fontSize: "11px", color: tokens.inkMut, fontFamily: "monospace", marginBottom: "4px" }}>{log.id}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.primary }}>{new Date(log.timestamp).toLocaleString()}</div>
            </div>
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "4px", backgroundColor: "#F1F5F9", color: tokens.inkSec, textTransform: "uppercase" }}>
              {log.severity}
            </span>
          </div>

          <h2 style={{ fontSize: "16px", fontWeight: 700, color: tokens.ink, margin: "0 0 16px", lineHeight: 1.4 }}>
            {log.actionDescription}
          </h2>

          <div style={{ padding: "12px", backgroundColor: tokens.bg, borderRadius: "8px", border: `1px solid ${tokens.border}` }}>
            <div className="flex items-center gap-3 mb-2">
              <User size={16} color={tokens.inkMut} />
              <div>
                <span style={{ fontSize: "12px", color: tokens.inkSec }}>Actor: </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{log.actorName}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Key size={16} color={tokens.inkMut} />
              <div>
                <span style={{ fontSize: "12px", color: tokens.inkSec }}>Role: </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{log.actorRole}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Server size={16} color={tokens.inkMut} />
              <div>
                <span style={{ fontSize: "12px", color: tokens.inkSec }}>Target Entity: </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.ink }}>{log.entityType.toUpperCase()} ({log.entityId})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Network & Device */}
        <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px", color: tokens.ink }}>Network Origin</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Globe size={16} color={tokens.inkMut} />
              <div style={{ fontSize: "13px", color: tokens.ink }}>IP: {log.ipAddress}</div>
            </div>
            <div className="flex items-center gap-3">
              <Monitor size={16} color={tokens.inkMut} />
              <div style={{ fontSize: "13px", color: tokens.ink }}>{log.device}</div>
            </div>
            <div style={{ fontSize: "11px", color: tokens.inkMut, fontFamily: "monospace", marginTop: "4px" }}>
              Session: {log.sessionId}
            </div>
          </div>
        </div>

        {/* State Changes */}
        {(log.beforeState || log.afterState) && (
          <div style={{ backgroundColor: tokens.card, borderRadius: "16px", padding: "16px", border: `1px solid ${tokens.border}` }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px", color: tokens.ink }}>State Changes</h3>
            
            {log.beforeState && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: tokens.inkMut, marginBottom: "4px" }}>BEFORE STATE</div>
                <div style={{ padding: "12px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "12px", fontFamily: "monospace", color: "#991B1B", overflowX: "auto" }}>
                  {log.beforeState}
                </div>
              </div>
            )}

            {log.afterState && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: tokens.inkMut, marginBottom: "4px" }}>AFTER STATE</div>
                <div style={{ padding: "12px", backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", fontSize: "12px", fontFamily: "monospace", color: "#166534", overflowX: "auto" }}>
                  {log.afterState}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", padding: "16px 0", opacity: 0.7 }}>
          <ShieldCheck size={20} color={tokens.inkMut} style={{ margin: "0 auto 8px" }} />
          <p style={{ fontSize: "12px", color: tokens.inkSec, margin: 0 }}>This record is cryptographically signed and immutable. It cannot be modified or deleted.</p>
        </div>

      </div>
    </MobileLayout>
  );
}
