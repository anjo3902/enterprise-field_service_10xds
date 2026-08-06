import { useState } from 'react'
import { Check, Info } from 'lucide-react'
import Modal from '../../../components/Modal'
import SeverityComparison from '../../../components/SeverityComparison'
import { usePopup } from '../../../components/ui/PopupProvider'

export default function ModifyApproveModal({ ticket, onClose, onSubmit }) {
  const [severity, setSeverity] = useState(ticket.severity || '')
  const [faultType, setFaultType] = useState(ticket.fault_type || '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { showPopup } = usePopup()

  const handleSubmit = async () => {
    if (!severity) { setError('Please select a severity level.'); return }
    showPopup({
      type: 'confirm',
      title: 'Confirm Approval',
      message: 'Are you sure you want to approve this request?',
      onConfirm: async () => {
        setSubmitting(true)
        setError('')
        try {
          await onSubmit({
            ticketId: ticket.id,
            final_severity: severity,
            final_fault_type: faultType || undefined,
            notes: notes || `Severity corrected to ${severity} and approved by admin`,
          })
          onClose()
        } catch (err) {
          setError(err?.response?.data?.detail || 'Failed to modify and approve request')
        } finally {
          setSubmitting(false)
        }
      },
      onCancel: () => {},
      confirmText: 'Approve',
      cancelText: 'Cancel',
    })
  }

  return (
    <Modal isOpen onClose={onClose} title='Modify & Approve' description={`Ticket #${ticket.id} — Correct AI output and approve`} maxWidth='max-w-lg' closeLabel='Close'>
      <div className='space-y-4'>
        <div>
          <p className='text-[0.72rem] text-gray-500 mb-1.5 font-semibold uppercase tracking-wider'>Current AI Output</p>
          <SeverityComparison aiSeverity={ticket.severity} finalSeverity={ticket.final_severity} />
        </div>

        <div className='flex items-start gap-2 bg-amber-50 border border-amber-400 rounded-lg p-3 text-[0.78rem] text-amber-800'>
          <Info className='w-4 h-4 shrink-0 mt-0.5' />
          <span><strong>Use this instead of Reject</strong> when the request is valid but AI predicted the wrong severity. Reject is only for invalid images, spam, or duplicate requests.</span>
        </div>

        <div className='space-y-3'>
          <div>
            <label className='text-[0.78rem] font-semibold text-gray-700 block mb-1'>Final Severity <span className='text-red-600'>*</span></label>
            <select className='input-field' value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value=''>-- Select severity --</option>
              <option value='low'>Low</option>
              <option value='medium'>Medium</option>
              <option value='high'>High</option>
              <option value='critical'>Critical</option>
            </select>
          </div>
          <div>
            <label className='text-[0.78rem] font-semibold text-gray-700 block mb-1'>Fault Type <span className='text-gray-400 font-normal'>(optional)</span></label>
            <input type='text' className='input-field' value={faultType} onChange={(e) => setFaultType(e.target.value)} placeholder={ticket.fault_type || 'e.g. arcing_electrical_component'} />
          </div>
          <div>
            <label className='text-[0.78rem] font-semibold text-gray-700 block mb-1'>Admin Notes <span className='text-gray-400 font-normal'>(optional)</span></label>
            <textarea className='input-field resize-y' rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder='Reason for correction (stored in audit trail)…' />
          </div>
        </div>

        {error && <p className='text-red-600 text-sm'>{error}</p>}

        <div className='flex gap-2.5 justify-end'>
          <button type='button' className='action-btn action-btn-view' onClick={onClose}>Cancel</button>
          <button type='button' className='action-btn action-btn-warning' disabled={submitting || !severity} onClick={handleSubmit}>
            <Check className='w-4 h-4' />
            {submitting ? 'Processing...' : 'Modify & Approve'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
