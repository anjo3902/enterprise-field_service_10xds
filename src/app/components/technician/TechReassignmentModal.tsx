import React, { useState } from 'react';
import { AlertCircle, X, Send } from 'lucide-react';

interface TechReassignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobLocation: string; // Keeping for compatibility, but old project used fault_type
  jobSeverity: string; // Keeping for compatibility
  onSubmit: (reason: string, notes?: string) => void;
}

const REASSIGNMENT_REASONS = [
  { value: 'emergency_unavailable', label: 'Emergency unavailable' },
  { value: 'route_overload', label: 'Route overload' },
  { value: 'vehicle_issue', label: 'Vehicle issue' },
  { value: 'customer_reschedule', label: 'Customer reschedule' },
  { value: 'skill_mismatch', label: 'Skill mismatch' },
  { value: 'safety_issue', label: 'Safety issue' },
  { value: 'time_constraint', label: 'Time constraint' },
];

export function TechReassignmentModal({ isOpen, onClose, jobId, jobLocation, jobSeverity, onSubmit }: TechReassignmentModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    setError('');
    if (!selectedReason.trim()) {
      setError('Please select a reason for reassignment.');
      return;
    }
    setSubmitting(true);
    // Simulate API delay
    setTimeout(() => {
      onSubmit(selectedReason, notes.trim());
      setSubmitting(false);
      handleClose();
    }, 800);
  };

  const handleClose = () => {
    setSelectedReason('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} 
        onClick={!submitting ? handleClose : undefined} 
      />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '28rem', // max-w-md
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Roboto', sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={20} color="#F97316" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Request Reassignment</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            style={{ padding: '4px', background: 'transparent', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', color: '#6B7280', opacity: submitting ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Job Info */}
          <div style={{ backgroundColor: '#F9FAFB', borderRadius: '6px', padding: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', color: '#6B7280' }}>Job ID</p>
            <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 500, color: '#111827' }}>{jobId}</p>
            
            <p style={{ margin: '8px 0 0', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', color: '#6B7280' }}>Location / Severity</p>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#111827' }}>{jobLocation} — {jobSeverity}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#FEF2F2', borderRadius: '6px', padding: '12px' }}>
              <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '14px', color: '#B91C1C' }}>{error}</p>
            </div>
          )}

          {/* Reason Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Reason for Reassignment
              <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                setError('');
              }}
              disabled={submitting}
              style={{
                width: '100%',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                padding: '8px 12px',
                fontSize: '14px',
                color: '#111827',
                outline: 'none',
                opacity: submitting ? 0.7 : 1
              }}
            >
              <option value="">-- Select a reason --</option>
              {REASSIGNMENT_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Additional Notes
              <span style={{ color: '#9CA3AF', marginLeft: '4px', fontWeight: 400, fontSize: '12px' }}>(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Provide any additional context for the reassignment request..."
              rows={3}
              maxLength={500}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                padding: '8px 12px',
                fontSize: '14px',
                color: '#111827',
                outline: 'none',
                resize: 'none',
                opacity: submitting ? 0.7 : 1
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>{notes.length}/500 characters</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #E5E7EB', padding: '12px 24px', backgroundColor: '#F9FAFB', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            style={{
              flex: 1,
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#111827',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedReason.trim()}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563EB',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: (submitting || !selectedReason.trim()) ? 'not-allowed' : 'pointer',
              opacity: (submitting || !selectedReason.trim()) ? 0.5 : 1
            }}
          >
            <Send size={16} />
            {submitting ? 'Submitting...' : 'Request Reassignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
