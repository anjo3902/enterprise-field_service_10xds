import React, { useState, useEffect } from 'react';
import { Bot, X } from 'lucide-react';

interface TechAIBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

const blue = "#2563EB";
const card = "#FFFFFF", border = "#F3F4F6", ink = "#111827", inkMut = "#374151";
const inter = "'Inter', 'Roboto', sans-serif";

export function TechAIBriefModal({ isOpen, onClose, jobId }: TechAIBriefModalProps) {
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setCopied(false);
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const previsitData = [
    {
      title: "Summary",
      items: [
        { type: "para", text: "Based on the customer report, this is likely an issue with the main control board or power supply unit. Similar issues report a 70% success rate with a hard reset before component replacement." }
      ]
    },
    {
      title: "Tools & Parts Needed",
      items: [
        { type: "bullet", text: "Multimeter (for voltage check)" },
        { type: "bullet", text: "Insulated screwdriver set" },
        { type: "bullet", text: "Replacement Control Board (Part #CB-4092) - Suggested" }
      ]
    },
    {
      title: "Recommended Steps",
      items: [
        { type: "step", text: "Isolate power at the main breaker before inspecting." },
        { type: "step", text: "Perform hard reset (hold reset button 15s)." },
        { type: "step", text: "Check voltage across terminals L1 and L2." },
        { type: "step", text: "If voltage < 110V, replace control board." }
      ]
    },
    {
      title: "Safety Warning",
      items: [
        { type: "para", text: "High voltage equipment. Ensure LOTO (Lockout/Tagout) procedures are followed before removing the access panel." }
      ]
    }
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      {/* Backdrop */}
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)' }} 
        onClick={onClose} 
      />
      
      {/* Centered Modal Container */}
      <div style={{
        position: 'relative',
        backgroundColor: card,
        borderRadius: '8px',
        width: '100%',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${border}` }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: ink, fontFamily: inter, margin: '0 0 4px 0' }}>
              Prepare Visit (AI)
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', fontFamily: inter, margin: 0 }}>
              AI-generated preparation guide
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: blue, animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '14px', fontWeight: 500, color: inkMut, margin: 0, fontFamily: inter }}>Preparing guidance...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {previsitData.map((sec, idx) => (
                <div key={idx} style={{ borderRadius: '8px', border: `1px solid ${border}`, padding: '16px', backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: ink, fontFamily: inter, margin: 0 }}>
                      {sec.title}
                    </h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sec.items.map((it, iidx) => {
                      if (it.type === 'bullet' || it.type === 'step') {
                        return (
                          <ul key={iidx} style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: inkMut, fontFamily: inter, lineHeight: 1.5 }}>
                            <li>{it.text}</li>
                          </ul>
                        );
                      }
                      return (
                        <p key={iidx} style={{ margin: 0, fontSize: '14px', color: inkMut, fontFamily: inter, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                          {it.text}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button 
            type="button" 
            onClick={handleCopy}
            disabled={loading}
            style={{ 
              padding: '6px 12px', borderRadius: '6px', backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', 
              color: inkMut, fontSize: '14px', fontWeight: 500, fontFamily: inter, cursor: 'pointer',
              opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
