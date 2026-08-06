import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Modal from '../../../components/Modal'
import { usePopup } from '../../../components/ui/PopupProvider'

export default function RejectModal({ ticket, onClose, onSubmit }) {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { showPopup } = usePopup()

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setError('A rejection reason is required. Use "Modify & Approve" for severity corrections.')
      return
    }
    showPopup({
      type: 'warning',
      title: 'Reject Request',
      message: 'This action cannot be undone.',
      onConfirm: async () => {
        setSubmitting(true)
        setError('')
        try {
          await onSubmit({ ticketId: ticket.id, notes: notes.trim() })
          onClose()
        } catch (err) {
          setError(err?.response?.data?.detail || 'Failed to reject request')
        } finally {
          setSubmitting(false)
        }
      },
      onCancel: () => {},
      confirmText: 'Reject',
      cancelText: 'Cancel',
    })
  }

  return (
    <Modal isOpen onClose={onClose} title='Reject Request' description={`Ticket #${ticket.id}`} maxWidth='max-w-md' closeLabel='Close'>
      <div className='space-y-4'>
        <div className='flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg p-3 text-[0.78rem] text-red-900'>
          <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5' />
          <div>
            <strong>Reject is only for:</strong>
            <ul className='mt-1 ml-4 list-disc space-y-0.5'>
              <li>Invalid or unrecognisable image</li>
              <li>Spam request</li>
              <li>Duplicate submission</li>
            </ul>
            <p className='mt-2 pt-2 border-t border-red-200'>
              If AI severity is wrong — use <strong>Modify &amp; Approve</strong> instead.
            </p>
          </div>
        </div>

        <div>
          <label className='text-[0.78rem] font-semibold text-gray-700 block mb-1'>Rejection Reason <span className='text-red-600'>*</span></label>
          <textarea className='input-field resize-y' rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder='State the reason clearly (required for audit trail)…' />
        </div>

        {error && <p className='text-red-600 text-sm'>{error}</p>}

        <div className='flex gap-2.5 justify-end'>
          <button type='button' className='action-btn action-btn-view' onClick={onClose}>Cancel</button>
          <button type='button' className='action-btn action-btn-danger' disabled={submitting || !notes.trim()} onClick={handleSubmit}>
            {submitting ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
