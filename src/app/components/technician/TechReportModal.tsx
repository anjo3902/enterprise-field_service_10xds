import React, { useState } from 'react';
import { FileText, X, Send, Sparkles, Trash2, Plus, Image as ImageIcon } from 'lucide-react';

interface TechReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  onSubmit: (data: any) => void;
}

const blue = "#2563EB", green = "#16A34A";
const card = "#FFFFFF", bg = "#F8FAFC", border = "#E2E8F0", ink = "#0F172A", inkMut = "#64748B";
const inter = "'Inter', 'Roboto', sans-serif";
const divider = "#F1F5F9";

export function TechReportModal({ isOpen, onClose, jobId, onSubmit }: TechReportModalProps) {
  const [formData, setFormData] = useState({
    issue_observed: "",
    root_cause: "",
    work_done: "",
    time_taken: "",
    customer_comments: "",
    notes: ""
  });
  const [materialsUsed, setMaterialsUsed] = useState([{ name: "", quantity: "" }]);
  const [improvingField, setImprovingField] = useState<string | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleImproveWithAI = (field: string) => {
    setImprovingField(field);
    setTimeout(() => {
      setFormData(prev => ({ ...prev, [field]: prev[field as keyof typeof prev] + " (Improved with enhanced technical terminology based on AI analysis of typical fault patterns)" }));
      setImprovingField(null);
    }, 1200);
  };

  const handleMaterialChange = (index: number, key: 'name' | 'quantity', value: string) => {
    const newMats = [...materialsUsed];
    newMats[index][key] = value;
    setMaterialsUsed(newMats);
  };

  const addMaterial = () => setMaterialsUsed(prev => [...prev, { name: "", quantity: "" }]);
  const removeMaterial = (index: number) => {
    if (materialsUsed.length === 1) return;
    setMaterialsUsed(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.issue_observed.trim()) newErrors.issue_observed = "This field is required";
    if (!formData.work_done.trim()) newErrors.work_done = "This field is required";
    if (!formData.time_taken.trim()) newErrors.time_taken = "This field is required";
    return newErrors;
  };

  const handleSubmit = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setSubmitting(true);
    // Simulate API delay
    setTimeout(() => {
      onSubmit({ ...formData, materialsUsed, beforePhoto, afterPhoto });
      setSubmitting(false);
      onClose();
    }, 800);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} 
        onClick={!submitting ? onClose : undefined} 
      />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '28rem',
        maxHeight: '90vh',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Roboto', sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', padding: '16px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={20} color={blue} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Submit Job Report</h2>
              <p style={{ fontSize: '12px', color: inkMut, margin: 0 }}>Job #{jobId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{ padding: '4px', background: 'transparent', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', color: '#6B7280', opacity: submitting ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                Issue Observed <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <button type="button" onClick={() => handleImproveWithAI('issue_observed')} disabled={!formData.issue_observed.trim() || improvingField === 'issue_observed'} style={{ background: 'none', border: 'none', color: blue, fontSize: '12px', fontWeight: 500, cursor: (!formData.issue_observed.trim() || improvingField === 'issue_observed') ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: (!formData.issue_observed.trim() || improvingField === 'issue_observed') ? 0.5 : 1 }}>
                <Sparkles size={12} /> {improvingField === 'issue_observed' ? 'Improving...' : 'Improve with AI'}
              </button>
            </div>
            <textarea
              value={formData.issue_observed}
              onChange={(e) => handleFieldChange('issue_observed', e.target.value)}
              placeholder="Describe what you found (symptoms, condition, visible damage)"
              disabled={submitting}
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: errors.issue_observed ? '1px solid #EF4444' : '1px solid #D1D5DB', padding: '8px 12px', fontSize: '14px', outline: 'none', resize: 'none' }}
            />
            {errors.issue_observed && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#EF4444' }}>{errors.issue_observed}</p>}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                Root Cause
              </label>
              <button type="button" onClick={() => handleImproveWithAI('root_cause')} disabled={!formData.root_cause.trim() || improvingField === 'root_cause'} style={{ background: 'none', border: 'none', color: blue, fontSize: '12px', fontWeight: 500, cursor: (!formData.root_cause.trim() || improvingField === 'root_cause') ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: (!formData.root_cause.trim() || improvingField === 'root_cause') ? 0.5 : 1 }}>
                <Sparkles size={12} /> {improvingField === 'root_cause' ? 'Improving...' : 'Improve with AI'}
              </button>
            </div>
            <textarea
              value={formData.root_cause}
              onChange={(e) => handleFieldChange('root_cause', e.target.value)}
              placeholder="Explain why the issue occurred (if known)"
              disabled={submitting}
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #D1D5DB', padding: '8px 12px', fontSize: '14px', outline: 'none', resize: 'none' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                Work Done <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <button type="button" onClick={() => handleImproveWithAI('work_done')} disabled={!formData.work_done.trim() || improvingField === 'work_done'} style={{ background: 'none', border: 'none', color: blue, fontSize: '12px', fontWeight: 500, cursor: (!formData.work_done.trim() || improvingField === 'work_done') ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: (!formData.work_done.trim() || improvingField === 'work_done') ? 0.5 : 1 }}>
                <Sparkles size={12} /> {improvingField === 'work_done' ? 'Improving...' : 'Improve with AI'}
              </button>
            </div>
            <textarea
              value={formData.work_done}
              onChange={(e) => handleFieldChange('work_done', e.target.value)}
              placeholder="Describe actions taken to fix the issue"
              disabled={submitting}
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: errors.work_done ? '1px solid #EF4444' : '1px solid #D1D5DB', padding: '8px 12px', fontSize: '14px', outline: 'none', resize: 'none' }}
            />
            {errors.work_done && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#EF4444' }}>{errors.work_done}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Materials Used
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {materialsUsed.map((mat, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                  <input
                    type="text"
                    value={mat.name}
                    onChange={(e) => handleMaterialChange(idx, 'name', e.target.value)}
                    placeholder="Material name"
                    style={{ flex: 2, minWidth: 0, boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #D1D5DB', padding: '6px 10px', fontSize: '14px', outline: 'none' }}
                  />
                  <input
                    type="text"
                    value={mat.quantity}
                    onChange={(e) => handleMaterialChange(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                    style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #D1D5DB', padding: '6px 10px', fontSize: '14px', outline: 'none' }}
                  />
                  <button type="button" onClick={() => removeMaterial(idx)} disabled={materialsUsed.length === 1} style={{ flexShrink: 0, background: 'transparent', border: 'none', color: materialsUsed.length === 1 ? '#D1D5DB' : '#EF4444', cursor: materialsUsed.length === 1 ? 'not-allowed' : 'pointer', padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addMaterial} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: blue, fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <Plus size={14} /> Add Material
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '8px', minHeight: '38px' }}>
                Before Photo <br/>
                <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: '11px' }}>(Optional)</span>
              </label>
              <div style={{ height: '80px', borderRadius: '6px', border: '1px dashed #D1D5DB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '12px', backgroundColor: '#F9FAFB', cursor: 'pointer', position: 'relative' }}>
                <ImageIcon size={20} style={{ marginBottom: '4px' }} />
                <span>Upload image</span>
                <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} onChange={(e) => e.target.files && setBeforePhoto(e.target.files[0])} />
                {beforePhoto && <div style={{ position: 'absolute', inset: 0, backgroundColor: '#EFF6FF', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: blue, fontWeight: 500, border: `1px solid ${blue}` }}>Selected: {beforePhoto.name.substring(0,10)}...</div>}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '8px', minHeight: '38px' }}>
                After Photo <br/>
                <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: '11px' }}>(Optional)</span>
              </label>
              <div style={{ height: '80px', borderRadius: '6px', border: '1px dashed #D1D5DB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '12px', backgroundColor: '#F9FAFB', cursor: 'pointer', position: 'relative' }}>
                <ImageIcon size={20} style={{ marginBottom: '4px' }} />
                <span>Upload image</span>
                <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} onChange={(e) => e.target.files && setAfterPhoto(e.target.files[0])} />
                {afterPhoto && <div style={{ position: 'absolute', inset: 0, backgroundColor: '#EFF6FF', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: blue, fontWeight: 500, border: `1px solid ${blue}` }}>Selected: {afterPhoto.name.substring(0,10)}...</div>}
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Time Taken (minutes) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="number"
              value={formData.time_taken}
              onChange={(e) => handleFieldChange('time_taken', e.target.value)}
              placeholder="e.g. 45"
              disabled={submitting}
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: errors.time_taken ? '1px solid #EF4444' : '1px solid #D1D5DB', padding: '8px 12px', fontSize: '14px', outline: 'none' }}
            />
            {errors.time_taken && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#EF4444' }}>{errors.time_taken}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Customer Comments <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: '12px' }}>(Optional)</span>
            </label>
            <textarea
              value={formData.customer_comments}
              onChange={(e) => handleFieldChange('customer_comments', e.target.value)}
              placeholder="Customer comments"
              disabled={submitting}
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #D1D5DB', padding: '8px 12px', fontSize: '14px', outline: 'none', resize: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Additional Notes <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: '12px' }}>(Optional)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Additional remarks"
              disabled={submitting}
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #D1D5DB', padding: '8px 12px', fontSize: '14px', outline: 'none', resize: 'none' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #E5E7EB', padding: '12px 24px', backgroundColor: '#F9FAFB', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
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
            disabled={submitting}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: blue,
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1
            }}
          >
            <Send size={16} />
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
